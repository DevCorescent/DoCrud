import { NextRequest, NextResponse } from 'next/server';
import { documentTemplates } from '@/data/templates';
import { createAccessEvent, getHistoryEntries, updateHistoryEntry } from '@/lib/server/history';
import { renderDocumentTemplate } from '@/lib/template';
import { getSignatureSettings } from '@/lib/server/settings';
import { customTemplatesPath, readJsonFile } from '@/lib/server/storage';
import { DocumentTemplate } from '@/types/document';
import { getDeviceLabel, getRequestIp, getRequestUserAgent } from '@/lib/server/public-documents';

export const dynamic = 'force-dynamic';

function getShareAccessError(entry: Awaited<ReturnType<typeof getHistoryEntries>>[number]) {
  if (entry.revokedAt) return 'This shared link has been revoked.';
  if (entry.shareExpiresAt && new Date(entry.shareExpiresAt).getTime() < Date.now()) return 'This shared link has expired.';
  const totalAccesses = (entry.openCount || 0) + (entry.downloadCount || 0);
  if (entry.shareAccessPolicy === 'one_time' && totalAccesses >= 1) return 'This one-time link has already been used.';
  if (entry.maxAccessCount && totalAccesses >= entry.maxAccessCount) return 'This shared link has reached its allowed access limit.';
  return null;
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const history = await getHistoryEntries();
    const entry = history.find((item) => item.shareId === params.id || item.id === params.id);

    if (!entry) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const customTemplates = await readJsonFile<DocumentTemplate[]>(customTemplatesPath, []);
    const template = [...documentTemplates, ...customTemplates].find((item) => item.id === entry.templateId);
    const password = _request.nextUrl.searchParams.get('password')?.trim().toUpperCase();
    const passwordValid = password && entry.sharePassword === password;
    const accessError = passwordValid ? getShareAccessError(entry) : null;

    if (passwordValid && accessError) {
      return NextResponse.json({ error: accessError, requiresPassword: true, passwordValidated: false }, { status: 410 });
    }

    if (passwordValid) {
      await updateHistoryEntry(entry.id, (current) => ({
        ...current,
        openCount: (current.openCount || 0) + 1,
        lastOpenedAt: new Date().toISOString(),
        accessEvents: [
          createAccessEvent({
            eventType: 'open',
            createdAt: new Date().toISOString(),
            ip: getRequestIp(_request),
            userAgent: getRequestUserAgent(_request),
            deviceLabel: getDeviceLabel(getRequestUserAgent(_request)),
          }),
          ...(current.accessEvents || []),
        ].slice(0, 50),
      }));
    }

    return NextResponse.json({
      requiresPassword: true,
      passwordValidated: Boolean(passwordValid),
      shareAccessPolicy: entry.shareAccessPolicy || 'standard',
      shareExpiresAt: entry.shareExpiresAt,
      id: entry.id,
      shareId: entry.shareId,
      templateName: entry.templateName,
      referenceNumber: entry.referenceNumber,
      generatedAt: entry.generatedAt,
      previewHtml: passwordValid ? entry.previewHtml : undefined,
      templateFields: passwordValid ? template?.fields || [] : [],
      data: passwordValid ? entry.data : {},
      recipientAccess: passwordValid ? entry.recipientAccess : undefined,
      dataCollectionEnabled: passwordValid ? entry.dataCollectionEnabled : false,
      dataCollectionStatus: passwordValid ? entry.dataCollectionStatus : 'disabled',
      dataCollectionInstructions: passwordValid ? entry.dataCollectionInstructions : undefined,
      dataCollectionSubmittedAt: passwordValid ? entry.dataCollectionSubmittedAt : undefined,
      dataCollectionSubmittedBy: passwordValid ? entry.dataCollectionSubmittedBy : undefined,
      dataCollectionReviewNotes: passwordValid ? entry.dataCollectionReviewNotes : undefined,
      dataCollectionReviewedAt: passwordValid ? entry.dataCollectionReviewedAt : undefined,
      dataCollectionReviewedBy: passwordValid ? entry.dataCollectionReviewedBy : undefined,
      requiredDocumentWorkflowEnabled: passwordValid ? entry.requiredDocumentWorkflowEnabled : false,
      requiredDocuments: passwordValid ? entry.requiredDocuments || [] : [],
      submittedDocuments: passwordValid ? entry.submittedDocuments || [] : [],
      documentsVerificationStatus: passwordValid ? entry.documentsVerificationStatus : undefined,
      documentsVerificationNotes: passwordValid ? entry.documentsVerificationNotes : undefined,
      recipientSignatureRequired: entry.recipientSignatureRequired,
      recipientSignerName: passwordValid ? entry.recipientSignerName : undefined,
      recipientSignedAt: passwordValid ? entry.recipientSignedAt : undefined,
      recipientSignedIp: passwordValid ? entry.recipientSignedIp : undefined,
      recipientSignatureSource: passwordValid ? entry.recipientSignatureSource : undefined,
      recipientSignedLocationLabel: passwordValid ? entry.recipientSignedLocationLabel : undefined,
      recipientSignedLatitude: passwordValid ? entry.recipientSignedLatitude : undefined,
      recipientSignedLongitude: passwordValid ? entry.recipientSignedLongitude : undefined,
      recipientSignedAccuracyMeters: passwordValid ? entry.recipientSignedAccuracyMeters : undefined,
      hasRecipientSignature: passwordValid ? Boolean(entry.recipientSignatureDataUrl) : false,
      collaborationComments: passwordValid ? entry.collaborationComments || [] : [],
      openCount: passwordValid ? (entry.openCount || 0) + 1 : entry.openCount || 0,
      downloadCount: entry.downloadCount || 0,
      editCount: entry.editCount || 0,
      accessEvents: passwordValid ? [
        {
          eventType: 'open',
          createdAt: new Date().toISOString(),
          ip: getRequestIp(_request),
          userAgent: getRequestUserAgent(_request),
          deviceLabel: getDeviceLabel(getRequestUserAgent(_request)),
        },
        ...(entry.accessEvents || []),
      ].slice(0, 50) : [],
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to load document' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = await request.json() as {
      data?: Record<string, string>;
      reviewerName?: string;
      password?: string;
    };

    const history = await getHistoryEntries();
    const entry = history.find((item) => item.shareId === params.id || item.id === params.id);
    if (!entry) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    if (entry.sharePassword !== payload.password?.trim().toUpperCase()) {
      return NextResponse.json({ error: 'Valid document password is required' }, { status: 403 });
    }
    const accessError = getShareAccessError(entry);
    if (accessError) {
      return NextResponse.json({ error: accessError }, { status: 410 });
    }
    if (entry.recipientAccess !== 'edit' && !entry.dataCollectionEnabled) {
      return NextResponse.json({ error: 'This shared document is not editable' }, { status: 403 });
    }

    const customTemplates = await readJsonFile<DocumentTemplate[]>(customTemplatesPath, []);
    const template = [...documentTemplates, ...customTemplates].find((item) => item.id === entry.templateId);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const adminSignatures = await getSignatureSettings();
    const adminSignature = adminSignatures.signatures.find((item) => item.id === entry.signatureId) || null;
    const nextData = Object.fromEntries(
      template.fields.map((field) => [field.name, String(payload.data?.[field.name] ?? entry.data?.[field.name] ?? '')])
    );
    const recipientSignature = entry.recipientSignatureDataUrl
      ? {
          signerName: entry.recipientSignerName || 'Recipient',
          signatureDataUrl: entry.recipientSignatureDataUrl,
          signatureSource: entry.recipientSignatureSource,
          signedAt: entry.recipientSignedAt,
          signedIp: entry.recipientSignedIp,
          signedLocationLabel: entry.recipientSignedLocationLabel,
          signedLatitude: entry.recipientSignedLatitude,
          signedLongitude: entry.recipientSignedLongitude,
          signedAccuracyMeters: entry.recipientSignedAccuracyMeters,
        }
      : null;
    const previewHtml = renderDocumentTemplate(template, nextData, {
      referenceNumber: entry.referenceNumber,
      generatedAt: entry.generatedAt,
      generatedBy: entry.generatedBy,
      designPreset: entry.editorState?.designPreset,
      signature: adminSignature,
      recipientSignature,
      watermarkLabel: entry.editorState?.watermarkLabel,
      letterheadMode: entry.editorState?.letterheadMode,
      letterheadImageDataUrl: entry.editorState?.letterheadImageDataUrl,
      letterheadHtml: entry.editorState?.letterheadHtml,
    });

    const updated = await updateHistoryEntry(entry.id, (current) => ({
      ...current,
      data: nextData,
      previewHtml,
      dataCollectionStatus: current.dataCollectionEnabled ? 'submitted' : current.dataCollectionStatus,
      dataCollectionSubmittedAt: current.dataCollectionEnabled ? new Date().toISOString() : current.dataCollectionSubmittedAt,
      dataCollectionSubmittedBy: current.dataCollectionEnabled ? (payload.reviewerName?.trim() || 'Recipient') : current.dataCollectionSubmittedBy,
      dataCollectionReviewNotes: current.dataCollectionEnabled ? undefined : current.dataCollectionReviewNotes,
      editCount: (current.editCount || 0) + 1,
      lastEditedAt: new Date().toISOString(),
      accessEvents: [
        createAccessEvent({
          eventType: 'edit',
          createdAt: new Date().toISOString(),
          ip: getRequestIp(request),
          userAgent: getRequestUserAgent(request),
          deviceLabel: getDeviceLabel(getRequestUserAgent(request)),
          actorName: payload.reviewerName?.trim() || 'Recipient',
        }),
        ...(current.accessEvents || []),
      ].slice(0, 50),
      automationNotes: [
        ...(current.automationNotes || []),
        ...(current.dataCollectionEnabled ? [`Data collection form submitted${payload.reviewerName?.trim() ? ` by ${payload.reviewerName.trim()}` : ''}`] : []),
        `Recipient content update saved${payload.reviewerName?.trim() ? ` by ${payload.reviewerName.trim()}` : ''}`,
      ],
    }));

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
  }
}
