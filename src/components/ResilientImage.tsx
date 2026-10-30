import { useState } from 'react';
import { SenaLogo } from './SenaLogo';

interface ResilientImageProps {
  src: string;
  alt: string;
  fallbackTitle: string;
  className?: string;
}

export function ResilientImage({
  src,
  alt,
  fallbackTitle,
  className = 'w-full h-full object-cover',
}: ResilientImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className="w-full h-full min-h-[220px] bg-gradient-to-br from-slate-900 via-slate-800 to-[#14532d] flex flex-col items-start justify-end p-6 text-white"
      >
        <SenaLogo monochromeWhite className="w-10 h-10 mb-3" />
        <p className="font-display text-lg font-semibold leading-snug">{fallbackTitle}</p>
        <p className="text-xs text-slate-300 mt-1">Formación Profesional Integral · SENA</p>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
