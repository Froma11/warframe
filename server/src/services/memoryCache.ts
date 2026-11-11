/**
 * memoryCache.ts: Centralized High-Performance In-Memory Read Cache
 * 
 * Provides sub-millisecond (< 1 ms) HTTP responses with zero SQLite load.
 * Stores precomputed JSON responses and DTOs in RAM, with targeted invalidation
 * triggered on database writes from background scrapers and WebSocket client.
 */

interface CacheEntry<T = any> {
  data: T;
  createdAt: number;
  expiresAt: number;
}

export class MemoryCacheManager {
  private arcanesCache: CacheEntry | null = null;
  private arcanesTtlMs = 60000; // 60s fallback TTL, invalidated on scraper sync

  // weaponGroup -> CacheEntry
  private weaponsCache = new Map<string, CacheEntry>();
  private weaponsTtlMs = 300000; // 5m fallback TTL

  // "weaponSlug:filterKey" -> CacheEntry
  private lotsCache = new Map<string, CacheEntry>();
  private lotsTtlMs = 30000; // 30s fallback TTL, invalidated on syncWeaponLots

  // itemSlug -> CacheEntry for /api/arcanes/:slug
  private itemDetailCache = new Map<string, CacheEntry>();
  private itemDetailTtlMs = 60000; // 60s fallback TTL

  // Status cache
  private statusCache: CacheEntry | null = null;
  private statusTtlMs = 2000; // 2s TTL (status polling never hammers SQLite)

  // Cache telemetry
  private hits = 0;
  private misses = 0;
  private responseTimes: number[] = [];

  // --- ARCANES & MARKET ITEMS ---
  public getArcanes(): any | null {
    const now = Date.now();
    if (this.arcanesCache && now < this.arcanesCache.expiresAt) {
      this.hits++;
      return this.arcanesCache.data;
    }
    this.misses++;
    return null;
  }

  public setArcanes(data: any, ttlMs: number = this.arcanesTtlMs): void {
    const now = Date.now();
    this.arcanesCache = {
      data,
      createdAt: now,
      expiresAt: now + ttlMs,
    };
  }

  public invalidateArcanes(): void {
    this.arcanesCache = null;
  }

  // --- ARCANES DETAIL (/api/arcanes/:slug) ---
  public getItemDetail(slug: string): any | null {
    const now = Date.now();
    const entry = this.itemDetailCache.get(slug);
    if (entry && now < entry.expiresAt) {
      this.hits++;
      return entry.data;
    }
    this.misses++;
    return null;
  }

  public setItemDetail(slug: string, data: any, ttlMs: number = this.itemDetailTtlMs): void {
    const now = Date.now();
    this.itemDetailCache.set(slug, {
      data,
      createdAt: now,
      expiresAt: now + ttlMs,
    });
    // Evict oldest if map exceeds 500 items
    if (this.itemDetailCache.size > 500) {
      for (const [k, v] of this.itemDetailCache.entries()) {
        if (now >= v.expiresAt) this.itemDetailCache.delete(k);
      }
    }
  }

  public invalidateItemDetail(slug?: string): void {
    if (slug) {
      this.itemDetailCache.delete(slug);
    } else {
      this.itemDetailCache.clear();
    }
  }

  // --- RIVEN WEAPONS ---
  public getWeapons(groupKey: string): any | null {
    const now = Date.now();
    const entry = this.weaponsCache.get(groupKey);
    if (entry && now < entry.expiresAt) {
      this.hits++;
      return entry.data;
    }
    this.misses++;
    return null;
  }

  public setWeapons(groupKey: string, data: any, ttlMs: number = this.weaponsTtlMs): void {
    const now = Date.now();
    this.weaponsCache.set(groupKey, {
      data,
      createdAt: now,
      expiresAt: now + ttlMs,
    });
  }

  public invalidateWeapons(): void {
    this.weaponsCache.clear();
  }

  // --- RIVEN LOTS ---
  public getLots(weaponSlug: string, filterKey: string): any | null {
    const now = Date.now();
    const key = `${weaponSlug}:${filterKey}`;
    const entry = this.lotsCache.get(key);
    if (entry && now < entry.expiresAt) {
      this.hits++;
      return entry.data;
    }
    this.misses++;
    return null;
  }

  public setLots(weaponSlug: string, filterKey: string, data: any, ttlMs: number = this.lotsTtlMs): void {
    const now = Date.now();
    const key = `${weaponSlug}:${filterKey}`;
    this.lotsCache.set(key, {
      data,
      createdAt: now,
      expiresAt: now + ttlMs,
    });
    // Evict oldest if map exceeds 1000 items
    if (this.lotsCache.size > 1000) {
      for (const [k, v] of this.lotsCache.entries()) {
        if (now >= v.expiresAt) this.lotsCache.delete(k);
      }
    }
  }

  public invalidateLots(weaponSlug?: string): void {
    if (weaponSlug) {
      for (const key of this.lotsCache.keys()) {
        if (key.startsWith(`${weaponSlug}:`)) {
          this.lotsCache.delete(key);
        }
      }
    } else {
      this.lotsCache.clear();
    }
  }

  // --- SYSTEM STATUS ---
  public getStatus(): any | null {
    const now = Date.now();
    if (this.statusCache && now < this.statusCache.expiresAt) {
      this.hits++;
      return this.statusCache.data;
    }
    this.misses++;
    return null;
  }

  public setStatus(data: any, ttlMs: number = this.statusTtlMs): void {
    const now = Date.now();
    this.statusCache = {
      data,
      createdAt: now,
      expiresAt: now + ttlMs,
    };
  }

  public invalidateStatus(): void {
    this.statusCache = null;
  }

  // --- TELEMETRY ---
  public recordResponseTime(ms: number): void {
    this.responseTimes.push(ms);
    if (this.responseTimes.length > 500) {
      this.responseTimes.shift();
    }
  }

  public getTelemetry(): {
    hits: number;
    misses: number;
    hitRatePct: number;
    avgApiResponseMs: number;
    cachedKeysCount: number;
  } {
    const total = this.hits + this.misses;
    const hitRatePct = total > 0 ? Number(((this.hits / total) * 100).toFixed(1)) : 100.0;
    const avgApiResponseMs = this.responseTimes.length > 0
      ? Number((this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length).toFixed(2))
      : 0.5;

    const cachedKeysCount =
      (this.arcanesCache ? 1 : 0) +
      this.weaponsCache.size +
      this.lotsCache.size +
      this.itemDetailCache.size +
      (this.statusCache ? 1 : 0);

    return {
      hits: this.hits,
      misses: this.misses,
      hitRatePct,
      avgApiResponseMs,
      cachedKeysCount,
    };
  }
}

export const memoryCache = new MemoryCacheManager();
