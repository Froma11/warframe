import React from 'react';
import { PlatinumIcon } from './PlatinumIcon';
import { Radio, Globe } from 'lucide-react';

interface HeaderProps {
  lang: 'ru' | 'en';
  onToggleLang: () => void;
  itemsCount: number;
  lastUpdatedText: string;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  onToggleLang,
  itemsCount,
  lastUpdatedText,
}) => {
  return (
    <header className="w-full bg-[#070a0e]/95 border-b border-white/[0.08] backdrop-blur-md px-6 py-3 sticky top-0 z-40 select-none">
      <div className="max-w-[1920px] mx-auto flex items-center justify-between">
        
        {/* Left: Sync Status */}
        <div className="flex items-center gap-2.5 font-mono text-sm text-[#a3a29d]">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#10b981]" />
          </span>
          <span className="text-xs uppercase text-[#10b981] tracking-wider font-medium">
            {lastUpdatedText}
          </span>
        </div>

        {/* Right: Items Count & Language Switcher */}
        <div className="flex items-center gap-4">
          
          {/* Items count badge */}
          <div className="flex items-center gap-2 font-mono text-xs text-[#e9e8e4] bg-[#141518] px-3 py-1.5 rounded-lg border border-white/[0.08]">
            <PlatinumIcon size={14} className="text-[#00e5ff]" />
            <span className="text-sm text-white font-semibold">{itemsCount}</span>
            <span className="text-xs text-[#a3a29d] uppercase">
              {lang === 'ru' ? 'МИСТИКОВ' : 'ARCANES'}
            </span>
          </div>

          {/* Language Toggle: strictly RU / EN */}
          <button
            onClick={onToggleLang}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-[#141518] hover:border-[#00e5ff]/50 hover:bg-[#1a2332] text-xs font-mono text-white transition-all"
            title="Switch Language"
          >
            <Globe className="w-3.5 h-3.5 text-[#00e5ff]" />
            <span className="text-xs font-medium uppercase text-[#00e5ff]">
              {lang.toUpperCase()}
            </span>
          </button>

        </div>

      </div>
    </header>
  );
};
