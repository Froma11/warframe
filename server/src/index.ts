import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
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
import { extractAuctionId, evaluateRiven, resolveWeaponClass } from './services/rivenEvaluation';
import weaponVariantsData from './data/weaponVariants.json';

const app = express();
const PORT = process.env.PORT || 4000;
const MASTER_KEY = process.env.ACCESS_KEY || 'tenno2026';
const JWT_SECRET = process.env.JWT_SECRET || 'orokin_void_key_secret_2026_warframe';

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: ['http://localhost:3000', 'https://zero.nofuture.me'],
    credentials: true,
  })
);

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
    res.json({ success: true, data: notes });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notes', requireAuth, async (req: any, res) => {
  const { title, content, tag } = req.body;
  if (!content && !title) {
    return res.status(400).json({ error: 'Content required.' });
  }
  try {
    const userId = req.user?.id || 1;
    const cleanTag = tag || '';
    const result = await db.run(
      'INSERT INTO notes (user_id, title, content, tag) VALUES (?, ?, ?, ?)',
      [userId, title || '', content || '', cleanTag]
    );
    res.json({ success: true, id: result.lastID });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/notes/:id', requireAuth, async (req: any, res) => {
  const { title, content, tag } = req.body;
  if (!content && !title) {
    return res.status(400).json({ error: 'Content required.' });
  }
  try {
    const userId = req.user?.id || 1;
    const noteId = req.params.id;
    const cleanTag = tag || '';
    await db.run(
      'UPDATE notes SET title = ?, content = ?, tag = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [title || '', content || '', cleanTag, noteId, userId]
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

app.use('/api/assets', async (req, res) => {
  try {
    const rawPath = decodeURIComponent(req.url.replace(/^\/+/, '').split('?')[0]);
    if (!rawPath || rawPath.includes('..')) {
      return res.status(400).send('Invalid asset path');
    }

    const localFilePath = path.join(assetsCacheDir, rawPath);
    if (fs.existsSync(localFilePath)) {
      try {
        const stat = fs.statSync(localFilePath);
        if (stat.size > 0) {
          res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
          res.setHeader('Access-Control-Allow-Origin', '*');
          const ext = path.extname(localFilePath).toLowerCase();
          if (ext === '.png') res.setHeader('Content-Type', 'image/png');
          else if (ext === '.webp') res.setHeader('Content-Type', 'image/webp');
          else if (ext === '.jpg' || ext === '.jpeg') res.setHeader('Content-Type', 'image/jpeg');
          return fs.createReadStream(localFilePath).pipe(res);
        }
      } catch {}
    }

    const upstreamUrl = `https://warframe.market/static/assets/${rawPath}`;
    const upstreamRes = await fetch(upstreamUrl, {
      headers: {
        'User-Agent': 'Warframe-Market-Integration/2.0'
      }
    });

    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).send('Asset not found');
    }

    const buffer = Buffer.from(await upstreamRes.arrayBuffer());
    try {
      fs.mkdirSync(path.dirname(localFilePath), { recursive: true });
      fs.writeFileSync(localFilePath, buffer);
    } catch {}

    res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', upstreamRes.headers.get('content-type') || 'image/png');
    return res.send(buffer);
  } catch (err: any) {
    return res.status(502).send('Error fetching asset');
  }
});

// --- ARCANES MARKET DATA ROUTES (Publicly accessible for terminal users) ---
app.get('/api/arcanes', async (_req, res) => {
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
    
    // Format into clean client DTO with proxied image paths
    const formatted = items.map((item: any) => ({
      id: item.id || item.urlName,
      name: item.name,
      nameRu: item.nameRu || item.name,
      urlName: item.urlName,
      icon: toProxyAsset(item.thumb || item.icon),
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

// Item detail with full 90-day price history (Publicly accessible for terminal users)
app.get('/api/arcanes/:slug', async (req, res) => {
  const slug = req.params.slug as string;

  try {
    const item = await db.get('SELECT * FROM items WHERE slug = ?', [slug]);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    item.icon_url = toProxyAsset(item.icon_url);
    item.thumb_url = toProxyAsset(item.thumb_url);

    // Return full real historical data for all ranks in one quick call
    const history = await db.all(`
      SELECT rank, date, median_price as medianPrice, volume, min_price as minPrice, max_price as maxPrice
      FROM price_history
      WHERE item_slug = ?
      ORDER BY date ASC
    `, [slug]);

    const hourly = await db.all(`
      SELECT rank, datetime, median_price as medianPrice, volume, min_price as minPrice, max_price as maxPrice
      FROM price_history_hourly
      WHERE item_slug = ?
      ORDER BY datetime ASC
    `, [slug]);

    res.json({
      success: true,
      data: {
        item,
        history,
        hourly,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- RIVENS & ENDO (VENUS) ROUTES ---

// 1. Get riven weapons directory (RU/EN, categories, search autocomplete)
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

// 2. Get riven lots for a weapon from SQLite DB (with filters & sorting)
app.get('/api/rivens/lots/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { type, rerolls, rank, onlineOnly, sortBy } = req.query;

    const result = await rivenService.getLotsForWeapon(slug, {
      type: type as any,
      rerolls: rerolls as any,
      rank: rank as any,
      onlineOnly: onlineOnly === 'true',
      sortBy: sortBy as any,
    });

    if (result.weapon) {
      result.weapon.icon_url = toProxyAsset(result.weapon.icon_url);
      result.weapon.thumb_url = toProxyAsset(result.weapon.thumb_url);
    }

    res.json({
      success: true,
      weapon: result.weapon,
      total: result.total,
      data: result.lots,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Force-sync latest auctions from market
app.post('/api/rivens/sync', async (req, res) => {
  try {
    const weaponSlug = req.body?.weapon || (typeof req.query.weapon === 'string' ? req.query.weapon : undefined);
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

// Health & System status
app.get('/api/status', async (_req, res) => {
  try {
    const itemsCount = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM items');
    const snapshotsCount = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM market_snapshots');
    const rivensCount = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM riven_lots');

    res.json({
      status: 'ONLINE',
      system: 'Tenno Market Intelligence Core',
      itemsCount: itemsCount?.count || 0,
      snapshotsCount: snapshotsCount?.count || 0,
      rivensCount: rivensCount?.count || 0,
      websocket: wsMarketClient.getTelemetry(),
      proxyPool: proxyPool.getTelemetry(),
      rivenScheduler: rivenService.getSchedulerTelemetry(),
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
  proxyPool.initNodes();
  await initDatabase();
  await initAuth();

  app.listen(PORT, () => {
    console.log(`[SERVER] Warframe Market Analytics running on port ${PORT}`);
    
    // Start Real-Time WebSocket client for 170 arcanes
    wsMarketClient.start();

    // Start 3-Tier Priority Riven Scheduler (HOT / WARM / COLD)
    rivenService.startPriorityScheduler();

    // Start gentle incremental background scraper
    scraper.startBackgroundWorker(30);
  });
}

start().catch((err) => {
  console.error('[FATAL] Failed to start server:', err);
});
