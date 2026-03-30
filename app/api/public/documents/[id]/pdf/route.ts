import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer';
import { documentTemplates } from '@/data/templates';
import { createAccessEvent, getHistoryEntries, updateHistoryEntry } from '@/lib/server/history';
import { type DocumentDesignPreset, isDocumentDesignPreset } from '@/lib/document-designs';
import { renderDocumentTemplate } from '@/lib/template';
import { getSignatureSettings } from '@/lib/server/settings';
import { customTemplatesPath, readJsonFile } from '@/lib/server/storage';
import { getDeviceLabel, getRequestIp, getRequestUserAgent } from '@/lib/server/public-documents';
import { DocumentTemplate } from '@/types/document';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getShareAccessError(entry: Awaited<ReturnType<typeof getHistoryEntries>>[number]) {
  if (entry.revokedAt) return 'This shared link has been revoked.';
  if (entry.shareExpiresAt && new Date(entry.shareExpiresAt).getTime() < Date.now()) return 'This shared link has expired.';
  const totalAccesses = (entry.openCount || 0) + (entry.downloadCount || 0);
  if (entry.shareAccessPolicy === 'one_time' && totalAccesses >= 1) return 'This one-time link has already been used.';
  if (entry.maxAccessCount && totalAccesses >= entry.maxAccessCount) return 'This shared link has reached its allowed access limit.';
  return null;
}

async function getEmbeddedBrandLogoSrc() {
  const logoPath = path.join(process.cwd(), 'public', 'corescent-logo.png');
  const logoBuffer = await fs.readFile(logoPath);
  return `data:image/png;base64,${logoBuffer.toString('base64')}`;
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const password = request.nextUrl.searchParams.get('password')?.trim().toUpperCase();
    if (!password) {
      return NextResponse.json({ error: 'Document password is required' }, { status: 400 });
    }

    const history = await getHistoryEntries();
    const entry = history.find((item) => item.shareId === params.id || item.id === params.id);
    if (!entry) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    if (entry.sharePassword !== password) {
      return NextResponse.json({ error: 'Invalid document password' }, { status: 403 });
    }
    const accessError = getShareAccessError(entry);
    if (accessError) {
      return NextResponse.json({ error: accessError }, { status: 410 });
    }

    const customTemplates = await readJsonFile<DocumentTemplate[]>(customTemplatesPath, []);
    const template = [...documentTemplates, ...customTemplates].find((item) => item.id === entry.templateId);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const signatureSettings = await getSignatureSettings();
    const signature = signatureSettings.signatures.find((item) => item.id === entry.signatureId) || null;
    const recipientSignature = entry.recipientSignatureDataUrl
      ? {
          signerName: entry.recipientSignerName || 'Recipient',
          signatureDataUrl: entry.recipientSignatureDataUrl,
          signedAt: entry.recipientSignedAt,
          signedIp: entry.recipientSignedIp,
        }
      : null;
    const brandLogoSrc = await getEmbeddedBrandLogoSrc();
    const html = renderDocumentTemplate(template, entry.data || {}, {
      referenceNumber: entry.referenceNumber,
      generatedAt: entry.generatedAt,
      generatedBy: entry.generatedBy,
      signature,
      brandLogoSrc,
      designPreset: isDocumentDesignPreset(entry.editorState?.designPreset as DocumentDesignPreset) ? entry.editorState?.designPreset : undefined,
      recipientSignature,
      watermarkLabel: entry.editorState?.watermarkLabel,
      letterheadMode: entry.editorState?.letterheadMode,
      letterheadImageDataUrl: entry.editorState?.letterheadImageDataUrl,
      letterheadHtml: entry.editorState?.letterheadHtml,
    });

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '14mm',
          right: '10mm',
          bottom: '14mm',
          left: '10mm',
        },
      });

      await updateHistoryEntry(entry.id, (current) => ({
        ...current,
        downloadCount: (current.downloadCount || 0) + 1,
        lastDownloadedAt: new Date().toISOString(),
        accessEvents: [
          createAccessEvent({
            eventType: 'download',
            createdAt: new Date().toISOString(),
            ip: getRequestIp(request),
            userAgent: getRequestUserAgent(request),
            deviceLabel: getDeviceLabel(getRequestUserAgent(request)),
          }),
          ...(current.accessEvents || []),
        ].slice(0, 50),
        automationNotes: [...(current.automationNotes || []), 'Recipient PDF downloaded'],
      }));

      return new NextResponse(Buffer.from(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename=${template.name.replace(/\s+/g, '_')}.pdf`,
        },
      });
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
