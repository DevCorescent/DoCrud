import { NextRequest, NextResponse } from 'next/server';
import { createAccessEvent, getHistoryEntries, updateHistoryEntry } from '@/lib/server/history';
import { getSignatureSettings } from '@/lib/server/settings';
import { renderDocumentTemplate } from '@/lib/template';
import { documentTemplates } from '@/data/templates';
import { customTemplatesPath, readJsonFile } from '@/lib/server/storage';
import { DocumentTemplate, RecipientSignatureRecord } from '@/types/document';
import { getDeviceLabel, getRequestIp, getRequestUserAgent } from '@/lib/server/public-documents';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = await request.json() as {
      password?: string;
      signerName?: string;
      signatureDataUrl?: string;
      signatureSource?: 'drawn' | 'uploaded';
      location?: {
        latitude?: number;
        longitude?: number;
        accuracyMeters?: number;
        label?: string;
        capturedAt?: string;
      };
    };

    if (!payload.password || !payload.signerName?.trim() || !payload.signatureDataUrl?.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Password, signer name, and signature are required' }, { status: 400 });
    }
    if (
      typeof payload.location?.latitude !== 'number'
      || typeof payload.location?.longitude !== 'number'
      || Number.isNaN(payload.location.latitude)
      || Number.isNaN(payload.location.longitude)
      || !payload.location?.capturedAt
    ) {
      return NextResponse.json({ error: 'Live location access is mandatory before signing this document' }, { status: 400 });
    }

    const history = await getHistoryEntries();
    const entry = history.find((item) => item.shareId === params.id || item.id === params.id);
    if (!entry) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    if (!entry.recipientSignatureRequired) {
      return NextResponse.json({ error: 'Recipient signature is not required for this document' }, { status: 400 });
    }
    if (entry.requiredDocumentWorkflowEnabled && entry.documentsVerificationStatus !== 'verified') {
      return NextResponse.json({ error: 'Required documents must be verified by admin before signing' }, { status: 403 });
    }
    if (entry.recipientSignatureDataUrl) {
      return NextResponse.json({ error: 'Recipient signature has already been captured for this document' }, { status: 409 });
    }
    if (entry.sharePassword !== payload.password.trim().toUpperCase()) {
      return NextResponse.json({ error: 'Invalid signing password' }, { status: 403 });
    }

    const customTemplates = await readJsonFile<DocumentTemplate[]>(customTemplatesPath, []);
    const template = [...documentTemplates, ...customTemplates].find((item) => item.id === entry.templateId);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const adminSignatures = await getSignatureSettings();
    const adminSignature = adminSignatures.signatures.find((item) => item.id === entry.signatureId) || null;
    const recipientSignature: RecipientSignatureRecord = {
      signerName: payload.signerName.trim(),
      signatureDataUrl: payload.signatureDataUrl,
      signatureSource: payload.signatureSource === 'uploaded' ? 'uploaded' : 'drawn',
      signedAt: new Date().toISOString(),
      signedIp: getRequestIp(request),
      signedLocationLabel: payload.location.label?.trim() || `${payload.location.latitude.toFixed(6)}, ${payload.location.longitude.toFixed(6)}`,
      signedLatitude: payload.location.latitude,
      signedLongitude: payload.location.longitude,
      signedAccuracyMeters: payload.location.accuracyMeters,
    };

    const previewHtml = renderDocumentTemplate(template, entry.data, {
      referenceNumber: entry.referenceNumber,
      generatedAt: entry.generatedAt,
      generatedBy: entry.generatedBy,
      signature: adminSignature,
      recipientSignature,
    });

    const updated = await updateHistoryEntry(entry.id, (current) => ({
      ...current,
      previewHtml,
      recipientSignerName: recipientSignature.signerName,
      recipientSignatureDataUrl: recipientSignature.signatureDataUrl,
      recipientSignatureSource: recipientSignature.signatureSource,
      recipientSignedAt: recipientSignature.signedAt,
      recipientSignedIp: recipientSignature.signedIp,
      recipientSignedLocationLabel: recipientSignature.signedLocationLabel,
      recipientSignedLatitude: recipientSignature.signedLatitude,
      recipientSignedLongitude: recipientSignature.signedLongitude,
      recipientSignedAccuracyMeters: recipientSignature.signedAccuracyMeters,
      accessEvents: [
        createAccessEvent({
          eventType: 'sign',
          createdAt: new Date().toISOString(),
          ip: getRequestIp(request),
          userAgent: getRequestUserAgent(request),
          deviceLabel: getDeviceLabel(getRequestUserAgent(request)),
          actorName: recipientSignature.signerName,
        }),
        ...(current.accessEvents || []),
      ].slice(0, 50),
      automationNotes: [...(current.automationNotes || []), 'Recipient signature captured'],
    }));

    return NextResponse.json({
      ...updated,
      templateFields: template.fields,
      data: updated?.data || entry.data,
      recipientAccess: updated?.recipientAccess || entry.recipientAccess,
      recipientSignerName: updated?.recipientSignerName || entry.recipientSignerName,
      recipientSignedAt: updated?.recipientSignedAt || entry.recipientSignedAt,
      recipientSignedIp: updated?.recipientSignedIp || entry.recipientSignedIp,
      recipientSignatureSource: updated?.recipientSignatureSource || entry.recipientSignatureSource,
      recipientSignedLocationLabel: updated?.recipientSignedLocationLabel || entry.recipientSignedLocationLabel,
      recipientSignedLatitude: updated?.recipientSignedLatitude ?? entry.recipientSignedLatitude,
      recipientSignedLongitude: updated?.recipientSignedLongitude ?? entry.recipientSignedLongitude,
      recipientSignedAccuracyMeters: updated?.recipientSignedAccuracyMeters ?? entry.recipientSignedAccuracyMeters,
      requiredDocumentWorkflowEnabled: updated?.requiredDocumentWorkflowEnabled ?? entry.requiredDocumentWorkflowEnabled,
      requiredDocuments: updated?.requiredDocuments || entry.requiredDocuments || [],
      submittedDocuments: updated?.submittedDocuments || entry.submittedDocuments || [],
      documentsVerificationStatus: updated?.documentsVerificationStatus || entry.documentsVerificationStatus,
      documentsVerificationNotes: updated?.documentsVerificationNotes || entry.documentsVerificationNotes,
      collaborationComments: updated?.collaborationComments || entry.collaborationComments || [],
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to sign document' }, { status: 500 });
  }
}
