import React from 'react';

interface PlanetNavigationProps {
  activeTab: 'sedna' | 'earth';
  onSelectTab: (tab: 'sedna' | 'earth') => void;
  lang: 'ru' | 'en';
}

export const PlanetNavigation: React.FC<PlanetNavigationProps> = ({
  activeTab,
  onSelectTab,
  lang,
}) => {
  return (
    <section className="relative w-full bg-[#070d14] overflow-hidden select-none border-b border-white/[0.08]">
      
      {/* Top Anamorphic Light Beam */}
      <div className="anamorphic-beam w-full absolute top-0 left-0 z-20" />

      {/* Subtle Starfield & Grid */}
      <div className="absolute inset-0 warframe-grid opacity-25 pointer-events-none" />
      <div 
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          background: 'radial-gradient(circle at 50% 30%, rgba(0, 229, 255, 0.08) 0%, transparent 60%)',
        }}
      />

      <div className="max-w-[1920px] mx-auto px-6 py-6 relative z-10 flex flex-col items-center">
        
        {/* Planet Showcase Row */}
        <div className="w-full max-w-4xl flex items-center justify-around sm:justify-center gap-10 sm:gap-36 pt-2 pb-4">
          
          {/* 1. LEFT PLANET: МАРКЕТ МИСТИКАТОРОВ (Sedna sphere) */}
          <div
            onClick={() => onSelectTab('sedna')}
            className={`cursor-pointer flex flex-col items-center transition-all duration-300 group ${
              activeTab === 'sedna' ? 'scale-105 z-20' : 'scale-95 z-10 hover:scale-100'
            }`}
          >
            {/* ONLY Primary Label Above Planet */}
            <div className="text-center mb-3">
              <span className="text-base sm:text-lg font-raleway font-bold tracking-wider uppercase text-white transition-colors">
                {lang === 'ru' ? 'МАРКЕТ МИСТИКАТОРОВ' : 'ARCANES MARKET'}
              </span>
            </div>

            {/* Planet Body with Orbit Rings and Reflection */}
            <div className="relative flex items-center justify-center w-36 h-36 sm:w-44 sm:h-44">
              
              {/* Tilted Concentric Orbit Coordinate Rings when Active */}
              {activeTab === 'sedna' && (
                <>
                  <div
                    className="absolute w-52 h-52 sm:w-64 sm:h-64 rounded-full border border-[#00e5ff]/50 pointer-events-none"
                    style={{
                      transform: 'rotateX(72deg) rotateZ(-20deg)',
                      borderStyle: 'dashed',
                    }}
                  />
                  <div
                    className="absolute w-60 h-60 sm:w-72 sm:h-72 rounded-full border border-[#b9a77a]/40 pointer-events-none"
                    style={{
                      transform: 'rotateX(68deg) rotateZ(35deg)',
                    }}
                  />

                  {/* Constellation Nodes Overlay */}
                  <svg
                    className="absolute inset-0 w-36 h-36 sm:w-44 sm:h-44 pointer-events-none opacity-70"
                    viewBox="0 0 160 160"
                  >
                    <line x1="30" y1="50" x2="70" y2="35" stroke="#ffffff" strokeWidth="1" opacity="0.7" />
                    <line x1="70" y1="35" x2="110" y2="55" stroke="#ffffff" strokeWidth="1" opacity="0.7" />
                    <line x1="70" y1="35" x2="80" y2="80" stroke="#00e5ff" strokeWidth="1" opacity="0.9" />
                    <line x1="80" y1="80" x2="125" y2="105" stroke="#ffffff" strokeWidth="1" opacity="0.7" />
                    <line x1="80" y1="80" x2="45" y2="110" stroke="#ffffff" strokeWidth="1" opacity="0.7" />
                    <circle cx="30" cy="50" r="2.5" fill="#ffffff" />
                    <circle cx="70" cy="35" r="3" fill="#00e5ff" />
                    <circle cx="110" cy="55" r="2.5" fill="#ffffff" />
                    <circle cx="80" cy="80" r="3.5" fill="#00e5ff" />
                    <circle cx="125" cy="105" r="2.5" fill="#ffffff" />
                    <circle cx="45" cy="110" r="2.5" fill="#ffffff" />
                  </svg>
                </>
              )}

              {/* Planet Sphere */}
              <div 
                className={`relative w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden planet-reflection transition-all duration-300 ${
                  activeTab === 'sedna' ? 'opacity-100 scale-100' : 'opacity-75 group-hover:opacity-100 scale-95'
                }`}
                style={{
                  boxShadow: activeTab === 'sedna'
                    ? 'inset -14px -14px 28px rgba(0,0,0,0.95), 0 0 32px rgba(0, 229, 255, 0.45)'
                    : 'inset -10px -10px 20px rgba(0,0,0,0.95), 0 0 10px rgba(0,0,0,0.5)',
                }}
              >
                <img
                  src="/sedna_clean.png"
                  alt="Market"
                  className="w-full h-full object-cover select-none pointer-events-none animate-sedna-spin"
                />
                <div
                  className="absolute inset-0 rounded-full pointer-events-none"
                  style={{
                    background: 'radial-gradient(circle at 65% 70%, rgba(255,180,140,0.08) 0%, transparent 55%, rgba(5,6,8,0.9) 92%)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* 2. RIGHT PLANET: ЛИЧНЫЙ КАБИНЕТ (Earth sphere) */}
          <div
            onClick={() => onSelectTab('earth')}
            className={`cursor-pointer flex flex-col items-center transition-all duration-300 group ${
              activeTab === 'earth' ? 'scale-105 z-20' : 'scale-95 z-10 hover:scale-100'
            }`}
          >
            {/* ONLY Primary Label Above Planet */}
            <div className="text-center mb-3">
              <span className="text-base sm:text-lg font-raleway font-bold tracking-wider uppercase text-white transition-colors">
                {lang === 'ru' ? 'ЛИЧНЫЙ КАБИНЕТ' : 'PERSONAL CABINET'}
              </span>
            </div>

            {/* Planet Body with Orbit Rings and Reflection */}
            <div className="relative flex items-center justify-center w-36 h-36 sm:w-44 sm:h-44">
              
              {/* Tilted Concentric Orbit Coordinate Rings when Active */}
              {activeTab === 'earth' && (
                <>
                  <div
                    className="absolute w-52 h-52 sm:w-64 sm:h-64 rounded-full border border-[#00e5ff]/50 pointer-events-none"
                    style={{
                      transform: 'rotateX(72deg) rotateZ(15deg)',
                      borderStyle: 'dashed',
                    }}
                  />
                  <div
                    className="absolute w-60 h-60 sm:w-72 sm:h-72 rounded-full border border-[#7fa88a]/45 pointer-events-none"
                    style={{
                      transform: 'rotateX(68deg) rotateZ(-30deg)',
                    }}
                  />

                  {/* Constellation Nodes Overlay */}
                  <svg
                    className="absolute inset-0 w-36 h-36 sm:w-44 sm:h-44 pointer-events-none opacity-70"
                    viewBox="0 0 160 160"
                  >
                    <line x1="40" y1="45" x2="80" y2="40" stroke="#ffffff" strokeWidth="1" opacity="0.7" />
                    <line x1="80" y1="40" x2="120" y2="60" stroke="#ffffff" strokeWidth="1" opacity="0.7" />
                    <line x1="80" y1="40" x2="75" y2="85" stroke="#00e5ff" strokeWidth="1" opacity="0.9" />
                    <line x1="75" y1="85" x2="115" y2="115" stroke="#ffffff" strokeWidth="1" opacity="0.7" />
                    <line x1="75" y1="85" x2="40" y2="100" stroke="#ffffff" strokeWidth="1" opacity="0.7" />
                    <circle cx="40" cy="45" r="2.5" fill="#ffffff" />
                    <circle cx="80" cy="40" r="3" fill="#00e5ff" />
                    <circle cx="120" cy="60" r="2.5" fill="#ffffff" />
                    <circle cx="75" cy="85" r="3.5" fill="#00e5ff" />
                    <circle cx="115" cy="115" r="2.5" fill="#ffffff" />
                    <circle cx="40" cy="100" r="2.5" fill="#ffffff" />
                  </svg>
                </>
              )}

              {/* Planet Sphere */}
              <div 
                className={`relative w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden planet-reflection transition-all duration-300 ${
                  activeTab === 'earth' ? 'opacity-100 scale-100' : 'opacity-75 group-hover:opacity-100 scale-95'
                }`}
                style={{
                  boxShadow: activeTab === 'earth'
                    ? 'inset -14px -14px 28px rgba(0,0,0,0.95), 0 0 32px rgba(0, 229, 255, 0.45)'
                    : 'inset -10px -10px 20px rgba(0,0,0,0.95), 0 0 10px rgba(0,0,0,0.5)',
                }}
              >
                <img
                  src="/earth_clean.png"
                  alt="Profile"
                  className="w-full h-full object-cover select-none pointer-events-none animate-sedna-spin"
                  style={{ animationDuration: '120s' }}
                />
                <div
                  className="absolute inset-0 rounded-full pointer-events-none"
                  style={{
                    boxShadow: 'inset 0 0 16px rgba(0, 229, 255, 0.45)',
                  }}
                />
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Bottom Anamorphic Light Beam */}
      <div className="anamorphic-beam w-full absolute bottom-0 left-0 z-20" />
    </section>
  );
};
