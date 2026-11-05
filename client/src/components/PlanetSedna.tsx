import React, { useRef, useEffect } from 'react';

interface PlanetSednaProps {
  size?: number; // e.g. 120, 160, 200
  isActive?: boolean;
  onClick?: () => void;
  tabLabel?: string;
}

export const PlanetSedna: React.FC<PlanetSednaProps> = ({
  size = 140,
  isActive = true,
  onClick,
  tabLabel = 'СЕДНА — МАРКЕТ',
}) => {
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col items-center focus:outline-none transition-all duration-300"
      style={{ width: size + 60 }}
    >
      {/* Container for Planet Sphere and Celestial Rings */}
      <div 
        className="relative flex items-center justify-center"
        style={{ width: size + 40, height: size + 40 }}
      >
        {/* Outer Orbit Coordinate Ring (Warframe Star Chart style) */}
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

        {/* Subtle Warm Rim Glow for Sedna (No neon) */}
        <div
          className={`absolute rounded-full transition-opacity duration-300 pointer-events-none ${
            isActive ? 'opacity-30' : 'opacity-0 group-hover:opacity-20'
          }`}
          style={{
            width: size,
            height: size,
            background: 'radial-gradient(circle, rgba(185, 167, 122, 0.4) 0%, transparent 70%)',
            filter: 'blur(12px)',
          }}
        />

        {/* Clean Sedna Celestial Body (Official Warframe Texture, Ships Removed) */}
        <div
          className="relative rounded-full overflow-hidden transition-transform duration-300 ease-out group-hover:scale-105"
          style={{
            width: size,
            height: size,
            boxShadow: isActive 
              ? 'inset -12px -12px 30px rgba(0,0,0,0.9), 0 0 20px rgba(185, 167, 122, 0.25)' 
              : 'inset -12px -12px 30px rgba(0,0,0,0.95), 0 0 10px rgba(0,0,0,0.5)',
          }}
        >
          <img
            src="/sedna_clean.png"
            alt="Седна (Sedna)"
            className="w-full h-full object-cover select-none pointer-events-none animate-sedna-spin"
            style={{
              animationDuration: '60s',
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite',
            }}
          />

          {/* Spherical Shadow Overlay (Terminator Enhancement) */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle at 68% 72%, rgba(255,180,140,0.1) 0%, transparent 50%, rgba(5,6,8,0.85) 90%)',
            }}
          />
        </div>

        {/* Selected Marker Node (Top Dot) */}
        {isActive && (
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#b9a77a] shadow-[0_0_8px_#b9a77a]" />
        )}
      </div>

      {/* Tab Label (Replaces Planet Name) */}
      <div className="mt-2 text-center">
        <span
          className={`block font-raleway text-xs font-medium tracking-wider uppercase transition-colors ${
            isActive ? 'text-[#e9e8e4]' : 'text-[#a3a29d] group-hover:text-[#e9e8e4]'
          }`}
        >
          {tabLabel}
        </span>
        <span className="block font-mono text-[11px] text-[#6b6a66] mt-0.5">
          Лоты и Аналитика
        </span>
      </div>
    </button>
  );
};
