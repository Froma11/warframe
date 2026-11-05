import React from 'react';

interface PlanetEarthProps {
  size?: number;
  isActive?: boolean;
  onClick?: () => void;
  lang?: 'ru' | 'en';
}

export const PlanetEarth: React.FC<PlanetEarthProps> = ({
  size = 140,
  isActive = false,
  onClick,
  lang = 'ru',
}) => {
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col items-center focus:outline-none transition-all duration-300"
      style={{ width: size + 60 }}
    >
      <div 
        className="relative flex items-center justify-center"
        style={{ width: size + 40, height: size + 40 }}
      >
        {/* Outer Orbit Coordinate Ring */}
        <div
          className={`absolute rounded-full pointer-events-none transition-all duration-500 ${
            isActive
              ? 'border border-[#b9a77a]/70 opacity-100 scale-100'
              : 'border border-white/10 opacity-40 scale-95 group-hover:opacity-70 group-hover:scale-100'
          }`}
          style={{
            width: size + 36,
            height: size + 36,
            borderStyle: 'dashed',
            borderWidth: '1px',
          }}
        />

        {/* Subtle Atmospheric Rim Glow */}
        <div
          className={`absolute rounded-full transition-opacity duration-300 pointer-events-none ${
            isActive ? 'opacity-30' : 'opacity-0 group-hover:opacity-20'
          }`}
          style={{
            width: size,
            height: size,
            background: 'radial-gradient(circle, rgba(56, 189, 248, 0.4) 0%, transparent 70%)',
            filter: 'blur(12px)',
          }}
        />

        {/* Clean Earth Celestial Body */}
        <div
          className="relative rounded-full overflow-hidden transition-transform duration-300 ease-out group-hover:scale-105"
          style={{
            width: size,
            height: size,
            boxShadow: isActive 
              ? 'inset -12px -12px 30px rgba(0,0,0,0.9), 0 0 20px rgba(56, 189, 248, 0.25)' 
              : 'inset -12px -12px 30px rgba(0,0,0,0.95), 0 0 10px rgba(0,0,0,0.5)',
          }}
        >
          <img
            src="/earth_clean.png"
            alt="Земля (Earth)"
            className="w-full h-full object-cover select-none pointer-events-none animate-sedna-spin"
            style={{
              animationDuration: '100s',
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite',
            }}
          />

          {/* Spherical Shadow Overlay (Terminator) */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.05) 0%, transparent 55%, rgba(5,6,8,0.85) 95%)',
            }}
          />
        </div>

        {/* Selected Marker Node (Top Dot) */}
        {isActive && (
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#b9a77a] shadow-[0_0_8px_#b9a77a]" />
        )}
      </div>

      {/* Tab Label */}
      <div className="mt-2 text-center">
        <span
          className={`block font-raleway text-xs font-medium tracking-wider uppercase transition-colors ${
            isActive ? 'text-ink-1' : 'text-ink-2 group-hover:text-ink-1'
          }`}
        >
          {lang === 'ru' ? 'ЗЕМЛЯ — ПРОФИЛЬ' : 'EARTH — PROFILE'}
        </span>
        <span className="block font-mono text-[11px] text-ink-3 mt-0.5">
          {lang === 'ru' ? 'Заметки и Доступ' : 'Notes & Access'}
        </span>
      </div>
    </button>
  );
};
