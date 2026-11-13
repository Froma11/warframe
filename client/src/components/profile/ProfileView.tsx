import React, { useState, useEffect } from 'react';
import { UserHeaderCard } from './UserHeaderCard';
import { NotesGrid, NoteItem } from './NotesGrid';
import { ArcaneUpgradeGuide } from './ArcaneUpgradeGuide';
import { AuthModal, UserProfile } from './AuthModal';
import { FileText, Layers } from 'lucide-react';

interface ProfileViewProps {
  lang: 'ru' | 'en';
}

export const ProfileView: React.FC<ProfileViewProps> = ({ lang }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'notes' | 'guide'>('notes');

  // Check user session
  const checkSession = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        if (json.authenticated && json.user) {
          setUser(json.user);
        } else {
          setUser(null);
        }
      }
    } catch {
      setUser(null);
    }
  };

  // Fetch user notes
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
    }
  };

  useEffect(() => {
    checkSession();
    loadNotes();
  }, []);

  // Handle Add or Edit Note
  const handleSaveNote = async (
    noteData: {
      title?: string;
      content: string;
      tag?: string;
      image_url?: string | null;
      images?: string[];
    },
    id?: number
  ) => {
    try {
      if (id) {
        await fetch(`/api/notes/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(noteData),
        });
      } else {
        await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(noteData),
        });
      }
      loadNotes();
    } catch (err) {
      console.error('Failed to save note:', err);
    }
  };

  // Handle Delete Note
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
      console.error('Failed to delete note:', err);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {}
    setUser(null);
    setNotes([]);
  };

  const handleAuthSuccess = (authUser: UserProfile) => {
    setUser(authUser);
    loadNotes();
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-5 select-none font-sans animate-in fade-in duration-300">
      {/* 1. Bento Identity & Telemetry Header */}
      <UserHeaderCard
        user={user}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        notesCount={notes.length}
        lang={lang}
      />

      {/* 2. Docked Workspace Section: Segmented Control + Active Content */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Physical Recessed Segmented Control */}
          <div
            role="tablist"
            aria-label={lang === 'ru' ? 'Разделы профиля' : 'Profile sections'}
            className="inline-flex items-center p-1 rounded-2xl bg-slate-200/75 dark:bg-[#070B13] border border-slate-300/80 dark:border-white/[0.08] shadow-[inset_0_2px_4px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)] w-full sm:w-auto"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeSubTab === 'notes'}
              onClick={() => setActiveSubTab('notes')}
              className={`relative flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-comfortaa font-bold transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                activeSubTab === 'notes'
                  ? 'bg-white dark:bg-[#101829] text-slate-900 dark:text-white border border-slate-200/90 dark:border-cyan-400/30 shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_4px_12px_rgba(0,0,0,0.45)]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent hover:bg-white/40 dark:hover:bg-white/[0.03]'
              }`}
            >
              <FileText
                className={`w-3.5 h-3.5 transition-colors ${
                  activeSubTab === 'notes' ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400 dark:text-slate-500'
                }`}
              />
              <span className="truncate">{lang === 'ru' ? 'Торговый блокнот & Скриншоты' : 'Trade Notes & Screenshots'}</span>
              <span
                className={`px-1.5 py-0.5 rounded-md font-mono text-[10px] tabular-nums transition-colors ${
                  activeSubTab === 'notes'
                    ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/25'
                    : 'bg-slate-300/60 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400'
                }`}
              >
                {notes.length}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeSubTab === 'guide'}
              onClick={() => setActiveSubTab('guide')}
              className={`relative flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-comfortaa font-bold transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                activeSubTab === 'guide'
                  ? 'bg-white dark:bg-[#101829] text-slate-900 dark:text-white border border-slate-200/90 dark:border-cyan-400/30 shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_4px_12px_rgba(0,0,0,0.45)]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent hover:bg-white/40 dark:hover:bg-white/[0.03]'
              }`}
            >
              <Layers
                className={`w-3.5 h-3.5 transition-colors ${
                  activeSubTab === 'guide' ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400 dark:text-slate-500'
                }`}
              />
              <span className="truncate">{lang === 'ru' ? 'Справочник слияния мистификаторов' : 'Arcane Fusion Codex'}</span>
            </button>
          </div>
        </div>

        {/* 3. Active Workspace Content (Unified Container Width) */}
        {activeSubTab === 'notes' ? (
          <div className="w-full animate-in fade-in duration-200">
            <NotesGrid
              notes={notes}
              onAddNote={handleSaveNote}
              onDeleteNote={handleDeleteNote}
              lang={lang}
            />
          </div>
        ) : (
          <div className="w-full animate-in fade-in duration-200">
            <ArcaneUpgradeGuide lang={lang} />
          </div>
        )}
      </div>

      {/* 4. Login / Registration Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        lang={lang}
      />
    </div>
  );
};
