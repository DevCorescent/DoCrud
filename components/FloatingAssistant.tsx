'use client';

import { useMemo, useState } from 'react';
import { Clock3, Download, FileText, MessageSquare, Send, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DashboardMetrics, DocumentHistory } from '@/types/document';

interface AssistantMessage {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  bullets?: string[];
}

interface FloatingAssistantProps {
  dashboard: DashboardMetrics;
  history: DocumentHistory[];
}

function buildReply(query: string, dashboard: DashboardMetrics, history: DocumentHistory[]) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return {
      text: 'Ask about document volume, pending reviews, downloads, signatures, or which items need action.',
      bullets: [
        'Try: Which documents need attention?',
        'Try: Show top downloaded documents',
        'Try: Any pending verifications?',
      ],
    };
  }

  if (normalized.includes('pending') || normalized.includes('attention') || normalized.includes('review')) {
    const pendingVerification = history.filter((item) => item.documentsVerificationStatus === 'pending');
    const pendingFeedback = dashboard.documentSummary.filter((item) => item.pendingFeedbackCount > 0);
    return {
      text: 'Current action queue is ready.',
      bullets: [
        `${pendingVerification.length} document${pendingVerification.length === 1 ? '' : 's'} waiting for verification`,
        `${pendingFeedback.reduce((sum, item) => sum + item.pendingFeedbackCount, 0)} feedback item${pendingFeedback.length === 1 ? '' : 's'} still need replies`,
        pendingVerification[0] ? `Most recent verification item: ${pendingVerification[0].templateName} (${pendingVerification[0].referenceNumber || 'no reference'})` : 'No verification backlog is visible right now',
      ],
    };
  }

  if (normalized.includes('download')) {
    const top = [...dashboard.documentSummary].sort((left, right) => right.downloadCount - left.downloadCount).slice(0, 3);
    return {
      text: 'Download activity snapshot:',
      bullets: top.length > 0
        ? top.map((item) => `${item.templateName}: ${item.downloadCount} recipient download${item.downloadCount === 1 ? '' : 's'}`)
        : ['No download activity has been recorded yet.'],
    };
  }

  if (normalized.includes('signature') || normalized.includes('sign')) {
    const signed = history.filter((item) => item.recipientSignedAt);
    return {
      text: `There ${signed.length === 1 ? 'is' : 'are'} ${signed.length} signed document${signed.length === 1 ? '' : 's'} in the current history.`,
      bullets: signed.slice(0, 3).map((item) => `${item.templateName} signed by ${item.recipientSignerName || 'recipient'} on ${new Date(item.recipientSignedAt || item.generatedAt).toLocaleString()}`),
    };
  }

  if (normalized.includes('template') || normalized.includes('popular')) {
    return {
      text: 'Most-used templates in the current dashboard:',
      bullets: dashboard.topTemplates.length > 0
        ? dashboard.topTemplates.slice(0, 4).map((item) => `${item.templateName}: ${item.count} generated`)
        : ['Template usage will appear after more documents are generated.'],
    };
  }

  if (normalized.includes('history') || normalized.includes('recent')) {
    return {
      text: 'Recent operational timeline:',
      bullets: history.slice(0, 4).map((item) => `${item.templateName} by ${item.generatedBy} on ${new Date(item.generatedAt).toLocaleString()}`),
    };
  }

  return {
    text: 'I can help with document operations, analytics, review queues, template usage, signatures, and delivery activity.',
    bullets: [
      'Ask for pending work, downloads, signatures, or recent activity',
      'Use the new Document Operations tab for enterprise editing, file management, and role governance',
    ],
  };
}

export default function FloatingAssistant({ dashboard, history }: FloatingAssistantProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Operations assistant is online.',
      bullets: [
        'Ask about pending verification, document downloads, signatures, or template usage',
        'This chat stays available from anywhere in the dashboard',
      ],
    },
  ]);

  const quickPrompts = useMemo(
    () => ['Which documents need attention?', 'Show top downloaded documents', 'Any recent signatures?'],
    [],
  );

  const submitQuery = (nextQuery?: string) => {
    const value = (nextQuery ?? query).trim();
    if (!value) return;

    const reply = buildReply(value, dashboard, history);
    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: 'user', text: value },
      { id: `assistant-${Date.now() + 1}`, role: 'assistant', text: reply.text, bullets: reply.bullets },
    ]);
    setQuery('');
    setOpen(true);
  };

  return (
    <div className="fixed bottom-3 right-3 z-[70] sm:bottom-5 sm:right-5">
      {open && (
        <div className="mb-3 h-[min(78vh,620px)] w-[min(calc(100vw-1rem),380px)] overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/95 shadow-[0_28px_80px_rgba(15,23,42,0.22)] backdrop-blur sm:mb-4 sm:h-[min(72vh,640px)] sm:w-[min(calc(100vw-2.5rem),420px)]">
          <div className="bg-[linear-gradient(135deg,#111827_0%,#1f2937_48%,#c2410c_100%)] px-4 py-4 text-white sm:px-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.22em] text-orange-200">
                  <Sparkles className="h-4 w-4" />
                  Assistant
                </p>
                <p className="mt-2 max-w-[260px] text-sm leading-6 text-slate-200">Enterprise document intelligence for ops, legal, and HR workflows.</p>
              </div>
              <Button type="button" variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white" onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="flex h-[calc(100%-176px)] flex-col overflow-hidden sm:h-[calc(100%-188px)]">
            <div className="flex-1 space-y-3 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.12),transparent_28%),linear-gradient(180deg,#fff_0%,#fff7ed_100%)] p-3 sm:p-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={message.role === 'assistant'
                  ? 'rounded-2xl border border-orange-100 bg-white p-3 shadow-sm sm:p-4'
                  : 'ml-auto max-w-[88%] rounded-2xl bg-slate-950 p-3 text-white shadow-sm sm:max-w-[85%] sm:p-4'}
              >
                <p className="text-sm leading-6">{message.text}</p>
                {message.bullets && message.bullets.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.bullets.map((bullet) => (
                      <div key={bullet} className="flex items-start gap-2 text-sm text-slate-600">
                        <span className="mt-1 h-2 w-2 rounded-full bg-orange-500" />
                        <span>{bullet}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            </div>
          </div>

          <div className="border-t border-slate-200 bg-white/95 p-3 sm:p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <Button key={prompt} type="button" variant="outline" size="sm" className="max-w-full truncate" onClick={() => submitQuery(prompt)}>
                  {prompt}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ask for a concise operational answer" className="h-11 rounded-xl" />
              <Button type="button" size="icon" className="h-11 w-11 rounded-xl" onClick={() => submitQuery()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />Live dashboard answers</span>
              <span className="inline-flex items-center gap-1"><Download className="h-3.5 w-3.5" />Delivery insights</span>
              <span className="inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" />Document-aware</span>
            </div>
          </div>
        </div>
      )}

      <Button
        type="button"
        size="icon"
        className="h-14 w-14 rounded-full bg-[linear-gradient(135deg,#111827_0%,#1f2937_52%,#ea580c_100%)] shadow-[0_20px_40px_rgba(15,23,42,0.28)] hover:opacity-95 sm:h-16 sm:w-16"
        onClick={() => setOpen((prev) => !prev)}
      >
        {open ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
      </Button>
    </div>
  );
}
