import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { documentTemplates } from '@/data/templates';
import { createAccessEvent, getHistoryEntries, updateHistoryEntry } from '@/lib/server/history';
import { renderDocumentTemplate } from '@/lib/template';
import { getSignatureSettings } from '@/lib/server/settings';
import { customTemplatesPath, readJsonFile } from '@/lib/server/storage';
import { getDeviceLabel, getRequestIp, getRequestUserAgent } from '@/lib/server/public-documents';
import { DocumentTemplate } from '@/types/document';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
    const html = renderDocumentTemplate(template, entry.data || {}, {
      referenceNumber: entry.referenceNumber,
      generatedAt: entry.generatedAt,
      generatedBy: entry.generatedBy,
      signature,
      recipientSignature,
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
