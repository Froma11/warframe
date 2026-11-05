import React from 'react';
import { Globe, Compass } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  lang: 'ru' | 'en';
  onToggleLang: () => void;
  isStarChart?: boolean;
  onGoToStarChart?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  onToggleLang,
  isStarChart = false,
  onGoToStarChart,
}) => {
  return (
    <header
      className={`w-full backdrop-blur-md px-4 sm:px-6 py-2.5 sticky top-0 z-40 select-none transition-colors border-b ${
        isStarChart
          ? 'bg-[#05080c]/95 border-white/[0.08] text-white'
          : 'bg-white/95 dark:bg-[#05080c]/95 border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white'
      }`}
    >
      <div className="max-w-[1920px] mx-auto flex items-center justify-between relative">
        
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#00e5ff]/20 to-[#0077ff]/20 border border-[#00e5ff]/40 flex items-center justify-center shadow-[0_0_12px_rgba(0,229,255,0.25)]">
            <Compass className="w-4 h-4 text-[#00e5ff]" />
          </div>
          <span className={`font-comfortaa font-bold text-sm sm:text-base tracking-wide ${
            isStarChart ? 'text-white' : 'text-slate-900 dark:text-white'
          }`}>
            Warframe <span className="text-[#00e5ff]">Market</span>
          </span>
        </div>

        {/* Center: ONE Stylized "Main Menu" Button (Only visible when NOT in Star Chart) */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center">
          {!isStarChart && onGoToStarChart && (
            <button
              onClick={onGoToStarChart}
              className="group relative flex items-center gap-2 px-5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-[#09111c]/90 dark:hover:bg-[#0d1a2c] border border-[#00e5ff]/50 hover:border-[#00e5ff] text-slate-900 dark:text-white shadow-[0_0_18px_rgba(0,229,255,0.2)] hover:shadow-[0_0_28px_rgba(0,229,255,0.45)] hover:scale-[1.03] active:scale-95 transition-all duration-200 cursor-pointer overflow-hidden"
            >
              {/* Subtle ambient light sweep */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00e5ff]/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
              
              <Compass className="w-4 h-4 text-[#00e5ff] transition-transform duration-300 group-hover:rotate-45" />
              <span className="font-comfortaa font-bold text-xs sm:text-sm tracking-wider">
                {lang === 'ru' ? 'В главное меню' : 'Main Menu'}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] animate-pulse" />
            </button>
          )}
        </div>

        {/* Right: Language Switcher & Theme Switcher */}
        <div className="flex items-center gap-2.5">
          {/* Language Toggle: strictly RU / EN */}
          <button
            onClick={onToggleLang}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border transition-all duration-150 active:scale-95 cursor-pointer shadow-sm ${
              isStarChart
                ? 'border-white/[0.08] bg-[#0c1018] hover:border-[#00e5ff]/50 text-white'
                : 'border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-[#0c1018] hover:border-[#00e5ff]/50 text-slate-800 dark:text-white'
            }`}
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
