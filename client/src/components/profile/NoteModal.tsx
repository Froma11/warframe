import React, { useState, useEffect, useRef } from 'react';
import { X, FileText, Check, Image as ImageIcon, Trash2, Paperclip, Tag } from 'lucide-react';
import { NoteItem } from './NotesGrid';

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    note: { title?: string; content: string; tag?: string; image_url?: string | null },
    id?: number
  ) => Promise<void>;
  initialNote?: NoteItem | null;
  lang: 'ru' | 'en';
}

const PRESET_TAGS = ['СНАЙПИНГ', 'СДЕЛКИ', 'СБОРКИ', 'ЗАМЕТКИ'];

export const NoteModal: React.FC<NoteModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialNote,
  lang,
}) => {
  const [content, setContent] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('СНАЙПИНГ');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialNote) {
        setContent(initialNote.content || initialNote.title || '');
        setSelectedTag(initialNote.tag || 'СНАЙПИНГ');
        setImageUrl(initialNote.image_url || null);
      } else {
        setContent('');
        setSelectedTag('СНАЙПИНГ');
        setImageUrl(null);
      }
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 80);
    }
  }, [isOpen, initialNote]);

  // Escape key listener
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

  // Optimize & resize image before setting as dataURL
  const processImageFile = (file: File) => {
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
          const compressed = canvas.toDataURL('image/webp', 0.88);
          setImageUrl(compressed);
        } else {
          setImageUrl(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Clipboard Paste (Ctrl+V) handler for instant screenshot insertion
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          processImageFile(file);
          break;
        }
      }
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanText = content.trim();
    if (!cleanText && !imageUrl) return;

    setIsSubmitting(true);
    try {
      await onSave(
        { content: cleanText, title: '', tag: selectedTag, image_url: imageUrl },
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none font-sans cursor-pointer overflow-hidden"
      onClick={handleBackdropClick}
      onMouseDown={handleBackdropClick}
      onPaste={handlePaste}
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] bg-white dark:bg-[#0c121d] border border-slate-200 dark:border-white/[0.12] rounded-3xl p-5 sm:p-6 shadow-[0_25px_70px_rgba(0,0,0,0.6),0_0_40px_rgba(0,229,255,0.15)] text-left cursor-default flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header (Always pinned) */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-white/[0.08] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-cyan-500/15 border border-cyan-400/35 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(0,229,255,0.2)]">
              <FileText className="w-4 h-4" />
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
              <p className="text-xs text-slate-400 font-sans">
                {lang === 'ru' ? 'Текст, цены или прикрепленные скриншоты' : 'Text, pricing or attached screenshots'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between overflow-y-auto pt-4 space-y-4 pr-0.5">
          <div className="space-y-3.5">
            {/* Category Tag Selector */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-comfortaa font-bold text-slate-400 mr-1 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-cyan-400" />
                {lang === 'ru' ? 'Категория:' : 'Category:'}
              </span>
              {PRESET_TAGS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedTag(t)}
                  className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                    selectedTag === t
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-[0_0_10px_rgba(0,229,255,0.25)]'
                      : 'bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/[0.08] hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
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
                    ? 'Текст заметки: цена покупки/продажи, ник трейдера, билд...'
                    : 'Note text: buy/sell price, trader whisper, build reminder...'
                }
                className="w-full px-4 py-3 bg-slate-50 dark:bg-[#070a10] border border-slate-200 dark:border-white/[0.1] focus:border-cyan-400 rounded-2xl text-sm font-sans text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all shadow-inner focus:ring-1 focus:ring-cyan-400/30 resize-none leading-relaxed"
              />
              <div className="flex items-center justify-between mt-1 px-1 text-[11px] text-slate-400">
                <span>{content.length > 0 ? `${content.length} симв.` : ''}</span>
                <span className="font-mono text-[10px] opacity-75">
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/[0.08]">Ctrl+Enter</kbd>{' '}
                  {lang === 'ru' ? 'для сохранения' : 'to save'}
                </span>
              </div>
            </div>

            {/* Compact Image Attachment Strip */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileInputChange}
            />

            {imageUrl ? (
              <div className="relative rounded-2xl overflow-hidden border border-cyan-500/30 bg-[#040810] p-2.5 flex items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-16 h-16 object-cover rounded-xl border border-white/[0.1] shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-comfortaa font-bold text-white truncate">
                      {lang === 'ru' ? 'Скриншот прикреплен' : 'Screenshot attached'}
                    </p>
                    <p className="text-[11px] text-cyan-400 font-mono">
                      ✓ {lang === 'ru' ? 'Готово к сохранению' : 'Ready to save'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-comfortaa text-slate-300 transition-colors cursor-pointer"
                  >
                    {lang === 'ru' ? 'Заменить' : 'Replace'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageUrl(null)}
                    className="p-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 transition-colors cursor-pointer"
                    title={lang === 'ru' ? 'Удалить фото' : 'Delete photo'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex items-center justify-between p-3 rounded-2xl border border-dashed transition-all cursor-pointer ${
                  isDragging
                    ? 'border-cyan-400 bg-cyan-500/10'
                    : 'border-slate-300 dark:border-white/[0.12] hover:border-cyan-400/60 hover:bg-cyan-500/5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400 shrink-0">
                    <Paperclip className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-comfortaa font-bold text-slate-800 dark:text-slate-200">
                      {lang === 'ru' ? 'Прикрепить скриншот' : 'Attach screenshot'}
                    </span>
                    <span className="block text-[11px] text-slate-400">
                      {lang === 'ru' ? 'Или нажмите Ctrl+V в любом месте' : 'Or press Ctrl+V anywhere'}
                    </span>
                  </div>
                </div>

                <span className="text-xs font-comfortaa font-semibold text-cyan-400 shrink-0">
                  + {lang === 'ru' ? 'Выбрать' : 'Browse'}
                </span>
              </div>
            )}
          </div>

          {/* Modal Footer (Pinned to bottom, NEVER overflows) */}
          <div className="flex items-center justify-end gap-3 pt-3.5 border-t border-slate-200/80 dark:border-white/[0.08] shrink-0 mt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/[0.08] text-xs font-comfortaa font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
            >
              {lang === 'ru' ? 'Отмена' : 'Cancel'}
            </button>

            <button
              type="submit"
              disabled={isSubmitting || (!content.trim() && !imageUrl)}
              className="px-5 py-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-500 text-slate-950 text-xs font-comfortaa font-bold shadow-[0_0_20px_rgba(0,229,255,0.4)] hover:shadow-[0_0_28px_rgba(0,229,255,0.6)] hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer flex items-center gap-1.5"
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
        </form>
      </div>
    </div>
  );
};
