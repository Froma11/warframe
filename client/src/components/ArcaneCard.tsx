import React from 'react';
import { ArcaneItem } from '../types/arcane';
import { PlatinumIcon } from './PlatinumIcon';
import { resolveAssetUrl } from '../utils/assets';
import { prefetchArcaneDetails } from './ArcaneDrawer';

interface ArcaneCardProps {
  arcane: ArcaneItem;
  onOpenDetails: (arcane: ArcaneItem) => void;
  lang: 'ru' | 'en';
}

export const ArcaneCard: React.FC<ArcaneCardProps> = React.memo(({ arcane, onOpenDetails, lang }) => {
  const maxRank = (arcane as any).maxRank || 5;
  const median5 = arcane.rank5.avgPrice || arcane.rank5.minPrice;

  // 7-day sparkline generator
  const sparklineData = [
    median5 * 0.94,
    median5 * 0.96,
    median5 * 0.99,
    median5 * 0.97,
    median5 * 1.02,
    median5 * 1.01,
    median5,
  ];
  const minVal = Math.min(...sparklineData);
  const maxVal = Math.max(...sparklineData);
  const range = maxVal - minVal || 1;
  const w = 96;
  const h = 26;

  // Sparkline coordinates
  const sparkPoints = sparklineData.map((val, idx) => {
    const x = (idx / (sparklineData.length - 1)) * w;
    const y = h - ((val - minVal) / range) * (h - 7) - 4;
    return { x, y };
  });

  const polylineStr = sparkPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPolyStr = `${polylineStr} ${w},${h} 0,${h}`;
  const lastPoint = sparkPoints[sparkPoints.length - 1];

  const displayName = lang === 'ru' && arcane.nameRu ? arcane.nameRu : arcane.name;

  // Hardware-accelerated cursor position tracking for 60fps Spotlight effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  };

  const gradId = `sparkGrad-${arcane.id || arcane.urlName}`;

  return (
    <div
      data-arcane-card="true"
      onClick={() => onOpenDetails(arcane)}
      onMouseEnter={() => prefetchArcaneDetails(arcane.urlName || (arcane as any).slug || (arcane as any).id)}
      onMouseMove={handleMouseMove}
      className="group relative cursor-pointer bg-white dark:bg-[#16181C] hover:bg-zinc-50 dark:hover:bg-[#1D1F25] border border-zinc-200 dark:border-white/[0.07] hover:border-transparent p-5 rounded-2xl transition-all duration-200 ease-out flex flex-col justify-between shadow-sm dark:shadow-[0_8px_24px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.05)] hover:shadow-xl dark:hover:shadow-[0_16px_36px_rgba(0,0,0,0.75),0_0_24px_rgba(45,212,191,0.10)] hover:-translate-y-1 overflow-hidden select-none font-sans"
    >
      {/* 1. INTERACTIVE SPOTLIGHT: Dynamic radial beam follows cursor along border */}
      <div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: 'radial-gradient(320px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(94, 234, 212, 0.42), rgba(52, 211, 153, 0.22) 40%, transparent 80%)',
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude',
          WebkitMaskComposite: 'xor',
          padding: '1.5px',
        }}
      />

      {/* Ambient Surface Glow under cursor */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: 'radial-gradient(260px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(45, 212, 191, 0.05), transparent 80%)',
        }}
      />

      <div className="relative z-10">
        {/* Top: Icon Podium, Localized Name, Luminous Sparkline */}
        <div className="flex items-start gap-3.5 mb-3.5">
          {/* Holographic Energy Podium */}
          <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
            {/* Ambient Void Aura Bloom */}
            <div className="absolute inset-0 rounded-xl bg-[radial-gradient(circle_at_center,rgba(45,212,191,0.18)_0%,rgba(52,211,153,0.10)_45%,transparent_75%)] opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300 pointer-events-none" />
            
            {/* Translucent Base Plate */}
            <div className="absolute inset-0 rounded-xl bg-zinc-100 dark:bg-[#101215] border border-zinc-200 dark:border-white/[0.07] group-hover:border-[#2DD4BF]/40 shadow-inner transition-colors duration-200" />
            
            {/* Floating Artifact with spring levitation on hover */}
            <img
              src={resolveAssetUrl(arcane.icon)}
              alt={displayName}
              className="relative z-10 w-11 h-11 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.15)] dark:drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)] group-hover:drop-shadow-[0_6px_14px_rgba(45,212,191,0.35)] group-hover:-translate-y-0.5 group-hover:scale-105 transition-all duration-200 ease-out select-none"
              loading="lazy"
              decoding="async"
              onError={(e) => {
                if (arcane.icon && !e.currentTarget.dataset.retried) {
                  e.currentTarget.dataset.retried = 'true';
                  const raw = arcane.icon.replace(/^\/api\/assets\//, '');
                  e.currentTarget.src = raw.startsWith('http') ? raw : `https://warframe.market/static/assets/${raw}`;
                }
              }}
            />
          </div>

          <div className="flex-1 min-w-0">
            {/* Category / Rank badge */}
            <div className="flex items-center gap-2 mb-1">
              {arcane.isSet ? (
                <span className="text-[10px] font-comfortaa font-bold text-amber-600 dark:text-[#FB923C] bg-amber-500/10 dark:bg-orange-500/12 px-2 py-0.5 rounded-full border border-amber-500/30 dark:border-orange-400/25 uppercase tracking-wider">
                  PRIME SET
                </span>
              ) : (
                <span className="text-[10px] font-comfortaa font-bold text-emerald-600 dark:text-[#4ADE80] bg-emerald-500/10 dark:bg-emerald-500/12 px-2 py-0.5 rounded-full border border-emerald-500/25 dark:border-emerald-400/25 uppercase tracking-wider">
                  MAX: R{maxRank}
                </span>
              )}
            </div>

            <h3 className="font-comfortaa text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-teal-700 dark:group-hover:text-[#5EEAD4] transition-colors truncate">
              {displayName}
            </h3>

            {/* Sparkline & Trade volume */}
            <div className="flex items-center justify-between mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="font-onest text-[11px]">{arcane.trades24h} {lang === 'ru' ? 'сделок / 24ч' : 'trades / 24h'}</span>
              
              <svg width={w} height={h} className="overflow-visible opacity-85 group-hover:opacity-100 transition-opacity">
                <defs>
                  <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5EEAD4" stopOpacity="0.32" />
                    <stop offset="100%" stopColor="#34D399" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                <polygon fill={`url(#${gradId})`} points={areaPolyStr} />
                <polyline
                  fill="none"
                  stroke="#2DD4BF"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={polylineStr}
                />
                <circle cx={lastPoint.x} cy={lastPoint.y} r="3" fill="#5EEAD4" className="animate-ping opacity-60" />
                <circle cx={lastPoint.x} cy={lastPoint.y} r="2" fill="#ffffff" stroke="#2DD4BF" strokeWidth="1.5" />
              </svg>
            </div>
          </div>
        </div>

        {/* REFINED PRICING HUD (No nested boxes) */}
        {arcane.isSet ? (
          <div className="my-2.5 p-3 rounded-xl bg-zinc-50 dark:bg-[#111317] border border-zinc-200/80 dark:border-white/[0.06] flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] font-comfortaa font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                {lang === 'ru' ? 'Средняя цена' : '24h Average'}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-2xl font-jetbrains font-extrabold text-teal-600 dark:text-[#5EEAD4] tabular-nums tracking-tight">
                  {arcane.avgPrice || arcane.minPrice}
                </span>
                <PlatinumIcon size={18} />
              </div>
            </div>

            <div className="flex flex-col items-end text-right border-l border-zinc-200 dark:border-white/[0.06] pl-4">
              <span className="text-[11px] text-zinc-400 font-medium">
                {lang === 'ru' ? 'лучшая:' : 'min:'}
              </span>
              <span className="text-sm font-jetbrains font-bold text-zinc-800 dark:text-zinc-100 tabular-nums flex items-center gap-1 mt-0.5">
                {arcane.minPrice || arcane.avgPrice} <PlatinumIcon size={12} />
              </span>
              {(arcane.activeSellers ?? 0) > 0 && (
                <span className="text-[10px] text-zinc-400 font-mono mt-0.5">
                  ({arcane.activeSellers} {lang === 'ru' ? 'онлайн' : 'online'})
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="my-2.5 p-3 rounded-xl bg-zinc-50 dark:bg-[#111317] border border-zinc-200/80 dark:border-white/[0.06] grid grid-cols-2 gap-3 divide-x divide-zinc-200 dark:divide-white/[0.06]">
            {/* Rank 0 Base Column */}
            <div className="flex flex-col justify-between pr-2">
              <div className="text-[11px] font-comfortaa font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                {lang === 'ru' ? 'Ранг 0 (база)' : 'Rank 0 (base)'}
              </div>
              <div className="flex items-center gap-1.5 my-0.5">
                <span className="text-2xl font-jetbrains font-bold text-zinc-900 dark:text-zinc-100 tabular-nums tracking-tight">
                  {arcane.rank0.avgPrice}
                </span>
                <PlatinumIcon size={18} />
              </div>
              <div className="text-[11px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1 mt-0.5">
                <span>{lang === 'ru' ? 'лучшая:' : 'min:'}</span>
                <span className="font-jetbrains font-semibold text-zinc-700 dark:text-zinc-300 tabular-nums">
                  {arcane.rank0.minPrice}
                </span>
                <PlatinumIcon size={11} />
              </div>
            </div>

            {/* Rank 5 Max Column */}
            <div className="flex flex-col justify-between pl-3.5">
              <div className="text-[11px] font-comfortaa font-bold text-teal-600 dark:text-[#2DD4BF] uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>{lang === 'ru' ? `Макс (R${maxRank})` : `Max (R${maxRank})`}</span>
              </div>
              <div className="flex items-center gap-1.5 my-0.5">
                <span className="text-2xl font-jetbrains font-extrabold text-teal-600 dark:text-[#5EEAD4] tabular-nums tracking-tight drop-shadow-[0_0_8px_rgba(45,212,191,0.22)]">
                  {arcane.rank5.avgPrice}
                </span>
                <PlatinumIcon size={18} />
              </div>
              <div className="text-[11px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1 mt-0.5">
                <span>{lang === 'ru' ? 'лучшая:' : 'min:'}</span>
                <span className="font-jetbrains font-semibold text-zinc-700 dark:text-zinc-300 tabular-nums">
                  {arcane.rank5.minPrice}
                </span>
                <PlatinumIcon size={11} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

ArcaneCard.displayName = 'ArcaneCard';
