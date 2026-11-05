import React, { useState } from 'react';
import { X, Clock, Edit3, Trash2, Copy, Check, FileText } from 'lucide-react';
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

  const noteText = note.content || note.title || '';

  const handleCopy = () => {
    // Copies STRICTLY the note text, never any title prefix
    navigator.clipboard.writeText(noteText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

        {/* Top: Icon & Date */}
        <div className="flex items-center gap-3 mb-4 pr-10">
          <div className="w-9 h-9 rounded-xl bg-[#00e5ff]/15 border border-[#00e5ff]/35 flex items-center justify-center text-[#00e5ff]">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-comfortaa font-bold text-base text-slate-900 dark:text-white">
              {lang === 'ru' ? 'Заметка' : 'Note'}
            </h3>
            <span className="text-xs text-slate-400 dark:text-[#71717a] flex items-center gap-1 font-sans">
              <Clock className="w-3 h-3 text-[#00e5ff]" />
              {formattedDate}
            </span>
          </div>
        </div>

        {/* Content Box */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#070a10] border border-slate-200 dark:border-white/[0.08] max-h-80 overflow-y-auto mb-6">
          <p className="text-sm font-sans text-slate-800 dark:text-[#e2e8f0] leading-relaxed whitespace-pre-wrap select-text">
            {noteText}
          </p>
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-white/[0.08]">
          {/* Copy Button (Copies ONLY the note text) */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-[#070a10] dark:hover:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] text-xs font-comfortaa font-bold text-slate-700 dark:text-[#e2e8f0] hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600 dark:text-[#10b981]" />
                <span className="text-emerald-600 dark:text-[#10b981]">{lang === 'ru' ? 'Текст скопирован!' : 'Text Copied!'}</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-[#00e5ff]" />
                <span>{lang === 'ru' ? 'Скопировать текст' : 'Copy Text'}</span>
              </>
            )}
          </button>

          {/* Edit & Delete */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onEdit(note);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-comfortaa font-bold text-slate-600 dark:text-[#a3a29d] hover:text-[#0284c7] dark:hover:text-[#00e5ff] hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              <span>{lang === 'ru' ? 'Изменить' : 'Edit'}</span>
            </button>
            <button
              onClick={async () => {
                await onDelete(note.id);
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-comfortaa font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:text-[#71717a] dark:hover:text-[#f87171] dark:hover:bg-[#f87171]/10 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>{lang === 'ru' ? 'Удалить' : 'Delete'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
