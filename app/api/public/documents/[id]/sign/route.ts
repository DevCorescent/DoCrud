import { NextRequest, NextResponse } from 'next/server';
import { createAccessEvent, getHistoryEntries, updateHistoryEntry } from '@/lib/server/history';
import { getCustomTemplatesFromRepository } from '@/lib/server/repositories';
import { getSignatureSettings } from '@/lib/server/settings';
import { renderDocumentTemplate } from '@/lib/template';
import { documentTemplates } from '@/data/templates';
import { RecipientSignatureRecord } from '@/types/document';
import { getDeviceLabel, getRequestIp, getRequestUserAgent } from '@/lib/server/public-documents';
import { appendSignaturePageToUploadedPdf } from '@/lib/server/shared-uploaded-pdf';
import { getAadhaarRuntimeConfig } from '@/lib/server/aadhaar';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = await request.json() as {
      password?: string;
      signerName?: string;
      signatureDataUrl?: string;
      signatureSource?: 'drawn' | 'uploaded';
      evidenceCaptureToken?: string;
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
    if (!payload.evidenceCaptureToken?.trim()) {
      return NextResponse.json({ error: 'A live signer photo must be captured before signing.' }, { status: 400 });
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

    const aadhaarRuntime = await getAadhaarRuntimeConfig();
    if (aadhaarRuntime.enabled) {
      if (!entry.recipientAadhaarVerifiedAt || !entry.recipientAadhaarVerifiedIp) {
        return NextResponse.json({ error: 'Aadhaar verification is mandatory before signing this document.' }, { status: 403 });
      }
      if (entry.recipientAadhaarVerifiedIp !== getRequestIp(request)) {
        return NextResponse.json({ error: 'Aadhaar verification must be completed again from this device/network before signing.' }, { status: 409 });
      }
    }
    if (!entry.pendingRecipientPhotoCaptureToken || entry.pendingRecipientPhotoCaptureToken !== payload.evidenceCaptureToken.trim()) {
      return NextResponse.json({ error: 'Live signer photo evidence is missing or expired. Please capture a fresh photo before signing.' }, { status: 409 });
    }
    if (!entry.pendingRecipientPhotoDataUrl || !entry.pendingRecipientPhotoCapturedAt) {
      return NextResponse.json({ error: 'Live signer photo evidence is incomplete. Please capture a fresh photo before signing.' }, { status: 409 });
    }
    if (Date.now() - new Date(entry.pendingRecipientPhotoCapturedAt).getTime() > 15 * 60 * 1000) {
      await updateHistoryEntry(entry.id, (current) => ({
        ...current,
        pendingRecipientPhotoDataUrl: undefined,
        pendingRecipientPhotoCapturedAt: undefined,
        pendingRecipientPhotoCapturedIp: undefined,
        pendingRecipientPhotoCaptureToken: undefined,
        automationNotes: [...(current.automationNotes || []), 'Live signer photo evidence expired before final submission'],
      }));
      return NextResponse.json({ error: 'Live signer photo evidence expired. Please capture a fresh photo before signing.' }, { status: 409 });
    }

    const signingIp = getRequestIp(request);
    if (!entry.pendingRecipientPhotoCapturedIp || entry.pendingRecipientPhotoCapturedIp !== signingIp) {
      await updateHistoryEntry(entry.id, (current) => ({
        ...current,
        pendingRecipientPhotoDataUrl: undefined,
        pendingRecipientPhotoCapturedAt: undefined,
        pendingRecipientPhotoCapturedIp: undefined,
        pendingRecipientPhotoCaptureToken: undefined,
        automationNotes: [...(current.automationNotes || []), 'Signature attempt blocked because capture IP did not match signing IP'],
      }));
      return NextResponse.json({
        error: 'IP mismatch detected between live photo capture and signing attempt. For security, submission is locked until you capture a fresh live photo from this device and network.',
      }, { status: 409 });
    }

    const recipientSignature: RecipientSignatureRecord = {
      signerName: payload.signerName.trim(),
      signatureDataUrl: payload.signatureDataUrl,
      signatureSource: payload.signatureSource === 'uploaded' ? 'uploaded' : 'drawn',
      signedAt: new Date().toISOString(),
      signedIp: signingIp,
      signerPhotoDataUrl: entry.pendingRecipientPhotoDataUrl,
      signerPhotoCapturedAt: entry.pendingRecipientPhotoCapturedAt,
      signerPhotoCapturedIp: entry.pendingRecipientPhotoCapturedIp,
      signerPhotoCaptureMethod: 'live_camera',
      aadhaarVerifiedAt: entry.recipientAadhaarVerifiedAt,
      aadhaarVerifiedIp: entry.recipientAadhaarVerifiedIp,
      aadhaarReferenceId: entry.recipientAadhaarReferenceId,
      aadhaarMaskedId: entry.recipientAadhaarMaskedId,
      aadhaarVerificationMode: entry.recipientAadhaarVerificationMode,
      aadhaarProviderLabel: entry.recipientAadhaarProviderLabel,
      signedLocationLabel: payload.location.label?.trim() || `${payload.location.latitude.toFixed(6)}, ${payload.location.longitude.toFixed(6)}`,
      signedLatitude: payload.location.latitude,
      signedLongitude: payload.location.longitude,
      signedAccuracyMeters: payload.location.accuracyMeters,
    };

    const customTemplates = entry.documentSourceType === 'uploaded_pdf' ? [] : await getCustomTemplatesFromRepository();
    const template = entry.documentSourceType === 'uploaded_pdf'
      ? null
      : [...documentTemplates, ...customTemplates].find((item) => item.id === entry.templateId) || null;

    let previewHtml = entry.previewHtml;
    let signedPdfDataUrl = entry.signedPdfDataUrl;
    let signedPdfFileName = entry.signedPdfFileName;

    if (entry.documentSourceType === 'uploaded_pdf') {
      if (!entry.uploadedPdfDataUrl) {
        return NextResponse.json({ error: 'Original uploaded PDF is missing' }, { status: 400 });
      }

      signedPdfDataUrl = await appendSignaturePageToUploadedPdf({
        originalPdfDataUrl: entry.uploadedPdfDataUrl,
        signatureDataUrl: payload.signatureDataUrl,
        signerName: recipientSignature.signerName,
        signedAt: recipientSignature.signedAt || new Date().toISOString(),
        signedIp: recipientSignature.signedIp,
        signedLocationLabel: recipientSignature.signedLocationLabel,
        signedLatitude: recipientSignature.signedLatitude,
        signedLongitude: recipientSignature.signedLongitude,
        signedAccuracyMeters: recipientSignature.signedAccuracyMeters,
        signatureSource: recipientSignature.signatureSource,
        signerPhotoDataUrl: recipientSignature.signerPhotoDataUrl,
        signerPhotoCapturedAt: recipientSignature.signerPhotoCapturedAt,
        signerPhotoCapturedIp: recipientSignature.signerPhotoCapturedIp,
        documentTitle: entry.templateName,
        watermarkLabel: entry.editorState?.watermarkLabel,
        signatureCertificateBrandingEnabled: entry.editorState?.signatureCertificateBrandingEnabled !== false,
        executionRecordId: entry.shareId || entry.id,
        signerUserAgent: getRequestUserAgent(request),
        aadhaarVerifiedAt: recipientSignature.aadhaarVerifiedAt,
        aadhaarVerifiedIp: recipientSignature.aadhaarVerifiedIp,
        aadhaarReferenceId: recipientSignature.aadhaarReferenceId,
        aadhaarMaskedId: recipientSignature.aadhaarMaskedId,
        aadhaarVerificationMode: recipientSignature.aadhaarVerificationMode,
        aadhaarProviderLabel: recipientSignature.aadhaarProviderLabel,
      });
      signedPdfFileName = (entry.uploadedPdfFileName || entry.templateName || 'shared-document').replace(/\.pdf$/i, '') + '-signed.pdf';
    } else {
      if (!template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }

      const adminSignatures = await getSignatureSettings();
      const adminSignature = adminSignatures.signatures.find((item) => item.id === entry.signatureId) || null;
      previewHtml = renderDocumentTemplate(template, entry.data, {
        referenceNumber: entry.referenceNumber,
        generatedAt: entry.generatedAt,
        generatedBy: entry.generatedBy,
        renderMode: template.isCustom ? 'plain' : 'platform',
        designPreset: entry.editorState?.designPreset,
        signature: adminSignature,
        recipientSignature,
      });
    }

    const updated = await updateHistoryEntry(entry.id, (current) => ({
      ...current,
      previewHtml,
      signedPdfDataUrl,
      signedPdfFileName,
      recipientSignerName: recipientSignature.signerName,
      recipientSignatureDataUrl: recipientSignature.signatureDataUrl,
      recipientSignatureSource: recipientSignature.signatureSource,
      recipientSignedAt: recipientSignature.signedAt,
      recipientSignedIp: recipientSignature.signedIp,
      recipientPhotoDataUrl: recipientSignature.signerPhotoDataUrl,
      recipientPhotoCapturedAt: recipientSignature.signerPhotoCapturedAt,
      recipientPhotoCapturedIp: recipientSignature.signerPhotoCapturedIp,
      recipientPhotoCaptureMethod: recipientSignature.signerPhotoCaptureMethod,
      recipientAadhaarVerificationRequired: aadhaarRuntime.enabled,
      recipientAadhaarVerifiedAt: recipientSignature.aadhaarVerifiedAt,
      recipientAadhaarVerifiedIp: recipientSignature.aadhaarVerifiedIp,
      recipientAadhaarReferenceId: recipientSignature.aadhaarReferenceId,
      recipientAadhaarMaskedId: recipientSignature.aadhaarMaskedId,
      recipientAadhaarVerificationMode: recipientSignature.aadhaarVerificationMode,
      recipientAadhaarProviderLabel: recipientSignature.aadhaarProviderLabel,
      pendingRecipientPhotoDataUrl: undefined,
      pendingRecipientPhotoCapturedAt: undefined,
      pendingRecipientPhotoCapturedIp: undefined,
      pendingRecipientPhotoCaptureToken: undefined,
      recipientSignedLocationLabel: recipientSignature.signedLocationLabel,
      recipientSignedLatitude: recipientSignature.signedLatitude,
      recipientSignedLongitude: recipientSignature.signedLongitude,
      recipientSignedAccuracyMeters: recipientSignature.signedAccuracyMeters,
      accessEvents: [
        createAccessEvent({
          eventType: 'sign',
          createdAt: new Date().toISOString(),
          ip: signingIp,
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
      templateFields: template?.fields || [],
      data: updated?.data || entry.data,
      documentSourceType: updated?.documentSourceType || entry.documentSourceType || 'generated',
      uploadedPdfFileName: updated?.uploadedPdfFileName || entry.uploadedPdfFileName,
      uploadedPdfPreviewUrl: updated?.signedPdfDataUrl || updated?.uploadedPdfDataUrl || entry.signedPdfDataUrl || entry.uploadedPdfDataUrl,
      recipientAccess: updated?.recipientAccess || entry.recipientAccess,
      recipientSignerName: updated?.recipientSignerName || entry.recipientSignerName,
      recipientSignedAt: updated?.recipientSignedAt || entry.recipientSignedAt,
      recipientSignedIp: updated?.recipientSignedIp || entry.recipientSignedIp,
      recipientSignatureSource: updated?.recipientSignatureSource || entry.recipientSignatureSource,
      recipientPhotoDataUrl: updated?.recipientPhotoDataUrl || entry.recipientPhotoDataUrl,
      recipientPhotoCapturedAt: updated?.recipientPhotoCapturedAt || entry.recipientPhotoCapturedAt,
      recipientPhotoCapturedIp: updated?.recipientPhotoCapturedIp || entry.recipientPhotoCapturedIp,
      recipientPhotoCaptureMethod: updated?.recipientPhotoCaptureMethod || entry.recipientPhotoCaptureMethod,
      recipientAadhaarVerifiedAt: updated?.recipientAadhaarVerifiedAt || entry.recipientAadhaarVerifiedAt,
      recipientAadhaarVerifiedIp: updated?.recipientAadhaarVerifiedIp || entry.recipientAadhaarVerifiedIp,
      recipientAadhaarReferenceId: updated?.recipientAadhaarReferenceId || entry.recipientAadhaarReferenceId,
      recipientAadhaarMaskedId: updated?.recipientAadhaarMaskedId || entry.recipientAadhaarMaskedId,
      recipientAadhaarVerificationMode: updated?.recipientAadhaarVerificationMode || entry.recipientAadhaarVerificationMode,
      recipientAadhaarProviderLabel: updated?.recipientAadhaarProviderLabel || entry.recipientAadhaarProviderLabel,
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
