import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'warframe_market.db');
export const rawDb = new sqlite3.Database(dbPath);

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
};

export async function initDatabase() {
  await db.run('PRAGMA journal_mode = WAL;');
  await db.run('PRAGMA synchronous = NORMAL;');

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

    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_snapshots_slug_time ON market_snapshots(item_slug, timestamp);
    CREATE INDEX IF NOT EXISTS idx_history_slug_date ON price_history(item_slug, date);
    CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id);
  `);

  console.log('[DB] SQLite Database initialized with WAL mode at:', dbPath);
}
