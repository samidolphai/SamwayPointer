'use client';

import { useState, useEffect } from 'react';

interface Props {
  className?: string;
  height?: number;
}

/**
 * Renders the Samway CSS logo by default.
 * Switches to /samway-logo.png automatically if the file exists.
 * To use the real PNG: save your logo at public/samway-logo.png
 */
export default function SamwayLogo({ className = '', height = 100 }: Props) {
  const [useImg, setUseImg] = useState(false);

  useEffect(() => {
    const img = new window.Image();
    img.onload = () => setUseImg(true);
    img.onerror = () => setUseImg(false);
    img.src = '/samway-logo.png';
  }, []);

  if (useImg) {
    return (
      <img
        src="/samway-logo.png"
        alt="Samway Sandwich"
        style={{ height }}
        className={`w-auto object-contain ${className}`}
      />
    );
  }

  // CSS branded fallback — matches Samway dark-green/white/yellow identity
  return (
    <div
      className={`inline-flex flex-col items-center justify-center select-none ${className}`}
      style={{ height }}
      aria-label="Samway Sandwich"
    >
      <div
        className="rounded-xl px-5 py-1.5 flex flex-col items-center"
        style={{ background: '#1a4f1a', minWidth: height * 1.7 }}
      >
        <div className="flex items-baseline leading-none">
          <span
            className="font-black text-white"
            style={{
              fontSize: height * 0.4,
              textShadow:
                '2px 2px 0 #0a2d0a,-1px -1px 0 #0a2d0a,1px -1px 0 #0a2d0a,-1px 1px 0 #0a2d0a',
              letterSpacing: '-0.01em',
            }}
          >
            SAM
          </span>
          <span
            className="font-black"
            style={{
              fontSize: height * 0.4,
              color: '#f9c900',
              textShadow:
                '2px 2px 0 #0a2d0a,-1px -1px 0 #0a2d0a,1px -1px 0 #0a2d0a,-1px 1px 0 #0a2d0a',
              letterSpacing: '-0.01em',
            }}
          >
            WAY
          </span>
        </div>
        <div
          className="flex items-center justify-center border-t border-yellow-400 pt-0.5 mt-0.5 w-full"
          style={{ fontSize: height * 0.13 }}
        >
          <span className="font-extrabold" style={{ color: '#f9c900' }}>Sand</span>
          <span className="font-extrabold text-white">wich</span>
        </div>
      </div>
    </div>
  );
}
