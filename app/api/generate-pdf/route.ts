import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer';
import { getAuthSession } from '@/lib/server/auth';
import { type DocumentDesignPreset, isDocumentDesignPreset } from '@/lib/document-designs';
import { getSignatureSettings } from '@/lib/server/settings';
import { renderDocumentTemplate } from '@/lib/template';
import { DocumentTemplate, SignatureRecord } from '@/types/document';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getEmbeddedBrandLogoSrc() {
  const logoPath = path.join(process.cwd(), 'public', 'corescent-logo.png');
  const logoBuffer = await fs.readFile(logoPath);
  return `data:image/png;base64,${logoBuffer.toString('base64')}`;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      template,
      data,
      referenceNumber,
      generatedAt,
      generatedBy,
      signatureId,
      watermarkLabel,
      letterheadMode,
      letterheadImageDataUrl,
      letterheadHtml,
      designPreset,
    }: {
      template: DocumentTemplate;
      data: Record<string, string>;
      referenceNumber?: string;
      generatedAt?: string;
      generatedBy?: string;
      signatureId?: string;
      watermarkLabel?: string;
      letterheadMode?: 'default' | 'image' | 'html';
      letterheadImageDataUrl?: string;
      letterheadHtml?: string;
      designPreset?: DocumentDesignPreset;
    } = await request.json();

    if (!template?.name || !Array.isArray(template.fields)) {
      return NextResponse.json({ error: 'A valid template is required' }, { status: 400 });
    }
    const signatureSettings = await getSignatureSettings();
    const signature: SignatureRecord | undefined = signatureSettings.signatures.find((item) => item.id === signatureId);
    if (!signature) {
      return NextResponse.json({ error: 'Please select an authorized admin signature' }, { status: 400 });
    }
    const brandLogoSrc = await getEmbeddedBrandLogoSrc();

    const html = renderDocumentTemplate(template, data || {}, {
      referenceNumber,
      generatedAt,
      generatedBy: generatedBy || session.user.email || 'docrud workflow',
      signature,
      brandLogoSrc,
      designPreset: isDocumentDesignPreset(designPreset) ? designPreset : undefined,
      watermarkLabel,
      letterheadMode,
      letterheadImageDataUrl,
      letterheadHtml,
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
