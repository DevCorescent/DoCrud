'use client';

import { type ChangeEvent, useEffect, useMemo, useState } from 'react';
import {
  Copy,
  Download,
  ExternalLink,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  FolderClosed,
  FolderPlus,
  Loader2,
  Lock,
  Paperclip,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ProcessProgress } from '@/components/ui/process-progress';
import { buildAbsoluteAppUrl } from '@/lib/url';
import type { FileManagerFolder, FileTransferAuthMode, SecureFileTransfer } from '@/types/document';

const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(new Error('Failed to read the selected file.'));
  reader.readAsDataURL(file);
});

interface FileTransferCenterProps {
  variant?: 'workspace' | 'admin';
  mode?: 'standard' | 'encrypter';
}

const folderToneClasses: Record<NonNullable<FileManagerFolder['colorTone']>, string> = {
  slate: 'bg-slate-100 text-slate-700',
  sky: 'bg-sky-100 text-sky-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-700',
  violet: 'bg-violet-100 text-violet-700',
};

export default function FileTransferCenter({ variant = 'workspace', mode = 'standard' }: FileTransferCenterProps) {
  const [transfers, setTransfers] = useState<SecureFileTransfer[]>([]);
  const [folders, setFolders] = useState<FileManagerFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [filePayload, setFilePayload] = useState<{ fileName: string; mimeType: string; sizeInBytes: number; dataUrl: string } | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<'all' | 'unfiled' | string>('all');
  const [search, setSearch] = useState('');
  const [folderDraft, setFolderDraft] = useState({ name: '', description: '', colorTone: 'slate' as FileManagerFolder['colorTone'] });
  const [form, setForm] = useState({
    title: '',
    notes: '',
    folderId: '',
    authMode: mode === 'encrypter' ? 'triple_password' as FileTransferAuthMode : 'password' as FileTransferAuthMode,
    accessPassword: '',
    securePassword: '',
    parserPassword: '',
    recipientEmail: '',
    maxDownloads: '',
    expiresInDays: '7',
  });
  const [createdTransfer, setCreatedTransfer] = useState<SecureFileTransfer | null>(null);
  const [repositoryPage, setRepositoryPage] = useState(1);
  const [expandedTransferId, setExpandedTransferId] = useState('');
  const [transferEditDraft, setTransferEditDraft] = useState({ title: '', notes: '', accessPassword: '' });
  const [tab, setTab] = useState<'files' | 'upload'>('files');

  const loadRepository = async () => {
    try {
      setLoading(true);
      const [transferResponse, folderResponse] = await Promise.all([
        fetch('/api/file-transfers'),
        fetch('/api/file-manager/folders'),
      ]);
      const transferPayload = await transferResponse.json().catch(() => null);
      const folderPayload = await folderResponse.json().catch(() => null);

      if (!transferResponse.ok) {
        throw new Error(transferPayload?.error || 'Unable to load file manager items.');
      }
      if (!folderResponse.ok) {
        throw new Error(folderPayload?.error || 'Unable to load folders.');
      }

      setTransfers(Array.isArray(transferPayload) ? transferPayload : []);
      setFolders(Array.isArray(folderPayload) ? folderPayload : []);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load file manager.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRepository();
  }, []);

  useEffect(() => {
    if (mode === 'encrypter') {
      setForm((current) => ({ ...current, authMode: 'triple_password' }));
    }
  }, [mode]);

  useEffect(() => {
    setRepositoryPage(1);
  }, [search, selectedFolderId]);

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
      setForm((current) => ({ ...current, title: current.title || file.name.replace(/\.[^.]+$/, '') }));
      setStatusMessage(`Loaded ${file.name}.`);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load file.');
      setStatusMessage('');
    }
  };

  const createFolder = async () => {
    if (!folderDraft.name.trim()) {
      setErrorMessage('Folder name is required.');
      return;
    }
    try {
      setSaving(true);
      const response = await fetch('/api/file-manager/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(folderDraft),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to create folder.');
      }
      setFolders((current) => [payload, ...current]);
      setFolderDraft({ name: '', description: '', colorTone: 'slate' });
      setStatusMessage('Folder created.');
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create folder.');
    } finally {
      setSaving(false);
    }
  };

  const deleteFolder = async (id: string) => {
    try {
      const response = await fetch(`/api/file-manager/folders?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to delete folder.');
      }
      setFolders((current) => current.filter((folder) => folder.id !== id));
      setTransfers((current) => current.map((item) => item.folderId === id ? { ...item, folderId: undefined, folderName: undefined } : item));
      if (selectedFolderId === id) setSelectedFolderId('all');
      setStatusMessage('Folder removed. Existing files were moved to Unfiled.');
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to delete folder.');
    }
  };

  const createTransfer = async () => {
    if (!filePayload) {
      setErrorMessage('Choose a file first.');
      setStatusMessage('');
      return;
    }

    const selectedFolder = folders.find((folder) => folder.id === form.folderId);

    try {
      setSaving(true);
      const expiresAt = form.expiresInDays
        ? new Date(Date.now() + Number(form.expiresInDays) * 24 * 60 * 60 * 1000).toISOString()
        : undefined;

      const response = await fetch('/api/file-transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...filePayload,
          title: form.title,
          notes: form.notes,
          folderId: form.folderId || undefined,
          folderName: selectedFolder?.name,
          authMode: form.authMode,
          accessPassword: form.accessPassword,
          recipientEmail: form.recipientEmail,
          maxDownloads: form.maxDownloads ? Number(form.maxDownloads) : undefined,
          expiresAt,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to create file transfer.');
      }
      setTransfers((current) => [payload, ...current]);
      setCreatedTransfer(payload);
      setStatusMessage('File stored and share links created.');
      setErrorMessage('');
      setFilePayload(null);
      setForm({
        title: '',
        notes: '',
        folderId: '',
        authMode: 'password',
        accessPassword: '',
        securePassword: '',
        parserPassword: '',
        recipientEmail: '',
        maxDownloads: '',
        expiresInDays: '7',
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create file transfer.');
      setStatusMessage('');
    } finally {
      setSaving(false);
    }
  };

  const revokeTransfer = async (id: string) => {
    const response = await fetch('/api/file-transfers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, revoke: true }),
    });
    const payload = await response.json().catch(() => null);
    if (response.ok) {
      setTransfers((current) => current.map((item) => (item.id === payload.id ? payload : item)));
      setStatusMessage('Share link revoked.');
      setErrorMessage('');
      return;
    }
    setErrorMessage(payload?.error || 'Unable to revoke file.');
    setStatusMessage('');
  };

  const deleteTransfer = async (id: string) => {
    const response = await fetch(`/api/file-transfers?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    const payload = await response.json().catch(() => null);
    if (response.ok) {
      setTransfers((current) => current.filter((item) => item.id !== id));
      if (expandedTransferId === id) setExpandedTransferId('');
      setStatusMessage('File removed from file manager.');
      setErrorMessage('');
      return;
    }
    setErrorMessage(payload?.error || 'Unable to delete file.');
  };

  const beginTransferEdit = (transfer: SecureFileTransfer) => {
    setExpandedTransferId(transfer.id);
    setTransferEditDraft({
      title: transfer.title || '',
      notes: transfer.notes || '',
      accessPassword: transfer.accessPassword || '',
    });
  };

  const saveTransferEdit = async () => {
    if (!expandedTransferId) return;
    const response = await fetch('/api/file-transfers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: expandedTransferId,
        title: transferEditDraft.title,
        notes: transferEditDraft.notes,
        accessPassword: transferEditDraft.accessPassword,
      }),
    });
    const payload = await response.json().catch(() => null);
    if (response.ok) {
      setTransfers((current) => current.map((entry) => (entry.id === payload.id ? payload : entry)));
      if (createdTransfer?.id === payload.id) {
        setCreatedTransfer(payload);
      }
      setStatusMessage('File transfer updated.');
      setErrorMessage('');
      setExpandedTransferId('');
      return;
    }
    setErrorMessage(payload?.error || 'Unable to update file transfer.');
  };

  const updateTransferFolder = async (id: string, folderId: string) => {
    const folder = folders.find((entry) => entry.id === folderId);
    const response = await fetch('/api/file-transfers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        folderId: folderId || '',
        folderName: folder?.name || '',
      }),
    });
    const payload = await response.json().catch(() => null);
    if (response.ok) {
      setTransfers((current) => current.map((item) => (item.id === payload.id ? payload : item)));
      setStatusMessage('File moved successfully.');
      setErrorMessage('');
      return;
    }
    setErrorMessage(payload?.error || 'Unable to move file.');
  };

  const copyLink = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    setStatusMessage(`${label} copied.`);
    setErrorMessage('');
  };

  const filteredTransfers = useMemo(() => {
    return transfers.filter((entry) => {
      const matchesFolder = selectedFolderId === 'all'
        ? true
        : selectedFolderId === 'unfiled'
          ? !entry.folderId
          : entry.folderId === selectedFolderId;
      const term = search.trim().toLowerCase();
      const matchesSearch = term
        ? [entry.title, entry.fileName, entry.notes, entry.folderName, entry.organizationName]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(term))
        : true;
      return matchesFolder && matchesSearch;
    });
  }, [search, selectedFolderId, transfers]);

  const paginatedTransfers = useMemo(() => {
    const start = (repositoryPage - 1) * 6;
    return filteredTransfers.slice(start, start + 6);
  }, [filteredTransfers, repositoryPage]);

  const repositoryPageCount = Math.max(1, Math.ceil(filteredTransfers.length / 6));

  const title = mode === 'encrypter'
    ? 'Document Encrypter'
    : variant === 'admin'
      ? 'Enterprise File Manager'
      : 'File Manager';

  const folderFileCounts = useMemo(() => {
    const counts = new Map<string, number>();
    transfers.forEach((entry) => {
      if (entry.folderId) {
        counts.set(entry.folderId, (counts.get(entry.folderId) || 0) + 1);
      }
    });
    return counts;
  }, [transfers]);

  const activeFolder = useMemo(() => {
    if (selectedFolderId === 'all') return { id: 'all', name: 'All files' };
    if (selectedFolderId === 'unfiled') return { id: 'unfiled', name: 'Unfiled' };
    const matched = folders.find((folder) => folder.id === selectedFolderId);
    return matched ? { id: matched.id, name: matched.name } : { id: 'all', name: 'All files' };
  }, [folders, selectedFolderId]);

  const formatBytes = (value: number) => {
    if (!Number.isFinite(value) || value <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const index = Math.min(units.length - 1, Math.floor(Math.log(value) / Math.log(1024)));
    const amount = value / Math.pow(1024, index);
    return `${amount.toFixed(amount >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
  };

  const pickFileIcon = (mimeType: string) => {
    const lower = (mimeType || '').toLowerCase();
    if (lower.startsWith('image/')) return FileImage;
    if (lower.includes('spreadsheet') || lower.includes('excel') || lower.includes('sheet') || lower.includes('csv')) return FileSpreadsheet;
    if (lower.includes('zip') || lower.includes('rar') || lower.includes('7z')) return FileArchive;
    if (lower.includes('pdf') || lower.includes('text') || lower.includes('word') || lower.includes('json') || lower.includes('html')) return FileText;
    return FileText;
  };

  return (
    <div className="space-y-6">
      <ProcessProgress
        active={loading || saving}
        profile={saving ? 'publish' : 'sync'}
        title={saving ? 'Updating repository files and folders' : 'Loading file repository workspace'}
        compact
        floating
        className="border-white/80 bg-white/94"
      />

      {(statusMessage || errorMessage) && (
        <Card className="cloud-panel rounded-[1.5rem] border border-white/55">
          <CardContent className="p-4">
            {statusMessage ? <p className="text-sm text-emerald-700">{statusMessage}</p> : null}
            {errorMessage ? <p className="text-sm text-rose-600">{errorMessage}</p> : null}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white">
          <FolderClosed className="h-4 w-4" />
          {title}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant={tab === 'files' ? 'default' : 'outline'} onClick={() => setTab('files')} className="rounded-xl">
            Files
          </Button>
          <Button type="button" variant={tab === 'upload' ? 'default' : 'outline'} onClick={() => setTab('upload')} className="rounded-xl">
            Upload
          </Button>
        </div>
      </div>

      {tab === 'files' ? (
        <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
          <Card className="cloud-panel rounded-[1.6rem] border border-white/55">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Folders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {([
                { id: 'all' as const, label: 'All files', count: transfers.length },
                { id: 'unfiled' as const, label: 'Unfiled', count: transfers.filter((entry) => !entry.folderId).length },
              ]).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedFolderId(item.id)}
                  className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition ${
                    selectedFolderId === item.id
                      ? 'border-slate-950 bg-slate-950 text-white'
                      : 'border-white/60 bg-white/55 text-slate-800 hover:bg-white/70'
                  }`}
                >
                  <span className="font-semibold">{item.label}</span>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${selectedFolderId === item.id ? 'bg-white/15 text-white' : 'bg-slate-950/5 text-slate-600'}`}>
                    {item.count}
                  </span>
                </button>
              ))}

              <div className="h-px bg-white/60" />

              {folders.map((folder) => {
                const active = selectedFolderId === folder.id;
                const tone = folderToneClasses[folder.colorTone || 'slate'];
                const count = folderFileCounts.get(folder.id) || 0;
                return (
                  <div key={folder.id} className={`rounded-2xl border px-4 py-3 ${active ? 'border-slate-950 bg-white/70' : 'border-white/60 bg-white/55'}`}>
                    <button type="button" onClick={() => setSelectedFolderId(folder.id)} className="flex w-full items-start justify-between gap-3 text-left">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">{folder.name}</p>
                        {folder.description ? <p className="mt-1 line-clamp-2 text-xs text-slate-500">{folder.description}</p> : null}
                      </div>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${tone}`}>{count}</span>
                    </button>
                    <div className="mt-3 flex justify-end">
                      <Button type="button" variant="ghost" size="sm" onClick={() => void deleteFolder(folder.id)} className="h-9 rounded-xl text-slate-600 hover:text-slate-950">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  </div>
                );
              })}

              <div className="rounded-2xl border border-dashed border-white/60 bg-white/45 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">New folder</p>
                <div className="mt-3 grid gap-2">
                  <Input value={folderDraft.name} onChange={(event) => setFolderDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Folder name" className="navbar-glass h-10 rounded-xl" />
                  <Input value={folderDraft.description} onChange={(event) => setFolderDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Short note" className="navbar-glass h-10 rounded-xl" />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <select value={folderDraft.colorTone || 'slate'} onChange={(event) => setFolderDraft((current) => ({ ...current, colorTone: event.target.value as FileManagerFolder['colorTone'] }))} className="navbar-glass h-10 w-full rounded-xl px-3 text-sm">
                      {Object.keys(folderToneClasses).map((toneKey) => (
                        <option key={toneKey} value={toneKey}>{toneKey}</option>
                      ))}
                    </select>
                    <Button onClick={() => void createFolder()} disabled={saving} className="h-10 rounded-xl bg-slate-950 text-white hover:bg-slate-800">
                      <FolderPlus className="mr-2 h-4 w-4" />
                      Create
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cloud-panel rounded-[1.6rem] border border-white/55">
            <CardHeader className="gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <CardTitle className="text-base">Repository</CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  <span className="font-medium text-slate-700">Folder:</span> {activeFolder.name} <span className="mx-2 text-slate-400">/</span>
                  <span className="font-medium text-slate-700">Items:</span> {filteredTransfers.length}
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search files, notes, folders" className="navbar-glass h-10 w-full rounded-xl sm:w-[320px]" />
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => void loadRepository()} className="h-10 rounded-xl">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                  <Button type="button" onClick={() => setTab('upload')} className="h-10 rounded-xl bg-slate-950 text-white hover:bg-slate-800">
                    <Paperclip className="mr-2 h-4 w-4" />
                    Upload
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading files...
                </div>
              ) : paginatedTransfers.length ? (
                <div className="space-y-2">
                  {paginatedTransfers.map((transfer) => {
                    const secureUrl = buildAbsoluteAppUrl(`/transfer/${transfer.shareId}`, typeof window !== 'undefined' ? window.location.origin : undefined);
                    const openUrl = buildAbsoluteAppUrl(transfer.publicOpenUrl || `/open/${transfer.shareId}`, typeof window !== 'undefined' ? window.location.origin : undefined);
                    const FileIcon = pickFileIcon(transfer.mimeType);
                    const isImagePreviewable = Boolean(transfer.dataUrl) && (transfer.mimeType || '').toLowerCase().startsWith('image/');
                    const expanded = expandedTransferId === transfer.id;

                    return (
                      <div key={transfer.id} className="rounded-[1.25rem] border border-white/55 bg-white/55 p-3 shadow-[0_14px_40px_rgba(15,23,42,0.06)] backdrop-blur">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="h-12 w-12 overflow-hidden rounded-2xl border border-white/60 bg-white/50">
                              {isImagePreviewable ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={transfer.dataUrl} alt={transfer.title || transfer.fileName} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_25%_20%,rgba(96,165,250,0.22),transparent_55%),radial-gradient(circle_at_80%_90%,rgba(167,139,250,0.18),transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.5),rgba(248,250,252,0.6))]">
                                  <FileIcon className="h-5 w-5 text-slate-700" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-sm font-semibold text-slate-950">{transfer.title || transfer.fileName}</p>
                                <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${transfer.revokedAt ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                  {transfer.revokedAt ? 'Revoked' : 'Active'}
                                </span>
                                {transfer.folderName ? <span className="rounded-full bg-slate-950/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-700">{transfer.folderName}</span> : null}
                              </div>
                              <p className="mt-1 truncate text-xs text-slate-500">{transfer.fileName} · {formatBytes(transfer.sizeInBytes)} · {transfer.mimeType}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 md:justify-end">
                            <Button type="button" variant="outline" size="sm" onClick={() => void copyLink(secureUrl, 'Secure link')} className="h-9 rounded-xl">
                              <Copy className="mr-2 h-4 w-4" />
                              Copy link
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => window.open(secureUrl, '_blank', 'noopener,noreferrer')} className="h-9 rounded-xl">
                              <Lock className="mr-2 h-4 w-4" />
                              Open
                            </Button>
                            <Button type="button" variant="ghost" size="sm" onClick={() => (expanded ? setExpandedTransferId('') : beginTransferEdit(transfer))} className="h-9 rounded-xl text-slate-600 hover:text-slate-950">
                              {expanded ? 'Close' : 'Show details'}
                            </Button>
                          </div>
                        </div>

                        {expanded ? (
                          <div className="mt-4 grid gap-4 border-t border-white/60 pt-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                            <div className="space-y-3">
                              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                                {[
                                  { label: 'Opens', value: String(transfer.openCount) },
                                  { label: 'Downloads', value: String(transfer.downloadCount) },
                                  { label: 'Auth', value: transfer.authMode.replace(/_/g, ' + ') },
                                  { label: 'Created', value: new Date(transfer.createdAt).toLocaleDateString() },
                                  { label: 'Last open', value: transfer.lastOpenedAt ? new Date(transfer.lastOpenedAt).toLocaleString() : 'Not yet' },
                                ].map((metric) => (
                                  <div key={metric.label} className="rounded-2xl border border-white/60 bg-white/55 px-3 py-2 text-xs text-slate-600">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{metric.label}</p>
                                    <p className="mt-1 text-sm font-semibold text-slate-950">{metric.value}</p>
                                  </div>
                                ))}
                              </div>

                              <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-2">
                                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Details</p>
                                  <Input value={transferEditDraft.title} onChange={(event) => setTransferEditDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Display title" className="navbar-glass h-10 rounded-xl" />
                                  <textarea value={transferEditDraft.notes} onChange={(event) => setTransferEditDraft((current) => ({ ...current, notes: event.target.value }))} className="navbar-glass min-h-[96px] w-full rounded-xl px-3 py-2 text-sm text-slate-900" placeholder="Notes" />
                                </div>

                                <div className="space-y-2">
                                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Passwords</p>
                                  {transfer.authMode === 'triple_password' ? (
                                    <div className="grid gap-2">
                                      {[
                                        { label: 'Transfer password', value: transfer.accessPassword || '' },
                                        { label: 'Secure password', value: transfer.securePassword || '' },
                                        { label: 'Parser password', value: transfer.parserPassword || '' },
                                      ].map((item) => (
                                        <button key={item.label} type="button" onClick={() => void copyLink(item.value, item.label)} className="navbar-glass rounded-xl px-3 py-2 text-left">
                                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
                                          <p className="mt-1 font-mono text-xs text-slate-900">{item.value}</p>
                                        </button>
                                      ))}
                                    </div>
                                  ) : (
                                    <Input value={transferEditDraft.accessPassword} onChange={(event) => setTransferEditDraft((current) => ({ ...current, accessPassword: event.target.value.toUpperCase() }))} placeholder="Access password" className="navbar-glass h-10 rounded-xl" />
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Actions</p>
                              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                                <Button type="button" variant="outline" size="sm" onClick={() => void copyLink(openUrl, 'Open link')} className="h-9 rounded-xl">
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  Copy open link
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => window.open(openUrl, '_blank', 'noopener,noreferrer')} className="h-9 rounded-xl">
                                  <Download className="mr-2 h-4 w-4" />
                                  Redirect
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setForm({
                                      title: transfer.title || '',
                                      notes: transfer.notes || '',
                                      folderId: transfer.folderId || '',
                                      authMode: transfer.authMode,
                                      accessPassword: transfer.accessPassword || '',
                                      securePassword: transfer.securePassword || '',
                                      parserPassword: transfer.parserPassword || '',
                                      recipientEmail: transfer.recipientEmail || '',
                                      maxDownloads: transfer.maxDownloads ? String(transfer.maxDownloads) : '',
                                      expiresInDays: '7',
                                    });
                                    setStatusMessage('Transfer settings loaded into the upload tab.');
                                    setErrorMessage('');
                                    setTab('upload');
                                  }}
                                  className="h-9 rounded-xl"
                                >
                                  Reuse in upload
                                </Button>
                              </div>

                              <select value={transfer.folderId || ''} onChange={(event) => void updateTransferFolder(transfer.id, event.target.value)} className="navbar-glass h-10 w-full rounded-xl px-3 text-sm">
                                <option value="">Move to Unfiled</option>
                                {folders.map((folder) => (
                                  <option key={folder.id} value={folder.id}>{folder.name}</option>
                                ))}
                              </select>

                              <div className="grid gap-2 sm:grid-cols-2">
                                {!transfer.revokedAt ? (
                                  <Button type="button" variant="outline" size="sm" onClick={() => void revokeTransfer(transfer.id)} className="h-9 rounded-xl">
                                    <ShieldCheck className="mr-2 h-4 w-4" />
                                    Revoke
                                  </Button>
                                ) : <div />}
                                <Button type="button" variant="outline" size="sm" onClick={() => void saveTransferEdit()} className="h-9 rounded-xl">Save</Button>
                              </div>

                              <div className="grid gap-2 sm:grid-cols-2">
                                <Button type="button" variant="ghost" size="sm" onClick={() => setExpandedTransferId('')} className="h-9 rounded-xl text-slate-600 hover:text-slate-950">
                                  Close
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => void deleteTransfer(transfer.id)} className="h-9 rounded-xl">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-[1.25rem] border border-dashed border-white/60 bg-white/45 p-10 text-center text-sm text-slate-600">
                  No matching files yet.
                </div>
              )}

              {filteredTransfers.length > 6 ? (
                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setRepositoryPage((page) => Math.max(1, page - 1))} disabled={repositoryPage === 1}>Previous</Button>
                  <span className="text-sm text-slate-500">Page {repositoryPage} of {repositoryPageCount}</span>
                  <Button type="button" variant="outline" size="sm" onClick={() => setRepositoryPage((page) => Math.min(repositoryPageCount, page + 1))} disabled={repositoryPage === repositoryPageCount}>Next</Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="cloud-panel rounded-[1.6rem] border border-white/55">
          <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <CardTitle className="text-base">Upload and share</CardTitle>
              <p className="mt-1 text-sm text-slate-500">Upload a file once, then share it with governed links.</p>
            </div>
            <Button type="button" variant="outline" onClick={() => setTab('files')} className="rounded-xl">Back to files</Button>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/60 bg-white/55 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Choose file</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <input type="file" onChange={(event) => void handleFileChange(event)} className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800" />
                      {filePayload ? <p className="mt-2 text-xs text-slate-500">Loaded: {filePayload.fileName} · {formatBytes(filePayload.sizeInBytes)}</p> : null}
                    </div>
                    <div className="grid gap-2">
                      <Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Display title" className="navbar-glass h-10 rounded-xl" />
                      <select value={form.folderId} onChange={(event) => setForm((current) => ({ ...current, folderId: event.target.value }))} className="navbar-glass h-10 w-full rounded-xl px-3 text-sm">
                        <option value="">Unfiled</option>
                        {folders.map((folder) => (
                          <option key={folder.id} value={folder.id}>{folder.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/60 bg-white/55 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Security</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <select value={form.authMode} onChange={(event) => setForm((current) => ({ ...current, authMode: event.target.value as FileTransferAuthMode }))} className="navbar-glass h-10 w-full rounded-xl px-3 text-sm">
                      <option value="password">Password</option>
                      <option value="public">Public</option>
                      <option value="email">Email</option>
                      <option value="password_and_email">Password + Email</option>
                      {mode === 'encrypter' ? <option value="triple_password">Triple password</option> : null}
                    </select>
                    <Input value={form.accessPassword} onChange={(event) => setForm((current) => ({ ...current, accessPassword: event.target.value.toUpperCase() }))} placeholder="Transfer password" className="navbar-glass h-10 rounded-xl" />
                    <Input value={form.recipientEmail} onChange={(event) => setForm((current) => ({ ...current, recipientEmail: event.target.value }))} placeholder="Recipient email (optional)" className="navbar-glass h-10 rounded-xl sm:col-span-2" />
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <Input value={form.expiresInDays} onChange={(event) => setForm((current) => ({ ...current, expiresInDays: event.target.value }))} placeholder="Expiry days" className="navbar-glass h-10 rounded-xl" />
                    <Input value={form.maxDownloads} onChange={(event) => setForm((current) => ({ ...current, maxDownloads: event.target.value }))} placeholder="Max downloads" className="navbar-glass h-10 rounded-xl" />
                    <Input value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Short note" className="navbar-glass h-10 rounded-xl" />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" onClick={() => void createTransfer()} disabled={saving} className="rounded-xl bg-slate-950 text-white hover:bg-slate-800">
                    <Paperclip className="mr-2 h-4 w-4" />
                    Create secure link
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { setFilePayload(null); setStatusMessage(''); setErrorMessage(''); }} className="rounded-xl">
                    Clear
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl border border-white/60 bg-white/55 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Share</p>
                {createdTransfer ? (
                  <div className="mt-3 space-y-2">
                    {(() => {
                      const secureUrl = buildAbsoluteAppUrl(`/transfer/${createdTransfer.shareId}`, typeof window !== 'undefined' ? window.location.origin : undefined);
                      const openUrl = buildAbsoluteAppUrl(createdTransfer.publicOpenUrl || `/open/${createdTransfer.shareId}`, typeof window !== 'undefined' ? window.location.origin : undefined);
                      return (
                        <>
                          <button type="button" onClick={() => void copyLink(secureUrl, 'Secure link')} className="navbar-glass w-full rounded-xl px-3 py-2 text-left">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Secure link</p>
                            <p className="mt-1 break-all font-mono text-xs text-slate-900">{secureUrl}</p>
                          </button>
                          <button type="button" onClick={() => void copyLink(openUrl, 'Open link')} className="navbar-glass w-full rounded-xl px-3 py-2 text-left">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Open link</p>
                            <p className="mt-1 break-all font-mono text-xs text-slate-900">{openUrl}</p>
                          </button>
                          {createdTransfer.accessPassword ? (
                            <button type="button" onClick={() => void copyLink(createdTransfer.accessPassword || '', 'Password')} className="navbar-glass w-full rounded-xl px-3 py-2 text-left">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Password</p>
                              <p className="mt-1 font-mono text-xs text-slate-900">{createdTransfer.accessPassword}</p>
                            </button>
                          ) : null}
                        </>
                      );
                    })()}

                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button type="button" variant="outline" onClick={() => window.open(buildAbsoluteAppUrl(`/transfer/${createdTransfer.shareId}`, typeof window !== 'undefined' ? window.location.origin : undefined), '_blank', 'noopener,noreferrer')} className="rounded-xl">
                        <Lock className="mr-2 h-4 w-4" />
                        Open secure
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setTab('files')} className="rounded-xl">
                        View in files
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-600">Create a link and the share details will appear here.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

