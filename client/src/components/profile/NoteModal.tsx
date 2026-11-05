import React, { useState, useEffect, useRef } from 'react';
import { X, FileText, Check, CornerDownLeft } from 'lucide-react';
import { NoteItem } from './NotesGrid';

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: { title?: string; content: string; tag?: string }, id?: number) => Promise<void>;
  initialNote?: NoteItem | null;
  lang: 'ru' | 'en';
}

export const NoteModal: React.FC<NoteModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialNote,
  lang,
}) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialNote) {
        setContent(initialNote.content || initialNote.title || '');
      } else {
        setContent('');
      }
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  }, [isOpen, initialNote]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isEditing = !!initialNote;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanText = content.trim();
    if (!cleanText) return;

    setIsSubmitting(true);
    try {
      await onSave({ content: cleanText, title: '', tag: '' }, initialNote?.id);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDownOnTextarea = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none font-sans"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white dark:bg-[#0c121d] border border-slate-200 dark:border-white/[0.12] rounded-3xl p-6 sm:p-7 shadow-[0_25px_70px_rgba(0,0,0,0.4),0_0_40px_rgba(0,229,255,0.15)] text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:text-[#71717a] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-[#00e5ff]/15 border border-[#00e5ff]/35 flex items-center justify-center text-[#00e5ff] shadow-[0_0_12px_rgba(0,229,255,0.2)]">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-comfortaa font-bold text-lg text-slate-900 dark:text-white">
              {isEditing
                ? (lang === 'ru' ? 'Редактировать заметку' : 'Edit Note')
                : (lang === 'ru' ? 'Новая заметка' : 'New Note')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#a3a29d]">
              {lang === 'ru'
                ? 'Текст заметки сохранится в вашем профиле'
                : 'Your note will be saved privately in your profile'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Content textarea */}
          <div>
            <textarea
              ref={textareaRef}
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDownOnTextarea}
              placeholder={
                lang === 'ru'
                  ? 'Введите текст заметки, цену, билд, ник продавца или напоминание...'
                  : 'Type your note text, price, build, seller whisper or reminder...'
              }
              className="w-full px-4 py-3 bg-slate-50 dark:bg-[#070a10] border border-slate-200 dark:border-white/[0.1] focus:border-[#00e5ff] rounded-2xl text-sm font-sans text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#71717a] outline-none transition-all shadow-inner focus:ring-1 focus:ring-[#00e5ff]/30 resize-none leading-relaxed"
            />
            <div className="flex items-center justify-between mt-1.5 px-1 text-[11px] text-slate-400 dark:text-[#71717a]">
              <span>{content.length > 0 ? `${content.length} симв.` : ''}</span>
              <span className="flex items-center gap-1 font-mono">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.1] text-[10px]">Ctrl+Enter</kbd>
                <span>{lang === 'ru' ? 'быстрое сохранение' : 'quick save'}</span>
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-[#070a10] dark:hover:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] text-xs font-comfortaa font-bold text-slate-600 dark:text-[#a3a29d] hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
            >
              {lang === 'ru' ? 'Отмена' : 'Cancel'}
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#00e5ff] to-[#00b4d8] text-[#070a0e] text-xs font-comfortaa font-bold shadow-[0_0_20px_rgba(0,229,255,0.4)] hover:shadow-[0_0_28px_rgba(0,229,255,0.6)] hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? (lang === 'ru' ? 'Сохранение...' : 'Saving...')
                  : isEditing
                    ? (lang === 'ru' ? 'Сохранить изменения' : 'Save Changes')
                    : (lang === 'ru' ? 'Сохранить заметку' : 'Save Note')}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
