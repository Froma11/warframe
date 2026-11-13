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
  Tag,
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
    setCopied(false);
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
      className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200 select-none font-sans cursor-pointer overflow-y-auto"
      onClick={handleBackdropClick}
      onMouseDown={handleBackdropClick}
    >
      <div
        className="relative w-full max-w-2xl max-h-[92vh] bg-white dark:bg-[#121316] border border-zinc-200 dark:border-white/[0.09] rounded-3xl shadow-2xl dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.07),0_28px_70px_rgba(0,0,0,0.85)] text-left cursor-default flex flex-col overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Subtle Ambient Corner Gradient */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_0%_0%,rgba(45,212,191,0.06),transparent_48%)]"
        />

        {/* Pinned Modal Header */}
        <div className="relative z-10 flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-zinc-200/80 dark:border-white/[0.07] shrink-0">
          <div className="flex items-center gap-2.5 flex-wrap min-w-0">
            {note.tag ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#2DD4BF]/10 text-teal-700 dark:text-[#5EEAD4] border border-[#2DD4BF]/25 text-xs font-mono font-bold tracking-wide">
                <Tag className="w-3 h-3 opacity-85" />
                <span>{note.tag}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-white/[0.05] text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-white/[0.08] text-[11px] font-mono font-semibold tracking-wider uppercase">
                {lang === 'ru' ? 'Заметка' : 'Note'}
              </span>
            )}
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono tabular-nums flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-[#2DD4BF]" />
              <span>{formattedDate}</span>
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={lang === 'ru' ? 'Закрыть' : 'Close'}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/[0.07] border border-transparent hover:border-zinc-200 dark:hover:border-white/[0.08] active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="relative z-10 flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-4">
          {/* Multi-Image Hero Carousel / Viewer */}
          {allImages.length > 0 && (
            <div className="space-y-2.5">
              <div className="relative rounded-2xl overflow-hidden border border-zinc-200 dark:border-white/[0.08] bg-zinc-950/90 dark:bg-[#0B0C0E] group/img flex items-center justify-center max-h-80 shadow-inner">
                <img
                  src={allImages[activeImgIndex] || allImages[0]}
                  alt="Attachment"
                  className="max-h-80 w-full object-contain cursor-zoom-in"
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
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-black/75 hover:bg-black/90 text-white border border-white/10 backdrop-blur-md transition-all shadow-md cursor-pointer active:scale-95"
                      title={lang === 'ru' ? 'Предыдущее фото' : 'Previous photo'}
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
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-black/75 hover:bg-black/90 text-white border border-white/10 backdrop-blur-md transition-all shadow-md cursor-pointer active:scale-95"
                      title={lang === 'ru' ? 'Следующее фото' : 'Next photo'}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    {/* Image Counter Badge */}
                    <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md text-[11px] font-mono tabular-nums text-white border border-white/[0.12]">
                      {activeImgIndex + 1} / {allImages.length}
                    </div>
                  </>
                )}

                {/* Floating Action Badge on Image */}
                <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleDownloadActiveImage}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/80 hover:bg-[#2DD4BF] hover:text-zinc-950 text-white border border-white/10 text-xs font-comfortaa font-bold backdrop-blur-md transition-all cursor-pointer shadow-lg active:scale-95 whitespace-nowrap"
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
                      className="p-1.5 rounded-xl bg-black/80 hover:bg-white/20 text-white border border-white/10 backdrop-blur-md transition-all cursor-pointer shadow-lg active:scale-95"
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
                      className={`relative w-14 h-14 rounded-xl overflow-hidden border transition-all shrink-0 cursor-pointer ${
                        activeImgIndex === i
                          ? 'border-[#2DD4BF] ring-2 ring-[#2DD4BF]/25'
                          : 'border-zinc-200 dark:border-white/[0.08] opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="Thumb" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Note Content Card */}
          {noteText && (
            <div className="rounded-2xl bg-zinc-50/90 dark:bg-[#16181C] border border-zinc-200/90 dark:border-white/[0.08] shadow-inner dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] overflow-hidden">
              <div className="p-4 sm:p-5 break-words">
                <div className="text-sm font-sans text-zinc-800 dark:text-zinc-200 leading-7 whitespace-pre-wrap select-text">
                  {renderTradeNoteContent(noteText)}
                </div>
              </div>

              {/* Subtle Telemetry Footer inside text card */}
              <div className="px-4 sm:px-5 py-2.5 border-t border-zinc-200/70 dark:border-white/[0.05] bg-zinc-100/60 dark:bg-[#141519] flex items-center justify-between gap-3 text-[11px] font-mono text-zinc-500 dark:text-zinc-400 tabular-nums">
                <span>
                  {noteText.length} {lang === 'ru' ? 'симв.' : 'chars'}
                </span>
                {allImages.length > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <Images className="w-3 h-3 text-teal-600 dark:text-[#2DD4BF]" />
                    <span>
                      {allImages.length} {lang === 'ru' ? 'скринш.' : 'img'}
                    </span>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Pinned Modal Action Footer */}
        <div className="relative z-10 flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-t border-zinc-200/80 dark:border-white/[0.07] bg-zinc-50/60 dark:bg-[#141519] shrink-0">
          {/* Primary Copy Action */}
          <button
            type="button"
            onClick={handleCopy}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-comfortaa font-bold whitespace-nowrap shrink-0 active:scale-[0.98] transition-all duration-150 cursor-pointer ${
              copied
                ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]'
                : 'bg-[#2DD4BF] hover:bg-[#5EEAD4] text-zinc-950 border border-[#5EEAD4]/40 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4),0_4px_14px_rgba(45,212,191,0.28)] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5),0_6px_18px_rgba(45,212,191,0.42)]'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>{lang === 'ru' ? 'Скопировано!' : 'Copied!'}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>{lang === 'ru' ? 'Скопировать текст' : 'Copy Text'}</span>
              </>
            )}
          </button>

          {/* Secondary Tactile Edit & Delete Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(note);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white hover:bg-teal-50 dark:bg-white/[0.04] dark:hover:bg-[#2DD4BF]/10 border border-zinc-200 hover:border-teal-300 dark:border-white/[0.08] dark:hover:border-[#2DD4BF]/35 text-xs font-comfortaa font-bold text-zinc-600 hover:text-teal-700 dark:text-zinc-300 dark:hover:text-[#5EEAD4] whitespace-nowrap active:scale-[0.98] transition-all cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{lang === 'ru' ? 'Изменить' : 'Edit'}</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                await onDelete(note.id);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white hover:bg-rose-50 dark:bg-white/[0.04] dark:hover:bg-rose-500/10 border border-zinc-200 hover:border-rose-300 dark:border-white/[0.08] dark:hover:border-rose-500/35 text-xs font-comfortaa font-bold text-zinc-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-300 whitespace-nowrap active:scale-[0.98] transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{lang === 'ru' ? 'Удалить' : 'Delete'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
