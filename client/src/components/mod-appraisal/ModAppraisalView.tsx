import React from 'react';
import { Sparkles, Compass } from 'lucide-react';

interface ModAppraisalViewProps {
  lang: 'ru' | 'en';
}

export const ModAppraisalView: React.FC<ModAppraisalViewProps> = ({ lang }) => {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-12 flex flex-col items-center justify-center min-h-[calc(100vh-140px)] select-none">
      {/* Ambient Mars / Orokin holographic container */}
      <div className="relative group max-w-lg w-full rounded-3xl p-8 sm:p-12 text-center bg-white/70 dark:bg-[#070b12]/80 backdrop-blur-2xl border border-orange-500/30 dark:border-orange-500/20 shadow-[0_0_40px_rgba(249,115,22,0.15)] flex flex-col items-center overflow-hidden">
        
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-orange-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-[#ff7b00]/15 blur-3xl pointer-events-none" />

        {/* Central Badge Icon */}
        <div className="w-16 h-16 rounded-2xl bg-orange-500/10 dark:bg-orange-500/20 border border-orange-500/40 flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.3)] mb-6">
          <Sparkles className="w-8 h-8 text-orange-500 animate-pulse" />
        </div>

        {/* Title */}
        <h1 className="font-comfortaa font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white tracking-wide mb-3 flex items-center gap-2">
          <span>{lang === 'ru' ? 'Оценка модов' : 'Mod Appraisal'}</span>
        </h1>

        {/* Sector status */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 mb-6">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
          <span className="font-comfortaa text-xs font-semibold text-orange-500 dark:text-orange-400 uppercase tracking-widest">
            {lang === 'ru' ? 'Сектор Марса • В разработке' : 'Mars Sector • Under Construction'}
          </span>
        </div>

        {/* Description */}
        <p className="font-onest text-sm text-slate-600 dark:text-slate-400 max-w-sm leading-relaxed mb-6">
          {lang === 'ru'
            ? 'Терминал оценки и глубокого анализа стоимости модов и модов разлома готовится к запуску.'
            : 'Mod and Riven valuation analytics terminal is currently being configured.'}
        </p>

        {/* Decorative Tenno line */}
        <div className="w-32 h-[1px] bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />
      </div>
    </div>
  );
};
