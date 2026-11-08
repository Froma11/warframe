import { db } from '../db';
import { proxyPool } from './proxyPool';
import { wsMarketClient } from './wsMarketClient';

interface RawItem {
  id: string;
  slug: string;
  tags?: string[];
  rarity?: string;
  maxRank?: number;
  tradingTax?: number;
  i18n?: {
    en?: {
      name?: string;
      description?: string;
      icon?: string;
      thumb?: string;
    };
    ru?: {
      name?: string;
      description?: string;
    };
  };
}

interface RawOrder {
  id: string;
  type: 'sell' | 'buy';
  platinum: number;
  quantity: number;
  rank: number;
  visible: boolean;
  user: {
    ingameName: string;
    status: 'ingame' | 'online' | 'offline';
    reputation: number;
  };
}

class WarframeMarketScraper {
  private isRunning: boolean = false;
  private readonly baseUrl: string = 'https://api.warframe.market/v2';
  private readonly cdnBase: string = 'https://warframe.market/static/assets/';
  private lastCleanupTime: number = 0;

  // Clean up aged records (> 72 hours for hourly, > 95 days for daily) once per day
  public async performDailyArchiveCleanup(): Promise<void> {
    const now = Date.now();
    if (now - this.lastCleanupTime < 24 * 3600 * 1000) return;
    this.lastCleanupTime = now;

    try {
      const hourlyRes = await db.run(
        "DELETE FROM price_history_hourly WHERE datetime < datetime('now', '-72 hours')"
      );
      const dailyRes = await db.run(
        "DELETE FROM price_history WHERE date < date('now', '-95 days')"
      );
      console.log(`[Scraper] Archive cleanup: purged ${hourlyRes.changes} old hourly rows, ${dailyRes.changes} old daily rows.`);
    } catch (err: any) {
      console.warn('[Scraper] Cleanup warning:', err.message);
    }
  }

  // Fetch real closed trade statistics from /v1/items/{slug}/statistics via ProxyPool
  public async fetchItemStatistics(slug: string): Promise<any> {
    const url = `https://api.warframe.market/v1/items/${slug}/statistics`;
    try {
      return await proxyPool.fetchJson(url, { priority: 'LOW', lang: 'ru' });
    } catch (err: any) {
      // console.warn(`[Scraper] Could not fetch statistics for ${slug}:`, err.message);
      return null;
    }
  }

  // Sync all Arcanes list from /v2/items
  public async syncArcanesCatalog(): Promise<number> {
    console.log('[Scraper] Fetching all items from Warframe Market v2 via ProxyPool...');
    try {
      const json = await proxyPool.fetchJson(`${this.baseUrl}/items`, { priority: 'NORMAL', lang: 'ru' });
      const allItems: RawItem[] = json.data || [];

      // Filter arcanes
      const arcanes = allItems.filter((item) => {
        return item.tags && (item.tags.includes('arcane_enhancement') || item.tags.includes('arcane'));
      });

      console.log(`[Scraper] Found ${arcanes.length} arcanes out of ${allItems.length} total items.`);

      const upsertSql = `
        INSERT INTO items (id, slug, name_en, name_ru, rarity, max_rank, icon_url, thumb_url, effect, tags, trading_tax, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          slug = excluded.slug,
          name_en = excluded.name_en,
          name_ru = excluded.name_ru,
          rarity = excluded.rarity,
          max_rank = excluded.max_rank,
          icon_url = excluded.icon_url,
          thumb_url = excluded.thumb_url,
          effect = excluded.effect,
          tags = excluded.tags,
          trading_tax = excluded.trading_tax,
          updated_at = CURRENT_TIMESTAMP
      `;

      for (const item of arcanes) {
        const en = item.i18n?.en || {};
        const ru = item.i18n?.ru || {};
        const iconUrl = en.icon ? `${this.cdnBase}${en.icon}` : '';
        const thumbUrl = en.thumb ? `${this.cdnBase}${en.thumb}` : '';

        await db.run(upsertSql, [
          item.id,
          item.slug,
          en.name || item.slug,
          ru.name || '',
          item.rarity || 'Common',
          item.maxRank ?? 5,
          iconUrl,
          thumbUrl,
          en.description || '',
          JSON.stringify(item.tags || []),
          item.tradingTax || 0,
        ]);
      }

      console.log(`[Scraper] Successfully indexed ${arcanes.length} arcanes into SQLite.`);
      return arcanes.length;
    } catch (err: any) {
      console.error('[Scraper] Failed to sync arcanes catalog:', err.message);
      throw err;
    }
  }

  /**
   * Incremental Delta Sync:
   * 1. Preserves ALL existing 90-day history in `price_history` and `price_history_hourly`.
   * 2. Only checks recent hours from `h48` and upserts latest 4 hours into `price_history_hourly`.
   * 3. Aggregates today's row in `price_history`.
   */
  public async syncItemOrders(slug: string, maxRank: number = 5): Promise<any> {
    try {
      // 1. Fetch live orders to feed WebSocket in-memory cache and snapshot
      let orders: RawOrder[] = [];
      try {
        const ordersJson = await proxyPool.fetchJson(`${this.baseUrl}/orders/item/${slug}`, {
          priority: 'LOW',
          lang: 'ru'
        });
        orders = ordersJson.data || [];
        // Inject orders into wsMarketClient in-memory state
        for (const o of orders) {
          wsMarketClient.injectOrder({
            id: o.id,
            itemSlug: slug,
            rank: o.rank,
            platinum: o.platinum,
            quantity: o.quantity,
            orderType: o.type,
            visible: o.visible,
            user: {
              ingameName: o.user.ingameName,
              status: o.user.status,
              reputation: o.user.reputation
            },
            updatedAt: Date.now()
          });
        }
      } catch (e: any) {
        // live orders fetch failure is non-fatal
      }

      // 2. Fetch real closed trade statistics
      const statsJson = await this.fetchItemStatistics(slug);
      const closedStats = statsJson?.payload?.statistics_closed || {};
      const h48: any[] = closedStats['48hours'] || [];

      const cutoff24h = new Date(Date.now() - 24 * 3600 * 1000);
      const tradesLast24h = h48.filter((s) => new Date(s.datetime) >= cutoff24h);
      const totalVolume24h = tradesLast24h.reduce((acc, s) => acc + (s.volume || 0), 0);

      const ranksToProcess = [0, maxRank];

      // Upsert only recent hourly statistics (last 6 hours) into price_history_hourly
      const cutoffRecentHourly = new Date(Date.now() - 6 * 3600 * 1000);
      const recentH48 = h48.filter(s => new Date(s.datetime) >= cutoffRecentHourly);

      const upsertHourly = `
        INSERT INTO price_history_hourly (item_slug, rank, datetime, median_price, volume, min_price, max_price)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(item_slug, rank, datetime) DO UPDATE SET
          median_price = excluded.median_price,
          volume = excluded.volume,
          min_price = excluded.min_price,
          max_price = excluded.max_price
      `;

      for (const record of recentH48) {
        if (ranksToProcess.includes(record.mod_rank)) {
          await db.run(upsertHourly, [
            slug,
            record.mod_rank,
            record.datetime,
            record.median || record.wa_price || record.avg_price || 0,
            record.volume || 0,
            record.min_price || 0,
            record.max_price || 0,
          ]);
        }
      }

      // Aggregate today's hourly records into price_history for current date
      const todayDateStr = new Date().toISOString().split('T')[0];
      const upsertHistory = `
        INSERT INTO price_history (item_slug, rank, date, median_price, volume, min_price, max_price)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(item_slug, rank, date) DO UPDATE SET
          median_price = excluded.median_price,
          volume = excluded.volume,
          min_price = excluded.min_price,
          max_price = excluded.max_price
      `;

      for (const rank of ranksToProcess) {
        const todayRows = await db.all<{ median_price: number; volume: number; min_price: number; max_price: number }>(
          "SELECT median_price, volume, min_price, max_price FROM price_history_hourly WHERE item_slug = ? AND rank = ? AND datetime LIKE ?",
          [slug, rank, `${todayDateStr}%`]
        );

        if (todayRows.length > 0) {
          const totalVol = todayRows.reduce((acc, r) => acc + (r.volume || 0), 0);
          const minP = Math.min(...todayRows.map(r => r.min_price || 999999));
          const maxP = Math.max(...todayRows.map(r => r.max_price || 0));
          const weightedSum = todayRows.reduce((acc, r) => acc + (r.median_price || 0) * (r.volume || 1), 0);
          const medianP = totalVol > 0 ? Math.round(weightedSum / totalVol) : Math.round(weightedSum / todayRows.length);

          if (medianP > 0) {
            await db.run(upsertHistory, [
              slug,
              rank,
              todayDateStr,
              medianP,
              totalVol,
              minP === 999999 ? medianP : minP,
              maxP === 0 ? medianP : maxP
            ]);
          }
        }
      }

      // 3. Fallback snapshot if WebSocket hasn't populated yet
      const insertSnapshot = `
        INSERT INTO market_snapshots 
        (item_slug, rank, min_sell, max_buy, spread, spread_pct, median_price, sellers_count, buyers_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      for (const rank of ranksToProcess) {
        const sellOrders = orders
          .filter((o) => o.type === 'sell' && o.visible && o.rank === rank && (o.user.status === 'ingame' || o.user.status === 'online'))
          .sort((a, b) => a.platinum - b.platinum);

        const minLiveSell = sellOrders.length > 0 ? sellOrders[0].platinum : 0;
        const rankStats24h = tradesLast24h.filter((s) => s.mod_rank === rank);
        const rankVolume24h = rankStats24h.reduce((acc, s) => acc + (s.volume || 0), 0);

        let realAvgSoldPrice = 0;
        if (rankVolume24h > 0) {
          const weightedSum = rankStats24h.reduce(
            (acc, s) => acc + (s.wa_price || s.avg_price || s.median) * (s.volume || 1),
            0
          );
          realAvgSoldPrice = Math.round(weightedSum / rankVolume24h);
        } else {
          realAvgSoldPrice = minLiveSell;
        }

        const effectiveMinSell = minLiveSell > 0 ? minLiveSell : realAvgSoldPrice;

        await db.run(insertSnapshot, [
          slug,
          rank,
          effectiveMinSell,
          0,
          0,
          0,
          realAvgSoldPrice,
          rankVolume24h,
          totalVolume24h,
        ]);
      }

      return { slug, totalVolume24h };
    } catch (err: any) {
      console.warn(`[Scraper] Error syncing item ${slug}:`, err.message);
      return null;
    }
  }

  // Graceful slow background delta sync loop (1 item every 8-10s = ~0.1 req/s)
  public startBackgroundWorker(intervalMinutes: number = 30) {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log(`[Scraper Worker] Started incremental background sync (delays 8s between items)`);

    const runCycle = async () => {
      try {
        await this.performDailyArchiveCleanup();

        const count = await db.get<{ cnt: number }>('SELECT COUNT(*) as cnt FROM items');
        if (!count || count.cnt === 0) {
          await this.syncArcanesCatalog();
        }

        const items = await db.all<{ slug: string; max_rank: number }>('SELECT slug, max_rank FROM items');
        for (const item of items) {
          if (!this.isRunning) break;
          await this.syncItemOrders(item.slug, item.max_rank || 5);
          // Polite 8-second interval per item: leaves 98% of proxy throughput for Rivens!
          await new Promise(r => setTimeout(r, 8000));
        }
      } catch (e: any) {
        console.warn('[Scraper Worker] Cycle warning:', e.message);
      }

      if (this.isRunning) {
        setTimeout(runCycle, intervalMinutes * 60 * 1000);
      }
    };

    setTimeout(runCycle, 5000);
  }
}

export const scraper = new WarframeMarketScraper();
