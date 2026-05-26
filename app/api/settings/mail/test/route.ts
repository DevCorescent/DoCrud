import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getAuthSession } from '@/lib/server/auth';
import { appendEmailOutboxEvent, createOutboundEmailId } from '@/lib/server/email-outbox';
import { isValidEmail } from '@/lib/server/security';
import { getMailSettings } from '@/lib/server/settings';
import { buildEmailChrome, escapeHtmlLite } from '@/lib/server/email-chrome';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { testRecipient } = await request.json() as { testRecipient?: string };
    const settings = await getMailSettings();
    if (!settings.host || !settings.fromEmail) {
      return NextResponse.json({ error: 'SMTP settings are incomplete' }, { status: 400 });
    }

    console.log(`[mail/test] config — host=${settings.host} port=${settings.port} secure=${settings.secure} requireAuth=${settings.requireAuth} from=${settings.fromEmail} user=${settings.username}`);

    const transporter = nodemailer.createTransport({
      host: settings.host,
      port: Number(settings.port),
      secure: settings.secure,
      auth: settings.requireAuth
        ? {
            user: settings.username,
            pass: settings.password,
          }
        : undefined,
      tls: { rejectUnauthorized: false },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    } as Parameters<typeof nodemailer.createTransport>[0]);

    console.log('[mail/test] verifying connection...');
    await transporter.verify();
    console.log('[mail/test] verify ok');

    if (testRecipient) {
      if (!isValidEmail(testRecipient)) {
        return NextResponse.json({ error: 'Valid test recipient required' }, { status: 400 });
      }

      console.log(`[mail/test] sending test mail to ${testRecipient}`);
      await transporter.sendMail({
        from: `"${settings.fromName}" <${settings.fromEmail}>`,
        to: testRecipient,
        subject: 'Docrud SMTP Test',
        text: 'This is a successful SMTP connectivity test from Docrud.',
        html: buildEmailChrome({
          origin: request.nextUrl.origin,
          subject: 'Docrud SMTP Test',
          bodyHtml: `<div style="font-size:14px; color:#0f172a;">${escapeHtmlLite('This is a successful SMTP connectivity test from Docrud.')}</div>`,
        }),
      });
      console.log(`[mail/test] sent ok to ${testRecipient}`);
    }

    try {
      const id = createOutboundEmailId('test');
      await appendEmailOutboxEvent({
        id,
        createdAt: new Date().toISOString(),
        status: 'tested',
        type: 'test',
        to: testRecipient || '(verify only)',
        subject: testRecipient ? 'SMTP Test Email' : 'SMTP Verify',
        sentAt: new Date().toISOString(),
        sentBy: session.user.email || 'admin',
        tracking: { opens: 0, clicks: 0 },
      });
    } catch {
      // ignore logging errors
    }

    return NextResponse.json({ message: testRecipient ? 'SMTP test mail sent successfully' : 'SMTP connection verified successfully' });
  } catch (error) {
    const e = error as NodeJS.ErrnoException & { code?: string; command?: string; response?: string; responseCode?: number };
    console.error(`[mail/test] FAILED — code=${e.code} command=${e.command} responseCode=${e.responseCode} response="${e.response}" message="${e.message}"`);
    const msg = error instanceof Error ? error.message : 'SMTP test failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
