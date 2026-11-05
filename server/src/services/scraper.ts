import { db } from '../db';

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
  private lastRequestTime: number = 0;
  private readonly minDelayMs: number = 400; // Rate limit guard: 400ms between calls
  private readonly baseUrl: string = 'https://api.warframe.market/v2';
  private readonly cdnBase: string = 'https://warframe.market/static/assets/';

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Rate-limited fetch wrapper with automatic backoff
  private async rateLimitedFetch(url: string, extraHeaders: Record<string, string> = {}): Promise<any> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minDelayMs) {
      await this.sleep(this.minDelayMs - elapsed);
    }
    this.lastRequestTime = Date.now();

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Platform': 'pc',
        ...extraHeaders,
      },
    });

    if (response.status === 429) {
      console.warn('[Scraper 429] Rate limit hit! Backing off for 12 seconds...');
      await this.sleep(12000);
      return this.rateLimitedFetch(url, extraHeaders);
    }

    if (!response.ok) {
      throw new Error(`Warframe Market API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Fetch real closed trade statistics from /v1/items/{slug}/statistics
  public async fetchItemStatistics(slug: string): Promise<any> {
    const url = `https://api.warframe.market/v1/items/${slug}/statistics`;
    try {
      return await this.rateLimitedFetch(url, { Language: 'ru', Platform: 'pc' });
    } catch (err: any) {
      console.warn(`[Scraper] Could not fetch statistics for ${slug}:`, err.message);
      return null;
    }
  }

  // Sync all Arcanes list from /v2/items
  public async syncArcanesCatalog(): Promise<number> {
    console.log('[Scraper] Fetching all items from Warframe Market v2...');
    try {
      const json = await this.rateLimitedFetch(`${this.baseUrl}/items`, { Language: 'ru' });
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

  // Calculate market metrics for an item from both live orders AND official completed statistics
  public async syncItemOrders(slug: string, maxRank: number = 5): Promise<any> {
    try {
      // 1. Fetch live orders to determine current lowest available selling price
      let orders: RawOrder[] = [];
      try {
        const ordersJson = await this.rateLimitedFetch(`${this.baseUrl}/orders/item/${slug}`);
        orders = ordersJson.data || [];
      } catch (e: any) {
        console.warn(`[Scraper] Live orders warning for ${slug}:`, e.message);
      }

      // 2. Fetch real closed trade statistics (the authentic completed deals)
      const statsJson = await this.fetchItemStatistics(slug);
      const closedStats = statsJson?.payload?.statistics_closed || {};
      const h48: any[] = closedStats['48hours'] || [];
      const d90: any[] = closedStats['90days'] || [];

      const cutoff24h = new Date(Date.now() - 24 * 3600 * 1000);
      const tradesLast24h = h48.filter((s) => new Date(s.datetime) >= cutoff24h);

      // Total 24h closed trades across all ranks
      const totalVolume24h = tradesLast24h.reduce((acc, s) => acc + (s.volume || 0), 0);

      // Determine ranks to calculate: Rank 0 and Max Rank (e.g. 5 or 3)
      const ranksToProcess = [0, maxRank];

      // Upsert historical 90-day daily statistics into price_history
      const upsertHistory = `
        INSERT INTO price_history (item_slug, rank, date, median_price, volume, min_price, max_price)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(item_slug, rank, date) DO UPDATE SET
          median_price = excluded.median_price,
          volume = excluded.volume,
          min_price = excluded.min_price,
          max_price = excluded.max_price
      `;

      const coveredDates = new Set<string>();
      for (const record of d90) {
        if (ranksToProcess.includes(record.mod_rank)) {
          const dateStr = record.datetime.split('T')[0];
          coveredDates.add(`${record.mod_rank}_${dateStr}`);
          await db.run(upsertHistory, [
            slug,
            record.mod_rank,
            dateStr,
            record.median || record.avg_price || 0,
            record.volume || 0,
            record.min_price || 0,
            record.max_price || 0,
          ]);
        }
      }

      // Upsert hourly statistics (last 48h) into price_history_hourly
      const upsertHourly = `
        INSERT INTO price_history_hourly (item_slug, rank, datetime, median_price, volume, min_price, max_price)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(item_slug, rank, datetime) DO UPDATE SET
          median_price = excluded.median_price,
          volume = excluded.volume,
          min_price = excluded.min_price,
          max_price = excluded.max_price
      `;

      // Also aggregate hourly data into price_history for any current/recent date not yet published in d90
      const hourlyByRankAndDate: { [key: string]: { rank: number; date: string; volume: number; minPrice: number; maxPrice: number; weightedSum: number; count: number } } = {};

      for (const record of h48) {
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

          const dateStr = record.datetime.split('T')[0];
          const key = `${record.mod_rank}_${dateStr}`;
          if (!hourlyByRankAndDate[key]) {
            hourlyByRankAndDate[key] = {
              rank: record.mod_rank,
              date: dateStr,
              volume: 0,
              minPrice: record.min_price || 999999,
              maxPrice: record.max_price || 0,
              weightedSum: 0,
              count: 0,
            };
          }
          const agg = hourlyByRankAndDate[key];
          const vol = record.volume || 0;
          agg.volume += vol;
          if (record.min_price && record.min_price < agg.minPrice) agg.minPrice = record.min_price;
          if (record.max_price && record.max_price > agg.maxPrice) agg.maxPrice = record.max_price;
          const price = record.wa_price || record.median || record.avg_price || 0;
          agg.weightedSum += price * (vol > 0 ? vol : 1);
          agg.count += (vol > 0 ? vol : 1);
        }
      }

      // If recent dates (today/yesterday) are not yet finalized in d90, upsert the aggregated stats from h48
      for (const key of Object.keys(hourlyByRankAndDate)) {
        if (!coveredDates.has(key)) {
          const agg = hourlyByRankAndDate[key];
          const medianPrice = agg.count > 0 ? Math.round(agg.weightedSum / agg.count) : 0;
          if (medianPrice > 0) {
            await db.run(upsertHistory, [
              slug,
              agg.rank,
              agg.date,
              medianPrice,
              agg.volume,
              agg.minPrice === 999999 ? medianPrice : agg.minPrice,
              agg.maxPrice === 0 ? medianPrice : agg.maxPrice,
            ]);
          }
        }
      }

      const insertSnapshot = `
        INSERT INTO market_snapshots 
        (item_slug, rank, min_sell, max_buy, spread, spread_pct, median_price, sellers_count, buyers_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      for (const rank of ranksToProcess) {
        // Active sell orders (in-game or online)
        const sellOrders = orders
          .filter((o) => o.type === 'sell' && o.visible && o.rank === rank && (o.user.status === 'ingame' || o.user.status === 'online'))
          .sort((a, b) => a.platinum - b.platinum);

        // Best active live sell price
        const minLiveSell = sellOrders.length > 0 ? sellOrders[0].platinum : 0;

        // Statistics for this specific rank in last 24h
        const rankStats24h = tradesLast24h.filter((s) => s.mod_rank === rank);
        const rankVolume24h = rankStats24h.reduce((acc, s) => acc + (s.volume || 0), 0);

        // Real average price of sold items
        let realAvgSoldPrice = 0;
        if (rankVolume24h > 0) {
          const weightedSum = rankStats24h.reduce(
            (acc, s) => acc + (s.wa_price || s.avg_price || s.median) * (s.volume || 1),
            0
          );
          realAvgSoldPrice = Math.round(weightedSum / rankVolume24h);
        } else {
          // Fallback to latest 90-day daily record for this rank
          const latestD90 = d90.filter((s) => s.mod_rank === rank).slice(-1)[0];
          if (latestD90) {
            realAvgSoldPrice = Math.round(latestD90.avg_price || latestD90.median || 0);
          }
        }

        // If no trade data at all, use live minSell
        if (realAvgSoldPrice === 0) {
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
          realAvgSoldPrice, // Stored as the real average sold price
          rankVolume24h,   // Sold volume for this rank
          totalVolume24h,  // Total 24h volume across ranks
        ]);
      }

      return { slug, totalVolume24h };
    } catch (err: any) {
      console.error(`[Scraper] Error syncing item ${slug}:`, err.message);
      return null;
    }
  }

  // Start continuous graceful background rotation across ALL items
  public startBackgroundWorker(intervalMinutes: number = 15) {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log(`[Scraper Worker] Started background worker (Interval: ${intervalMinutes} min)`);

    const runCycle = async () => {
      try {
        // Ensure catalog is loaded
        const count = await db.get<{ cnt: number }>('SELECT COUNT(*) as cnt FROM items');
        if (!count || count.cnt === 0) {
          await this.syncArcanesCatalog();
        }

        // Get list of all arcanes with their max_rank
        const items = await db.all<{ slug: string; max_rank: number }>('SELECT slug, max_rank FROM items');
        console.log(`[Scraper Worker] Beginning statistics and order sync cycle for ${items.length} items...`);

        for (const item of items) {
          await this.syncItemOrders(item.slug, item.max_rank || 5);
        }

        console.log('[Scraper Worker] Completed sync cycle successfully.');
      } catch (e: any) {
        console.error('[Scraper Worker] Cycle error:', e.message);
      }

      // Schedule next cycle
      setTimeout(runCycle, intervalMinutes * 60 * 1000);
    };

    // Run first cycle with slight delay
    setTimeout(runCycle, 2000);
  }
}

export const scraper = new WarframeMarketScraper();
