import nodemailer from 'nodemailer';
import type { OutboundEmailEvent } from '@/lib/server/email-outbox';
import {
  appendEmailOutboxEvent,
  buildTrackingPixel,
  createOutboundEmailId,
  rewriteLinksForTracking,
  updateEmailOutboxEvent,
} from '@/lib/server/email-outbox';
import { isValidEmail } from '@/lib/server/security';
import { getMailSettings } from '@/lib/server/settings';
import { getMailPolicies, type MailPolicyKey } from '@/lib/server/mail-policies';
import { buildEmailChrome, escapeHtmlLite } from '@/lib/server/email-chrome';

type SendTrackedMailInput = {
  policyKey: MailPolicyKey;
  typeLabel: OutboundEmailEvent['type'];
  to: string;
  subject: string;
  text: string;
  html?: string;
  preheader?: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  sentBy?: string;
  metadata?: Record<string, string>;
  attachment?: { filename: string; content: Buffer; contentType?: string };
  origin: string;
};

export async function sendTrackedMail(input: SendTrackedMailInput) {
  const to = String(input.to || '').trim();
  const subject = String(input.subject || '').trim();
  const text = String(input.text || '').trim();
  if (!isValidEmail(to) || !subject || !text) {
    throw new Error('Recipient email, subject, and message are required.');
  }

  const policies = await getMailPolicies();
  if (!policies[input.policyKey]) {
    console.log(`[mailer] policy "${input.policyKey}" disabled — skipping mail to ${to}`);
    const outboxId = createOutboundEmailId('skip');
    await appendEmailOutboxEvent({
      id: outboxId,
      createdAt: new Date().toISOString(),
      status: 'failed',
      type: input.typeLabel,
      to,
      cc: input.cc,
      bcc: input.bcc,
      subject,
      sentBy: input.sentBy || 'system',
      error: `Mail disabled by admin policy (${input.policyKey}).`,
      tracking: { opens: 0, clicks: 0 },
      metadata: input.metadata,
    });
    return { skipped: true, messageId: undefined, outboxId };
  }

  const smtp = await getMailSettings();
  console.log(`[mailer] smtp config — host=${smtp.host} port=${smtp.port} secure=${smtp.secure} requireAuth=${smtp.requireAuth} from=${smtp.fromEmail} user=${smtp.username}`);

  if (!smtp.host || !smtp.fromEmail) {
    console.error('[mailer] mail not configured — host or fromEmail missing');
    throw new Error('Mail settings are not configured.');
  }

  const outboxId = createOutboundEmailId('mail');
  await appendEmailOutboxEvent({
    id: outboxId,
    createdAt: new Date().toISOString(),
    status: 'queued',
    type: input.typeLabel,
    to,
    cc: input.cc,
    bcc: input.bcc,
    subject,
    sentBy: input.sentBy || 'system',
    tracking: { opens: 0, clicks: 0 },
    metadata: input.metadata,
  });

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: Number(smtp.port) || 465,
    secure: Boolean(smtp.secure),
    auth: smtp.requireAuth ? { user: smtp.username, pass: smtp.password } : undefined,
    tls: { rejectUnauthorized: false },
  });

  console.log(`[mailer] sending "${subject}" → ${to} (outboxId=${outboxId})`);

  const trackedText = rewriteLinksForTracking(input.origin, outboxId, text);
  const baseBody = (input.html && input.html.trim())
    ? input.html.trim()
    : `<div style="font-size: 14px; white-space: pre-wrap;">${escapeHtmlLite(trackedText)}</div>`;
  const htmlBody = buildEmailChrome({
    origin: input.origin,
    subject,
    preheader: input.preheader,
    bodyHtml: baseBody,
  });

  try {
    const info = await transporter.sendMail({
      from: `"${smtp.fromName}" <${smtp.fromEmail}>`,
      to,
      cc: input.cc?.length ? input.cc.join(',') : undefined,
      bcc: input.bcc?.length ? input.bcc.join(',') : undefined,
      replyTo: input.replyTo || smtp.replyTo || undefined,
      subject,
      text: trackedText,
      html: `${htmlBody}\n${buildTrackingPixel(input.origin, outboxId)}`,
      attachments: input.attachment
        ? [{ filename: input.attachment.filename, content: input.attachment.content, contentType: input.attachment.contentType }]
        : undefined,
    });

    console.log(`[mailer] sent ok — messageId=${info.messageId}`);
    await updateEmailOutboxEvent(outboxId, (ev) => ({
      ...ev,
      status: 'sent',
      messageId: info.messageId,
      sentAt: new Date().toISOString(),
      sentBy: input.sentBy || ev.sentBy,
    }));

    return { skipped: false, messageId: info.messageId, outboxId };
  } catch (err) {
    const e = err as NodeJS.ErrnoException & { code?: string; command?: string; response?: string; responseCode?: number };
    console.error(`[mailer] sendMail FAILED — code=${e.code} command=${e.command} responseCode=${e.responseCode} response="${e.response}" message="${e.message}"`);
    await updateEmailOutboxEvent(outboxId, (ev) => ({
      ...ev,
      status: 'failed',
      error: err instanceof Error ? err.message : 'Mail send failed',
    }));
    throw err;
  }
}
