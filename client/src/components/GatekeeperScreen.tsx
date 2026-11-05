import React, { useState } from 'react';
import { KeyRound, ShieldAlert, ArrowRight } from 'lucide-react';

interface GatekeeperScreenProps {
  onSuccess: () => void;
  lang: 'ru' | 'en';
}

export const GatekeeperScreen: React.FC<GatekeeperScreenProps> = ({ onSuccess, lang }) => {
  const [key, setKey] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;

    setLoading(true);
    setError(false);

    try {
      const res = await fetch('/api/auth/verify-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: key.trim() }),
      });

      if (res.ok) {
        localStorage.setItem('tenno_gate_auth', 'true');
        onSuccess();
      } else {
        setError(true);
      }
    } catch {
      // Local fallback for dev/offline testing with default key
      if (key.trim() === 'tenno2026') {
        localStorage.setItem('tenno_gate_auth', 'true');
        onSuccess();
      } else {
        setError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-base text-ink-1 flex flex-col items-center justify-center p-4 font-raleway select-none">
      {/* Outer Minimal Box */}
      <div className="w-full max-w-sm bg-surface-1 border border-line p-8 rounded-lg shadow-2xl relative">
        {/* Subtle Accent Line on Top */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-accent to-transparent opacity-60" />

        <div className="flex flex-col items-center text-center">
          <div className="w-10 h-10 rounded-full border border-line bg-surface-2 flex items-center justify-center text-accent mb-4">
            <KeyRound className="w-4 h-4" />
          </div>

          <h1 className="text-sm font-medium tracking-widest uppercase font-mono text-ink-1">
            {lang === 'ru' ? 'ЗАКРЫТЫЙ ТЕРМИНАЛ' : 'RESTRICTED TERMINAL'}
          </h1>
          <p className="text-2xs font-mono text-ink-3 mt-1.5 leading-relaxed">
            {lang === 'ru'
              ? 'Доступ строго по ключу. Введите ключ авторизации.'
              : 'Authorized personnel only. Enter access cipher.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4 font-mono text-xs">
          <div>
            <div className="relative">
              <input
                type="password"
                value={key}
                onChange={(e) => {
                  setKey(e.target.value);
                  setError(false);
                }}
                placeholder={lang === 'ru' ? 'Ключ доступа...' : 'Enter access key...'}
                autoFocus
                disabled={loading}
                className="w-full bg-surface-2 border border-line focus:border-accent text-ink-1 rounded px-3 py-2 text-xs outline-none transition-colors"
              />
            </div>

            {error && (
              <div className="mt-2 text-2xs text-loss flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <span>{lang === 'ru' ? 'Неверный ключ доступа' : 'Invalid access key'}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-3 rounded bg-surface-3 hover:bg-surface-2 border border-line hover:border-accent text-ink-1 hover:text-accent font-medium transition-all flex items-center justify-center gap-2"
          >
            <span>{loading ? '...' : (lang === 'ru' ? 'ПОДТВЕРДИТЬ' : 'AUTHENTICATE')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-line text-center">
          <span className="text-[10px] font-mono text-ink-3">
            WARFRAME MARKET INTELLIGENCE // PRIVATE
          </span>
        </div>
      </div>
    </div>
  );
};
