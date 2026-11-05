import React, { useState, useEffect } from 'react';
import { X, User, Lock, ArrowRight, ShieldCheck, UserPlus, LogIn } from 'lucide-react';

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
  const [tab, setTab] = useState<'login' | 'register'>('register');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setUsername('');
      setPassword('');
      setConfirmPassword('');
    }
  }, [isOpen, tab]);

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

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
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

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || (lang === 'ru' ? 'Ошибка авторизации' : 'Auth failed'));
      }

      onSuccess(data.user);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none font-sans cursor-pointer"
      onClick={handleBackdropClick}
      onMouseDown={handleBackdropClick}
    >
      <div
        className="relative w-full max-w-md bg-white dark:bg-[#0c121d] border border-slate-200 dark:border-white/[0.12] rounded-3xl p-6 sm:p-8 shadow-[0_30px_90px_rgba(0,0,0,0.4),0_0_50px_rgba(0,229,255,0.15)] select-none font-sans cursor-default"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:text-[#71717a] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Brand Icon */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00e5ff]/20 to-[#10b981]/20 border border-[#00e5ff]/40 flex items-center justify-center text-[#00e5ff] shadow-[0_0_20px_rgba(0,229,255,0.3)] mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="font-comfortaa font-bold text-xl text-slate-900 dark:text-white">
            {tab === 'register'
              ? (lang === 'ru' ? 'Регистрация Профиля' : 'Create Tenno Profile')
              : (lang === 'ru' ? 'Вход в Профиль' : 'Sign In to Profile')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-[#a3a29d] mt-1">
            {lang === 'ru'
              ? 'Хранение личных торговых целей, заметок и настроек'
              : 'Save personal trade targets, notes and custom settings'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-2xl bg-slate-100 dark:bg-[#060a12] p-1 border border-slate-200 dark:border-white/[0.08] mb-6">
          <button
            type="button"
            onClick={() => setTab('register')}
            className={`flex-1 py-2 rounded-xl text-xs font-comfortaa font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              tab === 'register'
                ? 'bg-[#00e5ff] text-[#070a0e] shadow-[0_0_12px_rgba(0,229,255,0.35)]'
                : 'text-slate-600 dark:text-[#a3a29d] hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{lang === 'ru' ? 'Регистрация' : 'Register'}</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('login')}
            className={`flex-1 py-2 rounded-xl text-xs font-comfortaa font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              tab === 'login'
                ? 'bg-[#00e5ff] text-[#070a0e] shadow-[0_0_12px_rgba(0,229,255,0.35)]'
                : 'text-slate-600 dark:text-[#a3a29d] hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>{lang === 'ru' ? 'Вход' : 'Log In'}</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-50 dark:bg-[#f43f5e]/15 border border-rose-200 dark:border-[#f43f5e]/40 text-xs text-rose-600 dark:text-[#fda4af] font-sans">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-comfortaa font-bold text-slate-600 dark:text-[#a3a29d] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#00e5ff]" />
              <span>{lang === 'ru' ? 'Имя пользователя:' : 'Username:'}</span>
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={lang === 'ru' ? 'Введите логин...' : 'Enter username...'}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#060a12] border border-slate-200 dark:border-white/[0.1] focus:border-[#00e5ff] rounded-2xl text-sm font-sans text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#71717a] outline-none transition-all shadow-inner focus:ring-1 focus:ring-[#00e5ff]/30"
            />
          </div>

          <div>
            <label className="block text-xs font-comfortaa font-bold text-slate-600 dark:text-[#a3a29d] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#00e5ff]" />
              <span>{lang === 'ru' ? 'Пароль:' : 'Password:'}</span>
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#060a12] border border-slate-200 dark:border-white/[0.1] focus:border-[#00e5ff] rounded-2xl text-sm font-sans text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#71717a] outline-none transition-all shadow-inner focus:ring-1 focus:ring-[#00e5ff]/30"
            />
          </div>

          {tab === 'register' && (
            <div>
              <label className="block text-xs font-comfortaa font-bold text-slate-600 dark:text-[#a3a29d] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-[#10b981]" />
                <span>{lang === 'ru' ? 'Подтвердите пароль:' : 'Confirm Password:'}</span>
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#060a12] border border-slate-200 dark:border-white/[0.1] focus:border-[#00e5ff] rounded-2xl text-sm font-sans text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#71717a] outline-none transition-all shadow-inner focus:ring-1 focus:ring-[#00e5ff]/30"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 rounded-2xl bg-gradient-to-r from-[#00e5ff] to-[#00b4d8] text-[#070a0e] text-xs font-comfortaa font-bold shadow-[0_0_20px_rgba(0,229,255,0.4)] hover:shadow-[0_0_28px_rgba(0,229,255,0.6)] hover:scale-[1.01] active:scale-95 disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>
              {isLoading
                ? (lang === 'ru' ? 'Проверка...' : 'Processing...')
                : tab === 'register'
                  ? (lang === 'ru' ? 'Создать аккаунт' : 'Create Account')
                  : (lang === 'ru' ? 'Войти в профиль' : 'Log In')}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
