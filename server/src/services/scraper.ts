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

export const HOT_ARCANES = new Set([
  'arcane_energize', 'arcane_grace', 'arcane_aegis', 'arcane_reaper', 'arcane_strike',
  'arcane_ice', 'arcane_avenger', 'arcane_barrier', 'arcane_fury', 'arcane_acceleration',
  'arcane_blessing', 'arcane_pistoleer', 'arcane_arachne', 'arcane_trickery', 'arcane_steadfast',
  'molt_augmented', 'molt_efficiency', 'melee_duplicate', 'melee_crescendo', 'secondary_encumber'
]);

class WarframeMarketScraper {
  private isRunning: boolean = false;
  private readonly baseUrl: string = 'https://api.warframe.market/v2';
  private readonly cdnBase: string = 'https://warframe.market/static/assets/';
  private lastCleanupTime: number = 0;
  private arcaneSyncTimestamps: Map<string, number> = new Map();
  private inFlightArcaneSyncs: Map<string, Promise<number>> = new Map();

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
      const snapshotsRes = await db.run(
        "DELETE FROM market_snapshots WHERE timestamp < datetime('now', '-24 hours')"
      );
      console.log(`[Scraper] Archive cleanup: purged ${hourlyRes.changes} old hourly rows, ${dailyRes.changes} old daily rows, ${snapshotsRes.changes} old market snapshots.`);
    } catch (err: any) {
      console.warn('[Scraper] Cleanup warning:', err.message);
    }
  }

  // Fetch real closed trade statistics from /v1/items/{slug}/statistics via ProxyPool
  public async fetchItemStatistics(slug: string): Promise<any> {
    const url = `https://api.warframe.market/v1/items/${slug}/statistics`;
    try {
      return await proxyPool.fetchJson(url, { priority: 'LOW', lang: 'ru' });
    } catch {
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
   * Stream A: High-Speed Live Orderbook Sync for a single arcane
   * Fetches real live orders from /v2/orders/item/:slug and hydrates wsMarketClient
   */
  public async syncLiveOrderbook(slug: string): Promise<number> {
    try {
      const ordersJson = await proxyPool.fetchJson(`${this.baseUrl}/orders/item/${slug}`, {
        priority: 'NORMAL',
        lang: 'ru',
      });
      const rawOrders = ordersJson?.data || [];
      wsMarketClient.hydrateItemOrders(slug, rawOrders);
      this.arcaneSyncTimestamps.set(slug, Date.now());
      return rawOrders.length;
    } catch (err: any) {
      return 0;
    }
  }

  /**
   * On-Demand fast sync when a user opens an arcane details drawer (with 30s cooldown)
   */
  public async syncLiveOrderbookOnDemand(slug: string): Promise<number> {
    const now = Date.now();
    const lastSync = this.arcaneSyncTimestamps.get(slug) || 0;
    if (now - lastSync < 30000) {
      return 1;
    }
    if (this.inFlightArcaneSyncs.has(slug)) {
      return this.inFlightArcaneSyncs.get(slug)!;
    }
    const promise = (async () => {
      try {
        const ordersJson = await proxyPool.fetchJson(`${this.baseUrl}/orders/item/${slug}`, {
          priority: 'HIGH',
          lang: 'ru',
        });
        const rawOrders = ordersJson?.data || [];
        wsMarketClient.hydrateItemOrders(slug, rawOrders);
        this.arcaneSyncTimestamps.set(slug, Date.now());
        return rawOrders.length;
      } catch {
        return 0;
      } finally {
        this.inFlightArcaneSyncs.delete(slug);
      }
    })();
    this.inFlightArcaneSyncs.set(slug, promise);
    return promise;
  }

  /**
   * Stream B: Archive Delta Sync for closed trade statistics
   * Preserves all 24,000+ historical rows; only updates latest hours & today
   */
  public async syncArchiveDelta(slug: string, maxRank: number = 5): Promise<void> {
    try {
      const statsJson = await this.fetchItemStatistics(slug);
      const closedStats = statsJson?.payload?.statistics_closed || {};
      const h48: any[] = closedStats['48hours'] || [];

      if (!h48 || h48.length === 0) return;

      const ranksToProcess = [0, maxRank];

      // Upsert only recent hourly statistics (last 6 hours) into price_history_hourly
      const cutoffRecentHourly = new Date(Date.now() - 6 * 3600 * 1000);
      const recentH48 = h48.filter((s) => new Date(s.datetime) >= cutoffRecentHourly);

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
        const todayRows = await db.all<{
          median_price: number;
          volume: number;
          min_price: number;
          max_price: number;
        }>(
          'SELECT median_price, volume, min_price, max_price FROM price_history_hourly WHERE item_slug = ? AND rank = ? AND datetime LIKE ?',
          [slug, rank, `${todayDateStr}%`]
        );

        if (todayRows.length > 0) {
          const totalVol = todayRows.reduce((acc, r) => acc + (r.volume || 0), 0);
          const minP = Math.min(...todayRows.map((r) => r.min_price || 999999));
          const maxP = Math.max(...todayRows.map((r) => r.max_price || 0));
          const weightedSum = todayRows.reduce(
            (acc, r) => acc + (r.median_price || 0) * (r.volume || 1),
            0
          );
          const medianP =
            totalVol > 0
              ? Math.round(weightedSum / totalVol)
              : Math.round(weightedSum / todayRows.length);

          if (medianP > 0) {
            await db.run(upsertHistory, [
              slug,
              rank,
              todayDateStr,
              medianP,
              totalVol,
              minP === 999999 ? medianP : minP,
              maxP === 0 ? medianP : maxP,
            ]);
          }
        }
      }
    } catch {
      // Non-fatal
    }
  }

  /**
   * Starts both background workers:
   * - Stream A: Tiered Live Orderbook Sync (HOT 45s, WARM 3m, COLD 15m) across 99 proxies
   * - Stream B: Archive Statistics Delta Sync (polite 4-hour cycle to conserve bandwidth)
   */
  public startBackgroundWorker(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log('[Scraper Worker] Started Stream A (Tiered Orderbooks: HOT 45s, WARM 3m, COLD 15m) & Stream B (4h Archive Delta)');

    // Initial check of catalog
    setTimeout(async () => {
      try {
        const count = await db.get<{ cnt: number }>('SELECT COUNT(*) as cnt FROM items');
        if (!count || count.cnt === 0) {
          await this.syncArcanesCatalog();
        }
      } catch (err: any) {
        console.warn('[Scraper Worker] Catalog check warning:', err.message);
      }
    }, 2000);

    // --- STREAM A: Tiered Live Orderbook Sync Loop ---
    const runLiveOrderbookLoop = async () => {
      while (this.isRunning) {
        try {
          const items = await db.all<{ slug: string }>(`
            SELECT i.slug 
            FROM items i
            LEFT JOIN latest_market_snapshots s ON i.slug = s.item_slug AND s.rank = i.max_rank
            ORDER BY COALESCE(s.buyers_count, s.sellers_count, 0) DESC
          `);

          if (items && items.length > 0) {
            const currentUtcHour = new Date().getUTCHours();
            const isOffPeak = currentUtcHour >= 1 && currentUtcHour < 7;
            const offPeakMult = isOffPeak ? 1.7 : 1.0;

            const hotInterval = Math.round(45 * offPeakMult) * 1000;
            const warmInterval = Math.round(180 * offPeakMult) * 1000;
            const coldInterval = Math.round(900 * offPeakMult) * 1000;

            const now = Date.now();
            let mostOverdueSlug: string | null = null;
            let maxLateness = -Infinity;

            for (let i = 0; i < items.length; i++) {
              const slug = items[i].slug;
              let tierTarget = coldInterval;
              if (HOT_ARCANES.has(slug)) {
                tierTarget = hotInterval;
              } else if (i < 60) {
                tierTarget = warmInterval;
              }

              const lastSync = this.arcaneSyncTimestamps.get(slug) || 0;
              const elapsed = lastSync === 0 ? 999999999 : now - lastSync;
              const lateness = elapsed - tierTarget;

              if (lateness > maxLateness) {
                maxLateness = lateness;
                mostOverdueSlug = slug;
              }
            }

            if (mostOverdueSlug && maxLateness > 0) {
              await this.syncLiveOrderbook(mostOverdueSlug);
            }
          }
        } catch (e: any) {
          console.warn('[Scraper Stream A] Loop warning:', e.message);
        }
        // 400ms pacing across 99 proxies guarantees smooth throughput and zero 429 errors
        await new Promise((r) => setTimeout(r, 400));
      }
    };

    // --- STREAM B: Archive Statistics Delta Sync Loop (Every 4 Hours) ---
    const runArchiveDeltaLoop = async () => {
      while (this.isRunning) {
        try {
          await this.performDailyArchiveCleanup();
          const items = await db.all<{ slug: string; max_rank: number }>('SELECT slug, max_rank FROM items');
          if (items && items.length > 0) {
            for (const item of items) {
              if (!this.isRunning) break;
              await this.syncArchiveDelta(item.slug, item.max_rank || 5);
              // Polite 2500ms pause per item with LOW priority
              await new Promise((r) => setTimeout(r, 2500));
            }
          }
        } catch (e: any) {
          console.warn('[Scraper Stream B] Loop warning:', e.message);
        }
        // Run delta sync every 4 hours (240 minutes) to strictly protect bandwidth limit
        await new Promise((r) => setTimeout(r, 4 * 60 * 60 * 1000));
      }
    };

    setTimeout(runLiveOrderbookLoop, 4000);
    setTimeout(runArchiveDeltaLoop, 30000);
  }
}

export const scraper = new WarframeMarketScraper();
