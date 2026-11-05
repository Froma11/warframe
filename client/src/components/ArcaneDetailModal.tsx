import React, { useState } from 'react';
import { ArcaneItem } from '../types/arcane';
import { MOCK_ORDERS, MOCK_HISTORY_POINTS, HistoryPoint, Order } from '../data/mockArcanes';
import { X, Copy, Check, TrendingUp, ShoppingBag, ShieldCheck } from 'lucide-react';

interface ArcaneDetailModalProps {
  arcane: ArcaneItem | null;
  onClose: () => void;
}

export const ArcaneDetailModal: React.FC<ArcaneDetailModalProps> = ({ arcane, onClose }) => {
  const [selectedRank, setSelectedRank] = useState<0 | 5>(5);
  const [copiedSeller, setCopiedSeller] = useState<string | null>(null);

  if (!arcane) return null;

  const handleCopy = (sellerName: string, price: number) => {
    const whisper = `/w ${sellerName} Привет! Хочу купить [${arcane.name}] (ранг ${selectedRank}) за ${price} платины. (warframe.market)`;
    navigator.clipboard.writeText(whisper);
    setCopiedSeller(sellerName);
    setTimeout(() => setCopiedSeller(null), 2000);
  };

  // SVG Chart calculation
  const maxPrice = Math.max(...MOCK_HISTORY_POINTS.map((p: HistoryPoint) => p.medianPrice)) * 1.05;
  const minPrice = Math.min(...MOCK_HISTORY_POINTS.map((p: HistoryPoint) => p.medianPrice)) * 0.95;
  const chartHeight = 140;
  const chartWidth = 600;

  const points = MOCK_HISTORY_POINTS.map((pt: HistoryPoint, idx: number) => {
    const x = (idx / (MOCK_HISTORY_POINTS.length - 1)) * (chartWidth - 60) + 30;
    const y = chartHeight - ((pt.medianPrice - minPrice) / (maxPrice - minPrice)) * (chartHeight - 40) - 20;
    return { ...pt, x, y };
  });

  const pathD = points.reduce((acc: string, pt: { x: number; y: number }, i: number) => {
    return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#111622] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border border-white/10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header: Item Identity */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pb-6 border-b border-white/10">
          <div className="w-20 h-20 rounded-2xl bg-[#0b0f17] border border-white/10 p-2.5 flex items-center justify-center shrink-0">
            <img src={arcane.icon} alt={arcane.name} className="w-16 h-16 object-contain" />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-comfortaa font-semibold px-2.5 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/30">
                {arcane.rarity}
              </span>
              <span className="text-xs font-roboto text-slate-400">
                Источник: {arcane.source}
              </span>
            </div>

            <h2 className="font-comfortaa text-2xl sm:text-3xl font-bold text-white">
              {arcane.nameRu || arcane.name}
            </h2>
            <p className="text-sm font-roboto text-slate-400 mt-0.5">
              {arcane.name}
            </p>
          </div>
        </div>

        {/* Effect Description */}
        <div className="py-4 text-sm font-roboto text-slate-300 leading-relaxed bg-[#0b0f17]/60 rounded-xl p-4 my-6 border border-white/5">
          <span className="font-semibold text-white">Эффект: </span>
          {arcane.effect}
        </div>

        {/* Rank Comparison Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          
          {/* Rank 0 */}
          <div
            onClick={() => setSelectedRank(0)}
            className={`cursor-pointer rounded-xl p-5 border transition-all ${
              selectedRank === 0
                ? 'bg-sky-500/10 border-sky-400 ring-2 ring-sky-400/30'
                : 'bg-[#0b0f17] border-white/10 hover:border-white/20'
            }`}
          >
            <div className="text-xs font-comfortaa font-bold text-sky-400 uppercase">
              РАНГ 0 (БАЗОВЫЙ)
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-comfortaa text-3xl font-bold text-white">
                {arcane.rank0.avgPrice}
              </span>
              <span className="text-sm font-roboto text-sky-400">платины (средняя)</span>
            </div>
            <div className="mt-2 text-xs font-roboto text-slate-400">
              Минимальная цена продажи: <strong className="text-white">{arcane.rank0.minPrice} платины</strong>
            </div>
          </div>

          {/* Rank 5 */}
          <div
            onClick={() => setSelectedRank(5)}
            className={`cursor-pointer rounded-xl p-5 border transition-all ${
              selectedRank === 5
                ? 'bg-emerald-500/10 border-emerald-400 ring-2 ring-emerald-400/30'
                : 'bg-[#0b0f17] border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-comfortaa font-bold text-emerald-400 uppercase">
                РАНГ 5 (МАКСИМАЛЬНЫЙ)
              </span>
              <span className="text-[11px] bg-emerald-400/20 text-emerald-300 px-2 py-0.5 rounded font-bold font-roboto">
                ТРЕБУЕТ 21 ШТ
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-comfortaa text-3xl font-bold text-emerald-400">
                {arcane.rank5.avgPrice}
              </span>
              <span className="text-sm font-roboto text-emerald-300">платины (средняя)</span>
            </div>
            <div className="mt-2 text-xs font-roboto text-slate-400">
              Минимальная цена продажи: <strong className="text-white">{arcane.rank5.minPrice} платины</strong>
            </div>
          </div>

        </div>

        {/* History Chart */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-comfortaa text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              История медианных цен (из базы данных сайта)
            </h3>
            <span className="text-xs font-roboto text-slate-400">
              Фиксация за последние дни
            </span>
          </div>

          <div className="w-full bg-[#0b0f17] border border-white/10 rounded-xl p-4">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-36 overflow-visible">
              <line x1="30" y1="20" x2={chartWidth - 30} y2="20" stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="3 3" />
              <line x1="30" y1={chartHeight / 2} x2={chartWidth - 30} y2={chartHeight / 2} stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="3 3" />
              <line x1="30" y1={chartHeight - 20} x2={chartWidth - 30} y2={chartHeight - 20} stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="3 3" />

              <defs>
                <linearGradient id="modalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              <path
                d={`${pathD} L ${points[points.length - 1].x} ${chartHeight - 20} L ${points[0].x} ${chartHeight - 20} Z`}
                fill="url(#modalGrad)"
              />

              <path
                d={pathD}
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {points.map((pt: { x: number; y: number; medianPrice: number; date: string }, i: number) => (
                <g key={i}>
                  <circle cx={pt.x} cy={pt.y} r="4" fill="#0b0f17" stroke="#10b981" strokeWidth="2.5" />
                  <text
                    x={pt.x}
                    y={pt.y - 10}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="11"
                    fontFamily="Roboto"
                    fontWeight="bold"
                  >
                    {pt.medianPrice}p
                  </text>
                  <text
                    x={pt.x}
                    y={chartHeight - 4}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="10"
                    fontFamily="Roboto"
                  >
                    {pt.date}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Live In-Game Traders List */}
        <div>
          <h3 className="font-comfortaa text-base font-bold text-white mb-3">
            Игроки онлайн (готовы продать прямо сейчас)
          </h3>

          <div className="space-y-2">
            {MOCK_ORDERS.filter((o: Order) => o.orderType === 'sell').map((order: Order) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-3.5 bg-[#0b0f17] border border-white/5 hover:border-emerald-500/40 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      order.user.status === 'ingame' ? 'bg-emerald-400' : 'bg-sky-400'
                    }`}
                  />
                  <div>
                    <span className="font-roboto font-semibold text-white">{order.user.ingameName}</span>
                    <span className="text-xs text-slate-500 ml-2">репутация: +{order.user.reputation}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="font-comfortaa text-xl font-bold text-emerald-400">
                      {order.platinum}
                    </span>
                    <span className="text-xs text-slate-400 ml-1">платины</span>
                  </div>

                  <button
                    onClick={() => handleCopy(order.user.ingameName, order.platinum)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-300 hover:text-white text-xs font-roboto font-medium transition-colors"
                  >
                    {copiedSeller === order.user.ingameName ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Скопировано!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Шепот в игре</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
