import React from 'react';
import { User, LogOut, ShieldCheck, Calendar, LogIn, Sparkles } from 'lucide-react';
import { UserProfile } from './AuthModal';

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
    : lang === 'ru'
    ? 'Локальная сессия'
    : 'Local Session';

  return (
    <div className="relative w-full overflow-hidden bg-slate-50 dark:bg-[#070b14]/95 border border-slate-200/90 dark:border-white/[0.09] rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-2xl font-sans transition-all">
      {/* Subtle Ambient Tenno Light Rays */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-cyan-500/10 via-transparent to-transparent pointer-events-none rounded-full blur-3xl -mr-20 -mt-20" />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        {/* Left: User Avatar & Information */}
        <div className="flex items-center gap-4 sm:gap-5">
          {/* Holographic Tenno Avatar Ring */}
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-sky-500/10 to-teal-500/20 border border-cyan-400/40 flex items-center justify-center text-white shadow-[0_0_24px_rgba(0,229,255,0.25)] shrink-0 overflow-hidden">
            <User className="w-7 h-7 text-cyan-400" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.3)_0%,transparent_60%)] pointer-events-none" />
          </div>

          <div>
            <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-comfortaa font-bold text-slate-900 dark:text-white tracking-wide">
                {username}
              </h1>
              {!isAnonymous ? (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{lang === 'ru' ? 'Авторизован' : 'Authenticated'}</span>
                </span>
              ) : (
                <span className="text-[11px] font-comfortaa font-bold px-2.5 py-0.5 rounded-full bg-slate-200/80 dark:bg-white/[0.08] text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-white/[0.1]">
                  {lang === 'ru' ? 'Гостевой режим' : 'Guest Mode'}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5 font-sans">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                <span>{lang === 'ru' ? `Профиль с ${joinedText}` : `Joined ${joinedText}`}</span>
              </span>
              <span className="text-slate-300 dark:text-white/20">•</span>
              <span className="flex items-center gap-1.5 font-sans text-emerald-600 dark:text-emerald-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{lang === 'ru' ? 'Синхронизировано' : 'Synchronized'}</span>
              </span>
              <span className="text-slate-300 dark:text-white/20">•</span>
              <span className="font-sans text-slate-700 dark:text-white font-medium">
                <strong className="text-cyan-400 font-mono font-bold">{notesCount}</strong>{' '}
                {lang === 'ru' ? 'заметок' : 'notes'}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          {isAnonymous ? (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-500 text-slate-950 text-xs font-comfortaa font-bold shadow-[0_0_20px_rgba(0,229,255,0.35)] hover:shadow-[0_0_28px_rgba(0,229,255,0.55)] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>{lang === 'ru' ? 'Войти / Регистрация' : 'Sign In / Register'}</span>
            </button>
          ) : (
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-100 hover:bg-rose-50 dark:bg-white/[0.04] dark:hover:bg-rose-500/15 border border-slate-200 hover:border-rose-300 dark:border-white/[0.08] dark:hover:border-rose-500/40 text-xs font-comfortaa font-bold text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-300 transition-all cursor-pointer active:scale-95"
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
