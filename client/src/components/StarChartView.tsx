import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Compass, Sparkles, TrendingUp, User, Shield, ChevronRight, Lock, Activity, Eye } from 'lucide-react';
import { PlatinumIcon } from './PlatinumIcon';

interface StarChartViewProps {
  onSelectPlanet: (planet: 'sedna' | 'earth') => void;
  lang: 'ru' | 'en';
  itemsCount: number;
}

export const StarChartView: React.FC<StarChartViewProps> = ({
  onSelectPlanet,
  lang,
  itemsCount,
}) => {
  const [hoveredPlanet, setHoveredPlanet] = useState<'sedna' | 'earth' | null>(null);
  const [approachingPlanet, setApproachingPlanet] = useState<'sedna' | 'earth' | null>(null);
  
  // Parallax mouse position
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Mouse move parallax handler
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (approachingPlanet) return;
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    const x = (clientX / innerWidth - 0.5) * 2; // -1 to 1
    const y = (clientY / innerHeight - 0.5) * 2; // -1 to 1
    setMouseOffset({ x, y });
  };

  // Generate deterministic stars
  const stars = useMemo(() => {
    const list = [];
    for (let i = 0; i < 90; i++) {
      const top = (i * 17.3 + (i % 7) * 11) % 100;
      const left = (i * 29.7 + (i % 5) * 19) % 100;
      const size = (i % 3 === 0) ? 2.5 : (i % 5 === 0) ? 2 : 1.5;
      const opacity = 0.25 + ((i % 10) / 10) * 0.65;
      const duration = 2.5 + (i % 5) * 1.2;
      list.push({ id: i, top, left, size, opacity, duration });
    }
    return list;
  }, []);

  // Approach trigger
  const handlePlanetClick = (planet: 'sedna' | 'earth') => {
    if (approachingPlanet) return;
    setApproachingPlanet(planet);

    // After camera dive finishes (650ms), notify parent
    setTimeout(() => {
      onSelectPlanet(planet);
    }, 650);
  };

  // Coordinates of planets for transform-origin on zoom
  const transformOrigin = useMemo(() => {
    if (approachingPlanet === 'sedna') return '75% 35%';
    if (approachingPlanet === 'earth') return '25% 65%';
    return '50% 50%';
  }, [approachingPlanet]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative w-full h-[calc(100vh-57px)] min-h-[680px] bg-[#04060a] overflow-hidden select-none font-mono flex items-center justify-center"
      style={{ perspective: '1200px' }}
    >
      {/* 1. ANAMORPHIC TOP HUD FLARE */}
      <div className="anamorphic-beam w-full absolute top-0 left-0 z-30 opacity-70" />

      {/* 2. PROCEDURAL WARFRAME DEEP VOID NEBULA */}
      <div 
        className="absolute inset-0 pointer-events-none transition-transform duration-700 ease-out"
        style={{
          transform: `scale(1.08) translate3d(${mouseOffset.x * -10}px, ${mouseOffset.y * -10}px, 0)`,
          background: `
            radial-gradient(circle at 50% 50%, rgba(2, 28, 44, 0.45) 0%, transparent 65%),
            radial-gradient(circle at 80% 25%, rgba(0, 229, 255, 0.08) 0%, transparent 45%),
            radial-gradient(circle at 20% 75%, rgba(16, 185, 129, 0.06) 0%, transparent 45%),
            radial-gradient(circle at 50% 50%, rgba(185, 167, 122, 0.04) 0%, transparent 70%)
          `,
        }}
      />

      {/* 3. TWINKLING BACKGROUND STARS */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: `translate3d(${mouseOffset.x * -18}px, ${mouseOffset.y * -18}px, 0)`,
        }}
      >
        {stars.map((s) => (
          <div
            key={s.id}
            className="absolute rounded-full bg-white"
            style={{
              top: `${s.top}%`,
              left: `${s.left}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              opacity: s.opacity,
              boxShadow: s.size > 2 ? '0 0 4px #00e5ff' : 'none',
              animation: `pulse ${s.duration}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>

      {/* 4. WARFRAME TACTICAL GRID OVERLAY */}
      <div className="absolute inset-0 warframe-grid opacity-15 pointer-events-none" />

      {/* 5. TOP SYSTEM STATUS TELEMETRY BANNER */}
      <div className="absolute top-6 inset-x-8 z-30 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#080d16]/80 border border-[#00e5ff]/30 shadow-[0_0_15px_rgba(0,229,255,0.15)] flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#00e5ff] animate-spin" style={{ animationDuration: '60s' }} />
            <span className="text-xs font-bold text-white tracking-widest uppercase">
              {lang === 'ru' ? 'СИСТЕМА ИСТОЧНИКА // НАВИГАЦИЯ' : 'ORIGIN SYSTEM // NAVIGATION'}
            </span>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-[#64748b] bg-white/[0.04] px-3 py-1.5 rounded-lg border border-white/[0.06]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
            {lang === 'ru' ? '2 ПЛАНЕТАРНЫХ СЕКТОРА АКТИВНЫ' : '2 SECTORS ONLINE'}
          </span>
        </div>

        <div className="text-right text-[11px] text-[#64748b] font-mono">
          <span className="text-[#00e5ff] font-bold">ORRERY V4.8</span> // COORD: [44.88°, -12.30°]
        </div>
      </div>

      {/* 6. MAIN ORRERY & CELESTIAL STAGE (Hardware Accelerated Camera Dive Container) */}
      <div
        className="relative w-full h-full max-w-[1700px] flex items-center justify-center transition-all duration-700 ease-out"
        style={{
          transformOrigin,
          transform: approachingPlanet
            ? 'scale(4.8) translateZ(300px)'
            : `rotateX(${mouseOffset.y * -4}deg) rotateY(${mouseOffset.x * 5}deg) scale(1)`,
          transitionTimingFunction: approachingPlanet ? 'cubic-bezier(0.16, 1, 0.3, 1)' : 'ease-out',
        }}
      >
        {/* SVG ORBITAL RINGS & GRADUATION MARKS */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
          viewBox="0 0 1600 900"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="orbitGradSedna" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#b9a77a" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#00e5ff" stopOpacity="0.35" />
            </linearGradient>

            <linearGradient id="orbitGradEarth" x1="1" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#00e5ff" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.35" />
            </linearGradient>
          </defs>

          {/* Central Solar/Void Alignment Crosshairs */}
          <line x1="800" y1="250" x2="800" y2="650" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="550" y1="450" x2="1050" y2="450" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="3 3" />

          {/* Outer Orbit (Sedna Track) */}
          <ellipse
            cx="800"
            cy="450"
            rx="560"
            ry="280"
            fill="none"
            stroke="url(#orbitGradSedna)"
            strokeWidth="1.2"
            strokeDasharray="6 8"
            transform="rotate(-10 800 450)"
          />

          {/* Inner Orbit (Earth Track) */}
          <ellipse
            cx="800"
            cy="450"
            rx="360"
            ry="180"
            fill="none"
            stroke="url(#orbitGradEarth)"
            strokeWidth="1.2"
            strokeDasharray="4 6"
            transform="rotate(14 800 450)"
          />

          {/* Orbit Coordinate Degree Markers */}
          <text x="1340" y="380" fill="#64748b" fontSize="10" fontFamily="JetBrains Mono">045° // SEDNA NODE</text>
          <text x="360" y="580" fill="#64748b" fontSize="10" fontFamily="JetBrains Mono">225° // EARTH NODE</text>
          <text x="800" y="160" fill="#64748b" fontSize="9" fontFamily="JetBrains Mono" textAnchor="middle">000° ZENITH</text>
          <text x="800" y="750" fill="#64748b" fontSize="9" fontFamily="JetBrains Mono" textAnchor="middle">180° NADIR</text>
        </svg>

        {/* 7. CENTRAL CELESTIAL VOID CORE / SUN */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center justify-center">
          {/* Gravitational Core Glow */}
          <div className="w-28 h-28 rounded-full bg-[radial-gradient(circle,rgba(255,240,180,0.85)_0%,rgba(185,167,122,0.35)_40%,transparent_75%)] animate-pulse" style={{ animationDuration: '4s' }} />
          <div className="absolute w-12 h-12 rounded-full bg-[#fff4cc] shadow-[0_0_40px_rgba(255,220,120,0.9),0_0_80px_rgba(0,229,255,0.3)]" />
          
          {/* Core Telemetry Tag */}
          <span className="absolute -bottom-7 text-[9px] tracking-widest text-[#b9a77a] font-bold">
            SOL // VOID CORE
          </span>
        </div>

        {/* 8. SEDNA CELESTIAL NODE (Top-Right Orbit) */}
        <div
          className="absolute z-20"
          style={{
            left: '73%',
            top: '32%',
            transform: 'translate(-50%, -50%)',
          }}
          onMouseEnter={() => setHoveredPlanet('sedna')}
          onMouseLeave={() => setHoveredPlanet(null)}
        >
          {/* Planet Node Button Container */}
          <div
            onClick={() => handlePlanetClick('sedna')}
            className="group relative cursor-pointer flex flex-col items-center"
          >
            {/* Interactive Target Reticle Brackets (Locks on hover / approach) */}
            <div
              className={`absolute -inset-7 pointer-events-none transition-all duration-300 ${
                hoveredPlanet === 'sedna' || approachingPlanet === 'sedna'
                  ? 'opacity-100 scale-100'
                  : 'opacity-40 scale-95'
              }`}
            >
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#00e5ff] shadow-[0_0_8px_#00e5ff]" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#00e5ff] shadow-[0_0_8px_#00e5ff]" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#00e5ff] shadow-[0_0_8px_#00e5ff]" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#00e5ff] shadow-[0_0_8px_#00e5ff]" />

              {/* Diamond Tracker Mark */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-[#00e5ff] shadow-[0_0_6px_#00e5ff]" />
            </div>

            {/* Constellation Mission Links Overlay */}
            <svg
              className="absolute -inset-10 w-64 h-64 pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity"
              viewBox="0 0 200 200"
            >
              <line x1="30" y1="60" x2="80" y2="40" stroke="#00e5ff" strokeWidth="1" strokeDasharray="3 3" opacity="0.8" />
              <line x1="80" y1="40" x2="130" y2="60" stroke="#00e5ff" strokeWidth="1" strokeDasharray="3 3" opacity="0.8" />
              <line x1="130" y1="60" x2="160" y2="120" stroke="#ffffff" strokeWidth="1" opacity="0.6" />
              <line x1="80" y1="40" x2="100" y2="100" stroke="#00e5ff" strokeWidth="1.2" opacity="0.9" />
              <circle cx="30" cy="60" r="3" fill="#ffffff" />
              <circle cx="80" cy="40" r="3.5" fill="#00e5ff" />
              <circle cx="130" cy="60" r="3" fill="#ffffff" />
              <circle cx="160" cy="120" r="3" fill="#ffffff" />
              <circle cx="100" cy="100" r="4" fill="#00e5ff" />
            </svg>

            {/* Rotating Sedna Sphere */}
            <div
              className={`relative w-40 h-40 sm:w-48 sm:h-48 rounded-full overflow-hidden transition-all duration-500 ease-out ${
                hoveredPlanet === 'sedna'
                  ? 'scale-110 shadow-[0_0_60px_rgba(0,229,255,0.65),inset_-18px_-18px_36px_rgba(0,0,0,0.95)]'
                  : 'scale-100 shadow-[0_0_30px_rgba(0,229,255,0.3),inset_-14px_-14px_28px_rgba(0,0,0,0.95)]'
              }`}
            >
              <img
                src="/sedna_clean.png"
                alt="Sedna"
                className="w-full h-full object-cover select-none pointer-events-none animate-sedna-spin"
              />
              {/* Atmospheric rim filter */}
              <div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  background: 'radial-gradient(circle at 65% 70%, rgba(255,180,140,0.12) 0%, transparent 60%, rgba(4,6,10,0.92) 95%)',
                  boxShadow: 'inset 0 0 20px rgba(0, 229, 255, 0.45)',
                }}
              />
            </div>

            {/* Planet Label Plate */}
            <div className="mt-4 flex flex-col items-center">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#070d16]/90 border border-[#00e5ff]/40 shadow-lg group-hover:border-[#00e5ff] transition-colors">
                <span className="w-2 h-2 rounded-full bg-[#00e5ff] animate-pulse" />
                <span className="text-sm font-raleway font-bold tracking-wider uppercase text-white group-hover:text-[#00e5ff] transition-colors">
                  {lang === 'ru' ? 'СЕДНА' : 'SEDNA'}
                </span>
                <span className="text-[10px] text-[#00e5ff] font-mono px-1.5 py-0.2 bg-[#00e5ff]/15 rounded">
                  {lang === 'ru' ? 'МАРКЕТ' : 'MARKET'}
                </span>
              </div>
              <span className="text-[10px] text-[#64748b] mt-1 font-mono tracking-wider">
                SECTOR: SED-4029 // 170 ITEMS
              </span>
            </div>

            {/* HOLOGRAPHIC MISSION DOSSIER CARD (Reveals on hover) */}
            <div
              className={`absolute top-1/2 -left-[280px] sm:-left-[320px] -translate-y-1/2 w-64 sm:w-72 p-4 rounded-2xl bg-[#080d16]/95 backdrop-blur-xl border border-[#00e5ff]/50 shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_30px_rgba(0,229,255,0.2)] pointer-events-auto transition-all duration-300 z-30 ${
                hoveredPlanet === 'sedna'
                  ? 'opacity-100 translate-x-0 scale-100 pointer-events-auto'
                  : 'opacity-0 translate-x-4 scale-95 pointer-events-none'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                handlePlanetClick('sedna');
              }}
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                <span className="text-[10px] text-[#00e5ff] font-mono font-bold tracking-widest uppercase flex items-center gap-1">
                  <Activity className="w-3 h-3 text-[#00e5ff]" />
                  {lang === 'ru' ? 'ТОРГОВЫЙ ХАБ' : 'TRADING SECTOR'}
                </span>
                <span className="text-[10px] text-[#10b981] font-mono bg-[#10b981]/15 px-2 py-0.5 rounded border border-[#10b981]/30">
                  ONLINE
                </span>
              </div>

              <h3 className="font-raleway text-base font-bold text-white mt-2">
                {lang === 'ru' ? 'Рынок Мистификаторов' : 'Arcanes Marketplace'}
              </h3>
              <p className="text-xs text-[#94a3b8] mt-1 line-clamp-2">
                {lang === 'ru'
                  ? 'База закрытых сделок, медианные цены R0 / R5, объёмы торгов и волатильность.'
                  : 'Real closed deals telemetry, median prices for R0 / R5, trade volumes and volatility.'}
              </p>

              {/* Quick Telemetry Chips */}
              <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-white/[0.06] text-xs">
                <div className="flex flex-col">
                  <span className="text-[10px] text-[#64748b] uppercase">КАТАЛОГ</span>
                  <span className="text-white font-bold font-mono">{itemsCount} мистиков</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-[#64748b] uppercase">ИСТОЧНИК</span>
                  <span className="text-[#00e5ff] font-bold font-mono">Market v1</span>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-3.5 pt-2.5 border-t border-white/[0.08]">
                <button className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#00e5ff]/20 hover:bg-[#00e5ff]/35 border border-[#00e5ff]/60 text-white font-mono text-xs font-semibold tracking-wider transition-all shadow-[0_0_15px_rgba(0,229,255,0.3)]">
                  <span>{lang === 'ru' ? 'ВЫСАДКА НА СЕДНУ' : 'APPROACH SEDNA'}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#00e5ff]" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 9. EARTH CELESTIAL NODE (Bottom-Left Orbit) */}
        <div
          className="absolute z-20"
          style={{
            left: '27%',
            top: '68%',
            transform: 'translate(-50%, -50%)',
          }}
          onMouseEnter={() => setHoveredPlanet('earth')}
          onMouseLeave={() => setHoveredPlanet(null)}
        >
          {/* Planet Node Button Container */}
          <div
            onClick={() => handlePlanetClick('earth')}
            className="group relative cursor-pointer flex flex-col items-center"
          >
            {/* Interactive Target Reticle Brackets (Locks on hover / approach) */}
            <div
              className={`absolute -inset-7 pointer-events-none transition-all duration-300 ${
                hoveredPlanet === 'earth' || approachingPlanet === 'earth'
                  ? 'opacity-100 scale-100'
                  : 'opacity-40 scale-95'
              }`}
            >
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#10b981] shadow-[0_0_8px_#10b981]" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#10b981] shadow-[0_0_8px_#10b981]" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#10b981] shadow-[0_0_8px_#10b981]" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#10b981] shadow-[0_0_8px_#10b981]" />

              {/* Diamond Tracker Mark */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-[#10b981] shadow-[0_0_6px_#10b981]" />
            </div>

            {/* Constellation Mission Links Overlay */}
            <svg
              className="absolute -inset-10 w-64 h-64 pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity"
              viewBox="0 0 200 200"
            >
              <line x1="40" y1="50" x2="90" y2="40" stroke="#10b981" strokeWidth="1" strokeDasharray="3 3" opacity="0.8" />
              <line x1="90" y1="40" x2="140" y2="70" stroke="#10b981" strokeWidth="1" strokeDasharray="3 3" opacity="0.8" />
              <line x1="90" y1="40" x2="80" y2="110" stroke="#00e5ff" strokeWidth="1" opacity="0.7" />
              <line x1="80" y1="110" x2="130" y2="130" stroke="#ffffff" strokeWidth="1" opacity="0.6" />
              <circle cx="40" cy="50" r="3" fill="#ffffff" />
              <circle cx="90" cy="40" r="3.5" fill="#10b981" />
              <circle cx="140" cy="70" r="3" fill="#ffffff" />
              <circle cx="80" cy="110" r="4" fill="#00e5ff" />
              <circle cx="130" cy="130" r="3" fill="#ffffff" />
            </svg>

            {/* Rotating Earth Sphere */}
            <div
              className={`relative w-40 h-40 sm:w-48 sm:h-48 rounded-full overflow-hidden transition-all duration-500 ease-out ${
                hoveredPlanet === 'earth'
                  ? 'scale-110 shadow-[0_0_60px_rgba(16,185,129,0.65),inset_-18px_-18px_36px_rgba(0,0,0,0.95)]'
                  : 'scale-100 shadow-[0_0_30px_rgba(16,185,129,0.3),inset_-14px_-14px_28px_rgba(0,0,0,0.95)]'
              }`}
            >
              <img
                src="/earth_clean.png"
                alt="Earth"
                className="w-full h-full object-cover select-none pointer-events-none animate-sedna-spin"
                style={{ animationDuration: '120s' }}
              />
              {/* Atmospheric rim filter */}
              <div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  background: 'radial-gradient(circle at 65% 70%, rgba(16,185,129,0.12) 0%, transparent 60%, rgba(4,6,10,0.92) 95%)',
                  boxShadow: 'inset 0 0 20px rgba(16, 185, 129, 0.45)',
                }}
              />
            </div>

            {/* Planet Label Plate */}
            <div className="mt-4 flex flex-col items-center">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#070d16]/90 border border-[#10b981]/40 shadow-lg group-hover:border-[#10b981] transition-colors">
                <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
                <span className="text-sm font-raleway font-bold tracking-wider uppercase text-white group-hover:text-[#10b981] transition-colors">
                  {lang === 'ru' ? 'ЗЕМЛЯ' : 'EARTH'}
                </span>
                <span className="text-[10px] text-[#10b981] font-mono px-1.5 py-0.2 bg-[#10b981]/15 rounded">
                  {lang === 'ru' ? 'КАЮТА' : 'CABIN'}
                </span>
              </div>
              <span className="text-[10px] text-[#64748b] mt-1 font-mono tracking-wider">
                SECTOR: ERT-1004 // OPERATOR
              </span>
            </div>

            {/* HOLOGRAPHIC MISSION DOSSIER CARD (Reveals on hover) */}
            <div
              className={`absolute top-1/2 -right-[280px] sm:-right-[320px] -translate-y-1/2 w-64 sm:w-72 p-4 rounded-2xl bg-[#080d16]/95 backdrop-blur-xl border border-[#10b981]/50 shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_30px_rgba(16,185,129,0.2)] pointer-events-auto transition-all duration-300 z-30 ${
                hoveredPlanet === 'earth'
                  ? 'opacity-100 translate-x-0 scale-100 pointer-events-auto'
                  : 'opacity-0 -translate-x-4 scale-95 pointer-events-none'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                handlePlanetClick('earth');
              }}
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                <span className="text-[10px] text-[#10b981] font-mono font-bold tracking-widest uppercase flex items-center gap-1">
                  <Shield className="w-3 h-3 text-[#10b981]" />
                  {lang === 'ru' ? 'КАЮТА ОПЕРАТОРА' : 'OPERATOR QUARTERS'}
                </span>
                <span className="text-[10px] text-[#10b981] font-mono bg-[#10b981]/15 px-2 py-0.5 rounded border border-[#10b981]/30">
                  SECURE
                </span>
              </div>

              <h3 className="font-raleway text-base font-bold text-white mt-2">
                {lang === 'ru' ? 'Личный Кабинет Тэнно' : 'Operator Quarters'}
              </h3>
              <p className="text-xs text-[#94a3b8] mt-1 line-clamp-2">
                {lang === 'ru'
                  ? 'Зашифрованный операторский терминал, личные заметки, цели и управление доступом.'
                  : 'Encrypted operator desk, private trading logs, objectives, and access control.'}
              </p>

              {/* Quick Telemetry Chips */}
              <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-white/[0.06] text-xs">
                <div className="flex flex-col">
                  <span className="text-[10px] text-[#64748b] uppercase">ДОСТУП</span>
                  <span className="text-white font-bold font-mono">Operator #1</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-[#64748b] uppercase">ЗАЩИТА</span>
                  <span className="text-[#10b981] font-bold font-mono">AES-256 JWT</span>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-3.5 pt-2.5 border-t border-white/[0.08]">
                <button className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#10b981]/20 hover:bg-[#10b981]/35 border border-[#10b981]/60 text-white font-mono text-xs font-semibold tracking-wider transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                  <span>{lang === 'ru' ? 'ВХОД В ТЕРМИНАЛ' : 'ENTER TERMINAL'}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#10b981]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 10. WARP HYPERJUMP FLASH & SPEEDLINES (Active during approach) */}
      {approachingPlanet && (
        <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center animate-in fade-in duration-300">
          {/* Radial Hyperjump Speedlines */}
          <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(0,229,255,0.3)_0%,rgba(0,0,0,0.85)_75%)]" />
          <div className="anamorphic-beam w-full h-[2px] absolute top-1/2 left-0 -translate-y-1/2 animate-pulse" />
          <div className="text-center font-mono text-xs font-bold text-[#00e5ff] tracking-widest uppercase bg-[#04060a]/90 px-6 py-2.5 rounded-2xl border border-[#00e5ff]/50 shadow-[0_0_30px_rgba(0,229,255,0.4)]">
            {lang === 'ru'
              ? `СБЛИЖЕНИЕ С ОРБИТОЙ // ${approachingPlanet === 'sedna' ? 'СЕДНА' : 'ЗЕМЛЯ'}`
              : `APPROACHING ORBIT // ${approachingPlanet === 'sedna' ? 'SEDNA' : 'EARTH'}`}
          </div>
        </div>
      )}

      {/* 11. BOTTOM INSTRUCTION / CALL TO ACTION */}
      <div className="absolute bottom-6 inset-x-8 z-30 flex items-center justify-between text-xs font-mono text-[#64748b] pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#00e5ff] animate-ping" />
          <span className="text-[#a3a29d]">
            {lang === 'ru'
              ? 'ВЫБЕРИТЕ ПЛАНЕТАРНЫЙ СЕКТОР ДЛЯ ВЫСАДКИ'
              : 'SELECT PLANETARY SECTOR FOR APPROACH'}
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-4">
          <span>СЕДНА: МАРКЕТ</span>
          <span>•</span>
          <span>ЗЕМЛЯ: КАЮТА</span>
        </div>
      </div>
    </div>
  );
};
