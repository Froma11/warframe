import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Copy, Check, Target, Clock, FileText, Search, Edit3, ArrowUpDown } from 'lucide-react';
import { NoteModal } from './NoteModal';
import { NoteDetailModal } from './NoteDetailModal';

export interface NoteItem {
  id: number;
  user_id: number;
  title: string;
  content: string;
  tag?: string;
  created_at: string;
}

interface NotesGridProps {
  notes: NoteItem[];
  onAddNote: (note: { title: string; content: string; tag: string }, id?: number) => Promise<void>;
  onDeleteNote: (id: number) => Promise<void>;
  lang: 'ru' | 'en';
}

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

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

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

  const getTagColor = (tag?: string) => {
    switch (tag) {
      case 'СНАЙПИНГ':
        return 'text-[#0284c7] dark:text-[#00e5ff] border-[#00e5ff]/40 bg-[#00e5ff]/10';
      case 'ТОРГОВЛЯ':
        return 'text-emerald-600 dark:text-[#10b981] border-[#10b981]/40 bg-[#10b981]/10';
      case 'ФАРМ':
        return 'text-amber-600 dark:text-[#fbbf24] border-[#fbbf24]/40 bg-[#fbbf24]/10';
      case 'ИНВЕСТ':
        return 'text-purple-600 dark:text-[#c084fc] border-[#c084fc]/40 bg-[#c084fc]/10';
      default:
        return 'text-[#0284c7] dark:text-[#00e5ff] border-[#00e5ff]/40 bg-[#00e5ff]/10';
    }
  };

  // Filter & Sort Logic
  const filteredNotes = useMemo(() => {
    return notes
      .filter((n) => {
        if (selectedTag !== 'ALL' && (n.tag || 'СНАЙПИНГ') !== selectedTag) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = n.title.toLowerCase().includes(q);
          const matchContent = n.content.toLowerCase().includes(q);
          return matchTitle || matchContent;
        }
        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.created_at).getTime();
        const timeB = new Date(b.created_at).getTime();
        return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
      });
  }, [notes, selectedTag, searchQuery, sortOrder]);

  return (
    <div className="w-full bg-white dark:bg-[#0b1019]/90 border border-slate-200 dark:border-white/[0.1] rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-md font-sans transition-colors">
      
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-5 border-b border-slate-200 dark:border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#00e5ff]/20 to-[#3b82f6]/20 border border-[#00e5ff]/40 flex items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.25)]">
            <Target className="w-4 h-4 text-[#00e5ff]" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-comfortaa font-bold text-slate-900 dark:text-white tracking-wide flex items-center gap-2">
              {lang === 'ru' ? 'Торговые Цели' : 'Trade Targets'}
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#00e5ff]/15 text-[#00b4d8] dark:text-[#00e5ff] border border-[#00e5ff]/30">
                {notes.length}
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-[#a3a29d] font-sans">
              {lang === 'ru' ? 'Приватные цели и пороги цен в SQLite' : 'Private target notes in SQLite'}
            </p>
          </div>
        </div>

        {/* Add Note Button */}
        <button
          onClick={() => {
            setEditingNote(null);
            setIsCreateModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-[#00e5ff] to-[#00b4d8] text-[#070a0e] text-xs font-comfortaa font-bold shadow-[0_0_15px_rgba(0,229,255,0.35)] hover:shadow-[0_0_24px_rgba(0,229,255,0.55)] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{lang === 'ru' ? 'Новая цель' : 'New Target'}</span>
        </button>
      </div>

      {/* Filter Toolbar: Search, Category Tag Filter, Sort */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 pb-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#71717a]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === 'ru' ? 'Поиск заметок...' : 'Search targets...'}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-[#060a12] border border-slate-200 dark:border-white/[0.08] rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#71717a] outline-none focus:border-[#00e5ff] transition-colors"
          />
        </div>

        {/* Tag Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {['ALL', 'СНАЙПИНГ', 'ТОРГОВЛЯ', 'ФАРМ', 'ИНВЕСТ'].map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTag(t)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-comfortaa font-bold transition-all cursor-pointer ${
                selectedTag === t
                  ? 'bg-[#00e5ff]/20 text-[#00b4d8] dark:text-[#00e5ff] border border-[#00e5ff]/50'
                  : 'text-slate-500 hover:text-slate-900 dark:text-[#71717a] dark:hover:text-white bg-slate-100 dark:bg-white/[0.03] border border-transparent'
              }`}
            >
              {t === 'ALL' ? (lang === 'ru' ? 'Все' : 'All') : t}
            </button>
          ))}

          {/* Sort order toggle */}
          <button
            onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
            className="p-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-[#a3a29d] hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer ml-1"
            title={sortOrder === 'newest' ? (lang === 'ru' ? 'Сначала новые' : 'Newest first') : (lang === 'ru' ? 'Сначала старые' : 'Oldest first')}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Grid of Notes or Empty State */}
      {filteredNotes.length === 0 ? (
        <div className="p-8 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] flex items-center justify-center mb-3 text-slate-400 dark:text-[#71717a]">
            <FileText className="w-5 h-5" />
          </div>
          <p className="text-sm text-slate-800 dark:text-[#cbd5e1] font-comfortaa font-bold">
            {lang === 'ru' ? 'Целей не найдено' : 'No targets found'}
          </p>
          <p className="text-xs text-slate-500 dark:text-[#a3a29d] max-w-xs mt-1 mb-4">
            {lang === 'ru' ? 'Создайте новую торговую цель для отслеживания цен' : 'Create a target note to track prices'}
          </p>
          <button
            onClick={() => {
              setEditingNote(null);
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-[#0e1624] dark:hover:bg-[#142236] border border-slate-200 dark:border-[#00e5ff]/40 text-[#00b4d8] dark:text-[#00e5ff] text-xs font-comfortaa font-bold transition-all cursor-pointer"
          >
            + {lang === 'ru' ? 'Добавить цель' : 'Add Target'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-4">
          {filteredNotes.map((note) => {
            const formattedDate = new Date(note.created_at).toLocaleDateString(
              lang === 'ru' ? 'ru-RU' : 'en-US',
              { day: 'numeric', month: 'short' }
            );

            return (
              <div
                key={note.id}
                onClick={() => setSelectedNote(note)}
                className="group relative bg-slate-50 dark:bg-[#070b12] hover:bg-white dark:hover:bg-[#0c121e] border border-slate-200 dark:border-white/[0.08] hover:border-[#00e5ff]/50 p-4 rounded-2xl transition-all duration-200 flex flex-col justify-between shadow-sm hover:shadow-md cursor-pointer"
              >
                <div>
                  {/* Top: Tag & Date */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`text-[10px] font-comfortaa font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getTagColor(note.tag)}`}>
                      {note.tag || 'СНАЙПИНГ'}
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-[#71717a] flex items-center gap-1 font-sans">
                      <Clock className="w-3 h-3" />
                      {formattedDate}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="font-comfortaa font-bold text-sm text-slate-900 dark:text-white group-hover:text-[#0284c7] dark:group-hover:text-[#00e5ff] transition-colors line-clamp-1 mb-1">
                    {note.title}
                  </h3>

                  {/* Content Preview */}
                  <p className="text-xs text-slate-600 dark:text-[#a3a29d] font-sans leading-relaxed line-clamp-2">
                    {note.content}
                  </p>
                </div>

                {/* Footer Actions */}
                <div className="pt-2.5 mt-3 border-t border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between text-xs">
                  <button
                    onClick={(e) => handleCopy(e, note.id, `${note.title}\n${note.content}`)}
                    className="flex items-center gap-1 text-slate-500 hover:text-slate-900 dark:text-[#a3a29d] dark:hover:text-white transition-colors cursor-pointer text-[11px]"
                    title={lang === 'ru' ? 'Копировать' : 'Copy'}
                  >
                    {copiedId === note.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-[#10b981]" />
                        <span className="text-emerald-600 dark:text-[#10b981] font-medium">{lang === 'ru' ? 'Скопировано' : 'Copied'}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>{lang === 'ru' ? 'Копия' : 'Copy'}</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleEditClick(e, note)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#0284c7] hover:bg-sky-50 dark:text-[#71717a] dark:hover:text-[#00e5ff] dark:hover:bg-[#00e5ff]/10 transition-colors cursor-pointer"
                      title={lang === 'ru' ? 'Редактировать' : 'Edit'}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, note.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:text-[#71717a] dark:hover:text-[#f87171] dark:hover:bg-[#f87171]/10 transition-colors cursor-pointer"
                      title={lang === 'ru' ? 'Удалить' : 'Delete'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Note Creation / Editing Modal */}
      <NoteModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingNote(null);
        }}
        onSave={onAddNote}
        initialNote={editingNote}
        lang={lang}
      />

      {/* Full View Note Detail Modal */}
      <NoteDetailModal
        note={selectedNote}
        isOpen={!!selectedNote}
        onClose={() => setSelectedNote(null)}
        onEdit={(note) => {
          setEditingNote(note);
          setIsCreateModalOpen(true);
        }}
        onDelete={onDeleteNote}
        lang={lang}
      />

    </div>
  );
};
