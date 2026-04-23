'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { ArrowRight, Copy, Download, FolderLock, Globe, Loader2, Search, ShieldCheck, Upload } from 'lucide-react';
import { FileDirectoryLocker, LandingSettings, SecureFileTransfer } from '@/types/document';
import PublicSiteChrome from '@/components/PublicSiteChrome';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProcessProgress } from '@/components/ui/process-progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { buildAbsoluteAppUrl } from '@/lib/url';

interface PublicFileDirectoryPageProps {
  softwareName: string;
  accentLabel: string;
  settings: LandingSettings;
}

interface DirectorySearchResult {
  kind?: 'file' | 'locker';
  id: string;
  shareId: string;
  title: string;
  fileName: string;
  notes?: string;
  mimeType: string;
  sizeInBytes: number;
  category?: string;
  tags: string[];
  visibility: 'public' | 'private';
  authMode: SecureFileTransfer['authMode'];
  linkHref: string;
  lockerId?: string;
  lockerName?: string;
  fileCount?: number;
  openCount: number;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
}

const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(new Error('Failed to read the selected file.'));
  reader.readAsDataURL(file);
});

function formatBytes(bytes: number) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function generateLockerPassword() {
  return `DOC-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export default function PublicFileDirectoryPage({ softwareName, accentLabel, settings }: PublicFileDirectoryPageProps) {
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated' && Boolean(session?.user);
  const [scope, setScope] = useState<'public' | 'private'>('public');
  const [query, setQuery] = useState('');
  const [password, setPassword] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<Array<{ label: string; count: number }>>([]);
  const [results, setResults] = useState<DirectorySearchResult[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(true);
  const [searchError, setSearchError] = useState('');
  const [myFiles, setMyFiles] = useState<SecureFileTransfer[]>([]);
  const [lockers, setLockers] = useState<FileDirectoryLocker[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [loadingLockers, setLoadingLockers] = useState(false);
  const [publisherStatus, setPublisherStatus] = useState('');
  const [publisherError, setPublisherError] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [createdTransfer, setCreatedTransfer] = useState<SecureFileTransfer | null>(null);
  const [filePayload, setFilePayload] = useState<{ fileName: string; mimeType: string; sizeInBytes: number; dataUrl: string } | null>(null);
  const [publishForm, setPublishForm] = useState({
    title: '',
    notes: '',
    category: '',
    tags: '',
    visibility: 'private' as 'public' | 'private',
    lockerMode: 'new' as 'new' | 'existing',
    lockerId: '',
    lockerName: '',
    rotationDays: '30',
    password: generateLockerPassword(),
    filePassword: '',
  });
  const [pageTab, setPageTab] = useState<'search' | 'publish' | 'analytics'>('search');

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        setLoadingSearch(true);
        const search = new URLSearchParams({
          scope,
          query,
        });
        if (category) search.set('category', category);
        if (scope === 'private' && password) search.set('password', password.trim().toUpperCase());
        const response = await fetch(`/api/public/file-directory/search?${search.toString()}`, { signal: controller.signal });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error || 'Unable to search directory.');
        }
        setCategories(Array.isArray(payload?.categories) ? payload.categories : []);
        setResults(Array.isArray(payload?.results) ? payload.results : []);
        setSearchError('');
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        setSearchError(error instanceof Error ? error.message : 'Unable to search directory.');
      } finally {
        setLoadingSearch(false);
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [scope, query, password, category]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    const loadFiles = async () => {
      try {
        setLoadingFiles(true);
        const response = await fetch('/api/file-transfers');
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error || 'Unable to load your files.');
        }
        if (!cancelled) {
          setMyFiles(Array.isArray(payload) ? payload : []);
        }
      } catch (error) {
        if (!cancelled) {
          setPublisherError(error instanceof Error ? error.message : 'Unable to load your files.');
        }
      } finally {
        if (!cancelled) {
          setLoadingFiles(false);
        }
      }
    };
    void loadFiles();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    const loadLockers = async () => {
      try {
        setLoadingLockers(true);
        const response = await fetch('/api/file-directory/lockers');
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error || 'Unable to load lockers.');
        }
        if (!cancelled) {
          setLockers(Array.isArray(payload) ? payload : []);
        }
      } catch (error) {
        if (!cancelled) {
          setPublisherError(error instanceof Error ? error.message : 'Unable to load lockers.');
        }
      } finally {
        if (!cancelled) {
          setLoadingLockers(false);
        }
      }
    };
    void loadLockers();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const myDirectoryFiles = useMemo(
    () => myFiles.filter((item) => item.directoryCategory || item.directoryVisibility),
    [myFiles],
  );

  useEffect(() => {
    if (publishForm.visibility === 'private' && !publishForm.password.trim()) {
      setPublishForm((current) => ({ ...current, password: generateLockerPassword() }));
    }
  }, [publishForm.password, publishForm.visibility]);

  useEffect(() => {
    if (publishForm.visibility !== 'private' || publishForm.lockerMode !== 'existing' || !publishForm.lockerId) {
      return;
    }
    const selectedLocker = lockers.find((item) => item.id === publishForm.lockerId);
    if (!selectedLocker) return;
    setPublishForm((current) => ({
      ...current,
      lockerName: selectedLocker.name,
      password: selectedLocker.currentPassword,
      rotationDays: selectedLocker.passwordRotationDays ? String(selectedLocker.passwordRotationDays) : current.rotationDays,
    }));
  }, [lockers, publishForm.lockerId, publishForm.lockerMode, publishForm.visibility]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setFilePayload({
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeInBytes: file.size,
        dataUrl,
      });
      setPublishForm((current) => ({
        ...current,
        title: current.title || file.name.replace(/\.[^.]+$/, ''),
      }));
      setPublisherStatus(`${file.name} is ready.`);
      setPublisherError('');
    } catch (error) {
      setPublisherError(error instanceof Error ? error.message : 'Unable to read file.');
    }
  };

  const publishFile = async () => {
    if (!filePayload) {
      setPublisherError('Choose a file first.');
      return;
    }
    if (publishForm.visibility === 'private' && !publishForm.password.trim()) {
      setPublisherError('Add a password for private locker files.');
      return;
    }

    try {
      setPublishing(true);
      const isPrivate = publishForm.visibility === 'private';
      const response = await fetch('/api/file-transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...filePayload,
          title: publishForm.title.trim() || filePayload.fileName.replace(/\.[^.]+$/, ''),
          notes: publishForm.notes.trim(),
          lockerId: isPrivate && publishForm.lockerMode === 'existing' ? publishForm.lockerId || undefined : undefined,
          lockerName: isPrivate
            ? (publishForm.lockerMode === 'new'
              ? (publishForm.lockerName.trim() || publishForm.title.trim() || filePayload.fileName.replace(/\.[^.]+$/, ''))
              : publishForm.lockerName)
            : undefined,
          directoryVisibility: publishForm.visibility,
          directoryCategory: publishForm.category.trim() || undefined,
          directoryTags: publishForm.tags.split(',').map((item) => item.trim()).filter(Boolean),
          authMode: publishForm.visibility === 'public' ? 'public' : 'password',
          accessPassword: publishForm.visibility === 'private' ? publishForm.password.trim().toUpperCase() : undefined,
          fileAccessPassword: publishForm.visibility === 'private' && publishForm.filePassword.trim() ? publishForm.filePassword.trim().toUpperCase() : undefined,
          passwordRotationDays: isPrivate && publishForm.lockerMode === 'new' ? Number(publishForm.rotationDays || 0) || undefined : undefined,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to publish file.');
      }
      setCreatedTransfer(payload);
      setMyFiles((current) => [payload, ...current]);
      setPublisherStatus(publishForm.visibility === 'public' ? 'Public file published.' : 'Private locker file saved.');
      setPublisherError('');
      setPublishForm({
        title: '',
        notes: '',
        category: '',
        tags: '',
        visibility: 'private',
        lockerMode: 'new',
        lockerId: '',
        lockerName: '',
        rotationDays: '30',
        password: generateLockerPassword(),
        filePassword: '',
      });
      setFilePayload(null);
      if (isAuthenticated) {
        const lockerResponse = await fetch('/api/file-directory/lockers');
        const lockerPayload = await lockerResponse.json().catch(() => null);
        if (lockerResponse.ok) {
          setLockers(Array.isArray(lockerPayload) ? lockerPayload : []);
        }
      }
    } catch (error) {
      setPublisherError(error instanceof Error ? error.message : 'Unable to publish file.');
      setPublisherStatus('');
    } finally {
      setPublishing(false);
    }
  };

  const copyShareLink = async (shareId: string) => {
    await navigator.clipboard.writeText(buildAbsoluteAppUrl(`/transfer/${shareId}`, typeof window !== 'undefined' ? window.location.origin : undefined));
  };

  const copyAllDetails = async (transfer: SecureFileTransfer) => {
    const absoluteUrl = buildAbsoluteAppUrl(`/transfer/${transfer.shareId}`, typeof window !== 'undefined' ? window.location.origin : undefined);
    const lines = [
      `Title: ${transfer.title || transfer.fileName}`,
      `File: ${transfer.fileName}`,
      `Visibility: ${transfer.directoryVisibility || 'private'}`,
      `Link: ${absoluteUrl}`,
    ];
    if (transfer.lockerName) lines.push(`Locker: ${transfer.lockerName}`);
    if (transfer.directoryCategory) lines.push(`Category: ${transfer.directoryCategory}`);
    if (transfer.directoryTags?.length) lines.push(`Tags: ${transfer.directoryTags.join(', ')}`);
    if (transfer.accessPassword) lines.push(`Locker password: ${transfer.accessPassword}`);
    await navigator.clipboard.writeText(lines.join('\n'));
    setPublisherStatus('All share details copied.');
    setPublisherError('');
  };

  const copyLockerDetails = async (locker: FileDirectoryLocker) => {
    const filesInLocker = myDirectoryFiles.filter((item) => item.lockerId === locker.id);
    const lines = [
      `Locker: ${locker.name}`,
      `Password: ${locker.currentPassword}`,
      `Password version: ${locker.passwordVersion}`,
      `Rotation period: ${locker.passwordRotationDays ? `${locker.passwordRotationDays} day(s)` : 'Manual only'}`,
      `Files inside: ${filesInLocker.length}`,
    ];
    if (locker.description) lines.push(`Description: ${locker.description}`);
    if (locker.category) lines.push(`Category: ${locker.category}`);
    if (filesInLocker.length) {
      lines.push('Files:');
      filesInLocker.slice(0, 12).forEach((item) => lines.push(`- ${item.title || item.fileName}: ${buildAbsoluteAppUrl(`/transfer/${item.shareId}`, typeof window !== 'undefined' ? window.location.origin : undefined)}`));
    }
    await navigator.clipboard.writeText(lines.join('\n'));
    setPublisherStatus('Locker details copied.');
    setPublisherError('');
  };

  const rotateLocker = async (locker: FileDirectoryLocker) => {
    try {
      setPublisherStatus('');
      setPublisherError('');
      const response = await fetch('/api/file-directory/lockers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: locker.id,
          action: 'rotate-password',
          passwordRotationDays: locker.passwordRotationDays,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to rotate locker password.');
      }
      setLockers((current) => current.map((item) => item.id === locker.id ? payload : item));
      setMyFiles((current) => current.map((item) => item.lockerId === locker.id ? { ...item, accessPassword: payload.currentPassword } : item));
      if (publishForm.lockerId === locker.id) {
        setPublishForm((current) => ({ ...current, password: payload.currentPassword }));
      }
      setPublisherStatus('Locker password changed. Access was updated for all files in that locker.');
    } catch (error) {
      setPublisherError(error instanceof Error ? error.message : 'Unable to rotate locker password.');
    }
  };

  return (
    <PublicSiteChrome softwareName={softwareName} accentLabel={accentLabel} settings={settings}>
      <section className="premium-surface overflow-hidden rounded-[1.6rem] bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.18),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(45,212,191,0.12),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.97))] px-4 py-5 sm:px-7 sm:py-7 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/90 bg-white/84 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.24em] text-slate-600 shadow-[0_12px_24px_rgba(15,23,42,0.05)] sm:text-[11px]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Universal File Directory
            </div>
            <h1 className="mt-4 text-[2rem] font-semibold leading-[0.94] tracking-[-0.05em] text-slate-950 sm:text-[3rem] lg:text-[4rem]">
              Publish files or lock them in your private vault.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
              Keep public files searchable by name and category, while private files stay hidden until the right password unlocks them.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild className="premium-button h-11 rounded-full px-6 text-white hover:opacity-95">
                <Link href={isAuthenticated ? '#publisher' : '/login'}>
                  {isAuthenticated ? 'Publish a File' : 'Login to Publish'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-11 rounded-full border-slate-300 bg-white/85 px-6 text-slate-950 hover:bg-white">
                <Link href="#directory-search">Search Directory</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Public library', value: 'Search by file name or category' },
              { label: 'Private locker', value: 'Password-gated file discovery' },
              { label: 'Live analytics', value: 'Opens, downloads, and fresh activity' },
            ].map((item, index) => (
              <div
                key={item.label}
                className={`rounded-[1.25rem] px-4 py-4 shadow-[0_14px_30px_rgba(15,23,42,0.05)] ${
                  index === 0 ? 'premium-card-smoke' : index === 1 ? 'premium-card-warm' : 'premium-card-rose'
                }`}
              >
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
                <p className="mt-2 text-sm font-medium leading-6 tracking-[-0.02em] text-slate-950">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="premium-surface rounded-[1.6rem] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <ProcessProgress
          active={loadingSearch || loadingFiles || loadingLockers || publishing}
          profile={publishing ? 'publish' : loadingSearch ? 'search' : 'sync'}
          title={
            publishing
              ? 'Publishing file into the directory'
              : loadingSearch
                ? 'Searching the file directory'
                : 'Syncing your files and lockers'
          }
          compact
          floating
          className="border-white/80 bg-white/94"
        />
        <Tabs value={pageTab} onValueChange={(value) => setPageTab(value as 'search' | 'publish' | 'analytics')} className="space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-slate-500">Workspace</p>
              <h2 className="mt-2 text-[1.45rem] font-semibold tracking-[-0.04em] text-slate-950">Everything in one cleaner flow.</h2>
            </div>
            <TabsList className="grid w-full max-w-[28rem] grid-cols-3 rounded-full border border-slate-200 bg-slate-50 p-1">
              <TabsTrigger value="search" className="rounded-full text-xs">Search</TabsTrigger>
              <TabsTrigger value="publish" className="rounded-full text-xs">Publish</TabsTrigger>
              <TabsTrigger value="analytics" className="rounded-full text-xs">Analytics</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="search" className="space-y-5">
            <Tabs value={scope} onValueChange={(value) => setScope(value as 'public' | 'private')} className="space-y-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-slate-500">Search</p>
                  <h3 className="mt-2 text-[1.3rem] font-semibold tracking-[-0.04em] text-slate-950">Find files fast.</h3>
                </div>
                <TabsList className="grid w-full max-w-[22rem] grid-cols-2 rounded-full border border-slate-200 bg-slate-50 p-1">
                  <TabsTrigger value="public" className="rounded-full text-xs">Public</TabsTrigger>
                  <TabsTrigger value="private" className="rounded-full text-xs">Private</TabsTrigger>
                </TabsList>
              </div>

              <div className="grid gap-3 lg:grid-cols-[1.1fr_0.5fr_0.55fr]">
                <div className="premium-surface-soft flex items-center gap-3 rounded-[1.15rem] px-4 py-3">
                  <Search className="h-4 w-4 text-slate-400" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={scope === 'public' ? 'Search public files by name, tag, or category' : 'Search private files by name'}
                    className="h-auto border-0 bg-transparent px-0 py-0 text-sm shadow-none focus-visible:ring-0"
                  />
                </div>
                <Input
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  placeholder="Category"
                  className="h-12 rounded-[1.05rem] border-slate-200 bg-white"
                />
                {scope === 'private' ? (
                  <Input
                    value={password}
                    onChange={(event) => setPassword(event.target.value.toUpperCase())}
                    placeholder="Locker password"
                    className="h-12 rounded-[1.05rem] border-slate-200 bg-white"
                  />
                ) : (
                  <div className="flex h-12 items-center rounded-[1.05rem] border border-slate-200 bg-slate-50 px-4 text-sm text-slate-500">
                    Public results open instantly
                  </div>
                )}
              </div>

              {categories.length ? (
                <div className="flex flex-wrap gap-2">
                  {categories.slice(0, 8).map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setCategory((current) => current === item.label ? '' : item.label)}
                      className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition ${
                        category === item.label
                          ? 'bg-slate-950 text-white'
                          : 'border border-slate-200 bg-white text-slate-600 hover:text-slate-950'
                      }`}
                    >
                      {item.label} · {item.count}
                    </button>
                  ))}
                </div>
              ) : null}

              {searchError ? <p className="text-sm text-rose-600">{searchError}</p> : null}

              <TabsContent value="public" className="space-y-4">
                {loadingSearch ? (
                  <div className="flex min-h-[14rem] items-center justify-center rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching public files...
                  </div>
                ) : results.length ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                      {results.map((item) => (
                        <article key={item.id} className="premium-card-smoke rounded-[1.3rem] p-4 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-base font-semibold tracking-[-0.02em] text-slate-950">{item.title}</p>
                              <p className="mt-1 truncate text-xs text-slate-500">{item.kind === 'locker' ? `${item.fileCount || 0} files inside` : item.fileName}</p>
                            </div>
                            <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-sky-700">
                            {item.kind === 'locker' ? 'Folder' : 'Public'}
                            </span>
                          </div>
                        <p className="mt-3 text-sm leading-6 text-slate-600">{item.notes || 'Publicly searchable file entry.'}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {item.category ? <span className="rounded-full bg-white px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-slate-500">{item.category}</span> : null}
                          {item.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="rounded-full bg-white px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-slate-500">{tag}</span>
                          ))}
                        </div>
                          <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
                          <span>{formatBytes(item.sizeInBytes)}</span>
                          <span>{item.openCount} opens</span>
                          <span>{item.downloadCount} downloads</span>
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <Button asChild className="h-10 rounded-full bg-slate-950 px-5 text-white hover:bg-slate-800">
                            <Link href={item.linkHref}>{item.kind === 'locker' ? 'Open Folder' : 'Open File'}</Link>
                            </Button>
                          </div>
                        </article>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50 px-5 py-12 text-center text-sm text-slate-500">
                    No public files matched yet.
                  </div>
                )}
              </TabsContent>

              <TabsContent value="private" className="space-y-4">
                {loadingSearch ? (
                  <div className="flex min-h-[14rem] items-center justify-center rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking your locker...
                  </div>
                ) : password.trim() ? (
                  results.length ? (
                    <div className="grid gap-4 lg:grid-cols-2">
                      {results.map((item) => (
                        <article key={item.id} className="premium-card-warm rounded-[1.3rem] p-4 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-base font-semibold tracking-[-0.02em] text-slate-950">{item.title}</p>
                              <p className="mt-1 truncate text-xs text-slate-500">{item.kind === 'locker' ? `${item.fileCount || 0} files inside` : item.fileName}</p>
                            </div>
                            <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-amber-700">
                              {item.kind === 'locker' ? 'Folder' : 'Private'}
                            </span>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-slate-600">{item.notes || 'Password-protected locker file.'}</p>
                          <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
                            <span>{formatBytes(item.sizeInBytes)}</span>
                            <span>{item.openCount} opens</span>
                            <span>{item.downloadCount} downloads</span>
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <Button asChild className="h-10 rounded-full bg-slate-950 px-5 text-white hover:bg-slate-800">
                              <Link href={item.linkHref}>{item.kind === 'locker' ? 'Open Locker Folder' : 'Open Locker File'}</Link>
                            </Button>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50 px-5 py-12 text-center text-sm text-slate-500">
                      No private files matched that password and search.
                    </div>
                  )
                ) : (
                  <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50 px-5 py-12 text-center text-sm text-slate-500">
                    Enter the locker password to reveal protected files.
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="publish" className="space-y-4">
            <section id="publisher" className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
              <div className="premium-surface-soft rounded-[1.5rem] px-4 py-5 sm:px-6 sm:py-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-slate-500">Publish</p>
          <h2 className="mt-2 text-[1.4rem] font-semibold tracking-[-0.04em] text-slate-950">Share public files or save private locker files.</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Public entries become searchable. Private entries stay hidden until the correct password is entered.
          </p>

          {isAuthenticated ? (
            <div className="mt-5 space-y-4">
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-[1.2rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-7 text-center transition hover:border-slate-400 hover:bg-white">
                <Upload className="h-5 w-5 text-slate-400" />
                <span className="mt-3 text-sm font-medium text-slate-900">{filePayload ? filePayload.fileName : 'Upload a file'}</span>
                <span className="mt-1 text-xs text-slate-500">{filePayload ? formatBytes(filePayload.sizeInBytes) : 'PDF, docs, images, sheets, or anything else'}</span>
                <input type="file" className="hidden" onChange={(event) => void handleFileChange(event)} />
              </label>

              <Input value={publishForm.title} onChange={(event) => setPublishForm((current) => ({ ...current, title: event.target.value }))} placeholder="File title" className="h-12 rounded-[1rem]" />
              <Input value={publishForm.category} onChange={(event) => setPublishForm((current) => ({ ...current, category: event.target.value }))} placeholder="Category" className="h-12 rounded-[1rem]" />
              <Input value={publishForm.tags} onChange={(event) => setPublishForm((current) => ({ ...current, tags: event.target.value }))} placeholder="Tags, comma separated" className="h-12 rounded-[1rem]" />
              <Input value={publishForm.notes} onChange={(event) => setPublishForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Short description" className="h-12 rounded-[1rem]" />

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setPublishForm((current) => ({ ...current, visibility: 'public' }))}
                  className={`rounded-[1.1rem] border px-4 py-4 text-left transition ${publishForm.visibility === 'public' ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-700'}`}
                >
                  <Globe className="h-4 w-4" />
                  <p className="mt-3 text-sm font-medium">Public</p>
                  <p className={`mt-1 text-xs ${publishForm.visibility === 'public' ? 'text-white/70' : 'text-slate-500'}`}>Searchable by file name and category.</p>
                </button>
                <button
                  type="button"
                  onClick={() => setPublishForm((current) => ({ ...current, visibility: 'private' }))}
                  className={`rounded-[1.1rem] border px-4 py-4 text-left transition ${publishForm.visibility === 'private' ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-700'}`}
                >
                  <FolderLock className="h-4 w-4" />
                  <p className="mt-3 text-sm font-medium">Private</p>
                  <p className={`mt-1 text-xs ${publishForm.visibility === 'private' ? 'text-white/70' : 'text-slate-500'}`}>Visible only after password entry.</p>
                </button>
              </div>

              {publishForm.visibility === 'private' ? (
                <div className="space-y-3 rounded-[1.1rem] border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setPublishForm((current) => ({ ...current, lockerMode: 'new', lockerId: '', lockerName: current.lockerName || current.title, password: current.password || generateLockerPassword() }))}
                      className={`rounded-full px-3 py-1.5 text-[11px] font-medium ${publishForm.lockerMode === 'new' ? 'bg-slate-950 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}
                    >
                      Create new locker
                    </button>
                    <button
                      type="button"
                      onClick={() => setPublishForm((current) => ({ ...current, lockerMode: 'existing', lockerId: lockers[0]?.id || current.lockerId }))}
                      className={`rounded-full px-3 py-1.5 text-[11px] font-medium ${publishForm.lockerMode === 'existing' ? 'bg-slate-950 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}
                    >
                      Add to existing locker
                    </button>
                  </div>

                  {publishForm.lockerMode === 'existing' ? (
                    <div className="grid gap-3">
                      <select
                        value={publishForm.lockerId}
                        onChange={(event) => setPublishForm((current) => ({ ...current, lockerId: event.target.value }))}
                        className="h-12 rounded-[1rem] border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none"
                      >
                        <option value="">{loadingLockers ? 'Loading lockers...' : 'Select locker'}</option>
                        {lockers.map((locker) => (
                          <option key={locker.id} value={locker.id}>{locker.name}</option>
                        ))}
                      </select>
                      <div className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                        Active locker password: <span className="font-semibold text-slate-950">{publishForm.password || 'Select a locker'}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input value={publishForm.lockerName} onChange={(event) => setPublishForm((current) => ({ ...current, lockerName: event.target.value }))} placeholder="Locker name" className="h-12 rounded-[1rem]" />
                      <Input value={publishForm.rotationDays} onChange={(event) => setPublishForm((current) => ({ ...current, rotationDays: event.target.value.replace(/[^\d]/g, '') }))} placeholder="Rotation period in days" className="h-12 rounded-[1rem]" />
                      <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row">
                        <Input value={publishForm.password} onChange={(event) => setPublishForm((current) => ({ ...current, password: event.target.value.toUpperCase() }))} placeholder="Locker password" className="h-12 rounded-[1rem]" />
                        <Button
                          type="button"
                          variant="outline"
                          className="h-12 rounded-[1rem] border-slate-200 bg-white px-4 text-[12px]"
                          onClick={() => setPublishForm((current) => ({ ...current, password: generateLockerPassword() }))}
                        >
                          Regenerate
                        </Button>
                      </div>
                    </div>
                  )}
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
                    <Input
                      value={publishForm.filePassword}
                      onChange={(event) => setPublishForm((current) => ({ ...current, filePassword: event.target.value.toUpperCase() }))}
                      placeholder="Optional file-specific password"
                      className="h-12 rounded-[1rem]"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 rounded-[1rem] border-slate-200 bg-white px-4 text-[12px]"
                      onClick={() => setPublishForm((current) => ({ ...current, filePassword: current.filePassword ? '' : generateLockerPassword() }))}
                    >
                      {publishForm.filePassword ? 'Remove file password' : 'Add file password'}
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500">Each locker can hold multiple files. If the locker password changes, access is revoked for every file in that locker until the new password is used.</p>
                </div>
              ) : null}

              {publisherStatus ? <p className="text-sm text-emerald-600">{publisherStatus}</p> : null}
              {publisherError ? <p className="text-sm text-rose-600">{publisherError}</p> : null}

              <Button onClick={() => void publishFile()} disabled={publishing} className="premium-button h-11 rounded-full px-6 text-white hover:opacity-95">
                {publishing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Publishing...</> : 'Publish File'}
              </Button>

              {createdTransfer ? (
                <div className="premium-card-smoke rounded-[1.2rem] p-4">
                  <p className="text-sm font-semibold text-slate-950">Latest share</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" variant="outline" className="h-10 rounded-full" onClick={() => void copyAllDetails(createdTransfer)}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy All Details
                    </Button>
                    <Button type="button" variant="outline" className="h-10 rounded-full" onClick={() => void copyShareLink(createdTransfer.shareId)}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Link
                    </Button>
                    <Button asChild className="h-10 rounded-full bg-slate-950 text-white hover:bg-slate-800">
                      <Link href={`/transfer/${createdTransfer.shareId}`}>Open</Link>
                    </Button>
                  </div>
                  {createdTransfer.directoryVisibility !== 'public' && createdTransfer.accessPassword ? (
                    <p className="mt-3 text-xs text-slate-500">Locker password: <span className="font-semibold text-slate-900">{createdTransfer.accessPassword}</span></p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-5 rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-8 text-center">
              <p className="text-sm text-slate-600">Login to publish files into the directory or your private locker.</p>
              <Button asChild className="premium-button mt-4 h-11 rounded-full px-6 text-white hover:opacity-95">
                <Link href="/login">Login to Publish</Link>
              </Button>
            </div>
          )}
              </div>

              <div className="premium-card-smoke rounded-[1.5rem] p-5 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
                <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-slate-500">How it works</p>
                <div className="mt-4 space-y-3">
                  {[
                    'Upload any file and add title, category, tags, and a short note.',
                    'Choose Public for searchable publishing or Private for locker-style access.',
                    'Share the generated link and track opens and downloads later.',
                  ].map((item) => (
                    <div key={item} className="rounded-[1.05rem] bg-white/80 px-4 py-3 text-sm leading-6 text-slate-700 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
                      {item}
                    </div>
                  ))}
                </div>
                {createdTransfer ? (
                  <div className="mt-5 rounded-[1.15rem] bg-white/84 p-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
                    <p className="text-sm font-semibold text-slate-950">Latest share</p>
                    <p className="mt-1 text-xs text-slate-500">{createdTransfer.title || createdTransfer.fileName}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button type="button" variant="outline" className="h-10 rounded-full" onClick={() => void copyAllDetails(createdTransfer)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy All Details
                      </Button>
                      <Button type="button" variant="outline" className="h-10 rounded-full" onClick={() => void copyShareLink(createdTransfer.shareId)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Link
                      </Button>
                      <Button asChild className="h-10 rounded-full bg-slate-950 text-white hover:bg-slate-800">
                        <Link href={`/transfer/${createdTransfer.shareId}`}>Open</Link>
                      </Button>
                    </div>
                  </div>
                ) : null}

                {lockers.length ? (
                  <div className="mt-5 space-y-3">
                    <p className="text-sm font-semibold text-slate-950">Locker history</p>
                    {lockers.slice(0, 4).map((locker) => {
                      const filesInLocker = myDirectoryFiles.filter((item) => item.lockerId === locker.id);
                      return (
                        <div key={locker.id} className="rounded-[1.15rem] bg-white/84 p-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-950">{locker.name}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                {filesInLocker.length} file(s) · version {locker.passwordVersion} · {locker.passwordRotationDays ? `auto changes every ${locker.passwordRotationDays} days` : 'manual password change'}
                              </p>
                            </div>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-slate-600">
                              {locker.currentPassword}
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button type="button" variant="outline" className="h-9 rounded-full" onClick={() => void copyLockerDetails(locker)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Copy Locker
                            </Button>
                            <Button asChild type="button" variant="outline" className="h-9 rounded-full">
                              <Link href={`/file-directory/locker/${locker.id}`}>Open Folder</Link>
                            </Button>
                            <Button type="button" variant="outline" className="h-9 rounded-full" onClick={() => void rotateLocker(locker)}>
                              Rotate Password
                            </Button>
                          </div>
                          {locker.history?.length ? (
                            <div className="mt-3 space-y-2">
                              {locker.history.slice(0, 2).map((event) => (
                                <div key={event.id} className="rounded-[0.9rem] bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                                  <span className="font-medium text-slate-900">{event.note}</span>
                                  <span className="ml-2 text-slate-400">{new Date(event.createdAt).toLocaleDateString()}</span>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </section>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <section className="premium-surface-soft rounded-[1.5rem] px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-slate-500">Your analytics</p>
              <h2 className="mt-2 text-[1.4rem] font-semibold tracking-[-0.04em] text-slate-950">See what people open.</h2>
            </div>
            {loadingFiles ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : null}
          </div>

          {isAuthenticated ? (
            myDirectoryFiles.length ? (
              <div className="mt-5 space-y-3">
                {myDirectoryFiles.slice(0, 6).map((item) => (
                  <div key={item.id} className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">{item.title || item.fileName}</p>
                        <p className="mt-1 truncate text-xs text-slate-500">{item.fileName}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] ${item.directoryVisibility === 'public' ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-700'}`}>
                        {item.directoryVisibility || 'private'}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-[0.95rem] bg-slate-50 px-2 py-2">
                        <p className="text-lg font-semibold tracking-[-0.03em] text-slate-950">{item.openCount}</p>
                        <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">opens</p>
                      </div>
                      <div className="rounded-[0.95rem] bg-slate-50 px-2 py-2">
                        <p className="text-lg font-semibold tracking-[-0.03em] text-slate-950">{item.downloadCount}</p>
                        <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">downloads</p>
                      </div>
                      <div className="rounded-[0.95rem] bg-slate-50 px-2 py-2">
                        <p className="text-lg font-semibold tracking-[-0.03em] text-slate-950">{formatBytes(item.sizeInBytes)}</p>
                        <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">size</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button type="button" variant="outline" className="h-9 rounded-full" onClick={() => void copyAllDetails(item)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Details
                      </Button>
                      <Button type="button" variant="outline" className="h-9 rounded-full" onClick={() => void copyShareLink(item.shareId)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Link
                      </Button>
                      <Button asChild className="h-9 rounded-full bg-slate-950 text-white hover:bg-slate-800">
                        <Link href={`/transfer/${item.shareId}`}>
                          <Download className="mr-2 h-4 w-4" />
                          Open
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-[1.2rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                Publish your first file to start seeing opens, downloads, and engagement.
              </div>
            )
          ) : (
            <div className="mt-5 rounded-[1.2rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              Login to track your published files and locker activity.
            </div>
          )}
            </section>
          </TabsContent>
        </Tabs>
      </section>
    </PublicSiteChrome>
  );
}
