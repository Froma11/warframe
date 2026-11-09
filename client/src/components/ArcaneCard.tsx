import React from 'react';
import { ArcaneItem } from '../types/arcane';
import { PlatinumIcon } from './PlatinumIcon';
import { ExternalLink } from 'lucide-react';
import { resolveAssetUrl } from '../utils/assets';

interface ArcaneCardProps {
  arcane: ArcaneItem;
  onOpenDetails: (arcane: ArcaneItem) => void;
  lang: 'ru' | 'en';
}

export const ArcaneCard: React.FC<ArcaneCardProps> = ({ arcane, onOpenDetails, lang }) => {
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
  const w = 100;
  const h = 28;

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
      onMouseMove={handleMouseMove}
      className="group relative cursor-pointer bg-white dark:bg-[#0e1117] hover:bg-slate-50 dark:hover:bg-[#121620] border border-slate-200 dark:border-white/[0.08] hover:border-transparent p-5 rounded-3xl transition-all duration-300 ease-out flex flex-col justify-between shadow-sm dark:shadow-[0_10px_30px_rgba(0,0,0,0.5)] hover:shadow-xl dark:hover:shadow-[0_18px_45px_rgba(0,0,0,0.7),0_0_30px_rgba(16,185,129,0.12)] hover:-translate-y-1.5 overflow-hidden select-none font-sans"
    >
      {/* 1. INTERACTIVE SPOTLIGHT: Dynamic radial beam follows cursor along border */}
      <div
        className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: 'radial-gradient(350px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(16, 185, 129, 0.55), rgba(0, 229, 255, 0.35) 40%, transparent 80%)',
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
          background: 'radial-gradient(300px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(0, 229, 255, 0.05), transparent 80%)',
        }}
      />

      <div className="relative z-10">
        {/* Top: Icon Podium, Localized Name, Luminous Sparkline */}
        <div className="flex items-start gap-4 mb-4">
          
          {/* Holographic Energy Podium */}
          <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
            {/* Ambient Void Aura Bloom */}
            <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_center,rgba(0,229,255,0.22)_0%,rgba(16,185,129,0.12)_45%,transparent_75%)] opacity-70 group-hover:opacity-100 group-hover:scale-125 transition-all duration-300 pointer-events-none" />
            
            {/* Translucent Base Plate */}
            <div className="absolute inset-0 rounded-2xl bg-slate-100 dark:bg-[#080b10]/90 border border-slate-200 dark:border-white/[0.08] group-hover:border-[#00e5ff]/40 shadow-inner transition-colors duration-300" />
            
            {/* Floating Artifact with spring levitation on hover */}
            <img
              src={resolveAssetUrl(arcane.icon)}
              alt={displayName}
              className="relative z-10 w-13 h-13 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.15)] dark:drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)] group-hover:drop-shadow-[0_8px_18px_rgba(0,229,255,0.5)] group-hover:-translate-y-1 group-hover:scale-105 transition-all duration-300 ease-out select-none"
              loading="lazy"
              decoding="async"
              onError={(e) => {
                // If local proxy fails, fallback to direct WFM CDN URL
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
                <span className="text-[11px] font-comfortaa font-bold text-amber-500 dark:text-[#fbbf24] bg-amber-500/10 dark:bg-[#fbbf24]/15 px-2.5 py-0.5 rounded-full border border-amber-500/30 dark:border-[#fbbf24]/35">
                  PRIME SET
                </span>
              ) : (
                <span className="text-[11px] font-comfortaa font-bold text-emerald-600 dark:text-[#10b981] bg-emerald-500/10 dark:bg-[#10b981]/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30 dark:border-[#10b981]/35">
                  MAX: R{maxRank}
                </span>
              )}
            </div>

            <h3 className="font-comfortaa text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-[#0284c7] dark:group-hover:text-[#00e5ff] transition-colors truncate">
              {displayName}
            </h3>

            {/* Sparkline & Trade volume */}
            <div className="flex items-center justify-between mt-1 text-xs text-slate-500 dark:text-[#a3a29d]">
              <span className="font-sans">{arcane.trades24h} {lang === 'ru' ? 'сделок / 24ч' : 'trades / 24h'}</span>
              
              <svg width={w} height={h} className="overflow-visible opacity-85 group-hover:opacity-100 transition-opacity">
                <defs>
                  <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#00e5ff" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Subtle Area Gradient under curve */}
                <polygon points={areaPolyStr} fill={`url(#${gradId})`} />

                {/* Glow under-trace */}
                <polyline
                  fill="none"
                  stroke="#00e5ff"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.3"
                  points={polylineStr}
                />

                {/* Sharp crisp line */}
                <polyline
                  fill="none"
                  stroke="#00e5ff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={polylineStr}
                />

                {/* Pulsing beacon on active current price point */}
                <circle
                  cx={lastPoint.x}
                  cy={lastPoint.y}
                  r="4"
                  fill="#00e5ff"
                  className="animate-ping opacity-60"
                />
                <circle
                  cx={lastPoint.x}
                  cy={lastPoint.y}
                  r="2.5"
                  fill="#ffffff"
                  stroke="#00e5ff"
                  strokeWidth="1.5"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* PRICE HIERARCHY: PRIME SET VS ARCANES */}
        {arcane.isSet ? (
          <div className="bg-gradient-to-b from-sky-50 to-slate-50 dark:from-[#0f1724] dark:to-[#080d14] border border-sky-300 dark:border-[#00e5ff]/30 p-3.5 sm:p-4 rounded-2xl flex items-center justify-between my-3 shadow-sm dark:shadow-[0_0_20px_rgba(0,229,255,0.08)] group-hover:border-[#00e5ff] dark:group-hover:border-[#00e5ff]/60 transition-all">
            <div className="flex flex-col">
              <span className="text-[11px] font-comfortaa font-bold text-slate-500 dark:text-[#a3a29d] uppercase tracking-wider">
                {lang === 'ru' ? 'Средняя цена продаж' : '24h Average Sold'}
              </span>
              <div className="flex items-center gap-2 mt-1" title={lang === 'ru' ? 'Средняя цена продаж за 24ч' : '24h average sold price'}>
                <span className="text-3xl font-sans font-extrabold text-[#0284c7] dark:text-[#00e5ff] tabular-nums tracking-tight drop-shadow-[0_0_10px_rgba(0,229,255,0.3)]">
                  {arcane.avgPrice || arcane.minPrice}
                </span>
                <PlatinumIcon size={22} />
              </div>
            </div>

            <div className="flex flex-col items-end text-right border-l border-slate-200 dark:border-white/[0.08] pl-4">
              <span className="text-[11px] text-slate-400 dark:text-[#71717a] font-medium">
                {lang === 'ru' ? 'лучшая:' : 'min:'}
              </span>
              <span className="text-base font-bold text-slate-800 dark:text-white tabular-nums flex items-center gap-1 mt-0.5" title={lang === 'ru' ? 'Лучшая активная цена на продажу' : 'Best active sell order'}>
                {arcane.minPrice || arcane.avgPrice} <PlatinumIcon size={14} />
              </span>
              {(arcane.activeSellers ?? 0) > 0 && (
                <span className="text-[10px] text-slate-400 dark:text-[#71717a] mt-0.5">
                  ({arcane.activeSellers} {lang === 'ru' ? 'онлайн' : 'online'})
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 my-3">
            {/* RANK 0 BLOCK (Base) */}
            <div className="bg-slate-50 dark:bg-[#090b0e] border border-slate-200 dark:border-white/[0.07] p-3.5 rounded-2xl flex flex-col justify-between group-hover:border-slate-300 dark:group-hover:border-white/[0.12] transition-colors">
              <div className="text-xs text-slate-500 dark:text-[#71717a] flex items-center justify-between">
                <span className="font-comfortaa font-bold tracking-wider">{lang === 'ru' ? 'РАНГ 0' : 'RANK 0'}</span>
                <span className="text-[10px] text-slate-400 dark:text-[#52525b] uppercase font-comfortaa">{lang === 'ru' ? 'база' : 'base'}</span>
              </div>

              <div className="my-1.5 flex items-center gap-1.5" title={lang === 'ru' ? 'Средняя цена продаж за 24ч' : '24h average sold price'}>
                <span className="text-2xl font-sans font-bold tabular-nums text-slate-900 dark:text-[#e4e4e7] tracking-tight">
                  {arcane.rank0.avgPrice}
                </span>
                <PlatinumIcon size={18} />
              </div>

              <div className="text-xs text-slate-500 dark:text-[#a1a1aa] flex items-center justify-between pt-1.5 border-t border-slate-200 dark:border-white/[0.05]" title={lang === 'ru' ? 'Лучшая активная цена на продажу' : 'Best active sell order'}>
                <span className="text-[11px] text-slate-400 dark:text-[#71717a]">{lang === 'ru' ? 'лучшая:' : 'min:'}</span>
                <span className="text-slate-800 dark:text-[#f4f4f5] font-semibold tabular-nums flex items-center gap-1">
                  {arcane.rank0.minPrice} <PlatinumIcon size={12} />
                </span>
              </div>
            </div>

            {/* RANK MAX BLOCK (Luminous Max Rank) */}
            <div className="bg-gradient-to-b from-sky-50 to-slate-50 dark:from-[#0f1722] dark:to-[#090e15] border border-sky-300 dark:border-[#00e5ff]/30 p-3.5 rounded-2xl flex flex-col justify-between shadow-sm dark:shadow-[0_0_15px_rgba(0,229,255,0.06)] group-hover:border-[#00e5ff] dark:group-hover:border-[#00e5ff]/60 group-hover:shadow-md dark:group-hover:shadow-[0_0_24px_rgba(0,229,255,0.18)] transition-all">
              <div className="text-xs flex items-center justify-between">
                <span className="font-comfortaa font-bold text-[#0284c7] dark:text-[#00e5ff] tracking-wider">
                  {lang === 'ru' ? `МАКС (R${maxRank})` : `MAX (R${maxRank})`}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00e5ff]/15 text-[#0284c7] dark:text-[#38bdf8] font-bold border border-[#00e5ff]/30 font-comfortaa">
                  MAX
                </span>
              </div>

              {/* High-Contrast Luminous Cyan Price */}
              <div className="my-1.5 flex items-center gap-1.5" title={lang === 'ru' ? 'Средняя цена продаж за 24ч' : '24h average sold price'}>
                <span className="text-2xl font-sans font-extrabold tabular-nums text-[#0284c7] dark:text-[#00e5ff] tracking-tight drop-shadow-[0_0_10px_rgba(0,229,255,0.35)]">
                  {arcane.rank5.avgPrice}
                </span>
                <PlatinumIcon size={18} />
              </div>

              <div className="text-xs text-slate-500 dark:text-[#94a3b8] flex items-center justify-between pt-1.5 border-t border-sky-200 dark:border-[#00e5ff]/15" title={lang === 'ru' ? 'Лучшая активная цена на продажу' : 'Best active sell order'}>
                <span className="text-[11px] text-slate-400 dark:text-[#64748b]">{lang === 'ru' ? 'лучшая:' : 'min:'}</span>
                <span className="text-[#0284c7] dark:text-[#38bdf8] font-bold tabular-nums flex items-center gap-1">
                  {arcane.rank5.minPrice} <PlatinumIcon size={12} />
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MINIMALIST FOOTER */}
      <div className="relative z-10 mt-3.5 pt-3 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-end text-xs">
        <a
          href={`https://warframe.market/items/${arcane.urlName}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="group/link inline-flex items-center gap-1.5 py-1 px-3 rounded-xl text-slate-400 hover:text-[#0284c7] hover:bg-sky-50 dark:text-[#71717a] dark:hover:text-[#00e5ff] dark:hover:bg-[#00e5ff]/10 transition-all duration-200 text-xs font-comfortaa font-bold"
          title={lang === 'ru' ? 'Открыть страницу на warframe.market' : 'Open on warframe.market'}
        >
          <span className="tracking-wide">warframe.market</span>
          <ExternalLink className="w-3 h-3 opacity-60 group-hover/link:opacity-100 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform duration-200" />
        </a>
      </div>
    </div>
  );
};
