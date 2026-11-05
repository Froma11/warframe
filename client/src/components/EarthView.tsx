import React, { useState, useEffect } from 'react';
import { ShieldCheck, Plus, Trash2, Copy, Check, Database, Terminal, User, FileText, KeyRound, Clock } from 'lucide-react';

interface Note {
  id: number;
  user_id: number;
  title: string;
  content: string;
  created_at: string;
}

interface EarthViewProps {
  subTab: 'notes' | 'dossier' | 'database';
  lang: 'ru' | 'en';
  onLockSession: () => void;
}

export const EarthView: React.FC<EarthViewProps> = ({ subTab, lang, onLockSession }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTag, setNewTag] = useState<'СНАЙПИНГ' | 'ТОРГОВЛЯ' | 'ФАРМ' | 'ЦЕЛЬ'>('СНАЙПИНГ');
  const [isAdding, setIsAdding] = useState(false);
  const [copiedNoteId, setCopiedNoteId] = useState<number | null>(null);

  // Fetch notes from /api/notes
  const loadNotes = async () => {
    try {
      const res = await fetch('/api/notes', { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setNotes(json.data);
        }
      }
    } catch (err) {
      console.error('Failed to load notes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() && !newContent.trim()) return;

    try {
      const titleWithTag = `[${newTag}] ${newTitle.trim() || 'Без названия'}`;
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: titleWithTag, content: newContent }),
      });

      if (res.ok) {
        setNewTitle('');
        setNewContent('');
        setIsAdding(false);
        loadNotes();
      }
    } catch (err) {
      console.error('Error creating note:', err);
    }
  };

  const handleDeleteNote = async (id: number) => {
    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setNotes((prev) => prev.filter((n) => n.id !== id));
      }
    } catch (err) {
      console.error('Error deleting note:', err);
    }
  };

  const handleCopyNote = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNoteId(id);
    setTimeout(() => setCopiedNoteId(null), 2000);
  };

  return (
    <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-8 py-6 space-y-6 select-none font-mono">
      
      {/* 2-Column Warframe Dossier Layout (Novagraphix reference image 1) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Operative Profile Dossier (Cols 1-4) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#141518] border border-white/[0.08] rounded-lg p-5">
            
            {/* Top Rank & Avatar (Novagraphix reference: rank 30 + Rhino silhouette) */}
            <div className="flex items-start justify-between border-b border-white/[0.08] pb-4 mb-4">
              <div>
                <span className="text-[10px] text-[#00e5ff] uppercase tracking-widest block">
                  {lang === 'ru' ? 'РАНГ МАСТЕРСТВА' : 'MASTERY RANK'}
                </span>
                <span className="text-2xl font-raleway font-medium text-white">
                  RANK 30
                </span>
                <span className="text-2xs text-[#a3a29d] block mt-0.5">
                  TRUE MASTER // TENNO
                </span>
              </div>

              <div className="w-12 h-12 rounded-lg bg-[#0e0f11] border border-[#00e5ff]/40 flex items-center justify-center text-[#00e5ff] shadow-[0_0_15px_rgba(0,229,255,0.2)]">
                <ShieldCheck className="w-6 h-6" />
              </div>
            </div>

            {/* Operative Telemetry Rows */}
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-2xs">
                <span className="text-[#a3a29d]">{lang === 'ru' ? 'СЕССИЯ:' : 'SESSION:'}</span>
                <span className="text-[#7fa88a] font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7fa88a]" />
                  {lang === 'ru' ? 'КЛЮЧ АКТИВЕН' : 'KEY ACTIVE'}
                </span>
              </div>

              <div className="flex items-center justify-between text-2xs">
                <span className="text-[#a3a29d]">{lang === 'ru' ? 'ПЛАТФОРМА:' : 'PLATFORM:'}</span>
                <span className="text-white">PC + CROSSPLAY</span>
              </div>

              <div className="flex items-center justify-between text-2xs">
                <span className="text-[#a3a29d]">{lang === 'ru' ? 'БАЗА ДАННЫХ:' : 'DATABASE:'}</span>
                <span className="text-[#b9a77a]">SQLite 3 (WAL MODE)</span>
              </div>

              <div className="flex items-center justify-between text-2xs">
                <span className="text-[#a3a29d]">{lang === 'ru' ? 'ЦИКЛ СИНХРОНИЗАЦИИ:' : 'SYNC CYCLE:'}</span>
                <span className="text-white">15 MIN CRON</span>
              </div>

              <div className="flex items-center justify-between text-2xs">
                <span className="text-[#a3a29d]">{lang === 'ru' ? 'ЗАМЕТОК В БАЗЕ:' : 'STORED NOTES:'}</span>
                <span className="text-[#00e5ff] font-medium">{notes.length}</span>
              </div>
            </div>

            {/* Security Action: Lock / Logout */}
            <div className="mt-5 pt-4 border-t border-white/[0.08]">
              <button
                onClick={onLockSession}
                className="w-full py-2 px-3 rounded bg-[#0e0f11] hover:bg-[#1a1b1f] border border-[#c27c70]/40 hover:border-[#c27c70] text-xs text-[#c27c70] hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{lang === 'ru' ? 'ЗАБЛОКИРОВАТЬ СЕССИЮ' : 'LOCK SESSION'}</span>
              </button>
            </div>

          </div>

          {/* Quick Stats Panel (Novagraphix reference: Survival 58min, Defense 57 waves...) */}
          <div className="bg-[#141518] border border-white/[0.08] rounded-lg p-5">
            <span className="text-[10px] text-[#00e5ff] uppercase tracking-widest block mb-3">
              {lang === 'ru' ? 'СТАТУС СЕРВЕРА // ТЕЛЕМЕТРИЯ' : 'SERVER TELEMETRY'}
            </span>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-[#0e0f11] p-3 rounded border border-white/[0.04]">
                <span className="text-2xs text-[#a3a29d] block">ПОРТ СЕРВЕРА</span>
                <span className="text-sm font-medium text-white mt-1 block">4000</span>
              </div>
              <div className="bg-[#0e0f11] p-3 rounded border border-white/[0.04]">
                <span className="text-2xs text-[#a3a29d] block">АРХИВ СНАПШОТОВ</span>
                <span className="text-sm font-medium text-[#b9a77a] mt-1 block">90 ДНЕЙ</span>
              </div>
              <div className="bg-[#0e0f11] p-3 rounded border border-white/[0.04]">
                <span className="text-2xs text-[#a3a29d] block">МИСТИКОВ</span>
                <span className="text-sm font-medium text-[#00e5ff] mt-1 block">170</span>
              </div>
              <div className="bg-[#0e0f11] p-3 rounded border border-white/[0.04]">
                <span className="text-2xs text-[#a3a29d] block">RATE LIMIT API</span>
                <span className="text-sm font-medium text-[#7fa88a] mt-1 block">600 MS</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Personal Notes / Dossier / Database View (Cols 5-12) */}
        <div className="lg:col-span-8 space-y-4">
          
          {subTab === 'notes' && (
            <>
              {/* Top Controls: Add New Note Button */}
              <div className="flex items-center justify-between bg-[#141518] border border-white/[0.08] p-4 rounded-lg">
                <div>
                  <h3 className="text-sm font-raleway font-medium text-white uppercase tracking-wide">
                    {lang === 'ru' ? 'ЛИЧНЫЕ ЗАМЕТКИ И ТОРГОВЫЕ ЦЕЛИ' : 'PERSONAL NOTES & TRADE TARGETS'}
                  </h3>
                  <p className="text-2xs text-[#a3a29d] mt-0.5">
                    {lang === 'ru' 
                      ? 'Сохраняются локально в базе данных SQLite. Доступны только после авторизации.' 
                      : 'Saved persistently in local SQLite database. Accessible only after authentication.'}
                  </p>
                </div>

                <button
                  onClick={() => setIsAdding(!isAdding)}
                  className="px-3.5 py-1.5 rounded bg-[#00e5ff]/10 hover:bg-[#00e5ff]/20 border border-[#00e5ff]/50 text-xs text-[#00e5ff] hover:text-white transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isAdding ? (lang === 'ru' ? 'ОТМЕНА' : 'CANCEL') : (lang === 'ru' ? 'НОВАЯ ЗАМЕТКА' : 'NEW NOTE')}</span>
                </button>
              </div>

              {/* Collapsible New Note Form */}
              {isAdding && (
                <form
                  onSubmit={handleCreateNote}
                  className="bg-[#141518] border border-[#00e5ff]/40 p-5 rounded-lg space-y-3 animate-in fade-in duration-200"
                >
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder={lang === 'ru' ? 'Заголовок цели (напр. Снайпинг Линьки)...' : 'Note Title...'}
                      className="flex-1 bg-[#0e0f11] border border-white/[0.08] focus:border-[#00e5ff] rounded px-3 py-2 text-xs text-white placeholder-[#6b6a66] outline-none"
                    />

                    {/* Tag Selector */}
                    <div className="flex items-center gap-1 bg-[#0e0f11] p-1 rounded border border-white/[0.08]">
                      {(['СНАЙПИНГ', 'ТОРГОВЛЯ', 'ФАРМ', 'ЦЕЛЬ'] as const).map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setNewTag(tag)}
                          className={`px-2 py-1 text-2xs uppercase rounded transition-colors ${
                            newTag === tag
                              ? 'bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/40'
                              : 'text-[#a3a29d] hover:text-white'
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    rows={3}
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder={lang === 'ru' ? 'Содержание заметки, пороги покупки/продажи, заметки по ценам...' : 'Note content...'}
                    className="w-full bg-[#0e0f11] border border-white/[0.08] focus:border-[#00e5ff] rounded px-3 py-2 text-xs text-white placeholder-[#6b6a66] outline-none resize-none"
                  />

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAdding(false)}
                      className="px-3 py-1.5 rounded bg-transparent hover:bg-white/[0.04] text-2xs text-[#a3a29d]"
                    >
                      {lang === 'ru' ? 'ОТМЕНА' : 'CANCEL'}
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded bg-[#00e5ff] hover:bg-[#38bdf8] text-xs font-medium text-black transition-colors"
                    >
                      {lang === 'ru' ? 'СОХРАНИТЬ В БАЗУ' : 'SAVE TO DB'}
                    </button>
                  </div>
                </form>
              )}

              {/* Notes Grid (Novagraphix reference weapon cards) */}
              {isLoading ? (
                <div className="p-8 text-center text-xs text-[#a3a29d]">
                  {lang === 'ru' ? 'Загрузка заметок...' : 'Loading notes...'}
                </div>
              ) : notes.length === 0 ? (
                <div className="bg-[#141518] border border-white/[0.08] rounded-lg p-12 text-center">
                  <FileText className="w-8 h-8 text-[#a3a29d] mx-auto mb-2 opacity-50" />
                  <p className="text-xs text-[#a3a29d]">
                    {lang === 'ru' 
                      ? 'У вас пока нет сохраненных заметок. Нажмите «Новая заметка», чтобы сохранить торговую цель.' 
                      : 'No notes stored yet. Click "New Note" to save trade targets.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="group bg-[#141518] hover:bg-[#1a1b1f] border border-white/[0.08] hover:border-[#00e5ff]/50 rounded-lg p-4 transition-all duration-150 flex flex-col justify-between"
                    >
                      <div>
                        {/* Note Header */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-raleway text-sm font-medium text-white group-hover:text-[#00e5ff] transition-colors truncate">
                            {note.title}
                          </h4>
                          <span className="text-[10px] text-[#6b6a66] shrink-0">
                            {new Date(note.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Note Content */}
                        <p className="text-xs text-[#a3a29d] leading-relaxed whitespace-pre-wrap font-mono line-clamp-4">
                          {note.content}
                        </p>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-2xs text-[#6b6a66]">
                        <span className="text-[10px]">ID: #{note.id}</span>

                        <div className="flex items-center gap-1.5">
                          {/* Copy button */}
                          <button
                            onClick={() => handleCopyNote(note.id, `${note.title}\n${note.content}`)}
                            className="p-1 rounded hover:bg-white/[0.06] text-[#a3a29d] hover:text-white transition-colors"
                            title="Скопировать текст"
                          >
                            {copiedNoteId === note.id ? (
                              <Check className="w-3.5 h-3.5 text-[#7fa88a]" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Delete button */}
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="p-1 rounded hover:bg-white/[0.06] text-[#a3a29d] hover:text-[#c27c70] transition-colors"
                            title="Удалить"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {subTab === 'dossier' && (
            <div className="bg-[#141518] border border-white/[0.08] rounded-lg p-6 space-y-4">
              <h3 className="text-sm font-medium uppercase text-white tracking-wider flex items-center gap-2">
                <User className="w-4 h-4 text-[#00e5ff]" />
                {lang === 'ru' ? 'ДОСЬЕ ОПЕРАТОРА // ДОСТУП ВЫСШЕГО ПОРЯДКА' : 'OPERATOR DOSSIER // HIGHEST CLEARANCE'}
              </h3>
              <p className="text-xs text-[#a3a29d] leading-relaxed">
                {lang === 'ru'
                  ? 'Доступ к терминалу заблокирован глобальным протоколом Tenno Cipher. Вход выполнен с использованием доверенного ключа сессии. Все торговые запросы к Warframe Market API отправляются через защищенный воркер бэкенда с контролируемым таймингом 600 мс во избежание банов.'
                  : 'Access to the terminal is guarded by the Tenno Cipher protocol. Verified using session master key. All Warframe Market API requests are proxied via background worker with 600ms delays.'}
              </p>
            </div>
          )}

          {subTab === 'database' && (
            <div className="bg-[#141518] border border-white/[0.08] rounded-lg p-6 space-y-4">
              <h3 className="text-sm font-medium uppercase text-white tracking-wider flex items-center gap-2">
                <Database className="w-4 h-4 text-[#b9a77a]" />
                {lang === 'ru' ? 'АРХИВ SQLITE // СТРУКТУРА ХРАНИЛИЩА' : 'SQLITE ARCHIVE // STORAGE SCHEMA'}
              </h3>
              <div className="space-y-3 text-xs text-[#a3a29d]">
                <div className="bg-[#0e0f11] p-3 rounded border border-white/[0.04]">
                  <strong className="text-white block mb-1">items</strong>
                  <span>170 торгуемых мистификаторов Warframe с официальными тегами, рангами и иконками.</span>
                </div>
                <div className="bg-[#0e0f11] p-3 rounded border border-white/[0.04]">
                  <strong className="text-white block mb-1">market_snapshots</strong>
                  <span>Снапшоты рынка каждые 15 минут (медиана цен, объемы, мин/макс). Хранятся 90 дней.</span>
                </div>
                <div className="bg-[#0e0f11] p-3 rounded border border-white/[0.04]">
                  <strong className="text-white block mb-1">notes</strong>
                  <span>Пользовательские торговые заметки и цели с сохранением в БД.</span>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
