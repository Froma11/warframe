import React from 'react';
import { Globe, Compass, ShoppingBag, Flame, Sliders, User } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

export type NavigationTab = 'starchart' | 'sedna' | 'earth' | 'venus' | 'mars';

interface HeaderProps {
  lang: 'ru' | 'en';
  onToggleLang: () => void;
  isStarChart?: boolean;
  onGoToStarChart?: () => void;
  activeTab?: NavigationTab;
  onSelectTab?: (tab: 'sedna' | 'earth' | 'venus' | 'mars') => void;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  onToggleLang,
  isStarChart = false,
  onGoToStarChart,
  activeTab,
  onSelectTab,
}) => {
  const tabs = [
    { id: 'sedna' as const, labelRu: 'Маркет', labelEn: 'Market', icon: ShoppingBag },
    { id: 'venus' as const, labelRu: 'МР в Эндо', labelEn: 'Rivens to Endo', icon: Flame },
    { id: 'mars' as const, labelRu: 'Оценка МР', labelEn: 'Riven Appraisal', icon: Sliders },
    { id: 'earth' as const, labelRu: 'Профиль', labelEn: 'Profile', icon: User },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 h-[58px] backdrop-blur-xl px-4 sm:px-6 z-50 select-none transition-colors border-b ${
        isStarChart
          ? 'bg-[#03060b]/90 border-white/[0.08] text-white'
          : 'bg-white/95 dark:bg-[#05080f]/95 border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white'
      }`}
    >
      <div className="max-w-[1920px] mx-auto h-full flex items-center justify-between gap-4 relative">
        
        {/* Left: Brand Identity (Clicking brand also returns to Star Chart) */}
        <div
          onClick={onGoToStarChart}
          className="flex items-center gap-2.5 cursor-pointer group shrink-0"
          title={lang === 'ru' ? 'Нажмите, чтобы вернуться к звездной карте' : 'Click to return to Star Chart'}
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#00e5ff]/20 to-[#0077ff]/20 border border-[#00e5ff]/40 flex items-center justify-center shadow-[0_0_12px_rgba(0,229,255,0.25)] group-hover:scale-105 group-hover:shadow-[0_0_18px_rgba(0,229,255,0.4)] transition-all">
            <Compass className="w-4 h-4 text-[#00e5ff] group-hover:rotate-45 transition-transform duration-300" />
          </div>
          <span className="font-comfortaa font-bold text-sm sm:text-base tracking-wide flex items-center gap-1.5">
            <span className="text-slate-900 dark:text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">Warframe</span>
            <span className="text-[#00e5ff] drop-shadow-[0_0_12px_rgba(0,229,255,0.6)]">Market</span>
          </span>
        </div>

        {/* Center: Navigation Controls (Only shown inside workspaces) */}
        {!isStarChart && (
          <div className="hidden md:flex items-center gap-2">
            {/* 1. Orrery / Star Chart Button */}
            {onGoToStarChart && (
              <button
                onClick={onGoToStarChart}
                className="group flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-comfortaa font-semibold transition-all cursor-pointer active:scale-95"
                title={lang === 'ru' ? 'Открыть звездную карту' : 'Open Star Chart'}
              >
                <Compass className="w-3.5 h-3.5 text-[#00e5ff] group-hover:rotate-45 transition-transform duration-300" />
                <span>{lang === 'ru' ? 'Звездная карта' : 'Star Chart'}</span>
              </button>
            )}

            {/* Subtle Divider */}
            <div className="w-[1px] h-4 bg-slate-200 dark:bg-white/[0.08] mx-1" />

            {/* 2. Instant Tab Switcher (0ms lag, no page reload) */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-[#070b14] border border-slate-200 dark:border-white/[0.06]">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => onSelectTab && onSelectTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-comfortaa font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#00e5ff] text-slate-950 shadow-[0_0_14px_rgba(0,229,255,0.35)] scale-[1.02]'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.05]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{lang === 'ru' ? tab.labelRu : tab.labelEn}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Right: Language Switcher & Theme Switcher */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Mobile "Star Chart" icon if on small screens */}
          {!isStarChart && onGoToStarChart && (
            <button
              onClick={onGoToStarChart}
              className="md:hidden p-2 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-[#00e5ff]"
              title={lang === 'ru' ? 'Звездная карта' : 'Star Chart'}
            >
              <Compass className="w-4 h-4" />
            </button>
          )}

          {/* Language Toggle */}
          <button
            onClick={onToggleLang}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all duration-150 active:scale-95 cursor-pointer shadow-sm ${
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

          {/* Theme Toggle */}
          <ThemeToggle lang={lang} />
        </div>

      </div>
    </header>
  );
};
