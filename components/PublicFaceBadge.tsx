'use client';

import type { PublicFaceCategory } from '@/types/document';

export const PUBLIC_FACE_CATEGORY_LABELS: Record<PublicFaceCategory, string> = {
  actor_actress: 'Actor / Actress',
  singer_musician: 'Singer / Musician',
  athlete_sportsperson: 'Athlete / Sportsperson',
  model: 'Model',
  content_creator: 'Content Creator',
  influencer: 'Influencer',
  politician: 'Politician',
  entrepreneur_ceo: 'Entrepreneur / CEO',
  author_writer: 'Author / Writer',
  academic_scientist: 'Academic / Scientist',
  tv_personality: 'TV Personality',
  comedian: 'Comedian',
  social_activist: 'Social Activist',
  chef_culinary: 'Chef / Culinary Expert',
  fashion_designer: 'Fashion Designer',
  photographer_videographer: 'Photographer / Videographer',
  game_streamer: 'Game Streamer',
  journalist: 'Journalist',
  other: 'Public Figure',
};

export const PUBLIC_FACE_CATEGORY_ICONS: Record<PublicFaceCategory, string> = {
  actor_actress: '🎭',
  singer_musician: '🎵',
  athlete_sportsperson: '🏆',
  model: '✨',
  content_creator: '🎬',
  influencer: '📱',
  politician: '🏛️',
  entrepreneur_ceo: '💼',
  author_writer: '📖',
  academic_scientist: '🔬',
  tv_personality: '📺',
  comedian: '😄',
  social_activist: '✊',
  chef_culinary: '👨‍🍳',
  fashion_designer: '👗',
  photographer_videographer: '📷',
  game_streamer: '🎮',
  journalist: '📰',
  other: '⭐',
};

/* no injected keyframes needed */
const PF_STYLE = ``;

interface PublicFaceBadgeProps {
  category: PublicFaceCategory;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showIcon?: boolean;
}

export default function PublicFaceBadge({
  category,
  size = 'md',
  showLabel = true,
  showIcon = true,
}: PublicFaceBadgeProps) {
  const label = PUBLIC_FACE_CATEGORY_LABELS[category] || 'Public Figure';
  const icon  = PUBLIC_FACE_CATEGORY_ICONS[category]  || '⭐';

  const dims     = { sm: 14, md: 18, lg: 24 }[size];
  const fontSize = { sm: 9,  md: 10.5, lg: 13 }[size];
  const iconSize = { sm: 10, md: 12,   lg: 16 }[size];
  const gap      = { sm: 3,  md: 4,    lg: 6  }[size];
  const px       = { sm: 5,  md: 7,    lg: 10 }[size];
  const py       = { sm: 2,  md: 3,    lg: 5  }[size];

  return (
    <>
      <style>{PF_STYLE}</style>
      <div
        className="inline-flex items-center"
        style={{ gap }}
        title={`Public Face — ${label}`}
      >
        {/* Platinum star icon */}
        <PlatinumStarSvg size={dims} id={`pfg-${size}`} />

        {showLabel && (
          <div
            className="inline-flex items-center"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.11)',
              borderRadius: 100,
              padding: `${py}px ${px}px`,
              gap: 4,
            }}
          >
            {showIcon && <span style={{ fontSize: iconSize, lineHeight: 1 }}>{icon}</span>}
            <span style={{ fontSize, fontWeight: 600, letterSpacing: '0.04em', lineHeight: 1, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase' }}>
              {label}
            </span>
          </div>
        )}
      </div>
    </>
  );
}

/* ─── Platinum star SVG (shared shape, platinum gradient) ──────────────────── */
function PlatinumStarSvg({ size, id }: { size: number; id: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#6a6a6a" />
          <stop offset="35%"  stopColor="#c8c8c8" />
          <stop offset="60%"  stopColor="#f0f0f0" />
          <stop offset="100%" stopColor="#8a8a8a" />
        </linearGradient>
      </defs>
      <circle cx="10" cy="10" r="9" fill={`url(#${id})`} />
      <path
        d="M10 4.5l1.4 3.1 3.4.3-2.5 2.2.8 3.3L10 11.8l-3.1 1.6.8-3.3-2.5-2.2 3.4-.3z"
        fill="#111111"
        opacity="0.85"
      />
    </svg>
  );
}

/* ─── Compact inline icon-only variant ─────────────────────────────────────── */
export function PublicFaceStarIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="pfstar-pt" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#6a6a6a" />
          <stop offset="40%"  stopColor="#d4d4d4" />
          <stop offset="65%"  stopColor="#f2f2f2" />
          <stop offset="100%" stopColor="#888888" />
        </linearGradient>
      </defs>
      <circle cx="10" cy="10" r="9" fill="url(#pfstar-pt)" />
      <path
        d="M10 4.5l1.4 3.1 3.4.3-2.5 2.2.8 3.3L10 11.8l-3.1 1.6.8-3.3-2.5-2.2 3.4-.3z"
        fill="#111111"
        opacity="0.85"
      />
    </svg>
  );
}
