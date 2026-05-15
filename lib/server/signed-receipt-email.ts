import type { DocumentHistory } from '@/types/document';
import { escapeHtmlLite } from '@/lib/server/email-chrome';

function stripHtml(value: string) {
  return String(value || '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatLocalDate(iso?: string) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString();
}

function buildPublicLink(origin: string, entry: Pick<DocumentHistory, 'shareId' | 'shareUrl' | 'id'>) {
  const base = String(origin || '').trim().replace(/\/$/, '');
  if (entry.shareUrl) {
    if (entry.shareUrl.startsWith('http')) return entry.shareUrl;
    return `${base}${entry.shareUrl.startsWith('/') ? '' : '/'}${entry.shareUrl}`;
  }
  if (entry.shareId) return `${base}/documents/${entry.shareId}`;
  if (entry.id) return `${base}/documents/${entry.id}`;
  return base;
}

function buildPolicyLabel(entry: Pick<DocumentHistory, 'shareAccessPolicy' | 'shareExpiresAt' | 'maxAccessCount'>) {
  if (entry.shareAccessPolicy === 'expiring') {
    return entry.shareExpiresAt ? `Expiring (expires ${formatLocalDate(entry.shareExpiresAt)})` : 'Expiring';
  }
  if (entry.shareAccessPolicy === 'one_time') {
    return `One-time (${Math.max(1, Number(entry.maxAccessCount || 1))} max)`;
  }
  return 'Standard';
}

export function buildSignedReceiptEmail(input: {
  origin: string;
  entry: DocumentHistory;
  recipientType: 'signer' | 'sender';
  signerEmail?: string;
  senderEmail?: string;
  senderNote?: string;
}) {
  const origin = String(input.origin || '').trim().replace(/\/$/, '');
  const entry = input.entry;
  const publicLink = buildPublicLink(origin, entry);
  const signerName = entry.recipientSignerName || 'Signer';
  const signedAt = entry.recipientSignedAt ? formatLocalDate(entry.recipientSignedAt) : '';
  const signedIp = entry.recipientSignedIp || '';
  const policyLabel = buildPolicyLabel(entry);
  const docLabel = entry.documentSourceType === 'uploaded_pdf'
    ? (entry.uploadedPdfFileName || entry.templateName || 'Uploaded PDF')
    : (entry.templateName || 'Document');

  const title = input.recipientType === 'signer' ? 'Signing receipt' : 'Document signed: receipt';
  const preheader = entry.referenceNumber
    ? `${docLabel} (${entry.referenceNumber}) signed by ${signerName}.`
    : `${docLabel} signed by ${signerName}.`;

  const senderNoteText = stripHtml(input.senderNote || '');

  const termsLinks = [
    { label: 'Terms', url: `${origin}/terms-and-conditions` },
    { label: 'Privacy', url: `${origin}/privacy-policy` },
    { label: 'Signed document policy', url: `${origin}/signed-document-policy` },
  ];

  const detailsRows = [
    { label: 'Document', value: docLabel },
    ...(entry.referenceNumber ? [{ label: 'Reference', value: entry.referenceNumber }] : []),
    ...(entry.generatedAt ? [{ label: 'Generated', value: formatLocalDate(entry.generatedAt) }] : []),
    { label: 'Signed by', value: signerName },
    ...(input.signerEmail ? [{ label: 'Signer email', value: input.signerEmail }] : []),
    ...(signedAt ? [{ label: 'Signed at', value: signedAt }] : []),
    ...(signedIp ? [{ label: 'Signer IP', value: signedIp }] : []),
    ...(entry.recipientSignedLocationLabel ? [{ label: 'Signer location', value: entry.recipientSignedLocationLabel }] : []),
    ...(entry.recipientAadhaarMaskedId ? [{ label: 'Aadhaar', value: entry.recipientAadhaarMaskedId }] : []),
    { label: 'Execution record', value: entry.shareId || entry.id },
    { label: 'Link policy', value: policyLabel },
  ];

  const messageLead = input.recipientType === 'signer'
    ? 'Thanks for signing. Your receipt is below and the signed PDF is attached for your records.'
    : 'This document has been signed. Receipt details are below and the signed PDF is attached.';

  const html = `
    <div style="padding: 14px 14px 0;">
      ${senderNoteText ? `
        <div style="border:1px solid rgba(15,23,42,.10); background: rgba(148,163,184,.14); border-radius: 16px; padding: 14px 14px; margin-bottom: 14px;">
          <div style="font-size:12px; letter-spacing:.14em; text-transform:uppercase; font-weight:800; color: rgba(15,23,42,.60);">Note</div>
          <div style="margin-top:10px; font-size:14px; color:#0f172a;">${escapeHtmlLite(senderNoteText)}</div>
        </div>
      ` : ''}

      <div style="border:1px solid rgba(15,23,42,.10); border-radius: 18px; padding: 16px 16px; background:#ffffff;">
        <div style="font-size:12px; letter-spacing:.14em; text-transform:uppercase; font-weight:900; color: rgba(15,23,42,.55);">${escapeHtmlLite(title)}</div>
        <div style="margin-top:6px; font-size:18px; font-weight:900; letter-spacing:-.02em; color:#0f172a;">${escapeHtmlLite(docLabel)}</div>
        ${entry.referenceNumber ? `<div style="margin-top:4px; font-size:13px; color: rgba(15,23,42,.65);">Reference: <strong style="color:#0f172a;">${escapeHtmlLite(entry.referenceNumber)}</strong></div>` : ''}
        <div style="margin-top: 10px; font-size: 14px; color:#0f172a;">${escapeHtmlLite(messageLead)}</div>
        <div style="margin-top: 14px;">
          <a href="${escapeHtmlLite(publicLink)}" style="display:inline-block; text-decoration:none; background:#0f172a; color:#ffffff; padding: 12px 16px; border-radius: 999px; font-weight:800; font-size:14px;">
            Open execution record
          </a>
        </div>
      </div>

      <div style="margin-top: 14px; border:1px solid rgba(15,23,42,.10); border-radius: 18px; padding: 16px 16px; background:#ffffff;">
        <div style="font-size:12px; letter-spacing:.14em; text-transform:uppercase; font-weight:900; color: rgba(15,23,42,.55);">Receipt details</div>
        <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse: collapse; width:100%; margin-top:10px;">
          ${detailsRows.map((row) => `
            <tr>
              <td style="padding: 8px 0; font-size:13px; color: rgba(15,23,42,.60); width: 42%;">${escapeHtmlLite(row.label)}</td>
              <td style="padding: 8px 0; font-size:13px; color: #0f172a; font-weight:700;">${escapeHtmlLite(row.value)}</td>
            </tr>
          `).join('')}
        </table>
      </div>

      <div style="margin-top: 14px; border:1px solid rgba(15,23,42,.10); border-radius: 18px; padding: 16px 16px; background:#ffffff;">
        <div style="font-size:12px; letter-spacing:.14em; text-transform:uppercase; font-weight:900; color: rgba(15,23,42,.55);">Guidelines & terms</div>
        <ul style="margin: 10px 0 0; padding: 0 0 0 18px; color:#0f172a; font-size:13px;">
          <li style="margin: 6px 0;">Keep this receipt and signed PDF for your records.</li>
          <li style="margin: 6px 0;">Do not share your password publicly. Access is logged for audit and compliance.</li>
          <li style="margin: 6px 0;">If you believe this was sent in error, contact the sender immediately.</li>
        </ul>
        <div style="margin-top: 10px; font-size: 12px; color: rgba(15,23,42,.60);">
          ${termsLinks.map((item) => `<a href="${escapeHtmlLite(item.url)}" style="color: rgba(15,23,42,.75); text-decoration: underline; margin-right: 10px;">${escapeHtmlLite(item.label)}</a>`).join('')}
        </div>
      </div>

      <div style="margin-top: 14px; font-size: 12px; color: rgba(15,23,42,.60);">
        ${input.senderEmail ? `Sent by ${escapeHtmlLite(input.senderEmail)} via docrud.` : 'Sent via docrud.'}
      </div>
    </div>
  `.trim();

  const text = [
    `Receipt: ${docLabel}`,
    entry.referenceNumber ? `Reference: ${entry.referenceNumber}` : '',
    entry.generatedAt ? `Generated: ${formatLocalDate(entry.generatedAt)}` : '',
    `Signed by: ${signerName}`,
    input.signerEmail ? `Signer email: ${input.signerEmail}` : '',
    signedAt ? `Signed at: ${signedAt}` : '',
    signedIp ? `Signer IP: ${signedIp}` : '',
    entry.recipientSignedLocationLabel ? `Signer location: ${entry.recipientSignedLocationLabel}` : '',
    entry.recipientAadhaarMaskedId ? `Aadhaar: ${entry.recipientAadhaarMaskedId}` : '',
    `Execution record: ${entry.shareId || entry.id}`,
    `Link policy: ${policyLabel}`,
    '',
    `Open execution record: ${publicLink}`,
    '',
    'Guidelines:',
    '- Keep this receipt and signed PDF for your records.',
    '- Do not share your password publicly; access is logged.',
    '- If this was sent in error, contact the sender.',
    '',
    `Terms: ${origin}/terms-and-conditions`,
    `Privacy: ${origin}/privacy-policy`,
    `Signed document policy: ${origin}/signed-document-policy`,
  ]
    .filter(Boolean)
    .join('\n');

  return { subject: title === 'Signing receipt' ? `Receipt: ${docLabel}${entry.referenceNumber ? ` · ${entry.referenceNumber}` : ''}` : `Signed: ${docLabel}${entry.referenceNumber ? ` · ${entry.referenceNumber}` : ''}`, preheader, html, text };
}

