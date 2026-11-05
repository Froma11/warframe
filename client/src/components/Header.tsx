import React from 'react';
import { PlatinumIcon } from './PlatinumIcon';
import { Globe, Compass } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

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
    <header className="w-full bg-[#05080c]/95 border-b border-white/[0.08] backdrop-blur-md px-4 sm:px-6 py-2.5 sticky top-0 z-40 select-none">
      <div className="max-w-[1920px] mx-auto flex items-center justify-between relative">
        
        {/* Left: Brand & Live Sync Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00e5ff]/20 to-[#0077ff]/20 border border-[#00e5ff]/40 flex items-center justify-center shadow-[0_0_12px_rgba(0,229,255,0.25)]">
              <Compass className="w-4 h-4 text-[#00e5ff]" />
            </div>
            <span className="font-comfortaa font-bold text-sm tracking-wide text-white">
              Warframe <span className="text-[#00e5ff]">Market</span>
            </span>
          </div>

          {/* Sync indicator */}
          <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-white/[0.08] text-xs text-[#a3a29d]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10b981]" />
            </span>
            <span className="text-[11px] font-sans font-medium text-[#10b981] tracking-wide">
              {lastUpdatedText}
            </span>
          </div>
        </div>

        {/* Center: ONE Stylized "Main Menu" Button (Only visible when NOT in Star Chart) */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center">
          {!isStarChart && onGoToStarChart && (
            <button
              onClick={onGoToStarChart}
              className="group relative flex items-center gap-2 px-5 py-2 rounded-2xl bg-[#09111c]/90 hover:bg-[#0d1a2c] border border-[#00e5ff]/50 hover:border-[#00e5ff] text-white shadow-[0_0_18px_rgba(0,229,255,0.2)] hover:shadow-[0_0_28px_rgba(0,229,255,0.45)] hover:scale-[1.03] active:scale-95 transition-all duration-200 cursor-pointer overflow-hidden"
            >
              {/* Subtle ambient light sweep */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00e5ff]/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
              
              <Compass className="w-4 h-4 text-[#00e5ff] transition-transform duration-300 group-hover:rotate-45" />
              <span className="font-comfortaa font-bold text-xs sm:text-sm tracking-wider text-white">
                {lang === 'ru' ? 'В главное меню' : 'Main Menu'}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] animate-pulse" />
            </button>
          )}
        </div>

        {/* Right: Items Count & Language Switcher */}
        <div className="flex items-center gap-3">
          
          {/* Items count badge */}
          <div className="flex items-center gap-2 text-xs text-[#e9e8e4] bg-[#0c1018] px-3.5 py-1.5 rounded-2xl border border-white/[0.08] shadow-sm">
            <PlatinumIcon size={14} className="text-[#00e5ff]" />
            <span className="text-sm text-white font-bold font-sans">{itemsCount}</span>
            <span className="text-[11px] text-[#a3a29d] font-comfortaa uppercase tracking-wider">
              {lang === 'ru' ? 'мистиков' : 'arcanes'}
            </span>
          </div>

          {/* Language Toggle: strictly RU / EN */}
          <button
            onClick={onToggleLang}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border border-white/[0.08] bg-[#0c1018] hover:border-[#00e5ff]/50 hover:bg-[#121824] text-xs text-white transition-all duration-150 active:scale-95"
            title="Switch Language"
          >
            <Globe className="w-3.5 h-3.5 text-[#00e5ff]" />
            <span className="text-xs font-bold font-comfortaa uppercase text-[#00e5ff]">
              {lang.toUpperCase()}
            </span>
          </button>

          {/* Theme Toggle: Dark / Light */}
          <ThemeToggle lang={lang} />

        </div>

      </div>
    </header>
  );
};