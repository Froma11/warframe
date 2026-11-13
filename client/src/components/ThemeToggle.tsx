import React from 'react';
import { useTheme } from '../context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  lang?: 'ru' | 'en';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', lang = 'ru' }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div
      onClick={toggleTheme}
      className={`relative flex items-center p-0.5 rounded-full bg-zinc-100 dark:bg-[#14161A] border border-zinc-200 dark:border-white/[0.07] shadow-inner select-none cursor-pointer transition-colors ${className}`}
      title={lang === 'ru' ? (theme === 'dark' ? 'Сменить на светлую тему' : 'Сменить на тёмную тему') : (theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode')}
    >
      {/* Animated Sliding Thumb */}
      <div
        className={`absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] rounded-full transition-all duration-200 ease-out pointer-events-none ${
          theme === 'dark'
            ? 'left-0.5 translate-x-0 bg-[#262930] border border-teal-400/45 shadow-[0_0_10px_rgba(45,212,191,0.2)]'
            : 'left-0.5 translate-x-full bg-gradient-to-r from-amber-400 to-orange-400 shadow-[0_0_12px_rgba(251,191,36,0.4)]'
        }`}
      />

      <span
        className={`relative z-10 px-2.5 py-1 text-[11px] font-comfortaa font-bold transition-colors ${
          theme === 'dark' ? 'text-[#5EEAD4]' : 'text-zinc-400 hover:text-zinc-600'
        }`}
      >
        {lang === 'ru' ? 'ТЁМ' : 'DARK'}
      </span>
      <span
        className={`relative z-10 px-2.5 py-1 text-[11px] font-comfortaa font-bold transition-colors ${
          theme === 'light' ? 'text-zinc-950' : 'text-zinc-500 hover:text-zinc-300'
        }`}
      >
        {lang === 'ru' ? 'СВЕТ' : 'LIGHT'}
      </span>
    </div>
  );
};
