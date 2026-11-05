import React from 'react';
import platinumImg from '../assets/platinum.webp';

interface PlatinumIconProps {
  className?: string;
  size?: number;
}

export const PlatinumIcon: React.FC<PlatinumIconProps> = ({ className = '', size = 14 }) => {
  return (
    <img
      src={platinumImg}
      alt="Platinum"
      width={size}
      height={size}
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`inline-block align-middle shrink-0 object-contain drop-shadow-[0_0_6px_rgba(0,229,255,0.45)] select-none ${className}`}
      loading="lazy"
      draggable={false}
    />
  );
};
