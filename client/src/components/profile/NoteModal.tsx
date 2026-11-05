import React, { useState, useEffect } from 'react';
import { X, Tag, FileText, Check } from 'lucide-react';

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: { title: string; content: string; tag: string }) => Promise<void>;
  lang: 'ru' | 'en';
}

export const NoteModal: React.FC<NoteModalProps> = ({
  isOpen,
  onClose,
  onSave,
  lang,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tag, setTag] = useState<string>('СНАЙПИНГ');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setContent('');
      setTag('СНАЙПИНГ');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const tags = [
    { id: 'СНАЙПИНГ', labelRu: 'Снайпинг', labelEn: 'Sniping', color: 'text-[#00e5ff] border-[#00e5ff]/40 bg-[#00e5ff]/10' },
    { id: 'ТОРГОВЛЯ', labelRu: 'Торговля', labelEn: 'Trading', color: 'text-[#10b981] border-[#10b981]/40 bg-[#10b981]/10' },
    { id: 'ФАРМ', labelRu: 'Фарм', labelEn: 'Farming', color: 'text-[#fbbf24] border-[#fbbf24]/40 bg-[#fbbf24]/10' },
    { id: 'ИНВЕСТ', labelRu: 'Инвест', labelEn: 'Invest', color: 'text-[#c084fc] border-[#c084fc]/40 bg-[#c084fc]/10' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !content.trim()) return;
    setIsSubmitting(true);
    try {
      await onSave({ title: title.trim(), content: content.trim(), tag });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-[#0c121d] border border-white/[0.12] rounded-3xl p-6 sm:p-7 shadow-[0_25px_70px_rgba(0,0,0,0.9),0_0_40px_rgba(0,229,255,0.15)] select-none font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-[#71717a] hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-[#00e5ff]/15 border border-[#00e5ff]/35 flex items-center justify-center text-[#00e5ff]">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-comfortaa font-bold text-lg text-white">
              {lang === 'ru' ? 'Новая торговая цель' : 'New Trading Target'}
            </h3>
            <p className="text-xs text-[#a3a29d]">
              {lang === 'ru' ? 'Сохраните пороги цен, объемы или заметку по сделке' : 'Save target prices, volume or arbitrage note'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category Tag Selection */}
          <div>
            <label className="block text-xs font-comfortaa font-bold text-[#a3a29d] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#00e5ff]" />
              <span>{lang === 'ru' ? 'Категория цели:' : 'Target Category:'}</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {tags.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTag(t.id)}
                  className={`py-2 px-2 rounded-xl text-xs font-comfortaa font-bold border transition-all text-center cursor-pointer ${
                    tag === t.id
                      ? `${t.color} shadow-sm scale-[1.02]`
                      : 'bg-[#070a10] border-white/[0.08] text-[#71717a] hover:text-white'
                  }`}
                >
                  {lang === 'ru' ? t.labelRu : t.labelEn}
                </button>
              ))}
            </div>
          </div>

          {/* Title input */}
          <div>
            <label className="block text-xs font-comfortaa font-bold text-[#a3a29d] uppercase tracking-wider mb-1.5">
              {lang === 'ru' ? 'Заголовок:' : 'Title:'}
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={lang === 'ru' ? 'Напр: Скупка Зарядки по 1300п...' : 'e.g. Buy Energize under 1300p...'}
              className="w-full px-4 py-2.5 bg-[#070a10] border border-white/[0.1] focus:border-[#00e5ff] rounded-2xl text-sm font-sans text-white placeholder-[#71717a] outline-none transition-all shadow-inner focus:ring-1 focus:ring-[#00e5ff]/30"
            />
          </div>

          {/* Content textarea */}
          <div>
            <label className="block text-xs font-comfortaa font-bold text-[#a3a29d] uppercase tracking-wider mb-1.5">
              {lang === 'ru' ? 'Содержание заметки:' : 'Details & Thresholds:'}
            </label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={lang === 'ru' ? 'Пороги покупки/продажи, контакты продавцов, заметки по ценам...' : 'Price thresholds, trader contacts, trade notes...'}
              className="w-full px-4 py-3 bg-[#070a10] border border-white/[0.1] focus:border-[#00e5ff] rounded-2xl text-sm font-sans text-white placeholder-[#71717a] outline-none transition-all shadow-inner focus:ring-1 focus:ring-[#00e5ff]/30 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl bg-[#070a10] hover:bg-white/[0.06] border border-white/[0.08] text-xs font-comfortaa font-bold text-[#a3a29d] hover:text-white transition-all cursor-pointer"
            >
              {lang === 'ru' ? 'Отмена' : 'Cancel'}
            </button>

            <button
              type="submit"
              disabled={isSubmitting || (!title.trim() && !content.trim())}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#00e5ff] to-[#00b4d8] text-[#070a0e] text-xs font-comfortaa font-bold shadow-[0_0_20px_rgba(0,229,255,0.4)] hover:shadow-[0_0_28px_rgba(0,229,255,0.6)] hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? (lang === 'ru' ? 'Сохранение...' : 'Saving...') : (lang === 'ru' ? 'Сохранить цель' : 'Save Target')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
