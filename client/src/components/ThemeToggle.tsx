import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
  lang?: 'ru' | 'en';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', lang = 'ru' }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`relative flex items-center justify-center p-2 rounded-2xl border transition-all duration-200 cursor-pointer ${
        theme === 'dark'
          ? 'bg-[#0c1018] border-white/[0.08] text-[#00e5ff] hover:bg-[#121824] hover:border-[#00e5ff]/50'
          : 'bg-white border-slate-200 text-amber-500 hover:bg-slate-100 shadow-sm'
      } active:scale-95 ${className}`}
      title={lang === 'ru' ? (theme === 'dark' ? 'Включить светлую тему' : 'Включить темную тему') : (theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme')}
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 transition-transform duration-300 hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 transition-transform duration-300 hover:-rotate-12" />
      )}
    </button>
  );
};