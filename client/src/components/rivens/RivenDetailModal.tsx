import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  Sparkles,
  Gem,
  Layers,
  Zap,
} from 'lucide-react';
import { PlatinumIcon } from '../PlatinumIcon';
import { formatRivenStatName } from './rivenUtils';
import { resolveAssetUrl } from '../../utils/assets';

interface RivenAttribute {
  value: number;
  positive: boolean;
  url_name: string;
}

interface RivenLot {
  id: string;
  weapon_slug: string;
  seller_name: string;
  seller_status: 'online' | 'ingame' | 'offline';
  seller_reputation: number;
  is_direct_sell: boolean;
  buyout_price: number | null;
  starting_price: number | null;
  top_bid: number | null;
  mod_name: string;
  mod_rank: number;
  re_rolls: number;
  mastery_level: number;
  polarity: string;
  attributes: RivenAttribute[];
  endo_value: number;
  efficiency: number;
  lot_created_at: string;
}

interface RivenWeapon {
  name_en: string;
  name_ru: string;
  disposition: number;
  req_mr: number;
  thumb_url: string;
}

interface RivenDetailModalProps {
  lot: RivenLot;
  weapon: RivenWeapon | null;
  onClose: () => void;
  lang: 'ru' | 'en';
}

export const RivenDetailModal: React.FC<RivenDetailModalProps> = ({
  lot,
  weapon,
  onClose,
  lang,
}) => {
  const [isCopied, setIsCopied] = useState(false);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.code === 'Escape' || e.keyCode === 27) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onClose]);

  const price = lot.is_direct_sell ? lot.buyout_price || 0 : lot.top_bid || lot.starting_price || 0;
  const weaponName = weapon ? (lang === 'ru' ? weapon.name_ru : weapon.name_en) : '';

  const handleCopyWhisper = () => {
    const text = `/w ${lot.seller_name} Hi! I want to buy your [${weaponName} ${lot.mod_name}] for ${price} platinum (warframe.market)`;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2200);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
      onClick={handleBackdropClick}
      onMouseDown={handleBackdropClick}
    >
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-[#14161A] border border-zinc-200 dark:border-white/[0.09] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 cursor-default"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-white/[0.07] bg-zinc-50 dark:bg-[#181A1E]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#2DD4BF]/12 border border-[#2DD4BF]/30 flex items-center justify-center text-[#2DD4BF]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="font-comfortaa font-bold text-sm text-zinc-900 dark:text-zinc-100">
                {lang === 'ru' ? 'Аналитика Мода Разлома' : 'Riven Mod Breakdown'}
              </span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 ml-2 font-mono">
                {weaponName} {lot.mod_name}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto flex flex-col gap-5 scrollbar-thin">
          
          {/* 1. Riven Card Header */}
          <div className="p-5 rounded-2xl bg-zinc-100 dark:bg-[#1B1D22] border border-zinc-200 dark:border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {weapon?.thumb_url ? (
                <img
                  src={resolveAssetUrl(weapon.thumb_url)}
                  alt={weaponName}
                  className="w-14 h-14 object-contain drop-shadow-[0_0_12px_rgba(45,212,191,0.3)]"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-[#2DD4BF]/10 flex items-center justify-center text-[#2DD4BF]">
                  <Layers className="w-7 h-7" />
                </div>
              )}
              <div>
                <h3 className="font-comfortaa font-bold text-lg text-zinc-900 dark:text-zinc-100">
                  {weaponName} <span className="text-[#5EEAD4]">{lot.mod_name}</span>
                </h3>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs font-mono">
                  <span className="px-2 py-0.5 rounded-lg bg-zinc-200 dark:bg-white/[0.08] font-bold text-zinc-800 dark:text-zinc-200">
                    MR {lot.mastery_level}
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-zinc-200 dark:bg-white/[0.08] text-zinc-700 dark:text-zinc-300">
                    {lang === 'ru' ? `Ранг ${lot.mod_rank}/8` : `Rank ${lot.mod_rank}/8`}
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-orange-500/12 text-orange-600 dark:text-[#FB923C] font-bold border border-orange-400/25">
                    {lot.re_rolls} {lang === 'ru' ? 'рероллов' : 'rolls'}
                  </span>
                  {lot.polarity && (
                    <span className="px-2 py-0.5 rounded-lg bg-zinc-200 dark:bg-white/[0.08] uppercase text-zinc-700 dark:text-zinc-300">
                      {lot.polarity}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Price Badge */}
            <div className="flex flex-col sm:items-end">
              <span className="text-[11px] font-comfortaa uppercase text-zinc-500 dark:text-zinc-400">
                {lot.is_direct_sell ? (lang === 'ru' ? 'Фиксированная цена' : 'Direct Buyout') : (lang === 'ru' ? 'Аукцион' : 'Auction')}
              </span>
              <div className="flex items-center gap-1.5 text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-0.5">
                <span>{price}</span>
                <PlatinumIcon className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* 2. Mod Stats & Attributes (Localized in Russian and English) */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-comfortaa font-bold text-zinc-700 dark:text-zinc-300">
              {lang === 'ru' ? 'Характеристики Мода Разлома' : 'Riven Mod Attributes'}:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {lot.attributes.map((attr, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-mono ${
                    attr.positive
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-[#4ADE80] border border-emerald-400/25'
                      : 'bg-rose-500/10 text-rose-600 dark:text-[#F87171] border border-rose-400/25'
                  }`}
                >
                  <span className="font-sans font-medium">{formatRivenStatName(attr.url_name, lang)}</span>
                  <span className="font-bold font-mono text-sm shrink-0 ml-2">
                    {attr.positive ? `+${attr.value}%` : `${attr.value}%`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 3. ENDO SCRAP & EFFICIENCY (Clean display without formula clutter) */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-[#2DD4BF]/5 to-transparent border border-emerald-400/25 flex flex-col gap-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-[#4ADE80]">
                <Gem className="w-5 h-5" />
                <span className="font-comfortaa font-bold text-sm">
                  {lang === 'ru' ? 'Выход Эндо при разборе' : 'Endo Dissolve Yield'}
                </span>
              </div>
              <span className="text-2xl font-mono font-bold text-emerald-600 dark:text-[#4ADE80] drop-shadow-[0_0_12px_rgba(74,222,128,0.25)]">
                {lot.endo_value.toLocaleString()} {lang === 'ru' ? 'Эндо' : 'Endo'}
              </span>
            </div>

            {/* Efficiency Highlight */}
            {lot.efficiency > 0 && (
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-emerald-500/12 border border-emerald-400/25 text-xs">
                <span className="font-comfortaa text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-[#4ADE80]" />
                  {lang === 'ru' ? 'Коэффициент выгодности покупки' : 'Profit Efficiency Ratio'}:
                </span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300 text-sm">
                  {lot.efficiency} {lang === 'ru' ? 'Эндо за 1 Ᵽ' : 'Endo / 1 Plat'}
                </span>
              </div>
            )}
          </div>

          {/* 4. Seller & In-Game Whisper Action */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-[#181A1E] border border-zinc-200 dark:border-white/[0.07]">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className={`w-3 h-3 rounded-full shrink-0 ${
                lot.seller_status === 'ingame'
                  ? 'bg-[#4ADE80] animate-pulse'
                  : lot.seller_status === 'online'
                  ? 'bg-[#2DD4BF]'
                  : 'bg-zinc-500'
              }`} />
              <div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 font-sans">
                  {lang === 'ru' ? 'Продавец на warframe.market' : 'Seller on warframe.market'}
                </div>
                <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100 font-mono">
                  {lot.seller_name} <span className="text-xs text-[#5EEAD4]">({lot.seller_reputation}★)</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleCopyWhisper}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#2DD4BF] hover:bg-[#5EEAD4] active:scale-95 text-zinc-950 font-bold font-comfortaa text-xs transition-all shadow-[0_0_18px_rgba(45,212,191,0.3)] cursor-pointer"
            >
              {isCopied ? (
                <>
                  <Check className="w-4 h-4 text-zinc-950" />
                  <span>{lang === 'ru' ? 'Шепот скопирован в буфер!' : 'Whisper Copied!'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-zinc-950" />
                  <span>{lang === 'ru' ? 'Скопировать шепот (/w)' : 'Copy in-game /w'}</span>
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
