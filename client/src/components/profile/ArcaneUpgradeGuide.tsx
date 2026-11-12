import React, { useState } from 'react';
import { Layers, Image as ImageIcon, Table as TableIcon } from 'lucide-react';

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

  const upgradeData: UpgradeRow[] = [
    { rank: 0, labelRu: '0 РАНГ (базовый)', labelEn: 'RANK 0 (Base)', nextCost: '+2', totalCost: 1, dots: 0 },
    { rank: 1, labelRu: '1 РАНГ', labelEn: 'RANK 1', nextCost: '+3', totalCost: 3, dots: 1 },
    { rank: 2, labelRu: '2 РАНГ', labelEn: 'RANK 2', nextCost: '+4', totalCost: 6, dots: 2 },
    { rank: 3, labelRu: '3 РАНГ', labelEn: 'RANK 3', nextCost: '+5', totalCost: 10, dots: 3 },
    { rank: 4, labelRu: '4 РАНГ', labelEn: 'RANK 4', nextCost: '+6', totalCost: 15, dots: 4 },
    { rank: 5, labelRu: '5 РАНГ (макс.)', labelEn: 'RANK 5 (Max)', nextCost: '—', totalCost: 21, dots: 5 },
  ];

  return (
    <div className="w-full bg-white dark:bg-[#0b1019]/90 border border-slate-200 dark:border-white/[0.1] rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-md font-sans transition-colors">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-5 border-b border-slate-200 dark:border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#00e5ff]/20 to-[#10b981]/20 border border-[#00e5ff]/40 flex items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.25)]">
            <Layers className="w-4 h-4 text-[#00e5ff]" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-comfortaa font-bold text-slate-900 dark:text-white tracking-wide flex items-center gap-2">
              {lang === 'ru' ? 'Сборка Мистификаторов' : 'Arcane Fusion Guide'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-[#a3a29d] font-sans">
              {lang === 'ru' ? 'Таблица рангов и копий' : 'Ranks & copy requirements'}
            </p>
          </div>
        </div>

        {/* Action Controls: Table vs PNG Card */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="flex rounded-xl bg-slate-100 dark:bg-[#060a12] p-1 border border-slate-200 dark:border-white/[0.08]">
            <button
              onClick={() => setViewFormat('interactive')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-comfortaa font-bold transition-all cursor-pointer ${
                viewFormat === 'interactive'
                  ? 'bg-[#00e5ff] text-[#070a0e] shadow-sm'
                  : 'text-slate-600 dark:text-[#a3a29d] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>{lang === 'ru' ? 'Таблица' : 'Table'}</span>
            </button>
            <button
              onClick={() => setViewFormat('image')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-comfortaa font-bold transition-all cursor-pointer ${
                viewFormat === 'image'
                  ? 'bg-[#00e5ff] text-[#070a0e] shadow-sm'
                  : 'text-slate-600 dark:text-[#a3a29d] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>PNG</span>
            </button>
          </div>
        </div>
      </div>

      {viewFormat === 'image' ? (
        <div className="mt-5 flex flex-col items-center">
          <div className="w-full rounded-2xl overflow-hidden border border-[#00e5ff]/40 shadow-xl">
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
              className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-[#0e1624] dark:hover:bg-[#142236] border border-slate-200 dark:border-[#00e5ff]/40 text-[#00b4d8] dark:text-[#00e5ff] text-xs font-comfortaa font-bold transition-all"
            >
              ↓ {lang === 'ru' ? 'Скачать памятку (PNG)' : 'Download Guide (PNG)'}
            </a>
          </div>
        </div>
      ) : (
        /* Authentic Upgrade Table */
        <div className="mt-5 space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/80 dark:bg-[#070b12]/80">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/[0.08] bg-slate-100/90 dark:bg-[#0e1422]/90 text-[11px] font-comfortaa font-bold text-slate-500 dark:text-[#a3a29d] uppercase select-none">
                  <th className="py-3 px-3 sm:px-4">{lang === 'ru' ? 'Ранг' : 'Rank'}</th>
                  <th className="py-3 px-2 sm:px-3 text-center">{lang === 'ru' ? 'Индикатор' : 'Pips'}</th>
                  <th className="py-3 px-2 sm:px-3 text-center">{lang === 'ru' ? 'К след.' : 'Next'}</th>
                  <th className="py-3 px-3 sm:px-4 text-right">{lang === 'ru' ? 'Всего' : 'Total'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-white/[0.04]">
                {upgradeData.map((row) => (
                  <tr
                    key={row.rank}
                    className={`hover:bg-[#00e5ff]/[0.04] transition-colors ${
                      row.rank === 5 ? 'bg-[#00e5ff]/[0.05]' : ''
                    }`}
                  >
                    {/* Rank Title */}
                    <td className="py-3 px-3 sm:px-4">
                      <span className={`font-comfortaa font-bold text-xs sm:text-sm ${
                        row.rank === 5 ? 'text-[#0284c7] dark:text-[#00e5ff]' : 'text-slate-900 dark:text-white'
                      }`}>
                        {lang === 'ru' ? row.labelRu : row.labelEn}
                      </span>
                    </td>

                    {/* Visual Rank Pips */}
                    <td className="py-3 px-2 sm:px-3 text-center">
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-200/80 dark:bg-[#0b1018] border border-slate-300 dark:border-white/[0.08]">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full transition-all ${
                              i < row.dots
                                ? 'bg-[#00e5ff] shadow-[0_0_5px_#00e5ff]'
                                : 'bg-slate-400/40 dark:bg-white/10'
                            }`}
                          />
                        ))}
                      </div>
                    </td>

                    {/* Cost to Next Rank */}
                    <td className="py-3 px-2 sm:px-3 text-center">
                      <span className={`font-comfortaa font-bold text-[11px] px-2 py-0.5 rounded-lg ${
                        row.nextCost === '—'
                          ? 'text-slate-400 dark:text-[#71717a] bg-slate-100 dark:bg-white/[0.04]'
                          : 'text-emerald-600 dark:text-[#34d399] bg-emerald-500/10 dark:bg-[#10b981]/15 border border-emerald-500/30 dark:border-[#10b981]/30'
                      }`}>
                        {row.nextCost}
                      </span>
                    </td>

                    {/* Total Copies */}
                    <td className="py-3 px-3 sm:px-4 text-right font-sans font-bold text-sm sm:text-base tabular-nums">
                      <span className={row.rank === 5 ? 'text-[#0284c7] dark:text-[#00e5ff]' : 'text-slate-900 dark:text-white'}>
                        {row.totalCost}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-[#71717a] font-normal ml-1">
                        {lang === 'ru' ? 'шт' : 'pcs'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Quick R5 Badge */}
          <div className="p-3 rounded-2xl bg-[#00e5ff]/[0.08] border border-[#00e5ff]/25 text-xs text-sky-800 dark:text-[#93c5fd] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#00e5ff] shrink-0" />
              <span className="font-comfortaa font-bold">
                {lang === 'ru' ? 'Для ранга 5 (макс):' : 'For Rank 5 (Max):'}
              </span>
            </div>
            <strong className="text-[#0284c7] dark:text-[#00e5ff] font-bold font-sans">
              21 {lang === 'ru' ? 'копия' : 'copies'}
            </strong>
          </div>
        </div>
      )}

    </div>
  );
};
