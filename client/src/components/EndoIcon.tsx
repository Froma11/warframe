import React from 'react';

interface EndoIconProps {
  className?: string;
  size?: number;
}

export const EndoIcon: React.FC<EndoIconProps> = ({ className = '', size = 16 }) => {
  return (
    <img
      src="/endo.png"
      alt="Endo"
      width={size}
      height={size}
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`inline-block align-middle shrink-0 object-contain drop-shadow-[0_0_8px_rgba(0,229,255,0.65)] select-none ${className}`}
      loading="lazy"
      draggable={false}
    />
  );
};
