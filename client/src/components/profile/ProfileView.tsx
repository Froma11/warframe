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
    noteData: { title?: string; content: string; tag?: string; image_url?: string | null },
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
    loadNotes();
  };

  const handleAuthSuccess = (authUser: UserProfile) => {
    setUser(authUser);
    loadNotes();
  };

  return (
    <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-8 lg:px-10 py-6 sm:py-8 space-y-6 select-none font-sans animate-in fade-in duration-300">
      {/* 1. User Identity & Status Header */}
      <UserHeaderCard
        user={user}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        notesCount={notes.length}
        lang={lang}
      />

      {/* 2. Workspace Navigation Switcher */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-1">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100/90 dark:bg-[#070c18]/90 backdrop-blur-xl border border-slate-200 dark:border-white/[0.08] shadow-sm">
          <button
            type="button"
            onClick={() => setActiveSubTab('notes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-comfortaa font-bold transition-all cursor-pointer ${
              activeSubTab === 'notes'
                ? 'bg-gradient-to-r from-cyan-500/25 via-sky-500/20 to-cyan-500/25 border border-cyan-400/60 text-cyan-200 dark:text-white shadow-[0_0_16px_rgba(0,229,255,0.3)] scale-[1.02]'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.05]'
            }`}
          >
            <FileText className="w-4 h-4 text-cyan-400" />
            <span>{lang === 'ru' ? 'Торговый блокнот & Скриншоты' : 'Trade Notes & Screenshots'}</span>
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 font-mono text-[10px]">
              {notes.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('guide')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-comfortaa font-bold transition-all cursor-pointer ${
              activeSubTab === 'guide'
                ? 'bg-gradient-to-r from-cyan-500/25 via-sky-500/20 to-cyan-500/25 border border-cyan-400/60 text-cyan-200 dark:text-white shadow-[0_0_16px_rgba(0,229,255,0.3)] scale-[1.02]'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.05]'
            }`}
          >
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>{lang === 'ru' ? 'Справочник слияния мистификаторов' : 'Arcane Fusion Codex'}</span>
          </button>
        </div>
      </div>

      {/* 3. Active Workspace Content */}
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
        <div className="w-full max-w-4xl mx-auto animate-in fade-in duration-200">
          <ArcaneUpgradeGuide lang={lang} />
        </div>
      )}

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
