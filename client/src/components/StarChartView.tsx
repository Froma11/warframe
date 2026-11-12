import React, { useState, useMemo, useRef } from 'react';

interface StarChartViewProps {
  onSelectPlanet: (planet: 'sedna' | 'earth' | 'venus' | 'mars') => void;
  lang: 'ru' | 'en';
}

// Deterministic pseudo-random generator (SplitMix32)
function createSeededRng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x9e3779b9) | 0;
    let t = s ^ (s >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t = t ^ (t >>> 15);
    t = Math.imul(t, 0x735a2d97);
    return ((t = t ^ (t >>> 15)) >>> 0) / 4294967296;
  };
}

const rng = createSeededRng(772183);

// 240 organically distributed cosmic stars across 3 distinct parallax depths
const COSMIC_STARS = Array.from({ length: 240 }, (_, i) => {
  const top = rng() * 100;
  const left = rng() * 100;
  const roll = rng();

  const layer: 'far' | 'mid' | 'near' = roll < 0.65 ? 'far' : roll < 0.9 ? 'mid' : 'near';
  const size = layer === 'near' ? 2.4 + rng() * 1.0 : layer === 'mid' ? 1.4 + rng() * 0.7 : 0.8 + rng() * 0.5;
  const opacity = layer === 'near' ? 0.95 : layer === 'mid' ? 0.55 + rng() * 0.25 : 0.2 + rng() * 0.25;

  const tintRoll = rng();
  const tint =
    tintRoll > 0.88
      ? 'rgba(0, 229, 255, 0.95)'
      : tintRoll > 0.75
      ? 'rgba(255, 215, 160, 0.95)'
      : tintRoll > 0.6
      ? 'rgba(190, 220, 255, 0.95)'
      : '#ffffff';

  const duration = 2.2 + rng() * 3.8;
  const delay = rng() * 6;

  return { id: i, top, left, size, opacity, layer, tint, duration, delay };
});

// Precomputed floating stardust particles along the orbits
const STATIC_STARDUST = Array.from({ length: 44 }, (_, i) => {
  const angle = (i / 44) * Math.PI * 2 + (i % 3) * 0.2;
  const radiusX = 260 + (i % 4) * 75;
  const radiusY = 150 + (i % 4) * 45;
  const x = Math.cos(angle) * radiusX;
  const y = Math.sin(angle) * radiusY;
  const size = 1.2 + (i % 3) * 0.8;
  const opacity = 0.3 + (i % 5) * 0.12;
  return { id: i, x, y, size, opacity };
});

// Tactical Orokin Reticle HUD strictly centered on the planet sphere
const TacticalReticle: React.FC<{ color: string }> = ({ color }) => (
  <div className="absolute -inset-4 sm:-inset-5 rounded-full pointer-events-none z-10 flex items-center justify-center">
    {/* 1. Corner Lock Brackets (4 corners: ┌ ┐ └ ┘) that snap inward on hover */}
    <div className="absolute inset-0 transition-all duration-500 ease-out scale-125 opacity-0 group-hover:scale-100 group-hover:opacity-100">
      <svg className="w-full h-full" viewBox="0 0 100 100" fill="none">
        <path d="M 12 24 L 12 12 L 24 12" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        <path d="M 88 24 L 88 12 L 76 12" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        <path d="M 12 76 L 12 88 L 24 88" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        <path d="M 88 76 L 88 88 L 76 88" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </div>

    {/* 2. Rotating Segmented Telemetry Ring */}
    <div className="absolute inset-1 transition-all duration-700 ease-out opacity-0 group-hover:opacity-90 group-hover:rotate-180">
      <svg className="w-full h-full" viewBox="0 0 100 100" fill="none">
        <circle
          cx="50"
          cy="50"
          r="47"
          stroke={color}
          strokeWidth="0.8"
          strokeDasharray="4 10 24 10"
          strokeOpacity="0.75"
        />
        {/* Tactical cardinal ticks - Top, Left, Right (omitting bottom to completely avoid badge collision!) */}
        <line x1="50" y1="0" x2="50" y2="5" stroke={color} strokeWidth="2" strokeOpacity="1" />
        <line x1="0" y1="50" x2="5" y2="50" stroke={color} strokeWidth="2" strokeOpacity="1" />
        <line x1="95" y1="50" x2="100" y2="50" stroke={color} strokeWidth="2" strokeOpacity="1" />
      </svg>
    </div>

    {/* 3. Inner Fine Precision Circle */}
    <div className="absolute inset-2.5 transition-all duration-500 ease-out opacity-0 group-hover:opacity-60 scale-95 group-hover:scale-100">
      <svg className="w-full h-full" viewBox="0 0 100 100" fill="none">
        <circle
          cx="50"
          cy="50"
          r="48"
          stroke={color}
          strokeWidth="0.5"
          strokeDasharray="2 6"
          strokeOpacity="0.5"
        />
      </svg>
    </div>
  </div>
);

export const StarChartView: React.FC<StarChartViewProps> = ({
  onSelectPlanet,
  lang,
}) => {
  const [selectedPlanet, setSelectedPlanet] = useState<'sedna' | 'earth' | 'venus' | 'mars' | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  // Smooth mouse parallax (translation only, throttled strictly via requestAnimationFrame to avoid CPU spikes)
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (selectedPlanet) return;
    if (rafRef.current !== null) return;

    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;

    rafRef.current = requestAnimationFrame(() => {
      const x = (clientX / innerWidth - 0.5) * 2; // -1 to 1
      const y = (clientY / innerHeight - 0.5) * 2; // -1 to 1
      setMousePos({ x, y });
      rafRef.current = null;
    });
  };

  const farStars = useMemo(() => COSMIC_STARS.filter((s) => s.layer === 'far'), []);
  const midStars = useMemo(() => COSMIC_STARS.filter((s) => s.layer === 'mid'), []);
  const nearStars = useMemo(() => COSMIC_STARS.filter((s) => s.layer === 'near'), []);
  const stardust = STATIC_STARDUST;

  // Handle approach animation: smooth glide to center and scale
  const handlePlanetClick = (planet: 'sedna' | 'earth' | 'venus' | 'mars') => {
    if (selectedPlanet) return;
    setSelectedPlanet(planet);

    setTimeout(() => {
      onSelectPlanet(planet);
    }, 480);
  };

  const isTransitioning = selectedPlanet !== null;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative w-full h-full flex-1 bg-[#020509] overflow-hidden select-none flex items-center justify-center"
    >
      
      {/* 1. RICH VOLUMETRIC SPACE NEBULA (Matching official Warframe Star Chart palette) */}
      <div
        className="absolute inset-0 pointer-events-none transition-transform duration-700 ease-out"
        style={{
          transform: `scale(1.05) translate3d(${mousePos.x * -8}px, ${mousePos.y * -8}px, 0)`,
          background: `
            radial-gradient(ellipse 65% 55% at 82% 28%, rgba(0, 185, 220, 0.35) 0%, rgba(4, 95, 125, 0.18) 40%, transparent 75%),
            radial-gradient(ellipse 55% 45% at 18% 75%, rgba(160, 95, 45, 0.28) 0%, rgba(95, 50, 20, 0.14) 40%, transparent 70%),
            radial-gradient(circle 45% at 50% 50%, rgba(255, 180, 80, 0.16) 0%, rgba(0, 150, 185, 0.08) 50%, transparent 80%),
            radial-gradient(ellipse 90% 70% at 50% 50%, rgba(2, 18, 30, 0.85) 0%, transparent 85%)
          `,
        }}
      />

      {/* 2. LIGHTWEIGHT GPU-ACCELERATED COSMIC HAZE (Zero CPU filter overhead) */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 mix-blend-screen"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(0, 185, 220, 0.08) 0%, transparent 60%)',
        }}
      />

      {/* 3. MULTI-TIER ORGANIC COSMIC STARFIELD (3-Layer Depth Parallax) */}
      
      {/* Tier A: Distant Deep Interstellar Field (Slow Parallax -4px) */}
      <div
        className="absolute inset-0 pointer-events-none transition-transform duration-700 ease-out"
        style={{
          transform: `translate3d(${mousePos.x * -4}px, ${mousePos.y * -4}px, 0)`,
        }}
      >
        {farStars.map((s) => (
          <div
            key={s.id}
            className="absolute rounded-full"
            style={{
              top: `${s.top}%`,
              left: `${s.left}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              backgroundColor: s.tint,
              opacity: s.opacity,
            }}
          />
        ))}
      </div>

      {/* Tier B: Mid-distance Stellar Clusters with Twinkle (Medium Parallax -10px) */}
      <div
        className="absolute inset-0 pointer-events-none transition-transform duration-500 ease-out"
        style={{
          transform: `translate3d(${mousePos.x * -10}px, ${mousePos.y * -10}px, 0)`,
        }}
      >
        {midStars.map((s) => (
          <div
            key={s.id}
            className="absolute rounded-full"
            style={{
              top: `${s.top}%`,
              left: `${s.left}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              backgroundColor: s.tint,
              opacity: s.opacity,
              animation: `starTwinkle ${s.duration}s ease-in-out infinite`,
              animationDelay: `${s.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Tier C: Near Radiant Stars with Optical Halo (Fast Parallax -18px) */}
      <div
        className="absolute inset-0 pointer-events-none transition-transform duration-300 ease-out"
        style={{
          transform: `translate3d(${mousePos.x * -18}px, ${mousePos.y * -18}px, 0)`,
        }}
      >
        {nearStars.map((s) => (
          <div
            key={s.id}
            className="absolute rounded-full"
            style={{
              top: `${s.top}%`,
              left: `${s.left}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              backgroundColor: s.tint,
              opacity: s.opacity,
              boxShadow: `0 0 6px ${s.tint}, 0 0 14px ${s.tint}`,
              animation: `starTwinkle ${s.duration}s ease-in-out infinite`,
              animationDelay: `${s.delay}s`,
            }}
          />
        ))}
      </div>

      {/* 4. PERSPECTIVE CELESTIAL ORRERY SYSTEM (100% Uncompressed 1:1 Aspect Ratio) */}
      <div
        className="relative w-full h-full flex items-center justify-center transition-transform duration-500 ease-out"
        style={{
          transform: `translate3d(${mousePos.x * 12}px, ${mousePos.y * 8}px, 0)`,
        }}
      >
        {/* SVG ORRERY COORDINATE SPHERE (Perspective Latitudes + Radial Meridians) */}
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
              {/* Fade mask to dissolve grid lines softly at the outer boundary */}
              <radialGradient id="orreryFadeMask" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
                <stop offset="70%" stopColor="#ffffff" stopOpacity="0.7" />
                <stop offset="90%" stopColor="#ffffff" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </radialGradient>

              <mask id="orreryMask">
                <rect width="1000" height="600" fill="url(#orreryFadeMask)" />
              </mask>
            </defs>

            <g mask="url(#orreryMask)">
              {/* PERSPECTIVE RADIAL MERIDIANS (16 Longitude rays spreading into the distance) */}
              {[0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5, 180, 202.5, 225, 247.5, 270, 292.5, 315, 337.5].map((deg) => {
                const rad = (deg * Math.PI) / 180;
                const x2 = 500 + Math.cos(rad) * 640;
                const y2 = 300 + Math.sin(rad) * 370;
                const x1 = 500 + Math.cos(rad) * 40;
                const y1 = 300 + Math.sin(rad) * 24;
                return (
                  <line
                    key={deg}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="rgba(0, 229, 255, 0.12)"
                    strokeWidth="0.8"
                  />
                );
              })}

              {/* CONCENTRIC ORBITAL LATITUDES (Naturally Perspective Ellipses) */}
              <ellipse cx="500" cy="300" rx="140" ry="82" fill="none" stroke="rgba(0, 229, 255, 0.15)" strokeWidth="0.9" />
              <ellipse cx="500" cy="300" rx="250" ry="148" fill="none" stroke="rgba(0, 229, 255, 0.20)" strokeWidth="1" />
              <ellipse cx="500" cy="300" rx="360" ry="214" fill="none" stroke="rgba(0, 229, 255, 0.24)" strokeWidth="1.1" />
              <ellipse cx="500" cy="300" rx="470" ry="280" fill="none" stroke="rgba(0, 229, 255, 0.18)" strokeWidth="0.9" />
              <ellipse cx="500" cy="300" rx="580" ry="346" fill="none" stroke="rgba(0, 229, 255, 0.10)" strokeWidth="0.8" />
            </g>
          </svg>
        </div>

        {/* FLOATING ASTEROID & STARDUST PARTICLES ALONG ORBITS (Gently drifting) */}
        <div
          className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${
            isTransitioning ? 'opacity-0' : 'opacity-100'
          }`}
          style={{ animation: 'cosmicDrift 20s ease-in-out infinite' }}
        >
          {stardust.map((p) => (
            <div
              key={p.id}
              className="absolute rounded-full bg-[#00e5ff]"
              style={{
                left: `calc(50% + ${p.x}px)`,
                top: `calc(50% + ${p.y}px)`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                opacity: p.opacity,
                boxShadow: '0 0 3px #00e5ff',
              }}
            />
          ))}
        </div>

        {/* 5. CENTRAL SOLAR SINGULARITY (100% Perfect Circular Sun with Horizontal Flare) */}
        <div
          className={`absolute pointer-events-none flex items-center justify-center transition-opacity duration-300 ${
            isTransitioning ? 'opacity-0' : 'opacity-100'
          }`}
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* Radiant Solar Corona */}
          <div
            className="w-36 h-36 rounded-full aspect-square bg-[radial-gradient(circle,rgba(255,190,80,0.85)_0%,rgba(255,130,30,0.35)_35%,transparent_70%)] animate-pulse"
            style={{ animationDuration: '3.5s' }}
          />
          
          {/* White-Hot Solar Core (Strictly 1:1 Aspect Ratio) */}
          <div className="absolute w-8 h-8 rounded-full aspect-square bg-[#ffffff] shadow-[0_0_30px_rgba(255,255,255,1),0_0_60px_rgba(255,180,60,0.9),0_0_90px_rgba(255,120,20,0.6)]" />

          {/* Anamorphic Horizontal Lens Flare (Warframe signature laser streak) */}
          <div
            className="absolute h-[1.5px] pointer-events-none"
            style={{
              width: '440px',
              background: 'linear-gradient(90deg, transparent 0%, rgba(255, 210, 140, 0.3) 25%, #ffffff 50%, rgba(255, 210, 140, 0.3) 75%, transparent 100%)',
              boxShadow: '0 0 12px rgba(255, 190, 80, 0.9), 0 0 24px rgba(255, 140, 40, 0.5)',
            }}
          />
        </div>

        {/* 6. «ПРОФИЛЬ» (Active Sector — Lower-Left Orbit — 100% Round Sphere) */}
        <div
          onClick={() => handlePlanetClick('earth')}
          className={`group absolute cursor-pointer flex flex-col items-center transition-all duration-500 ease-out z-20 ${
            isTransitioning && selectedPlanet !== 'earth' ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          style={{
            left: 'calc(50% - 250px)',
            top: 'calc(50% + 80px)',
            transform: selectedPlanet === 'earth'
              ? 'translate(250px, -80px) scale(2.6)'
              : 'translate(-50%, -50%) scale(1)',
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Planet Sphere + Perfectly Aligned Reticle */}
          <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
            {/* Tactical Targeting Reticle strictly around the sphere */}
            <TacticalReticle color="#10b981" />

            {/* Glowing Atmospheric Aura */}
            <div
              className="absolute inset-0 rounded-full blur-2xl opacity-0 group-hover:opacity-40 transition-opacity duration-500 pointer-events-none"
              style={{ background: '#10b981' }}
            />

            {/* Sphere with Directional Sun Illumination */}
            <div className="relative w-full h-full rounded-full aspect-square overflow-hidden bg-gradient-to-br from-emerald-950 via-[#0a2020] to-[#041014] shadow-[0_0_35px_rgba(16,185,129,0.45),inset_18px_18px_36px_rgba(0,0,0,0.95)] group-hover:scale-105 group-hover:shadow-[0_0_55px_rgba(16,185,129,0.75)] transition-all duration-300">
              <img
                src="/earth_clean.webp"
                alt="Profile"
                width={144}
                height={144}
                loading="eager"
                decoding="async"
                className="w-full h-full object-cover select-none pointer-events-none animate-sedna-spin aspect-square"
                style={{ animationDuration: '120s' }}
              />

              <div
                className="absolute inset-0 rounded-full pointer-events-none aspect-square"
                style={{
                  background: 'radial-gradient(circle at 72% 28%, rgba(255, 210, 150, 0.35) 0%, transparent 60%)',
                  boxShadow: 'inset 0 0 20px rgba(16, 185, 129, 0.55)',
                }}
              />
            </div>
          </div>

          {/* Badge & Tactical Sector HUD */}
          <div
            className={`flex flex-col items-center mt-3.5 transition-all duration-200 ${
              selectedPlanet === 'earth' ? 'opacity-0 scale-90' : 'opacity-100 scale-100'
            }`}
          >
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#041410]/90 border border-[#10b981]/60 shadow-[0_0_16px_rgba(16,185,129,0.4)] group-hover:border-[#34d399] group-hover:bg-[#061e18] group-hover:shadow-[0_0_24px_rgba(16,185,129,0.7)] group-hover:scale-105 transition-all">
              <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
              <span className="text-xs sm:text-sm font-comfortaa font-bold text-white tracking-wider uppercase">
                {lang === 'ru' ? 'Профиль' : 'Profile'}
              </span>
            </div>
            <span className="text-[10px] font-jetbrains font-medium text-emerald-400/80 tracking-wider mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {lang === 'ru' ? 'СЕКТОР • КОНСОЛЬ' : 'SECTOR • CONSOLE'}
            </span>
          </div>
        </div>

        {/* 7. «МАРКЕТ» (Active Sector — Upper-Right Orbit — 100% Round Sphere) */}
        <div
          onClick={() => handlePlanetClick('sedna')}
          className={`group absolute cursor-pointer flex flex-col items-center transition-all duration-500 ease-out z-20 ${
            isTransitioning && selectedPlanet !== 'sedna' ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          style={{
            left: 'calc(50% + 310px)',
            top: 'calc(50% - 100px)',
            transform: selectedPlanet === 'sedna'
              ? 'translate(-310px, 100px) scale(2.6)'
              : 'translate(-50%, -50%) scale(1)',
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Planet Sphere + Perfectly Aligned Reticle */}
          <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
            {/* Tactical Targeting Reticle strictly around the sphere */}
            <TacticalReticle color="#00e5ff" />

            {/* Glowing Atmospheric Aura */}
            <div
              className="absolute inset-0 rounded-full blur-2xl opacity-0 group-hover:opacity-40 transition-opacity duration-500 pointer-events-none"
              style={{ background: '#00e5ff' }}
            />

            {/* Sphere with Directional Sun Illumination */}
            <div className="relative w-full h-full rounded-full aspect-square overflow-hidden bg-gradient-to-br from-[#062438] via-[#051522] to-[#020910] shadow-[0_0_35px_rgba(0,229,255,0.45),inset_-18px_-18px_36px_rgba(0,0,0,0.95)] group-hover:scale-105 group-hover:shadow-[0_0_55px_rgba(0,229,255,0.75)] transition-all duration-300">
              <img
                src="/sedna_clean.webp"
                alt="Market"
                width={144}
                height={144}
                loading="eager"
                decoding="async"
                className="w-full h-full object-cover select-none pointer-events-none animate-sedna-spin aspect-square"
                style={{ animationDuration: '90s' }}
              />

              <div
                className="absolute inset-0 rounded-full pointer-events-none aspect-square"
                style={{
                  background: 'radial-gradient(circle at 28% 72%, rgba(255, 210, 150, 0.35) 0%, transparent 60%)',
                  boxShadow: 'inset 0 0 20px rgba(0, 229, 255, 0.55)',
                }}
              />
            </div>
          </div>

          {/* Badge & Tactical Sector HUD */}
          <div
            className={`flex flex-col items-center mt-3.5 transition-all duration-200 ${
              selectedPlanet === 'sedna' ? 'opacity-0 scale-90' : 'opacity-100 scale-100'
            }`}
          >
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#040e18]/90 border border-[#00e5ff]/60 shadow-[0_0_16px_rgba(0,229,255,0.4)] group-hover:border-[#00e5ff] group-hover:bg-[#061524] group-hover:shadow-[0_0_24px_rgba(0,229,255,0.7)] group-hover:scale-105 transition-all">
              <span className="w-2 h-2 rounded-full bg-[#00e5ff] animate-pulse" />
              <span className="text-xs sm:text-sm font-comfortaa font-bold text-white tracking-wider uppercase">
                {lang === 'ru' ? 'Маркет' : 'Market'}
              </span>
            </div>
            <span className="text-[10px] font-jetbrains font-medium text-cyan-400/80 tracking-wider mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {lang === 'ru' ? 'СЕКТОР • ТОРГОВЛЯ' : 'SECTOR • MARKETPLACE'}
            </span>
          </div>
        </div>

        {/* 8. «МР В ЭНДО» (Active Sector — Upper-Left Orbit — Venus 100% Round Sphere) */}
        <div
          onClick={() => handlePlanetClick('venus')}
          className={`group absolute cursor-pointer flex flex-col items-center transition-all duration-500 ease-out z-20 ${
            isTransitioning && selectedPlanet !== 'venus' ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          style={{
            left: 'calc(50% - 220px)',
            top: 'calc(50% - 135px)',
            transform: selectedPlanet === 'venus'
              ? 'translate(220px, 135px) scale(2.6)'
              : 'translate(-50%, -50%) scale(1)',
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Planet Sphere + Perfectly Aligned Reticle */}
          <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
            {/* Tactical Targeting Reticle strictly around the sphere */}
            <TacticalReticle color="#00e5ff" />

            {/* Glowing Atmospheric Aura */}
            <div
              className="absolute inset-0 rounded-full blur-2xl opacity-0 group-hover:opacity-40 transition-opacity duration-500 pointer-events-none"
              style={{ background: '#00e5ff' }}
            />

            {/* Sphere with Directional Sun Illumination */}
            <div className="relative w-full h-full rounded-full aspect-square overflow-hidden bg-gradient-to-br from-[#052030] via-[#041420] to-[#020a12] shadow-[0_0_35px_rgba(0,229,255,0.35),inset_18px_-18px_36px_rgba(0,0,0,0.95)] group-hover:scale-105 group-hover:shadow-[0_0_55px_rgba(0,229,255,0.65)] transition-all duration-300">
              <img
                src="/venus_clean.webp"
                alt="Rivens-endo"
                width={144}
                height={144}
                loading="eager"
                decoding="async"
                className="w-full h-full object-cover select-none pointer-events-none animate-sedna-spin aspect-square"
                style={{ animationDuration: '110s' }}
              />

              <div
                className="absolute inset-0 rounded-full pointer-events-none aspect-square"
                style={{
                  background: 'radial-gradient(circle at 75% 75%, rgba(0, 229, 255, 0.25) 0%, transparent 60%)',
                  boxShadow: 'inset 0 0 18px rgba(0, 229, 255, 0.45)',
                }}
              />
            </div>
          </div>

          {/* Badge & Tactical Sector HUD */}
          <div
            className={`flex flex-col items-center mt-3.5 transition-all duration-200 ${
              selectedPlanet === 'venus' ? 'opacity-0 scale-90' : 'opacity-100 scale-100'
            }`}
          >
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#050e18]/90 border border-[#00e5ff]/50 shadow-[0_0_16px_rgba(0,229,255,0.25)] group-hover:border-[#00e5ff] group-hover:bg-[#071626] group-hover:shadow-[0_0_24px_rgba(0,229,255,0.55)] group-hover:scale-105 transition-all">
              <span className="w-2 h-2 rounded-full bg-[#00e5ff] animate-pulse" />
              <span className="text-xs sm:text-sm font-comfortaa font-bold text-white tracking-wider uppercase">
                {lang === 'ru' ? 'МР в эндо' : 'Rivens-endo'}
              </span>
            </div>
            <span className="text-[10px] font-jetbrains font-medium text-cyan-400/80 tracking-wider mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {lang === 'ru' ? 'СЕКТОР • УТИЛИЗАЦИЯ' : 'SECTOR • DISSOLUTION'}
            </span>
          </div>
        </div>

        {/* 9. «ОЦЕНКА МОДОВ» (Active Sector — Lower-Right Orbit — Mars 100% Round Sphere) */}
        <div
          onClick={() => handlePlanetClick('mars')}
          className={`group absolute cursor-pointer flex flex-col items-center transition-all duration-500 ease-out z-20 ${
            isTransitioning && selectedPlanet !== 'mars' ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          style={{
            left: 'calc(50% + 240px)',
            top: 'calc(50% + 110px)',
            transform: selectedPlanet === 'mars'
              ? 'translate(-240px, -110px) scale(2.6)'
              : 'translate(-50%, -50%) scale(1)',
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Planet Sphere + Perfectly Aligned Reticle */}
          <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
            {/* Tactical Targeting Reticle strictly around the sphere */}
            <TacticalReticle color="#f97316" />

            {/* Glowing Atmospheric Aura */}
            <div
              className="absolute inset-0 rounded-full blur-2xl opacity-0 group-hover:opacity-40 transition-opacity duration-500 pointer-events-none"
              style={{ background: '#f97316' }}
            />

            {/* Sphere with Directional Sun Illumination */}
            <div className="relative w-full h-full rounded-full aspect-square overflow-hidden bg-gradient-to-br from-[#2a1005] via-[#1a0a03] to-[#0d0502] shadow-[0_0_35px_rgba(249,115,22,0.45),inset_-18px_-18px_36px_rgba(0,0,0,0.95)] group-hover:scale-105 group-hover:shadow-[0_0_55px_rgba(249,115,22,0.75)] transition-all duration-300">
              <img
                src="/mars_clean.webp"
                alt="Mod Appraisal"
                width={144}
                height={144}
                loading="eager"
                decoding="async"
                className="w-full h-full object-cover select-none pointer-events-none animate-sedna-spin aspect-square"
                style={{ animationDuration: '100s' }}
              />

              <div
                className="absolute inset-0 rounded-full pointer-events-none aspect-square"
                style={{
                  background: 'radial-gradient(circle at 26% 26%, rgba(255, 215, 170, 0.45) 0%, transparent 60%)',
                  boxShadow: 'inset 0 0 20px rgba(249, 115, 22, 0.55)',
                }}
              />
            </div>
          </div>

          {/* Badge & Tactical Sector HUD */}
          <div
            className={`flex flex-col items-center mt-3.5 transition-all duration-200 ${
              selectedPlanet === 'mars' ? 'opacity-0 scale-90' : 'opacity-100 scale-100'
            }`}
          >
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#180a04]/90 border border-[#f97316]/60 shadow-[0_0_16px_rgba(249,115,22,0.4)] group-hover:border-[#ff9800] group-hover:bg-[#240f06] group-hover:shadow-[0_0_24px_rgba(249,115,22,0.7)] group-hover:scale-105 transition-all">
              <span className="w-2 h-2 rounded-full bg-[#f97316] animate-pulse" />
              <span className="text-xs sm:text-sm font-comfortaa font-bold text-white tracking-wider uppercase">
                {lang === 'ru' ? 'Оценка модов' : 'Mod Appraisal'}
              </span>
            </div>
            <span className="text-[10px] font-jetbrains font-medium text-amber-400/80 tracking-wider mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {lang === 'ru' ? 'СЕКТОР • АНАЛИЗ МР' : 'SECTOR • APPRAISAL'}
            </span>
          </div>
        </div>

        {/* 10. RESERVED ORBITAL SLOTS (Clean minimal nodes for future tabs) */}

        {/* Slot 3: Upper-Center (Orbit 4) */}
        <div
          className={`hidden sm:flex absolute pointer-events-none items-center justify-center transition-opacity duration-300 ${
            isTransitioning ? 'opacity-0' : 'opacity-35'
          }`}
          style={{
            left: 'calc(50% + 50px)',
            top: 'calc(50% - 220px)',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="w-5 h-5 rounded-full aspect-square border border-dashed border-[#00e5ff]/50 flex items-center justify-center shadow-[0_0_8px_rgba(0,229,255,0.3)]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00e5ff]" />
          </div>
        </div>

        {/* Slot 4: Far-Left (Orbit 4) */}
        <div
          className={`hidden md:flex absolute pointer-events-none items-center justify-center transition-opacity duration-300 ${
            isTransitioning ? 'opacity-0' : 'opacity-30'
          }`}
          style={{
            left: 'calc(50% - 460px)',
            top: 'calc(50% + 10px)',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="w-5 h-5 rounded-full aspect-square border border-dashed border-[#00e5ff]/50 flex items-center justify-center shadow-[0_0_8px_rgba(0,229,255,0.3)]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00e5ff]" />
          </div>
        </div>

      </div>

      {/* 9. SMOOTH FADE TRANSITION OVERLAY */}
      <div
        className={`absolute inset-0 bg-[#020509] pointer-events-none transition-opacity duration-500 ${
          isTransitioning ? 'opacity-90' : 'opacity-0'
        }`}
      />
    </div>
  );
};
