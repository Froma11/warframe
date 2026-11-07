import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Header } from './components/Header';
import { StarChartView } from './components/StarChartView';
import { GatekeeperScreen } from './components/GatekeeperScreen';
import { ArcaneItem } from './types/arcane';
import { MOCK_ARCANES } from './data/mockArcanes';

// Lazy-load secondary planetary workspaces to ensure instant sub-second initial load and zero freeze
const SednaView = lazy(() => import('./components/SednaView').then((m) => ({ default: m.SednaView })));
const ProfileView = lazy(() => import('./components/profile/ProfileView').then((m) => ({ default: m.ProfileView })));
const RivensEndoView = lazy(() => import('./components/rivens/RivensEndoView').then((m) => ({ default: m.RivensEndoView })));
const ModAppraisalView = lazy(() => import('./components/mod-appraisal/ModAppraisalView').then((m) => ({ default: m.ModAppraisalView })));
const ArcaneDrawer = lazy(() => import('./components/ArcaneDrawer').then((m) => ({ default: m.ArcaneDrawer })));

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

  // Fetch real items from backend /api/arcanes when authenticated (deferred to idle to avoid star chart frame drops)
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

    if (activeTab === 'starchart') {
      if (typeof window.requestIdleCallback === 'function') {
        const handle = window.requestIdleCallback(() => fetchArcanes(), { timeout: 1500 });
        return () => window.cancelIdleCallback(handle);
      } else {
        const timeoutId = setTimeout(fetchArcanes, 400);
        return () => clearTimeout(timeoutId);
      }
    } else {
      fetchArcanes();
    }
  }, [isAuthenticated, activeTab === 'sedna']);

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
            <Suspense
              fallback={
                <div className="flex-1 min-h-[50vh] flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full border-2 border-cyan-500/20 border-t-cyan-500 animate-spin" />
                </div>
              }
            >
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
            </Suspense>
          </main>
        </div>
      )}

      {/* 3. DETAIL DRAWER (TradingView Lightweight Charts & Online Orders) */}
      {selectedArcane && (
        <Suspense fallback={null}>
          <ArcaneDrawer
            arcane={selectedArcane}
            onClose={() => setSelectedArcane(null)}
            lang={lang}
          />
        </Suspense>
      )}
    </div>
  );
};

export default App;
