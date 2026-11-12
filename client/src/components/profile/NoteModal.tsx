import React, { useState, useEffect, useRef } from 'react';
import { X, FileText, Check, Image as ImageIcon, Trash2, Upload, Tag } from 'lucide-react';
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
      }, 60);
    }
  }, [isOpen, initialNote]);

  // Handle escape to close
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

  // Drag and Drop handlers
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none font-sans cursor-pointer overflow-y-auto"
      onClick={handleBackdropClick}
      onMouseDown={handleBackdropClick}
      onPaste={handlePaste}
    >
      <div
        className="relative w-full max-w-xl bg-white dark:bg-[#0c121d] border border-slate-200 dark:border-white/[0.12] rounded-3xl p-5 sm:p-7 shadow-[0_25px_70px_rgba(0,0,0,0.5),0_0_40px_rgba(0,229,255,0.15)] text-left cursor-default max-h-[92vh] overflow-y-auto flex flex-col"
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

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5 pr-10">
          <div className="w-10 h-10 rounded-2xl bg-[#00e5ff]/15 border border-[#00e5ff]/35 flex items-center justify-center text-[#00e5ff] shadow-[0_0_12px_rgba(0,229,255,0.2)] shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-comfortaa font-bold text-lg text-slate-900 dark:text-white">
              {isEditing
                ? lang === 'ru'
                  ? 'Редактировать заметку'
                  : 'Edit Note'
                : lang === 'ru'
                ? 'Новая заметка'
                : 'New Note'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#a3a29d]">
              {lang === 'ru'
                ? 'Вставляйте текст и скриншоты (поддерживается Ctrl+V)'
                : 'Save text and screenshots (supports Ctrl+V)'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col justify-between">
          <div className="space-y-4">
            {/* Category Tag Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-comfortaa font-bold text-slate-400 mr-1 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-cyan-400" />
                {lang === 'ru' ? 'Тег:' : 'Tag:'}
              </span>
              {PRESET_TAGS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedTag(t)}
                  className={`px-3 py-1 rounded-xl text-[11px] font-mono font-bold transition-all cursor-pointer ${
                    selectedTag === t
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-[0_0_10px_rgba(0,229,255,0.25)]'
                      : 'bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/[0.08] hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Content Textarea */}
            <div>
              <textarea
                ref={textareaRef}
                rows={5}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKeyDownOnTextarea}
                placeholder={
                  lang === 'ru'
                    ? 'Введите текст заметки, цены, билд, ник продавца... (или вставьте скриншот через Ctrl+V)'
                    : 'Type note text, prices, build, trader whisper... (or paste screenshot via Ctrl+V)'
                }
                className="w-full px-4 py-3 bg-slate-50 dark:bg-[#070a10] border border-slate-200 dark:border-white/[0.1] focus:border-[#00e5ff] rounded-2xl text-sm font-sans text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#71717a] outline-none transition-all shadow-inner focus:ring-1 focus:ring-[#00e5ff]/30 resize-none leading-relaxed"
              />
              <div className="flex items-center justify-between mt-1 px-1 text-[11px] text-slate-400 dark:text-[#71717a]">
                <span>{content.length > 0 ? `${content.length} симв.` : ''}</span>
                <span className="flex items-center gap-1 font-mono">
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.1] text-[10px]">
                    Ctrl+Enter
                  </kbd>
                  <span>{lang === 'ru' ? 'сохранить' : 'save'}</span>
                </span>
              </div>
            </div>

            {/* Image Attachment Dropzone & Preview */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileInputChange}
            />

            {imageUrl ? (
              <div className="relative rounded-2xl overflow-hidden border border-cyan-500/30 bg-[#040810] p-2 flex flex-col items-center group/img">
                <div className="relative w-full max-h-56 overflow-hidden rounded-xl bg-black/50 flex items-center justify-center">
                  <img
                    src={imageUrl}
                    alt="Attached preview"
                    className="max-h-56 w-auto object-contain rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setImageUrl(null)}
                    className="absolute top-2 right-2 p-2 rounded-xl bg-black/80 hover:bg-rose-600 text-white backdrop-blur-md transition-all cursor-pointer shadow-lg"
                    title={lang === 'ru' ? 'Удалить изображение' : 'Remove image'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="w-full flex items-center justify-between pt-2 px-1 text-[11px] text-slate-400 font-mono">
                  <span className="text-cyan-400">✓ {lang === 'ru' ? 'Фото прикреплено' : 'Photo attached'}</span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-slate-400 hover:text-white underline cursor-pointer"
                  >
                    {lang === 'ru' ? 'Заменить' : 'Replace'}
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
                  isDragging
                    ? 'border-cyan-400 bg-cyan-500/10 scale-[1.01]'
                    : 'border-slate-300 dark:border-white/[0.12] hover:border-cyan-400/60 hover:bg-cyan-500/5'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-comfortaa font-bold text-slate-700 dark:text-slate-200">
                    {lang === 'ru'
                      ? 'Нажмите для выбора фото или перетащите файл'
                      : 'Click to select photo or drag & drop'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {lang === 'ru'
                      ? 'Или просто нажмите Ctrl+V в любом месте для вставки скриншота'
                      : 'Or press Ctrl+V anywhere to paste screenshot'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/[0.08] mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-[#070a10] dark:hover:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] text-xs font-comfortaa font-bold text-slate-600 dark:text-[#a3a29d] hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
            >
              {lang === 'ru' ? 'Отмена' : 'Cancel'}
            </button>

            <button
              type="submit"
              disabled={isSubmitting || (!content.trim() && !imageUrl)}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#00e5ff] to-[#00b4d8] text-[#070a0e] text-xs font-comfortaa font-bold shadow-[0_0_20px_rgba(0,229,255,0.4)] hover:shadow-[0_0_28px_rgba(0,229,255,0.6)] hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer flex items-center gap-1.5"
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
                  ? 'Сохранить заметку'
                  : 'Save Note'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
