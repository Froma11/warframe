import { db } from '../db';
import { proxyPool } from './proxyPool';

export interface RivenWeapon {
  id: string;
  slug: string;
  name_en: string;
  name_ru: string;
  group_type: string; // 'primary' | 'secondary' | 'melee' | 'sentinel' | 'archgun' | 'kitgun' | 'zaw'
  riven_type: string;
  disposition: number;
  req_mr: number;
  icon_url: string;
  thumb_url: string;
  priority_tier?: number; // 1 = HOT, 2 = WARM, 3 = COLD
  activity_score?: number;
  last_synced_at?: string;
  active_lots_count?: number;
  updated_at?: string;
}

export interface RivenLot {
  id: string;
  weapon_slug: string;
  seller_name: string;
  seller_status: 'online' | 'ingame' | 'offline';
  seller_reputation: number;
  is_direct_sell: boolean;
  buyout_price: number | null;
  starting_price: number | null;
  top_bid: number | null;
  mod_name: string;
  mod_rank: number;
  re_rolls: number;
  mastery_level: number;
  polarity: string;
  attributes: Array<{
    value: number;
    positive: boolean;
    url_name: string;
  }>;
  endo_value: number;
  efficiency: number; // Endo per 1 Platinum
  lot_created_at: string;
  lot_updated_at: string;
  fetched_at?: string;
}

// Exact official Warframe formula for dissolving a Riven mod into Endo
export function calculateRivenEndo(mr: number = 8, rank: number = 0, rerolls: number = 0): number {
  const safeMR = Math.max(8, Number(mr) || 8);
  const safeRank = Math.max(0, Math.min(8, Number(rank) || 0));
  const safeRerolls = Math.max(0, Number(rerolls) || 0);

  const mrBonus = 100 * (safeMR - 8);
  const rankBonus = Math.floor(22.5 * Math.pow(2, safeRank));
  const rerollBonus = 200 * safeRerolls;

  const total = mrBonus + rankBonus + rerollBonus - 7;
  return Math.max(0, total);
}

// Base meta / high-demand weapons (initially assigned to HOT tier)
export const TIER_HOT_SLUGS = new Set([
  'torid', 'glaive', 'glaive_prime', 'rubico', 'rubico_prime',
  'burston', 'burston_prime', 'latron', 'latron_prime', 'dual_toxocyst',
  'ceramic_dagger', 'magistar', 'ocucor', 'phenmor', 'felarx',
  'hate', 'strun', 'strun_prime', 'furis', 'lex', 'lex_prime',
  'boar', 'boar_prime', 'miter', 'angstrum', 'kronen', 'kronen_prime',
  'reaper_prime', 'nataruk', 'kuva_bramma', 'kuva_zarr', 'zarr',
  'bramma', 'laetum', 'praedos', 'innodem', 'verglas', 'cedo',
  'trumna', 'arca_plasmor', 'tenet_arca_plasmor', 'epitaph', 'fulmin',
  'fulmin_prime', 'nukor', 'kuva_nukor', 'sybaris', 'sybaris_prime',
  'acceltra', 'acceltra_prime', 'pyrana', 'pyrana_prime', 'sporelacer',
  'orthos', 'orthos_prime', 'nikana', 'nikana_prime', 'guandao',
  'guandao_prime', 'redeemer', 'redeemer_prime', 'stropha'
]);

class RivenMarketService {
  private isSchedulerRunning: boolean = false;
  private isSyncingWeapon: boolean = false;

  // Track scheduler performance for telemetry
  private hotCount: number = 60;
  private warmCount: number = 160;
  private coldCount: number = 200;

  // Track cycle times
  private lastTierSyncTimes: { [tier: number]: number[] } = { 1: [], 2: [], 3: [] };

  /**
   * Safe cleanup of legacy synthetic seed data
   */
  public async cleanupLegacySeeds(): Promise<void> {
    try {
      const result = await db.run("DELETE FROM riven_lots WHERE id LIKE 'seed_%'");
      if (result.changes && result.changes > 0) {
        console.log('[RivenService] Cleaned up legacy seed lots from SQLite:', result.changes);
      }
    } catch (err: any) {
      console.warn('[RivenService] Cleanup error:', err.message);
    }
  }

  /**
   * Standardize weapon disposition to 4 dots (1.20)
   */
  public async standardizeDispositions(): Promise<void> {
    try {
      const res = await db.run('UPDATE riven_weapons SET disposition = 1.2 WHERE disposition != 1.2');
      if (res.changes && res.changes > 0) {
        console.log(`[RivenService] Standardized disposition to 1.2 (4 dots) for ${res.changes} weapons in SQLite.`);
      }
    } catch (err: any) {
      console.warn('[RivenService] Error standardizing dispositions:', err.message);
    }
  }

  /**
   * Initializes and caches riven weapons catalog into SQLite
   */
  public async syncWeaponsCatalog(): Promise<number> {
    try {
      const existing = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM riven_weapons');
      if (existing && existing.count > 300) {
        console.log(`[RivenService] Weapons catalog already cached (${existing.count} weapons in DB)`);
        await this.initializeTierDistribution();
        return existing.count;
      }

      console.log('[RivenService] Fetching weapons catalog via proxy pool...');
      const json = await proxyPool.fetchJson<any>('https://api.warframe.market/v2/riven/weapons', {
        priority: 'HIGH',
        lang: 'ru'
      });

      if (!json || !Array.isArray(json.data)) {
        console.warn('[RivenService] Could not fetch weapons from remote API');
        return existing?.count || 0;
      }

      let inserted = 0;
      for (const w of json.data) {
        const id = w.id || w.slug;
        const slug = w.slug;
        const nameEn = w.i18n?.en?.name || w.slug;
        const nameRu = w.i18n?.ru?.name || nameEn;
        const groupType = w.group || 'primary';
        const rivenType = w.rivenType || 'rifle';
        const disposition = 1.2;
        const reqMr = Number(w.reqMasteryRank) || 0;
        const iconUrl = w.i18n?.ru?.icon || w.i18n?.en?.icon || '';
        const thumbUrl = w.i18n?.ru?.thumb || w.i18n?.en?.thumb || '';
        const priorityTier = TIER_HOT_SLUGS.has(slug) ? 1 : 2;

        await db.run(
          `INSERT OR REPLACE INTO riven_weapons 
           (id, slug, name_en, name_ru, group_type, riven_type, disposition, req_mr, icon_url, thumb_url, priority_tier, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [id, slug, nameEn, nameRu, groupType, rivenType, disposition, reqMr, iconUrl, thumbUrl, priorityTier]
        );
        inserted++;
      }

      console.log(`[RivenService] Successfully synced ${inserted} riven weapons into SQLite.`);
      await this.initializeTierDistribution();
      return inserted;
    } catch (err: any) {
      console.error('[RivenService] Error syncing weapons:', err.message);
      return 0;
    }
  }

  /**
   * Initializes priority tier distribution if not set
   */
  private async initializeTierDistribution(): Promise<void> {
    try {
      // Set HOT tier for known meta weapons
      for (const slug of TIER_HOT_SLUGS) {
        await db.run('UPDATE riven_weapons SET priority_tier = 1 WHERE slug = ?', [slug]);
      }
      await this.refreshTierCounts();
    } catch {}
  }

  private async refreshTierCounts(): Promise<void> {
    try {
      const counts = await db.all<{ priority_tier: number; cnt: number }>(
        'SELECT priority_tier, COUNT(*) as cnt FROM riven_weapons GROUP BY priority_tier'
      );
      for (const row of counts) {
        if (row.priority_tier === 1) this.hotCount = row.cnt;
        else if (row.priority_tier === 2) this.warmCount = row.cnt;
        else if (row.priority_tier === 3) this.coldCount = row.cnt;
      }
    } catch {}
  }

  /**
   * Synchronizes lots for a single weapon using the proxy pool and zero-lock SQLite batching
   */
  public async syncWeaponLots(weaponSlug: string, priority: 'HIGH' | 'NORMAL' | 'LOW' = 'NORMAL'): Promise<number> {
    const targetUrl = `https://api.warframe.market/v1/auctions/search?type=riven&weapon_url_name=${encodeURIComponent(weaponSlug)}&sort_by=price_asc`;

    try {
      const startMs = Date.now();
      const data = await proxyPool.fetchJson<any>(targetUrl, { priority, lang: 'ru' });
      if (!data || !data.payload || !Array.isArray(data.payload.auctions)) {
        return 0;
      }

      const rawAuctions = data.payload.auctions;
      const validLots: any[] = [];
      let maxEfficiencyFound = 0;
      let hasFreshLot = false;
      const fifteenMinAgo = Date.now() - 15 * 60 * 1000;

      for (const a of rawAuctions) {
        if (!a || !a.item || a.item.type !== 'riven' || a.closed === true || a.visible === false) {
          continue;
        }

        // Platform filter: strictly PC or crossplay
        if (a.platform && a.platform !== 'pc' && !a.crossplay) continue;
        if (a.owner?.platform && a.owner?.platform !== 'pc' && !a.owner?.crossplay) continue;

        const isDirect = Boolean(
          a.is_direct_sell === true ||
          (a.buyout_price !== null && a.starting_price !== null && a.buyout_price === a.starting_price)
        );

        const buyoutPrice = a.buyout_price !== undefined && a.buyout_price !== null ? Number(a.buyout_price) : null;
        const startingPrice = a.starting_price !== undefined && a.starting_price !== null ? Number(a.starting_price) : 0;
        const topBid = a.top_bid !== undefined && a.top_bid !== null ? Number(a.top_bid) : null;

        // Effective price for Endo efficiency formula
        let effectivePrice = 0;
        if (buyoutPrice !== null && buyoutPrice > 0) {
          effectivePrice = buyoutPrice;
        } else {
          effectivePrice = (topBid !== null && topBid > 0) ? topBid : startingPrice;
        }

        const modName = a.item.name || '';
        const modRank = Number(a.item.mod_rank) || 0;
        const reRolls = Number(a.item.re_rolls) || 0;
        const masteryLevel = Number(a.item.mastery_level) || 8;
        const polarity = a.item.polarity || '';
        const attributesJson = JSON.stringify(a.item.attributes || []);

        const sellerName = a.owner?.ingame_name || a.owner?.slug || 'Tenno';
        const sellerStatus = a.owner?.status || 'offline';
        const sellerReputation = Number(a.owner?.reputation) || 0;

        const endoValue = calculateRivenEndo(masteryLevel, modRank, reRolls);
        const efficiency = effectivePrice > 0 ? Number((endoValue / effectivePrice).toFixed(2)) : 0;

        if (efficiency > maxEfficiencyFound) {
          maxEfficiencyFound = efficiency;
        }

        const lotCreatedTime = a.created ? new Date(a.created).getTime() : 0;
        if (lotCreatedTime >= fifteenMinAgo) {
          hasFreshLot = true;
        }

        validLots.push({
          id: a.id,
          weapon_slug: weaponSlug,
          seller_name: sellerName,
          seller_status: sellerStatus,
          seller_reputation: sellerReputation,
          is_direct_sell: isDirect ? 1 : 0,
          buyout_price: buyoutPrice,
          starting_price: startingPrice,
          top_bid: topBid,
          mod_name: modName,
          mod_rank: modRank,
          re_rolls: reRolls,
          mastery_level: masteryLevel,
          polarity,
          attributes: attributesJson,
          endo_value: endoValue,
          efficiency,
          lot_created_at: a.created || new Date().toISOString(),
          lot_updated_at: a.updated || new Date().toISOString()
        });
      }

      // Zero-lock batch update in SQLite
      await db.run('BEGIN TRANSACTION');
      try {
        await db.run('DELETE FROM riven_lots WHERE weapon_slug = ?', [weaponSlug]);

        const insertStmt = `
          INSERT OR REPLACE INTO riven_lots (
            id, weapon_slug, seller_name, seller_status, seller_reputation,
            is_direct_sell, buyout_price, starting_price, top_bid,
            mod_name, mod_rank, re_rolls, mastery_level, polarity,
            attributes, endo_value, efficiency, lot_created_at, lot_updated_at, fetched_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;

        for (const lot of validLots) {
          await db.run(insertStmt, [
            lot.id,
            lot.weapon_slug,
            lot.seller_name,
            lot.seller_status,
            lot.seller_reputation,
            lot.is_direct_sell,
            lot.buyout_price,
            lot.starting_price,
            lot.top_bid,
            lot.mod_name,
            lot.mod_rank,
            lot.re_rolls,
            lot.mastery_level,
            lot.polarity,
            lot.attributes,
            lot.endo_value,
            lot.efficiency,
            lot.lot_created_at,
            lot.lot_updated_at
          ]);
        }

        // Determine new tier and activity score
        let newTier = 3; // Default COLD
        if (TIER_HOT_SLUGS.has(weaponSlug) || maxEfficiencyFound >= 12 || (hasFreshLot && validLots.length >= 10)) {
          newTier = 1; // HOT
        } else if (validLots.length >= 3 || hasFreshLot) {
          newTier = 2; // WARM
        }

        const activityScore = Number((validLots.length * 0.1 + maxEfficiencyFound * 0.5).toFixed(2));

        await db.run(
          `UPDATE riven_weapons 
           SET last_synced_at = CURRENT_TIMESTAMP, 
               active_lots_count = ?, 
               priority_tier = ?, 
               activity_score = ?
           WHERE slug = ?`,
          [validLots.length, newTier, activityScore, weaponSlug]
        );

        await db.run('COMMIT');

        // Record cycle metric
        const durationSec = Math.round((Date.now() - startMs) / 1000);
        this.recordTierMetric(newTier, durationSec);
      } catch (err: any) {
        await db.run('ROLLBACK').catch(() => {});
        console.warn(`[RivenService] SQLite error writing lots for ${weaponSlug}:`, err.message);
      }

      return validLots.length;
    } catch (err: any) {
      console.warn(`[RivenService] Error syncing lots for ${weaponSlug}:`, err.message);
      return 0;
    }
  }

  private recordTierMetric(tier: number, durationSec: number): void {
    if (!this.lastTierSyncTimes[tier]) this.lastTierSyncTimes[tier] = [];
    this.lastTierSyncTimes[tier].push(durationSec);
    if (this.lastTierSyncTimes[tier].length > 20) {
      this.lastTierSyncTimes[tier].shift();
    }
  }

  /**
   * Starts the continuous multi-tier priority scheduler
   */
  public startPriorityScheduler(): void {
    if (this.isSchedulerRunning) return;
    this.isSchedulerRunning = true;

    console.log('[RivenService] Starting 3-Tier Priority Scheduler (HOT: 48s, WARM: 100s, COLD: 220s)...');

    // Run background loop
    const schedulerLoop = async () => {
      while (this.isSchedulerRunning) {
        try {
          await this.processNextScheduledWeapon();
        } catch (err: any) {
          console.warn('[RivenService] Scheduler loop warning:', err.message);
        }

        // Adaptive pacing: If CF nodes are active, cycle faster (~300ms); if relying on DIRECT-VPS, pace safely (~1350ms)
        const telemetry = proxyPool.getTelemetry();
        const cfHealthy = telemetry.nodes.filter(n => n.id.startsWith('CF-') && n.status === 'READY').length;
        const delayMs = cfHealthy > 0 ? 300 : 1350;
        await new Promise(r => setTimeout(r, delayMs));
      }
    };

    setTimeout(() => {
      this.cleanupLegacySeeds().then(() => {
        this.standardizeDispositions().then(() => {
          this.syncWeaponsCatalog().then(() => {
            schedulerLoop();
          });
        });
      });
    }, 2000);
  }

  /**
   * Finds the most urgent weapon across HOT, WARM, COLD tiers and syncs it
   */
  private async processNextScheduledWeapon(): Promise<void> {
    if (this.isSyncingWeapon) return;
    this.isSyncingWeapon = true;

    try {
      // Check if Off-Peak (01:00 - 07:00 UTC)
      const currentUtcHour = new Date().getUTCHours();
      const isOffPeak = currentUtcHour >= 1 && currentUtcHour < 7;
      const offPeakMultiplier = isOffPeak ? 1.35 : 1.0;

      const hotTargetInterval = Math.round(48 * offPeakMultiplier);
      const warmTargetInterval = Math.round(100 * offPeakMultiplier);
      const coldTargetInterval = Math.round(220 * offPeakMultiplier);

      // Query the single weapon that is most overdue relative to its tier's target interval
      const query = `
        SELECT slug, priority_tier, last_synced_at,
          CASE 
            WHEN last_synced_at IS NULL THEN 999999
            ELSE (strftime('%s', 'now') - strftime('%s', last_synced_at))
          END as elapsed_sec,
          CASE
            WHEN priority_tier = 1 THEN ${hotTargetInterval}
            WHEN priority_tier = 2 THEN ${warmTargetInterval}
            ELSE ${coldTargetInterval}
          END as target_interval
        FROM riven_weapons
        ORDER BY (
          CASE 
            WHEN last_synced_at IS NULL THEN 999999
            ELSE (strftime('%s', 'now') - strftime('%s', last_synced_at))
          END - 
          CASE
            WHEN priority_tier = 1 THEN ${hotTargetInterval}
            WHEN priority_tier = 2 THEN ${warmTargetInterval}
            ELSE ${coldTargetInterval}
          END
        ) DESC
        LIMIT 1
      `;

      const candidate = await db.get<any>(query);
      if (candidate && candidate.slug) {
        await this.syncWeaponLots(candidate.slug, 'NORMAL');
      }
    } finally {
      this.isSyncingWeapon = false;
    }
  }

  /**
   * Returns telemetry metrics for /api/status
   */
  public getSchedulerTelemetry(): {
    hotCount: number;
    warmCount: number;
    coldCount: number;
    avgCycleTimeSec: { hot: number; warm: number; cold: number };
  } {
    const calcAvg = (tier: number, fallback: number) => {
      const times = this.lastTierSyncTimes[tier] || [];
      if (times.length === 0) return fallback;
      const sum = times.reduce((a, b) => a + b, 0);
      return Math.round(sum / times.length);
    };

    return {
      hotCount: this.hotCount,
      warmCount: this.warmCount,
      coldCount: this.coldCount,
      avgCycleTimeSec: {
        hot: calcAvg(1, 48),
        warm: calcAvg(2, 100),
        cold: calcAvg(3, 220)
      }
    };
  }

  /**
   * Search weapons in catalog (Russian / English Unicode-safe)
   */
  public async getWeapons(search: string = '', group: string = 'all'): Promise<RivenWeapon[]> {
    let sql = 'SELECT * FROM riven_weapons';
    const params: any[] = [];
    const whereClauses: string[] = [];

    const cleanGroup = group.toLowerCase().trim();
    if (cleanGroup && cleanGroup !== 'all') {
      if (cleanGroup === 'melee') {
        whereClauses.push('(group_type = "melee" OR group_type = "zaw")');
      } else if (cleanGroup === 'primary') {
        whereClauses.push('(group_type = "primary" OR group_type = "rifle" OR group_type = "shotgun")');
      } else if (cleanGroup === 'secondary') {
        whereClauses.push('(group_type = "secondary" OR group_type = "pistol" OR group_type = "kitgun")');
      } else {
        whereClauses.push('group_type = ?');
        params.push(cleanGroup);
      }
    }

    if (whereClauses.length > 0) {
      sql += ' WHERE ' + whereClauses.join(' AND ');
    }

    sql += ' ORDER BY name_ru ASC';
    const allRows = await db.all<RivenWeapon>(sql, params);

    const cleanSearch = search.toLowerCase().trim();
    if (!cleanSearch) return allRows;

    return allRows.filter((w) => {
      const ru = (w.name_ru || '').toLowerCase();
      const en = (w.name_en || '').toLowerCase();
      const slug = (w.slug || '').toLowerCase();
      return ru.includes(cleanSearch) || en.includes(cleanSearch) || slug.includes(cleanSearch);
    });
  }

  /**
   * Query lots for a specific weapon from SQLite with filtering and sorting
   */
  public async getLotsForWeapon(
    weaponSlug: string,
    options: {
      type?: 'all' | 'direct' | 'auction';
      rerolls?: 'all' | 'unrolled' | 'rolled';
      rank?: 'all' | 'unranked' | 'max';
      onlineOnly?: boolean;
      sortBy?: 'date_desc' | 'price_asc' | 'price_desc' | 'endo_desc' | 'efficiency_desc';
    } = {}
  ): Promise<{ lots: RivenLot[]; total: number; weapon?: RivenWeapon }> {
    const weapon = await db.get<RivenWeapon>('SELECT * FROM riven_weapons WHERE slug = ?', [weaponSlug]);

    // Check if weapon has any lots. If not or if overdue (> 120s), trigger background sync
    const countRow = await db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM riven_lots WHERE weapon_slug = ?',
      [weaponSlug]
    );

    if (!countRow || countRow.count === 0) {
      // Trigger background sync without blocking client response
      this.syncWeaponLots(weaponSlug, 'HIGH').catch(() => {});
    }

    let sql = 'SELECT * FROM riven_lots WHERE weapon_slug = ?';
    const params: any[] = [weaponSlug];

    if (options.type === 'direct') {
      sql += ' AND is_direct_sell = 1';
    } else if (options.type === 'auction') {
      sql += ' AND is_direct_sell = 0';
    }

    if (options.rerolls === 'unrolled') {
      sql += ' AND re_rolls = 0';
    } else if (options.rerolls === 'rolled') {
      sql += ' AND re_rolls > 0';
    }

    if (options.rank === 'unranked') {
      sql += ' AND mod_rank = 0';
    } else if (options.rank === 'max') {
      sql += ' AND mod_rank >= 8';
    }

    if (options.onlineOnly) {
      sql += ' AND (seller_status = "online" OR seller_status = "ingame")';
    }

    switch (options.sortBy) {
      case 'price_asc':
        sql += ' ORDER BY COALESCE(buyout_price, starting_price, 999999) ASC';
        break;
      case 'price_desc':
        sql += ' ORDER BY COALESCE(buyout_price, starting_price, 0) DESC';
        break;
      case 'endo_desc':
        sql += ' ORDER BY endo_value DESC';
        break;
      case 'efficiency_desc':
        sql += ' ORDER BY efficiency DESC';
        break;
      case 'date_desc':
      default:
        sql += ' ORDER BY lot_created_at DESC, fetched_at DESC';
        break;
    }

    sql += ' LIMIT 250';

    const rows = await db.all<any>(sql, params);

    const lots: RivenLot[] = rows.map((r) => {
      let attributes: any[] = [];
      try {
        attributes = JSON.parse(r.attributes || '[]');
      } catch {}

      return {
        id: r.id,
        weapon_slug: r.weapon_slug,
        seller_name: r.seller_name,
        seller_status: r.seller_status,
        seller_reputation: r.seller_reputation,
        is_direct_sell: Boolean(r.is_direct_sell),
        buyout_price: r.buyout_price,
        starting_price: r.starting_price,
        top_bid: r.top_bid,
        mod_name: r.mod_name,
        mod_rank: r.mod_rank,
        re_rolls: r.re_rolls,
        mastery_level: r.mastery_level,
        polarity: r.polarity,
        attributes,
        endo_value: r.endo_value,
        efficiency: r.efficiency,
        lot_created_at: r.lot_created_at,
        lot_updated_at: r.lot_updated_at,
        fetched_at: r.fetched_at
      };
    });

    return {
      lots,
      total: lots.length,
      weapon,
    };
  }

  /**
   * Compatibility alias for syncing auctions
   */
  public async syncLiveAuctions(weaponSlug?: string): Promise<number> {
    if (weaponSlug) {
      return await this.syncWeaponLots(weaponSlug, 'HIGH');
    }
    await this.processNextScheduledWeapon();
    return this.hotCount;
  }

  /**
   * Compatibility alias for starting the background worker
   */
  public startBackgroundWorker(): void {
    this.startPriorityScheduler();
  }
}

export const rivenService = new RivenMarketService();
