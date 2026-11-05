import React, { useState } from 'react';
import { Plus, Trash2, Copy, Check, Target, Clock, FileText } from 'lucide-react';
import { NoteModal } from './NoteModal';

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
  onAddNote: (note: { title: string; content: string; tag: string }) => Promise<void>;
  onDeleteNote: (id: number) => Promise<void>;
  lang: 'ru' | 'en';
}

export const NotesGrid: React.FC<NotesGridProps> = ({
  notes,
  onAddNote,
  onDeleteNote,
  lang,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const handleCopy = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getTagColor = (tag?: string) => {
    switch (tag) {
      case 'СНАЙПИНГ':
        return 'text-[#00e5ff] border-[#00e5ff]/40 bg-[#00e5ff]/10';
      case 'ТОРГОВЛЯ':
        return 'text-[#10b981] border-[#10b981]/40 bg-[#10b981]/10';
      case 'ФАРМ':
        return 'text-[#fbbf24] border-[#fbbf24]/40 bg-[#fbbf24]/10';
      case 'ИНВЕСТ':
        return 'text-[#c084fc] border-[#c084fc]/40 bg-[#c084fc]/10';
      default:
        return 'text-[#00e5ff] border-[#00e5ff]/40 bg-[#00e5ff]/10';
    }
  };

  return (
    <div className="w-full bg-[#0b1019]/90 border border-white/[0.1] rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md font-sans">
      
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#00e5ff]/20 to-[#3b82f6]/20 border border-[#00e5ff]/40 flex items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.25)]">
            <Target className="w-5 h-5 text-[#00e5ff]" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-comfortaa font-bold text-white tracking-wide flex items-center gap-2">
              {lang === 'ru' ? 'Торговые Цели и Заметки' : 'Trading Targets & Notes'}
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#00e5ff]/15 text-[#00e5ff] border border-[#00e5ff]/30">
                {notes.length}
              </span>
            </h2>
            <p className="text-xs text-[#a3a29d] font-sans mt-0.5">
              {lang === 'ru' ? 'Приватные заметки, привязанные к вашему профилю в базе SQLite' : 'Private notes & price targets persisted to your SQLite profile'}
            </p>
          </div>
        </div>

        {/* Add Note Button */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#00e5ff] to-[#00b4d8] text-[#070a0e] text-xs font-comfortaa font-bold shadow-[0_0_20px_rgba(0,229,255,0.4)] hover:shadow-[0_0_28px_rgba(0,229,255,0.6)] hover:scale-[1.03] active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{lang === 'ru' ? 'Новая цель' : 'New Target'}</span>
        </button>
      </div>

      {/* Grid of Notes or Empty State */}
      {notes.length === 0 ? (
        <div className="p-12 text-center flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-3xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mb-3 text-[#71717a]">
            <FileText className="w-6 h-6" />
          </div>
          <p className="text-sm text-[#cbd5e1] font-comfortaa font-bold">
            {lang === 'ru' ? 'У вас пока нет сохраненных целей' : 'No trade targets saved yet'}
          </p>
          <p className="text-xs text-[#a3a29d] max-w-md mt-1 mb-5">
            {lang === 'ru'
              ? 'Создайте заметку с порогом цены мистификатора, контактами продавца или инвестиционным планом'
              : 'Add a target note with buy/sell thresholds, contacts or arbitrage plans'}
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2 rounded-2xl bg-[#0e1624] hover:bg-[#142034] border border-[#00e5ff]/40 text-[#00e5ff] text-xs font-comfortaa font-bold transition-all cursor-pointer"
          >
            + {lang === 'ru' ? 'Добавить первую цель' : 'Add First Target'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
          {notes.map((note) => {
            const formattedDate = new Date(note.created_at).toLocaleDateString(
              lang === 'ru' ? 'ru-RU' : 'en-US',
              { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
            );

            return (
              <div
                key={note.id}
                className="group relative bg-[#070b12] hover:bg-[#0c121e] border border-white/[0.08] hover:border-[#00e5ff]/40 p-5 rounded-3xl transition-all duration-200 flex flex-col justify-between shadow-lg hover:shadow-[0_10px_30px_rgba(0,0,0,0.6)]"
              >
                <div>
                  {/* Top: Tag & Date */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`text-[10px] font-comfortaa font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${getTagColor(note.tag)}`}>
                      {note.tag || 'СНАЙПИНГ'}
                    </span>
                    <span className="text-[11px] text-[#71717a] flex items-center gap-1 font-sans">
                      <Clock className="w-3 h-3" />
                      {formattedDate}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="font-comfortaa font-bold text-base text-white group-hover:text-[#00e5ff] transition-colors line-clamp-1 mb-2">
                    {note.title}
                  </h3>

                  {/* Content */}
                  <p className="text-xs text-[#cbd5e1] font-sans leading-relaxed line-clamp-4 whitespace-pre-wrap">
                    {note.content}
                  </p>
                </div>

                {/* Footer Actions */}
                <div className="pt-3 mt-4 border-t border-white/[0.06] flex items-center justify-between text-xs">
                  <button
                    onClick={() => handleCopy(note.id, `${note.title}\n${note.content}`)}
                    className="flex items-center gap-1.5 text-[#a3a29d] hover:text-white transition-colors cursor-pointer"
                    title={lang === 'ru' ? 'Копировать' : 'Copy'}
                  >
                    {copiedId === note.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#10b981]" />
                        <span className="text-[#10b981] font-medium text-[11px]">
                          {lang === 'ru' ? 'Скопировано' : 'Copied'}
                        </span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span className="text-[11px]">{lang === 'ru' ? 'Копировать' : 'Copy'}</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => onDeleteNote(note.id)}
                    className="p-1.5 rounded-xl text-[#71717a] hover:text-[#f87171] hover:bg-[#f87171]/10 transition-colors cursor-pointer"
                    title={lang === 'ru' ? 'Удалить заметку' : 'Delete note'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Note Creation Modal */}
      <NoteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={onAddNote}
        lang={lang}
      />

    </div>
  );
};
