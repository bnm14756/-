import React from 'react';

interface HyundaiBrandMarkProps {
  size?: 'lg' | 'md' | 'sm';
  showWordmark?: boolean;
}

export const HyundaiBrandMark: React.FC<HyundaiBrandMarkProps> = ({
  size = 'lg',
  showWordmark = true,
}) => {
  const dimensions =
    size === 'lg'
      ? 'w-16 h-9 sm:w-20 sm:h-11'
      : size === 'md'
        ? 'w-12 h-7'
        : 'w-9 h-5';

  return (
    <div className="inline-flex items-center gap-3 shrink-0 select-none">
      <svg
        viewBox="0 0 120 64"
        className={dimensions}
        role="img"
        aria-label="현대자동차그룹 엠블럼"
      >
        <defs>
          <linearGradient id="hyundaiMetal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F8FAFC" />
            <stop offset="45%" stopColor="#CBD5E1" />
            <stop offset="100%" stopColor="#64748B" />
          </linearGradient>
          <linearGradient id="hyundaiInner" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#002C5F" />
            <stop offset="100%" stopColor="#07162E" />
          </linearGradient>
        </defs>
        {/* Outer metallic oval ring */}
        <ellipse
          cx="60"
          cy="32"
          rx="55"
          ry="27"
          fill="url(#hyundaiInner)"
          stroke="url(#hyundaiMetal)"
          strokeWidth="4.5"
        />
        {/* Inner subtle rim */}
        <ellipse
          cx="60"
          cy="32"
          rx="49"
          ry="21.5"
          fill="none"
          stroke="#E2E8F0"
          strokeOpacity="0.25"
          strokeWidth="1"
        />
        {/* Tilted handshake H emblem */}
        <path
          d="M 33 49 C 35 33 40 20 46 14 L 53 14 C 48 21 44 30 43 35 C 51 28 65 26 76 29 C 78 22 81 17 85 14 L 92 14 C 87 22 83 34 81 49 L 73 49 C 74 42 75 37 76 34 C 66 31 53 33 42 40 C 41 44 40 46 40 49 Z"
          fill="url(#hyundaiMetal)"
        />
      </svg>

      {showWordmark && (
        <div className="leading-none">
          <div className="text-sm sm:text-base font-extrabold tracking-[0.18em] text-white whitespace-nowrap">
            HYUNDAI
          </div>
          <div className="text-[10px] sm:text-[11px] font-semibold tracking-[0.12em] text-[#7CC4FF] mt-0.5 whitespace-nowrap">
            MOTOR GROUP · PLEOS
          </div>
        </div>
      )}
    </div>
  );
};
