import React, { useState } from 'react';
import { Layers, Image as ImageIcon, Table as TableIcon, Download } from 'lucide-react';

interface ArcaneUpgradeGuideProps {
  lang: 'ru' | 'en';
}

interface UpgradeRow {
  rank: number;
  labelRu: string;
  labelEn: string;
  nextCost: string;
  totalCost: number;
  dots: number;
}

export const ArcaneUpgradeGuide: React.FC<ArcaneUpgradeGuideProps> = ({ lang }) => {
  const [viewFormat, setViewFormat] = useState<'interactive' | 'image'>('interactive');
  const [selectedRank, setSelectedRank] = useState<number>(5);
  const [hoveredRank, setHoveredRank] = useState<number | null>(null);

  const upgradeData: UpgradeRow[] = [
    { rank: 0, labelRu: '0 РАНГ (базовый)', labelEn: 'RANK 0 (Base)', nextCost: '+2', totalCost: 1, dots: 0 },
    { rank: 1, labelRu: '1 РАНГ', labelEn: 'RANK 1', nextCost: '+3', totalCost: 3, dots: 1 },
    { rank: 2, labelRu: '2 РАНГ', labelEn: 'RANK 2', nextCost: '+4', totalCost: 6, dots: 2 },
    { rank: 3, labelRu: '3 РАНГ', labelEn: 'RANK 3', nextCost: '+5', totalCost: 10, dots: 3 },
    { rank: 4, labelRu: '4 РАНГ', labelEn: 'RANK 4', nextCost: '+6', totalCost: 15, dots: 4 },
    { rank: 5, labelRu: '5 РАНГ (макс.)', labelEn: 'RANK 5 (Max)', nextCost: '—', totalCost: 21, dots: 5 },
  ];

  const activeRank = hoveredRank ?? selectedRank;
  const inspectedRow = upgradeData.find((r) => r.rank === activeRank) ?? upgradeData[5];

  return (
    <div className="w-full relative overflow-hidden bg-white dark:bg-[#121316] border border-zinc-200/90 dark:border-white/[0.08] rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.07),0_20px_50px_rgba(0,0,0,0.45)] font-sans transition-colors">
      {/* Subtle Ambient Corner Gradient */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_100%_0%,rgba(45,212,191,0.06),transparent_45%)]"
      />

      {/* Header */}
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-zinc-200/80 dark:border-white/[0.07]">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#2DD4BF]/10 border border-[#2DD4BF]/30 dark:border-[#2DD4BF]/25 flex items-center justify-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] shrink-0">
            <Layers className="w-4.5 h-4.5 text-teal-600 dark:text-[#2DD4BF]" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-comfortaa font-bold text-zinc-900 dark:text-white tracking-wide">
              {lang === 'ru' ? 'Сборка Мистификаторов' : 'Arcane Fusion Guide'}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-sans mt-0.5">
              {lang === 'ru' ? 'Таблица рангов и количества копий для слияния' : 'Ranks & copy requirements for arcane fusion'}
            </p>
          </div>
        </div>

        {/* Recessed Segmented Control: Table vs PNG */}
        <div className="flex items-center w-full sm:w-auto justify-end">
          <div className="inline-flex rounded-xl bg-zinc-200/75 dark:bg-[#0E0F12] p-1 border border-zinc-300/80 dark:border-white/[0.08] shadow-[inset_0_2px_4px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)]">
            <button
              type="button"
              onClick={() => setViewFormat('interactive')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-comfortaa font-bold transition-all duration-150 cursor-pointer active:scale-[0.98] ${
                viewFormat === 'interactive'
                  ? 'bg-white dark:bg-[#24272D] text-zinc-900 dark:text-white border border-zinc-200/90 dark:border-[#2DD4BF]/35 shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.10)]'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-transparent'
              }`}
            >
              <TableIcon
                className={`w-3.5 h-3.5 ${
                  viewFormat === 'interactive' ? 'text-teal-600 dark:text-[#2DD4BF]' : ''
                }`}
              />
              <span>{lang === 'ru' ? 'Таблица' : 'Table'}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewFormat('image')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-comfortaa font-bold transition-all duration-150 cursor-pointer active:scale-[0.98] ${
                viewFormat === 'image'
                  ? 'bg-white dark:bg-[#24272D] text-zinc-900 dark:text-white border border-zinc-200/90 dark:border-[#2DD4BF]/35 shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.10)]'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-transparent'
              }`}
            >
              <ImageIcon
                className={`w-3.5 h-3.5 ${
                  viewFormat === 'image' ? 'text-teal-600 dark:text-[#2DD4BF]' : ''
                }`}
              />
              <span>PNG</span>
            </button>
          </div>
        </div>
      </div>

      {viewFormat === 'image' ? (
        <div className="relative z-10 mt-5 flex flex-col items-center">
          <div className="w-full max-w-4xl rounded-2xl overflow-hidden border border-zinc-200 dark:border-white/[0.1] bg-black/50 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
            <img
              src="/arcane_upgrade_guide.png"
              alt="Arcane Upgrade Guide"
              className="w-full h-auto object-cover"
            />
          </div>
          <div className="mt-4 flex items-center gap-3">
            <a
              href="/arcane_upgrade_guide.png"
              download="arcane_upgrade_guide.png"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-[#1B1D22] dark:hover:bg-[#24272D] border border-zinc-200 dark:border-[#2DD4BF]/35 text-teal-700 dark:text-[#5EEAD4] text-xs font-comfortaa font-bold shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] active:scale-[0.98] transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{lang === 'ru' ? 'Скачать памятку (PNG)' : 'Download Guide (PNG)'}</span>
            </a>
          </div>
        </div>
      ) : (
        /* Unified 12-Col Tactical Layout: Matrix Table (8 cols) + Master Grade Summary (4 cols) */
        <div className="relative z-10 mt-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Left: Interactive Rank Fusion Matrix */}
          <div className="lg:col-span-8 flex flex-col">
            <div className="flex-1 overflow-x-auto rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/80 dark:bg-[#101215] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-white/[0.07] bg-zinc-100/90 dark:bg-[#16181C] text-[11px] font-mono font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider select-none">
                    <th className="py-3.5 px-4 sm:px-5">{lang === 'ru' ? 'Ранг' : 'Rank'}</th>
                    <th className="py-3.5 px-3 text-center">{lang === 'ru' ? 'Индикатор' : 'Pips'}</th>
                    <th className="py-3.5 px-3 text-center">{lang === 'ru' ? 'К след.' : 'Next'}</th>
                    <th className="py-3.5 px-4 sm:px-5 text-right">{lang === 'ru' ? 'Всего' : 'Total'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/70 dark:divide-white/[0.05]">
                  {upgradeData.map((row) => {
                    const isMaxRank = row.rank === 5;
                    const isActive = activeRank === row.rank;

                    return (
                      <tr
                        key={row.rank}
                        onMouseEnter={() => setHoveredRank(row.rank)}
                        onMouseLeave={() => setHoveredRank(null)}
                        onClick={() => setSelectedRank(row.rank)}
                        className={`group transition-all duration-150 cursor-pointer border-l-2 ${
                          isMaxRank
                            ? 'bg-gradient-to-r from-[#2DD4BF]/[0.11] via-emerald-500/[0.05] to-transparent hover:from-[#2DD4BF]/[0.17] border-l-teal-500 dark:border-l-[#2DD4BF]'
                            : isActive
                            ? 'bg-[#2DD4BF]/[0.07] border-l-teal-500 dark:border-l-[#2DD4BF]'
                            : 'border-l-transparent hover:bg-[#2DD4BF]/[0.05] hover:border-l-[#2DD4BF]/60'
                        }`}
                      >
                        {/* Rank Title */}
                        <td className="py-3.5 px-4 sm:px-5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-comfortaa font-bold text-xs sm:text-sm transition-colors ${
                                isMaxRank
                                  ? 'text-teal-700 dark:text-[#5EEAD4]'
                                  : 'text-zinc-800 dark:text-zinc-100 group-hover:text-teal-700 dark:group-hover:text-[#5EEAD4]'
                              }`}
                            >
                              {lang === 'ru' ? row.labelRu : row.labelEn}
                            </span>
                            {isMaxRank && (
                              <span className="px-1.5 py-0.5 rounded bg-[#2DD4BF]/15 text-teal-700 dark:text-[#5EEAD4] border border-[#2DD4BF]/30 font-mono font-bold text-[10px] tracking-wider">
                                MAX
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Visual Rank Pips */}
                        <td className="py-3.5 px-3 text-center">
                          <div
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all duration-150 ${
                              isMaxRank
                                ? 'bg-[#2DD4BF]/10 dark:bg-[#181A1E] border-[#2DD4BF]/35 shadow-[0_0_12px_rgba(45,212,191,0.14)]'
                                : 'bg-zinc-200/75 dark:bg-[#16181C] border-zinc-300/80 dark:border-white/[0.08] group-hover:border-[#2DD4BF]/35'
                            }`}
                          >
                            {Array.from({ length: 5 }).map((_, i) => {
                              const lit = i < row.dots;
                              return (
                                <span
                                  key={i}
                                  className={`w-2 h-2 rounded-full transition-all duration-200 ${
                                    lit
                                      ? isMaxRank
                                        ? 'bg-teal-500 dark:bg-[#5EEAD4] shadow-[0_0_8px_rgba(94,234,212,0.8)] group-hover:scale-110'
                                        : 'bg-teal-500 dark:bg-[#2DD4BF] shadow-[0_0_6px_rgba(45,212,191,0.65)] group-hover:scale-110 group-hover:shadow-[0_0_10px_rgba(94,234,212,0.85)]'
                                      : 'bg-zinc-400/35 dark:bg-white/[0.09] group-hover:bg-zinc-400/50 dark:group-hover:bg-white/[0.16]'
                                  }`}
                                />
                              );
                            })}
                          </div>
                        </td>

                        {/* Cost to Next Rank */}
                        <td className="py-3.5 px-3 text-center">
                          <span
                            className={`inline-flex items-center justify-center min-w-[40px] font-mono font-bold tabular-nums text-xs px-2.5 py-1 rounded-lg transition-all duration-150 ${
                              row.nextCost === '—'
                                ? 'text-zinc-400 dark:text-zinc-500 bg-zinc-200/60 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.06]'
                                : 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 group-hover:bg-emerald-500/15 group-hover:border-emerald-400/45'
                            }`}
                          >
                            {row.nextCost}
                          </span>
                        </td>

                        {/* Total Copies */}
                        <td className="py-3.5 px-4 sm:px-5 text-right font-mono font-bold tabular-nums">
                          <span
                            className={`text-sm sm:text-base transition-colors ${
                              isMaxRank
                                ? 'text-teal-700 dark:text-[#5EEAD4]'
                                : 'text-zinc-900 dark:text-white group-hover:text-teal-700 dark:group-hover:text-[#5EEAD4]'
                            }`}
                          >
                            {row.totalCost}
                          </span>
                          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-normal ml-1.5">
                            {lang === 'ru' ? 'шт' : 'pcs'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Master Grade Summary & Active Rank Inspector */}
          <div className="lg:col-span-4 flex flex-col gap-3.5">
            {/* Final Grade Banner Card */}
            <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-[#2DD4BF]/[0.12] via-zinc-50 dark:via-[#181A1E] to-emerald-500/[0.07] border border-[#2DD4BF]/35 dark:border-[#2DD4BF]/30 shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_12px_30px_rgba(0,0,0,0.35)]">
              <div
                aria-hidden="true"
                className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-[#2DD4BF]/15 blur-2xl pointer-events-none"
              />

              <div className="relative z-10">
                <div className="flex items-center justify-between gap-2 text-[11px] font-mono uppercase tracking-wider text-teal-700 dark:text-[#5EEAD4]">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <Layers className="w-3.5 h-3.5" />
                    <span>{lang === 'ru' ? 'Для ранга 5 (макс.)' : 'For Rank 5 (Max)'}</span>
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-[#2DD4BF]/15 border border-[#2DD4BF]/30 text-[10px] font-bold">
                    R5
                  </span>
                </div>

                <div className="mt-3 flex items-baseline gap-2.5">
                  <span className="text-4xl font-mono font-bold tabular-nums text-teal-700 dark:text-[#5EEAD4] leading-none">
                    21
                  </span>
                  <span className="text-sm font-comfortaa font-bold text-zinc-700 dark:text-zinc-200">
                    {lang === 'ru' ? 'копия' : 'copies'}
                  </span>
                </div>

                {/* Step Cost Breakdown Pills */}
                <div className="mt-4 pt-3.5 border-t border-[#2DD4BF]/20 dark:border-white/[0.08]">
                  <div className="text-[11px] text-zinc-600 dark:text-zinc-400 mb-2">
                    {lang === 'ru' ? 'Потребность по шагам:' : 'Step-by-step fusion:'}
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {upgradeData.slice(0, 5).map((step) => (
                      <button
                        key={step.rank}
                        type="button"
                        onClick={() => setSelectedRank(step.rank + 1)}
                        onMouseEnter={() => setHoveredRank(step.rank + 1)}
                        onMouseLeave={() => setHoveredRank(null)}
                        className={`py-1.5 px-1 rounded-lg text-center border font-mono text-[11px] tabular-nums transition-all cursor-pointer ${
                          activeRank === step.rank + 1
                            ? 'bg-[#2DD4BF]/20 border-[#2DD4BF]/50 text-teal-700 dark:text-[#5EEAD4] font-bold'
                            : 'bg-white/60 dark:bg-[#101215]/80 border-zinc-200 dark:border-white/[0.08] text-zinc-700 dark:text-zinc-300 hover:border-[#2DD4BF]/35'
                        }`}
                      >
                        {step.nextCost}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Active / Hovered Rank Detail Card + Quick Download */}
            <div className="flex-1 flex flex-col justify-between rounded-2xl p-4 sm:p-5 bg-zinc-50/90 dark:bg-[#16181C] border border-zinc-200/90 dark:border-white/[0.08] shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.07)]">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    {lang === 'ru' ? 'Выбранный ранг' : 'Selected Rank'}
                  </span>
                  <div className="inline-flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full ${
                          i < inspectedRow.dots
                            ? 'bg-teal-500 dark:bg-[#2DD4BF] shadow-[0_0_5px_rgba(45,212,191,0.75)]'
                            : 'bg-zinc-300 dark:bg-white/10'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="mt-2 text-sm font-comfortaa font-bold text-zinc-900 dark:text-white">
                  {lang === 'ru' ? inspectedRow.labelRu : inspectedRow.labelEn}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#101215] border border-zinc-200/80 dark:border-white/[0.06]">
                    <div className="text-[10px] font-mono uppercase text-zinc-500 dark:text-zinc-400">
                      {lang === 'ru' ? 'Всего копий' : 'Total Copies'}
                    </div>
                    <div className="mt-1 text-lg font-mono font-bold tabular-nums text-zinc-900 dark:text-white">
                      {inspectedRow.totalCost}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#101215] border border-zinc-200/80 dark:border-white/[0.06]">
                    <div className="text-[10px] font-mono uppercase text-zinc-500 dark:text-zinc-400">
                      {lang === 'ru' ? 'До следующего' : 'Next Upgrade'}
                    </div>
                    <div
                      className={`mt-1 text-lg font-mono font-bold tabular-nums ${
                        inspectedRow.nextCost === '—'
                          ? 'text-zinc-400 dark:text-zinc-500'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {inspectedRow.nextCost}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3.5 border-t border-zinc-200/70 dark:border-white/[0.06] flex items-center justify-between gap-2">
                <a
                  href="/arcane_upgrade_guide.png"
                  download="arcane_upgrade_guide.png"
                  className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-zinc-200 dark:border-white/[0.08] hover:border-[#2DD4BF]/35 text-xs font-comfortaa font-bold text-zinc-700 dark:text-zinc-200 hover:text-teal-700 dark:hover:text-[#5EEAD4] active:scale-[0.98] transition-all"
                >
                  <Download className="w-3.5 h-3.5 text-teal-600 dark:text-[#2DD4BF]" />
                  <span>{lang === 'ru' ? 'Скачать памятку (PNG)' : 'Download PNG'}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
