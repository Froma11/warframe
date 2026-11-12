import React, { useState } from 'react';
import { X, Clock, Edit3, Trash2, Copy, Check, FileText, Download, Maximize2, Tag } from 'lucide-react';
import { NoteItem, downloadImage } from './NotesGrid';

interface NoteDetailModalProps {
  note: NoteItem | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (note: NoteItem) => void;
  onDelete: (id: number) => Promise<void>;
  onOpenLightbox?: (url: string) => void;
  lang: 'ru' | 'en';
}

export const NoteDetailModal: React.FC<NoteDetailModalProps> = ({
  note,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onOpenLightbox,
  lang,
}) => {
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  if (!isOpen || !note) return null;

  const noteText = note.content || note.title || '';

  const handleCopy = () => {
    navigator.clipboard.writeText(noteText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (note.image_url) {
      downloadImage(note.image_url, `warframe-note-${note.id}.png`);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
  };

  const formattedDate = new Date(note.created_at).toLocaleDateString(
    lang === 'ru' ? 'ru-RU' : 'en-US',
    { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none font-sans cursor-pointer overflow-hidden"
      onClick={handleBackdropClick}
      onMouseDown={handleBackdropClick}
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] bg-white dark:bg-[#0c121d] border border-slate-200 dark:border-white/[0.12] rounded-3xl p-5 sm:p-6 shadow-[0_25px_70px_rgba(0,0,0,0.6),0_0_40px_rgba(0,229,255,0.15)] text-left cursor-default flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-white/[0.08] shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 text-xs font-mono font-bold tracking-wider">
              {note.tag || 'ЗАМЕТКА'}
            </span>
            <span className="text-xs text-slate-400 font-sans flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              {formattedDate}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto pt-4 space-y-4 pr-0.5">
          {/* Image Hero (if attached) */}
          {note.image_url && (
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-white/[0.1] bg-black/60 group/img flex items-center justify-center max-h-64 shadow-inner">
              <img
                src={note.image_url}
                alt="Attachment"
                className="max-h-64 w-full object-contain cursor-zoom-in"
                onClick={() => onOpenLightbox && onOpenLightbox(note.image_url!)}
              />

              {/* Floating Action Badge on Image */}
              <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleDownloadImage}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/80 hover:bg-cyan-500 hover:text-black text-white text-xs font-comfortaa font-bold backdrop-blur-md transition-all cursor-pointer shadow-lg active:scale-95"
                  title={lang === 'ru' ? 'Скачать оригинал фото' : 'Download original'}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{lang === 'ru' ? 'Скачать' : 'Download'}</span>
                </button>
                {onOpenLightbox && (
                  <button
                    type="button"
                    onClick={() => onOpenLightbox(note.image_url!)}
                    className="p-1.5 rounded-xl bg-black/80 hover:bg-white/20 text-white backdrop-blur-md transition-all cursor-pointer shadow-lg"
                    title={lang === 'ru' ? 'На весь экран' : 'Fullscreen'}
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Note Content Text */}
          {noteText && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#070b14] border border-slate-200/80 dark:border-white/[0.06] break-words">
              <p className="text-sm font-sans text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap select-text">
                {noteText}
              </p>
            </div>
          )}
        </div>

        {/* Modal Action Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200/80 dark:border-white/[0.08] shrink-0 mt-3">
          {/* Prominent Primary Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 text-xs font-comfortaa font-bold shadow-[0_0_18px_rgba(0,229,255,0.35)] transition-all cursor-pointer active:scale-95"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-950" />
                <span>{lang === 'ru' ? 'Скопировано!' : 'Copied!'}</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>{lang === 'ru' ? 'Скопировать текст' : 'Copy Text'}</span>
              </>
            )}
          </button>

          {/* Secondary Edit & Delete Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(note);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-comfortaa font-bold text-slate-600 dark:text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              <span>{lang === 'ru' ? 'Изменить' : 'Edit'}</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                await onDelete(note.id);
                onClose();
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-comfortaa font-bold text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
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
