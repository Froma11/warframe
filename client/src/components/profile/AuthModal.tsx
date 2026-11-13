import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Lock, ArrowRight, ShieldCheck, UserPlus, LogIn, AlertCircle } from 'lucide-react';

export interface UserProfile {
  id: number;
  username: string;
  theme?: string;
  createdAt?: string;
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
  lang: 'ru' | 'en';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  lang,
}) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const mouseDownOnBackdrop = useRef(false);
  const usernameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTab('login');
      setError(null);
      setUsername('');
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        usernameInputRef.current?.focus();
      }, 60);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setConfirmPassword('');
    }
  }, [tab, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.code === 'Escape' || e.keyCode === 27) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropMouseDown = (e: React.MouseEvent) => {
    mouseDownOnBackdrop.current = e.target === e.currentTarget;
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && mouseDownOnBackdrop.current) {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
    mouseDownOnBackdrop.current = false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setError(lang === 'ru' ? 'Введите имя пользователя' : 'Username is required');
      return;
    }

    if (cleanUsername.length < 3) {
      setError(lang === 'ru' ? 'Имя должно быть от 3 символов' : 'Username must be at least 3 chars');
      return;
    }

    if (password.length < 4) {
      setError(lang === 'ru' ? 'Пароль должен быть от 4 символов' : 'Password must be at least 4 chars');
      return;
    }

    if (tab === 'register' && password !== confirmPassword) {
      setError(lang === 'ru' ? 'Пароли не совпадают' : 'Passwords do not match');
      return;
    }

    setIsLoading(true);
    const endpoint = tab === 'register' ? '/api/auth/register' : '/api/auth/login';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: cleanUsername, password }),
      });

      const rawText = await res.text();
      let data: any = null;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        data = null;
      }

      if (!res.ok || !data?.success || !data?.user) {
        throw new Error(
          data?.error ||
            (lang === 'ru'
              ? `Ошибка авторизации (HTTP ${res.status})`
              : `Authentication failed (HTTP ${res.status})`)
        );
      }

      onSuccess(data.user);
      onClose();
    } catch (err: any) {
      setError(err?.message || (lang === 'ru' ? 'Ошибка сети' : 'Network error'));
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200 select-none font-sans cursor-pointer overflow-y-auto"
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
    >
      <div
        className="relative w-full max-w-md bg-white dark:bg-[#090D16] border border-slate-200 dark:border-white/[0.09] rounded-3xl p-6 sm:p-7 shadow-2xl dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_28px_70px_rgba(0,0,0,0.85)] select-none font-sans cursor-default overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Subtle Ambient Corner Gradient */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,rgba(6,182,212,0.08),transparent_55%)]"
        />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label={lang === 'ru' ? 'Закрыть' : 'Close'}
          className="relative z-10 ml-auto flex p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.07] border border-transparent hover:border-slate-200 dark:hover:border-white/[0.08] active:scale-95 transition-all cursor-pointer -mb-6"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Brand Icon & Title */}
        <div className="relative z-10 flex flex-col items-center text-center mb-5">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 dark:border-cyan-400/25 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="font-comfortaa font-bold text-lg sm:text-xl text-slate-900 dark:text-white">
            {tab === 'register'
              ? lang === 'ru'
                ? 'Регистрация Профиля'
                : 'Create Tenno Profile'
              : lang === 'ru'
              ? 'Вход в Профиль'
              : 'Sign In to Profile'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {lang === 'ru'
              ? 'Хранение личных торговых заметок и настроек'
              : 'Save personal trade notes and custom settings'}
          </p>
        </div>

        {/* Recessed Segmented Tab Switcher */}
        <div className="relative z-10 flex rounded-2xl bg-slate-200/75 dark:bg-[#070B13] p-1 border border-slate-300/80 dark:border-white/[0.08] shadow-[inset_0_2px_4px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)] mb-5">
          <button
            type="button"
            onClick={() => setTab('login')}
            className={`flex-1 py-2 rounded-xl text-xs font-comfortaa font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-[0.98] ${
              tab === 'login'
                ? 'bg-white dark:bg-[#101829] text-slate-900 dark:text-white border border-slate-200/90 dark:border-cyan-400/30 shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-transparent'
            }`}
          >
            <LogIn className={`w-3.5 h-3.5 ${tab === 'login' ? 'text-cyan-600 dark:text-cyan-400' : ''}`} />
            <span>{lang === 'ru' ? 'Вход' : 'Log In'}</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('register')}
            className={`flex-1 py-2 rounded-xl text-xs font-comfortaa font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-[0.98] ${
              tab === 'register'
                ? 'bg-white dark:bg-[#101829] text-slate-900 dark:text-white border border-slate-200/90 dark:border-cyan-400/30 shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-transparent'
            }`}
          >
            <UserPlus className={`w-3.5 h-3.5 ${tab === 'register' ? 'text-cyan-600 dark:text-cyan-400' : ''}`} />
            <span>{lang === 'ru' ? 'Регистрация' : 'Register'}</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="relative z-10 flex items-center gap-2 p-3 mb-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/35 text-xs text-rose-600 dark:text-rose-300 font-sans">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="relative z-10 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-comfortaa font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>{lang === 'ru' ? 'Имя пользователя' : 'Username'}</span>
            </label>
            <input
              ref={usernameInputRef}
              type="text"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={lang === 'ru' ? 'Введите логин...' : 'Enter username...'}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#060911] border border-slate-200 dark:border-white/[0.08] focus:border-cyan-500/60 dark:focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-500/15 dark:focus:ring-cyan-400/15 rounded-xl text-sm font-sans text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.5)]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-comfortaa font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>{lang === 'ru' ? 'Пароль' : 'Password'}</span>
            </label>
            <input
              type="password"
              name="password"
              autoComplete={tab === 'register' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#060911] border border-slate-200 dark:border-white/[0.08] focus:border-cyan-500/60 dark:focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-500/15 dark:focus:ring-cyan-400/15 rounded-xl text-sm font-sans text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.5)]"
            />
          </div>

          {tab === 'register' && (
            <div className="space-y-1.5">
              <label className="text-xs font-comfortaa font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{lang === 'ru' ? 'Подтвердите пароль' : 'Confirm Password'}</span>
              </label>
              <input
                type="password"
                name="confirmPassword"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#060911] border border-slate-200 dark:border-white/[0.08] focus:border-cyan-500/60 dark:focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-500/15 dark:focus:ring-cyan-400/15 rounded-xl text-sm font-sans text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.5)]"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 border border-cyan-400/40 text-xs font-comfortaa font-bold shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4),0_4px_14px_rgba(6,182,212,0.25)] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5),0_6px_18px_rgba(6,182,212,0.4)] active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <span>
              {isLoading
                ? lang === 'ru'
                  ? 'Проверка...'
                  : 'Processing...'
                : tab === 'register'
                ? lang === 'ru'
                  ? 'Создать аккаунт'
                  : 'Create Account'
                : lang === 'ru'
                ? 'Войти в профиль'
                : 'Log In'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
};
