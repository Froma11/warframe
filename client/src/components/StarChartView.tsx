import React, { useState, useMemo } from 'react';

interface StarChartViewProps {
  onSelectPlanet: (planet: 'sedna' | 'earth') => void;
  lang: 'ru' | 'en';
}

export const StarChartView: React.FC<StarChartViewProps> = ({
  onSelectPlanet,
  lang,
}) => {
  const [selectedPlanet, setSelectedPlanet] = useState<'sedna' | 'earth' | null>(null);

  // Generate realistic multi-layer stars (dim background, crisp mid, bright near)
  const starLayers = useMemo(() => {
    const list = [];
    for (let i = 0; i < 110; i++) {
      const top = (i * 17.7 + (i % 7) * 13) % 100;
      const left = (i * 29.3 + (i % 5) * 19) % 100;
      const layerType = i % 5 === 0 ? 'bright' : i % 2 === 0 ? 'mid' : 'distant';
      const size = layerType === 'bright' ? 2.5 : layerType === 'mid' ? 1.5 : 1;
      const opacity = layerType === 'bright' ? 0.85 : layerType === 'mid' ? 0.45 : 0.22;
      list.push({ id: i, top, left, size, opacity, layerType });
    }
    return list;
  }, []);

  // Handle approach animation: smooth glide to center and scale
  const handlePlanetClick = (planet: 'sedna' | 'earth') => {
    if (selectedPlanet) return;
    setSelectedPlanet(planet);

    setTimeout(() => {
      onSelectPlanet(planet);
    }, 480);
  };

  const isTransitioning = selectedPlanet !== null;

  return (
    <div className="relative w-full h-[calc(100vh-53px)] min-h-[640px] bg-[#03060a] overflow-hidden select-none flex items-center justify-center">
      
      {/* 1. VOLUMETRIC SPACE NEBULAE (Matches Warframe Star Chart palette: Deep Teal upper-right, warm dust lower-left) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 70% 55% at 80% 25%, rgba(0, 180, 216, 0.16) 0%, rgba(4, 80, 105, 0.08) 45%, transparent 75%),
            radial-gradient(ellipse 65% 50% at 20% 78%, rgba(140, 85, 45, 0.13) 0%, rgba(80, 45, 20, 0.06) 40%, transparent 70%),
            radial-gradient(circle 50% at 50% 50%, rgba(255, 175, 75, 0.08) 0%, rgba(0, 160, 190, 0.04) 50%, transparent 80%)
          `,
        }}
      />

      {/* 2. PROCEDURAL SPACE DUST FILTER (SVG Organic Grain) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
        <defs>
          <filter id="warframeSpaceDust">
            <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" result="dust" />
            <feColorMatrix
              type="matrix"
              values="
                0 0 0 0 0.02
                0 0 0 0 0.55
                0 0 0 0 0.75
                0 0 0 0.08 0"
            />
          </filter>
        </defs>
        <rect width="100%" height="100%" filter="url(#warframeSpaceDust)" />
      </svg>

      {/* 3. MULTI-DEPTH STARS */}
      <div className="absolute inset-0 pointer-events-none">
        {starLayers.map((s) => (
          <div
            key={s.id}
            className="absolute rounded-full bg-white"
            style={{
              top: `${s.top}%`,
              left: `${s.left}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              opacity: s.opacity,
              boxShadow: s.layerType === 'bright' ? '0 0 4px rgba(255,255,255,0.9), 0 0 8px rgba(0,229,255,0.5)' : 'none',
            }}
          />
        ))}
      </div>

      {/* 4. WARFRAME 3D CELESTIAL ORRERY GRID (Concentric Orbits + Perspective Radial Meridians) */}
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
          <defs>
            {/* Soft radial fade out mask for grid edges */}
            <radialGradient id="gridFadeMask" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
              <stop offset="65%" stopColor="#ffffff" stopOpacity="0.65" />
              <stop offset="90%" stopColor="#ffffff" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>

            <mask id="gridMask">
              <rect width="1000" height="600" fill="url(#gridFadeMask)" />
            </mask>
          </defs>

          <g mask="url(#gridMask)">
            {/* PERSPECTIVE RADIAL MERIDIANS (Rays emanating from central Sun into space, exactly as in Warframe) */}
            {[0, 24, 48, 72, 96, 120, 144, 168, 192, 216, 240, 264, 288, 312, 336].map((deg) => {
              const rad = (deg * Math.PI) / 180;
              // Elliptical ray length
              const x2 = 500 + Math.cos(rad) * 650;
              const y2 = 300 + Math.sin(rad) * 360;
              const x1 = 500 + Math.cos(rad) * 45;
              const y1 = 300 + Math.sin(rad) * 26;
              return (
                <line
                  key={deg}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="rgba(0, 229, 255, 0.08)"
                  strokeWidth="0.8"
                />
              );
            })}

            {/* CONCENTRIC ORBITAL LATITUDES (Subtle 3D ellipses) */}
            <ellipse cx="500" cy="300" rx="140" ry="80" fill="none" stroke="rgba(0, 229, 255, 0.12)" strokeWidth="0.9" />
            <ellipse cx="500" cy="300" rx="250" ry="145" fill="none" stroke="rgba(0, 229, 255, 0.15)" strokeWidth="0.9" />
            <ellipse cx="500" cy="300" rx="360" ry="210" fill="none" stroke="rgba(0, 229, 255, 0.18)" strokeWidth="1" />
            <ellipse cx="500" cy="300" rx="470" ry="275" fill="none" stroke="rgba(0, 229, 255, 0.14)" strokeWidth="0.9" />
            <ellipse cx="500" cy="300" rx="580" ry="340" fill="none" stroke="rgba(0, 229, 255, 0.09)" strokeWidth="0.8" />
          </g>
        </svg>
      </div>

      {/* 5. CENTRAL SOLAR SINGULARITY (Sun with Anamorphic Lens Flare, exactly as in Warframe reference) */}
      <div
        className={`absolute pointer-events-none flex items-center justify-center transition-opacity duration-300 ${
          isTransitioning ? 'opacity-0' : 'opacity-100'
        }`}
        style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
      >
        {/* Soft Golden Corona */}
        <div className="w-32 h-32 rounded-full bg-[radial-gradient(circle,rgba(255,185,85,0.75)_0%,rgba(255,140,40,0.3)_35%,transparent_70%)] animate-pulse" style={{ animationDuration: '4s' }} />
        
        {/* White-Hot Core */}
        <div className="absolute w-7 h-7 rounded-full bg-[#ffffff] shadow-[0_0_25px_rgba(255,200,100,1),0_0_50px_rgba(255,150,40,0.8)]" />

        {/* Anamorphic Horizontal Lens Flare (Signature Warframe light streak) */}
        <div
          className="absolute h-[1.5px] pointer-events-none"
          style={{
            width: '320px',
            background: 'linear-gradient(90deg, transparent 0%, rgba(255, 200, 120, 0.2) 20%, #ffffff 50%, rgba(255, 200, 120, 0.2) 80%, transparent 100%)',
            boxShadow: '0 0 10px rgba(255, 180, 80, 0.8), 0 0 20px rgba(255, 150, 50, 0.4)',
          }}
        />
      </div>

      {/* 6. EARTH — «ПРОФИЛЬ» (Active Sector — Lower Left Orbit) */}
      <div
        onClick={() => handlePlanetClick('earth')}
        className={`group absolute cursor-pointer flex flex-col items-center transition-all duration-500 ease-out z-20 ${
          isTransitioning && selectedPlanet !== 'earth' ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        style={{
          left: 'calc(50% - 290px)',
          top: 'calc(50% + 75px)',
          transform: selectedPlanet === 'earth'
            ? 'translate(290px, -75px) scale(2.5)'
            : 'translate(-50%, -50%) scale(1)',
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Planet Sphere with Atmospheric Rim */}
        <div className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-full overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.35),inset_-12px_-12px_24px_rgba(0,0,0,0.95)] group-hover:scale-105 group-hover:shadow-[0_0_45px_rgba(16,185,129,0.65)] transition-all duration-300">
          <img
            src="/earth_clean.png"
            alt="Earth"
            className="w-full h-full object-cover select-none pointer-events-none animate-sedna-spin"
            style={{ animationDuration: '120s' }}
          />
          {/* Inner atmospheric rim facing central star */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              boxShadow: 'inset 0 0 18px rgba(16, 185, 129, 0.45)',
            }}
          />
        </div>

        {/* ONLY the label «Профиль» (strictly no planet names) */}
        <div
          className={`flex flex-col items-center mt-3 transition-opacity duration-200 ${
            selectedPlanet === 'earth' ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <span className="text-sm font-raleway font-bold text-white tracking-widest uppercase group-hover:text-[#34d399] transition-colors">
            {lang === 'ru' ? 'Профиль' : 'Profile'}
          </span>
        </div>
      </div>

      {/* 7. SEDNA — «МАРКЕТ» (Active Sector — Upper Right Orbit) */}
      <div
        onClick={() => handlePlanetClick('sedna')}
        className={`group absolute cursor-pointer flex flex-col items-center transition-all duration-500 ease-out z-20 ${
          isTransitioning && selectedPlanet !== 'sedna' ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        style={{
          left: 'calc(50% + 330px)',
          top: 'calc(50% - 90px)',
          transform: selectedPlanet === 'sedna'
            ? 'translate(-330px, 90px) scale(2.5)'
            : 'translate(-50%, -50%) scale(1)',
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Planet Sphere with Atmospheric Rim */}
        <div className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-full overflow-hidden shadow-[0_0_30px_rgba(0,229,255,0.35),inset_-12px_-12px_24px_rgba(0,0,0,0.95)] group-hover:scale-105 group-hover:shadow-[0_0_45px_rgba(0,229,255,0.65)] transition-all duration-300">
          <img
            src="/sedna_clean.png"
            alt="Sedna"
            className="w-full h-full object-cover select-none pointer-events-none animate-sedna-spin"
            style={{ animationDuration: '90s' }}
          />
          {/* Inner atmospheric rim facing central star */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              boxShadow: 'inset 0 0 18px rgba(0, 229, 255, 0.45)',
            }}
          />
        </div>

        {/* ONLY the label «Маркет» (strictly no planet names) */}
        <div
          className={`flex flex-col items-center mt-3 transition-opacity duration-200 ${
            selectedPlanet === 'sedna' ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <span className="text-sm font-raleway font-bold text-white tracking-widest uppercase group-hover:text-[#00e5ff] transition-colors">
            {lang === 'ru' ? 'Маркет' : 'Market'}
          </span>
        </div>
      </div>

      {/* 8. RESERVED ORBITAL SLOTS (Clean minimal nodes for future tabs, perfectly balancing the system) */}
      
      {/* Slot 1: Upper-Left (Orbit 3) */}
      <div
        className={`absolute pointer-events-none flex items-center justify-center transition-opacity duration-300 ${
          isTransitioning ? 'opacity-0' : 'opacity-35'
        }`}
        style={{
          left: 'calc(50% - 250px)',
          top: 'calc(50% - 135px)',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div className="w-5 h-5 rounded-full border border-dashed border-[#00e5ff]/50 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00e5ff]" />
        </div>
      </div>

      {/* Slot 2: Lower-Right (Orbit 2) */}
      <div
        className={`absolute pointer-events-none flex items-center justify-center transition-opacity duration-300 ${
          isTransitioning ? 'opacity-0' : 'opacity-35'
        }`}
        style={{
          left: 'calc(50% + 250px)',
          top: 'calc(50% + 125px)',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div className="w-5 h-5 rounded-full border border-dashed border-[#00e5ff]/50 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00e5ff]" />
        </div>
      </div>

      {/* Slot 3: Upper-Center (Orbit 4) */}
      <div
        className={`hidden sm:flex absolute pointer-events-none items-center justify-center transition-opacity duration-300 ${
          isTransitioning ? 'opacity-0' : 'opacity-30'
        }`}
        style={{
          left: 'calc(50% + 50px)',
          top: 'calc(50% - 220px)',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div className="w-5 h-5 rounded-full border border-dashed border-[#00e5ff]/50 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00e5ff]" />
        </div>
      </div>

      {/* Slot 4: Far-Left (Orbit 4) */}
      <div
        className={`hidden md:flex absolute pointer-events-none items-center justify-center transition-opacity duration-300 ${
          isTransitioning ? 'opacity-0' : 'opacity-25'
        }`}
        style={{
          left: 'calc(50% - 460px)',
          top: 'calc(50% + 10px)',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div className="w-5 h-5 rounded-full border border-dashed border-[#00e5ff]/50 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00e5ff]" />
        </div>
      </div>

      {/* 9. SMOOTH FADE TRANSITION OVERLAY */}
      <div
        className={`absolute inset-0 bg-[#03060a] pointer-events-none transition-opacity duration-500 ${
          isTransitioning ? 'opacity-90' : 'opacity-0'
        }`}
      />
    </div>
  );
};
