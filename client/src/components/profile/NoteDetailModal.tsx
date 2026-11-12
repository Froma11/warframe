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
      if (e.key === 'Escape' || e.code === 'Escape' || e.keyCode === 27) {
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none font-sans cursor-pointer overflow-y-auto"
      onClick={handleBackdropClick}
      onMouseDown={handleBackdropClick}
    >
      <div
        className="relative w-full max-w-xl bg-white dark:bg-[#0c121d] border border-slate-200 dark:border-white/[0.12] rounded-3xl p-6 sm:p-7 shadow-[0_25px_70px_rgba(0,0,0,0.5),0_0_40px_rgba(0,229,255,0.15)] text-left cursor-default max-h-[90vh] overflow-y-auto flex flex-col"
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

        {/* Top: Icon & Date */}
        <div className="flex items-center gap-3 mb-4 pr-10">
          <div className="w-10 h-10 rounded-2xl bg-[#00e5ff]/15 border border-[#00e5ff]/35 flex items-center justify-center text-[#00e5ff] shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-comfortaa font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                {lang === 'ru' ? 'Заметка' : 'Note'}
              </h3>
              {note.tag && (
                <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[10px] font-mono font-bold tracking-wider">
                  {note.tag}
                </span>
              )}
            </div>
            <span className="text-xs text-slate-400 dark:text-[#71717a] flex items-center gap-1 font-sans mt-0.5">
              <Clock className="w-3 h-3 text-[#00e5ff]" />
              {formattedDate}
            </span>
          </div>
        </div>

        {/* Image Attachment (if present) */}
        {note.image_url && (
          <div className="relative mb-4 rounded-2xl overflow-hidden border border-slate-200 dark:border-white/[0.1] bg-black/50 group/img flex items-center justify-center">
            <img
              src={note.image_url}
              alt="Note attachment"
              className="max-h-72 w-full object-contain rounded-2xl cursor-zoom-in"
              onClick={() => onOpenLightbox && onOpenLightbox(note.image_url!)}
            />
            {/* Quick Actions Overlay on Image */}
            <div className="absolute top-2 right-2 flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadImage}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/80 hover:bg-cyan-500 hover:text-black text-white text-xs font-comfortaa font-bold backdrop-blur-md transition-all cursor-pointer shadow-lg"
                title={lang === 'ru' ? 'Скачать фото' : 'Download image'}
              >
                <Download className="w-3.5 h-3.5" />
                <span>{lang === 'ru' ? 'Скачать' : 'Download'}</span>
              </button>
              {onOpenLightbox && (
                <button
                  type="button"
                  onClick={() => onOpenLightbox(note.image_url!)}
                  className="p-1.5 rounded-xl bg-black/80 hover:bg-white/20 text-white backdrop-blur-md transition-all cursor-pointer shadow-lg"
                  title={lang === 'ru' ? 'Увеличить' : 'Zoom'}
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Content Box */}
        {noteText && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#070a10] border border-slate-200 dark:border-white/[0.08] max-h-64 overflow-y-auto mb-6 break-words">
            <p className="text-sm font-sans text-slate-800 dark:text-[#e2e8f0] leading-relaxed whitespace-pre-wrap select-text">
              {noteText}
            </p>
          </div>
        )}

        {/* Actions Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-white/[0.08] mt-auto">
          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-[#070a10] dark:hover:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] text-xs font-comfortaa font-bold text-slate-700 dark:text-[#e2e8f0] hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600 dark:text-[#10b981]" />
                <span className="text-emerald-600 dark:text-[#10b981]">
                  {lang === 'ru' ? 'Текст скопирован!' : 'Text Copied!'}
                </span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-[#00e5ff]" />
                <span>{lang === 'ru' ? 'Скопировать' : 'Copy Text'}</span>
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
