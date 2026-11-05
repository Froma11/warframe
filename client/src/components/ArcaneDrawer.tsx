import React, { useState, useMemo, useEffect } from 'react';
import { ArcaneItem } from '../types/arcane';
import { PlatinumIcon } from './PlatinumIcon';
import { X, TrendingUp, ExternalLink, Calendar, Flame, Zap, Clock, ShieldCheck, Activity } from 'lucide-react';

interface ArcaneDrawerProps {
  arcane: ArcaneItem | null;
  onClose: () => void;
  lang: 'ru' | 'en';
}

type Timeframe = '24h' | '7d' | '30d' | '90d';

interface ChartPoint {
  timeLabel: string;
  price: number;
  volume: number;
}

const timeframes: Timeframe[] = ['24h', '7d', '30d', '90d'];

const getRarityBadge = (rarity: string, lang: 'ru' | 'en') => {
  switch (rarity) {
    case 'Legendary':
      return {
        label: lang === 'ru' ? 'ЛЕГЕНДАРНЫЙ' : 'LEGENDARY',
        style: 'bg-amber-400/15 border-amber-400/40 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]',
      };
    case 'Rare':
      return {
        label: lang === 'ru' ? 'РЕДКИЙ' : 'RARE',
        style: 'bg-[#b9a77a]/15 border-[#b9a77a]/40 text-[#dfcf99] shadow-[0_0_10px_rgba(185,167,122,0.2)]',
      };
    case 'Uncommon':
      return {
        label: lang === 'ru' ? 'НЕОБЫЧНЫЙ' : 'UNCOMMON',
        style: 'bg-sky-400/15 border-sky-400/40 text-sky-300',
      };
    default:
      return {
        label: lang === 'ru' ? 'ОБЫЧНЫЙ' : 'COMMON',
        style: 'bg-zinc-400/15 border-zinc-400/40 text-zinc-300',
      };
  }
};

export const ArcaneDrawer: React.FC<ArcaneDrawerProps> = ({ arcane, onClose, lang }) => {
  const maxRank = arcane ? ((arcane as any).maxRank || 5) : 5;
  const [selectedRank, setSelectedRank] = useState<number>(maxRank);
  const [timeframe, setTimeframe] = useState<Timeframe>('7d');
  const [hoveredPoint, setHoveredPoint] = useState<{ point: ChartPoint; x: number; y: number } | null>(null);
  const [historyByRank, setHistoryByRank] = useState<{ [rank: number]: any[] }>({});

  // Keyboard Escape listener & body scroll lock
  useEffect(() => {
    if (!arcane) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [arcane, onClose]);

  // Initialize selected rank on arcane change
  useEffect(() => {
    if (arcane) {
      setSelectedRank(maxRank);
      setHoveredPoint(null);
    }
  }, [arcane, maxRank]);

  // Fetch full real historical data once when arcane modal opens (with credentials for session cookies!)
  useEffect(() => {
    if (!arcane) return;

    fetch(`/api/arcanes/${arcane.urlName}`, {
      credentials: 'include',
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && Array.isArray(res.data?.history)) {
          const grouped: { [rank: number]: any[] } = {};
          for (const item of res.data.history) {
            const r = item.rank ?? 5;
            if (!grouped[r]) grouped[r] = [];
            grouped[r].push(item);
          }
          setHistoryByRank(grouped);
        }
      })
      .catch((err) => {
        console.warn('History fetch error:', err);
      });
  }, [arcane]);

  // Base price for current selected rank
  const basePrice = useMemo(() => {
    if (!arcane) return 100;
    return selectedRank === 0 ? arcane.rank0.avgPrice : arcane.rank5.avgPrice;
  }, [arcane, selectedRank]);

  // Active rank min price
  const activeMinPrice = useMemo(() => {
    if (!arcane) return 100;
    return selectedRank === 0 ? arcane.rank0.minPrice : arcane.rank5.minPrice;
  }, [arcane, selectedRank]);

  // Active rank 24h sales volume
  const active24hSales = useMemo(() => {
    if (!arcane) return 0;
    return selectedRank === 0
      ? (arcane.rank0.sold24h ?? arcane.rank0.activeSellers ?? 0)
      : (arcane.rank5.sold24h ?? arcane.rank5.activeSellers ?? 0);
  }, [arcane, selectedRank]);

  // Velocity calculation (deals / hour)
  const salesPerHour = useMemo(() => {
    return (active24hSales / 24).toFixed(1);
  }, [active24hSales]);

  // Spread calculation between median sold price and best available order
  const orderSpread = useMemo(() => {
    const diff = basePrice - activeMinPrice;
    const discountPct = basePrice > 0 ? Math.round((diff / basePrice) * 100) : 0;
    return {
      hasDiscount: diff > 0,
      diff,
      discountPct,
    };
  }, [basePrice, activeMinPrice]);

  // Generate or map authentic closed trade data points with ZERO lag on rank switch
  const chartPoints = useMemo<ChartPoint[]>(() => {
    const rawHistory = historyByRank[selectedRank];
    if (rawHistory && rawHistory.length >= 2) {
      let filtered = [...rawHistory];
      if (timeframe === '24h') {
        filtered = filtered.slice(-3);
      } else if (timeframe === '7d') {
        filtered = filtered.slice(-7);
      } else if (timeframe === '30d') {
        const last30 = filtered.slice(-30);
        const step = Math.max(1, Math.floor(last30.length / 7));
        filtered = last30.filter((_, i) => i % step === 0 || i === last30.length - 1);
      } else if (timeframe === '90d') {
        const step = Math.max(1, Math.floor(filtered.length / 8));
        filtered = filtered.filter((_, i) => i % step === 0 || i === filtered.length - 1);
      }

      if (filtered.length >= 2) {
        return filtered.map((h) => {
          const d = new Date(h.date);
          const monthRu = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'][d.getMonth()];
          const monthEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
          const day = d.getDate();
          return {
            timeLabel: lang === 'ru' ? `${day} ${monthRu}` : `${monthEn} ${day}`,
            price: Math.max(1, Math.round(h.medianPrice || basePrice)),
            volume: h.volume || 0,
          };
        });
      }
    }

    const daysRu = ['29 Окт', '30 Окт', '31 Окт', '01 Ноя', '02 Ноя', '03 Ноя', '04 Ноя'];
    const daysEn = ['Oct 29', 'Oct 30', 'Oct 31', 'Nov 01', 'Nov 02', 'Nov 03', 'Nov 04'];
    return (lang === 'ru' ? daysRu : daysEn).map((d) => ({
      timeLabel: d,
      price: basePrice,
      volume: 10,
    }));
  }, [historyByRank, selectedRank, timeframe, basePrice, lang]);

  // SCRUBBING & DYNAMIC PRICE CALCULATION
  const activePoint = hoveredPoint?.point || null;
  const activePrice = activePoint ? activePoint.price : basePrice;
  const firstPrice = chartPoints[0]?.price || activePrice;
  const priceChange = activePrice - firstPrice;
  const priceChangePct = firstPrice > 0 ? ((priceChange / firstPrice) * 100).toFixed(1) : '0';
  const isPositive = priceChange >= 0;

  // SVG Geometry calculations
  const svgWidth = 600;
  const svgHeight = 220;
  const padLeft = 24;
  const padRight = 55;
  const padTop = 40;
  const padBottom = 34;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  const { minPrice, maxPrice, priceRange, coords, curvePath, areaPath } = useMemo(() => {
    if (chartPoints.length === 0) {
      return { minPrice: 0, maxPrice: 100, priceRange: 1, coords: [], curvePath: '', areaPath: '' };
    }

    const prices = chartPoints.map((p) => p.price);
    const rawMin = Math.min(...prices);
    const rawMax = Math.max(...prices);
    const diff = Math.max(rawMax - rawMin, 6);
    const minP = Math.max(1, Math.floor(rawMin - diff * 0.15));
    const maxP = Math.ceil(rawMax + diff * 0.22);
    const pRange = maxP - minP || 1;

    // Calculate (x, y) for each point
    const pts = chartPoints.map((p, idx) => {
      const x = padLeft + (idx / (chartPoints.length - 1)) * plotWidth;
      const y = padTop + plotHeight - ((p.price - minP) / pRange) * plotHeight;
      return { x, y, point: p };
    });

    // Smooth cubic Bézier curve
    let cPath = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cx1 = p0.x + (p1.x - p0.x) * 0.5;
      const cy1 = p0.y;
      const cx2 = p0.x + (p1.x - p0.x) * 0.5;
      const cy2 = p1.y;
      cPath += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p1.x} ${p1.y}`;
    }

    // Closed area for gradient fill
    const groundY = padTop + plotHeight;
    const aPath = `${cPath} L ${pts[pts.length - 1].x} ${groundY} L ${pts[0].x} ${groundY} Z`;

    return {
      minPrice: minP,
      maxPrice: maxP,
      priceRange: pRange,
      coords: pts,
      curvePath: cPath,
      areaPath: aPath,
    };
  }, [chartPoints, plotWidth, plotHeight]);

  if (!arcane) return null;

  const displayName = lang === 'ru' && arcane.nameRu ? arcane.nameRu : arcane.name;
  const activeTfIndex = timeframes.indexOf(timeframe);
  const rarityBadge = getRarityBadge(arcane.rarity, lang);

  // Handle mouse move on SVG
  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * svgWidth;

    let closest = coords[0];
    let minDist = Math.abs(coords[0].x - mouseX);
    for (let i = 1; i < coords.length; i++) {
      const dist = Math.abs(coords[i].x - mouseX);
      if (dist < minDist) {
        minDist = dist;
        closest = coords[i];
      }
    }
    setHoveredPoint({ point: closest.point, x: closest.x, y: closest.y });
  };

  return (
    // Backdrop with deep radial vignette & blur
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md transition-all duration-300"
      onClick={onClose}
    >
      {/* Ambient Void Aura Spotlight behind the modal */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(0,229,255,0.08)_0%,transparent_70%)] pointer-events-none" />

      {/* High-Tech Glassmorphic Modal Frame */}
      <div
        className="relative w-full max-w-2xl bg-gradient-to-b from-[#0c1017]/98 via-[#080b11]/98 to-[#04060a]/98 border border-white/[0.12] rounded-3xl p-5 sm:p-7 shadow-[0_30px_100px_rgba(0,0,0,0.95),0_0_60px_rgba(0,229,255,0.12)] overflow-hidden font-sans text-left select-none animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Anamorphic Specular Edge on Top Lip */}
        <div className="absolute top-0 left-8 right-8 h-[1.5px] bg-gradient-to-r from-transparent via-[#00e5ff]/60 to-transparent pointer-events-none" />

        {/* Tactical Orokin Corner Accents */}
        <div className="absolute top-3.5 left-3.5 w-3.5 h-3.5 border-t border-l border-[#00e5ff]/35 pointer-events-none" />
        <div className="absolute top-3.5 right-3.5 w-3.5 h-3.5 border-t border-r border-[#00e5ff]/35 pointer-events-none" />
        <div className="absolute bottom-3.5 left-3.5 w-3.5 h-3.5 border-b border-l border-[#00e5ff]/35 pointer-events-none" />
        <div className="absolute bottom-3.5 right-3.5 w-3.5 h-3.5 border-b border-r border-[#00e5ff]/35 pointer-events-none" />

        {/* Warframe Ambient HUD Micro-Grid */}
        <div className="absolute inset-0 warframe-grid opacity-15 pointer-events-none" />

        {/* Sleek Tactile Close Button with ESC label */}
        <button
          onClick={onClose}
          className="group/close absolute top-5 right-5 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#080b11]/90 hover:bg-[#00e5ff]/10 text-[#a3a29d] hover:text-[#00e5ff] border border-white/[0.1] hover:border-[#00e5ff]/50 transition-all duration-200"
          title={lang === 'ru' ? 'Закрыть (Esc)' : 'Close (Esc)'}
        >
          <span className="text-[10px] text-[#64748b] group-hover/close:text-[#00e5ff] font-mono tracking-wider">ESC</span>
          <X className="w-4 h-4 group-hover/close:rotate-90 transition-transform duration-300" />
        </button>

        {/* Modal Header: Holographic Artifact Podium + Metadata */}
        <div className="relative z-10 flex items-center gap-4 sm:gap-5 border-b border-white/[0.08] pb-5">
          {/* Holographic Pod for Arcane Icon */}
          <div className="relative w-16 h-16 sm:w-18 sm:h-18 shrink-0 flex flex-col items-center justify-center">
            {/* Ambient Radial Bloom */}
            <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_center,rgba(0,229,255,0.3)_0%,rgba(16,185,129,0.15)_50%,transparent_75%)] opacity-90 pointer-events-none" />
            <div className="absolute inset-0 rounded-2xl bg-[#070b10] border border-[#00e5ff]/40 shadow-inner" />
            <img
              src={arcane.icon}
              alt={displayName}
              className="relative z-10 w-13 h-13 sm:w-14 sm:h-14 object-contain drop-shadow-[0_4px_14px_rgba(0,229,255,0.5)]"
            />
          </div>

          {/* Title & Authentic Badges */}
          <div className="flex-1 min-w-0 pr-10">
            {/* Micro Tags Bar */}
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] uppercase font-mono font-bold text-[#00e5ff] bg-[#00e5ff]/10 px-2 py-0.5 rounded border border-[#00e5ff]/30 tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] animate-pulse" />
                {lang === 'ru' ? 'ВОЙД-АРХИВ' : 'VOID CODEX'}
              </span>

              <span className={`text-[10px] uppercase font-mono font-semibold px-2 py-0.5 rounded border tracking-wider ${rarityBadge.style}`}>
                {rarityBadge.label}
              </span>

              <span className="text-[10px] font-mono text-[#a3a29d] bg-white/[0.05] px-2 py-0.5 rounded border border-white/[0.08]">
                MAX: R{maxRank}
              </span>
            </div>

            {/* Display Title */}
            <h2 className="font-comfortaa text-xl sm:text-2xl font-bold text-white tracking-tight truncate drop-shadow-sm">
              {displayName}
            </h2>

            {/* Canonical Slug / Subtitle */}
            <div className="flex items-center gap-2 mt-0.5 text-xs text-[#a3a29d]">
              <span className="font-mono truncate">{arcane.name}</span>
              {arcane.source && arcane.source !== 'Warframe Market' && (
                <>
                  <span className="text-white/20">•</span>
                  <span className="text-[11px] text-[#71717a] truncate">{arcane.source}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tactile Rank Selector Plates (Instant 0ms synchronous switch) */}
        <div className="relative z-10 grid grid-cols-2 gap-3 my-4">
          
          {/* RANK 0 SELECTOR PLATE */}
          <button
            onClick={() => {
              setSelectedRank(0);
              setHoveredPoint(null);
            }}
            className={`group/r0 relative p-3.5 sm:p-4 rounded-2xl border text-left transition-all duration-200 overflow-hidden ${
              selectedRank === 0
                ? 'border-[#10b981] bg-gradient-to-b from-[#0a1b18] to-[#050e0e] shadow-[0_0_24px_rgba(16,185,129,0.25)]'
                : 'border-white/[0.08] bg-[#070a0e]/90 hover:border-white/20 hover:bg-[#0a0f16]'
            }`}
          >
            {/* Active Top Flare Line */}
            {selectedRank === 0 && (
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#10b981] to-transparent" />
            )}

            <div className="flex items-center justify-between text-xs font-medium">
              <span className={selectedRank === 0 ? 'text-[#34d399] font-bold flex items-center gap-1.5' : 'text-[#a3a29d]'}>
                {selectedRank === 0 && <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] animate-pulse" />}
                {lang === 'ru' ? 'РАНГ 0 (БАЗОВЫЙ)' : 'RANK 0 (BASE)'}
              </span>
              <span className="text-[11px] text-[#34d399] bg-[#10b981]/15 px-2 py-0.5 rounded border border-[#10b981]/30 font-mono font-medium flex items-center gap-1">
                <Flame className="w-3 h-3 text-[#34d399]" />
                {arcane.rank0.sold24h ?? arcane.rank0.activeSellers ?? 0} {lang === 'ru' ? 'сделок' : 'deals'}
              </span>
            </div>

            {/* Price Display */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight">
                {arcane.rank0.avgPrice}
              </span>
              <PlatinumIcon size={20} />
            </div>

            {/* Sub-metric: Min active order */}
            <div className="flex items-center justify-between text-xs text-[#94a3b8] mt-2 pt-2 border-t border-white/[0.06]">
              <span className="flex items-center gap-1 text-[11px]">
                {lang === 'ru' ? 'Мин. в стакане:' : 'Min order:'}
              </span>
              <span className="text-white font-medium flex items-center gap-1 font-mono text-xs">
                {arcane.rank0.minPrice} <PlatinumIcon size={12} />
              </span>
            </div>
          </button>

          {/* MAX RANK SELECTOR PLATE */}
          <button
            onClick={() => {
              setSelectedRank(maxRank);
              setHoveredPoint(null);
            }}
            className={`group/rMax relative p-3.5 sm:p-4 rounded-2xl border text-left transition-all duration-200 overflow-hidden ${
              selectedRank === maxRank
                ? 'border-[#00e5ff] bg-gradient-to-b from-[#0a1e2c] to-[#050c14] shadow-[0_0_24px_rgba(0,229,255,0.25)]'
                : 'border-white/[0.08] bg-[#070a0e]/90 hover:border-white/20 hover:bg-[#0a0f16]'
            }`}
          >
            {/* Active Top Flare Line */}
            {selectedRank === maxRank && (
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00e5ff] to-transparent" />
            )}

            <div className="flex items-center justify-between text-xs font-medium">
              <span className={selectedRank === maxRank ? 'text-[#00e5ff] font-bold flex items-center gap-1.5' : 'text-[#a3a29d]'}>
                {selectedRank === maxRank && <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] animate-pulse" />}
                {lang === 'ru' ? `МАКС РАНГ (R${maxRank})` : `MAX RANK (R${maxRank})`}
              </span>
              <span className="text-[11px] text-[#00e5ff] bg-[#00e5ff]/15 px-2 py-0.5 rounded border border-[#00e5ff]/35 font-mono font-semibold flex items-center gap-1">
                <Flame className="w-3 h-3 text-[#00e5ff]" />
                {arcane.rank5.sold24h ?? arcane.rank5.activeSellers ?? 0} {lang === 'ru' ? 'сделок' : 'deals'}
              </span>
            </div>

            {/* Price Display */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-[#00e5ff] tracking-tight">
                {arcane.rank5.avgPrice}
              </span>
              <PlatinumIcon size={20} />
            </div>

            {/* Sub-metric: Min active order */}
            <div className="flex items-center justify-between text-xs text-[#94a3b8] mt-2 pt-2 border-t border-white/[0.06]">
              <span className="flex items-center gap-1 text-[11px]">
                {lang === 'ru' ? 'Мин. в стакане:' : 'Min order:'}
              </span>
              <span className="text-[#00e5ff] font-medium flex items-center gap-1 font-mono text-xs">
                {arcane.rank5.minPrice} <PlatinumIcon size={12} />
              </span>
            </div>
          </button>
        </div>

        {/* NEW: Market Intelligence Ribbon (Ликвидность, Скорость сбыта, Спред) */}
        <div className="relative z-10 grid grid-cols-3 gap-2.5 mb-4 p-2.5 sm:p-3 rounded-xl bg-[#06090e]/95 border border-white/[0.08] text-xs font-mono">
          {/* Column 1: Speed of Sales / Liquidity */}
          <div className="flex flex-col">
            <span className="text-[10px] text-[#64748b] uppercase tracking-wider flex items-center gap-1">
              <Activity className="w-3 h-3 text-[#00e5ff]" />
              {lang === 'ru' ? 'СКОРОСТЬ СБЫТА' : 'VELOCITY'}
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="font-bold text-white text-xs sm:text-sm">~{salesPerHour}</span>
              <span className="text-[11px] text-[#94a3b8]">{lang === 'ru' ? 'сдел./ч' : 'deals/h'}</span>
            </div>
            <span className={`text-[10px] mt-0.5 truncate ${
              Number(salesPerHour) >= 4 ? 'text-[#34d399]' : Number(salesPerHour) >= 1 ? 'text-[#00e5ff]' : 'text-[#94a3b8]'
            }`}>
              {Number(salesPerHour) >= 4
                ? (lang === 'ru' ? '🔥 Высокий спрос' : '🔥 High Demand')
                : Number(salesPerHour) >= 1
                ? (lang === 'ru' ? '⚡ Стабильный темп' : '⚡ Steady Pace')
                : (lang === 'ru' ? '⏱ Спокойный рынок' : '⏱ Low Volume')}
            </span>
          </div>

          {/* Column 2: Order Book Discount / Spread */}
          <div className="flex flex-col border-x border-white/[0.06] px-2.5 sm:px-3">
            <span className="text-[10px] text-[#64748b] uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-3 h-3 text-[#10b981]" />
              {lang === 'ru' ? 'ДИСКОНТ СТАКАНА' : 'ORDER SPREAD'}
            </span>
            <div className="flex items-center gap-1 mt-1">
              {orderSpread.hasDiscount ? (
                <>
                  <span className="font-bold text-[#34d399] text-xs sm:text-sm">-{orderSpread.diff}п</span>
                  <span className="text-[11px] text-[#34d399]/80">(-{orderSpread.discountPct}%)</span>
                </>
              ) : (
                <span className="font-bold text-white text-xs sm:text-sm">0п (паритет)</span>
              )}
            </div>
            <span className="text-[10px] text-[#94a3b8] mt-0.5 truncate">
              {orderSpread.hasDiscount
                ? (lang === 'ru' ? 'Ниже медианы' : 'Below median')
                : (lang === 'ru' ? 'По медиане' : 'At median')}
            </span>
          </div>

          {/* Column 3: Period Range */}
          <div className="flex flex-col">
            <span className="text-[10px] text-[#64748b] uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-[#dfcf99]" />
              {lang === 'ru' ? 'ДИАПАЗОН ЦЕН' : 'PRICE RANGE'}
            </span>
            <div className="flex items-center gap-1 mt-1">
              <span className="font-bold text-white text-xs sm:text-sm">{minPrice}–{maxPrice}п</span>
            </div>
            <span className="text-[10px] text-[#94a3b8] mt-0.5 truncate">
              {lang === 'ru' ? `Размах: ${maxPrice - minPrice}п` : `Spread: ${maxPrice - minPrice}p`}
            </span>
          </div>
        </div>

        {/* Embedded Recessed Holographic Chart Cockpit */}
        <div className="relative z-10 bg-[#04060a] border border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-[inset_0_4px_30px_rgba(0,0,0,0.9)] relative">
          
          {/* SCRUBBING HEADER: Live Large Price with Fluctuation & Sliding Timeframe Pill */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
            
            {/* Dynamic Scrubbed Price & Delta */}
            <div className="flex items-baseline gap-3">
              <div className="flex items-center gap-2">
                <span className="text-3xl font-mono font-bold text-white tracking-tight drop-shadow-[0_2px_10px_rgba(0,229,255,0.25)]">
                  {activePrice}
                </span>
                <PlatinumIcon size={22} />
              </div>

              {/* Dynamic Delta Indicator */}
              <div
                className={`flex items-center gap-1 text-xs font-mono font-semibold px-2 py-0.5 rounded-md ${
                  isPositive
                    ? 'bg-[#10b981]/20 text-[#34d399] border border-[#10b981]/30'
                    : 'bg-[#ef4444]/20 text-[#f87171] border border-[#ef4444]/30'
                }`}
              >
                <span>{isPositive ? `+${priceChange}п` : `${priceChange}п`}</span>
                <span className="opacity-80">({isPositive ? `+${priceChangePct}%` : `${priceChangePct}%`})</span>
              </div>
            </div>

            {/* SLIDING PILL TIMEFRAME SELECTOR */}
            <div className="relative flex items-center bg-[#080b12] p-1 rounded-xl border border-white/[0.08]">
              {/* Animated sliding background pill */}
              <div
                className="absolute top-1 bottom-1 rounded-lg bg-[#00e5ff]/20 border border-[#00e5ff]/50 shadow-[0_0_12px_rgba(0,229,255,0.3)] transition-all duration-200 ease-out"
                style={{
                  width: 'calc(25% - 2px)',
                  left: `calc(${activeTfIndex * 25}% + 1px)`,
                }}
              />

              {timeframes.map((tf) => (
                <button
                  key={tf}
                  onClick={() => {
                    setTimeframe(tf);
                    setHoveredPoint(null);
                  }}
                  className={`relative z-10 w-11 py-1 text-center text-xs uppercase font-mono font-semibold transition-colors duration-150 ${
                    timeframe === tf ? 'text-[#00e5ff]' : 'text-[#71717a] hover:text-white'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* Subheader: Hover Status line */}
          <div className="flex items-center justify-between text-xs font-mono text-[#94a3b8]">
            <span className="text-[#00e5ff] uppercase tracking-wider font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#00e5ff]" />
              {lang === 'ru' ? 'МЕДИАНА ЦЕН И ОБЪЕМ ТОРГОВ' : 'MEDIAN PRICE & VOLUME'}
            </span>

            {activePoint ? (
              <span className="flex items-center gap-1.5 text-white font-medium bg-white/[0.06] px-2.5 py-0.5 rounded-lg border border-white/[0.1] shadow-sm">
                <Calendar className="w-3.5 h-3.5 text-[#00e5ff]" />
                <span>{activePoint.timeLabel}</span>
                <span className="text-[#94a3b8]">|</span>
                <span className="text-[#34d399] font-normal">{activePoint.volume} сделок</span>
              </span>
            ) : (
              <span className="text-[#64748b] text-[11px]">
                {lang === 'ru' ? 'Наведите на график для телеметрии' : 'Hover over chart for telemetry'}
              </span>
            )}
          </div>

          {/* Interactive Native SVG Canvas with MULTI-PASS VOID ENERGY BEAM */}
          <div className="relative w-full">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-[225px] select-none cursor-crosshair overflow-visible"
              onMouseMove={handleSvgMouseMove}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              <defs>
                {/* VOID BEAM BLUR SHADER */}
                <filter id="voidBeamGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Cyan Glow & Gradient for Area */}
                <linearGradient id="nativeAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.28" />
                  <stop offset="85%" stopColor="#00e5ff" stopOpacity="0.02" />
                  <stop offset="100%" stopColor="#00e5ff" stopOpacity="0" />
                </linearGradient>

                <linearGradient id="volBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.08" />
                </linearGradient>
              </defs>

              {/* Horizontal Dashed Grid Lines & Price Labels */}
              {[0, 0.33, 0.66, 1].map((pct, i) => {
                const y = padTop + plotHeight * pct;
                const priceAtY = Math.round(maxPrice - pct * priceRange);
                return (
                  <g key={i}>
                    <line
                      x1={padLeft}
                      y1={y}
                      x2={svgWidth - padRight}
                      y2={y}
                      stroke="rgba(255, 255, 255, 0.05)"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                    <text
                      x={svgWidth - padRight + 8}
                      y={y + 4}
                      fill="#94a3b8"
                      fontSize="11"
                      fontFamily="JetBrains Mono"
                    >
                      {priceAtY}п
                    </text>
                  </g>
                );
              })}

              {/* Volume Bars at Bottom */}
              {coords.map((c, i) => {
                const barHeight = Math.min(32, Math.max(8, (c.point.volume / 65) * 32));
                const barY = padTop + plotHeight - barHeight;
                const barWidth = Math.max(10, (plotWidth / coords.length) * 0.55);
                return (
                  <rect
                    key={i}
                    x={c.x - barWidth / 2}
                    y={barY}
                    width={barWidth}
                    height={barHeight}
                    fill="url(#volBarGrad)"
                    rx="2"
                  />
                );
              })}

              {/* Area Gradient Fill */}
              {areaPath && (
                <path d={areaPath} fill="url(#nativeAreaGrad)" />
              )}

              {/* MULTI-LAYER VOID ENERGY BEAM (Kinematic Laser Bloom) */}
              {curvePath && (
                <>
                  {/* Layer 1: Ambient soft fog bloom */}
                  <path
                    d={curvePath}
                    fill="none"
                    stroke="#00e5ff"
                    strokeWidth="6"
                    opacity="0.3"
                    filter="url(#voidBeamGlow)"
                  />
                  {/* Layer 2: Vibrant cyan neon contour */}
                  <path
                    d={curvePath}
                    fill="none"
                    stroke="#00e5ff"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Layer 3: Laser white core filament */}
                  <path
                    d={curvePath}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.85"
                  />
                </>
              )}

              {/* Coordinates Points (Dots) */}
              {coords.map((c, i) => (
                <circle
                  key={i}
                  cx={c.x}
                  cy={c.y}
                  r="3.5"
                  fill="#0c1017"
                  stroke="#00e5ff"
                  strokeWidth="2"
                />
              ))}

              {/* X-Axis Dates Labels */}
              {coords.map((c, i) => {
                if (timeframe === '24h' && i % 2 !== 0 && i !== coords.length - 1) return null;
                return (
                  <text
                    key={i}
                    x={c.x}
                    y={svgHeight - 10}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="11"
                    fontFamily="JetBrains Mono"
                  >
                    {c.point.timeLabel}
                  </text>
                );
              })}

              {/* Active Hover Crosshair Line & Point */}
              {hoveredPoint && (
                <g>
                  {/* Vertical dashed guideline */}
                  <line
                    x1={hoveredPoint.x}
                    y1={padTop}
                    x2={hoveredPoint.x}
                    y2={padTop + plotHeight}
                    stroke="#00e5ff"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    opacity="0.75"
                  />

                  {/* Pulsing point on the curve */}
                  <circle
                    cx={hoveredPoint.x}
                    cy={hoveredPoint.y}
                    r="7"
                    fill="#00e5ff"
                    opacity="0.35"
                  />
                  <circle
                    cx={hoveredPoint.x}
                    cy={hoveredPoint.y}
                    r="4.5"
                    fill="#ffffff"
                    stroke="#00e5ff"
                    strokeWidth="2"
                  />
                </g>
              )}
            </svg>

            {/* Smart Floating Tooltip: Flips below if point is near the top edge */}
            {hoveredPoint && (() => {
              const isNearTop = hoveredPoint.y < 95;
              const leftPercent = Math.min(84, Math.max(16, (hoveredPoint.x / svgWidth) * 100));
              const topPercent = (hoveredPoint.y / svgHeight) * 100;

              return (
                <div
                  className="absolute pointer-events-none bg-[#0a101d]/95 backdrop-blur-md border border-[#00e5ff]/60 px-3 py-1.5 rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.9)] text-xs font-mono z-30 transition-all duration-75"
                  style={{
                    left: `${leftPercent}%`,
                    top: `${topPercent}%`,
                    transform: isNearTop
                      ? 'translate(-50%, 14px)'
                      : 'translate(-50%, calc(-100% - 14px))',
                  }}
                >
                  <div className="text-[11px] text-[#94a3b8] flex items-center gap-1.5 pb-1 border-b border-white/[0.06]">
                    <Calendar className="w-3 h-3 text-[#00e5ff]" />
                    <span className="font-medium text-white">{hoveredPoint.point.timeLabel}</span>
                  </div>
                  <div className="text-white font-bold flex items-center gap-2 mt-1">
                    <span className="text-[#00e5ff] text-sm flex items-center gap-1 font-mono">
                      {hoveredPoint.point.price} <PlatinumIcon size={14} />
                    </span>
                    <span className="text-[#94a3b8] font-normal text-[11px]">
                      ({hoveredPoint.point.volume} сделок)
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Modal Footer: Clean, modern, balanced ghost-link & live sync */}
        <div className="relative z-10 mt-5 pt-4 border-t border-white/[0.08] flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 text-[#64748b]">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
            <span className="tracking-wider uppercase font-medium">
              {lang === 'ru' ? 'СИНХРОНИЗИРОВАНО В РЕАЛЬНОМ ВРЕМЕНИ' : 'REAL-TIME MARKET TELEMETRY'}
            </span>
          </div>

          <a
            href={`https://warframe.market/items/${arcane.urlName}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group/link inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-[#71717a] hover:text-[#00e5ff] hover:bg-[#00e5ff]/10 border border-transparent hover:border-[#00e5ff]/30 transition-all duration-200 text-xs font-mono font-medium"
            title={lang === 'ru' ? 'Открыть страницу на warframe.market' : 'Open on warframe.market'}
          >
            <span className="tracking-wide">warframe.market</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover/link:opacity-100 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform duration-200" />
          </a>
        </div>

      </div>
    </div>
  );
};
