import { NextRequest, NextResponse } from 'next/server';
import { documentTemplates } from '@/data/templates';
import { createAccessEvent, getHistoryEntries, updateHistoryEntry } from '@/lib/server/history';
import { renderDocumentTemplate } from '@/lib/template';
import { getSignatureSettings } from '@/lib/server/settings';
import { customTemplatesPath, readJsonFile } from '@/lib/server/storage';
import { DocumentTemplate } from '@/types/document';
import { getDeviceLabel, getRequestIp, getRequestUserAgent } from '@/lib/server/public-documents';

export const dynamic = 'force-dynamic';

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
      id: entry.id,
      shareId: entry.shareId,
      templateName: entry.templateName,
      referenceNumber: entry.referenceNumber,
      generatedAt: entry.generatedAt,
      previewHtml: passwordValid ? entry.previewHtml : undefined,
      templateFields: passwordValid ? template?.fields || [] : [],
      data: passwordValid ? entry.data : {},
      recipientAccess: passwordValid ? entry.recipientAccess : undefined,
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
    if (entry.recipientAccess !== 'edit') {
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
      signature: adminSignature,
      recipientSignature,
    });

    const updated = await updateHistoryEntry(entry.id, (current) => ({
      ...current,
      data: nextData,
      previewHtml,
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
        `Recipient content update saved${payload.reviewerName?.trim() ? ` by ${payload.reviewerName.trim()}` : ''}`,
      ],
    }));

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
  }
}
