import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { StarChartView } from './components/StarChartView';
import { SednaView } from './components/SednaView';
import { ProfileView } from './components/profile/ProfileView';
import { RivensEndoView } from './components/rivens/RivensEndoView';
import { ModAppraisalView } from './components/mod-appraisal/ModAppraisalView';
import { ArcaneDrawer } from './components/ArcaneDrawer';
import { GatekeeperScreen } from './components/GatekeeperScreen';
import { ArcaneItem } from './types/arcane';
import { MOCK_ARCANES } from './data/mockArcanes';

export const App: React.FC = () => {
  // Gatekeeper state: strict lock screen
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('tenno_gate_auth') === 'true';
  });

  // Navigation state: Star Chart (default) vs Sedna (Market) vs Earth (Profile) vs Venus (Rivens-endo) vs Mars (Mod Appraisal)
  const [activeTab, setActiveTab] = useState<'starchart' | 'sedna' | 'earth' | 'venus' | 'mars'>('starchart');

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

  // Ensure Star Chart ALWAYS remains deep dark space, regardless of light theme
  useEffect(() => {
    if (activeTab === 'starchart') {
      document.body.style.backgroundColor = '#020509';
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.backgroundColor = '';
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
  }, [activeTab]);

  // If unauthenticated: strictly render Gatekeeper screen
  if (!isAuthenticated) {
    return (
      <GatekeeperScreen
        onSuccess={() => setIsAuthenticated(true)}
        lang={lang}
      />
    );
  }

  const isStarChart = activeTab === 'starchart';

  return (
    <div
      className={`w-full flex flex-col font-sans antialiased select-none transition-colors duration-200 ${
        isStarChart
          ? 'h-screen overflow-hidden pt-[57px] bg-[#020509] text-[#e9e8e4]'
          : 'min-h-screen pt-[57px] bg-slate-100 dark:bg-[#04060a] text-slate-900 dark:text-[#e9e8e4]'
      }`}
    >
      {/* 1. TOP STATUS BAR (Sticky / Fixed at top across all scroll positions) */}
      <Header
        lang={lang}
        onToggleLang={() => setLang((prev) => (prev === 'ru' ? 'en' : 'ru'))}
        isStarChart={isStarChart}
        onGoToStarChart={() => setActiveTab('starchart')}
      />

      {/* 2. MAIN VIEW ENGINE */}
      {isStarChart ? (
        // A. FULL ORRERY STAR CHART (Always dark cosmic space, zero scrollbar)
        <main className="flex-1 h-full w-full bg-[#020509] flex flex-col overflow-hidden">
          <StarChartView
            onSelectPlanet={(planet) => setActiveTab(planet)}
            lang={lang}
          />
        </main>
      ) : (
        // B. PLANETARY WORKSPACE (Clean, no duplicate sub-header bars)
        <div className="flex-1 flex flex-col w-full animate-in fade-in duration-300">
          <main className="flex-1 w-full pb-16">
            {activeTab === 'sedna' ? (
              <SednaView
                arcanes={arcanes}
                onOpenDetails={(item) => setSelectedArcane(item)}
                lang={lang}
                lastUpdatedMinutes={lastUpdatedMinutes}
              />
            ) : activeTab === 'venus' ? (
              <RivensEndoView lang={lang} />
            ) : activeTab === 'earth' ? (
              <ProfileView lang={lang} />
            ) : (
              <ModAppraisalView lang={lang} />
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
