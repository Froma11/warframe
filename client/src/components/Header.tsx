import React from 'react';
import { PlatinumIcon } from './PlatinumIcon';
import { Globe, Compass } from 'lucide-react';

interface HeaderProps {
  lang: 'ru' | 'en';
  onToggleLang: () => void;
  itemsCount: number;
  lastUpdatedText: string;
  isStarChart?: boolean;
  onGoToStarChart?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  onToggleLang,
  itemsCount,
  lastUpdatedText,
  isStarChart = false,
  onGoToStarChart,
}) => {
  return (
    <header className="w-full bg-[#05080c]/95 border-b border-white/[0.08] backdrop-blur-md px-4 sm:px-6 py-2.5 sticky top-0 z-40 select-none font-mono">
      <div className="max-w-[1920px] mx-auto flex items-center justify-between">
        
        {/* Left: Star Chart Button or Sync Status */}
        <div className="flex items-center gap-3">
          {!isStarChart && onGoToStarChart ? (
            <button
              onClick={onGoToStarChart}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#090e17] hover:bg-[#00e5ff]/15 border border-[#00e5ff]/40 text-[#00e5ff] hover:text-white transition-all shadow-[0_0_12px_rgba(0,229,255,0.2)] text-xs font-semibold"
              title={lang === 'ru' ? 'Вернуться на Звездную карту' : 'Return to Star Chart'}
            >
              <Compass className="w-4 h-4 text-[#00e5ff] animate-spin" style={{ animationDuration: '40s' }} />
              <span className="tracking-wider uppercase text-[11px]">
                {lang === 'ru' ? 'ЗВЕЗДНАЯ КАРТА' : 'STAR CHART'}
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-2 text-xs text-[#00e5ff] font-bold tracking-wider">
              <Compass className="w-4 h-4 text-[#00e5ff]" />
              <span className="uppercase">WARFRAME // ORIGIN SYSTEM</span>
            </div>
          )}

          {/* Sync indicator */}
          <div className="hidden md:flex items-center gap-2 text-xs text-[#a3a29d]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10b981]" />
            </span>
            <span className="text-[11px] uppercase text-[#10b981] tracking-wider font-medium">
              {lastUpdatedText}
            </span>
          </div>
        </div>

        {/* Right: Items Count & Language Switcher */}
        <div className="flex items-center gap-3">
          
          {/* Items count badge */}
          <div className="flex items-center gap-2 text-xs text-[#e9e8e4] bg-[#0d131d] px-3 py-1.5 rounded-xl border border-white/[0.08]">
            <PlatinumIcon size={14} className="text-[#00e5ff]" />
            <span className="text-sm text-white font-semibold">{itemsCount}</span>
            <span className="text-[11px] text-[#a3a29d] uppercase">
              {lang === 'ru' ? 'МИСТИКОВ' : 'ARCANES'}
            </span>
          </div>

          {/* Language Toggle: strictly RU / EN */}
          <button
            onClick={onToggleLang}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-white/[0.08] bg-[#0d131d] hover:border-[#00e5ff]/50 hover:bg-[#131c2a] text-xs text-white transition-all"
            title="Switch Language"
          >
            <Globe className="w-3.5 h-3.5 text-[#00e5ff]" />
            <span className="text-xs font-semibold uppercase text-[#00e5ff]">
              {lang.toUpperCase()}
            </span>
          </button>

        </div>

      </div>
    </header>
  );
};
