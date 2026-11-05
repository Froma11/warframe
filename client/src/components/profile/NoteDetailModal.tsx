import React, { useState } from 'react';
import { X, Clock, Edit3, Trash2, Copy, Check } from 'lucide-react';
import { NoteItem } from './NotesGrid';

interface NoteDetailModalProps {
  note: NoteItem | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (note: NoteItem) => void;
  onDelete: (id: number) => Promise<void>;
  lang: 'ru' | 'en';
}

export const NoteDetailModal: React.FC<NoteDetailModalProps> = ({
  note,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  lang,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !note) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(`${note.title}\n\n${note.content}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getTagColor = (tag?: string) => {
    switch (tag) {
      case 'СНАЙПИНГ':
        return 'text-[#0284c7] dark:text-[#00e5ff] border-[#00e5ff]/40 bg-[#00e5ff]/10';
      case 'ТОРГОВЛЯ':
        return 'text-emerald-600 dark:text-[#10b981] border-[#10b981]/40 bg-[#10b981]/10';
      case 'ФАРМ':
        return 'text-amber-600 dark:text-[#fbbf24] border-[#fbbf24]/40 bg-[#fbbf24]/10';
      case 'ИНВЕСТ':
        return 'text-purple-600 dark:text-[#c084fc] border-[#c084fc]/40 bg-[#c084fc]/10';
      default:
        return 'text-[#0284c7] dark:text-[#00e5ff] border-[#00e5ff]/40 bg-[#00e5ff]/10';
    }
  };

  const formattedDate = new Date(note.created_at).toLocaleDateString(
    lang === 'ru' ? 'ru-RU' : 'en-US',
    { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }
  );

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

        {/* Top: Category Tag & Date */}
        <div className="flex items-center gap-3 mb-4 pr-10">
          <span className={`text-xs font-comfortaa font-bold px-3 py-1 rounded-full border uppercase tracking-wider ${getTagColor(note.tag)}`}>
            {note.tag || 'СНАЙПИНГ'}
          </span>
          <span className="text-xs text-slate-400 dark:text-[#71717a] flex items-center gap-1 font-sans">
            <Clock className="w-3.5 h-3.5" />
            {formattedDate}
          </span>
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-comfortaa font-bold text-slate-900 dark:text-white tracking-tight mb-4">
          {note.title}
        </h2>

        {/* Content Box */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#070a10] border border-slate-200 dark:border-white/[0.08] max-h-72 overflow-y-auto mb-6">
          <p className="text-sm font-sans text-slate-700 dark:text-[#cbd5e1] leading-relaxed whitespace-pre-wrap select-text">
            {note.content}
          </p>
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-white/[0.08]">
          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-[#070a10] dark:hover:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] text-xs font-comfortaa font-bold text-slate-600 dark:text-[#a3a29d] hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600 dark:text-[#10b981]" />
                <span className="text-emerald-600 dark:text-[#10b981]">{lang === 'ru' ? 'Скопировано!' : 'Copied!'}</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>{lang === 'ru' ? 'Копировать' : 'Copy'}</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2.5">
            {/* Edit Button */}
            <button
              onClick={() => {
                onClose();
                onEdit(note);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-[#00e5ff]/15 hover:bg-[#00e5ff]/25 border border-[#00e5ff]/40 text-[#00b4d8] dark:text-[#00e5ff] text-xs font-comfortaa font-bold transition-all cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              <span>{lang === 'ru' ? 'Редактировать' : 'Edit'}</span>
            </button>

            {/* Delete Button */}
            <button
              onClick={async () => {
                await onDelete(note.id);
                onClose();
              }}
              className="p-2 rounded-2xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:text-[#71717a] dark:hover:text-[#f87171] dark:hover:bg-[#f87171]/10 transition-colors cursor-pointer"
              title={lang === 'ru' ? 'Удалить заметку' : 'Delete note'}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
