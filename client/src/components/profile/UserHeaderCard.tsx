import React from 'react';
import { User, LogOut, ShieldCheck, Calendar, LogIn, FileText, Database } from 'lucide-react';
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
    <section
      aria-label={lang === 'ru' ? 'Профиль пользователя' : 'User Profile'}
      className="grid grid-cols-2 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_minmax(0,0.75fr)_minmax(0,0.9fr)] gap-3 font-sans"
    >
      {/* 1. Primary Identity Bento Cell */}
      <div className="col-span-2 lg:col-span-1 relative overflow-hidden rounded-3xl bg-white dark:bg-[#090D16] border border-slate-200/90 dark:border-white/[0.08] p-5 shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_16px_40px_rgba(0,0,0,0.45)] transition-colors">
        {/* Subtle 6% cyan radial glow near avatar */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_12%_25%,rgba(6,182,212,0.08),transparent_55%)]"
        />
        {/* Subtle micro-dot tactical matrix */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-100"
          style={{
            backgroundImage: 'radial-gradient(rgba(148, 163, 184, 0.12) 1px, transparent 1px)',
            backgroundSize: '18px 18px',
          }}
        />

        <div className="relative z-10 flex items-center gap-4">
          {/* Multi-layered Avatar Frame */}
          <div className="relative shrink-0 p-1 rounded-2xl bg-gradient-to-b from-cyan-400/30 via-teal-500/10 to-transparent border border-cyan-500/30 dark:border-cyan-400/25 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16)]">
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-slate-100 dark:bg-[#0B101B] border border-slate-200 dark:border-white/[0.08] flex items-center justify-center overflow-hidden shadow-inner">
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(34,211,238,0.18),transparent_65%)]"
              />
              <User className="w-6 h-6 text-cyan-600 dark:text-cyan-400 relative z-10" />
            </div>
            {/* Live Connection Dot */}
            <span
              aria-hidden="true"
              className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-[#090D16] ${
                !isAnonymous
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]'
                  : 'bg-slate-400 dark:bg-slate-500'
              }`}
            />
          </div>

          {/* Identity Details */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-lg sm:text-xl font-comfortaa font-bold text-slate-900 dark:text-white tracking-wide truncate">
                {username}
              </h1>
              {!isAnonymous ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 text-[11px] font-mono font-semibold shrink-0">
                  <ShieldCheck className="w-3 h-3" />
                  <span>{lang === 'ru' ? 'Авторизован' : 'Authenticated'}</span>
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/[0.08] text-[11px] font-mono font-medium shrink-0">
                  {lang === 'ru' ? 'Гостевой режим' : 'Guest Mode'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Calendar className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400/80 shrink-0" />
              <span className="truncate">
                {user?.createdAt
                  ? lang === 'ru'
                    ? `Профиль с ${joinedText}`
                    : `Joined ${joinedText}`
                  : joinedText}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Sync Status Bento Cell */}
      <div className="col-span-1 relative overflow-hidden rounded-3xl bg-white dark:bg-[#0B101B] border border-slate-200/90 dark:border-white/[0.08] p-4 sm:p-5 flex flex-col justify-between shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_12px_28px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between gap-2 text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <span className="truncate">{lang === 'ru' ? 'Синхронизация' : 'Sync'}</span>
          <Database className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400/70 shrink-0" />
        </div>

        <div className="mt-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                !isAnonymous
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.65)]'
                  : 'bg-slate-400 dark:bg-slate-500'
              }`}
            />
            <span
              className={`text-sm font-comfortaa font-bold truncate ${
                !isAnonymous
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-slate-700 dark:text-slate-200'
              }`}
            >
              {!isAnonymous
                ? lang === 'ru'
                  ? 'Синхронизировано'
                  : 'Synchronized'
                : lang === 'ru'
                ? 'Локально'
                : 'Local Only'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
            {!isAnonymous
              ? lang === 'ru'
                ? 'Облачное хранилище'
                : 'Cloud storage active'
              : lang === 'ru'
              ? 'Требуется вход'
              : 'Sign in to sync'}
          </p>
        </div>
      </div>

      {/* 3. Notes Counter Bento Cell */}
      <div className="col-span-1 relative overflow-hidden rounded-3xl bg-white dark:bg-[#0B101B] border border-slate-200/90 dark:border-white/[0.08] p-4 sm:p-5 flex flex-col justify-between shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_12px_28px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between gap-2 text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <span className="truncate">{lang === 'ru' ? 'Заметки' : 'Notes'}</span>
          <FileText className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400/70 shrink-0" />
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-mono font-bold tabular-nums text-slate-900 dark:text-white leading-none">
            {notesCount}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {lang === 'ru' ? 'записей' : 'entries'}
          </span>
        </div>
      </div>

      {/* 4. Account Control Bento Cell */}
      <div className="col-span-2 lg:col-span-1 relative overflow-hidden rounded-3xl bg-white dark:bg-[#0B101B] border border-slate-200/90 dark:border-white/[0.08] p-4 sm:p-5 flex flex-col justify-between shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_12px_28px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between gap-2 text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <span>{lang === 'ru' ? 'Аккаунт' : 'Account'}</span>
        </div>

        <div className="mt-3">
          {isAnonymous ? (
            <button
              type="button"
              onClick={onOpenAuth}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-comfortaa font-bold shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4),0_4px_14px_rgba(6,182,212,0.3)] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5),0_6px_20px_rgba(6,182,212,0.45)] active:scale-[0.98] transition-all duration-150 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{lang === 'ru' ? 'Войти / Регистрация' : 'Sign In / Register'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-rose-50 dark:bg-white/[0.04] dark:hover:bg-rose-500/10 border border-slate-200 hover:border-rose-300 dark:border-white/[0.08] dark:hover:border-rose-500/35 text-xs font-comfortaa font-bold text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] active:scale-[0.98] transition-all duration-150 cursor-pointer"
              title={lang === 'ru' ? 'Выйти из аккаунта' : 'Sign Out'}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{lang === 'ru' ? 'Выход' : 'Logout'}</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
