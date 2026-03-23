import { DocumentAccessEvent, DocumentHistory, EmailLogEntry } from '@/types/document';
import { historyFilePath, readJsonFile, writeJsonFile } from '@/lib/server/storage';

type HistoryInput = Partial<DocumentHistory> & {
  documentType?: string;
};

export function generateReferenceNumber(templateName: string, generatedAt: string) {
  const prefix = templateName
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
    .slice(0, 4) || 'DOC';
  const date = generatedAt.slice(0, 10).replace(/-/g, '');
  const suffix = Date.now().toString().slice(-5);
  return `COR-${prefix}-${date}-${suffix}`;
}

export function generateSharePassword() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function normalizeHistoryEntry(entry: HistoryInput): DocumentHistory {
  const generatedAt = entry.generatedAt || new Date().toISOString();
  const shareId = entry.shareId || `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id: entry.id || Date.now().toString(),
    shareId,
    shareUrl: entry.shareUrl || `/documents/${shareId}`,
    referenceNumber: entry.referenceNumber || generateReferenceNumber(entry.templateName || entry.documentType || 'Document', generatedAt),
    templateId: entry.templateId || entry.documentType || 'unknown-template',
    templateName: entry.templateName || entry.documentType || 'Untitled Document',
    category: entry.category || 'General',
    data: entry.data && typeof entry.data === 'object' ? Object.fromEntries(Object.entries(entry.data).map(([key, value]) => [key, String(value ?? '')])) : {},
    generatedBy: entry.generatedBy || 'unknown',
    generatedAt,
    previewHtml: entry.previewHtml,
    pdfUrl: entry.pdfUrl,
    emailSent: Boolean(entry.emailSent),
    emailTo: entry.emailTo,
    emailSubject: entry.emailSubject,
    emailSentAt: entry.emailSentAt,
    emailStatus: entry.emailStatus || (entry.emailSent ? 'sent' : 'pending'),
    emailError: entry.emailError,
    deliveryHistory: Array.isArray(entry.deliveryHistory) ? entry.deliveryHistory : [],
    automationNotes: Array.isArray(entry.automationNotes) ? entry.automationNotes.map(String) : [],
    signatureId: entry.signatureId,
    signatureName: entry.signatureName,
    signatureRole: entry.signatureRole,
    signatureSignedAt: entry.signatureSignedAt,
    signatureSignedIp: entry.signatureSignedIp,
    sharePassword: entry.sharePassword || generateSharePassword(),
    requiredDocumentWorkflowEnabled: entry.requiredDocumentWorkflowEnabled ?? false,
    requiredDocuments: Array.isArray(entry.requiredDocuments) ? entry.requiredDocuments.map(String).filter(Boolean) : [],
    submittedDocuments: Array.isArray(entry.submittedDocuments) ? entry.submittedDocuments.map((document) => ({
      id: String(document.id || `submission-${Date.now()}`),
      label: String(document.label || 'Supporting Document'),
      fileName: String(document.fileName || 'document'),
      mimeType: String(document.mimeType || 'application/octet-stream'),
      dataUrl: String(document.dataUrl || ''),
      uploadedAt: String(document.uploadedAt || new Date().toISOString()),
    })) : [],
    documentsSubmittedAt: entry.documentsSubmittedAt,
    documentsSubmittedBy: entry.documentsSubmittedBy,
    documentsVerificationStatus: entry.documentsVerificationStatus || (entry.requiredDocumentWorkflowEnabled ? 'pending' : 'not_required'),
    documentsVerifiedAt: entry.documentsVerifiedAt,
    documentsVerifiedBy: entry.documentsVerifiedBy,
    documentsVerificationNotes: entry.documentsVerificationNotes,
    recipientSignatureRequired: entry.recipientSignatureRequired ?? true,
    recipientAccess: entry.recipientAccess || 'comment',
    recipientSignerName: entry.recipientSignerName,
    recipientSignatureDataUrl: entry.recipientSignatureDataUrl,
    recipientSignatureSource: entry.recipientSignatureSource === 'uploaded' ? 'uploaded' : entry.recipientSignatureSource === 'drawn' ? 'drawn' : undefined,
    recipientSignedAt: entry.recipientSignedAt,
    recipientSignedIp: entry.recipientSignedIp,
    recipientSignedLocationLabel: entry.recipientSignedLocationLabel,
    recipientSignedLatitude: typeof entry.recipientSignedLatitude === 'number' ? entry.recipientSignedLatitude : undefined,
    recipientSignedLongitude: typeof entry.recipientSignedLongitude === 'number' ? entry.recipientSignedLongitude : undefined,
    recipientSignedAccuracyMeters: typeof entry.recipientSignedAccuracyMeters === 'number' ? entry.recipientSignedAccuracyMeters : undefined,
    openCount: Number(entry.openCount || 0),
    downloadCount: Number(entry.downloadCount || 0),
    editCount: Number(entry.editCount || 0),
    lastOpenedAt: entry.lastOpenedAt,
    lastDownloadedAt: entry.lastDownloadedAt,
    lastEditedAt: entry.lastEditedAt,
    collaborationComments: Array.isArray(entry.collaborationComments) ? entry.collaborationComments.map((comment) => ({
      id: String(comment.id || `comment-${Date.now()}`),
      type: comment.type === 'review' ? 'review' : 'comment',
      message: String(comment.message || ''),
      authorName: String(comment.authorName || 'Anonymous'),
      createdAt: String(comment.createdAt || new Date().toISOString()),
      createdIp: comment.createdIp ? String(comment.createdIp) : undefined,
      replyMessage: comment.replyMessage ? String(comment.replyMessage) : undefined,
      repliedAt: comment.repliedAt ? String(comment.repliedAt) : undefined,
      repliedBy: comment.repliedBy ? String(comment.repliedBy) : undefined,
    })) : [],
    accessEvents: Array.isArray(entry.accessEvents) ? entry.accessEvents.map((event) => ({
      id: String(event.id || `evt-${Date.now()}`),
      eventType: normalizeEventType(event.eventType),
      createdAt: String(event.createdAt || new Date().toISOString()),
      ip: event.ip ? String(event.ip) : undefined,
      userAgent: event.userAgent ? String(event.userAgent) : undefined,
      deviceLabel: event.deviceLabel ? String(event.deviceLabel) : undefined,
      actorName: event.actorName ? String(event.actorName) : undefined,
    })) : [],
  };
}

function normalizeEventType(value: unknown): DocumentAccessEvent['eventType'] {
  switch (value) {
    case 'open':
    case 'download':
    case 'edit':
    case 'comment':
    case 'review':
    case 'sign':
    case 'upload':
    case 'verify':
      return value;
    default:
      return 'open';
  }
}

export function createAccessEvent(input: Omit<DocumentAccessEvent, 'id'>): DocumentAccessEvent {
  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ...input,
  };
}

export async function getHistoryEntries() {
  const history = await readJsonFile<HistoryInput[]>(historyFilePath, []);
  return history.map(normalizeHistoryEntry);
}

export async function saveHistoryEntries(entries: DocumentHistory[]) {
  await writeJsonFile(historyFilePath, entries);
}

export async function appendHistoryEntry(entry: HistoryInput) {
  const entries = await getHistoryEntries();
  const normalized = normalizeHistoryEntry(entry);
  entries.push(normalized);
  await saveHistoryEntries(entries);
  return normalized;
}

export async function updateHistoryEntry(id: string, updater: (entry: DocumentHistory) => DocumentHistory) {
  const entries = await getHistoryEntries();
  const index = entries.findIndex((entry) => entry.id === id);

  if (index === -1) {
    return null;
  }

  entries[index] = normalizeHistoryEntry(updater(entries[index]));
  await saveHistoryEntries(entries);
  return entries[index];
}

export function createEmailLogEntry(input: Omit<EmailLogEntry, 'id'>): EmailLogEntry {
  return {
    id: `email-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ...input,
  };
}
