'use client';

import type { ChangeEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, Loader2, Maximize2, Save, Sparkles, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { DocumentField, DocumentTemplate } from '@/types/document';
import { escapeHtml, renderDocumentTemplate } from '@/lib/template';

type StudioTab = 'import' | 'basics' | 'branding' | 'template' | 'fields';

type StudioDraft = {
  name: string;
  category: string;
  description: string;
  fields: DocumentField[];
  headerHtml: string;
  bodyHtml: string;
  footerHtml: string;
  css: string;
};

type BrandingState = {
  headerEnabled: boolean;
  footerEnabled: boolean;
  brandName: string;
  subtitle: string;
  rightMeta: string;
  footerLeft: string;
  footerRight: string;
  logoDataUrl: string;
  logoMaxHeight: number;
  headerImageDataUrl: string;
  headerImageMaxHeight: number;
  footerImageDataUrl: string;
  footerImageMaxHeight: number;
};

const CATEGORY_OPTIONS = ['General', 'HR', 'Legal', 'Finance', 'Operations'] as const;
const FIELD_TYPES: DocumentField['type'][] = ['text', 'date', 'textarea', 'number', 'email', 'select', 'tel', 'url', 'checkbox', 'radio', 'image'];

type PageSize = 'A4' | 'Letter' | 'Legal' | 'Custom';
type PageSettings = {
  size: PageSize;
  widthMm: number;
  heightMm: number;
  marginMm: number;
  pageNumbersEnabled: boolean;
};

const DEFAULT_CSS = `
:root{--ink:#0b1220;--muted:rgba(15,23,42,.62);--line:rgba(148,163,184,.40);--paper:#ffffff}
*{box-sizing:border-box}
body{margin:0;padding:0;background:var(--paper)}
.tpl{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:var(--ink)}
.tpl-header,.tpl-footer{display:flex;justify-content:space-between;gap:16px;padding:18px 18px 12px;border-bottom:1px solid var(--line)}
.tpl-footer{border-bottom:none;border-top:1px solid var(--line);padding:12px 18px}
.tpl-header-media,.tpl-footer-media{padding:12px 0;border:0}
.tpl-header-media img,.tpl-footer-media img{display:block;width:100%;max-width:100%;height:auto;object-fit:contain}
.tpl-header-left{display:flex;align-items:center;gap:12px}
.tpl-logo{display:block;max-height:42px;max-width:160px;object-fit:contain}
.tpl-brand{font-weight:800;letter-spacing:-.03em;font-size:15px}
.tpl-sub{margin-top:3px;font-size:12px;color:var(--muted)}
.tpl-meta{font-size:12px;color:var(--muted);text-align:right;white-space:pre-wrap}
.tpl-body{padding:18px}
.tpl-title{margin:0 0 10px;font-size:22px;letter-spacing:-.03em}
.tpl-desc{margin:0 0 14px;color:var(--muted);font-size:13px;line-height:1.65}
.tpl-row{padding:10px 12px;border:1px solid var(--line);border-radius:14px;margin:10px 0}
.tpl-label{font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:rgba(15,23,42,.62)}
.tpl-value{margin-top:6px;font-size:14px}
@media (max-width:640px){.tpl-logo{max-width:120px}}
`.trim();

function prettifyLabel(key: string) {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function safeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function toFieldName(label: string) {
  const cleaned = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 5)
    .map((w, idx) => (idx === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join('');
  return cleaned || `field${Math.random().toString(36).slice(2, 6)}`;
}

function buildSampleData(fields: DocumentField[]) {
  const sample: Record<string, string> = {};
  fields.forEach((f) => {
    if (f.type === 'date') sample[f.name] = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date());
    else if (f.type === 'number') sample[f.name] = '1000';
    else if (f.type === 'email') sample[f.name] = 'recipient@company.com';
    else if (f.type === 'tel') sample[f.name] = '+91 98XXXXXX10';
    else if (f.type === 'url') sample[f.name] = 'https://docrud.app';
    else if (f.type === 'textarea') sample[f.name] = 'Add the full text here. Keep it clear, specific, and review-ready.';
    else if ((f.type === 'select' || f.type === 'radio') && f.options?.length) sample[f.name] = f.options[0]!;
    else if (f.type === 'checkbox') sample[f.name] = 'true';
    else sample[f.name] = f.placeholder || 'Value';
  });
  return sample;
}

function sanitizeTemplateMarkup(value: string) {
  return String(value || '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son[a-z]+="[^"]*"/gi, '')
    .replace(/\son[a-z]+='[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}

function extractInlineCss(value: string) {
  const raw = String(value || '');
  const styleMatches = Array.from(raw.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi));
  if (!styleMatches.length) return '';
  return styleMatches.map((m) => (m?.[1] || '').trim()).filter(Boolean).join('\n\n');
}

function stripStyleTags(value: string) {
  return String(value || '').replace(/<style[\s\S]*?<\/style>/gi, '').trim();
}

function extractBodyHtml(value: string) {
  const raw = String(value || '');
  const bodyMatch = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch?.[1]) return bodyMatch[1].trim();
  const cleaned = raw
    .replace(/<!doctype[\s\S]*?>/i, '')
    .replace(/<html[^>]*>/i, '')
    .replace(/<\/html>/i, '')
    .replace(/<head[\s\S]*?<\/head>/i, '')
    .trim();
  return cleaned;
}

function extractPlaceholders(markup: string) {
  const raw = String(markup || '');
  const out: string[] = [];
  const seen = new Set<string>();
  const re = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;
  let match: RegExpExecArray | null = null;
  while ((match = re.exec(raw))) {
    const key = match[1] || '';
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

function guessFieldType(name: string): DocumentField['type'] {
  const key = String(name || '').toLowerCase();
  if (key.includes('date')) return 'date';
  if (key.includes('email')) return 'email';
  if (key.includes('phone') || key.includes('mobile') || key.includes('tel')) return 'tel';
  if (key.includes('url') || key.includes('website') || key.includes('link')) return 'url';
  if (key.includes('amount') || key.includes('total') || key.includes('price') || key.includes('fee') || key.includes('qty') || key.includes('count') || key.includes('number')) return 'number';
  if (key.includes('notes') || key.includes('summary') || key.includes('description') || key.includes('message') || key.includes('address') || key.includes('body')) return 'textarea';
  return 'text';
}

function looksLikeFieldLabel(label: string) {
  const raw = String(label || '').trim();
  if (!raw) return false;
  if (raw.length < 2 || raw.length > 52) return false;
  if (!/[a-zA-Z]/.test(raw)) return false;
  if (/^[\W_]+$/.test(raw)) return false;
  return true;
}

function normalizeImportedLabel(input: string) {
  return String(input || '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s/-]/g, '')
    .trim()
    .slice(0, 52);
}

function applySmartVariableDetection(html: string) {
  let output = String(html || '');
  const detected: { label: string; name: string }[] = [];
  const seen = new Set<string>();

  const addField = (labelRaw: string) => {
    const label = normalizeImportedLabel(labelRaw);
    if (!looksLikeFieldLabel(label)) return null;
    const name = toFieldName(label);
    if (!name) return null;
    if (!seen.has(name)) {
      seen.add(name);
      detected.push({ label, name });
    }
    return { label, name };
  };

  // Replace explicit markers like [Client Name], {Amount}, <<Due Date>>
  const bracketPatterns: Array<RegExp> = [
    /\[\s*([^\]]{2,60})\s*\]/g,
    /<<\s*([^>]{2,60})\s*>>/g,
    // Curly braces are common in CSS, but we run this after style tags are stripped.
    /\{\s*([^}]{2,60})\s*\}/g,
  ];

  bracketPatterns.forEach((re) => {
    output = output.replace(re, (full, group1) => {
      const added = addField(String(group1 || ''));
      return added ? `{{${added.name}}}` : full;
    });
  });

  // Replace runs of underscores with variables. Try to infer label from preceding text.
  // Example: "Client Name: ________" -> {{clientName}}
  output = output.replace(/([A-Za-z][A-Za-z0-9\s/-]{2,48})\s*[:\-–]\s*_{5,}/g, (full, label) => {
    const added = addField(String(label || ''));
    return added ? `${label}: {{${added.name}}}` : full;
  });

  // Fallback: plain underscores become generic fields.
  let underscoreCounter = 1;
  output = output.replace(/_{8,}/g, (full) => {
    const added = addField(`Blank ${underscoreCounter++}`);
    return added ? `{{${added.name}}}` : full;
  });

  return { html: output, detected };
}

function buildHeaderHtml(branding: BrandingState) {
  if (!branding.headerEnabled) return '';
  if (branding.headerImageDataUrl) {
    return `
<div class="tpl-header tpl-header-media">
  <img src="${branding.headerImageDataUrl}" alt="Header" style="max-height:${Math.max(48, Math.min(branding.headerImageMaxHeight, 220))}px" />
</div>
    `.trim();
  }
  const logoHtml = branding.logoDataUrl
    ? `<img class="tpl-logo" src="${branding.logoDataUrl}" alt="Logo" style="max-height:${Math.max(18, Math.min(branding.logoMaxHeight, 72))}px" />`
    : '';
  return `
<div class="tpl-header">
  <div class="tpl-header-left">
    ${logoHtml}
    <div>
      <div class="tpl-brand">${branding.brandName || ''}</div>
      <div class="tpl-sub">${branding.subtitle || ''}</div>
    </div>
  </div>
  <div class="tpl-meta">${branding.rightMeta || ''}</div>
</div>
  `.trim();
}

function buildFooterHtml(branding: BrandingState) {
  if (!branding.footerEnabled) return '';
  if (branding.footerImageDataUrl) {
    return `
<div class="tpl-footer tpl-footer-media">
  <img src="${branding.footerImageDataUrl}" alt="Footer" style="max-height:${Math.max(32, Math.min(branding.footerImageMaxHeight, 220))}px" />
</div>
    `.trim();
  }
  return `
<div class="tpl-footer">
  <div class="tpl-meta" style="text-align:left">${branding.footerLeft || ''}</div>
  <div class="tpl-meta">${branding.footerRight || ''}</div>
</div>
  `.trim();
}

export default function TemplateStudioStudio({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated?: (template: DocumentTemplate) => void;
}) {
  const [activeTab, setActiveTab] = useState<StudioTab>('import');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoSyncFields, setAutoSyncFields] = useState(true);
  const [lastDetected, setLastDetected] = useState<string[]>([]);
  const [previewFullscreenOpen, setPreviewFullscreenOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string>('');
  const [importAutoDetect, setImportAutoDetect] = useState(true);
  const [importLastFileName, setImportLastFileName] = useState<string>('');

  const normalizeFieldOrders = useCallback((fields: DocumentField[]) => (
    fields.map((f, idx) => ({ ...f, order: idx + 1 }))
  ), []);

  const [draft, setDraft] = useState<StudioDraft>(() => ({
    name: '',
    category: 'General',
    description: '',
    fields: [],
    headerHtml: '',
    bodyHtml: '',
    footerHtml: '',
    css: DEFAULT_CSS,
  }));

  const [templateSource, setTemplateSource] = useState<string>('');
  const templateEditorRef = useRef<HTMLTextAreaElement | null>(null);
  const syncTimeoutRef = useRef<number | null>(null);

  const [page, setPage] = useState<PageSettings>(() => ({
    size: 'A4',
    widthMm: 210,
    heightMm: 297,
    marginMm: 16,
    pageNumbersEnabled: false,
  }));

  const [branding, setBranding] = useState<BrandingState>(() => ({
    headerEnabled: false,
    footerEnabled: false,
    brandName: '',
    subtitle: '',
    rightMeta: '',
    footerLeft: '',
    footerRight: '',
    logoDataUrl: '',
    logoMaxHeight: 42,
    headerImageDataUrl: '',
    headerImageMaxHeight: 120,
    footerImageDataUrl: '',
    footerImageMaxHeight: 90,
  }));

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const headerImageInputRef = useRef<HTMLInputElement | null>(null);
  const footerImageInputRef = useRef<HTMLInputElement | null>(null);
  const importFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // Keep header/footer in sync with branding (no presets, blank-first).
    setDraft((current) => ({
      ...current,
      headerHtml: buildHeaderHtml(branding),
      footerHtml: buildFooterHtml(branding),
    }));
  }, [branding]);

  const syncDraftFromSource = useCallback((source: string) => {
    const hasStyleTag = /<style[\s>]/i.test(String(source || ''));
    const css = extractInlineCss(source);
    const html = extractBodyHtml(stripStyleTags(source));
    setDraft((current) => ({
      ...current,
      css: hasStyleTag ? css : (css ? css : current.css),
      bodyHtml: html,
    }));
  }, []);

  const detectedPlaceholders = useMemo(() => {
    const combined = [draft.headerHtml, draft.bodyHtml, draft.footerHtml].filter(Boolean).join('\n');
    const raw = extractPlaceholders(combined);
    const reserved = new Set(['date', 'referenceNumber', 'generatedAt', 'title', 'summary']);
    return raw.filter((k) => !reserved.has(k));
  }, [draft.bodyHtml, draft.footerHtml, draft.headerHtml]);

  const syncFieldsFromDetected = useCallback((detected: string[]) => {
    setDraft((current) => {
      const existingByName = new Map(current.fields.map((f) => [f.name, f] as const));
      const next: DocumentField[] = [];

      detected.forEach((name) => {
        const existing = existingByName.get(name);
        if (existing) next.push(existing);
        else {
          next.push({
            id: safeId('field'),
            name,
            label: prettifyLabel(name),
            type: guessFieldType(name),
            required: false,
            order: next.length + 1,
          });
        }
      });

      // Keep extra fields (manual) at the end, stable.
      current.fields.forEach((f) => {
        if (!detected.includes(f.name)) next.push(f);
      });

      return { ...current, fields: normalizeFieldOrders(next) };
    });
  }, [normalizeFieldOrders]);

  useEffect(() => {
    if (!autoSyncFields) return;
    if (!detectedPlaceholders.length) return;
    // debounce to avoid “typing lag”
    if (syncTimeoutRef.current) window.clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = window.setTimeout(() => {
      setLastDetected(detectedPlaceholders);
      syncFieldsFromDetected(detectedPlaceholders);
    }, 300);
    return () => {
      if (syncTimeoutRef.current) window.clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = null;
    };
  }, [autoSyncFields, detectedPlaceholders, syncFieldsFromDetected]);

  const combinedTemplateHtml = useMemo(() => (
    [
      draft.headerHtml?.trim() ? sanitizeTemplateMarkup(draft.headerHtml) : '',
      draft.bodyHtml?.trim() ? sanitizeTemplateMarkup(draft.bodyHtml) : '',
      draft.footerHtml?.trim() ? sanitizeTemplateMarkup(draft.footerHtml) : '',
    ]
      .filter(Boolean)
      .join('\n')
  ), [draft.bodyHtml, draft.footerHtml, draft.headerHtml]);

  const previewHtml = useMemo(() => {
    const fieldsWithBasics: DocumentField[] = [
      { id: 'title', name: 'title', label: 'Title', type: 'text', required: false, order: 0 },
      { id: 'summary', name: 'summary', label: 'Summary', type: 'textarea', required: false, order: 0 },
      ...draft.fields,
      { id: 'date', name: 'date', label: 'Date', type: 'date', required: false, order: 0 },
      { id: 'reference', name: 'referenceNumber', label: 'Reference number', type: 'text', required: false, order: 0 },
    ];

    const sample = buildSampleData(fieldsWithBasics);
    sample.title = draft.name || '';
    sample.summary = draft.description || '';

    const template: DocumentTemplate = {
      id: 'studio-preview',
      name: draft.name || 'Untitled template',
      category: draft.category || 'General',
      description: draft.description,
      fields: normalizeFieldOrders(fieldsWithBasics),
      template: `<div class="tpl"><style>\n${draft.css || ''}\n</style>\n${combinedTemplateHtml}</div>`,
      isCustom: true,
    };

    try {
      return renderDocumentTemplate(template, sample, {
        generatedBy: 'docrud template studio',
        renderMode: 'plain',
        pageSize: page.size === 'Custom' ? 'A4' : page.size,
        pageWidthMm: page.size === 'Custom' ? page.widthMm : undefined,
        pageHeightMm: page.size === 'Custom' ? page.heightMm : undefined,
        pageMarginMm: page.marginMm,
      });
    } catch {
      return '<div style="font-family: ui-sans-serif, system-ui; color: #b91c1c; padding: 16px;">Preview unavailable. Check placeholders and markup.</div>';
    }
  }, [combinedTemplateHtml, draft.category, draft.css, draft.description, draft.fields, draft.name, normalizeFieldOrders, page]);

  const addField = useCallback(() => {
    setDraft((current) => {
      const nextLabel = `Field ${current.fields.length + 1}`;
      const next: DocumentField = {
        id: safeId('field'),
        name: toFieldName(nextLabel),
        label: nextLabel,
        type: 'text',
        required: false,
        order: current.fields.length + 1,
      };
      return { ...current, fields: normalizeFieldOrders([...current.fields, next]) };
    });
  }, [normalizeFieldOrders]);

  const removeField = useCallback((id: string) => {
    setDraft((current) => ({ ...current, fields: normalizeFieldOrders(current.fields.filter((f) => f.id !== id)) }));
  }, [normalizeFieldOrders]);

  const insertPlaceholderIntoTemplate = useCallback((fieldName: string) => {
    const token = `{{${fieldName}}}`;
    const el = templateEditorRef.current;
    if (!el) {
      setTemplateSource((current) => current ? `${current}\n${token}` : token);
      syncDraftFromSource(`${templateSource}\n${token}`);
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const next = `${el.value.slice(0, start)}${token}${el.value.slice(end)}`;
    setTemplateSource(next);
    syncDraftFromSource(next);
    requestAnimationFrame(() => {
      try {
        el.focus();
        const nextPos = start + token.length;
        el.setSelectionRange(nextPos, nextPos);
      } catch {
        // ignore
      }
    });
  }, [syncDraftFromSource, templateSource]);

  const handleLogoFile = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;

    try {
      if (!file.type.startsWith('image/')) throw new Error('Please upload an image file.');
      if (file.size > 650_000) throw new Error('Logo is too large. Keep it under 650KB for stable templates.');

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Unable to read image.'));
        reader.readAsDataURL(file);
      });

      setBranding((c) => ({ ...c, logoDataUrl: dataUrl }));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load logo.');
    } finally {
      event.target.value = '';
    }
  }, []);

  const handleHeaderImageFile = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;

    try {
      if (!file.type.startsWith('image/')) throw new Error('Please upload an image file.');
      if (file.size > 2_400_000) throw new Error('Header image is too large. Keep it under 2.4MB.');

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Unable to read image.'));
        reader.readAsDataURL(file);
      });

      setBranding((c) => ({ ...c, headerImageDataUrl: dataUrl, headerEnabled: true }));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load image.');
    } finally {
      event.target.value = '';
    }
  }, []);

  const handleFooterImageFile = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;

    try {
      if (!file.type.startsWith('image/')) throw new Error('Please upload an image file.');
      if (file.size > 2_400_000) throw new Error('Footer image is too large. Keep it under 2.4MB.');

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Unable to read image.'));
        reader.readAsDataURL(file);
      });

      setBranding((c) => ({ ...c, footerImageDataUrl: dataUrl, footerEnabled: true }));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load image.');
    } finally {
      event.target.value = '';
    }
  }, []);

  const importDocumentAsTemplate = useCallback(async (file: File) => {
    setError(null);
    setImportStatus('');
    setImportLastFileName(file.name || '');
    setImporting(true);

    try {
      const nameStem = (file.name || 'Imported document').replace(/\.[^.]+$/, '').trim() || 'Imported template';
      const ext = (file.name.split('.').pop() || '').toLowerCase();

      let importedHtml = '';
      let importedCss = '';

      if (ext === 'docx' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        setImportStatus('Converting DOCX to HTML...');
        const mammoth = await import('mammoth');
        const result = await mammoth.convertToHtml(
          { arrayBuffer: await file.arrayBuffer() },
          {
            includeDefaultStyleMap: true,
            // Keep Word-ish semantics stable so users can further style in CSS.
            styleMap: [
              "p[style-name='Title'] => h1:fresh",
              "p[style-name='Heading 1'] => h2:fresh",
              "p[style-name='Heading 2'] => h3:fresh",
              "p[style-name='Heading 3'] => h4:fresh",
              "p[style-name='Quote'] => blockquote:fresh",
              "p[style-name='Subtitle'] => h3.subtitle:fresh",
              'table => table.table:fresh',
            ],
          } as any
        );
        importedHtml = String(result?.value || '').trim();
        importedCss = '';
      } else if (ext === 'html' || ext === 'htm' || file.type.includes('html')) {
        setImportStatus('Importing HTML...');
        importedHtml = new TextDecoder().decode(await file.arrayBuffer());
      } else if (ext === 'md' || ext === 'txt' || file.type.startsWith('text/')) {
        setImportStatus('Importing text...');
        const rawText = new TextDecoder().decode(await file.arrayBuffer());
        const safe = escapeHtml(rawText);
        importedHtml = `<div class="tpl-body"><pre style="white-space:pre-wrap; font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size:12px; line-height:1.6; margin:0;">${safe}</pre></div>`;
      } else if (ext === 'pdf' || file.type === 'application/pdf') {
        setImportStatus('Extracting text from PDF (layout may vary)...');
        const form = new FormData();
        form.append('file', file);
        form.append('title', nameStem);
        const res = await fetch('/api/ai/document-parser', { method: 'POST', body: form });
        const payload = await res.json().catch(() => null);
        if (!res.ok) throw new Error(payload?.error || 'Unable to read PDF');
        const content = String(payload?.extractedContent || '').trim();
        const lines = content.split('\n').map((l: string) => l.trim()).filter(Boolean).slice(0, 400);
        importedHtml = `<div class="tpl-body">${lines.map((line: string) => `<p style="margin:0 0 8px">${escapeHtml(line)}</p>`).join('')}</div>`;
      } else {
        throw new Error('Import supports DOCX, HTML, TXT, MD, and PDF right now.');
      }

      const sanitized = sanitizeTemplateMarkup(importedHtml);
      const extractedCss = extractInlineCss(sanitized);
      const bodyOnly = extractBodyHtml(stripStyleTags(sanitized));
      const wrappedBody = /class=["'][^"']*\btpl-body\b/i.test(bodyOnly)
        ? bodyOnly
        : `<div class="tpl-body imported">${bodyOnly}</div>`;
      const css = [DEFAULT_CSS, importedCss || '', extractedCss || ''].filter(Boolean).join('\n\n');

      // Apply smart variable detection on the body (not the CSS).
      const smart = importAutoDetect ? applySmartVariableDetection(wrappedBody) : { html: wrappedBody, detected: [] as any[] };

      const starter = `<style>\n${css}\n</style>\n${smart.html}`;
      setTemplateSource(starter);
      syncDraftFromSource(starter);
      setDraft((current) => ({
        ...current,
        name: current.name?.trim() ? current.name : nameStem,
        category: current.category || 'General',
      }));

      if (importAutoDetect && smart.detected.length) {
        // force-sync fields immediately (not waiting for debounce)
        const names = smart.detected.map((d) => d.name);
        setLastDetected(names);
        syncFieldsFromDetected(names);
      }

      setImportStatus(`Imported ${file.name}. You can now edit HTML/CSS and fields freely.`);
      setActiveTab('template');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setImporting(false);
    }
  }, [importAutoDetect, syncDraftFromSource, syncFieldsFromDetected]);

  const saveTemplate = useCallback(async () => {
    setError(null);

    const bodyHtml = (draft.bodyHtml || '').trim();
    const fields = normalizeFieldOrders(draft.fields).map((f) => ({
      ...f,
      id: f.id || safeId('field'),
      name: f.name || toFieldName(f.label),
      label: f.label || f.name,
    }));

    if (!draft.name.trim()) {
      setError('Add a template name before saving.');
      setActiveTab('basics');
      return;
    }

    if (detectedPlaceholders.length > 0 && fields.length === 0) {
      setError('Your template contains variables. Sync or add fields before saving.');
      setActiveTab('template');
      return;
    }

    if (!bodyHtml) {
      setError('Add a template body (HTML) before saving.');
      setActiveTab('template');
      return;
    }

    const payload: Omit<DocumentTemplate, 'id' | 'createdAt' | 'updatedAt' | 'version'> = {
      name: draft.name.trim(),
      category: (draft.category || 'General').trim(),
      description: (draft.description || '').trim(),
      fields,
      template: `<div class="tpl"><style>\n${draft.css || ''}\n</style>\n${combinedTemplateHtml}</div>`,
      isCustom: true,
      renderSettings: {
        pageSize: page.size,
        pageWidthMm: page.size === 'Custom' ? page.widthMm : undefined,
        pageHeightMm: page.size === 'Custom' ? page.heightMm : undefined,
        pageMarginMm: page.marginMm,
        pageNumbersEnabled: Boolean(page.pageNumbersEnabled),
      },
    };

    setSaving(true);
    try {
      const res = await fetch('/api/templates/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const saved = await res.json().catch(() => null);
      if (!res.ok) throw new Error(saved?.error || 'Failed to save template');
      onCreated?.(saved as DocumentTemplate);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template.');
    } finally {
      setSaving(false);
    }
  }, [combinedTemplateHtml, detectedPlaceholders.length, draft.bodyHtml, draft.category, draft.description, draft.fields, draft.name, draft.css, normalizeFieldOrders, onClose, onCreated]);

  return (
    <div className="h-full w-full">
      <div className="flex h-14 items-center justify-between gap-3 border-b border-white/60 bg-white/60 px-4 backdrop-blur-2xl sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <Button type="button" variant="outline" className="rounded-full bg-white/70" onClick={onClose}>
            <X className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="hidden h-9 w-px bg-slate-200 sm:block" />
          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-sm font-semibold tracking-[-0.02em] text-slate-950">Template Studio</p>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <div className="hidden md:block">
            <Input
              value={draft.name}
              onChange={(e) => setDraft((c) => ({ ...c, name: e.target.value }))}
              placeholder="Template name"
              className="h-10 w-[320px] rounded-full border-white/70 bg-white/80"
            />
          </div>
          <Button
            type="button"
            className="rounded-full bg-slate-950 text-white hover:bg-slate-800"
            onClick={() => void saveTemplate()}
            disabled={saving}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save
          </Button>
        </div>
      </div>

      <div className="grid h-[calc(100%-3.5rem)] grid-cols-1 lg:grid-cols-[460px_minmax(0,1fr)]">
        <div className="min-w-0 overflow-auto border-b border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.70),rgba(255,255,255,0.52))] p-4 backdrop-blur-2xl lg:border-b-0 lg:border-r lg:p-6">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as StudioTab)}>
            <TabsList className="grid w-full grid-cols-5 rounded-full border border-white/70 bg-white/75 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
              <TabsTrigger value="import" className="rounded-full text-xs data-[state=active]:bg-slate-950 data-[state=active]:text-white">Import</TabsTrigger>
              <TabsTrigger value="basics" className="rounded-full text-xs data-[state=active]:bg-sky-600 data-[state=active]:text-white">Basics</TabsTrigger>
              <TabsTrigger value="branding" className="rounded-full text-xs data-[state=active]:bg-violet-600 data-[state=active]:text-white">Logo</TabsTrigger>
              <TabsTrigger value="template" className="rounded-full text-xs data-[state=active]:bg-amber-600 data-[state=active]:text-white">Template</TabsTrigger>
              <TabsTrigger value="fields" className="rounded-full text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">Fields</TabsTrigger>
            </TabsList>

            <TabsContent value="import" className="mt-5 space-y-4">
              <div className="rounded-[1.25rem] border border-white/70 bg-white/75 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-950">Create template from an existing document</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Upload a DOCX or HTML for the closest styling match. PDF imports are text-first.
                    </p>
                  </div>
                  <input
                    ref={importFileInputRef}
                    type="file"
                    accept=".docx,.html,.htm,.txt,.md,.pdf"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0] || null;
                      if (!file) return;
                      void importDocumentAsTemplate(file);
                      event.target.value = '';
                    }}
                  />
                  <Button
                    type="button"
                    className="rounded-full bg-slate-950 text-white hover:bg-slate-800"
                    onClick={() => importFileInputRef.current?.click()}
                    disabled={importing}
                  >
                    {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    {importing ? 'Importing...' : 'Upload document'}
                  </Button>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="flex items-center justify-between gap-3 rounded-[1.1rem] border border-white/70 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-800">
                      <span className="min-w-0">
                        <span className="block">Smart variable detection</span>
                      <span className="mt-1 block text-xs font-medium text-slate-600">
                        Turns markers like [Client Name], {'{{Amount}}'}, or blanks into fields automatically.
                      </span>
                      </span>
                    <input
                      type="checkbox"
                      checked={importAutoDetect}
                      onChange={(e) => setImportAutoDetect(e.target.checked)}
                    />
                  </label>
                  <div className="rounded-[1.1rem] border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-700">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Last import</p>
                    <p className="mt-2 truncate font-semibold text-slate-900">{importLastFileName || 'None yet'}</p>
                    <p className="mt-1 text-xs text-slate-600">{importStatus || 'Upload a file to start.'}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.25rem] border border-white/70 bg-white/75 p-4">
                <p className="text-sm font-semibold text-slate-950">What you get</p>
                <div className="mt-3 grid gap-3 text-sm text-slate-700">
                  <div className="rounded-[1.1rem] border border-white/70 bg-white/80 px-4 py-3">
                    Converted HTML you can edit freely in the Template tab.
                  </div>
                  <div className="rounded-[1.1rem] border border-white/70 bg-white/80 px-4 py-3">
                    Auto-generated fields from placeholders so your template is ready for direct data entry.
                  </div>
                  <div className="rounded-[1.1rem] border border-white/70 bg-white/80 px-4 py-3">
                    Full control: tweak CSS, add header/footer, switch page size, and enable page numbers.
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="basics" className="mt-5 space-y-4">
              <div className="rounded-[1.2rem] border border-white/70 bg-white/75 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Template name</p>
                <Input
                  value={draft.name}
                  onChange={(e) => setDraft((c) => ({ ...c, name: e.target.value }))}
                  placeholder="Untitled template"
                  className="mt-2 h-11 rounded-2xl border-white/70 bg-white/85"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[1.2rem] border border-white/70 bg-white/75 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Category</p>
                  <select
                    value={draft.category}
                    onChange={(e) => setDraft((c) => ({ ...c, category: e.target.value }))}
                    className="mt-2 h-11 w-full rounded-2xl border border-white/70 bg-white/85 px-3 text-sm font-semibold text-slate-900"
                  >
                    {CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  </div>
                  <div className="rounded-[1.2rem] border border-white/70 bg-white/75 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Description</p>
                    <Input
                      value={draft.description}
                      onChange={(e) => setDraft((c) => ({ ...c, description: e.target.value }))}
                      placeholder="Short description"
                      className="mt-2 h-11 rounded-2xl border-white/70 bg-white/85"
                    />
                  </div>
                </div>
            </TabsContent>

            <TabsContent value="branding" className="mt-5 space-y-4">
              <div className="rounded-[1.2rem] border border-white/70 bg-white/75 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">Logo</p>
                    <p className="mt-1 text-sm text-slate-600">Upload once. It gets embedded into the template.</p>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoFile} />
                  <Button type="button" variant="outline" className="rounded-full bg-white/70" onClick={() => fileInputRef.current?.click()}>
                    <ImagePlus className="mr-2 h-4 w-4" />
                    Add
                  </Button>
                </div>
                {branding.logoDataUrl ? (
                  <div className="mt-4 rounded-[1.1rem] border border-white/70 bg-white/80 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <img src={branding.logoDataUrl} alt="Logo preview" className="h-10 max-w-[220px] object-contain" />
                      <Button type="button" variant="outline" className="rounded-full bg-white/70" onClick={() => setBranding((c) => ({ ...c, logoDataUrl: '' }))}>
                        Remove
                      </Button>
                    </div>
                    <div className="mt-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Max height (px)</p>
                      <Input
                        type="number"
                        min={18}
                        max={72}
                        value={branding.logoMaxHeight}
                        onChange={(e) => setBranding((c) => ({ ...c, logoMaxHeight: Number(e.target.value || 42) }))}
                        className="mt-2 h-11 rounded-2xl border-white/70 bg-white/85"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-[1.1rem] border border-dashed border-white/70 bg-white/70 p-4 text-sm text-slate-600">
                    No logo yet.
                  </div>
                )}
              </div>

              <div className="rounded-[1.2rem] border border-white/70 bg-white/75 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-950">Header and footer</p>
                  <div className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={branding.headerEnabled}
                        onChange={(e) => setBranding((c) => ({ ...c, headerEnabled: e.target.checked }))}
                      />
                      Header
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={branding.footerEnabled}
                        onChange={(e) => setBranding((c) => ({ ...c, footerEnabled: e.target.checked }))}
                      />
                      Footer
                    </label>
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  <input ref={headerImageInputRef} type="file" accept="image/*" className="hidden" onChange={handleHeaderImageFile} />
                  <input ref={footerImageInputRef} type="file" accept="image/*" className="hidden" onChange={handleFooterImageFile} />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1.1rem] border border-white/70 bg-white/80 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-950">Header image</p>
                          <p className="mt-1 text-xs text-slate-600">Optional. Full-width image header.</p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-full bg-white/70"
                          onClick={() => headerImageInputRef.current?.click()}
                        >
                          <ImagePlus className="mr-2 h-4 w-4" />
                          Add
                        </Button>
                      </div>
                      {branding.headerImageDataUrl ? (
                        <div className="mt-3 rounded-[0.95rem] border border-white/70 bg-white/85 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <img src={branding.headerImageDataUrl} alt="Header preview" className="h-12 w-full max-w-[260px] object-contain" />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="rounded-full bg-white/70"
                              onClick={() => setBranding((c) => ({ ...c, headerImageDataUrl: '' }))}
                            >
                              Remove
                            </Button>
                          </div>
                          <div className="mt-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Max height (px)</p>
                            <Input
                              type="number"
                              min={48}
                              max={220}
                              value={branding.headerImageMaxHeight}
                              onChange={(e) => setBranding((c) => ({ ...c, headerImageMaxHeight: Number(e.target.value || 120) }))}
                              className="mt-2 h-10 rounded-2xl border-white/70 bg-white/85"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 rounded-[0.95rem] border border-dashed border-white/70 bg-white/75 p-3 text-xs text-slate-600">
                          No header image.
                        </div>
                      )}
                    </div>

                    <div className="rounded-[1.1rem] border border-white/70 bg-white/80 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-950">Footer image</p>
                          <p className="mt-1 text-xs text-slate-600">Optional. Full-width image footer.</p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-full bg-white/70"
                          onClick={() => footerImageInputRef.current?.click()}
                        >
                          <ImagePlus className="mr-2 h-4 w-4" />
                          Add
                        </Button>
                      </div>
                      {branding.footerImageDataUrl ? (
                        <div className="mt-3 rounded-[0.95rem] border border-white/70 bg-white/85 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <img src={branding.footerImageDataUrl} alt="Footer preview" className="h-12 w-full max-w-[260px] object-contain" />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="rounded-full bg-white/70"
                              onClick={() => setBranding((c) => ({ ...c, footerImageDataUrl: '' }))}
                            >
                              Remove
                            </Button>
                          </div>
                          <div className="mt-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Max height (px)</p>
                            <Input
                              type="number"
                              min={32}
                              max={220}
                              value={branding.footerImageMaxHeight}
                              onChange={(e) => setBranding((c) => ({ ...c, footerImageMaxHeight: Number(e.target.value || 90) }))}
                              className="mt-2 h-10 rounded-2xl border-white/70 bg-white/85"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 rounded-[0.95rem] border border-dashed border-white/70 bg-white/75 p-3 text-xs text-slate-600">
                          No footer image.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Brand name</p>
                      <Input
                        value={branding.brandName}
                        onChange={(e) => setBranding((c) => ({ ...c, brandName: e.target.value }))}
                        className="mt-2 h-11 rounded-2xl border-white/70 bg-white/85"
                        placeholder="Company or brand"
                      />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Subtitle</p>
                      <Input
                        value={branding.subtitle}
                        onChange={(e) => setBranding((c) => ({ ...c, subtitle: e.target.value }))}
                        className="mt-2 h-11 rounded-2xl border-white/70 bg-white/85"
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Right meta (placeholders allowed)</p>
                    <Textarea
                      value={branding.rightMeta}
                      onChange={(e) => setBranding((c) => ({ ...c, rightMeta: e.target.value }))}
                      className="mt-2 min-h-[80px] rounded-[1.1rem] border-white/70 bg-white/85 font-mono text-xs"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Footer left</p>
                      <Input
                        value={branding.footerLeft}
                        onChange={(e) => setBranding((c) => ({ ...c, footerLeft: e.target.value }))}
                        className="mt-2 h-11 rounded-2xl border-white/70 bg-white/85"
                      />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Footer right</p>
                      <Input
                        value={branding.footerRight}
                        onChange={(e) => setBranding((c) => ({ ...c, footerRight: e.target.value }))}
                        className="mt-2 h-11 rounded-2xl border-white/70 bg-white/85 font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.2rem] border border-white/70 bg-white/75 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Page</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Size</p>
                    <select
                      value={page.size}
                      onChange={(e) => {
                        const size = e.target.value as PageSize;
                        setPage((c) => {
                          if (size === 'Letter') return { ...c, size, widthMm: 215.9, heightMm: 279.4 };
                          if (size === 'Legal') return { ...c, size, widthMm: 215.9, heightMm: 355.6 };
                          if (size === 'A4') return { ...c, size, widthMm: 210, heightMm: 297 };
                          return { ...c, size };
                        });
                      }}
                      className="mt-2 h-11 w-full rounded-2xl border border-white/70 bg-white/85 px-3 text-sm font-semibold text-slate-900"
                    >
                      <option value="A4">A4</option>
                      <option value="Letter">Letter</option>
                      <option value="Legal">Legal</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Margins (mm)</p>
                    <Input
                      type="number"
                      min={0}
                      max={40}
                      value={page.marginMm}
                      onChange={(e) => setPage((c) => ({ ...c, marginMm: Number(e.target.value || 0) }))}
                      className="mt-2 h-11 rounded-2xl border-white/70 bg-white/85"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mt-1 flex items-center justify-between gap-3 rounded-[1.1rem] border border-white/70 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-800">
                      <span className="min-w-0">
                        <span className="block">Auto page numbers</span>
                        <span className="mt-1 block text-xs font-medium text-slate-600">Adds Page X of Y to the exported PDF footer (preview stays clean).</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={page.pageNumbersEnabled}
                        onChange={(e) => setPage((c) => ({ ...c, pageNumbersEnabled: e.target.checked }))}
                      />
                    </label>
                  </div>
                  {page.size === 'Custom' ? (
                    <>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Width (mm)</p>
                        <Input
                          type="number"
                          min={120}
                          max={420}
                          value={page.widthMm}
                          onChange={(e) => setPage((c) => ({ ...c, widthMm: Number(e.target.value || 210) }))}
                          className="mt-2 h-11 rounded-2xl border-white/70 bg-white/85"
                        />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Height (mm)</p>
                        <Input
                          type="number"
                          min={120}
                          max={600}
                          value={page.heightMm}
                          onChange={(e) => setPage((c) => ({ ...c, heightMm: Number(e.target.value || 297) }))}
                          className="mt-2 h-11 rounded-2xl border-white/70 bg-white/85"
                        />
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="template" className="mt-5 space-y-4">
              <div className="rounded-[1.2rem] border border-white/70 bg-white/75 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">HTML + CSS</p>
                    <p className="mt-1 text-sm text-slate-600">Paste full template HTML. Put CSS inside a <span className="font-mono text-xs">&lt;style&gt;</span> block.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 rounded-full border border-white/70 bg-white/75 px-3 py-2 text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={autoSyncFields}
                        onChange={(e) => setAutoSyncFields(e.target.checked)}
                      />
                      Auto fields
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full bg-white/70"
                      onClick={() => {
                        setLastDetected(detectedPlaceholders);
                        syncFieldsFromDetected(detectedPlaceholders);
                      }}
                      disabled={!detectedPlaceholders.length}
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Sync fields
                    </Button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                      {detectedPlaceholders.length ? `${detectedPlaceholders.length} variables found` : 'No variables found'}
                    </span>
                    {detectedPlaceholders.slice(0, 10).map((key) => (
                      <button
                        key={`det-${key}`}
                        type="button"
                        onClick={() => insertPlaceholderIntoTemplate(key)}
                        className="rounded-full border border-white/70 bg-white/75 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-white"
                        title="Insert into editor"
                      >
                        {`{{${key}}}`}
                      </button>
                    ))}
                    {detectedPlaceholders.length > 10 ? (
                      <span className="text-xs font-semibold text-slate-500">+{detectedPlaceholders.length - 10} more</span>
                    ) : null}
                  </div>

                  <Textarea
                    ref={templateEditorRef}
                    value={templateSource}
                    onChange={(e) => {
                      const next = e.target.value;
                      setTemplateSource(next);
                      syncDraftFromSource(next);
                    }}
                    placeholder={`<style>\n/* optional css */\n</style>\n\n<div class=\"tpl-body\">\n  <h1>{{title}}</h1>\n  <p>{{summary}}</p>\n</div>`}
                    className="min-h-[340px] rounded-[1.25rem] border-white/70 bg-white/85 font-mono text-xs leading-5"
                  />

                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-[1.1rem] border border-white/70 bg-white/65 px-4 py-3 text-xs text-slate-600">
                    <span>
                      Tip: variables must be in <span className="font-mono font-semibold">{'{{doubleBraces}}'}</span> format.
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-full bg-white/70"
                        onClick={() => {
                          const starter = [
                            '<style>',
                            '/* optional css */',
                            '</style>',
                            '',
                            '<div class="tpl-body">',
                            '  <h1 class="tpl-title">{{title}}</h1>',
                            '  <p class="tpl-desc">{{summary}}</p>',
                            '</div>',
                          ].join('\n');
                          setTemplateSource(starter);
                          syncDraftFromSource(starter);
                        }}
                      >
                        Insert scaffold
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-full bg-white/70"
                        onClick={() => {
                          setTemplateSource('');
                          syncDraftFromSource('');
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>

                  {lastDetected.length && detectedPlaceholders.length !== lastDetected.length ? (
                    <div className="rounded-[1.1rem] border border-amber-200 bg-amber-50/70 px-4 py-3 text-xs text-amber-900">
                      Variables changed. Click <span className="font-semibold">Sync fields</span> if you want to refresh the entry form.
                    </div>
                  ) : null}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="fields" className="mt-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-950">Fields</p>
                <Button type="button" variant="outline" className="rounded-full bg-white/70" onClick={addField}>
                  + Add
                </Button>
              </div>

              <div className="grid gap-3">
                {draft.fields.length ? draft.fields.map((field) => (
                  <div key={field.id} className="rounded-[1.2rem] border border-white/70 bg-white/75 p-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Label</p>
                        <Input
                          value={field.label}
                          onChange={(e) => {
                            const label = e.target.value;
                            setDraft((current) => ({
                              ...current,
                              fields: normalizeFieldOrders(current.fields.map((f) => f.id === field.id ? { ...f, label } : f)),
                            }));
                          }}
                          className="mt-2 h-11 rounded-2xl border-white/70 bg-white/85"
                        />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Key</p>
                        <Input
                          value={field.name}
                          onChange={(e) => {
                            const name = e.target.value;
                            setDraft((current) => ({
                              ...current,
                              fields: normalizeFieldOrders(current.fields.map((f) => f.id === field.id ? { ...f, name } : f)),
                            }));
                          }}
                          className="mt-2 h-11 rounded-2xl border-white/70 bg-white/85 font-mono text-xs"
                        />
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 sm:items-end">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Type</p>
                        <select
                          value={field.type}
                          onChange={(e) => {
                            const type = e.target.value as DocumentField['type'];
                            setDraft((current) => ({
                              ...current,
                              fields: normalizeFieldOrders(current.fields.map((f) => f.id === field.id ? { ...f, type } : f)),
                            }));
                          }}
                          className="mt-2 h-11 w-full rounded-2xl border border-white/70 bg-white/85 px-3 text-sm font-semibold text-slate-900"
                        >
                          {FIELD_TYPES.map((t) => (
                            <option key={`${field.id}-type-${t}`} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                          <input
                            type="checkbox"
                            checked={Boolean(field.required)}
                            onChange={(e) => {
                              const required = e.target.checked;
                              setDraft((current) => ({
                                ...current,
                                fields: normalizeFieldOrders(current.fields.map((f) => f.id === field.id ? { ...f, required } : f)),
                              }));
                            }}
                          />
                          Required
                        </label>
                        <div className="flex items-center gap-2">
                          <Button type="button" size="sm" variant="outline" className="rounded-full bg-white/70" onClick={() => insertPlaceholderIntoTemplate(field.name)}>
                            Insert
                          </Button>
                          <Button type="button" size="sm" variant="outline" className="rounded-full bg-white/70" onClick={() => removeField(field.id)}>
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-[1.2rem] border border-dashed border-white/70 bg-white/70 p-4 text-sm text-slate-600">
                    Blank template. Add fields to start.
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {error ? (
            <div className="mt-4 rounded-[1.1rem] border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm text-rose-800">
              {error}
            </div>
          ) : null}
        </div>

        <div className="min-w-0 overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.14),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.12),transparent_42%)] p-4 sm:p-6">
          <div className="h-full overflow-hidden rounded-[1.5rem] border border-white/70 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.10)]">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200/70 bg-white/70 px-4 py-3 backdrop-blur-2xl">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-[-0.02em] text-slate-950">Live preview</p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="rounded-full bg-white/70"
                onClick={() => setPreviewFullscreenOpen(true)}
              >
                <Maximize2 className="mr-2 h-4 w-4" />
                Full screen
              </Button>
            </div>
            <iframe title="Template preview" srcDoc={previewHtml} className="h-full w-full bg-white" />
          </div>
        </div>
      </div>

      <Dialog open={previewFullscreenOpen} onOpenChange={setPreviewFullscreenOpen}>
        <DialogContent className="flex h-[calc(100vh-1rem)] w-[calc(100vw-1rem)] max-w-none flex-col overflow-hidden rounded-[1.25rem] border border-white/70 bg-white/92 p-0 shadow-[0_36px_120px_rgba(15,23,42,0.18)] backdrop-blur-2xl sm:rounded-[1.9rem]">
          <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-white/60 bg-white/70 px-4 backdrop-blur-2xl sm:px-6">
            <p className="truncate text-sm font-semibold tracking-[-0.02em] text-slate-950">Template preview</p>
            <Button type="button" variant="outline" className="rounded-full bg-white/70" onClick={() => setPreviewFullscreenOpen(false)}>
              Close
            </Button>
          </div>
          <div className="flex-1 bg-slate-100 p-3 min-h-0">
            <iframe title="Template preview fullscreen" srcDoc={previewHtml} className="h-full w-full rounded-xl border bg-white" />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
