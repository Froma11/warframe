import React, { useState, useMemo, useEffect } from 'react';
import { ArcaneItem, SetPart } from '../types/arcane';
import { PlatinumIcon } from './PlatinumIcon';
import {
  X,
  TrendingUp,
  ExternalLink,
  Calendar,
  Flame,
  Zap,
  Activity,
  Layers,
  Sparkles,
  Coins,
} from 'lucide-react';
import { resolveAssetUrl } from '../utils/assets';

interface ArcaneDrawerProps {
  arcane: ArcaneItem | null;
  onClose: () => void;
  lang: 'ru' | 'en';
}

type Timeframe = '24h' | '7d' | '30d' | '90d';

interface ChartPoint {
  timeLabel: string;
  axisLabel?: string;
  price: number;
  volume: number;
}

const timeframes: Timeframe[] = ['24h', '7d', '30d', '90d'];

// Global client-side cache for item details to guarantee instant (0ms) re-opening
export const detailsClientCache = new Map<string, { history: any[]; hourly: any[]; parts: SetPart[] }>();
const inFlightPrefetches = new Set<string>();

// Instant hover prefetcher: loads item history into RAM while user moves mouse over card (Zero spinner delay on click)
export const prefetchArcaneDetails = (slug: string | null | undefined) => {
  if (!slug || detailsClientCache.has(slug) || inFlightPrefetches.has(slug)) return;
  inFlightPrefetches.add(slug);
  fetch(`/api/arcanes/${slug}`, { credentials: 'include' })
    .then((r) => r.json())
    .then((res) => {
      if (res.success && res.data) {
        detailsClientCache.set(slug, {
          history: Array.isArray(res.data.history) ? res.data.history : [],
          hourly: Array.isArray(res.data.hourly) ? res.data.hourly : [],
          parts: Array.isArray(res.data.parts) ? res.data.parts : [],
        });
      }
    })
    .catch(() => {})
    .finally(() => {
      inFlightPrefetches.delete(slug);
    });
};

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
  const isSet = Boolean(arcane?.isSet);
  const maxRank = arcane ? ((arcane as any).maxRank ?? (isSet ? 0 : 5)) : 5;
  const [selectedRank, setSelectedRank] = useState<number>(maxRank);
  const [timeframe, setTimeframe] = useState<Timeframe>('7d');
  const [hoveredPoint, setHoveredPoint] = useState<{ point: ChartPoint; x: number; y: number } | null>(null);

  const itemSlug = arcane ? (arcane.urlName || (arcane as any).slug || (arcane as any).id) : '';
  const cachedDetails = itemSlug ? detailsClientCache.get(itemSlug) : null;

  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(!cachedDetails);
  const [historyByRank, setHistoryByRank] = useState<{ [rank: number]: any[] }>({});
  const [hourlyByRank, setHourlyByRank] = useState<{ [rank: number]: any[] }>({});
  const [parts, setParts] = useState<SetPart[]>([]);

  // Keyboard Escape listener & body scroll lock
  useEffect(() => {
    if (!arcane) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.code === 'Escape' || e.keyCode === 27) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      document.body.style.overflow = originalOverflow;
    };
  }, [arcane, onClose]);

  // Initialize selected rank and cached state on arcane change
  useEffect(() => {
    if (!arcane) return;
    const currentSlug = arcane.urlName || (arcane as any).slug || (arcane as any).id;
    setSelectedRank(arcane.isSet ? 0 : maxRank);
    setHoveredPoint(null);

    const cached = currentSlug ? detailsClientCache.get(currentSlug) : null;
    if (cached) {
      const grouped: { [rank: number]: any[] } = {};
      for (const item of cached.history || []) {
        const r = item.rank ?? (arcane.isSet ? 0 : maxRank);
        if (!grouped[r]) grouped[r] = [];
        grouped[r].push(item);
      }
      setHistoryByRank(grouped);

      const groupedHourly: { [rank: number]: any[] } = {};
      for (const item of cached.hourly || []) {
        const r = item.rank ?? (arcane.isSet ? 0 : maxRank);
        if (!groupedHourly[r]) groupedHourly[r] = [];
        groupedHourly[r].push(item);
      }
      setHourlyByRank(groupedHourly);
      setParts(cached.parts || []);
      setIsLoadingDetails(false);
      return;
    }

    setParts(arcane.parts || []);
    setIsLoadingDetails(true);

    const controller = new AbortController();
    let isCurrent = true;

    fetch(`/api/arcanes/${currentSlug}`, {
      credentials: 'include',
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((res) => {
        if (!isCurrent) return;
        if (res.success && res.data) {
          const hist = Array.isArray(res.data.history) ? res.data.history : [];
          const hrly = Array.isArray(res.data.hourly) ? res.data.hourly : [];
          const pts = Array.isArray(res.data.parts) ? res.data.parts : [];

          detailsClientCache.set(currentSlug, {
            history: hist,
            hourly: hrly,
            parts: pts,
          });

          const grouped: { [rank: number]: any[] } = {};
          for (const item of hist) {
            const r = item.rank ?? (arcane.isSet ? 0 : maxRank);
            if (!grouped[r]) grouped[r] = [];
            grouped[r].push(item);
          }
          setHistoryByRank(grouped);

          const groupedHourly: { [rank: number]: any[] } = {};
          for (const item of hrly) {
            const r = item.rank ?? (arcane.isSet ? 0 : maxRank);
            if (!groupedHourly[r]) groupedHourly[r] = [];
            groupedHourly[r].push(item);
          }
          setHourlyByRank(groupedHourly);
          setParts(pts);
        }
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        console.warn('History fetch error:', err);
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoadingDetails(false);
        }
      });

    return () => {
      isCurrent = false;
      controller.abort();
    };
  }, [arcane, maxRank]);

  // Base price for current selected rank / set
  const basePrice = useMemo(() => {
    if (!arcane) return 100;
    if (arcane.isSet) {
      return arcane.avgPrice || arcane.minPrice || arcane.rank0.avgPrice || 100;
    }
    return selectedRank === 0 ? arcane.rank0.avgPrice : arcane.rank5.avgPrice;
  }, [arcane, selectedRank]);

  // Active rank min price
  const activeMinPrice = useMemo(() => {
    if (!arcane) return 100;
    if (arcane.isSet) {
      return arcane.minPrice || arcane.avgPrice || arcane.rank0.minPrice || 100;
    }
    return selectedRank === 0 ? arcane.rank0.minPrice : arcane.rank5.minPrice;
  }, [arcane, selectedRank]);

  // Active rank 24h sales volume
  const active24hSales = useMemo(() => {
    if (!arcane) return 0;
    if (arcane.isSet) {
      return arcane.trades24h || arcane.rank0.sold24h || 0;
    }
    return selectedRank === 0
      ? (arcane.rank0.sold24h ?? 0)
      : (arcane.rank5.sold24h ?? 0);
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

  // Sum of crafting parts for sets
  const partsSum = useMemo(() => {
    return parts.reduce((sum, p) => sum + (p.avgPrice || p.minPrice || 0), 0);
  }, [parts]);

  // Arbitrage analysis (Set price vs Sum of components)
  const arbitrage = useMemo(() => {
    if (!arcane?.isSet || partsSum === 0) {
      return { diff: 0, pct: 0, profitableSet: false };
    }
    const setP = arcane.avgPrice || basePrice;
    const diff = setP - partsSum;
    const pct = Math.round((diff / partsSum) * 100);
    return {
      diff,
      pct,
      profitableSet: diff > 0,
    };
  }, [arcane, basePrice, partsSum]);

  // Generate or map authentic closed trade data points
  const chartPoints = useMemo<ChartPoint[]>(() => {
    const effectiveRank = arcane?.isSet ? 0 : selectedRank;
    const rawHistory = historyByRank[effectiveRank] || historyByRank[0] || [];
    const rawHourly = hourlyByRank[effectiveRank] || hourlyByRank[0] || [];

    const monthRu = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
    const monthEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // 1. 24H: Prefer real hourly data
    if (timeframe === '24h' && rawHourly.length >= 2) {
      const recentHourly = rawHourly.slice(-24);
      const step = Math.max(1, Math.floor(recentHourly.length / 8));
      const sampled = recentHourly.filter((_, i) => i % step === 0 || i === recentHourly.length - 1);
      return sampled.map((h) => {
        const d = new Date(h.datetime);
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        const day = d.getDate();
        const m = lang === 'ru' ? monthRu[d.getMonth()] : monthEn[d.getMonth()];
        return {
          timeLabel: `${day} ${m}, ${hh}:${mm}`,
          axisLabel: `${hh}:${mm}`,
          price: Math.max(1, Math.round(h.medianPrice || basePrice)),
          volume: h.volume || 0,
        };
      });
    }

    // 2. 7D, 30D, 90D or daily history
    if (rawHistory.length >= 2) {
      let filtered = [...rawHistory];
      if (timeframe === '24h') {
        filtered = filtered.slice(-2);
      } else if (timeframe === '7d') {
        filtered = filtered.slice(-7);
      } else if (timeframe === '30d') {
        filtered = filtered.slice(-30);
      } else if (timeframe === '90d') {
        filtered = filtered.slice(-90);
      }

      if (filtered.length >= 2) {
        return filtered.map((h) => {
          const d = new Date(h.date);
          const m = lang === 'ru' ? monthRu[d.getMonth()] : monthEn[d.getMonth()];
          const day = d.getDate();
          const year = d.getFullYear();
          const axisLabel = lang === 'ru' ? `${day} ${m}` : `${m} ${day}`;
          const timeLabel = lang === 'ru' ? `${day} ${m} ${year}` : `${m} ${day}, ${year}`;
          return {
            timeLabel,
            axisLabel,
            price: Math.max(1, Math.round(h.medianPrice || basePrice)),
            volume: h.volume || 0,
          };
        });
      }
    }

    // Dynamic real-time fallback based on current date
    const now = new Date();
    const count = timeframe === '24h' ? 24 : timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
    const fallbackPts: ChartPoint[] = [];
    for (let i = count - 1; i >= 0; i--) {
      if (timeframe === '24h') {
        const d = new Date(now.getTime() - i * 3600 * 1000);
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = '00';
        const day = d.getDate();
        const m = lang === 'ru' ? monthRu[d.getMonth()] : monthEn[d.getMonth()];
        fallbackPts.push({
          timeLabel: `${day} ${m}, ${hh}:${mm}`,
          axisLabel: `${hh}:${mm}`,
          price: basePrice,
          volume: 5,
        });
      } else {
        const d = new Date(now.getTime() - i * 24 * 3600 * 1000);
        const m = lang === 'ru' ? monthRu[d.getMonth()] : monthEn[d.getMonth()];
        const day = d.getDate();
        const label = lang === 'ru' ? `${day} ${m}` : `${m} ${day}`;
        fallbackPts.push({
          timeLabel: label,
          axisLabel: label,
          price: basePrice,
          volume: 10,
        });
      }
    }
    return fallbackPts;
  }, [historyByRank, hourlyByRank, selectedRank, timeframe, basePrice, lang, arcane]);

  // Scrubbing & Dynamic Price
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

    const pts = chartPoints.map((p, idx) => {
      const x = padLeft + (idx / (chartPoints.length - 1)) * plotWidth;
      const y = padTop + plotHeight - ((p.price - minP) / pRange) * plotHeight;
      return { x, y, point: p };
    });

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

  // Sub-component: Chart Cockpit
  const renderChartCockpit = () => (
    <div className="bg-[#04060a] border border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-[inset_0_4px_30px_rgba(0,0,0,0.9)] relative">
      {/* Scrubbing Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
        <div className="flex items-baseline gap-3">
          <div className="flex items-center gap-2">
            <span className="text-3xl font-mono font-bold text-white tracking-tight drop-shadow-[0_2px_10px_rgba(0,229,255,0.25)]">
              {activePrice}
            </span>
            <PlatinumIcon size={22} />
          </div>

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

        {/* Sliding Pill Timeframe Selector */}
        <div className="relative flex items-center bg-[#080b12] p-1 rounded-xl border border-white/[0.08]">
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
            <span className="text-[#34d399] font-normal">{activePoint.volume} {lang === 'ru' ? 'сделок' : 'deals'}</span>
          </span>
        ) : (
          <span className="text-[#64748b] text-[11px]">
            {lang === 'ru' ? 'Наведите на график для телеметрии' : 'Hover over chart for telemetry'}
          </span>
        )}
      </div>

      {/* Interactive SVG Canvas */}
      <div className="relative w-full">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-[225px] select-none cursor-crosshair overflow-visible"
          onMouseMove={handleSvgMouseMove}
          onMouseLeave={() => setHoveredPoint(null)}
        >
          <defs>
            <filter id="voidBeamGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

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

          {/* Horizontal Dashed Grid Lines */}
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

          {/* Volume Bars */}
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
          {areaPath && <path d={areaPath} fill="url(#nativeAreaGrad)" />}

          {/* Multi-Layer Void Beam */}
          {curvePath && (
            <>
              <path
                d={curvePath}
                fill="none"
                stroke="#00e5ff"
                strokeWidth="6"
                opacity="0.3"
                filter="url(#voidBeamGlow)"
              />
              <path
                d={curvePath}
                fill="none"
                stroke="#00e5ff"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
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

          {/* Coordinates Dots */}
          {coords.map((c, i) => {
            const isDense = coords.length > 35;
            if (isDense && i % Math.ceil(coords.length / 22) !== 0 && i !== coords.length - 1) {
              return null;
            }
            return (
              <circle
                key={i}
                cx={c.x}
                cy={c.y}
                r="3.5"
                fill="#0c1017"
                stroke="#00e5ff"
                strokeWidth="2"
              />
            );
          })}

          {/* X-Axis Labels */}
          {coords.map((c, i) => {
            const step = Math.max(1, Math.floor((coords.length - 1) / 5));
            const isSelectedLabel = i === 0 || i === coords.length - 1 || i % step === 0;
            if (!isSelectedLabel) return null;
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
                {c.point.axisLabel || c.point.timeLabel}
              </text>
            );
          })}

          {/* Hover Crosshairs */}
          {hoveredPoint && (
            <g>
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

        {/* Sleek non-blocking top shimmer pulse while fresh history streams in */}
        {isLoadingDetails && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#00e5ff] to-transparent animate-pulse z-20 pointer-events-none rounded-t-xl" />
        )}

        {/* Floating Tooltip */}
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
                  ({hoveredPoint.point.volume} {lang === 'ru' ? 'сделок' : 'deals'})
                </span>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md transition-all duration-300 cursor-pointer"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(0,229,255,0.08)_0%,transparent_70%)] pointer-events-none" />

      {/* High-Tech Glassmorphic Modal Frame */}
      <div
        className={`relative w-full ${
          arcane.isSet ? 'max-w-5xl' : 'max-w-2xl'
        } max-h-[92vh] overflow-y-auto bg-gradient-to-b from-[#0c1017]/98 via-[#080b11]/98 to-[#04060a]/98 border border-white/[0.12] rounded-3xl p-5 sm:p-7 shadow-[0_30px_100px_rgba(0,0,0,0.95),0_0_60px_rgba(0,229,255,0.12)] font-sans text-left select-none animate-in zoom-in-95 duration-200 cursor-default`}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-8 right-8 h-[1.5px] bg-gradient-to-r from-transparent via-[#00e5ff]/60 to-transparent pointer-events-none" />

        <div className="absolute top-3.5 left-3.5 w-3.5 h-3.5 border-t border-l border-[#00e5ff]/35 pointer-events-none" />
        <div className="absolute top-3.5 right-3.5 w-3.5 h-3.5 border-t border-r border-[#00e5ff]/35 pointer-events-none" />
        <div className="absolute bottom-3.5 left-3.5 w-3.5 h-3.5 border-b border-l border-[#00e5ff]/35 pointer-events-none" />
        <div className="absolute bottom-3.5 right-3.5 w-3.5 h-3.5 border-b border-r border-[#00e5ff]/35 pointer-events-none" />

        <div className="absolute inset-0 warframe-grid opacity-15 pointer-events-none" />

        {/* Close Button with ESC */}
        <button
          onClick={onClose}
          className="group/close absolute top-5 right-5 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#080b11]/90 hover:bg-[#00e5ff]/10 text-[#a3a29d] hover:text-[#00e5ff] border border-white/[0.1] hover:border-[#00e5ff]/50 transition-all duration-200"
          title={lang === 'ru' ? 'Закрыть (Esc)' : 'Close (Esc)'}
        >
          <span className="text-[10px] text-[#64748b] group-hover/close:text-[#00e5ff] font-mono tracking-wider">ESC</span>
          <X className="w-4 h-4 group-hover/close:rotate-90 transition-transform duration-300" />
        </button>

        {/* Modal Header */}
        <div className="relative z-10 flex items-center gap-4 sm:gap-5 border-b border-white/[0.08] pb-5">
          <div className="relative w-16 h-16 sm:w-18 sm:h-18 shrink-0 flex flex-col items-center justify-center">
            <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_center,rgba(0,229,255,0.3)_0%,rgba(16,185,129,0.15)_50%,transparent_75%)] opacity-90 pointer-events-none" />
            <div className="absolute inset-0 rounded-2xl bg-[#070b10] border border-[#00e5ff]/40 shadow-inner" />
            <img
              src={resolveAssetUrl(arcane.icon)}
              alt={displayName}
              className="relative z-10 w-13 h-13 sm:w-14 sm:h-14 object-contain drop-shadow-[0_4px_14px_rgba(0,229,255,0.5)]"
              onError={(e) => {
                if (arcane.icon && !e.currentTarget.dataset.retried) {
                  e.currentTarget.dataset.retried = 'true';
                  const raw = arcane.icon.replace(/^\/api\/assets\//, '');
                  e.currentTarget.src = raw.startsWith('http') ? raw : `https://warframe.market/static/assets/${raw}`;
                }
              }}
            />
          </div>

          <div className="flex-1 min-w-0 pr-10">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              {arcane.isSet ? (
                <>
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase font-mono font-bold text-amber-300 bg-amber-400/15 px-2 py-0.5 rounded border border-amber-400/40 tracking-wider">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    {arcane.category === 'warframe'
                      ? (lang === 'ru' ? 'ВАРФРЕЙМ СЕТ' : 'WARFRAME SET')
                      : (lang === 'ru' ? 'ОРУЖИЕ СЕТ' : 'WEAPON SET')}
                  </span>
                  {arcane.ducats && arcane.ducats > 0 ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-[#dfcf99] bg-[#b9a77a]/15 px-2 py-0.5 rounded border border-[#b9a77a]/40">
                      <Coins className="w-3 h-3 text-[#dfcf99]" />
                      {arcane.ducats} {lang === 'ru' ? 'дукатов' : 'ducats'}
                    </span>
                  ) : null}
                </>
              ) : (
                <>
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
                </>
              )}
            </div>

            <h2 className="font-comfortaa text-xl sm:text-2xl font-bold text-white tracking-tight truncate drop-shadow-sm">
              {displayName}
            </h2>

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

        {/* Dynamic Controls / Metric Cards */}
        {arcane.isSet ? (
          /* PRIME SET OVERVIEW & ARBITRAGE CALCULATOR */
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-3 my-4">
            {/* Set Price Card */}
            <div className="relative p-4 rounded-2xl border border-[#00e5ff]/40 bg-gradient-to-b from-[#0a1e2c] to-[#050c14] shadow-[0_0_24px_rgba(0,229,255,0.2)]">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00e5ff] to-transparent" />
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-[#00e5ff] font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] animate-pulse" />
                  {lang === 'ru' ? 'ПОЛНЫЙ КОМПЛЕКТ (СЕТ)' : 'COMPLETE PRIME SET'}
                </span>
                <span className="text-[11px] text-[#00e5ff] bg-[#00e5ff]/15 px-2 py-0.5 rounded border border-[#00e5ff]/35 font-mono font-semibold flex items-center gap-1">
                  <Flame className="w-3 h-3 text-[#00e5ff]" />
                  {arcane.trades24h || 0} {lang === 'ru' ? 'сделок' : 'deals'}
                </span>
              </div>

              <div className="flex items-center justify-between mt-2.5">
                <div>
                  <span className="text-[10px] text-[#94a3b8] uppercase font-mono block">
                    {lang === 'ru' ? 'Средняя цена продаж 24ч' : '24h Average Sold'}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-3xl font-bold font-mono text-white tracking-tight">
                      {arcane.avgPrice || basePrice}
                    </span>
                    <PlatinumIcon size={22} />
                  </div>
                </div>

                <div className="text-right border-l border-white/[0.08] pl-4">
                  <span className="text-[10px] text-[#94a3b8] uppercase font-mono block">
                    {lang === 'ru' ? 'Мин. в стакане' : 'Min Order'}
                  </span>
                  <div className="flex items-center justify-end gap-1.5 mt-1 font-mono text-base font-bold text-[#00e5ff]">
                    <span>{arcane.minPrice || activeMinPrice}</span>
                    <PlatinumIcon size={14} />
                  </div>
                  {(arcane.activeSellers ?? 0) > 0 && (
                    <span className="text-[10px] text-[#64748b] block mt-0.5 font-sans">
                      ({arcane.activeSellers} {lang === 'ru' ? 'онлайн' : 'online'})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Arbitrage Calculator Card */}
            <div className="relative p-4 rounded-2xl border border-white/[0.1] bg-[#070a0e]/90 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-[#dfcf99] font-bold flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#dfcf99]" />
                    {lang === 'ru' ? 'АРБИТРАЖ (СЕТ VS ЧАСТИ)' : 'ARBITRAGE (SET VS PARTS)'}
                  </span>
                  <span className="text-[11px] font-mono text-[#94a3b8]">
                    {parts.length} {lang === 'ru' ? 'компонентов' : 'components'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/[0.06] font-mono text-xs">
                  <div>
                    <span className="text-[10px] text-[#64748b] block">{lang === 'ru' ? 'Сумма частей:' : 'Parts sum:'}</span>
                    <span className="text-sm font-bold text-white flex items-center gap-1 mt-0.5">
                      {partsSum > 0 ? partsSum : '...'} <PlatinumIcon size={13} />
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[#64748b] block">{lang === 'ru' ? 'Разница:' : 'Difference:'}</span>
                    {partsSum > 0 ? (
                      <span className={`text-sm font-bold flex items-center justify-end gap-1 mt-0.5 ${arbitrage.diff >= 0 ? 'text-[#34d399]' : 'text-amber-400'}`}>
                        {arbitrage.diff >= 0 ? `+${arbitrage.diff}` : arbitrage.diff} <PlatinumIcon size={13} />
                        <span className="text-[10px] opacity-80">({arbitrage.diff >= 0 ? `+${arbitrage.pct}%` : `${arbitrage.pct}%`})</span>
                      </span>
                    ) : (
                      <span className="text-xs text-[#64748b] mt-0.5 block">—</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-white/[0.06] text-[11px] text-[#94a3b8]">
                {partsSum > 0 ? (
                  arbitrage.diff > 0 ? (
                    <span className="text-[#34d399] flex items-center gap-1">
                      <Zap className="w-3 h-3 text-[#34d399]" />
                      {lang === 'ru' ? `Продажа сетом дает +${arbitrage.diff}п (+${arbitrage.pct}%) прибыли` : `Selling set gives +${arbitrage.diff}p (+${arbitrage.pct}%) profit`}
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-400" />
                      {lang === 'ru' ? 'По частям дешевле для покупки' : 'Cheaper to buy components separately'}
                    </span>
                  )
                ) : (
                  <span className="text-[#64748b]">{lang === 'ru' ? 'Загрузка цен компонентов...' : 'Loading part prices...'}</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ARCANE RANK SELECTOR PLATES */
          <div className="relative z-10 grid grid-cols-2 gap-3 my-4">
            {/* Rank 0 */}
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
                  {arcane.rank0.sold24h ?? 0} {lang === 'ru' ? 'сделок' : 'deals'}
                </span>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <span className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight">
                  {arcane.rank0.avgPrice}
                </span>
                <PlatinumIcon size={20} />
              </div>

              <div className="flex items-center justify-between text-xs text-[#94a3b8] mt-2 pt-2 border-t border-white/[0.06]">
                <span className="flex items-center gap-1 text-[11px]">
                  {lang === 'ru' ? 'Мин. в стакане:' : 'Min order:'}
                </span>
                <span className="text-white font-medium flex items-center gap-1.5 font-mono text-xs">
                  {arcane.rank0.minPrice} <PlatinumIcon size={12} />
                  {arcane.rank0.activeSellers > 0 && (
                    <span className="text-[10px] text-slate-400 font-sans font-normal">
                      ({arcane.rank0.activeSellers} {lang === 'ru' ? 'онлайн' : 'online'})
                    </span>
                  )}
                </span>
              </div>
            </button>

            {/* Rank 5 */}
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
                  {arcane.rank5.sold24h ?? 0} {lang === 'ru' ? 'сделок' : 'deals'}
                </span>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <span className="text-2xl sm:text-3xl font-bold font-mono text-[#00e5ff] tracking-tight">
                  {arcane.rank5.avgPrice}
                </span>
                <PlatinumIcon size={20} />
              </div>

              <div className="flex items-center justify-between text-xs text-[#94a3b8] mt-2 pt-2 border-t border-white/[0.06]">
                <span className="flex items-center gap-1 text-[11px]">
                  {lang === 'ru' ? 'Мин. в стакане:' : 'Min order:'}
                </span>
                <span className="text-[#00e5ff] font-medium flex items-center gap-1.5 font-mono text-xs">
                  {arcane.rank5.minPrice} <PlatinumIcon size={12} />
                  {arcane.rank5.activeSellers > 0 && (
                    <span className="text-[10px] text-[#00e5ff]/70 font-sans font-normal">
                      ({arcane.rank5.activeSellers} {lang === 'ru' ? 'онлайн' : 'online'})
                    </span>
                  )}
                </span>
              </div>
            </button>
          </div>
        )}

        {/* Dynamic Body: Dual Panel for Sets, Single Panel for Arcanes */}
        {arcane.isSet ? (
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left 7 Columns: 90-Day Set Chart Cockpit */}
            <div className="lg:col-span-7 space-y-3">
              {renderChartCockpit()}
            </div>

            {/* Right 5 Columns: Crafting Components List */}
            <div className="lg:col-span-5 bg-[#04060a] border border-white/[0.08] rounded-2xl p-4 flex flex-col justify-between shadow-[inset_0_4px_30px_rgba(0,0,0,0.9)]">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                  <span className="text-xs font-mono font-bold text-[#dfcf99] uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#dfcf99]" />
                    {lang === 'ru' ? 'КОМПОНЕНТЫ ДЛЯ СБОРКИ' : 'CRAFTING COMPONENTS'}
                  </span>
                  <span className="text-[11px] font-mono text-[#94a3b8]">
                    {isLoadingDetails && parts.length === 0 ? '...' : `${parts.length} ${lang === 'ru' ? 'дет.' : 'parts'}`}
                  </span>
                </div>

                <div className="divide-y divide-white/[0.06] mt-1 max-h-[380px] overflow-y-auto pr-1 space-y-1">
                  {parts.map((p) => {
                    const partDisplayName = lang === 'ru' && p.nameRu ? p.nameRu : p.name;
                    return (
                      <div key={p.slug || p.id} className="pt-2.5 pb-2.5 flex items-center justify-between gap-3 group/part">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative w-9 h-9 rounded-xl bg-[#080b12] border border-white/[0.08] flex items-center justify-center shrink-0">
                            <img
                              src={resolveAssetUrl(p.icon)}
                              alt={partDisplayName}
                              className="w-7 h-7 object-contain"
                              onError={(e) => {
                                if (p.icon && !e.currentTarget.dataset.retried) {
                                  e.currentTarget.dataset.retried = 'true';
                                  const raw = p.icon.replace(/^\/api\/assets\//, '');
                                  e.currentTarget.src = raw.startsWith('http') ? raw : `https://warframe.market/static/assets/${raw}`;
                                }
                              }}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-white truncate group-hover/part:text-[#00e5ff] transition-colors" title={partDisplayName}>
                              {partDisplayName}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-[#94a3b8] font-mono mt-0.5">
                              <span>{p.trades24h || 0} {lang === 'ru' ? 'сделок' : 'deals'}</span>
                              {p.ducats && p.ducats > 0 ? (
                                <>
                                  <span className="text-white/20">•</span>
                                  <span className="text-[#dfcf99]">{p.ducats} {lang === 'ru' ? 'дук.' : 'duc.'}</span>
                                </>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0 font-mono">
                          <div className="flex items-center justify-end gap-1 text-sm font-bold text-white">
                            <span>{p.avgPrice || p.minPrice}</span>
                            <PlatinumIcon size={14} />
                          </div>
                          <div className="text-[10px] text-[#64748b]">
                            {lang === 'ru' ? 'мин:' : 'min:'} {p.minPrice || p.avgPrice}п
                            {(p.activeSellers ?? 0) > 0 && <span className="ml-1">({p.activeSellers})</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {parts.length === 0 && isLoadingDetails && (
                    <div className="space-y-2 py-2">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] animate-pulse">
                          <div className="w-8 h-8 rounded-lg bg-white/[0.06] shrink-0" />
                          <div className="flex-1 space-y-1.5 min-w-0">
                            <div className="h-3 w-28 bg-white/[0.08] rounded" />
                            <div className="h-2 w-16 bg-white/[0.04] rounded" />
                          </div>
                          <div className="h-4 w-12 bg-white/[0.06] rounded shrink-0" />
                        </div>
                      ))}
                    </div>
                  )}

                  {parts.length === 0 && !isLoadingDetails && (
                    <div className="py-8 text-center text-xs text-[#64748b] font-mono">
                      {lang === 'ru' ? 'Нет данных о компонентах' : 'No components data'}
                    </div>
                  )}
                </div>
              </div>

              {/* Parts Footer Total */}
              <div className="pt-3 mt-2 border-t border-white/[0.08] flex items-center justify-between text-xs font-mono">
                <span className="text-[#94a3b8]">
                  {lang === 'ru' ? 'Итого по частям:' : 'Total parts sum:'}
                </span>
                <span className="text-sm font-bold text-[#dfcf99] flex items-center gap-1">
                  {partsSum > 0 ? partsSum : (isLoadingDetails ? '...' : 0)} <PlatinumIcon size={14} />
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* REGULAR ARCANES BODY: Ribbon + Chart */
          <>
            <div className="relative z-10 grid grid-cols-3 gap-2.5 mb-4 p-2.5 sm:p-3 rounded-xl bg-[#06090e]/95 border border-white/[0.08] text-xs font-mono">
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

            {renderChartCockpit()}
          </>
        )}

        {/* Modal Footer */}
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
