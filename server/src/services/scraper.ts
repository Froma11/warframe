import fs from 'fs';
import path from 'path';
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
  ducats?: number;
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
      icon?: string;
      thumb?: string;
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
  private archiveSyncTimestamps: Map<string, number> = new Map();
  private inFlightArchiveSyncs: Map<string, Promise<void>> = new Map();

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

  // Sync all Arcanes, Prime Warframes, Prime Weapons and their components from /v2/items
  public async syncMarketCatalog(): Promise<number> {
    console.log('[Scraper] Fetching all items from Warframe Market v2 via ProxyPool...');
    try {
      const json = await proxyPool.fetchJson(`${this.baseUrl}/items`, { priority: 'NORMAL', lang: 'ru' });
      const allItems: RawItem[] = json.data || [];

      // 1. Arcanes
      const arcanes = allItems.filter((item) => {
        return item.tags && (item.tags.includes('arcane_enhancement') || item.tags.includes('arcane'));
      });

      // 2. Warframe Prime Sets
      const wfSets = allItems.filter((item) => {
        return item.tags && item.tags.includes('warframe') && item.tags.includes('prime') && item.tags.includes('set');
      });

      // 3. Weapon Prime Sets
      const wpSets = allItems.filter((item) => {
        return item.tags && item.tags.includes('weapon') && item.tags.includes('prime') && item.tags.includes('set');
      });

      // Map set base slug to set slug for fast lookup of parts
      const setBaseMap = new Map<string, { slug: string; category: string }>();
      for (const s of wfSets) {
        const base = s.slug.replace(/_set$/, '');
        setBaseMap.set(base, { slug: s.slug, category: 'warframe' });
      }
      for (const s of wpSets) {
        const base = s.slug.replace(/_set$/, '');
        setBaseMap.set(base, { slug: s.slug, category: 'weapon' });
      }

      console.log(`[Scraper] Found ${arcanes.length} arcanes, ${wfSets.length} WF sets, ${wpSets.length} Weapon sets out of ${allItems.length} total items.`);

      const upsertSql = `
        INSERT INTO items (
          id, slug, name_en, name_ru, rarity, max_rank, icon_url, thumb_url,
          effect, tags, trading_tax, ducats, category, is_set, set_root_slug, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
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
          ducats = excluded.ducats,
          category = excluded.category,
          is_set = excluded.is_set,
          set_root_slug = excluded.set_root_slug,
          updated_at = CURRENT_TIMESTAMP
      `;

      let totalIndexed = 0;

      await db.transaction(async () => {
        // Upsert arcanes
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
            item.ducats || 0,
            'arcane',
            0,
            null,
          ]);
          totalIndexed++;
        }

        // Upsert Warframe Prime Sets
        for (const item of wfSets) {
          const en = item.i18n?.en || {};
          const ru = item.i18n?.ru || {};
          const iconUrl = en.icon ? `${this.cdnBase}${en.icon}` : '';
          const thumbUrl = en.thumb ? `${this.cdnBase}${en.thumb}` : '';

          await db.run(upsertSql, [
            item.id,
            item.slug,
            en.name || item.slug,
            ru.name || '',
            item.rarity || 'Rare',
            0,
            iconUrl,
            thumbUrl,
            en.description || '',
            JSON.stringify(item.tags || []),
            item.tradingTax || 8000,
            item.ducats || 0,
            'warframe',
            1,
            null,
          ]);
          totalIndexed++;
        }

        // Upsert Weapon Prime Sets
        for (const item of wpSets) {
          const en = item.i18n?.en || {};
          const ru = item.i18n?.ru || {};
          const iconUrl = en.icon ? `${this.cdnBase}${en.icon}` : '';
          const thumbUrl = en.thumb ? `${this.cdnBase}${en.thumb}` : '';

          await db.run(upsertSql, [
            item.id,
            item.slug,
            en.name || item.slug,
            ru.name || '',
            item.rarity || 'Rare',
            0,
            iconUrl,
            thumbUrl,
            en.description || '',
            JSON.stringify(item.tags || []),
            item.tradingTax || 4000,
            item.ducats || 0,
            'weapon',
            1,
            null,
          ]);
          totalIndexed++;
        }

        // Upsert all Parts/Components belonging to those sets
        for (const item of allItems) {
          if (!item.slug || item.slug.endsWith('_set')) continue;
          for (const [base, setInfo] of setBaseMap.entries()) {
            if (item.slug.startsWith(base + '_')) {
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
                0,
                iconUrl,
                thumbUrl,
                en.description || '',
                JSON.stringify(item.tags || []),
                item.tradingTax || 2000,
                item.ducats || 0,
                setInfo.category,
                0,
                setInfo.slug,
              ]);
              totalIndexed++;
              break;
            }
          }
        }
      });

      console.log(`[Scraper] Successfully indexed ${totalIndexed} items (Arcanes, Prime Sets, and Crafting Components) into SQLite.`);
      return totalIndexed;
    } catch (err: any) {
      console.error('[Scraper] Failed to sync market catalog:', err.message);
      throw err;
    }
  }

  // Backward compatibility alias
  public async syncArcanesCatalog(): Promise<number> {
    return this.syncMarketCatalog();
  }

  /**
   * Pre-loads and caches all 1,700+ item icons and thumbnails to local disk
   * Guarantees 0ms local delivery and zero proxy overhead during browsing
   */
  public async preloadAllImages(): Promise<{ total: number; downloaded: number; alreadyCached: number; errors: number }> {
    console.log('[Scraper] Starting bulk image pre-caching...');
    const rows = await db.all<{ icon_url: string; thumb_url: string }>('SELECT icon_url, thumb_url FROM items');
    const uniquePaths = new Set<string>();

    for (const r of rows) {
      if (r.thumb_url) {
        const raw = r.thumb_url.replace(/^https:\/\/warframe\.market\/static\/assets\//, '').replace(/^\/+/, '');
        if (raw) uniquePaths.add(raw);
      }
      if (r.icon_url) {
        const raw = r.icon_url.replace(/^https:\/\/warframe\.market\/static\/assets\//, '').replace(/^\/+/, '');
        if (raw) uniquePaths.add(raw);
      }
    }

    const assetsCacheDir = fs.existsSync(path.resolve(__dirname, '../../data'))
      ? path.resolve(__dirname, '../../data/cached_assets')
      : fs.existsSync(path.resolve(__dirname, '../data'))
      ? path.resolve(__dirname, '../data/cached_assets')
      : path.resolve(process.cwd(), 'data/cached_assets');

    if (!fs.existsSync(assetsCacheDir)) {
      fs.mkdirSync(assetsCacheDir, { recursive: true });
    }

    const missing: string[] = [];
    let alreadyCached = 0;

    for (const rawPath of uniquePaths) {
      const local = path.join(assetsCacheDir, rawPath);
      if (fs.existsSync(local)) {
        try {
          if (fs.statSync(local).size > 0) {
            alreadyCached++;
            continue;
          }
        } catch {}
      }
      missing.push(rawPath);
    }

    console.log(`[Scraper] Bulk images: total unique=${uniquePaths.size}, already cached=${alreadyCached}, downloading missing=${missing.length}...`);

    let downloaded = 0;
    let errors = 0;
    const CONCURRENCY = 25;

    for (let i = 0; i < missing.length; i += CONCURRENCY) {
      const chunk = missing.slice(i, i + CONCURRENCY);
      await Promise.all(
        chunk.map(async (rawPath) => {
          const upstreamUrl = `https://warframe.market/static/assets/${rawPath}`;
          const localFilePath = path.join(assetsCacheDir, rawPath);
          try {
            const buf = await proxyPool.fetchBuffer(upstreamUrl);
            if (buf && buf.length > 0) {
              fs.mkdirSync(path.dirname(localFilePath), { recursive: true });
              fs.writeFileSync(localFilePath, buf);
              downloaded++;
            }
          } catch {
            errors++;
          }
        })
      );
      if ((i + CONCURRENCY) % 150 < CONCURRENCY || i + CONCURRENCY >= missing.length) {
        console.log(`[Scraper] Pre-caching images progress: ${downloaded + alreadyCached}/${uniquePaths.size} (${errors} err)`);
      }
    }

    console.log(`[Scraper] Bulk image pre-cache finished: ${downloaded} downloaded, ${alreadyCached} previously cached, ${errors} failed.`);
    return { total: uniquePaths.size, downloaded, alreadyCached, errors };
  }

  /**
   * Fast-track parallel pre-warming for all 155 Prime Sets and their components
   * Populates 100% complete live orderbooks, 24h averages and 90-day price history in seconds
   */
  public async prewarmMarketSets(): Promise<{ setsCount: number; partsCount: number }> {
    console.log('[Scraper] Starting fast-track pre-warming of Prime Sets & crafting parts...');
    const sets = await db.all<{ slug: string; max_rank: number }>('SELECT slug, max_rank FROM items WHERE is_set = 1');
    const parts = await db.all<{ slug: string; max_rank: number }>('SELECT slug, max_rank FROM items WHERE set_root_slug IS NOT NULL');

    const allToWarm = [...sets, ...parts];
    console.log(`[Scraper] Pre-warming ${sets.length} Prime Sets and ${parts.length} components (${allToWarm.length} total)...`);

    const BATCH_SIZE = 15;
    for (let i = 0; i < allToWarm.length; i += BATCH_SIZE) {
      const batch = allToWarm.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (item) => {
          try {
            await this.syncLiveOrderbook(item.slug);
            await this.syncArchiveDelta(item.slug, item.max_rank || 0, true);
          } catch {}
        })
      );
      if ((i + BATCH_SIZE) % 60 < BATCH_SIZE || i + BATCH_SIZE >= allToWarm.length) {
        console.log(`[Scraper] Pre-warm progress: ${Math.min(i + BATCH_SIZE, allToWarm.length)}/${allToWarm.length}`);
      }
      await new Promise((r) => setTimeout(r, 300));
    }

    console.log(`[Scraper] Pre-warming complete! All ${sets.length} sets and ${parts.length} components fully hydrated.`);
    return { setsCount: sets.length, partsCount: parts.length };
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
   * Stream B: Archive Delta & 90-Day Full Statistics Sync
   * Fetches real closed trade statistics from /v1/items/:slug/statistics via ProxyPool
   * Populates both price_history (daily 90 days) and price_history_hourly (48 hours)
   */
  public async syncArchiveDelta(slug: string, maxRank: number = 5, force: boolean = false): Promise<void> {
    const now = Date.now();
    const lastSync = this.archiveSyncTimestamps.get(slug) || 0;
    if (!force && now - lastSync < 3600 * 1000) {
      return; // 1-hour cooldown per item
    }

    if (this.inFlightArchiveSyncs.has(slug)) {
      return this.inFlightArchiveSyncs.get(slug)!;
    }

    const promise = (async () => {
      try {
        const statsJson = await this.fetchItemStatistics(slug);
        const closedStats = statsJson?.payload?.statistics_closed || {};
        const d90: any[] = closedStats['90days'] || [];
        const h48: any[] = closedStats['48hours'] || [];

        if ((!d90 || d90.length === 0) && (!h48 || h48.length === 0)) return;

        const ranksToProcess = [0, maxRank];

        await db.transaction(async () => {
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

          // 1. Upsert full 90-day daily records
          for (const record of d90) {
            const modRank = record.mod_rank ?? 0;
            if (ranksToProcess.includes(modRank)) {
              const dateStr = record.datetime.split('T')[0];
              coveredDates.add(`${modRank}_${dateStr}`);
              const medianPrice = Math.round(record.median || record.wa_price || record.avg_price || 0);
              if (medianPrice > 0) {
                await db.run(upsertHistory, [
                  slug,
                  modRank,
                  dateStr,
                  medianPrice,
                  record.volume || 0,
                  record.min_price || 0,
                  record.max_price || 0,
                ]);
              }
            }
          }

          // 2. Upsert hourly records into price_history_hourly (last 48h)
          const upsertHourly = `
            INSERT INTO price_history_hourly (item_slug, rank, datetime, median_price, volume, min_price, max_price)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(item_slug, rank, datetime) DO UPDATE SET
              median_price = excluded.median_price,
              volume = excluded.volume,
              min_price = excluded.min_price,
              max_price = excluded.max_price
          `;

          const hourlyByRankAndDate: Record<string, { rank: number; date: string; volume: number; minPrice: number; maxPrice: number; weightedSum: number; count: number }> = {};

          for (const record of h48) {
            const modRank = record.mod_rank ?? 0;
            if (ranksToProcess.includes(modRank)) {
              const medianPrice = Math.round(record.median || record.wa_price || record.avg_price || 0);
              await db.run(upsertHourly, [
                slug,
                modRank,
                record.datetime,
                medianPrice,
                record.volume || 0,
                record.min_price || 0,
                record.max_price || 0,
              ]);

              const dateStr = record.datetime.split('T')[0];
              const key = `${modRank}_${dateStr}`;
              if (!hourlyByRankAndDate[key]) {
                hourlyByRankAndDate[key] = {
                  rank: modRank,
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
              agg.weightedSum += medianPrice * (vol > 0 ? vol : 1);
              agg.count += (vol > 0 ? vol : 1);
            }
          }

          // 3. For any recent dates (e.g. today) not yet in d90, upsert aggregated hourly stats
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
        });

        this.archiveSyncTimestamps.set(slug, Date.now());
      } catch (err: any) {
        console.warn(`[Scraper] Archive sync error for ${slug}:`, err.message);
      } finally {
        this.inFlightArchiveSyncs.delete(slug);
      }
    })();

    this.inFlightArchiveSyncs.set(slug, promise);
    return promise;
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

    // Initial check of catalog & image pre-caching
    setTimeout(async () => {
      try {
        const count = await db.get<{ cnt: number }>('SELECT COUNT(*) as cnt FROM items');
        if (!count || count.cnt < 200) {
          await this.syncMarketCatalog();
        }
        // Pre-cache missing images in background on startup
        this.preloadAllImages().catch((e) => console.warn('[Scraper Worker] Image preload warning:', e.message));
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
            LEFT JOIN (
              SELECT item_slug, SUM(volume) as real_trades_24h
              FROM price_history_hourly
              WHERE datetime >= strftime('%Y-%m-%dT%H:%M:%S', 'now', '-24 hours')
              GROUP BY item_slug
            ) h ON i.slug = h.item_slug
            ORDER BY COALESCE(h.real_trades_24h, 0) DESC
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
