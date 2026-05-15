'use client';

interface VerifiedBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function VerifiedBadge({ size = 'md', className = '' }: VerifiedBadgeProps) {
  const dim = size === 'sm' ? 14 : size === 'lg' ? 24 : 18;
  return (
    <svg
      width={dim}
      height={dim}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ filter: 'drop-shadow(0 0 4px rgba(212,175,55,0.55))' }}
      aria-label="Verified"
    >
      <defs>
        <linearGradient id="vbGoldCircle" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E8CC7A" />
          <stop offset="50%" stopColor="#C9A84C" />
          <stop offset="100%" stopColor="#E8CC7A" />
        </linearGradient>
      </defs>
      {/* Gold circle background */}
      <circle cx="12" cy="12" r="11" fill="url(#vbGoldCircle)" />
      {/* Inner subtle ring for depth */}
      <circle cx="12" cy="12" r="10" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5" />
      {/* White checkmark */}
      <path
        d="M7.5 12.5L10.5 15.5L16.5 9"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
