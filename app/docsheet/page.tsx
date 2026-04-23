'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import DocSheetCenter from '@/components/DocSheetCenter';
import type { DocumentHistory } from '@/types/document';

function DocSheetPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [history, setHistory] = useState<DocumentHistory[]>([]);
  const initialHistoryId = searchParams.get('workbook') || undefined;

  const fetchHistory = async () => {
    const response = await fetch('/api/history');
    if (!response.ok) return;
    const payload = await response.json().catch(() => []);
    setHistory(Array.isArray(payload) ? payload : []);
  };

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
    void fetchHistory();
  }, [router, session, status]);

  if (status === 'loading') {
    return <div className="flex min-h-screen items-center justify-center text-slate-500">Loading DocSheet Studio...</div>;
  }

  if (!session) {
    return null;
  }

  return (
    <DocSheetCenter history={history} onHistoryRefresh={fetchHistory} layout="page" initialHistoryId={initialHistoryId} />
  );
}

export default function DocSheetPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-slate-500">Loading...</div>}>
      <DocSheetPageContent />
    </Suspense>
  );
}
