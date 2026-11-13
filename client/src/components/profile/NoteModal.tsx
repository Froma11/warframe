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
import { NoteItem, renderTradeNoteContent } from './NotesGrid';

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

  const handleWrapBrackets = () => {
    const el = textareaRef.current;
    if (!el) {
      setContent((prev) => `${prev}[]`);
      return;
    }

    const start = el.selectionStart ?? content.length;
    const end = el.selectionEnd ?? content.length;
    const selected = content.slice(start, end);
    const nextValue = `${content.slice(0, start)}[${selected}]${content.slice(end)}`;
    setContent(nextValue);

    requestAnimationFrame(() => {
      el.focus();
      const cursorPos = selected ? end + 2 : start + 1;
      el.setSelectionRange(cursorPos, cursorPos);
    });
  };

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

  const hasContent = content.trim().length > 0;

  // Render directly to document.body via Portal to prevent any parent overflow or backdrop clipping
  return createPortal(
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200 select-none font-sans cursor-pointer overflow-y-auto"
      onClick={handleBackdropClick}
      onMouseDown={handleBackdropClick}
      onPaste={handlePaste}
    >
      <div
        className="relative w-full max-w-2xl max-h-[92vh] bg-white dark:bg-[#090D16] border border-slate-200 dark:border-white/[0.09] rounded-3xl shadow-2xl dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_28px_70px_rgba(0,0,0,0.85)] text-left cursor-default flex flex-col overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Subtle Ambient Corner Gradient */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_0%_0%,rgba(6,182,212,0.07),transparent_48%)]"
        />

        {/* Pinned Modal Header */}
        <div className="relative z-10 flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-200/80 dark:border-white/[0.07] shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 dark:border-cyan-400/25 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] shrink-0">
              <FileText className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-comfortaa font-bold text-base sm:text-lg text-slate-900 dark:text-white truncate">
                {isEditing
                  ? lang === 'ru'
                    ? 'Редактировать запись'
                    : 'Edit Note'
                  : lang === 'ru'
                  ? 'Новая запись в блокнот'
                  : 'New Trade Note'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-sans truncate">
                {lang === 'ru'
                  ? 'Теги предметов в [скобках], тема и скриншоты'
                  : 'Use [brackets] for item pills, topic tag & screenshots'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={lang === 'ru' ? 'Закрыть' : 'Close'}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.07] border border-transparent hover:border-slate-200 dark:hover:border-white/[0.08] active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Wrapper (Scrollable Body + Pinned Footer) */}
        <form onSubmit={handleSubmit} className="relative z-10 flex-1 flex flex-col min-h-0">
          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-4">
            {/* Custom Topic / Tag Input */}
            <div className="space-y-2">
              <label className="text-xs font-comfortaa font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>
                  {lang === 'ru' ? 'Тема / Тег заметки' : 'Note Topic / Tag'}
                </span>
              </label>

              <div className="group/tag relative flex items-center bg-slate-50 dark:bg-[#060911] border border-slate-200 dark:border-white/[0.08] focus-within:border-cyan-500/60 dark:focus-within:border-cyan-400/50 focus-within:ring-2 focus-within:ring-cyan-500/15 dark:focus-within:ring-cyan-400/15 rounded-xl transition-all duration-150 shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.5)]">
                <Tag className="w-3.5 h-3.5 ml-3.5 text-slate-400 dark:text-slate-500 group-focus-within/tag:text-cyan-600 dark:group-focus-within/tag:text-cyan-400 transition-colors shrink-0" />
                <input
                  type="text"
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  placeholder={
                    lang === 'ru'
                      ? 'Например: Снайпинг, Ривен на Торид, Сделки, Билды...'
                      : 'e.g. Torid Riven, Sniping, Trade Deals, Builds...'
                  }
                  className="w-full pl-2.5 pr-9 py-2.5 bg-transparent text-xs font-sans text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none"
                />
                {customTag && (
                  <button
                    type="button"
                    onClick={() => setCustomTag('')}
                    aria-label={lang === 'ru' ? 'Очистить тег' : 'Clear tag'}
                    className="absolute right-2.5 p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Quick suggestions from user's previously created tags */}
              {existingTags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mr-0.5">
                    {lang === 'ru' ? 'Темы:' : 'Topics:'}
                  </span>
                  {existingTags.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setCustomTag(t)}
                      className={`px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-semibold transition-all cursor-pointer active:scale-95 ${
                        customTag.trim().toLowerCase() === t.toLowerCase()
                          ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40'
                          : 'bg-slate-100 dark:bg-white/[0.03] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/[0.07] hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-white/[0.15]'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Note Content Textarea + Quick Bracket Wrapper */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-comfortaa font-bold text-slate-700 dark:text-slate-300">
                  {lang === 'ru' ? 'Текст заметки' : 'Note Content'}
                </label>

                <button
                  type="button"
                  onClick={handleWrapBrackets}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/15 border border-cyan-500/25 hover:border-cyan-400/45 text-[11px] font-mono font-semibold text-cyan-700 dark:text-cyan-300 active:scale-95 transition-all cursor-pointer"
                  title={
                    lang === 'ru'
                      ? 'Обернуть выделение в [Предмет] или вставить скобки'
                      : 'Wrap selection in [Item] brackets'
                  }
                >
                  <Tag className="w-3 h-3" />
                  <span>{lang === 'ru' ? '[Предмет]' : '[Item]'}</span>
                </button>
              </div>

              <div className="rounded-2xl bg-slate-50 dark:bg-[#060911] border border-slate-200 dark:border-white/[0.08] focus-within:border-cyan-500/60 dark:focus-within:border-cyan-400/50 focus-within:ring-2 focus-within:ring-cyan-500/15 dark:focus-within:ring-cyan-400/15 transition-all duration-150 shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.5)] overflow-hidden">
                <textarea
                  ref={textareaRef}
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={handleKeyDownOnTextarea}
                  placeholder={
                    lang === 'ru'
                      ? 'Например: Куплю от 3шт [Мистический жнец] 1к10, [Меткая стрела] 1к7...'
                      : 'e.g. WTB [Arcane Reaper] 10p, [Arcane Energize] x2 150p...'
                  }
                  className="w-full px-4 py-3 bg-transparent text-sm font-sans text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none resize-none leading-relaxed"
                />

                <div className="px-3.5 py-2 border-t border-slate-200/70 dark:border-white/[0.05] bg-slate-100/60 dark:bg-[#080C15] flex items-center justify-between gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                  <span>
                    {content.length} {lang === 'ru' ? 'симв.' : 'chars'}
                  </span>
                  <span className="text-[10px]">
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-white/[0.07] border border-slate-300/60 dark:border-white/[0.08] text-slate-600 dark:text-slate-300">
                      Ctrl+Enter
                    </kbd>{' '}
                    {lang === 'ru' ? 'сохранить' : 'to save'}
                  </span>
                </div>
              </div>

              {/* Live Smart Preview of how the card will render [Item] pills & trade numbers */}
              {hasContent && (
                <div className="rounded-2xl p-3.5 bg-slate-50/70 dark:bg-[#0B101B] border border-slate-200/80 dark:border-white/[0.07] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    {lang === 'ru' ? 'Превью карточки' : 'Card Preview'}
                  </div>
                  <div className="text-xs sm:text-[13px] text-slate-700 dark:text-slate-300 font-sans leading-7 whitespace-pre-wrap break-words">
                    {renderTradeNoteContent(content)}
                  </div>
                </div>
              )}
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

            {images.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-comfortaa font-bold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5 text-cyan-700 dark:text-cyan-300">
                    <ImageIcon className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    <span>
                      {lang === 'ru'
                        ? `Скриншоты (${images.length})`
                        : `Screenshots (${images.length})`}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 text-[11px] text-cyan-700 dark:text-cyan-300 hover:text-cyan-600 dark:hover:text-cyan-200 font-comfortaa cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{lang === 'ru' ? 'Добавить ещё' : 'Add more'}</span>
                  </button>
                </div>

                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`grid grid-cols-3 sm:grid-cols-4 gap-2.5 p-2.5 rounded-2xl border transition-colors ${
                    isDragging
                      ? 'bg-cyan-500/10 border-cyan-400/50'
                      : 'bg-slate-100/80 dark:bg-[#060911] border-slate-200 dark:border-white/[0.08]'
                  }`}
                >
                  {images.map((imgUrl, idx) => (
                    <div
                      key={idx}
                      className="group/thumb relative aspect-video rounded-xl overflow-hidden bg-black border border-slate-300/60 dark:border-white/[0.1] shadow-sm"
                    >
                      <img
                        src={imgUrl}
                        alt={`Attachment ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-md bg-black/75 text-[9px] font-mono font-bold text-white border border-white/10">
                        #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-1 right-1 p-1 rounded-lg bg-rose-500/90 hover:bg-rose-500 text-white sm:opacity-0 sm:group-hover/thumb:opacity-100 transition-opacity cursor-pointer shadow-md"
                        title={lang === 'ru' ? 'Удалить это фото' : 'Remove photo'}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-video rounded-xl border border-dashed border-cyan-500/35 hover:border-cyan-400 hover:bg-cyan-500/10 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all text-cyan-700 dark:text-cyan-300"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-[10px] font-comfortaa font-bold">
                      {lang === 'ru' ? 'Ещё фото' : 'Add photo'}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-dashed transition-all cursor-pointer ${
                  isDragging
                    ? 'border-cyan-400 bg-cyan-500/10'
                    : 'bg-slate-50/70 dark:bg-[#0B101B]/70 border-slate-300 dark:border-white/[0.1] hover:border-cyan-500/45 dark:hover:border-cyan-400/40 hover:bg-cyan-500/[0.04]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                    <Paperclip className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-xs font-comfortaa font-bold text-slate-800 dark:text-slate-200 truncate">
                      {lang === 'ru'
                        ? 'Прикрепить скриншоты (можно несколько)'
                        : 'Attach screenshots (multiple supported)'}
                    </span>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {lang === 'ru'
                        ? 'Перетащите файлы или вставьте через Ctrl+V'
                        : 'Drag & drop files or paste with Ctrl+V'}
                    </span>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/25 text-xs font-comfortaa font-bold text-cyan-700 dark:text-cyan-300 whitespace-nowrap shrink-0">
                  <Plus className="w-3.5 h-3.5" />
                  <span>{lang === 'ru' ? 'Выбрать' : 'Browse'}</span>
                </span>
              </div>
            )}
          </div>

          {/* Pinned Single-Line Modal Footer */}
          <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-t border-slate-200/80 dark:border-white/[0.07] bg-slate-50/60 dark:bg-[#070B13]/80 shrink-0">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono hidden sm:inline-flex items-center gap-1.5 whitespace-nowrap">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-white/[0.07] border border-slate-300/60 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 text-[10px]">
                Ctrl+V
              </kbd>
              <span>{lang === 'ru' ? 'фото из буфера' : 'paste screenshot'}</span>
            </span>

            <div className="flex items-center gap-2.5 ml-auto shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/[0.08] text-xs font-comfortaa font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white whitespace-nowrap active:scale-[0.98] transition-all cursor-pointer"
              >
                {lang === 'ru' ? 'Отмена' : 'Cancel'}
              </button>

              <button
                type="submit"
                disabled={isSubmitting || (!content.trim() && images.length === 0)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 border border-cyan-400/40 text-xs font-comfortaa font-bold shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4),0_4px_14px_rgba(6,182,212,0.25)] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5),0_6px_18px_rgba(6,182,212,0.4)] active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap shrink-0 transition-all cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 shrink-0" />
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
