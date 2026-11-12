import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  FileText,
  Check,
  Trash2,
  Paperclip,
  Tag,
  Plus,
  Image as ImageIcon,
} from 'lucide-react';
import { NoteItem } from './NotesGrid';

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    note: {
      title?: string;
      content: string;
      tag?: string;
      image_url?: string | null;
      images?: string[];
    },
    id?: number
  ) => Promise<void>;
  initialNote?: NoteItem | null;
  existingTags?: string[];
  lang: 'ru' | 'en';
}

// Client-side image compression to WebP to keep payloads fast and responsive
const compressImageFile = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const MAX_WIDTH = 1600;
        const MAX_HEIGHT = 1600;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          if (width > height) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          } else {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/webp', 0.88));
        } else {
          resolve((event.target?.result as string) || '');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

export const NoteModal: React.FC<NoteModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialNote,
  existingTags = [],
  lang,
}) => {
  const [content, setContent] = useState('');
  const [customTag, setCustomTag] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialNote) {
        setContent(initialNote.content || initialNote.title || '');
        setCustomTag(initialNote.tag || '');
        if (Array.isArray(initialNote.images) && initialNote.images.length > 0) {
          setImages(initialNote.images);
        } else if (initialNote.image_url) {
          setImages([initialNote.image_url]);
        } else {
          setImages([]);
        }
      } else {
        setContent('');
        setCustomTag('');
        setImages([]);
      }
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 80);
    }
  }, [isOpen, initialNote]);

  // Escape key listener to close
  useEffect(() => {
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

  if (!isOpen) return null;

  const isEditing = !!initialNote;

  const handleProcessFiles = async (fileList: FileList | File[]) => {
    const processed: string[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file && file.type.startsWith('image/')) {
        const compressed = await compressImageFile(file);
        if (compressed) processed.push(compressed);
      }
    }
    if (processed.length > 0) {
      setImages((prev) => [...prev, ...processed]);
    }
  };

  // Clipboard Paste (Ctrl+V) listener for instant screenshots
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const pastedFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) pastedFiles.push(file);
      }
    }
    if (pastedFiles.length > 0) {
      e.preventDefault();
      await handleProcessFiles(pastedFiles);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleProcessFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await handleProcessFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanText = content.trim();
    if (!cleanText && images.length === 0) return;

    setIsSubmitting(true);
    try {
      await onSave(
        {
          content: cleanText,
          title: '',
          tag: customTag.trim(),
          images,
          image_url: images[0] || null,
        },
        initialNote?.id
      );
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDownOnTextarea = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
  };

  // Render directly to document.body via Portal to prevent any parent overflow or backdrop clipping
  return createPortal(
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200 select-none font-sans cursor-pointer overflow-y-auto"
      onClick={handleBackdropClick}
      onMouseDown={handleBackdropClick}
      onPaste={handlePaste}
    >
      <div
        className="relative w-full max-w-xl max-h-[92vh] bg-white dark:bg-[#090e18] border border-slate-200 dark:border-white/[0.12] rounded-[28px] p-5 sm:p-7 shadow-[0_25px_70px_rgba(0,0,0,0.8),0_0_50px_rgba(0,229,255,0.15)] text-left cursor-default flex flex-col overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Subtle Ambient Glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none -mr-20 -mt-20" />

        {/* Pinned Modal Header */}
        <div className="relative z-10 flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-white/[0.08] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(0,229,255,0.25)]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-comfortaa font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                {isEditing
                  ? lang === 'ru'
                    ? 'Редактировать запись'
                    : 'Edit Note'
                  : lang === 'ru'
                  ? 'Новая запись в блокнот'
                  : 'New Trade Note'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">
                {lang === 'ru'
                  ? 'Текст, пользовательская тема и скриншоты'
                  : 'Text, custom topic & multiple screenshots'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          onSubmit={handleSubmit}
          className="relative z-10 flex-1 flex flex-col justify-between overflow-y-auto pt-4 space-y-4 pr-1"
        >
          <div className="space-y-4">
            {/* Custom Topic / Tag Input (User Creates Own Topic) */}
            <div className="space-y-1.5">
              <label className="text-xs font-comfortaa font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-cyan-400" />
                <span>
                  {lang === 'ru' ? 'Тема / Тег заметки:' : 'Note Topic / Tag:'}
                </span>
              </label>

              <div className="relative">
                <input
                  type="text"
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  placeholder={
                    lang === 'ru'
                      ? 'Например: Снайпинг, Ривен на Торид, Сделки, Билды...'
                      : 'e.g. Torid Riven, Sniping, Trade Deals, Builds...'
                  }
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#060a12] border border-slate-200 dark:border-white/[0.1] focus:border-cyan-400 rounded-2xl text-xs font-sans text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all shadow-inner focus:ring-1 focus:ring-cyan-400/30"
                />
              </div>

              {/* Quick suggestions from user's previously created tags */}
              {existingTags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 font-mono">
                    {lang === 'ru' ? 'Ранее созданные:' : 'Existing topics:'}
                  </span>
                  {existingTags.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setCustomTag(t)}
                      className={`px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                        customTag.trim().toLowerCase() === t.toLowerCase()
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-[0_0_8px_rgba(0,229,255,0.2)]'
                          : 'bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/[0.08] hover:text-white'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Note Content Textarea */}
            <div>
              <textarea
                ref={textareaRef}
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKeyDownOnTextarea}
                placeholder={
                  lang === 'ru'
                    ? 'Текст заметки: цены, ники трейдеров, условия сделки...'
                    : 'Note details: buy/sell prices, trade whisper, notes...'
                }
                className="w-full px-4 py-3 bg-slate-50 dark:bg-[#060a12] border border-slate-200 dark:border-white/[0.1] focus:border-cyan-400 rounded-2xl text-sm font-sans text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all shadow-inner focus:ring-1 focus:ring-cyan-400/30 resize-none leading-relaxed"
              />
              <div className="flex items-center justify-between mt-1 px-1 text-[11px] text-slate-400">
                <span>{content.length > 0 ? `${content.length} симв.` : ''}</span>
                <span className="font-mono text-[10px] opacity-75">
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/[0.08]">
                    Ctrl+Enter
                  </kbd>{' '}
                  {lang === 'ru' ? 'для сохранения' : 'to save'}
                </span>
              </div>
            </div>

            {/* Multiple Screenshots Section */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleFileInputChange}
            />

            {/* Gallery of Attached Screenshots */}
            {images.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-comfortaa font-bold text-slate-300">
                  <span className="flex items-center gap-1.5 text-cyan-400">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>
                      {lang === 'ru'
                        ? `Прикреплено скриншотов: ${images.length}`
                        : `Attached screenshots: ${images.length}`}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 font-comfortaa flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{lang === 'ru' ? 'Добавить ещё' : 'Add more'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 p-2.5 rounded-2xl bg-black/40 border border-white/[0.08]">
                  {images.map((imgUrl, idx) => (
                    <div
                      key={idx}
                      className="group/thumb relative aspect-video rounded-xl overflow-hidden bg-black border border-white/[0.1] shadow-sm"
                    >
                      <img
                        src={imgUrl}
                        alt={`Attachment ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-md bg-black/75 text-[9px] font-mono font-bold text-white">
                        #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-1 right-1 p-1 rounded-lg bg-rose-500/80 hover:bg-rose-500 text-white opacity-0 group-hover/thumb:opacity-100 transition-opacity cursor-pointer shadow-md"
                        title={lang === 'ru' ? 'Удалить это фото' : 'Remove photo'}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {/* Add more photo card */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-video rounded-xl border border-dashed border-cyan-500/40 hover:border-cyan-400 hover:bg-cyan-500/10 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all text-cyan-400"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-[10px] font-comfortaa font-bold">
                      {lang === 'ru' ? 'Ещё фото' : 'Add photo'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Drop / Paste Hint Box (If no images yet or as drop target) */}
            {images.length === 0 && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex items-center justify-between p-3.5 rounded-2xl border border-dashed transition-all cursor-pointer ${
                  isDragging
                    ? 'border-cyan-400 bg-cyan-500/15 scale-[1.01]'
                    : 'border-slate-300 dark:border-white/[0.12] hover:border-cyan-400/60 hover:bg-cyan-500/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400 shrink-0">
                    <Paperclip className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-comfortaa font-bold text-slate-800 dark:text-slate-200">
                      {lang === 'ru'
                        ? 'Прикрепить скриншоты (можно несколько)'
                        : 'Attach screenshots (multiple supported)'}
                    </span>
                    <span className="block text-[11px] text-slate-400">
                      {lang === 'ru'
                        ? 'Или вставьте через Ctrl+V прямо сюда'
                        : 'Or paste directly using Ctrl+V'}
                    </span>
                  </div>
                </div>

                <span className="text-xs font-comfortaa font-bold text-cyan-400 shrink-0">
                  + {lang === 'ru' ? 'Выбрать' : 'Browse'}
                </span>
              </div>
            )}
          </div>

          {/* Modal Footer (Pinned to bottom, NEVER overflows) */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200/80 dark:border-white/[0.08] shrink-0 mt-3">
            <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
              {lang === 'ru'
                ? 'Ctrl+V — вставить фото из буфера'
                : 'Ctrl+V to paste screenshot'}
            </span>

            <div className="flex items-center gap-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/[0.08] text-xs font-comfortaa font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
              >
                {lang === 'ru' ? 'Отмена' : 'Cancel'}
              </button>

              <button
                type="submit"
                disabled={isSubmitting || (!content.trim() && images.length === 0)}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 text-xs font-comfortaa font-bold shadow-[0_0_20px_rgba(0,229,255,0.4)] hover:shadow-[0_0_28px_rgba(0,229,255,0.6)] hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? lang === 'ru'
                      ? 'Сохранение...'
                      : 'Saving...'
                    : isEditing
                    ? lang === 'ru'
                      ? 'Сохранить изменения'
                      : 'Save Changes'
                    : lang === 'ru'
                    ? 'Сохранить запись'
                    : 'Save Note'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};