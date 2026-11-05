import React, { useState } from 'react';
import { Sparkles, Layers, Calculator, Info } from 'lucide-react';
import { PlatinumIcon } from '../PlatinumIcon';

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
  const [calculatorR0Price, setCalculatorR0Price] = useState<number>(40);
  const [selectedTargetRank, setSelectedTargetRank] = useState<number>(5);
  const [viewFormat, setViewFormat] = useState<'interactive' | 'image'>('interactive');

  const upgradeData: UpgradeRow[] = [
    { rank: 0, labelRu: '0 РАНГ (базовый)', labelEn: 'RANK 0 (Base)', nextCost: '+2', totalCost: 1, dots: 0 },
    { rank: 1, labelRu: '1 РАНГ', labelEn: 'RANK 1', nextCost: '+3', totalCost: 3, dots: 1 },
    { rank: 2, labelRu: '2 РАНГ', labelEn: 'RANK 2', nextCost: '+4', totalCost: 6, dots: 2 },
    { rank: 3, labelRu: '3 РАНГ', labelEn: 'RANK 3', nextCost: '+5', totalCost: 10, dots: 3 },
    { rank: 4, labelRu: '4 РАНГ', labelEn: 'RANK 4', nextCost: '+6', totalCost: 15, dots: 4 },
    { rank: 5, labelRu: '5 РАНГ (макс.)', labelEn: 'RANK 5 (Max)', nextCost: '—', totalCost: 21, dots: 5 },
  ];

  const totalCopiesNeeded = upgradeData.find((u) => u.rank === selectedTargetRank)?.totalCost || 21;
  const totalCraftPlatinum = totalCopiesNeeded * calculatorR0Price;

  return (
    <div className="w-full bg-[#0b1019]/90 border border-white/[0.1] rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#00e5ff]/20 to-[#10b981]/20 border border-[#00e5ff]/40 flex items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.25)]">
            <Sparkles className="w-5 h-5 text-[#00e5ff]" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-comfortaa font-bold text-white tracking-wide flex items-center gap-2">
              {lang === 'ru' ? 'Улучшение Мистификаторов' : 'Arcane Upgrade Guide'}
            </h2>
            <p className="text-xs text-[#a3a29d] font-sans mt-0.5">
              {lang === 'ru' ? 'Таблица затрат копий для прокачки мистификаторов до 5 ранга' : 'Reference chart for arcane fusion & rank progression'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* Format Toggle: Table vs PNG Card */}
          <div className="flex rounded-2xl bg-[#060a12] p-1 border border-white/[0.08]">
            <button
              onClick={() => setViewFormat('interactive')}
              className={`px-3 py-1.5 rounded-xl text-xs font-comfortaa font-bold transition-all cursor-pointer ${
                viewFormat === 'interactive'
                  ? 'bg-[#00e5ff] text-[#070a0e]'
                  : 'text-[#a3a29d] hover:text-white'
              }`}
            >
              {lang === 'ru' ? 'Таблица' : 'Table'}
            </button>
            <button
              onClick={() => setViewFormat('image')}
              className={`px-3 py-1.5 rounded-xl text-xs font-comfortaa font-bold transition-all cursor-pointer ${
                viewFormat === 'image'
                  ? 'bg-[#00e5ff] text-[#070a0e]'
                  : 'text-[#a3a29d] hover:text-white'
              }`}
            >
              PNG {lang === 'ru' ? 'Карточка' : 'Card'}
            </button>
          </div>

          {/* Total R5 indicator badge */}
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#00e5ff]/10 border border-[#00e5ff]/30 text-[#00e5ff] text-xs font-comfortaa font-bold">
            <Layers className="w-4 h-4 text-[#00e5ff]" />
            <span>{lang === 'ru' ? 'Всего для R5: 21 копия' : 'Total for R5: 21 copies'}</span>
          </div>
        </div>
      </div>

      {viewFormat === 'image' ? (
        <div className="mt-6 flex flex-col items-center">
          <div className="w-full max-w-4xl rounded-2xl overflow-hidden border border-[#00e5ff]/40 shadow-[0_15px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(0,229,255,0.2)]">
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
              className="px-4 py-2 rounded-2xl bg-[#0e1624] hover:bg-[#142236] border border-[#00e5ff]/40 text-[#00e5ff] text-xs font-comfortaa font-bold transition-all"
            >
              ↓ {lang === 'ru' ? 'Скачать памятку (PNG)' : 'Download Guide (PNG)'}
            </a>
          </div>
        </div>
      ) : (
        /* Main Grid: Visual Table (Left) + Interactive Quick Calculator (Right) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 items-start">
        
        {/* Left: Authentic Upgrade Table */}
        <div className="lg:col-span-8 overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#070b12]/80">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/[0.08] bg-[#0e1422]/90 text-xs font-comfortaa font-bold text-[#a3a29d] uppercase select-none">
                <th className="py-3.5 px-5">{lang === 'ru' ? 'Ранг' : 'Rank'}</th>
                <th className="py-3.5 px-5 text-center">{lang === 'ru' ? 'Индикатор' : 'Pips'}</th>
                <th className="py-3.5 px-5 text-center">{lang === 'ru' ? 'На следующий' : 'To Next'}</th>
                <th className="py-3.5 px-5 text-right">{lang === 'ru' ? 'Всего копий' : 'Total'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {upgradeData.map((row) => (
                <tr
                  key={row.rank}
                  className={`hover:bg-[#00e5ff]/[0.04] transition-colors ${
                    row.rank === 5 ? 'bg-[#00e5ff]/[0.03]' : ''
                  }`}
                >
                  {/* Rank Title */}
                  <td className="py-3.5 px-5">
                    <span className={`font-comfortaa font-bold text-sm ${
                      row.rank === 5 ? 'text-[#00e5ff]' : 'text-white'
                    }`}>
                      {lang === 'ru' ? row.labelRu : row.labelEn}
                    </span>
                  </td>

                  {/* Visual Rank Pips */}
                  <td className="py-3.5 px-5 text-center">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0b1018] border border-white/[0.08]">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span
                          key={i}
                          className={`w-2 h-2 rounded-full transition-all ${
                            i < row.dots
                              ? 'bg-[#00e5ff] shadow-[0_0_6px_#00e5ff]'
                              : 'bg-white/10'
                          }`}
                        />
                      ))}
                    </div>
                  </td>

                  {/* Cost to Next Rank */}
                  <td className="py-3.5 px-5 text-center">
                    <span className={`font-comfortaa font-bold text-xs px-2.5 py-1 rounded-lg ${
                      row.nextCost === '—'
                        ? 'text-[#71717a] bg-white/[0.04]'
                        : 'text-[#34d399] bg-[#10b981]/15 border border-[#10b981]/30'
                    }`}>
                      {row.nextCost}
                    </span>
                  </td>

                  {/* Total Copies */}
                  <td className="py-3.5 px-5 text-right font-sans font-bold text-base tabular-nums">
                    <span className={row.rank === 5 ? 'text-[#00e5ff] text-lg' : 'text-white'}>
                      {row.totalCost}
                    </span>
                    <span className="text-xs text-[#71717a] font-normal ml-1">
                      {lang === 'ru' ? 'шт' : 'pcs'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right: Quick Crafting Calculator */}
        <div className="lg:col-span-4 bg-[#070b12]/90 border border-white/[0.08] rounded-2xl p-5 space-y-4 shadow-lg">
          <div className="flex items-center gap-2 text-xs font-comfortaa font-bold text-[#38bdf8] uppercase tracking-wider">
            <Calculator className="w-4 h-4 text-[#00e5ff]" />
            <span>{lang === 'ru' ? 'Калькулятор крафта' : 'Craft Calculator'}</span>
          </div>

          <div>
            <label className="text-xs text-[#a3a29d] block mb-1.5 font-sans">
              {lang === 'ru' ? 'Целевой ранг мистификатора:' : 'Target rank:'}
            </label>
            <div className="grid grid-cols-6 gap-1">
              {[0, 1, 2, 3, 4, 5].map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedTargetRank(r)}
                  className={`py-1.5 rounded-xl text-xs font-comfortaa font-bold transition-all cursor-pointer ${
                    selectedTargetRank === r
                      ? 'bg-[#00e5ff] text-[#070a0e] shadow-[0_0_12px_rgba(0,229,255,0.4)]'
                      : 'bg-[#0c121d] text-[#a3a29d] hover:text-white border border-white/[0.08]'
                  }`}
                >
                  R{r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-[#a3a29d] block mb-1.5 font-sans">
              {lang === 'ru' ? 'Цена за 1 шт. ранга 0 (платина):' : 'Rank 0 unit price (plat):'}
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="9999"
                value={calculatorR0Price}
                onChange={(e) => setCalculatorR0Price(Math.max(1, Number(e.target.value) || 0))}
                className="w-full pl-3 pr-8 py-2 bg-[#0c121d] border border-white/[0.1] focus:border-[#00e5ff] rounded-xl text-sm font-sans font-bold text-white outline-none"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <PlatinumIcon size={14} />
              </div>
            </div>
          </div>

          {/* Calculator Result Box */}
          <div className="pt-3 border-t border-white/[0.08] space-y-2">
            <div className="flex items-center justify-between text-xs text-[#a3a29d]">
              <span>{lang === 'ru' ? 'Нужно копий R0:' : 'R0 copies needed:'}</span>
              <strong className="text-white font-comfortaa font-bold text-sm">{totalCopiesNeeded} шт</strong>
            </div>

            <div className="flex items-center justify-between text-xs text-[#a3a29d]">
              <span>{lang === 'ru' ? 'Себестоимость крафта:' : 'Craft cost total:'}</span>
              <strong className="text-[#00e5ff] font-sans font-bold text-base flex items-center gap-1">
                {totalCraftPlatinum} <PlatinumIcon size={14} />
              </strong>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#00e5ff]/[0.06] border border-[#00e5ff]/20 text-[11px] text-[#93c5fd] flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-[#00e5ff] shrink-0 mt-0.5" />
            <span>
              {lang === 'ru'
                ? 'Для прокачки мистификатора с нуля до R5 всегда требуется ровно 21 копия.'
                : 'Upgrading an arcane from rank 0 to max rank 5 always requires exactly 21 copies.'}
            </span>
          </div>
        </div>
      </div>
      )}

    </div>
  );
};
