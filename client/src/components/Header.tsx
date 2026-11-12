import React from 'react';
import { Compass, ShoppingBag, Flame, Sliders, User } from 'lucide-react';
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
        
        {/* Left: Clean spacer */}
        <div className="shrink-0 w-4" />

        {/* Center: Navigation Controls (Only shown inside workspaces) */}
        {!isStarChart && (
          <div className="hidden md:flex items-center gap-2.5">
            {/* 1. Orrery / Star Chart Gateway Button */}
            {onGoToStarChart && (
              <button
                onClick={onGoToStarChart}
                className="group relative flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-cyan-500/10 via-sky-500/10 to-transparent hover:from-cyan-500/20 hover:to-sky-500/20 border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 hover:text-white text-xs font-comfortaa font-bold transition-all duration-200 cursor-pointer shadow-[0_0_12px_rgba(0,229,255,0.15)] hover:shadow-[0_0_22px_rgba(0,229,255,0.35)] active:scale-95"
                title={lang === 'ru' ? 'Вернуться к Звездной карте' : 'Return to Star Chart'}
              >
                <Compass className="w-3.5 h-3.5 text-[#00e5ff] group-hover:rotate-90 transition-transform duration-500 ease-out" />
                <span>{lang === 'ru' ? 'Звездная карта' : 'Star Chart'}</span>
              </button>
            )}

            {/* Subtle Divider */}
            <div className="w-[1px] h-4 bg-slate-300 dark:bg-white/[0.1] mx-0.5" />

            {/* 2. Frosted Floating Command Dock for Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-100/90 dark:bg-[#070c18]/90 backdrop-blur-2xl border border-slate-200/90 dark:border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => onSelectTab && onSelectTab(tab.id)}
                    className={`group relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-comfortaa font-bold transition-all duration-200 cursor-pointer active:scale-95 ${
                      isActive
                        ? 'bg-gradient-to-r from-cyan-500/25 via-sky-500/20 to-cyan-500/25 border border-cyan-400/60 text-cyan-200 dark:text-white shadow-[0_0_18px_rgba(0,229,255,0.35)] scale-[1.02]'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.06] border border-transparent'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                      isActive ? 'text-cyan-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-cyan-400 group-hover:-translate-y-0.5'
                    }`} />
                    <span>{lang === 'ru' ? tab.labelRu : tab.labelEn}</span>

                    {/* Active Pulsing Indicator Pip */}
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00e5ff]" />
                    )}
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

          {/* Language Animated Segmented Slider */}
          <div className="relative flex items-center p-0.5 rounded-full bg-slate-100 dark:bg-[#070b14] border border-slate-200 dark:border-white/[0.08] shadow-inner select-none">
            {/* Sliding Thumb */}
            <div
              className={`absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] rounded-full bg-gradient-to-r from-cyan-500 to-sky-500 shadow-[0_0_12px_rgba(0,229,255,0.4)] transition-transform duration-200 ease-out pointer-events-none ${
                lang === 'ru' ? 'left-0.5 translate-x-0' : 'left-0.5 translate-x-full'
              }`}
            />
            <button
              type="button"
              onClick={() => lang !== 'ru' && onToggleLang()}
              className={`relative z-10 px-2.5 py-1 text-[11px] font-comfortaa font-bold transition-colors cursor-pointer ${
                lang === 'ru'
                  ? 'text-slate-950'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              RU
            </button>
            <button
              type="button"
              onClick={() => lang !== 'en' && onToggleLang()}
              className={`relative z-10 px-2.5 py-1 text-[11px] font-comfortaa font-bold transition-colors cursor-pointer ${
                lang === 'en'
                  ? 'text-slate-950'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              EN
            </button>
          </div>

          {/* Theme Toggle */}
          <ThemeToggle lang={lang} />
        </div>

      </div>
    </header>
  );
};
