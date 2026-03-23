import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getAuthSession } from '@/lib/server/auth';
import { createEmailLogEntry, updateHistoryEntry } from '@/lib/server/history';
import { isValidEmail } from '@/lib/server/security';
import { getAutomationSettings, getMailSettings } from '@/lib/server/settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let historyId: string | undefined;
  let to = '';
  let subject = '';
  let sessionUserEmail = 'unknown';

  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    sessionUserEmail = session.user.email || 'unknown';

    const {
      historyId: nextHistoryId,
      to: nextTo,
      subject: nextSubject,
      text,
      attachment,
    }: {
      historyId?: string;
      to: string;
      subject: string;
      text: string;
      attachment?: number[];
    } = await request.json();
    historyId = nextHistoryId;
    to = nextTo;
    subject = nextSubject;

    if (!isValidEmail(to) || !subject?.trim() || !text?.trim()) {
      return NextResponse.json({ error: 'Recipient email, subject, and message are required' }, { status: 400 });
    }

    const settings = await getMailSettings();
    if (!settings.host || !settings.fromEmail) {
      return NextResponse.json({ error: 'Mail settings are not configured' }, { status: 500 });
    }

    const automations = await getAutomationSettings();
    const ccList = automations.autoCcGenerator && session.user.email ? [session.user.email] : [];
    const bccList = automations.autoBccAuditMailbox && settings.fromEmail && automations.auditMailbox ? [automations.auditMailbox] : [];

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
    });

    const info = await transporter.sendMail({
      from: `"${settings.fromName}" <${settings.fromEmail}>`,
      to,
      cc: ccList.length > 0 ? ccList.join(',') : undefined,
      bcc: bccList.length > 0 ? bccList.join(',') : undefined,
      replyTo: settings.replyTo || undefined,
      subject,
      text,
      attachments: attachment
        ? [
            {
              filename: 'document.pdf',
              content: Buffer.from(attachment),
            },
          ]
        : undefined,
    });

    if (historyId) {
      await updateHistoryEntry(historyId, (entry) => {
        const deliveryEvent = createEmailLogEntry({
          to,
          subject,
          status: 'sent',
          sentAt: new Date().toISOString(),
          sentBy: sessionUserEmail,
        });

        return {
          ...entry,
          emailSent: true,
          emailTo: to,
          emailSubject: subject,
          emailSentAt: deliveryEvent.sentAt,
          emailStatus: 'sent',
          deliveryHistory: [...(entry.deliveryHistory || []), deliveryEvent],
          automationNotes: [
            ...(entry.automationNotes || []),
            ...(ccList.length > 0 ? ['Generator copied on email'] : []),
            ...(bccList.length > 0 ? [`Audit mailbox notified: ${automations.auditMailbox}`] : []),
          ],
        };
      });
    }

    return NextResponse.json({ message: 'Email sent successfully', messageId: info.messageId });
  } catch (error) {
    console.error(error);
    if (historyId) {
      await updateHistoryEntry(historyId, (entry) => {
        const failureEvent = createEmailLogEntry({
          to,
          subject,
          status: 'failed',
          sentAt: new Date().toISOString(),
          sentBy: sessionUserEmail,
          error: error instanceof Error ? error.message : 'Unknown delivery failure',
        });

        return {
          ...entry,
          emailSent: false,
          emailTo: to || entry.emailTo,
          emailSubject: subject || entry.emailSubject,
          emailStatus: 'failed',
          emailError: failureEvent.error,
          deliveryHistory: [...(entry.deliveryHistory || []), failureEvent],
        };
      });
    }
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
