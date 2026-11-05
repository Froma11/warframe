import React from 'react';
import { User, LogOut, ShieldCheck, Database, Calendar, Palette, LogIn } from 'lucide-react';
import { UserProfile } from './AuthModal';
import { ThemeToggle } from '../ThemeToggle';

interface UserHeaderCardProps {
  user: UserProfile | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  notesCount: number;
  lang: 'ru' | 'en';
}

export const UserHeaderCard: React.FC<UserHeaderCardProps> = ({
  user,
  onOpenAuth,
  onLogout,
  notesCount,
  lang,
}) => {
  const isAnonymous = !user;
  const username = user?.username || (lang === 'ru' ? 'Оператор (Гость)' : 'Operator (Guest)');
  const joinedText = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', {
        month: 'short',
        year: 'numeric',
      })
    : (lang === 'ru' ? 'Локальная сессия' : 'Local Session');

  return (
    <div className="w-full bg-white dark:bg-[#0b1019]/90 border border-slate-200 dark:border-white/[0.1] rounded-3xl p-5 sm:p-7 shadow-2xl backdrop-blur-md font-sans transition-colors">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        
        {/* Left: User Avatar & Information */}
        <div className="flex items-center gap-4 sm:gap-5">
          {/* Holographic Tenno Avatar Ring */}
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-gradient-to-br from-[#00e5ff]/20 via-[#0077ff]/10 to-[#10b981]/20 border-2 border-[#00e5ff]/50 flex items-center justify-center text-white shadow-[0_0_20px_rgba(0,229,255,0.25)] shrink-0 overflow-hidden">
            <User className="w-7 h-7 text-[#00e5ff]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.3)_0%,transparent_60%)] pointer-events-none" />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-lg sm:text-xl font-comfortaa font-bold text-slate-900 dark:text-white tracking-wide">
                {username}
              </h1>
              {!isAnonymous ? (
                <span className="p-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-[#34d399] border border-emerald-500/30" title="Авторизован в SQLite">
                  <ShieldCheck className="w-4 h-4" />
                </span>
              ) : (
                <span className="text-[10px] font-comfortaa font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.08] text-slate-500 dark:text-[#a3a29d] border border-slate-200 dark:border-white/[0.1]">
                  {lang === 'ru' ? 'Гость' : 'Guest'}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-[#a3a29d]">
              <span className="flex items-center gap-1.5 font-sans">
                <Calendar className="w-3.5 h-3.5 text-[#00e5ff]" />
                {lang === 'ru' ? `Профиль с ${joinedText}` : `Member since ${joinedText}`}
              </span>
              <span className="text-slate-300 dark:text-white/20">•</span>
              <span className="flex items-center gap-1.5 font-sans text-emerald-600 dark:text-[#34d399]">
                <Database className="w-3.5 h-3.5" />
                SQLite WAL
              </span>
              <span className="text-slate-300 dark:text-white/20">•</span>
              <span className="font-sans text-slate-700 dark:text-white font-medium">
                {notesCount} {lang === 'ru' ? 'сохраненных целей' : 'saved targets'}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end flex-wrap">
          {/* Theme Switcher Button */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-100 dark:bg-[#060a12] border border-slate-200 dark:border-white/[0.08]">
            <Palette className="w-3.5 h-3.5 text-slate-500 dark:text-[#a3a29d]" />
            <span className="text-xs text-slate-600 dark:text-[#a3a29d] font-comfortaa font-bold hidden sm:inline">
              {lang === 'ru' ? 'Тема:' : 'Theme:'}
            </span>
            <ThemeToggle lang={lang} />
          </div>

          {/* Login / Switch Account or Logout */}
          {isAnonymous ? (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-[#00e5ff] to-[#00b4d8] text-[#070a0e] text-xs font-comfortaa font-bold shadow-[0_0_15px_rgba(0,229,255,0.35)] hover:shadow-[0_0_25px_rgba(0,229,255,0.55)] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>{lang === 'ru' ? 'Войти / Регистрация' : 'Sign In / Register'}</span>
            </button>
          ) : (
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-100 hover:bg-rose-50 dark:bg-[#060a12] dark:hover:bg-[#f43f5e]/15 border border-slate-200 hover:border-rose-300 dark:border-white/[0.08] dark:hover:border-[#f43f5e]/40 text-xs font-comfortaa font-bold text-slate-600 hover:text-rose-600 dark:text-[#a3a29d] dark:hover:text-[#fda4af] transition-all cursor-pointer"
              title={lang === 'ru' ? 'Выйти из аккаунта' : 'Sign Out'}
            >
              <LogOut className="w-4 h-4" />
              <span>{lang === 'ru' ? 'Выход' : 'Logout'}</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
