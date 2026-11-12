import React, { useState, useEffect } from 'react';
import { UserHeaderCard } from './UserHeaderCard';
import { NotesGrid, NoteItem } from './NotesGrid';
import { ArcaneUpgradeGuide } from './ArcaneUpgradeGuide';
import { AuthModal, UserProfile } from './AuthModal';

interface ProfileViewProps {
  lang: 'ru' | 'en';
}

export const ProfileView: React.FC<ProfileViewProps> = ({ lang }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // 1. Check user session on mount
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

  // 2. Fetch user notes from /api/notes
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

  // 3. Handle Add or Edit Note
  const handleSaveNote = async (
    noteData: { title?: string; content: string; tag?: string; image_url?: string | null },
    id?: number
  ) => {
    try {
      if (id) {
        // Edit existing note via PUT /api/notes/:id
        await fetch(`/api/notes/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(noteData),
        });
      } else {
        // Create new note via POST /api/notes
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

  // 4. Handle Delete Note
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

  // 5. Handle Logout
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {}
    setUser(null);
    loadNotes();
  };

  // 6. Handle Successful Auth (Register or Login)
  const handleAuthSuccess = (authUser: UserProfile) => {
    setUser(authUser);
    loadNotes();
  };

  return (
    <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-8 lg:px-10 py-6 sm:py-8 space-y-6 select-none font-sans animate-in fade-in duration-300">
      
      {/* 1. User Identity & Status Card */}
      <UserHeaderCard
        user={user}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        notesCount={notes.length}
        lang={lang}
      />

      {/* 2. Ergonomic 2-Column Balanced Dashboard (Notes Left 7-Cols, Fusion Guide Right 5-Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Trading Targets & Notes */}
        <div className="lg:col-span-7">
          <NotesGrid
            notes={notes}
            onAddNote={handleSaveNote}
            onDeleteNote={handleDeleteNote}
            lang={lang}
          />
        </div>

        {/* Right: Arcane Upgrade Fusion Guide */}
        <div className="lg:col-span-5">
          <ArcaneUpgradeGuide lang={lang} />
        </div>

      </div>

      {/* 3. Login / Registration Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        lang={lang}
      />

    </div>
  );
};
