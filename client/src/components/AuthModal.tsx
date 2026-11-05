import React, { useState } from 'react';
import { Shield, KeyRound, Lock, AlertCircle, X, CheckCircle2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  onLogin: (passcode: string) => boolean;
  onLogout: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  isAuthenticated,
  onLogin,
  onLogout,
}) => {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = onLogin(passcode);
    if (success) {
      setError(false);
      setPasscode('');
      onClose();
    } else {
      setError(true);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-[#111622] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border border-white/10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#0b0f17] border border-white/10 flex items-center justify-center mb-4 text-emerald-400 shadow-lg">
            {isAuthenticated ? <Shield className="w-7 h-7 text-emerald-400" /> : <Lock className="w-7 h-7" />}
          </div>

          <h3 className="font-comfortaa text-xl font-bold text-white">
            {isAuthenticated ? 'Доступ Разрешен' : 'Закрытый Портал'}
          </h3>
          <p className="text-xs font-roboto text-slate-400 mt-1 max-w-xs leading-relaxed">
            {isAuthenticated
              ? 'Сессия активна. Доступны все закрытые функции сайта.'
              : 'Введите секретный пароль администратора для авторизации.'}
          </p>
        </div>

        {isAuthenticated ? (
          <div className="mt-6 space-y-4">
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs font-roboto text-emerald-300 flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Вы успешно авторизованы как Администратор.</span>
            </div>

            <button
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="w-full py-2.5 rounded-xl font-roboto text-sm font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
            >
              Выйти из профиля
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-roboto font-medium text-slate-400 mb-1.5">
                Пароль администратора
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    setError(false);
                  }}
                  placeholder="Введите пароль..."
                  autoFocus
                  className="w-full bg-[#0b0f17] border border-white/10 focus:border-emerald-500 text-white rounded-xl px-4 py-2.5 text-sm font-roboto outline-none transition-colors"
                />
                <KeyRound className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs font-roboto text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>Неверный ключ доступа. Попробуйте снова.</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl font-roboto text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-colors"
            >
              Войти
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
