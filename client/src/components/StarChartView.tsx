import React, { useState, useMemo } from 'react';
import { Lock } from 'lucide-react';

interface StarChartViewProps {
  onSelectPlanet: (planet: 'sedna' | 'earth') => void;
  lang: 'ru' | 'en';
}

export const StarChartView: React.FC<StarChartViewProps> = ({
  onSelectPlanet,
  lang,
}) => {
  const [selectedPlanet, setSelectedPlanet] = useState<'sedna' | 'earth' | null>(null);

  // Generate deterministic subtle stars
  const stars = useMemo(() => {
    const list = [];
    for (let i = 0; i < 75; i++) {
      const top = (i * 19.3 + (i % 7) * 13) % 100;
      const left = (i * 27.7 + (i % 5) * 17) % 100;
      const size = (i % 4 === 0) ? 2 : 1.5;
      const opacity = 0.2 + ((i % 10) / 10) * 0.55;
      list.push({ id: i, top, left, size, opacity });
    }
    return list;
  }, []);

  // Approach handler: animate planet flying towards camera, then trigger callback
  const handlePlanetClick = (planet: 'sedna' | 'earth') => {
    if (selectedPlanet) return;
    setSelectedPlanet(planet);

    setTimeout(() => {
      onSelectPlanet(planet);
    }, 500);
  };

  const isTransitioning = selectedPlanet !== null;

  return (
    <div className="relative w-full h-[calc(100vh-53px)] min-h-[640px] bg-[#04060a] overflow-hidden select-none flex items-center justify-center">
      
      {/* 1. BACKGROUND STARS */}
      <div className="absolute inset-0 pointer-events-none">
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
            }}
          />
        ))}
      </div>

      {/* 2. SUBTLE CENTRAL NEBULA GLOW */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(2, 28, 44, 0.45) 0%, transparent 65%)',
        }}
      />

      {/* 3. CENTERED ORRERY ORBITAL RINGS (SVG) */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${
          isTransitioning ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <svg
          className="w-full h-full"
          preserveAspectRatio="none"
          viewBox="0 0 1000 600"
        >
          {/* Orbit 1 (Inner) */}
          <ellipse
            cx="500"
            cy="300"
            rx="180"
            ry="105"
            fill="none"
            stroke="rgba(0, 229, 255, 0.12)"
            strokeWidth="1"
            strokeDasharray="4 6"
          />

          {/* Orbit 2 (Earth & Slot 1) */}
          <ellipse
            cx="500"
            cy="300"
            rx="320"
            ry="185"
            fill="none"
            stroke="rgba(0, 229, 255, 0.18)"
            strokeWidth="1"
            strokeDasharray="4 6"
          />

          {/* Orbit 3 (Sedna & Slot 2) */}
          <ellipse
            cx="500"
            cy="300"
            rx="430"
            ry="250"
            fill="none"
            stroke="rgba(0, 229, 255, 0.22)"
            strokeWidth="1.2"
            strokeDasharray="6 8"
          />

          {/* Orbit 4 (Outer Slots) */}
          <ellipse
            cx="500"
            cy="300"
            rx="520"
            ry="300"
            fill="none"
            stroke="rgba(0, 229, 255, 0.12)"
            strokeWidth="1"
            strokeDasharray="4 6"
          />
        </svg>
      </div>

      {/* 4. CENTRAL SUN / STAR */}
      <div
        className={`absolute pointer-events-none flex items-center justify-center transition-opacity duration-300 ${
          isTransitioning ? 'opacity-0' : 'opacity-100'
        }`}
        style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
      >
        <div className="w-20 h-20 rounded-full bg-[radial-gradient(circle,rgba(255,235,160,0.85)_0%,rgba(185,167,122,0.3)_45%,transparent_75%)] animate-pulse" />
        <div className="absolute w-9 h-9 rounded-full bg-[#fff4cc] shadow-[0_0_35px_rgba(255,220,120,0.9)]" />
      </div>

      {/* 5. EARTH (ACTIVE PLANET — LOWER LEFT) */}
      <div
        onClick={() => handlePlanetClick('earth')}
        className={`group absolute cursor-pointer flex flex-col items-center transition-all duration-500 ease-out z-20 ${
          isTransitioning && selectedPlanet !== 'earth' ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        style={{
          left: 'calc(50% - 300px)',
          top: 'calc(50% + 75px)',
          transform: selectedPlanet === 'earth'
            ? 'translate(300px, -75px) scale(2.6)'
            : 'translate(-50%, -50%) scale(1)',
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Planet Sphere */}
        <div className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-full overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.35),inset_-12px_-12px_24px_rgba(0,0,0,0.95)] group-hover:scale-105 group-hover:shadow-[0_0_45px_rgba(16,185,129,0.6)] transition-all duration-300">
          <img
            src="/earth_clean.png"
            alt="Earth"
            className="w-full h-full object-cover select-none pointer-events-none animate-sedna-spin"
            style={{ animationDuration: '120s' }}
          />
          {/* Subtle atmosphere */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              boxShadow: 'inset 0 0 16px rgba(16, 185, 129, 0.45)',
            }}
          />
        </div>

        {/* Planet Label */}
        <div
          className={`flex flex-col items-center mt-3 transition-opacity duration-200 ${
            selectedPlanet === 'earth' ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <span className="text-base font-raleway font-bold text-white tracking-wider uppercase group-hover:text-[#34d399] transition-colors">
            {lang === 'ru' ? 'ЗЕМЛЯ' : 'EARTH'}
          </span>
          <span className="text-xs text-[#34d399] font-mono mt-0.5">
            {lang === 'ru' ? 'Профиль' : 'Profile'}
          </span>
        </div>
      </div>

      {/* 6. SEDNA (ACTIVE PLANET — UPPER RIGHT) */}
      <div
        onClick={() => handlePlanetClick('sedna')}
        className={`group absolute cursor-pointer flex flex-col items-center transition-all duration-500 ease-out z-20 ${
          isTransitioning && selectedPlanet !== 'sedna' ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        style={{
          left: 'calc(50% + 340px)',
          top: 'calc(50% - 95px)',
          transform: selectedPlanet === 'sedna'
            ? 'translate(-340px, 95px) scale(2.6)'
            : 'translate(-50%, -50%) scale(1)',
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Planet Sphere */}
        <div className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-full overflow-hidden shadow-[0_0_30px_rgba(0,229,255,0.35),inset_-12px_-12px_24px_rgba(0,0,0,0.95)] group-hover:scale-105 group-hover:shadow-[0_0_45px_rgba(0,229,255,0.6)] transition-all duration-300">
          <img
            src="/sedna_clean.png"
            alt="Sedna"
            className="w-full h-full object-cover select-none pointer-events-none animate-sedna-spin"
            style={{ animationDuration: '90s' }}
          />
          {/* Subtle atmosphere */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              boxShadow: 'inset 0 0 16px rgba(0, 229, 255, 0.45)',
            }}
          />
        </div>

        {/* Planet Label */}
        <div
          className={`flex flex-col items-center mt-3 transition-opacity duration-200 ${
            selectedPlanet === 'sedna' ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <span className="text-base font-raleway font-bold text-white tracking-wider uppercase group-hover:text-[#00e5ff] transition-colors">
            {lang === 'ru' ? 'СЕДНА' : 'SEDNA'}
          </span>
          <span className="text-xs text-[#00e5ff] font-mono mt-0.5">
            {lang === 'ru' ? 'Маркет' : 'Market'}
          </span>
        </div>
      </div>

      {/* 7. RESERVED SLOT 1 (UPPER LEFT — FUTURE TAB) */}
      <div
        className={`absolute flex flex-col items-center pointer-events-none transition-opacity duration-300 ${
          isTransitioning ? 'opacity-0' : 'opacity-40'
        }`}
        style={{
          left: 'calc(50% - 260px)',
          top: 'calc(50% - 130px)',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full border border-dashed border-white/20 flex items-center justify-center bg-white/[0.02]">
          <Lock className="w-5 h-5 text-[#64748b]" />
        </div>
        <span className="text-[11px] font-mono text-[#64748b] mt-2 tracking-wider uppercase">
          {lang === 'ru' ? 'Сектор закрыт' : 'Locked'}
        </span>
      </div>

      {/* 8. RESERVED SLOT 2 (LOWER RIGHT — FUTURE TAB) */}
      <div
        className={`absolute flex flex-col items-center pointer-events-none transition-opacity duration-300 ${
          isTransitioning ? 'opacity-0' : 'opacity-40'
        }`}
        style={{
          left: 'calc(50% + 280px)',
          top: 'calc(50% + 120px)',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full border border-dashed border-white/20 flex items-center justify-center bg-white/[0.02]">
          <Lock className="w-5 h-5 text-[#64748b]" />
        </div>
        <span className="text-[11px] font-mono text-[#64748b] mt-2 tracking-wider uppercase">
          {lang === 'ru' ? 'Сектор закрыт' : 'Locked'}
        </span>
      </div>

      {/* 9. RESERVED SLOT 3 (FAR LEFT — FUTURE TAB) */}
      <div
        className={`hidden md:flex absolute flex-col items-center pointer-events-none transition-opacity duration-300 ${
          isTransitioning ? 'opacity-0' : 'opacity-30'
        }`}
        style={{
          left: 'calc(50% - 470px)',
          top: 'calc(50% - 10px)',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div className="w-16 h-16 rounded-full border border-dashed border-white/20 flex items-center justify-center bg-white/[0.02]">
          <Lock className="w-4 h-4 text-[#64748b]" />
        </div>
        <span className="text-[10px] font-mono text-[#64748b] mt-1.5 tracking-wider uppercase">
          {lang === 'ru' ? 'Сектор закрыт' : 'Locked'}
        </span>
      </div>

      {/* 10. RESERVED SLOT 4 (FAR RIGHT — FUTURE TAB) */}
      <div
        className={`hidden md:flex absolute flex-col items-center pointer-events-none transition-opacity duration-300 ${
          isTransitioning ? 'opacity-0' : 'opacity-30'
        }`}
        style={{
          left: 'calc(50% + 470px)',
          top: 'calc(50% + 10px)',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div className="w-16 h-16 rounded-full border border-dashed border-white/20 flex items-center justify-center bg-white/[0.02]">
          <Lock className="w-4 h-4 text-[#64748b]" />
        </div>
        <span className="text-[10px] font-mono text-[#64748b] mt-1.5 tracking-wider uppercase">
          {lang === 'ru' ? 'Сектор закрыт' : 'Locked'}
        </span>
      </div>

      {/* 11. SMOOTH FADE TRANSITION OVERLAY */}
      <div
        className={`absolute inset-0 bg-[#04060a] pointer-events-none transition-opacity duration-500 ${
          isTransitioning ? 'opacity-90' : 'opacity-0'
        }`}
      />
    </div>
  );
};
