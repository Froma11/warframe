import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { db, initDatabase } from './db';
import { initAuth, generateToken, setAuthCookie, clearAuthCookie, requireAuth } from './auth';
import { scraper } from './services/scraper';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const MASTER_KEY = process.env.ACCESS_KEY || 'tenno2026';

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: ['http://localhost:3000', 'https://zero.nofuture.me'],
    credentials: true,
  })
);

// --- AUTH & GATEKEEPER ROUTES ---

// Verify Gatekeeper Access Key
app.post('/api/auth/verify-key', async (req, res) => {
  const { key } = req.body;
  if (!key) {
    return res.status(400).json({ error: 'Access key is required.' });
  }

  if (key !== MASTER_KEY) {
    return res.status(401).json({ error: 'Invalid access key. Access denied.' });
  }

  // Issue operator token
  const token = generateToken({ id: 1, username: 'operator' });
  setAuthCookie(res, token);

  return res.json({
    success: true,
    user: { id: 1, username: 'operator' },
  });
});

app.post('/api/auth/logout', (_req, res) => {
  clearAuthCookie(res);
  return res.json({ success: true });
});

app.get('/api/auth/check', (req, res) => {
  const token = req.cookies?.tenno_token;
  if (!token) {
    return res.status(401).json({ authenticated: false });
  }
  return res.json({ authenticated: true });
});

// --- NOTES (PROFILE) ROUTES (PROTECTED) ---
app.get('/api/notes', requireAuth, async (req: any, res) => {
  try {
    const userId = req.user?.id || 1;
    const notes = await db.all('SELECT * FROM notes WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    res.json({ success: true, data: notes });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notes', requireAuth, async (req: any, res) => {
  const { title, content } = req.body;
  if (!title && !content) {
    return res.status(400).json({ error: 'Title or content required.' });
  }
  try {
    const userId = req.user?.id || 1;
    const result = await db.run(
      'INSERT INTO notes (user_id, title, content) VALUES (?, ?, ?)',
      [userId, title || 'Без названия', content || '']
    );
    res.json({ success: true, id: result.lastID });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/notes/:id', requireAuth, async (req: any, res) => {
  try {
    const userId = req.user?.id || 1;
    const noteId = req.params.id;
    await db.run('DELETE FROM notes WHERE id = ? AND user_id = ?', [noteId, userId]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- ARCANES MARKET DATA ROUTES (PROTECTED BY GATEKEEPER) ---
app.get('/api/arcanes', requireAuth, async (_req, res) => {
  const query = `
    SELECT 
      i.id,
      i.slug as urlName,
      i.name_en as name,
      i.name_ru as nameRu,
      i.rarity,
      i.max_rank as maxRank,
      i.icon_url as icon,
      i.thumb_url as thumb,
      i.effect,
      i.source,
      -- Rank 0 data
      COALESCE(s0.min_sell, 0) as r0_minPrice,
      COALESCE(s0.median_price, 0) as r0_avgPrice,
      COALESCE(s0.sellers_count, 0) as r0_sellers,
      -- Rank Max data (dynamically matching max_rank: R3, R5, etc.)
      COALESCE(sMax.min_sell, 0) as rMax_minPrice,
      COALESCE(sMax.median_price, 0) as rMax_avgPrice,
      COALESCE(sMax.sellers_count, 0) as rMax_sellers,
      -- 24h Real Completed Trades
      COALESCE(sMax.buyers_count, sMax.sellers_count + s0.sellers_count, 0) as trades24h
    FROM items i
    LEFT JOIN (
      SELECT m1.*
      FROM market_snapshots m1
      INNER JOIN (
        SELECT item_slug, MAX(timestamp) as max_time
        FROM market_snapshots
        WHERE rank = 0
        GROUP BY item_slug
      ) m2 ON m1.item_slug = m2.item_slug AND m1.timestamp = m2.max_time
      WHERE m1.rank = 0
    ) s0 ON i.slug = s0.item_slug
    LEFT JOIN (
      SELECT m1.*
      FROM market_snapshots m1
      INNER JOIN (
        SELECT item_slug, rank, MAX(timestamp) as max_time
        FROM market_snapshots
        GROUP BY item_slug, rank
      ) m2 ON m1.item_slug = m2.item_slug AND m1.rank = m2.rank AND m1.timestamp = m2.max_time
    ) sMax ON i.slug = sMax.item_slug AND sMax.rank = i.max_rank
    WHERE i.tags LIKE '%arcane_enhancement%' OR i.tags LIKE '%arcane%'
    ORDER BY trades24h DESC
  `;

  try {
    const items = await db.all(query);
    
    // Format into clean client DTO
    const formatted = items.map((item: any) => ({
      id: item.id || item.urlName,
      name: item.name,
      nameRu: item.nameRu || item.name,
      urlName: item.urlName,
      icon: item.thumb || item.icon,
      rarity: item.rarity,
      maxRank: item.maxRank || 5,
      source: item.source || 'Warframe Market',
      effect: item.effect || '',
      rank0: {
        avgPrice: item.r0_avgPrice || item.r0_minPrice || 1,
        minPrice: item.r0_minPrice || item.r0_avgPrice || 1,
        activeSellers: item.r0_sellers || 0,
      },
      rank5: {
        avgPrice: item.rMax_avgPrice || item.rMax_minPrice || 10,
        minPrice: item.rMax_minPrice || item.rMax_avgPrice || 10,
        activeSellers: item.rMax_sellers || 0,
      },
      trades24h: item.trades24h || 0,
      volume24h: item.trades24h || 0,
    }));

    res.json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Item detail with price history (Protected)
app.get('/api/arcanes/:slug', requireAuth, async (req, res) => {
  const slug = req.params.slug as string;

  try {
    const item = await db.get('SELECT * FROM items WHERE slug = ?', [slug]);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Return full real historical data for all ranks in one quick call
    const history = await db.all(`
      SELECT rank, date, median_price as medianPrice, volume, min_price as minPrice, max_price as maxPrice
      FROM price_history
      WHERE item_slug = ?
      ORDER BY date ASC
    `, [slug]);

    res.json({
      success: true,
      data: {
        item,
        history,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Health & System status
app.get('/api/status', async (_req, res) => {
  try {
    const itemsCount = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM items');
    const snapshotsCount = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM market_snapshots');

    res.json({
      status: 'ONLINE',
      system: 'Tenno Market Intelligence Core',
      itemsCount: itemsCount?.count || 0,
      snapshotsCount: snapshotsCount?.count || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Serve frontend build in production
const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.use((_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// Start Server
async function start() {
  await initDatabase();
  await initAuth();

  app.listen(PORT, () => {
    console.log(`[SERVER] Warframe Market Analytics running on port ${PORT}`);
    
    // Start background worker (15 min interval as requested in answer 3)
    scraper.startBackgroundWorker(15);
  });
}

start().catch((err) => {
  console.error('[FATAL] Failed to start server:', err);
});
