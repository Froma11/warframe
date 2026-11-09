import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'warframe_market.db');
export const rawDb = new sqlite3.Database(dbPath);

let txMutex = Promise.resolve();

export const db = {
  run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    return new Promise((resolve, reject) => {
      rawDb.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },

  get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      rawDb.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T);
      });
    });
  },

  all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      rawDb.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve((rows || []) as T[]);
      });
    });
  },

  exec(sql: string): Promise<void> {
    return new Promise((resolve, reject) => {
      rawDb.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  },

  /**
   * Serialized transaction runner: ensures only ONE transaction executes at a time
   * preventing SQLITE_ERROR: cannot start a transaction within a transaction
   */
  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    let releaseLock: () => void;
    const currentLock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    const previousLock = txMutex;
    txMutex = txMutex.then(() => currentLock, () => currentLock);

    await previousLock;
    try {
      await this.run('BEGIN IMMEDIATE TRANSACTION');
      try {
        const result = await callback();
        await this.run('COMMIT');
        return result;
      } catch (innerErr) {
        await this.run('ROLLBACK').catch(() => {});
        throw innerErr;
      }
    } finally {
      releaseLock!();
    }
  },
};

export async function initDatabase() {
  await db.run('PRAGMA journal_mode = WAL;');
  await db.run('PRAGMA synchronous = NORMAL;');
  await db.run('PRAGMA busy_timeout = 5000;');

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name_en TEXT NOT NULL,
      name_ru TEXT,
      rarity TEXT NOT NULL,
      max_rank INTEGER DEFAULT 5,
      icon_url TEXT,
      thumb_url TEXT,
      source TEXT,
      effect TEXT,
      tags TEXT,
      trading_tax INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS market_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_slug TEXT NOT NULL,
      rank INTEGER NOT NULL,
      min_sell INTEGER,
      max_buy INTEGER,
      spread INTEGER,
      spread_pct REAL,
      median_price REAL,
      sellers_count INTEGER DEFAULT 0,
      buyers_count INTEGER DEFAULT 0,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (item_slug) REFERENCES items(slug) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS latest_market_snapshots (
      item_slug TEXT NOT NULL,
      rank INTEGER NOT NULL,
      min_sell INTEGER DEFAULT 0,
      max_buy INTEGER DEFAULT 0,
      spread INTEGER DEFAULT 0,
      spread_pct REAL DEFAULT 0,
      median_price REAL DEFAULT 0,
      sellers_count INTEGER DEFAULT 0,
      buyers_count INTEGER DEFAULT 0,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (item_slug, rank)
    );

    CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_slug TEXT NOT NULL,
      rank INTEGER NOT NULL,
      date TEXT NOT NULL,
      median_price REAL NOT NULL,
      volume INTEGER DEFAULT 0,
      min_price INTEGER,
      max_price INTEGER,
      UNIQUE(item_slug, rank, date),
      FOREIGN KEY (item_slug) REFERENCES items(slug) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS price_history_hourly (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_slug TEXT NOT NULL,
      rank INTEGER NOT NULL,
      datetime TEXT NOT NULL,
      median_price REAL NOT NULL,
      volume INTEGER DEFAULT 0,
      min_price INTEGER,
      max_price INTEGER,
      UNIQUE(item_slug, rank, datetime),
      FOREIGN KEY (item_slug) REFERENCES items(slug) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS riven_weapons (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name_en TEXT NOT NULL,
      name_ru TEXT NOT NULL,
      group_type TEXT NOT NULL,
      riven_type TEXT NOT NULL,
      disposition REAL DEFAULT 1.0,
      req_mr INTEGER DEFAULT 0,
      icon_url TEXT,
      thumb_url TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS riven_lots (
      id TEXT PRIMARY KEY,
      weapon_slug TEXT NOT NULL,
      seller_name TEXT NOT NULL,
      seller_status TEXT DEFAULT 'offline',
      seller_reputation INTEGER DEFAULT 0,
      is_direct_sell BOOLEAN DEFAULT 1,
      buyout_price INTEGER,
      starting_price INTEGER,
      top_bid INTEGER,
      mod_name TEXT,
      mod_rank INTEGER DEFAULT 0,
      re_rolls INTEGER DEFAULT 0,
      mastery_level INTEGER DEFAULT 8,
      polarity TEXT,
      attributes TEXT,
      endo_value INTEGER DEFAULT 0,
      efficiency REAL DEFAULT 0,
      lot_created_at TEXT,
      lot_updated_at TEXT,
      fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_snapshots_slug_time ON market_snapshots(item_slug, timestamp);
    CREATE INDEX IF NOT EXISTS idx_history_slug_date ON price_history(item_slug, date);
    CREATE INDEX IF NOT EXISTS idx_history_hourly_slug_time ON price_history_hourly(item_slug, datetime);
    CREATE INDEX IF NOT EXISTS idx_history_hourly_time_slug ON price_history_hourly(datetime, item_slug, volume);
    CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id);
    CREATE INDEX IF NOT EXISTS idx_riven_weapons_group ON riven_weapons(group_type);
    CREATE INDEX IF NOT EXISTS idx_riven_lots_weapon ON riven_lots(weapon_slug);
    CREATE INDEX IF NOT EXISTS idx_riven_lots_endo ON riven_lots(endo_value);
    CREATE INDEX IF NOT EXISTS idx_riven_lots_price ON riven_lots(buyout_price);
    CREATE INDEX IF NOT EXISTS idx_riven_lots_weapon_eff ON riven_lots(weapon_slug, efficiency DESC);
  `);

  // Safe incremental schema migrations
  try {
    await db.exec("ALTER TABLE users ADD COLUMN theme TEXT DEFAULT 'dark'");
  } catch {}
  try {
    await db.exec("ALTER TABLE notes ADD COLUMN tag TEXT DEFAULT 'СНАЙПИНГ'");
  } catch {}
  try {
    await db.exec("ALTER TABLE riven_weapons ADD COLUMN priority_tier INTEGER DEFAULT 2");
  } catch {}
  try {
    await db.exec("ALTER TABLE riven_weapons ADD COLUMN activity_score REAL DEFAULT 0");
  } catch {}
  try {
    await db.exec("ALTER TABLE riven_weapons ADD COLUMN last_synced_at DATETIME");
  } catch {}
  try {
    await db.exec("ALTER TABLE riven_weapons ADD COLUMN active_lots_count INTEGER DEFAULT 0");
  } catch {}

  // Post-migration indexes
  try {
    await db.exec("CREATE INDEX IF NOT EXISTS idx_riven_weapons_tier ON riven_weapons(priority_tier, last_synced_at);");
  } catch {}

  // Hydrate latest_market_snapshots from historical market_snapshots if empty
  try {
    const existingLatest = await db.get<{ cnt: number }>("SELECT COUNT(*) as cnt FROM latest_market_snapshots");
    if (!existingLatest || existingLatest.cnt === 0) {
      await db.exec(`
        INSERT OR IGNORE INTO latest_market_snapshots 
        (item_slug, rank, min_sell, max_buy, spread, spread_pct, median_price, sellers_count, buyers_count, timestamp)
        SELECT s.item_slug, s.rank, s.min_sell, s.max_buy, s.spread, s.spread_pct, s.median_price, s.sellers_count, s.buyers_count, s.timestamp
        FROM market_snapshots s
        INNER JOIN (
          SELECT item_slug, rank, MAX(id) as max_id
          FROM market_snapshots
          GROUP BY item_slug, rank
        ) m ON s.id = m.max_id;
      `);
      console.log('[DB] Hydrated latest_market_snapshots cache table.');
    }
  } catch (err: any) {
    console.warn('[DB] latest_market_snapshots hydration notice:', err.message);
  }

  console.log('[DB] SQLite Database initialized with WAL mode at:', dbPath);
}
