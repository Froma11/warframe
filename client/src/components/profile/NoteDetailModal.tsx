import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Clock,
  Edit3,
  Trash2,
  Copy,
  Check,
  Download,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Images,
} from 'lucide-react';
import { NoteItem, downloadImage, renderTradeNoteContent } from './NotesGrid';

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
  const [activeImgIndex, setActiveImgIndex] = useState(0);

  React.useEffect(() => {
    setActiveImgIndex(0);
  }, [note?.id]);

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

  // Extract images array with fallback to note.image_url
  const allImages: string[] =
    Array.isArray(note.images) && note.images.length > 0
      ? note.images
      : note.image_url
      ? [note.image_url]
      : [];

  const noteText = note.content || note.title || '';

  const handleCopy = () => {
    navigator.clipboard.writeText(noteText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadActiveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentImg = allImages[activeImgIndex] || note.image_url;
    if (currentImg) {
      downloadImage(currentImg, `warframe-note-${note.id}-${activeImgIndex + 1}.png`);
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

  return createPortal(
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200 select-none font-sans cursor-pointer overflow-y-auto"
      onClick={handleBackdropClick}
      onMouseDown={handleBackdropClick}
    >
      <div
        className="relative w-full max-w-xl max-h-[92vh] bg-white dark:bg-[#090e18] border border-slate-200 dark:border-white/[0.12] rounded-[28px] p-5 sm:p-7 shadow-[0_25px_70px_rgba(0,0,0,0.8),0_0_50px_rgba(0,229,255,0.15)] text-left cursor-default flex flex-col overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Subtle Ambient Glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none -mr-20 -mt-20" />

        {/* Modal Header */}
        <div className="relative z-10 flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-white/[0.08] shrink-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            {note.tag ? (
              <span className="px-3 py-1 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 text-xs font-mono font-bold tracking-wider">
                {note.tag}
              </span>
            ) : (
              <span className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-white/[0.05] text-slate-400 border border-slate-200 dark:border-white/[0.08] text-xs font-mono font-bold tracking-wider">
                {lang === 'ru' ? 'ЗАМЕТКА' : 'NOTE'}
              </span>
            )}
            <span className="text-xs text-slate-400 font-sans flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              {formattedDate}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="relative z-10 flex-1 overflow-y-auto pt-4 space-y-4 pr-1">
          {/* Multi-Image Hero Carousel / Viewer */}
          {allImages.length > 0 && (
            <div className="space-y-2">
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-white/[0.1] bg-black/70 group/img flex items-center justify-center max-h-72 shadow-inner">
                <img
                  src={allImages[activeImgIndex] || allImages[0]}
                  alt="Attachment"
                  className="max-h-72 w-full object-contain cursor-zoom-in"
                  onClick={() =>
                    onOpenLightbox &&
                    onOpenLightbox(allImages[activeImgIndex] || allImages[0])
                  }
                />

                {/* Left / Right Carousel Controls if Multiple Images */}
                {allImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImgIndex((prev) =>
                          prev === 0 ? allImages.length - 1 : prev - 1
                        );
                      }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-black/70 hover:bg-black/90 text-white backdrop-blur-md transition-all shadow-md cursor-pointer"
                      title="Предыдущее фото"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImgIndex((prev) =>
                          prev === allImages.length - 1 ? 0 : prev + 1
                        );
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-black/70 hover:bg-black/90 text-white backdrop-blur-md transition-all shadow-md cursor-pointer"
                      title="Следующее фото"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    {/* Image Counter Badge */}
                    <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md text-[11px] font-mono text-white border border-white/[0.1]">
                      {activeImgIndex + 1} / {allImages.length}
                    </div>
                  </>
                )}

                {/* Floating Action Badge on Image */}
                <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleDownloadActiveImage}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/80 hover:bg-cyan-500 hover:text-black text-white text-xs font-comfortaa font-bold backdrop-blur-md transition-all cursor-pointer shadow-lg active:scale-95"
                    title={lang === 'ru' ? 'Скачать это фото' : 'Download photo'}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{lang === 'ru' ? 'Скачать' : 'Download'}</span>
                  </button>
                  {onOpenLightbox && (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenLightbox(allImages[activeImgIndex] || allImages[0])
                      }
                      className="p-1.5 rounded-xl bg-black/80 hover:bg-white/20 text-white backdrop-blur-md transition-all cursor-pointer shadow-lg"
                      title={lang === 'ru' ? 'На весь экран' : 'Fullscreen'}
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Thumbnails strip if more than 1 image */}
              {allImages.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5">
                  {allImages.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setActiveImgIndex(i)}
                      className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                        activeImgIndex === i
                          ? 'border-cyan-400 shadow-[0_0_12px_rgba(0,229,255,0.4)] scale-105'
                          : 'border-white/[0.1] opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="Thumb" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Note Content Text */}
          {noteText && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#060a12] border border-slate-200/80 dark:border-white/[0.08] break-words">
              <div className="text-sm font-sans text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap select-text">
                {renderTradeNoteContent(noteText)}
              </div>
            </div>
          )}
        </div>

        {/* Modal Action Footer */}
        <div className="relative z-10 flex items-center justify-between pt-4 border-t border-slate-200/80 dark:border-white/[0.08] shrink-0 mt-3">
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
    </div>,
    document.body
  );
};