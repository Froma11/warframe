import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  Trash2,
  Copy,
  Check,
  Clock,
  FileText,
  Search,
  Edit3,
  ArrowUpDown,
  Download,
  Maximize2,
  Tag,
  X,
  Images,
} from 'lucide-react';
import { NoteModal } from './NoteModal';
import { NoteDetailModal } from './NoteDetailModal';

export interface NoteItem {
  id: number;
  user_id: number;
  title?: string;
  content: string;
  tag?: string;
  image_url?: string | null;
  images?: string[];
  created_at: string;
}

interface NotesGridProps {
  notes: NoteItem[];
  onAddNote: (
    note: {
      title?: string;
      content: string;
      tag?: string;
      image_url?: string | null;
      images?: string[];
    },
    id?: number
  ) => Promise<void>;
  onDeleteNote: (id: number) => Promise<void>;
  lang: 'ru' | 'en';
}

// Utility to trigger client-side download of an image
export const downloadImage = (dataUrl: string, filename = 'warframe-note.png') => {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Render trade note text with [Item Name] cyan pill badges and crisp monospace numbers/ratios
export const renderTradeNoteContent = (text: string): React.ReactNode => {
  if (!text) return null;

  const bracketParts = text.split(/(\[[^\]\n]+\])/g);
  const numericTokenRegex =
    /(?<![A-Za-zА-Яа-яЁё0-9])(\d+(?:[кk]\d+|[.,/:-]\d+)?(?:\s?(?:к|k|пл|pl|p|шт|pcs))?|[xх×]\d+)(?![A-Za-zА-Яа-яЁё0-9])/gi;

  return bracketParts.map((segment, segIdx) => {
    if (!segment) return null;

    const bracketMatch = segment.match(/^\[([^\]\n]+)\]$/);
    if (bracketMatch) {
      return (
        <span
          key={`tag-${segIdx}`}
          className="inline-flex items-center gap-1 px-1.5 py-[1px] mx-0.5 my-[1px] rounded-md bg-cyan-500/10 dark:bg-cyan-400/10 border border-cyan-500/30 dark:border-cyan-400/25 text-cyan-700 dark:text-cyan-300 font-medium text-[0.9em] leading-snug align-baseline shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
        >
          <Tag className="w-2.5 h-2.5 text-cyan-600 dark:text-cyan-400 shrink-0 opacity-85" />
          <span>{bracketMatch[1]}</span>
        </span>
      );
    }

    const subParts = segment.split(numericTokenRegex);
    return (
      <React.Fragment key={`txt-${segIdx}`}>
        {subParts.map((part, partIdx) => {
          if (!part) return null;
          if (partIdx % 2 === 1) {
            return (
              <span
                key={`num-${segIdx}-${partIdx}`}
                className="font-mono font-semibold text-slate-900 dark:text-white bg-slate-200/70 dark:bg-white/[0.07] border border-slate-300/60 dark:border-white/[0.08] px-1.5 py-[0.5px] mx-[1px] rounded text-[0.88em] tabular-nums"
              >
                {part}
              </span>
            );
          }
          return <React.Fragment key={`plain-${segIdx}-${partIdx}`}>{part}</React.Fragment>;
        })}
      </React.Fragment>
    );
  });
};

export const NotesGrid: React.FC<NotesGridProps> = ({
  notes,
  onAddNote,
  onDeleteNote,
  lang,
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);
  const [editingNote, setEditingNote] = useState<NoteItem | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('ВСЕ');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Search and Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Dynamic user-created categories (user creates topics, not forced by system)
  const userCategories = useMemo(() => {
    const set = new Set<string>();
    notes.forEach((n) => {
      const t = (n.tag || '').trim();
      if (t) set.add(t);
    });
    return Array.from(set);
  }, [notes]);

  const existingTags = userCategories;

  const handleCopy = (e: React.MouseEvent, id: number, text: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    onDeleteNote(id);
  };

  const handleEditClick = (e: React.MouseEvent, note: NoteItem) => {
    e.stopPropagation();
    setEditingNote(note);
    setIsCreateModalOpen(true);
  };

  const handleDownloadClick = (e: React.MouseEvent, url: string, id: number) => {
    e.stopPropagation();
    downloadImage(url, `warframe-note-${id}.png`);
  };

  // Filter & Sort Logic
  const filteredNotes = useMemo(() => {
    return notes
      .filter((n) => {
        // Tag filter
        if (activeCategory !== 'ВСЕ') {
          if ((n.tag || '').trim().toLowerCase() !== activeCategory.toLowerCase()) {
            return false;
          }
        }
        // Search query
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const noteText = (n.content || n.title || '').toLowerCase();
        const tagText = (n.tag || '').toLowerCase();
        return noteText.includes(q) || tagText.includes(q);
      })
      .sort((a, b) => {
        const timeA = new Date(a.created_at).getTime();
        const timeB = new Date(b.created_at).getTime();
        return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
      });
  }, [notes, activeCategory, searchQuery, sortOrder]);

  return (
    <div className="w-full relative overflow-hidden bg-white dark:bg-[#090D16] border border-slate-200/90 dark:border-white/[0.08] rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_20px_50px_rgba(0,0,0,0.45)] font-sans transition-colors">
      {/* Subtle Ambient Corner Gradient */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_100%_0%,rgba(6,182,212,0.06),transparent_45%)]"
      />

      {/* Section Header */}
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-white/[0.07]">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 dark:border-cyan-400/25 flex items-center justify-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] shrink-0">
            <FileText className="w-4.5 h-4.5 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-comfortaa font-bold text-slate-900 dark:text-white tracking-wide flex items-center gap-2">
              {lang === 'ru' ? 'Заметки & Скриншоты' : 'Notes & Screenshots'}
              <span className="text-xs px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/25 font-mono font-bold tabular-nums">
                {notes.length}
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-0.5">
              {lang === 'ru'
                ? 'Приватные записи с фото и скриншотами (поддерживает несколько фото и Ctrl+V)'
                : 'Private trade notes with photo attachments & multi-screenshot support'}
            </p>
          </div>
        </div>

        {/* Add Note Button */}
        <button
          type="button"
          onClick={() => {
            setEditingNote(null);
            setIsCreateModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-comfortaa font-bold shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4),0_4px_16px_rgba(6,182,212,0.3)] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5),0_6px_22px_rgba(6,182,212,0.45)] active:scale-[0.98] transition-all duration-150 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{lang === 'ru' ? 'Новая заметка' : 'New Note'}</span>
        </button>
      </div>

      {/* Unified Compact Toolbar: Topic Filters + Constrained Search & Sort */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-3 py-4 border-b border-slate-200/60 dark:border-white/[0.05]">
        {/* Left: User Topics Filter Bar (or subtle count indicator if none) */}
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {userCategories.length > 0 ? (
            <>
              <button
                type="button"
                onClick={() => setActiveCategory('ВСЕ')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all duration-150 cursor-pointer active:scale-[0.97] ${
                  activeCategory === 'ВСЕ'
                    ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]'
                    : 'bg-slate-100 dark:bg-white/[0.03] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/[0.07] hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-white/[0.15]'
                }`}
              >
                {lang === 'ru' ? 'ВСЕ' : 'ALL'}
              </button>
              {userCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all duration-150 cursor-pointer active:scale-[0.97] ${
                    activeCategory === cat
                      ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]'
                      : 'bg-slate-100 dark:bg-white/[0.03] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/[0.07] hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-white/[0.15]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </>
          ) : (
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
              {lang === 'ru'
                ? `Показано: ${filteredNotes.length}`
                : `Showing: ${filteredNotes.length}`}
            </span>
          )}
        </div>

        {/* Right: Constrained Search Input + Sort Toggle */}
        <div className="flex items-center gap-2 w-full lg:w-auto justify-end shrink-0">
          <div className="group/search relative flex-1 sm:flex-initial sm:w-72 lg:w-80 flex items-center bg-slate-50 dark:bg-[#060911] border border-slate-200 dark:border-white/[0.08] focus-within:border-cyan-500/60 dark:focus-within:border-cyan-400/50 focus-within:ring-2 focus-within:ring-cyan-500/15 dark:focus-within:ring-cyan-400/15 rounded-xl transition-all duration-150 shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.5)]">
            <Search className="w-3.5 h-3.5 ml-3 text-slate-400 dark:text-slate-500 group-focus-within/search:text-cyan-600 dark:group-focus-within/search:text-cyan-400 transition-colors shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                lang === 'ru'
                  ? 'Поиск по тексту или тегу...'
                  : 'Search by text or tag...'
              }
              className="w-full pl-2.5 pr-8 py-2 bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label={lang === 'ru' ? 'Очистить поиск' : 'Clear search'}
                className="absolute right-2 p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/70 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.16] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-comfortaa font-bold shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] active:scale-[0.97] transition-all duration-150 cursor-pointer shrink-0"
            title={
              sortOrder === 'newest'
                ? lang === 'ru'
                  ? 'Сначала новые'
                  : 'Newest first'
                : lang === 'ru'
                ? 'Сначала старые'
                : 'Oldest first'
            }
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span className="hidden sm:inline">
              {sortOrder === 'newest'
                ? lang === 'ru'
                  ? 'Новые'
                  : 'Newest'
                : lang === 'ru'
                ? 'Старые'
                : 'Oldest'}
            </span>
          </button>
        </div>
      </div>

      {/* Grid of Notes or Empty State */}
      {filteredNotes.length === 0 ? (
        <div className="relative z-10 p-12 text-center flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-[#0B101B] border border-slate-200 dark:border-white/[0.08] flex items-center justify-center mb-3 text-slate-400 dark:text-slate-500 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
            <FileText className="w-6 h-6" />
          </div>
          <p className="text-sm text-slate-800 dark:text-slate-200 font-comfortaa font-bold">
            {lang === 'ru' ? 'Заметок не найдено' : 'No notes found'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mt-1 mb-4">
            {lang === 'ru'
              ? 'Создайте заметку, укажите свою тему и прикрепите скриншоты'
              : 'Create a note, specify your topic and attach screenshots'}
          </p>
          <button
            type="button"
            onClick={() => {
              setEditingNote(null);
              setIsCreateModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#0E1624] dark:hover:bg-[#131F33] border border-slate-200 dark:border-cyan-400/35 text-cyan-700 dark:text-cyan-300 text-xs font-comfortaa font-bold active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{lang === 'ru' ? 'Добавить заметку' : 'Add Note'}</span>
          </button>
        </div>
      ) : (
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 pt-5">
          {filteredNotes.map((note) => {
            const noteText = note.content || note.title || '';
            const formattedDate = new Date(note.created_at).toLocaleDateString(
              lang === 'ru' ? 'ru-RU' : 'en-US',
              { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
            );

            // Extract all images
            const noteImages: string[] =
              Array.isArray(note.images) && note.images.length > 0
                ? note.images
                : note.image_url
                ? [note.image_url]
                : [];

            const isCopied = copiedId === note.id;

            return (
              <article
                key={note.id}
                onClick={() => setSelectedNote(note)}
                className="group relative flex flex-col justify-between rounded-2xl p-4 sm:p-5 bg-slate-50/90 dark:bg-[#0B101B] hover:bg-white dark:hover:bg-[#0F1625] border border-slate-200/90 dark:border-white/[0.08] hover:border-cyan-500/45 dark:hover:border-cyan-400/40 shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_10px_28px_rgba(0,0,0,0.35)] hover:shadow-md dark:hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.14),0_16px_36px_rgba(0,0,0,0.55)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer overflow-hidden min-w-0 max-w-full break-words"
              >
                {/* Top subtle edge highlight accent on hover */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/0 group-hover:via-cyan-400/50 to-transparent transition-all duration-300"
                />

                <div className="min-w-0 w-full">
                  {/* Top Bar: Date, Tag & Hover-revealed Quick Actions */}
                  <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-200/70 dark:border-white/[0.06]">
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-mono tabular-nums shrink-0">
                        <Clock className="w-3 h-3 text-cyan-600 dark:text-cyan-400/80" />
                        {formattedDate}
                      </span>
                      {note.tag && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/25 text-[10px] font-mono font-bold tracking-wide truncate max-w-[130px]">
                          <Tag className="w-2.5 h-2.5 shrink-0 opacity-80" />
                          <span className="truncate">{note.tag}</span>
                        </span>
                      )}
                    </div>

                    {/* Quick Action Icons (Smoothly revealed on hover/focus on desktop, always accessible on touch & when copied) */}
                    <div
                      className={`flex items-center gap-1 shrink-0 transition-all duration-150 ${
                        isCopied
                          ? 'opacity-100 translate-y-0'
                          : 'sm:opacity-0 sm:translate-y-0.5 sm:group-hover:opacity-100 sm:group-hover:translate-y-0 sm:group-focus-within:opacity-100'
                      }`}
                    >
                      {/* Download photo directly from card if images present */}
                      {noteImages.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => handleDownloadClick(e, noteImages[0], note.id)}
                          className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-cyan-700 dark:hover:text-cyan-300 hover:bg-cyan-500/15 border border-transparent hover:border-cyan-500/25 active:scale-90 transition-all cursor-pointer"
                          title={lang === 'ru' ? 'Скачать фото' : 'Download photo'}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Copy content with immediate emerald feedback */}
                      <button
                        type="button"
                        onClick={(e) => handleCopy(e, note.id, noteText)}
                        className={`p-1.5 rounded-lg border active:scale-90 transition-all cursor-pointer ${
                          isCopied
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-white/[0.08]'
                        }`}
                        title={lang === 'ru' ? 'Скопировать текст' : 'Copy text'}
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Edit */}
                      <button
                        type="button"
                        onClick={(e) => handleEditClick(e, note)}
                        className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-cyan-700 dark:hover:text-cyan-300 hover:bg-cyan-500/15 border border-transparent hover:border-cyan-500/25 active:scale-90 transition-all cursor-pointer"
                        title={lang === 'ru' ? 'Редактировать' : 'Edit'}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, note.id)}
                        className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/15 border border-transparent hover:border-rose-500/25 active:scale-90 transition-all cursor-pointer"
                        title={lang === 'ru' ? 'Удалить' : 'Delete'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Attached Images Gallery Preview */}
                  {noteImages.length > 0 && (
                    <div className="mb-3.5">
                      {noteImages.length === 1 ? (
                        <div
                          className="relative w-full h-44 rounded-xl overflow-hidden bg-black/60 border border-slate-200/80 dark:border-white/[0.08] group/thumb flex items-center justify-center cursor-zoom-in"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLightboxUrl(noteImages[0]);
                          }}
                        >
                          <img
                            src={noteImages[0]}
                            alt="Attachment"
                            className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                            <span className="p-2 rounded-xl bg-black/75 text-white backdrop-blur-md border border-white/10">
                              <Maximize2 className="w-4 h-4" />
                            </span>
                          </div>
                        </div>
                      ) : noteImages.length === 2 ? (
                        <div className="grid grid-cols-2 gap-2 h-44 rounded-xl overflow-hidden">
                          {noteImages.slice(0, 2).map((img, idx) => (
                            <div
                              key={idx}
                              className="relative w-full h-full bg-black/60 border border-slate-200/60 dark:border-white/[0.08] rounded-xl overflow-hidden cursor-zoom-in group/sub"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLightboxUrl(img);
                              }}
                            >
                              <img
                                src={img}
                                alt={`Attachment ${idx + 1}`}
                                className="w-full h-full object-cover group-hover/sub:scale-105 transition-transform duration-300"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 h-44 rounded-xl overflow-hidden">
                          <div
                            className="col-span-2 relative w-full h-full bg-black/60 border border-slate-200/60 dark:border-white/[0.08] rounded-xl overflow-hidden cursor-zoom-in group/sub"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLightboxUrl(noteImages[0]);
                            }}
                          >
                            <img
                              src={noteImages[0]}
                              alt="Attachment 1"
                              className="w-full h-full object-cover group-hover/sub:scale-105 transition-transform duration-300"
                            />
                          </div>

                          <div className="flex flex-col gap-2 h-full">
                            <div
                              className="relative flex-1 bg-black/60 border border-slate-200/60 dark:border-white/[0.08] rounded-xl overflow-hidden cursor-zoom-in"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLightboxUrl(noteImages[1]);
                              }}
                            >
                              <img
                                src={noteImages[1]}
                                alt="Attachment 2"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div
                              className="relative flex-1 bg-black/60 border border-slate-200/60 dark:border-white/[0.08] rounded-xl overflow-hidden cursor-zoom-in flex items-center justify-center group/badge"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedNote(note);
                              }}
                            >
                              <img
                                src={noteImages[2]}
                                alt="Attachment 3"
                                className="w-full h-full object-cover opacity-60"
                              />
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-mono font-bold text-xs">
                                +{noteImages.length - 2}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Smart Trade Note Body Text (Parses [Item Name] & trade values) */}
                  {noteText && (
                    <div className="text-xs sm:text-[13px] text-slate-700 dark:text-slate-300 font-sans leading-7 line-clamp-4 whitespace-pre-wrap select-text break-words overflow-hidden">
                      {renderTradeNoteContent(noteText)}
                    </div>
                  )}
                </div>

                {/* Card Bottom Status Strip */}
                {(isCopied || noteImages.length > 0) && (
                  <div className="mt-3 pt-2.5 border-t border-slate-200/50 dark:border-white/[0.05] flex items-center justify-between gap-2 text-[11px]">
                    {noteImages.length > 0 ? (
                      <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        <Images className="w-3 h-3 text-cyan-600 dark:text-cyan-400/80" />
                        <span>{noteImages.length}</span>
                      </span>
                    ) : (
                      <span />
                    )}

                    {isCopied && (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-mono font-semibold animate-in fade-in duration-150">
                        <Check className="w-3 h-3" />
                        <span>
                          {lang === 'ru' ? 'Скопировано' : 'Copied'}
                        </span>
                      </span>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Note Creation / Editing Modal (Rendered to body via createPortal) */}
      <NoteModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingNote(null);
        }}
        onSave={onAddNote}
        initialNote={editingNote}
        existingTags={existingTags}
        lang={lang}
      />

      {/* Note Detail Modal (Rendered to body via createPortal) */}
      <NoteDetailModal
        note={selectedNote}
        isOpen={!!selectedNote}
        onClose={() => setSelectedNote(null)}
        onEdit={(note) => {
          setSelectedNote(null);
          setEditingNote(note);
          setIsCreateModalOpen(true);
        }}
        onDelete={onDeleteNote}
        onOpenLightbox={(url) => setLightboxUrl(url)}
        lang={lang}
      />

      {/* Fullscreen High-Res Image Lightbox Modal (Portal to body) */}
      {lightboxUrl &&
        createPortal(
          <div
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200 cursor-pointer"
            onClick={() => setLightboxUrl(null)}
          >
            <div
              className="relative max-w-[92vw] max-h-[88vh] flex flex-col items-center cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top Bar with Download & Close */}
              <div className="w-full flex items-center justify-between gap-3 pb-3 px-1 text-white">
                <span className="text-xs font-comfortaa font-bold text-slate-300">
                  {lang === 'ru' ? 'Просмотр изображения' : 'Image Preview'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => downloadImage(lightboxUrl, 'warframe-screenshot.png')}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-comfortaa font-bold text-xs transition-all shadow-lg cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{lang === 'ru' ? 'Скачать' : 'Download'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLightboxUrl(null)}
                    className="p-1.5 rounded-xl bg-white/[0.1] hover:bg-white/[0.2] text-white transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Lightbox Image Container */}
              <div className="rounded-2xl overflow-hidden border border-white/[0.15] bg-black/80 shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
                <img
                  src={lightboxUrl}
                  alt="Enlarged view"
                  className="max-w-[90vw] max-h-[80vh] object-contain"
                />
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
