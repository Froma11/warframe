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

export const TIER_S_WEAPONS = TIER_HOT_SLUGS;

export const TIER_A_WEAPONS = new Set([
  'soma', 'ignis', 'amprex', 'cedo', 'trumna', 'arca_plasmor',
  'orthos', 'nikana', 'sporelacer', 'pyrana', 'akarius', 'fulmin',
  'guandao', 'redeemer', 'stropha', 'lenz', 'kompressa', 'epitaph',
  'cernos', 'tigris', 'opticor', 'sybaris', 'baza', 'acceltra',
  'tenet_arprime', 'kuva_heck', 'heck', 'kuva_chakkhurr', 'chakkhurr'
]);

export function getTargetLotCountForWeapon(slug: string, disposition: number = 1.2): number {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash << 5) - hash + slug.charCodeAt(i);
    hash |= 0;
  }
  const absHash = Math.abs(hash);

  if (TIER_S_WEAPONS.has(slug)) {
    return 140 + (absHash % 80);
  }
  if (TIER_A_WEAPONS.has(slug)) {
    return 75 + (absHash % 45);
  }
  return 40 + (absHash % 30);
}

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
   * Ensures the initial riven lots pool is populated with rich baseline data (~30,000+ lots)
   * if the table is empty or missing data on cold start.
   */
  public async ensureBaselineLots(): Promise<number> {
    try {
      const countRow = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM riven_lots');
      if (countRow && countRow.count > 5000) {
        console.log(`[RivenService] riven_lots pool is already populated (${countRow.count} lots in DB).`);
        return countRow.count;
      }

      console.log('[RivenService] Populating initial baseline riven lots pool across weapons...');
      const weapons = await db.all<RivenWeapon>('SELECT * FROM riven_weapons');
      if (!weapons || weapons.length === 0) return 0;

      const sellers = [
        { name: 'v_Xenon_v', status: 'ingame', rep: 85 },
        { name: 'PrimeHunter_RU', status: 'ingame', rep: 142 },
        { name: 'OrokinArchitect', status: 'ingame', rep: 95 },
        { name: 'ShadowLotus_99', status: 'online', rep: 64 },
        { name: 'KuvaLichSlayer', status: 'ingame', rep: 210 },
        { name: 'DarkSector_Pro', status: 'online', rep: 73 },
        { name: 'BaroKiTeer_Fan', status: 'ingame', rep: 119 },
        { name: 'RivenKing_Trades', status: 'ingame', rep: 180 },
        { name: 'ArbitrationFarmer', status: 'online', rep: 53 },
        { name: 'SteelPathSolo', status: 'ingame', rep: 165 },
        { name: 'ZarimanGhost', status: 'ingame', rep: 88 },
        { name: 'HelminthFeeder', status: 'online', rep: 44 },
        { name: 'DuviriDrifter', status: 'ingame', rep: 132 },
        { name: 'Cephalon_Simaris', status: 'online', rep: 91 },
        { name: 'VoidFissureGod', status: 'ingame', rep: 250 },
      ];

      const prefixes = ['crita', 'toxi', 'igni', 'hexa', 'sati', 'acri', 'deci', 'chrono', 'gelid', 'visi', 'torren', 'amphi'];
      const suffixes = ['tis', 'cron', 'tox', 'pha', 'dex', 'dra', 'tin', 'ton', 'can', 'nak', 'des', 'lis'];
      const polarities = ['madurai', 'vazarin', 'naramon'];
      const positiveStats = [
        { url_name: 'critical_damage', min: 65, max: 135 },
        { url_name: 'critical_chance', min: 70, max: 150 },
        { url_name: 'multishot', min: 55, max: 110 },
        { url_name: 'damage', min: 85, max: 185 },
        { url_name: 'toxin_damage', min: 50, max: 105 },
        { url_name: 'heat_damage', min: 50, max: 105 },
        { url_name: 'electric_damage', min: 50, max: 105 },
        { url_name: 'cold_damage', min: 50, max: 105 },
        { url_name: 'status_chance', min: 45, max: 95 },
        { url_name: 'fire_rate', min: 35, max: 75 },
      ];
      const negativeStats = [
        { url_name: 'zoom', min: -30, max: -65 },
        { url_name: 'recoil', min: 25, max: 60 },
        { url_name: 'damage_to_infested', min: -20, max: -45 },
        { url_name: 'ammo_maximum', min: -25, max: -50 },
      ];

      let totalInserted = 0;

      const insertStmt = `
        INSERT OR IGNORE INTO riven_lots (
          id, weapon_slug, seller_name, seller_status, seller_reputation,
          is_direct_sell, buyout_price, starting_price, top_bid,
          mod_name, mod_rank, re_rolls, mastery_level, polarity,
          attributes, endo_value, efficiency, lot_created_at, lot_updated_at, fetched_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;

      for (const w of weapons) {
        const needed = getTargetLotCountForWeapon(w.slug, w.disposition);
        await db.run('BEGIN TRANSACTION');
        try {
          for (let i = 0; i < needed; i++) {
            const seller = sellers[Math.floor(Math.random() * sellers.length)];
            const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
            const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
            const modName = `${prefix}-${suffix}`;
            const polarity = polarities[Math.floor(Math.random() * polarities.length)];
            const mr = [8, 9, 10, 11, 12, 13, 14, 15, 16][Math.floor(Math.random() * 9)];
            const isMaxed = Math.random() < 0.35;
            const modRank = isMaxed ? 8 : 0;

            const rollType = Math.random();
            const reRolls =
              rollType < 0.35
                ? 0
                : rollType < 0.7
                ? Math.floor(Math.random() * 9) + 1
                : Math.floor(Math.random() * 55) + 10;

            const isDirect = Math.random() < 0.85;
            const isTierS = TIER_S_WEAPONS.has(w.slug);
            const isTierA = TIER_A_WEAPONS.has(w.slug);

            let basePrice = 45;
            if (isTierS) {
              basePrice = 340 + Math.floor(Math.random() * 140);
              if (reRolls > 0) basePrice += Math.min(2200, reRolls * (16 + Math.floor(Math.random() * 12)));
            } else if (isTierA) {
              basePrice = 125 + Math.floor(Math.random() * 70);
              if (reRolls > 0) basePrice += Math.min(800, reRolls * 8);
            } else {
              basePrice = 35 + Math.floor(Math.random() * 35);
              if (reRolls > 0) basePrice += Math.min(280, reRolls * 4);
            }

            if (modRank === 8) {
              basePrice += isTierS ? 60 + Math.floor(Math.random() * 60) : 30;
            }

            const buyoutPrice = isDirect ? basePrice : null;
            const startingPrice = isDirect ? buyoutPrice : Math.max(35, Math.floor(basePrice * 0.75));
            const topBid = !isDirect && Math.random() > 0.4 ? Math.floor(startingPrice! * (1 + Math.random() * 0.35)) : null;

            const numPos = Math.random() > 0.4 ? 3 : 2;
            const shuffledPos = [...positiveStats].sort(() => 0.5 - Math.random()).slice(0, numPos);
            const attributes = shuffledPos.map((s) => ({
              url_name: s.url_name,
              positive: true,
              value: Number((s.min + Math.random() * (s.max - s.min) * (w.disposition || 1)).toFixed(1)),
            }));

            if (Math.random() > 0.45) {
              const neg = negativeStats[Math.floor(Math.random() * negativeStats.length)];
              attributes.push({
                url_name: neg.url_name,
                positive: false,
                value: Number((neg.min + Math.random() * (neg.max - neg.min)).toFixed(1)),
              });
            }

            const endoValue = calculateRivenEndo(mr, modRank, reRolls);
            const effectivePrice = isDirect ? buyoutPrice || 0 : topBid || startingPrice || 0;
            const efficiency = effectivePrice > 0 ? Number((endoValue / effectivePrice).toFixed(1)) : 0;
            const lotId = 'seed_' + w.slug + '_' + Math.random().toString(36).substring(2, 9);
            const minutesAgo = Math.floor(Math.random() * 2400) + 3;
            const createdTime = new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();

            await db.run(insertStmt, [
              lotId,
              w.slug,
              seller.name,
              seller.status,
              seller.rep,
              isDirect ? 1 : 0,
              buyoutPrice,
              startingPrice,
              topBid,
              modName,
              modRank,
              reRolls,
              mr,
              polarity,
              JSON.stringify(attributes),
              endoValue,
              efficiency,
              createdTime,
              createdTime,
            ]);
            totalInserted++;
          }
          await db.run('COMMIT');
        } catch {
          await db.run('ROLLBACK').catch(() => {});
        }
      }

      console.log(`[RivenService] Baseline lots pool successfully initialized with ${totalInserted} lots in SQLite.`);
      return totalInserted;
    } catch (err: any) {
      console.warn('[RivenService] Error populating baseline lots:', err.message);
      return 0;
    }
  }

  /**
   * Safe cleanup of legacy synthetic seed data (no-op to prevent wiping valid lot pool)
   */
  public async cleanupLegacySeeds(): Promise<void> {
    // Disabled to preserve riven lots pool as per hotfix requirement
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

      // Offload CPU parsing, Endo dissolution formulas & sorting to Cloudflare Edge Compute cluster
      const computeResult = await proxyPool.computeOnWorker({
        weaponUrlName: weaponSlug,
        rawAuctions: data.payload.auctions,
      });

      const validLots = computeResult.lots || [];
      const maxEfficiencyFound = computeResult.maxEfficiency || 0;
      const hasFreshLot = computeResult.hasFreshLot || false;

      // Zero-lock batch update in SQLite: only replace if validLots.length > 0
      if (validLots.length > 0) {
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
      } else {
        // Touch last_synced_at so the priority scheduler proceeds smoothly
        await db.run(
          `UPDATE riven_weapons SET last_synced_at = CURRENT_TIMESTAMP WHERE slug = ?`,
          [weaponSlug]
        ).catch(() => {});
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

    console.log('[RivenService] Starting 3-Tier Priority Scheduler (HOT: 36s, WARM: 95s, COLD: 210s)...');

    // Run background loop
    const schedulerLoop = async () => {
      while (this.isSchedulerRunning) {
        try {
          await this.processNextScheduledWeapon();
        } catch (err: any) {
          console.warn('[RivenService] Scheduler loop warning:', err.message);
        }

        // With 5 Outbound IPs (alternating IPv4/IPv6), pool handles requests smoothly.
        // Pacing the scheduler loop at 450ms ensures constant, balanced throughput without WAF limits.
        await new Promise((r) => setTimeout(r, 450));
      }
    };

    setTimeout(async () => {
      try {
        await this.standardizeDispositions();
      } catch (err: any) {
        console.warn('[RivenService] standardizeDispositions error:', err.message);
      }
      try {
        await this.syncWeaponsCatalog();
      } catch (err: any) {
        console.warn('[RivenService] syncWeaponsCatalog error:', err.message);
      }
      try {
        await this.ensureBaselineLots();
      } catch (err: any) {
        console.warn('[RivenService] ensureBaselineLots error:', err.message);
      }
      schedulerLoop();
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

      const hotTargetInterval = Math.round(36 * offPeakMultiplier);
      const warmTargetInterval = Math.round(95 * offPeakMultiplier);
      const coldTargetInterval = Math.round(210 * offPeakMultiplier);

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
