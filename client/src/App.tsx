import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { StarChartView } from './components/StarChartView';
import { SednaView } from './components/SednaView';
import { EarthView } from './components/EarthView';
import { ArcaneDrawer } from './components/ArcaneDrawer';
import { GatekeeperScreen } from './components/GatekeeperScreen';
import { ArcaneItem } from './types/arcane';
import { MOCK_ARCANES } from './data/mockArcanes';
import { Compass, ArrowLeftRight } from 'lucide-react';

export const App: React.FC = () => {
  // Gatekeeper state: strict lock screen
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('tenno_gate_auth') === 'true';
  });

  // Navigation state: Star Chart (default) vs Sedna (Market) vs Earth (Profile)
  const [activeTab, setActiveTab] = useState<'starchart' | 'sedna' | 'earth'>('starchart');
  const [earthSubTab, setEarthSubTab] = useState<'notes' | 'dossier' | 'database'>('notes');

  // Language state: RU or EN
  const [lang, setLang] = useState<'ru' | 'en'>('ru');

  // Market data state
  const [arcanes, setArcanes] = useState<ArcaneItem[]>(MOCK_ARCANES);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedArcane, setSelectedArcane] = useState<ArcaneItem | null>(null);
  const [lastUpdatedMinutes, setLastUpdatedMinutes] = useState(3);

  // Check auth cookie with backend on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/check', { credentials: 'include' });
        if (res.ok) {
          setIsAuthenticated(true);
          localStorage.setItem('tenno_gate_auth', 'true');
        } else if (localStorage.getItem('tenno_gate_auth') !== 'true') {
          setIsAuthenticated(false);
        }
      } catch {
        // keep localStorage state if offline
      }
    };
    checkAuth();
  }, []);

  // Fetch real items from backend /api/arcanes when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchArcanes = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/arcanes', { credentials: 'include' });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            setArcanes(json.data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch arcanes from API, using fallback data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchArcanes();
  }, [isAuthenticated]);

  // Lock session back to Gatekeeper
  const handleLockSession = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {}
    localStorage.removeItem('tenno_gate_auth');
    setIsAuthenticated(false);
  };

  // If unauthenticated: strictly render Gatekeeper screen
  if (!isAuthenticated) {
    return (
      <GatekeeperScreen
        onSuccess={() => setIsAuthenticated(true)}
        lang={lang}
      />
    );
  }

  const lastUpdatedText = lang === 'ru' 
    ? `СИНХРОНИЗИРОВАНО: ${lastUpdatedMinutes} МИН НАЗАД`
    : `SYNCED: ${lastUpdatedMinutes}M AGO`;

  return (
    <div className="min-h-screen bg-[#04060a] text-[#e9e8e4] flex flex-col font-raleway antialiased select-none">
      
      {/* 1. TOP STATUS BAR */}
      <Header
        lang={lang}
        onToggleLang={() => setLang((prev) => (prev === 'ru' ? 'en' : 'ru'))}
        itemsCount={arcanes.length}
        lastUpdatedText={lastUpdatedText}
        isStarChart={activeTab === 'starchart'}
        onGoToStarChart={() => setActiveTab('starchart')}
      />

      {/* 2. MAIN VIEW ENGINE */}
      {activeTab === 'starchart' ? (
        // A. FULL ORRERY STAR CHART
        <main className="flex-1 w-full">
          <StarChartView
            onSelectPlanet={(planet) => setActiveTab(planet)}
            lang={lang}
          />
        </main>
      ) : (
        // B. PLANETARY WORKSPACE
        <div className="flex-1 flex flex-col w-full animate-in fade-in duration-300">
          
          {/* SECTOR SUB-HEADER */}
          <section className="w-full bg-[#060a10]/95 border-b border-white/[0.08] px-4 sm:px-6 py-2 backdrop-blur-md sticky top-[45px] z-30 flex items-center justify-between font-mono text-xs select-none">
            
            {/* Left: Quick Back to Star Chart */}
            <button
              onClick={() => setActiveTab('starchart')}
              className="group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#090e17] hover:bg-[#00e5ff]/15 border border-white/[0.1] hover:border-[#00e5ff]/50 text-[#a3a29d] hover:text-[#00e5ff] transition-all text-xs"
            >
              <Compass className="w-3.5 h-3.5 text-[#00e5ff]" />
              <span className="font-semibold uppercase tracking-wider text-[11px]">
                {lang === 'ru' ? '◀ Звездная карта' : '◀ Star Chart'}
              </span>
            </button>

            {/* Center: Clean section title (strictly no planet names) */}
            <div className="flex items-center gap-2 text-xs">
              <span className={`w-2 h-2 rounded-full animate-pulse ${
                activeTab === 'sedna' ? 'bg-[#00e5ff]' : 'bg-[#10b981]'
              }`} />
              <span className="font-bold text-white tracking-wide">
                {activeTab === 'sedna'
                  ? (lang === 'ru' ? 'Маркет' : 'Market')
                  : (lang === 'ru' ? 'Профиль' : 'Profile')}
              </span>
            </div>

            {/* Right: Quick Hop between Market and Profile */}
            <button
              onClick={() => setActiveTab(activeTab === 'sedna' ? 'earth' : 'sedna')}
              className="group flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0a0f18] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/20 text-[#a3a29d] hover:text-white transition-all text-[11px]"
            >
              <ArrowLeftRight className="w-3 h-3 text-[#64748b] group-hover:text-[#00e5ff] transition-colors" />
              <span className="font-medium text-white group-hover:text-[#00e5ff] transition-colors">
                {activeTab === 'sedna' 
                  ? (lang === 'ru' ? 'Профиль ➔' : 'Profile ➔') 
                  : (lang === 'ru' ? 'Маркет ➔' : 'Market ➔')}
              </span>
            </button>
          </section>

          {/* Sector Body */}
          <main className="flex-1 w-full pb-16">
            {activeTab === 'sedna' ? (
              <SednaView
                arcanes={arcanes}
                onOpenDetails={(item) => setSelectedArcane(item)}
                lang={lang}
              />
            ) : (
              <EarthView
                subTab={earthSubTab}
                lang={lang}
                onLockSession={handleLockSession}
              />
            )}
          </main>
        </div>
      )}

      {/* 3. DETAIL DRAWER (TradingView Lightweight Charts & Online Orders) */}
      {selectedArcane && (
        <ArcaneDrawer
          arcane={selectedArcane}
          onClose={() => setSelectedArcane(null)}
          lang={lang}
        />
      )}

    </div>
  );
};

export default App;
