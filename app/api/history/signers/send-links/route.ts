import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import { getAuthSession } from '@/lib/server/auth';
import { createAccessEvent, getHistoryEntries, updateHistoryEntry } from '@/lib/server/history';
import { getMailSettings } from '@/lib/server/settings';
import { buildEmailChrome } from '@/lib/server/email-chrome';
import { isValidEmail } from '@/lib/server/security';
import { getDeviceLabel, getRequestIp, getRequestUserAgent } from '@/lib/server/public-documents';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function generateSigningToken() {
  return crypto.randomBytes(24).toString('base64url');
}

function isExpired(expiresAt?: string) {
  if (!expiresAt) return true;
  const t = new Date(expiresAt).getTime();
  return Number.isNaN(t) || t < Date.now();
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await request.json() as { historyId?: string; signerKey?: string };
    const historyId = String(payload.historyId || '').trim();
    if (!historyId) return NextResponse.json({ error: 'History ID is required' }, { status: 400 });

    const history = await getHistoryEntries();
    const entry = history.find((h) => h.id === historyId);
    if (!entry) return NextResponse.json({ error: 'History entry not found' }, { status: 404 });

    const allowed = session.user.role === 'admin'
      || entry.generatedBy === session.user.email
      || ((session.user.role === 'client' || session.user.role === 'individual') && entry.organizationId === session.user.id)
      || (session.user.role === 'employee' && entry.employeeEmail?.toLowerCase() === (session.user.email || '').toLowerCase());
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    if (entry.documentSourceType !== 'uploaded_pdf') {
      return NextResponse.json({ error: 'Multi-signer send links currently supports uploaded PDF signing.' }, { status: 400 });
    }

    const placements = entry.recipientSignaturePlacements;
    if (!placements || (placements as any).mode !== 'boxes' || !Array.isArray((placements as any).boxes) || !(placements as any).boxes.length) {
      return NextResponse.json({ error: 'Place signature boxes first before sending signing links.' }, { status: 400 });
    }
    const boxes = (placements as any).boxes as any[];
    const requiredBoxes = boxes.filter((b) => (b as any)?.required !== false);
    const missingAssignee = requiredBoxes.filter((b) => !String((b as any)?.signerKey || '').trim()).map((b) => String((b as any)?.id || ''));
    if (missingAssignee.length) {
      return NextResponse.json({ error: 'Assign a signer for every required signature box before sending.' }, { status: 400 });
    }

    const signerDirectory = entry.recipientSignerDirectory || {};
    const signerKeysWithRequiredBoxes = Array.from(new Set(requiredBoxes.map((b) => String((b as any)?.signerKey || 'recipient').trim() || 'recipient')));
    const targetKeys = payload.signerKey
      ? [String(payload.signerKey).slice(0, 64)]
      : signerKeysWithRequiredBoxes;

    if (!targetKeys.length) {
      return NextResponse.json({ error: 'No required signer assignments found.' }, { status: 400 });
    }

    for (const key of targetKeys) {
      const info = signerDirectory[key];
      const toEmail = String(info?.signerEmail || '').trim().toLowerCase();
      if (!isValidEmail(toEmail)) {
        return NextResponse.json({ error: `Signer email missing/invalid for signer key "${key}".` }, { status: 400 });
      }
    }
    const smtp = await getMailSettings();
    if (!smtp.host || !smtp.fromEmail) {
      return NextResponse.json({ error: 'Email is not configured for this workspace.' }, { status: 409 });
    }

    const origin = request.nextUrl.origin;
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: Number(smtp.port),
      secure: smtp.secure,
      auth: smtp.requireAuth ? { user: smtp.username, pass: smtp.password } : undefined,
    });

    const nowIso = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const results: Array<{ signerKey: string; toEmail: string; status: 'sent' | 'skipped' | 'failed'; error?: string }> = [];

    const updated = await updateHistoryEntry(entry.id, (current) => {
      const invites = { ...(current.recipientSignerInvitesByKey || {}) } as Record<string, any>;
      for (const key of targetKeys) {
        const info = signerDirectory[key];
        const toEmail = String(info?.signerEmail || '').trim().toLowerCase();
        const toName = String(info?.signerName || 'Signer').trim();
        const toRole = String(info?.signerRole || '').trim();
        if (!isValidEmail(toEmail)) continue;
        const existing = invites[key];
        if (existing?.token && !isExpired(existing.expiresAt)) {
          invites[key] = {
            ...existing,
            lastSentAt: nowIso,
            signerEmail: String(existing.signerEmail || toEmail).trim().toLowerCase(),
            signerName: String(existing.signerName || toName).trim(),
            signerRole: String(existing.signerRole || toRole).trim(),
            sendCount: Math.max(0, Number(existing.sendCount || 0)),
          };
          continue;
        }
        invites[key] = {
          token: generateSigningToken(),
          createdAt: nowIso,
          expiresAt,
          sentAt: existing?.sentAt || undefined,
          lastSentAt: nowIso,
          signerEmail: toEmail,
          signerName: toName,
          signerRole: toRole,
          sendCount: Math.max(0, Number(existing?.sendCount || 0)),
          lastReminderAt: existing?.lastReminderAt || undefined,
          reminderCount: Math.max(0, Number(existing?.reminderCount || 0)),
        };
      }
      return {
        ...current,
        recipientSignerInvitesByKey: invites,
      };
    });

    if (!updated) return NextResponse.json({ error: 'Failed to update history entry' }, { status: 500 });

    for (const key of targetKeys) {
      const info = signerDirectory[key];
      const toEmail = String(info?.signerEmail || '').trim().toLowerCase();
      const toName = String(info?.signerName || 'Signer').trim();
      const role = String(info?.signerRole || '').trim();
      if (!isValidEmail(toEmail)) {
        results.push({ signerKey: key, toEmail, status: 'skipped', error: 'Invalid email' });
        continue;
      }
      const invite = updated.recipientSignerInvitesByKey?.[key];
      if (!invite?.token) {
        results.push({ signerKey: key, toEmail, status: 'failed', error: 'Missing signing token' });
        continue;
      }
      const signingLink = `${origin}/documents/${encodeURIComponent(entry.shareId || entry.id)}?token=${encodeURIComponent(invite.token)}`;
      const subject = `${entry.templateName || 'Document'} — Signature Requested`;
      const preheader = `Action required: complete your assigned signing fields for ${entry.templateName || 'this document'}.`;

      const bodyHtml = `
        <div style="padding: 4px 0 18px 0;">
          <div style="font-size:12px; letter-spacing:0.18em; text-transform:uppercase; color:#64748b; font-weight:700;">DocRud • Secure Signing</div>
          <h1 style="margin:10px 0 0 0; font-size:20px; line-height:1.2; color:#0f172a;">Signature requested</h1>
          <p style="margin:10px 0 0 0; color:#334155; font-size:14px; line-height:1.6;">
            Hi ${toName}${role ? ` (${role})` : ''}, you’ve been assigned signing fields in <strong>${entry.templateName || 'a document'}</strong>.
          </p>
          <div style="margin:16px 0 0 0; padding:14px; border:1px solid rgba(15,23,42,0.12); border-radius:16px; background:#f8fafc;">
            <div style="font-size:12px; color:#475569; font-weight:700; letter-spacing:0.14em; text-transform:uppercase;">Execution Record</div>
            <div style="margin-top:6px; font-size:13px; color:#0f172a; word-break:break-word;">${entry.shareId || entry.id}</div>
            <div style="margin-top:10px; font-size:12px; color:#475569;">This secure link expires on <strong>${new Date(invite.expiresAt).toLocaleString()}</strong>.</div>
          </div>
          <div style="margin:18px 0 0 0;">
            <a href="${signingLink}" style="display:inline-block; background:#0f172a; color:white; text-decoration:none; padding:12px 16px; border-radius:999px; font-weight:700; font-size:14px;">Review & Sign</a>
          </div>
          <p style="margin:14px 0 0 0; color:#64748b; font-size:12px; line-height:1.6;">
            If the button doesn’t work, copy and paste this link into your browser:<br/>
            <span style="word-break:break-all; color:#0f172a;">${signingLink}</span>
          </p>
        </div>
      `;

      try {
        const html = buildEmailChrome({ origin, subject, preheader, bodyHtml });
        await transporter.sendMail({
          from: `"${smtp.fromName}" <${smtp.fromEmail}>`,
          to: toEmail,
          replyTo: smtp.replyTo || undefined,
          subject,
          text: `Signature requested for ${entry.templateName || 'document'}.\n\nOpen: ${signingLink}\nExpires: ${invite.expiresAt}`,
          html,
        });
        results.push({ signerKey: key, toEmail, status: 'sent' });
      } catch (error) {
        results.push({ signerKey: key, toEmail, status: 'failed', error: error instanceof Error ? error.message : 'Failed' });
      }
    }

    await updateHistoryEntry(entry.id, (current) => ({
      ...current,
      accessEvents: [
        createAccessEvent({
          eventType: 'email',
          createdAt: new Date().toISOString(),
          ip: getRequestIp(request),
          userAgent: getRequestUserAgent(request),
          deviceLabel: getDeviceLabel(getRequestUserAgent(request)),
          actorName: `${session.user.email || 'sender'} (signing links)`,
        }),
        ...(current.accessEvents || []),
      ].slice(0, 50),
      automationNotes: [...(current.automationNotes || []), 'Signing links sent to recipients'],
    }));

    return NextResponse.json({ ok: true, results });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to send signing links' }, { status: 500 });
  }
}
