import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { monitorEventLoopDelay } from 'node:perf_hooks';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, initDatabase } from './db';
import { initAuth, generateToken, setAuthCookie, clearAuthCookie, requireAuth } from './auth';
import { scraper } from './services/scraper';
import { rivenService } from './services/rivenService';
import { wsMarketClient } from './services/wsMarketClient';
import { proxyPool } from './services/proxyPool';
import { memoryCache } from './services/memoryCache';
import { extractAuctionId, evaluateRiven, resolveWeaponClass } from './services/rivenEvaluation';
import weaponVariantsData from './data/weaponVariants.json';

const app = express();
const PORT = process.env.PORT || 4000;
const MASTER_KEY = process.env.ACCESS_KEY || 'tenno2026';
const JWT_SECRET = process.env.JWT_SECRET || 'orokin_void_key_secret_2026_warframe';

// Initialize C++ high-resolution Event Loop delay monitor
const elHistogram = monitorEventLoopDelay({ resolution: 20 });
elHistogram.enable();

// Rate Limiter State (In-Memory Sliding Window, max 350 req/min per IP)
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitRecord>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 350;

function rateLimiter(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.path.startsWith('/api/assets') || !req.path.startsWith('/api')) {
    return next();
  }

  const clientIp =
    (req.headers['x-real-ip'] as string) ||
    (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
    req.ip ||
    '127.0.0.1';

  // Exclude loopback / internal health checks and benchmark tools from rate limiting
  if (clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === '::ffff:127.0.0.1') {
    return next();
  }

  const now = Date.now();
  let record = rateLimitMap.get(clientIp);

  if (!record || now > record.resetAt) {
    record = { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateLimitMap.set(clientIp, record);
  } else {
    record.count++;
  }

  if (record.count > MAX_REQUESTS_PER_WINDOW) {
    res.setHeader('Retry-After', Math.ceil((record.resetAt - now) / 1000));
    return res.status(429).json({ error: 'Слишком много запросов. Пожалуйста, подождите минуту.' });
  }

  if (rateLimitMap.size > 5000) {
    for (const [ip, rec] of rateLimitMap.entries()) {
      if (now > rec.resetAt) rateLimitMap.delete(ip);
    }
  }

  next();
}

// Admin / Internal endpoint guard
function requireAdminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const masterKey = req.headers['x-master-key'] || req.query.masterKey;
  if (masterKey === MASTER_KEY) {
    return next();
  }
  return requireAuth(req, res, next);
}

// Middleware
app.use(compression());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(cookieParser());
app.use(
  cors({
    origin: ['http://localhost:3000', 'https://zero.nofuture.me'],
    credentials: true,
  })
);

// Response time telemetry tracker
app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    memoryCache.recordResponseTime(durationMs);
  });
  next();
});

// Apply rate limiter to all API routes
app.use('/api', rateLimiter);

// --- AUTH & USER PROFILE ROUTES ---

// 1. User Registration (Database-backed)
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Логин и пароль обязательны' });
  }

  const cleanUsername = String(username).trim();
  if (cleanUsername.length < 3) {
    return res.status(400).json({ error: 'Логин должен содержать минимум 3 символа' });
  }
  if (String(password).length < 4) {
    return res.status(400).json({ error: 'Пароль должен содержать минимум 4 символа' });
  }

  try {
    const existing = await db.get('SELECT id FROM users WHERE LOWER(username) = LOWER(?)', [cleanUsername]);
    if (existing) {
      return res.status(409).json({ error: 'Пользователь с таким логином уже существует' });
    }

    const hash = bcrypt.hashSync(String(password), 10);
    const result = await db.run(
      'INSERT INTO users (username, password_hash, theme) VALUES (?, ?, ?)',
      [cleanUsername, hash, 'dark']
    );

    const newUser = { id: result.lastID, username: cleanUsername, theme: 'dark' };
    const token = generateToken(newUser);
    setAuthCookie(res, token);

    return res.json({
      success: true,
      user: newUser,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 2. User Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Введите логин и пароль' });
  }

  try {
    const cleanUsername = String(username).trim();
    const user = await db.get<any>('SELECT * FROM users WHERE LOWER(username) = LOWER(?)', [cleanUsername]);
    if (!user || !bcrypt.compareSync(String(password), user.password_hash)) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    const token = generateToken({ id: user.id, username: user.username });
    setAuthCookie(res, token);

    return res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        theme: user.theme || 'dark',
        createdAt: user.created_at,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 3. Current User Profile
app.get('/api/auth/me', async (req, res) => {
  const token = req.cookies?.tenno_token;
  if (!token) {
    return res.json({ authenticated: false, user: null });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await db.get<any>('SELECT id, username, theme, created_at FROM users WHERE id = ?', [decoded.id]);
    if (!user) {
      return res.json({ authenticated: false, user: null });
    }
    return res.json({
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        theme: user.theme || 'dark',
        createdAt: user.created_at,
      },
    });
  } catch {
    return res.json({ authenticated: false, user: null });
  }
});

// 4. Update Theme Preference
app.put('/api/auth/theme', requireAuth, async (req: any, res) => {
  const { theme } = req.body;
  const safeTheme = theme === 'light' ? 'light' : 'dark';
  try {
    const userId = req.user?.id || 1;
    await db.run('UPDATE users SET theme = ? WHERE id = ?', [safeTheme, userId]);
    return res.json({ success: true, theme: safeTheme });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 5. Verify Gatekeeper Access Key (Fallback / Gatekeeper)
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
    const formattedNotes = notes.map((n: any) => {
      let images: string[] = [];
      if (n.image_url) {
        const raw = n.image_url.trim();
        if (raw.startsWith('[') && raw.endsWith(']')) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) images = parsed;
          } catch {
            images = [raw];
          }
        } else {
          images = [raw];
        }
      }
      return {
        ...n,
        images,
        image_url: images[0] || null,
      };
    });
    res.json({ success: true, data: formattedNotes });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notes', requireAuth, async (req: any, res) => {
  const { title, content, tag, image_url, images } = req.body;
  const hasImages = (Array.isArray(images) && images.length > 0) || !!image_url;
  if (!content && !title && !hasImages) {
    return res.status(400).json({ error: 'Content or image required.' });
  }
  try {
    const userId = req.user?.id || 1;
    const cleanTag = (tag || '').trim();
    let storedImageUrl: string | null = null;
    if (Array.isArray(images) && images.length > 0) {
      storedImageUrl = JSON.stringify(images);
    } else if (typeof image_url === 'string' && image_url.trim()) {
      storedImageUrl = image_url.trim();
    }

    const result = await db.run(
      'INSERT INTO notes (user_id, title, content, tag, image_url) VALUES (?, ?, ?, ?, ?)',
      [userId, title || '', content || '', cleanTag, storedImageUrl]
    );
    res.json({ success: true, id: result.lastID });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/notes/:id', requireAuth, async (req: any, res) => {
  const { title, content, tag, image_url, images } = req.body;
  const hasImages = (Array.isArray(images) && images.length > 0) || !!image_url;
  if (!content && !title && !hasImages) {
    return res.status(400).json({ error: 'Content or image required.' });
  }
  try {
    const userId = req.user?.id || 1;
    const noteId = req.params.id;
    const cleanTag = (tag || '').trim();

    let storedImageUrl: string | null = null;
    if (Array.isArray(images)) {
      storedImageUrl = images.length > 0 ? JSON.stringify(images) : null;
    } else if (image_url !== undefined) {
      storedImageUrl = image_url ? image_url.trim() : null;
    }

    await db.run(
      'UPDATE notes SET title = ?, content = ?, tag = ?, image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [title || '', content || '', cleanTag, storedImageUrl, noteId, userId]
    );
    res.json({ success: true });
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

// --- ASSET PROXY & LOCAL DISK CACHE (Zero Broken Images / CORP Bypass) ---
const assetsCacheDir = fs.existsSync(path.resolve(__dirname, '../data'))
  ? path.resolve(__dirname, '../data/cached_assets')
  : path.resolve(process.cwd(), 'data/cached_assets');

if (!fs.existsSync(assetsCacheDir)) {
  fs.mkdirSync(assetsCacheDir, { recursive: true });
}

export const toProxyAsset = (url: string | null | undefined): string => {
  if (!url) return '';
  if (url.startsWith('/api/assets/')) return url;
  if (url.startsWith('https://warframe.market/static/assets/')) {
    return url.replace('https://warframe.market/static/assets/', '/api/assets/');
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const cleanPath = url.startsWith('/') ? url.slice(1) : url;
  return `/api/assets/${cleanPath}`;
};

// 1. High-speed static delivery from local disk (libuv async file streaming, 0ms latency)
app.use(
  '/api/assets',
  express.static(assetsCacheDir, {
    maxAge: '30d',
    immutable: true,
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', '*');
    },
  })
);

// 2. Fallback fetcher for assets not yet cached on disk
app.use('/api/assets', async (req, res) => {
  try {
    const rawPath = decodeURIComponent(req.url.replace(/^\/+/, '').split('?')[0]);
    if (!rawPath || rawPath.includes('..')) {
      return res.status(400).send('Invalid asset path');
    }

    const localFilePath = path.join(assetsCacheDir, rawPath);
    const upstreamUrl = `https://warframe.market/static/assets/${rawPath}`;
    try {
      const buffer = await proxyPool.fetchBuffer(upstreamUrl);
      try {
        fs.mkdirSync(path.dirname(localFilePath), { recursive: true });
        fs.writeFileSync(localFilePath, buffer);
      } catch {}

      res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', '*');
      const ext = path.extname(localFilePath).toLowerCase();
      if (ext === '.png') res.setHeader('Content-Type', 'image/png');
      else if (ext === '.webp') res.setHeader('Content-Type', 'image/webp');
      else if (ext === '.jpg' || ext === '.jpeg') res.setHeader('Content-Type', 'image/jpeg');
      return res.send(buffer);
    } catch {
      return res.status(404).send('Asset not found');
    }
  } catch (err: any) {
    return res.status(502).send('Error fetching asset');
  }
});

// --- ARCANES MARKET DATA ROUTES (Publicly accessible for terminal users) ---
// Helper to query and format full arcane catalog DTO
async function loadArcanesCatalog(): Promise<{ success: boolean; count: number; data: any[] }> {
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
      COALESCE(i.category, 'arcane') as category,
      COALESCE(i.is_set, 0) as isSet,
      COALESCE(i.ducats, 0) as ducats,
      -- Rank 0 data (Live orderbook min + 24h closed sales average and volume)
      COALESCE(s0.min_sell, 0) as r0_minPrice,
      ROUND(COALESCE(h0.avg_sold, d0.r0_last_daily_price, s0.median_price, s0.min_sell, 1)) as r0_avgPrice,
      COALESCE(s0.sellers_count, 0) as r0_sellers,
      COALESCE(h0.sold_count, 0) as r0_sold,
      -- Rank Max data (Live orderbook min + 24h closed sales average and volume)
      COALESCE(sMax.min_sell, 0) as rMax_minPrice,
      ROUND(COALESCE(hMax.avg_sold, dMax.rMax_last_daily_price, sMax.median_price, sMax.min_sell, 10)) as rMax_avgPrice,
      COALESCE(sMax.sellers_count, 0) as rMax_sellers,
      COALESCE(hMax.sold_count, 0) as rMax_sold,
      -- 24h Real Completed Trades (Aggregated across R0 and R_Max closed sales)
      CASE 
        WHEN (COALESCE(h0.sold_count, 0) + COALESCE(hMax.sold_count, 0)) > 0 
        THEN (COALESCE(h0.sold_count, 0) + COALESCE(hMax.sold_count, 0)) 
        ELSE COALESCE(d24.daily_trades_24h, 0) 
      END as trades24h
    FROM items i
    LEFT JOIN latest_market_snapshots s0 ON i.slug = s0.item_slug AND s0.rank = 0
    LEFT JOIN latest_market_snapshots sMax ON i.slug = sMax.item_slug AND sMax.rank = i.max_rank
    LEFT JOIN (
      SELECT 
        item_slug,
        SUM(volume) as sold_count,
        ROUND(SUM(median_price * volume) * 1.0 / NULLIF(SUM(volume), 0)) as avg_sold
      FROM price_history_hourly
      WHERE rank = 0 
        AND datetime >= strftime('%Y-%m-%dT%H:%M:%S', 'now', '-24 hours')
      GROUP BY item_slug
    ) h0 ON i.slug = h0.item_slug
    LEFT JOIN (
      SELECT 
        h.item_slug,
        SUM(h.volume) as sold_count,
        ROUND(SUM(h.median_price * h.volume) * 1.0 / NULLIF(SUM(h.volume), 0)) as avg_sold
      FROM price_history_hourly h
      INNER JOIN items it ON h.item_slug = it.slug AND h.rank = it.max_rank
      WHERE h.datetime >= strftime('%Y-%m-%dT%H:%M:%S', 'now', '-24 hours')
      GROUP BY h.item_slug
    ) hMax ON i.slug = hMax.item_slug
    LEFT JOIN (
      SELECT p.item_slug, p.median_price as r0_last_daily_price
      FROM price_history p
      INNER JOIN (
        SELECT item_slug, MAX(date) as max_date
        FROM price_history
        WHERE rank = 0
        GROUP BY item_slug
      ) latest ON p.item_slug = latest.item_slug AND p.date = latest.max_date AND p.rank = 0
    ) d0 ON i.slug = d0.item_slug
    LEFT JOIN (
      SELECT p.item_slug, p.median_price as rMax_last_daily_price
      FROM price_history p
      INNER JOIN items it ON p.item_slug = it.slug AND p.rank = it.max_rank
      INNER JOIN (
        SELECT item_slug, rank, MAX(date) as max_date
        FROM price_history
        GROUP BY item_slug, rank
      ) latest ON p.item_slug = latest.item_slug AND p.date = latest.max_date AND p.rank = latest.rank
    ) dMax ON i.slug = dMax.item_slug
    LEFT JOIN (
      SELECT item_slug, SUM(volume) as daily_trades_24h
      FROM price_history
      WHERE date >= date('now', '-1 day')
      GROUP BY item_slug
    ) d24 ON i.slug = d24.item_slug
    WHERE i.category = 'arcane' OR i.is_set = 1 OR i.tags LIKE '%arcane%'
    ORDER BY trades24h DESC
  `;

        const items = await db.all(query);
        
        // Format into clean client DTO with proxied image paths
        const formatted = items.map((item: any) => {
          const isSet = Boolean(item.isSet);
          const cat = item.category || (isSet ? 'warframe' : 'arcane');
          const r0Avg = Math.round(Number(item.r0_avgPrice)) || 1;
          const r0Min = item.r0_minPrice || r0Avg || 1;
          const rMaxAvg = Math.round(Number(item.rMax_avgPrice)) || 10;
          const rMaxMin = item.rMax_minPrice || rMaxAvg || 10;

          return {
            id: item.id || item.urlName,
            name: item.name,
            nameRu: item.nameRu || item.name,
            urlName: item.urlName,
            icon: toProxyAsset(item.thumb || item.icon),
            rarity: item.rarity,
            maxRank: item.maxRank || (isSet ? 0 : 5),
            source: item.source || 'Warframe Market',
            effect: item.effect || '',
            category: cat,
            isSet: isSet,
            ducats: item.ducats || 0,
            // Unified single prices (for Prime Sets)
            avgPrice: isSet ? r0Avg : rMaxAvg,
            minPrice: isSet ? r0Min : rMaxMin,
            activeSellers: isSet ? (item.r0_sellers || 0) : (item.rMax_sellers || 0),
            // Two-tier prices (for Arcanes)
            rank0: {
              avgPrice: r0Avg,
              minPrice: r0Min,
              activeSellers: item.r0_sellers || 0,
              sold24h: item.r0_sold || 0,
            },
            rank5: {
              avgPrice: rMaxAvg,
              minPrice: rMaxMin,
              activeSellers: item.rMax_sellers || 0,
              sold24h: item.rMax_sold || 0,
            },
            trades24h: item.trades24h || 0,
            volume24h: item.trades24h || 0,
          };
        });

  return {
    success: true,
    count: formatted.length,
    data: formatted,
  };
}

// --- ARCANES MARKET DATA ROUTES (Publicly accessible for terminal users) ---
app.get('/api/arcanes', async (_req, res) => {
  try {
    const payload = await memoryCache.getOrFetch(
      'arcanes_catalog',
      () => memoryCache.getArcanes(),
      (data) => memoryCache.setArcanes(data, 60000),
      loadArcanesCatalog
    );

    res.json(payload);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger full market catalog sync on-demand (Protected: Master-Key / Admin token required)
app.post('/api/market/sync-catalog', requireAdminAuth, async (_req, res) => {
  try {
    memoryCache.invalidateArcanes();
    const count = await scraper.syncMarketCatalog();
    res.json({ success: true, count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger bulk image preloading to local disk cache (Protected)
app.post('/api/market/preload-images', requireAdminAuth, async (_req, res) => {
  try {
    const result = await scraper.preloadAllImages();
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger fast-track pre-warming of all Prime Sets and crafting components (Protected)
app.post('/api/market/prewarm-sets', requireAdminAuth, async (_req, res) => {
  try {
    memoryCache.invalidateArcanes();
    const result = await scraper.prewarmMarketSets();
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Item detail with full 90-day price history (Publicly accessible for terminal users)
app.get('/api/arcanes/:slug', async (req, res) => {
  const slug = req.params.slug as string;

  // Instant In-Memory Read Cache (< 0.5 ms)
  const cached = memoryCache.getItemDetail(slug);
  if (cached) {
    return res.json(cached);
  }

  try {
    const item = await db.get('SELECT * FROM items WHERE slug = ?', [slug]);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Trigger on-demand live orderbook refresh in background if overdue
    scraper.syncLiveOrderbookOnDemand(slug).catch(() => {});

    item.icon_url = toProxyAsset(item.icon_url);
    item.thumb_url = toProxyAsset(item.thumb_url);

    // Return full real historical data for all ranks in one quick call
    let history = await db.all(`
      SELECT rank, date, median_price as medianPrice, volume, min_price as minPrice, max_price as maxPrice
      FROM price_history
      WHERE item_slug = ?
      ORDER BY date ASC
    `, [slug]);

    // Non-blocking background archive delta refresh (never delays user HTTP response)
    scraper.syncArchiveDelta(slug, item.max_rank || 5).catch(() => {});

    const hourly = await db.all(`
      SELECT rank, datetime, median_price as medianPrice, volume, min_price as minPrice, max_price as maxPrice
      FROM price_history_hourly
      WHERE item_slug = ?
      ORDER BY datetime ASC
    `, [slug]);

    // Query Crafting Parts for Sets (Ultra-fast targeted join with covering indexes)
    let parts: any[] = [];
    if (item.is_set) {
      const partsQuery = `
        SELECT 
          p.id,
          p.slug,
          p.name_en as name,
          p.name_ru as nameRu,
          p.icon_url as icon,
          p.thumb_url as thumb,
          p.ducats,
          p.trading_tax as tradingTax,
          COALESCE(s.min_sell, 0) as minPrice,
          ROUND(COALESCE(h.avg_sold, d.last_daily_price, s.median_price, s.min_sell, 0)) as avgPrice,
          COALESCE(s.sellers_count, 0) as activeSellers,
          COALESCE(h.sold_count, d.daily_sold, 0) as trades24h
        FROM items p
        LEFT JOIN latest_market_snapshots s ON p.slug = s.item_slug AND s.rank = 0
        LEFT JOIN (
          SELECT 
            ph.item_slug,
            SUM(ph.volume) as sold_count,
            ROUND(SUM(ph.median_price * ph.volume) * 1.0 / NULLIF(SUM(ph.volume), 0)) as avg_sold
          FROM price_history_hourly ph
          JOIN items pi ON ph.item_slug = pi.slug
          WHERE ph.rank = 0 
            AND pi.set_root_slug = ?
            AND ph.datetime >= strftime('%Y-%m-%dT%H:%M:%S', 'now', '-24 hours')
          GROUP BY ph.item_slug
        ) h ON p.slug = h.item_slug
        LEFT JOIN (
          SELECT p_hist.item_slug, p_hist.median_price as last_daily_price, p_hist.volume as daily_sold
          FROM price_history p_hist
          INNER JOIN (
            SELECT p_in.item_slug, MAX(p_in.date) as max_date
            FROM price_history p_in
            JOIN items pi2 ON p_in.item_slug = pi2.slug
            WHERE p_in.rank = 0 AND pi2.set_root_slug = ?
            GROUP BY p_in.item_slug
          ) lat ON p_hist.item_slug = lat.item_slug AND p_hist.date = lat.max_date AND p_hist.rank = 0
        ) d ON p.slug = d.item_slug
        WHERE p.set_root_slug = ?
        ORDER BY p.name_en ASC
      `;
      const rawParts = await db.all(partsQuery, [slug, slug, slug]);
      parts = rawParts.map((p: any) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        nameRu: p.nameRu || p.name,
        icon: toProxyAsset(p.thumb || p.icon),
        ducats: p.ducats || 0,
        tradingTax: p.tradingTax || 2000,
        minPrice: p.minPrice || p.avgPrice || 1,
        avgPrice: Math.round(Number(p.avgPrice)) || p.minPrice || 1,
        trades24h: p.trades24h || 0,
        activeSellers: p.activeSellers || 0,
      }));

      // Background async on-demand hydration for parts if they lack prices
      for (const p of parts) {
        if (!p.minPrice || p.minPrice <= 1) {
          scraper.syncLiveOrderbook(p.slug).catch(() => {});
          scraper.syncArchiveDelta(p.slug, 0).catch(() => {});
        }
      }
    }

    const payload = {
      success: true,
      data: {
        item,
        history,
        hourly,
        parts,
      },
    };

    memoryCache.setItemDetail(slug, payload, 60000);
    res.json(payload);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- RIVENS & ENDO (VENUS) ROUTES ---

// 1. Get riven weapons directory (RU/EN, categories, search autocomplete with memory cache)
app.get('/api/rivens/weapons', async (req, res) => {
  try {
    const search = String(req.query.search || '');
    const group = String(req.query.group || 'all');
    const weapons = await rivenService.getWeapons(search, group);
    weapons.forEach((w) => {
      w.icon_url = toProxyAsset(w.icon_url);
      w.thumb_url = toProxyAsset(w.thumb_url);
    });
    res.json({
      success: true,
      count: weapons.length,
      data: weapons,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Get riven lots for a weapon from SQLite DB (with filters, server pagination & in-memory cache)
app.get('/api/rivens/lots/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { type, rerolls, rank, onlineOnly, sortBy, limit, offset } = req.query;

    const parsedLimit = Math.min(200, Math.max(1, Number(limit) || 200));
    const parsedOffset = Math.max(0, Number(offset) || 0);

    const result = await rivenService.getLotsForWeapon(slug, {
      type: type as any,
      rerolls: rerolls as any,
      rank: rank as any,
      onlineOnly: onlineOnly === 'true',
      sortBy: sortBy as any,
      limit: parsedLimit,
      offset: parsedOffset,
    });

    if (result.weapon) {
      result.weapon.icon_url = toProxyAsset(result.weapon.icon_url);
      result.weapon.thumb_url = toProxyAsset(result.weapon.thumb_url);
    }

    const payload = {
      success: true,
      weapon: result.weapon,
      total: result.total,
      data: result.lots,
    };

    res.json(payload);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Force-sync latest auctions from market (Protected: Master-Key / Admin token required)
app.post('/api/rivens/sync', requireAdminAuth, async (req, res) => {
  try {
    const weaponSlug = req.body?.weapon || (typeof req.query.weapon === 'string' ? req.query.weapon : undefined);
    
    // Invalidate in-memory lots cache for this weapon so the client gets freshly synced lots immediately
    memoryCache.invalidateLots(weaponSlug);

    const count = await rivenService.syncLiveAuctions(weaponSlug);
    res.json({
      success: true,
      syncedCount: count,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Evaluate Riven Mod Auction (AlecaFrame / Semlar Grade Engine)
const handleEvaluateAuction = async (req: any, res: any) => {
  try {
    const { input, variant } = req.body || {};
    const rawInput = input || (typeof req.query.url === 'string' ? req.query.url : (typeof req.query.input === 'string' ? req.query.input : ''));
    if (!rawInput || typeof rawInput !== 'string') {
      return res.status(400).json({ error: 'Укажите ссылку или ID аукциона Warframe Market' });
    }

    const auctionId = extractAuctionId(rawInput);
    if (!auctionId) {
      return res.status(400).json({
        error: 'Некорректная ссылка или ID аукциона. Ожидается URL вида https://warframe.market/auction/... или 24-значный hex-идентификатор',
      });
    }

    const wfmUrl = `https://api.warframe.market/v1/auctions/entry/${auctionId}`;
    let json: any;
    try {
      json = await proxyPool.fetchJson(wfmUrl, { priority: 'HIGH', lang: 'en' });
    } catch (fetchErr: any) {
      if (fetchErr.message?.includes('404') || fetchErr.message?.includes('not_exist')) {
        return res.status(404).json({
          error: 'Аукцион не найден на Warframe Market (возможно, лот был продан или закрыт продавцом)',
        });
      }
      return res.status(502).json({
        error: `Ошибка запроса к Warframe Market API: ${fetchErr.message}`,
      });
    }

    if (json?.error?.auction?.includes('app.form.not_exist')) {
      return res.status(404).json({
        error: 'Аукцион не найден на Warframe Market (возможно, лот был продан или закрыт продавцом)',
      });
    }
    const auction = json?.payload?.auction;
    const item = auction?.item;

    if (!item || item.type !== 'riven') {
      return res.status(400).json({ error: 'Указанный лот не является модом разлома (Riven Mod)' });
    }

    const weaponSlug = item.weapon_url_name;
    const declaredRank = Number(item.mod_rank) || 0;
    const rawAttrs = Array.isArray(item.attributes) ? item.attributes : [];

    const dbWeapon = await db.get<any>(
      'SELECT slug, name_en, name_ru, group_type, riven_type, disposition, icon_url FROM riven_weapons WHERE slug = ?',
      [weaponSlug]
    );

    const weaponsDict = weaponVariantsData as Record<string, any>;
    const weaponMeta = weaponsDict[weaponSlug] || null;

    const groupType = dbWeapon?.group_type || weaponMeta?.group_type || 'primary';
    const rivenType = dbWeapon?.riven_type || weaponMeta?.riven_type || 'rifle';
    const baseDisp = 1.20; // Official Warframe Standard: 4 dots (1.20) for all weapons
    const weaponClass = resolveWeaponClass(groupType, rivenType);

    const evaluation = evaluateRiven(
      weaponClass,
      baseDisp,
      declaredRank,
      rawAttrs,
      weaponSlug,
      variant
    );

    const owner = auction.owner || {};
    const result = {
      ...evaluation,
      auction_id: auctionId,
      seller_info: {
        name: owner.ingame_name || 'Anonymous',
        status: owner.status || 'offline',
        reputation: owner.reputation || 0,
        price: auction.buyout_price || auction.starting_price || null,
        is_direct_sell: Boolean(auction.is_direct_sell),
      },
      mod_info: {
        name: `${evaluation.weapon_name_en} ${item.name || ''}`.trim(),
        rerolls: Number(item.re_rolls) || 0,
        mastery_level: Number(item.mastery_level) || 8,
        polarity: item.polarity || 'madurai',
      },
      created_at: auction.created,
      updated_at: auction.updated,
    };

    res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

app.post('/api/rivens/evaluate', handleEvaluateAuction);
app.get('/api/rivens/evaluate', handleEvaluateAuction);
app.get('/api/rivens/evaluate/:auctionId', async (req, res) => {
  try {
    const { auctionId } = req.params;
    const variant = req.query.variant as string | undefined;

    const cleanId = extractAuctionId(auctionId);
    if (!cleanId) {
      return res.status(400).json({ error: 'Неверный идентификатор аукциона' });
    }

    const wfmUrl = `https://api.warframe.market/v1/auctions/entry/${cleanId}`;
    let json: any;
    try {
      json = await proxyPool.fetchJson(wfmUrl, { priority: 'HIGH', lang: 'en' });
    } catch (fetchErr: any) {
      if (fetchErr.message?.includes('404') || fetchErr.message?.includes('not_exist')) {
        return res.status(404).json({
          error: 'Аукцион не найден на Warframe Market (возможно, лот был продан или закрыт продавцом)',
        });
      }
      return res.status(502).json({
        error: `Ошибка запроса к Warframe Market API: ${fetchErr.message}`,
      });
    }

    if (json?.error?.auction?.includes('app.form.not_exist')) {
      return res.status(404).json({
        error: 'Аукцион не найден на Warframe Market (возможно, лот был продан или закрыт продавцом)',
      });
    }
    const auction = json?.payload?.auction;
    const item = auction?.item;

    if (!item || item.type !== 'riven') {
      return res.status(400).json({ error: 'Лот не является модом разлома' });
    }

    const weaponSlug = item.weapon_url_name;
    const declaredRank = Number(item.mod_rank) || 0;
    const rawAttrs = Array.isArray(item.attributes) ? item.attributes : [];

    const dbWeapon = await db.get<any>(
      'SELECT slug, name_en, name_ru, group_type, riven_type, disposition, icon_url FROM riven_weapons WHERE slug = ?',
      [weaponSlug]
    );

    const weaponsDict = weaponVariantsData as Record<string, any>;
    const weaponMeta = weaponsDict[weaponSlug] || null;

    const groupType = dbWeapon?.group_type || weaponMeta?.group_type || 'primary';
    const rivenType = dbWeapon?.riven_type || weaponMeta?.riven_type || 'rifle';
    const baseDisp = 1.20; // Official Warframe Standard: 4 dots (1.20) for all weapons
    const weaponClass = resolveWeaponClass(groupType, rivenType);

    const evaluation = evaluateRiven(
      weaponClass,
      baseDisp,
      declaredRank,
      rawAttrs,
      weaponSlug,
      variant
    );

    const owner = auction.owner || {};
    const result = {
      ...evaluation,
      auction_id: cleanId,
      seller_info: {
        name: owner.ingame_name || 'Anonymous',
        status: owner.status || 'offline',
        reputation: owner.reputation || 0,
        price: auction.buyout_price || auction.starting_price || null,
        is_direct_sell: Boolean(auction.is_direct_sell),
      },
      mod_info: {
        name: `${evaluation.weapon_name_en} ${item.name || ''}`.trim(),
        rerolls: Number(item.re_rolls) || 0,
        mastery_level: Number(item.mastery_level) || 8,
        polarity: item.polarity || 'madurai',
      },
      created_at: auction.created,
      updated_at: auction.updated,
    };

    res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Health & System status (Real-time telemetry, Event Loop lag & Memory metrics)
app.get('/api/status', async (_req, res) => {
  try {
    // 1. Check in-memory status cache (< 0.2 ms)
    const cachedStatus = memoryCache.getStatus();
    if (cachedStatus) {
      return res.json(cachedStatus);
    }

    const itemsCount = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM items');
    const snapshotsCount = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM market_snapshots');
    const rivensCount = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM riven_lots');

    const mem = process.memoryUsage();
    const cacheTelemetry = memoryCache.getTelemetry();
    const rawLag = elHistogram.mean / 1e6;
    const eventLoopLagMs = Number.isFinite(rawLag) && rawLag > 0 ? Math.round(rawLag * 100) / 100 : 0.05;

    const payload = {
      status: 'ONLINE',
      system: 'Tenno Market Intelligence Core',
      memoryUsageMb: {
        rss: Math.round((mem.rss / (1024 * 1024)) * 100) / 100,
        heapUsed: Math.round((mem.heapUsed / (1024 * 1024)) * 100) / 100,
        heapTotal: Math.round((mem.heapTotal / (1024 * 1024)) * 100) / 100,
      },
      eventLoopLagMs,
      cacheHitRatePct: cacheTelemetry.hitRatePct,
      avgApiResponseMs: cacheTelemetry.avgApiResponseMs,
      cachedKeysCount: cacheTelemetry.cachedKeysCount,
      itemsCount: itemsCount?.count || 0,
      snapshotsCount: snapshotsCount?.count || 0,
      rivensCount: rivensCount?.count || 0,
      websocket: wsMarketClient.getTelemetry(),
      proxyPool: proxyPool.getTelemetry(),
      rivenScheduler: rivenService.getSchedulerTelemetry(),
      timestamp: new Date().toISOString(),
    };

    memoryCache.setStatus(payload, 2500);
    res.json(payload);
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
  proxyPool.initNodes();
  await initDatabase();
  await initAuth();

  // Instant Cold-Start Warmup: pre-calculate showcase catalog into RAM before opening port
  console.log('[SERVER] Pre-warming in-memory showcase catalog into RAM...');
  try {
    const initialCatalog = await loadArcanesCatalog();
    memoryCache.setArcanes(initialCatalog, 60000);
    console.log(`[SERVER] In-memory catalog pre-warmed (${initialCatalog.count} items). 0ms response guaranteed.`);
  } catch (err: any) {
    console.warn('[SERVER] Warmup error:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`[SERVER] Warframe Market Analytics running on port ${PORT}`);
    
    // Start Real-Time WebSocket client for 170 arcanes
    wsMarketClient.start();

    // Start 3-Tier Priority Riven Scheduler (HOT / WARM / COLD)
    rivenService.startPriorityScheduler();

    // Start gentle incremental background scraper
    scraper.startBackgroundWorker();
  });
}

start().catch((err) => {
  console.error('[FATAL] Failed to start server:', err);
});
