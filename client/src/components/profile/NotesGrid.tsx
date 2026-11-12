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
    <div className="w-full bg-white dark:bg-[#080d18]/90 border border-slate-200 dark:border-white/[0.1] rounded-[28px] sm:rounded-3xl p-5 sm:p-7 shadow-2xl backdrop-blur-md font-sans transition-colors">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-5 border-b border-slate-200 dark:border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#00e5ff]/20 to-[#3b82f6]/20 border border-[#00e5ff]/40 flex items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.25)] shrink-0">
            <FileText className="w-5 h-5 text-[#00e5ff]" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-comfortaa font-bold text-slate-900 dark:text-white tracking-wide flex items-center gap-2">
              {lang === 'ru' ? 'Заметки & Скриншоты' : 'Notes & Screenshots'}
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#00e5ff]/15 text-[#00b4d8] dark:text-[#00e5ff] border border-[#00e5ff]/30 font-mono font-bold">
                {notes.length}
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-[#a3a29d] font-sans">
              {lang === 'ru'
                ? 'Приватные записи с фото и скриншотами (поддерживает несколько фото и Ctrl+V)'
                : 'Private trade notes with photo attachments & multi-screenshot support'}
            </p>
          </div>
        </div>

        {/* Add Note Button */}
        <button
          onClick={() => {
            setEditingNote(null);
            setIsCreateModalOpen(true);
          }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#00e5ff] to-[#00b4d8] text-[#070a0e] text-xs font-comfortaa font-bold shadow-[0_0_15px_rgba(0,229,255,0.35)] hover:shadow-[0_0_24px_rgba(0,229,255,0.55)] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{lang === 'ru' ? 'Новая заметка' : 'New Note'}</span>
        </button>
      </div>

      {/* User Topics Filter Bar (Dynamic, created by the user) */}
      {userCategories.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-4 pb-2">
          <button
            type="button"
            onClick={() => setActiveCategory('ВСЕ')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
              activeCategory === 'ВСЕ'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-[0_0_12px_rgba(0,229,255,0.25)]'
                : 'bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/[0.08] hover:text-white'
            }`}
          >
            {lang === 'ru' ? 'ВСЕ' : 'ALL'}
          </button>
          {userCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                activeCategory === cat
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-[0_0_12px_rgba(0,229,255,0.25)]'
                  : 'bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/[0.08] hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Search & Sort Toolbar */}
      <div className="flex items-center justify-between gap-3 pt-3 pb-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#71717a]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              lang === 'ru'
                ? 'Поиск по тексту или темам заметок...'
                : 'Search notes by text or topic...'
            }
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-[#060a12] border border-slate-200 dark:border-white/[0.08] focus:border-[#00e5ff]/60 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#71717a] outline-none transition-colors"
          />
        </div>

        {/* Sort order toggle */}
        <button
          onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-[#a3a29d] hover:text-slate-900 dark:hover:text-white text-xs font-comfortaa font-bold transition-colors cursor-pointer shrink-0"
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
          <ArrowUpDown className="w-3.5 h-3.5 text-[#00e5ff]" />
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

      {/* Grid of Notes or Empty State */}
      {filteredNotes.length === 0 ? (
        <div className="p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] flex items-center justify-center mb-3 text-slate-400 dark:text-[#71717a]">
            <FileText className="w-7 h-7" />
          </div>
          <p className="text-sm text-slate-800 dark:text-[#cbd5e1] font-comfortaa font-bold">
            {lang === 'ru' ? 'Заметок не найдено' : 'No notes found'}
          </p>
          <p className="text-xs text-slate-500 dark:text-[#a3a29d] max-w-xs mt-1 mb-4">
            {lang === 'ru'
              ? 'Создайте заметку, укажите свою тему и прикрепите скриншоты'
              : 'Create a note, specify your topic and attach screenshots'}
          </p>
          <button
            onClick={() => {
              setEditingNote(null);
              setIsCreateModalOpen(true);
            }}
            className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-[#0e1624] dark:hover:bg-[#142236] border border-slate-200 dark:border-[#00e5ff]/40 text-[#00b4d8] dark:text-[#00e5ff] text-xs font-comfortaa font-bold transition-all cursor-pointer"
          >
            + {lang === 'ru' ? 'Добавить заметку' : 'Add Note'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5 mt-3">
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

            return (
              <div
                key={note.id}
                onClick={() => setSelectedNote(note)}
                className="group relative bg-slate-50/90 dark:bg-gradient-to-b dark:from-[#090e18] dark:to-[#060a12] hover:bg-white dark:hover:from-[#0d1424] dark:hover:to-[#080d1a] border border-slate-200/90 dark:border-white/[0.08] hover:border-cyan-400/50 p-5 sm:p-6 rounded-[26px] sm:rounded-3xl transition-all duration-300 flex flex-col justify-between shadow-md hover:shadow-[0_16px_40px_rgba(0,0,0,0.5),0_0_24px_rgba(0,229,255,0.15)] hover:-translate-y-0.5 cursor-pointer overflow-hidden min-w-0 max-w-full break-words"
              >
                <div className="min-w-0 w-full">
                  {/* Top Bar: Date, Tag & Actions */}
                  <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-200/60 dark:border-white/[0.06]">
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      <span className="text-[11px] text-slate-400 dark:text-[#71717a] flex items-center gap-1 font-sans shrink-0">
                        <Clock className="w-3 h-3 text-[#00e5ff]" />
                        {formattedDate}
                      </span>
                      {note.tag && (
                        <span className="px-2.5 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[10px] font-mono font-bold tracking-wider truncate max-w-[140px]">
                          {note.tag}
                        </span>
                      )}
                    </div>

                    {/* Quick Action Icons */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Download photo directly from card if images present */}
                      {noteImages.length > 0 && (
                        <button
                          onClick={(e) => handleDownloadClick(e, noteImages[0], note.id)}
                          className="p-1.5 rounded-lg text-cyan-400 hover:text-white hover:bg-cyan-500/20 transition-colors cursor-pointer"
                          title={lang === 'ru' ? 'Скачать фото' : 'Download photo'}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Copy content */}
                      <button
                        onClick={(e) => handleCopy(e, note.id, noteText)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-[#a3a29d] dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
                        title={lang === 'ru' ? 'Скопировать текст' : 'Copy text'}
                      >
                        {copiedId === note.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-[#10b981]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Edit */}
                      <button
                        onClick={(e) => handleEditClick(e, note)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[#0284c7] hover:bg-sky-50 dark:text-[#71717a] dark:hover:text-[#00e5ff] dark:hover:bg-[#00e5ff]/10 transition-colors cursor-pointer"
                        title={lang === 'ru' ? 'Редактировать' : 'Edit'}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={(e) => handleDelete(e, note.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:text-[#71717a] dark:hover:text-[#f87171] dark:hover:bg-[#f87171]/10 transition-colors cursor-pointer"
                        title={lang === 'ru' ? 'Удалить' : 'Delete'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Attached Images Gallery Preview */}
                  {noteImages.length > 0 && (
                    <div className="mb-3">
                      {noteImages.length === 1 ? (
                        // Single Image Preview
                        <div
                          className="relative w-full h-44 rounded-2xl overflow-hidden bg-black/60 border border-slate-200/80 dark:border-white/[0.08] group/thumb flex items-center justify-center cursor-zoom-in"
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
                            <span className="p-2 rounded-xl bg-black/75 text-white backdrop-blur-md">
                              <Maximize2 className="w-4 h-4" />
                            </span>
                          </div>
                        </div>
                      ) : noteImages.length === 2 ? (
                        // Two Images Grid
                        <div className="grid grid-cols-2 gap-2 h-44 rounded-2xl overflow-hidden">
                          {noteImages.slice(0, 2).map((img, idx) => (
                            <div
                              key={idx}
                              className="relative w-full h-full bg-black/60 border border-white/[0.08] rounded-xl overflow-hidden cursor-zoom-in group/sub"
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
                        // 3+ Images Collage with Count Badge
                        <div className="grid grid-cols-3 gap-2 h-44 rounded-2xl overflow-hidden">
                          <div
                            className="col-span-2 relative w-full h-full bg-black/60 border border-white/[0.08] rounded-xl overflow-hidden cursor-zoom-in group/sub"
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
                              className="relative flex-1 bg-black/60 border border-white/[0.08] rounded-xl overflow-hidden cursor-zoom-in"
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
                              className="relative flex-1 bg-black/60 border border-white/[0.08] rounded-xl overflow-hidden cursor-zoom-in flex items-center justify-center group/badge"
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

                  {/* Note Body Text */}
                  {noteText && (
                    <p className="text-xs sm:text-sm text-slate-800 dark:text-[#cbd5e1] font-sans leading-relaxed line-clamp-4 whitespace-pre-wrap select-text break-words overflow-hidden">
                      {noteText}
                    </p>
                  )}
                </div>

                {/* Footer Copied Feedback */}
                {copiedId === note.id && (
                  <div className="pt-2 text-[10px] text-emerald-600 dark:text-[#10b981] font-comfortaa font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>
                      {lang === 'ru'
                        ? 'Текст скопирован в буфер'
                        : 'Copied to clipboard'}
                    </span>
                  </div>
                )}
              </div>
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