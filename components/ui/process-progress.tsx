'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

type ProgressProfile =
  | 'analysis'
  | 'export'
  | 'publish'
  | 'upload'
  | 'save'
  | 'generate'
  | 'search'
  | 'sync';

type ProgressStage = {
  threshold: number;
  label: string;
  helper: string;
};

const progressProfiles: Record<ProgressProfile, { durationMs: number; accent: string; surface: string; track: string; bar: string; stages: ProgressStage[] }> = {
  analysis: {
    durationMs: 16000,
    accent: 'text-sky-700',
    surface: 'border-sky-100 bg-sky-50/80',
    track: 'bg-sky-100',
    bar: 'bg-[linear-gradient(90deg,#0ea5e9_0%,#2563eb_100%)]',
    stages: [
      { threshold: 12, label: 'Preparing analysis', helper: 'Structuring the document and collecting signals.' },
      { threshold: 38, label: 'Reading content', helper: 'Parsing text, sections, and context.' },
      { threshold: 68, label: 'Scoring and reasoning', helper: 'Generating insights, warnings, and recommendations.' },
      { threshold: 90, label: 'Finalizing response', helper: 'Packaging results for display and export.' },
    ],
  },
  export: {
    durationMs: 12000,
    accent: 'text-violet-700',
    surface: 'border-violet-100 bg-violet-50/80',
    track: 'bg-violet-100',
    bar: 'bg-[linear-gradient(90deg,#8b5cf6_0%,#4f46e5_100%)]',
    stages: [
      { threshold: 15, label: 'Preparing file', helper: 'Collecting the latest document layout and assets.' },
      { threshold: 42, label: 'Rendering pages', helper: 'Building a download-ready export with formatting.' },
      { threshold: 74, label: 'Packaging output', helper: 'Compressing and preparing the final file.' },
      { threshold: 92, label: 'Finishing export', helper: 'Almost ready to download.' },
    ],
  },
  publish: {
    durationMs: 15000,
    accent: 'text-emerald-700',
    surface: 'border-emerald-100 bg-emerald-50/80',
    track: 'bg-emerald-100',
    bar: 'bg-[linear-gradient(90deg,#10b981_0%,#059669_100%)]',
    stages: [
      { threshold: 14, label: 'Preparing publish package', helper: 'Building the file and visibility settings.' },
      { threshold: 40, label: 'Creating secure record', helper: 'Writing links, access rules, and metadata.' },
      { threshold: 72, label: 'Syncing directory state', helper: 'Updating lockers, listings, and repository details.' },
      { threshold: 92, label: 'Finalizing publish', helper: 'Almost ready to open or share.' },
    ],
  },
  upload: {
    durationMs: 11000,
    accent: 'text-amber-700',
    surface: 'border-amber-100 bg-amber-50/80',
    track: 'bg-amber-100',
    bar: 'bg-[linear-gradient(90deg,#f59e0b_0%,#f97316_100%)]',
    stages: [
      { threshold: 18, label: 'Uploading file', helper: 'Moving bytes into the workspace.' },
      { threshold: 52, label: 'Processing upload', helper: 'Validating and preparing the uploaded source.' },
      { threshold: 86, label: 'Finalizing file', helper: 'Almost ready for the next step.' },
    ],
  },
  save: {
    durationMs: 8000,
    accent: 'text-slate-700',
    surface: 'border-slate-200 bg-slate-50/85',
    track: 'bg-slate-200',
    bar: 'bg-[linear-gradient(90deg,#334155_0%,#0f172a_100%)]',
    stages: [
      { threshold: 20, label: 'Saving changes', helper: 'Writing the latest changes safely.' },
      { threshold: 55, label: 'Syncing workspace', helper: 'Updating live state and history.' },
      { threshold: 90, label: 'Finishing save', helper: 'Just wrapping up.' },
    ],
  },
  generate: {
    durationMs: 14000,
    accent: 'text-fuchsia-700',
    surface: 'border-fuchsia-100 bg-fuchsia-50/80',
    track: 'bg-fuchsia-100',
    bar: 'bg-[linear-gradient(90deg,#d946ef_0%,#8b5cf6_100%)]',
    stages: [
      { threshold: 14, label: 'Preparing generation', helper: 'Collecting prompt, context, and output rules.' },
      { threshold: 44, label: 'Drafting content', helper: 'Generating a structured first pass.' },
      { threshold: 76, label: 'Refining output', helper: 'Polishing content for readability and readiness.' },
      { threshold: 92, label: 'Finalizing result', helper: 'Almost ready to review.' },
    ],
  },
  search: {
    durationMs: 7000,
    accent: 'text-cyan-700',
    surface: 'border-cyan-100 bg-cyan-50/80',
    track: 'bg-cyan-100',
    bar: 'bg-[linear-gradient(90deg,#06b6d4_0%,#0284c7_100%)]',
    stages: [
      { threshold: 28, label: 'Searching records', helper: 'Scanning files, filters, and categories.' },
      { threshold: 72, label: 'Ranking results', helper: 'Organizing the best matches for you.' },
      { threshold: 92, label: 'Preparing results', helper: 'Almost ready to show.' },
    ],
  },
  sync: {
    durationMs: 9000,
    accent: 'text-indigo-700',
    surface: 'border-indigo-100 bg-indigo-50/80',
    track: 'bg-indigo-100',
    bar: 'bg-[linear-gradient(90deg,#6366f1_0%,#2563eb_100%)]',
    stages: [
      { threshold: 18, label: 'Connecting workspace', helper: 'Checking the latest live state.' },
      { threshold: 54, label: 'Syncing changes', helper: 'Pulling and reconciling updates.' },
      { threshold: 90, label: 'Finalizing sync', helper: 'Almost ready.' },
    ],
  },
};

export function useProcessProgress(active: boolean, profile: ProgressProfile) {
  const config = progressProfiles[profile];
  const [progress, setProgress] = useState(active ? 6 : 0);
  const startedAtRef = useRef<number | null>(active ? Date.now() : null);

  useEffect(() => {
    if (active) {
      if (!startedAtRef.current) {
        startedAtRef.current = Date.now();
        setProgress(6);
      }

      const timer = window.setInterval(() => {
        const elapsed = Date.now() - (startedAtRef.current || Date.now());
        const ratio = Math.min(elapsed / config.durationMs, 0.96);
        const eased = 6 + Math.round(ratio * 88);
        setProgress((current) => Math.max(current, eased));
      }, 220);

      return () => window.clearInterval(timer);
    }

    if (startedAtRef.current) {
      setProgress(100);
      const timer = window.setTimeout(() => {
        startedAtRef.current = null;
        setProgress(0);
      }, 500);
      return () => window.clearTimeout(timer);
    }

    setProgress(0);
    return undefined;
  }, [active, config.durationMs]);

  const stage = useMemo(() => {
    const fallback = config.stages[config.stages.length - 1];
    return config.stages.find((item) => progress <= item.threshold) || fallback;
  }, [config.stages, progress]);

  const etaSeconds = active
    ? Math.max(1, Math.round(((100 - Math.max(progress, 6)) / 100) * (config.durationMs / 1000)))
    : 0;

  return {
    progress,
    stage,
    etaSeconds,
    config,
  };
}

export function ProcessProgress({
  active,
  profile,
  title,
  className,
  compact = false,
  floating = false,
}: {
  active: boolean;
  profile: ProgressProfile;
  title: string;
  className?: string;
  compact?: boolean;
  floating?: boolean;
}) {
  const { progress, stage, etaSeconds, config } = useProcessProgress(active, profile);

  if (!active && progress === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'rounded-[1.25rem] border px-4 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition-all duration-300',
        config.surface,
        floating
          ? 'pointer-events-none fixed inset-x-3 bottom-3 z-[120] md:inset-x-auto md:bottom-5 md:right-5 md:w-[min(430px,calc(100vw-2.5rem))]'
          : '',
        className,
      )}
      aria-live="polite"
      aria-busy={active}
    >
      <div className={cn('flex items-start justify-between gap-3', compact ? 'items-center' : 'items-start')}>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-white/70 p-2 text-slate-900">
              {active ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-950">{title}</p>
              <p className={cn('text-xs uppercase tracking-[0.18em]', config.accent)}>{stage.label}</p>
            </div>
          </div>
          {!compact ? (
            <p className="mt-3 text-sm leading-6 text-slate-600">{stage.helper}</p>
          ) : null}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xl font-semibold tracking-[-0.03em] text-slate-950">{progress}%</p>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{active ? `ETA ~${etaSeconds}s` : 'Done'}</p>
        </div>
      </div>
      <div className={cn('mt-3 h-2.5 overflow-hidden rounded-full', config.track)}>
        <div className={cn('h-full rounded-full transition-[width] duration-300 ease-out', config.bar)} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
