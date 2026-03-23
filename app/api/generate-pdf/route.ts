import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function POST(request: NextRequest) {
  try {
    const { template, data }: { template: string; data: Record<string, string> } = await request.json();

    // Replace placeholders in template
    let html = template;
    for (const [key, value] of Object.entries(data)) {
      html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    // Launch puppeteer
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html);
    const pdfBuffer = await page.pdf({ format: 'A4' });
    await browser.close();

    // Return PDF
    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=document.pdf',
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}