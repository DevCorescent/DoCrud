import { DocumentTemplate, RecipientSignatureRecord, SignatureRecord } from '@/types/document';
import { formatSignatureLocation } from '@/lib/location';

const BRAND_LOGO_SRC = '/corescent-logo.png';

function generateDocumentNumber(referenceNumber?: string) {
  if (referenceNumber) {
    return referenceNumber;
  }

  return `COR-DOC-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Date.now().toString().slice(-6)}`;
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeRichText(value: string) {
  const withoutScripts = value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/\son[a-z]+="[^"]*"/gi, '')
    .replace(/\son[a-z]+='[^']*'/gi, '')
    .replace(/javascript:/gi, '');

  return withoutScripts;
}

function prettifyLabel(key: string) {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildFallbackBody(template: DocumentTemplate, data: Record<string, string>) {
  const fieldRows = template.fields
    .map((field) => {
      const label = escapeHtml(field.label || prettifyLabel(field.name));
      const value = field.type === 'textarea'
        ? sanitizeRichText(data[field.name] || '<p>Not provided</p>')
        : escapeHtml(data[field.name] || 'Not provided');
      return `
        <tr>
          <td class="field-label">${label}</td>
          <td class="field-value">${value}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <section class="summary-block">
      <p class="lead">
        This ${escapeHtml(template.name)} has been generated using the approved Corescent workflow.
        Please review the details below before circulation.
      </p>
    </section>
    <section class="details-block">
      <table class="details-table">
        <tbody>${fieldRows}</tbody>
      </table>
    </section>
    <section class="footer-note">
      <p>This document is system generated and carries an internal Corescent watermark for audit control.</p>
    </section>
  `;
}

function injectValues(html: string, template: DocumentTemplate, data: Record<string, string>) {
  let output = html;

  template.fields.forEach((field) => {
    const safeValue = field.type === 'textarea'
      ? sanitizeRichText(data[field.name] || '')
      : escapeHtml(data[field.name] || '');
    output = output.replace(new RegExp(`{{${field.name}}}`, 'g'), safeValue);
  });

  return output;
}

export function renderDocumentTemplate(
  template: DocumentTemplate,
  data: Record<string, string>,
  options?: {
    referenceNumber?: string;
    generatedBy?: string;
    generatedAt?: string;
    signature?: SignatureRecord | null;
    recipientSignature?: RecipientSignatureRecord | null;
  }
) {
  const rawBody = template.template && template.template.trim() !== '...' && template.template.trim().length > 20
    ? injectValues(template.template, template, data)
    : buildFallbackBody(template, data);

  const generatedAt = options?.generatedAt ? new Date(options.generatedAt).toLocaleString() : new Date().toLocaleString();
  const pageCounter = template.id === 'contractual-agreement' ? 'Page 1 of 3' : 'Page 1 of 1';
  const documentNumber = generateDocumentNumber(options?.referenceNumber);

  const signatureMarkup = options?.signature?.signatureDataUrl
    ? `
      <section class="signature-block">
        <div>
          <p class="signature-label">Authorized Signature</p>
          <img class="signature-image" src="${options.signature.signatureDataUrl}" alt="Authorized signature" />
          <p class="signature-name">${escapeHtml(options.signature.signerName)}</p>
          <p class="signature-role">${escapeHtml(options.signature.signerRole)}</p>
          <p class="signature-meta">Captured ${escapeHtml(options.signature.signedAt || '')}${options.signature.signedIp ? ` from ${escapeHtml(options.signature.signedIp)}` : ''}</p>
        </div>
      </section>
    `
    : '';

  const recipientSignatureMarkup = options?.recipientSignature?.signatureDataUrl
    ? `
      <section class="signature-block recipient-signature">
        <div>
          <p class="signature-label">Recipient Signature</p>
          <img class="signature-image" src="${options.recipientSignature.signatureDataUrl}" alt="Recipient signature" />
          <p class="signature-name">${escapeHtml(options.recipientSignature.signerName)}</p>
          <p class="signature-meta">Captured ${escapeHtml(options.recipientSignature.signedAt || '')}</p>
          <p class="signature-meta">IP Address: ${escapeHtml(options.recipientSignature.signedIp || 'unknown')}</p>
          <p class="signature-meta">Signing Location: ${escapeHtml(formatSignatureLocation({
            label: options.recipientSignature.signedLocationLabel,
            latitude: options.recipientSignature.signedLatitude,
            longitude: options.recipientSignature.signedLongitude,
            accuracyMeters: options.recipientSignature.signedAccuracyMeters,
          }))}</p>
        </div>
      </section>
    `
    : '';

  const poweredFooter = `
    <footer class="powered-footer">
      <div class="powered-footer-copy">
        <span class="powered-footer-line powered-footer-strong">Document No.: ${escapeHtml(documentNumber)}</span>
        <span class="powered-footer-line">Generated on ${escapeHtml(generatedAt)}</span>
        <span class="powered-footer-line">Developed &amp; Powered by Corescent Technologies Private Limited</span>
        <span class="powered-footer-line">
          This document has been generated using our proprietary software, designed to ensure the highest standards of data integrity, security, and compliance. All information is protected through advanced encryption protocols, keeping your data safe and reliable at every step.
        </span>
        <span class="powered-footer-line">
          If you’re looking to streamline and organize your business documents with a secure and efficient solution, we’d be happy to assist you.
        </span>
        <span class="powered-footer-line">For business inquiries and purchases, please contact our Sales team.</span>
        <span class="powered-footer-line">Corescent Technologies keeps the rights to maintain and secure this document, and the client is expected to maintain the same confidentiality and compliance standards throughout its lifecycle.</span>
      </div>
      <a class="powered-footer-button" href="https://www.corescent.in/contact" target="_blank" rel="noreferrer">Contact Sales</a>
    </footer>
  `;

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: "Aptos", "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
            background: #f3f3f3;
            color: #2a2a2a;
          }
          .page {
            position: relative;
            width: 794px;
            min-height: 1123px;
            margin: 18px auto;
            background: #ffffff;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.10);
          }
          .watermark {
            position: absolute;
            inset: 160px 32px 120px 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: none;
            user-select: none;
            z-index: 0;
          }
          .watermark-logo {
            width: min(76%, 560px);
            height: auto;
            opacity: 0.08;
          }
          .letterhead-top {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 56px;
            z-index: 2;
          }
          .letterhead-top::before,
          .letterhead-top::after {
            content: "";
            position: absolute;
            top: 0;
            height: 0;
            border-top: 34px solid #ff5a14;
          }
          .letterhead-top::before {
            left: 0;
            width: 0;
            border-right: 180px solid transparent;
          }
          .letterhead-top::after {
            left: 86px;
            width: 0;
            border-top-color: #ffb08c;
            border-right: 286px solid transparent;
          }
          .letterhead-top-accent {
            position: absolute;
            top: 10px;
            left: 248px;
            width: 120px;
            height: 26px;
            background: #ff5a14;
            transform: skewX(-16deg);
          }
          .letterhead-bottom {
            position: absolute;
            right: 0;
            bottom: 28px;
            width: 220px;
            height: 44px;
            z-index: 2;
          }
          .letterhead-bottom::before,
          .letterhead-bottom::after {
            content: "";
            position: absolute;
            bottom: 0;
            height: 16px;
            transform: skewX(-24deg);
          }
          .letterhead-bottom::before {
            right: 0;
            width: 92px;
            background: #ff5a14;
          }
          .letterhead-bottom::after {
            right: 72px;
            width: 88px;
            background: #ffb08c;
          }
          .letterhead-bottom-accent {
            position: absolute;
            right: 138px;
            bottom: 16px;
            width: 66px;
            height: 14px;
            background: #ff5a14;
            transform: skewX(-24deg);
          }
          .content {
            position: relative;
            z-index: 1;
            padding: 80px 38px 82px;
          }
          .hero {
            display: flex;
            justify-content: space-between;
            gap: 22px;
            align-items: flex-start;
            padding-bottom: 18px;
          }
          .brand {
            max-width: 47%;
            display: flex;
            align-items: flex-start;
            justify-content: flex-start;
            margin: 0;
            padding: 0;
          }
          .brand-logo {
            width: 274px;
            max-width: 100%;
            display: block;
            margin: 0;
          }
          .meta {
            min-width: 250px;
            margin: 0;
            padding-top: 0;
            align-self: flex-start;
          }
          .meta-row {
            display: block;
            font-size: 12px;
            line-height: 1.45;
            padding: 0;
            margin: 0 0 2px;
            text-align: right;
            border-bottom: 0;
          }
          .meta-label {
            color: #444444;
            font-weight: 700;
            display: inline;
          }
          .meta-value {
            color: #444444;
            font-weight: 600;
            display: inline;
          }
          .website-row .meta-value {
            color: #ff5a14;
            font-weight: 700;
          }
          .document-title {
            margin: 8px 0 12px;
            text-align: center;
            font-size: 18px;
            font-weight: 800;
            text-transform: uppercase;
            text-decoration: underline;
            letter-spacing: 0.02em;
          }
          .document-body {
            padding-top: 4px;
            line-height: 1.45;
            color: #343434;
            font-size: 13px;
          }
          .document-body p { margin: 0 0 8px; }
          .document-body h2,
          .document-body h3 {
            margin: 14px 0 8px;
            font-size: 14px;
            font-weight: 800;
            text-align: center;
          }
          .document-body h3 { text-align: left; }
          .document-body ul,
          .document-body ol {
            margin: 4px 0 10px 20px;
            padding: 0;
          }
          .document-body li { margin-bottom: 3px; }
          .lead {
            font-size: 13px;
            margin: 0 0 24px;
          }
          .summary-block, .details-block, .footer-note {
            margin-bottom: 24px;
          }
          .details-table {
            width: 100%;
            border-collapse: collapse;
            overflow: hidden;
            border-radius: 16px;
            border: 1px solid rgba(251, 146, 60, 0.18);
          }
          .details-table tr:nth-child(odd) {
            background: rgba(255, 247, 237, 0.84);
          }
          .details-table td {
            padding: 14px 16px;
            border-bottom: 1px solid rgba(251, 146, 60, 0.12);
            vertical-align: top;
          }
          .details-table tr:last-child td {
            border-bottom: 0;
          }
          .field-label {
            width: 32%;
            color: #292524;
            font-weight: 700;
          }
          .field-value {
            color: #1c1917;
          }
          .footer-note {
            padding-top: 16px;
            border-top: 1px dashed rgba(251, 146, 60, 0.34);
            font-size: 13px;
            color: #78716c;
          }
          .signature-block {
            margin-top: 36px;
            padding-top: 20px;
            border-top: 1px solid rgba(0, 0, 0, 0.10);
          }
          .recipient-signature {
            margin-top: 24px;
          }
          .signature-label {
            text-transform: uppercase;
            letter-spacing: 0.14em;
            font-size: 11px;
            color: #78716c;
            margin-bottom: 8px;
          }
          .signature-image {
            display: block;
            max-width: 240px;
            max-height: 96px;
            object-fit: contain;
            margin-bottom: 10px;
          }
          .signature-name {
            font-weight: 700;
            margin: 0;
            color: #1c1917;
          }
          .signature-role,
          .signature-meta {
            margin: 2px 0 0;
            font-size: 12px;
            color: #78716c;
          }
          .powered-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
            margin-top: 28px;
            padding-top: 18px;
            border-top: 1px solid rgba(0, 0, 0, 0.10);
            font-size: 12px;
            color: #57534e;
          }
          .powered-footer-copy {
            display: flex;
            flex-direction: column;
            gap: 6px;
            min-width: 0;
          }
          .powered-footer-strong {
            font-weight: 800;
            color: #292524;
          }
          .powered-footer-line {
            line-height: 1.55;
          }
          .powered-footer-button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 148px;
            padding: 10px 18px;
            border-radius: 999px;
            background: #111111;
            color: #ffffff;
            text-decoration: none;
            font-weight: 700;
            white-space: nowrap;
          }
          @media (max-width: 768px) {
            .page {
              width: 100%;
              margin: 0;
            }
            .content {
              padding: 24px 18px 30px;
            }
            .hero {
              flex-direction: column;
              gap: 14px;
            }
            .brand {
              max-width: 100%;
            }
            .brand-logo {
              width: 220px;
            }
            .meta {
              width: 100%;
              min-width: 0;
            }
            .watermark {
              inset: 150px 18px 100px 18px;
            }
            .watermark-logo {
              width: min(88%, 380px);
            }
            .powered-footer {
              flex-direction: column;
              align-items: flex-start;
            }
            .powered-footer-button {
              width: 100%;
            }
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="letterhead-top"><div class="letterhead-top-accent"></div></div>
          <div class="watermark"><img class="watermark-logo" src="${BRAND_LOGO_SRC}" alt="Corescent watermark" /></div>
          <div class="letterhead-bottom"><div class="letterhead-bottom-accent"></div></div>
          <div class="content">
            <section class="hero">
              <div class="brand">
                <img class="brand-logo" src="${BRAND_LOGO_SRC}" alt="Corescent Technologies" />
              </div>
              <div class="meta">
                <div class="meta-row"><span class="meta-label">${pageCounter}</span></div>
                <div class="meta-row"><span class="meta-label">CIN:</span> <span class="meta-value">U62011KA2023PTC178858</span></div>
                <div class="meta-row"><span class="meta-value">contact@corescent.in</span></div>
                <div class="meta-row"><span class="meta-value">WeWork Latitude, 10th floor, RMZ Latitude,</span></div>
                <div class="meta-row"><span class="meta-value">Hebbal, Bengaluru, Karnataka</span></div>
                <div class="meta-row"><span class="meta-value">PIN- 560024</span></div>
                <div class="meta-row website-row"><span class="meta-value">www.corescent.in</span></div>
              </div>
            </section>
            <div class="document-title">${escapeHtml(template.name)}</div>
            <section class="document-body">${rawBody}${signatureMarkup}${recipientSignatureMarkup}${poweredFooter}</section>
          </div>
        </div>
      </body>
    </html>
  `;
}
