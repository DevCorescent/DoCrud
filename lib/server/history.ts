import { DocumentAccessEvent, DocumentHistory, EmailLogEntry } from '@/types/document';
import { DEFAULT_DOCUMENT_DESIGN_PRESET, isDocumentDesignPreset } from '@/lib/document-designs';
import { normalizeDocSheetWorkbook } from '@/lib/docsheet';
import { defaultBackgroundVerificationDocuments, deriveOnboardingProgress, deriveOnboardingStage, isOnboardingTemplate } from '@/lib/server/onboarding';
import { getHistoryEntriesFromRepository, saveHistoryEntriesToRepository } from '@/lib/server/repositories';

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
  return `DCR-${prefix}-${date}-${suffix}`;
}

export function generateSharePassword() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function normalizeHistoryEntry(entry: HistoryInput): DocumentHistory {
  const generatedAt = entry.generatedAt || new Date().toISOString();
  const shareId = entry.shareId || `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const shareRequiresPassword = entry.shareRequiresPassword !== false;
  const onboardingRequired = entry.onboardingRequired ?? isOnboardingTemplate(entry.templateId || entry.documentType, entry.category);
  const backgroundVerificationRequired = entry.backgroundVerificationRequired ?? onboardingRequired;
  const normalizedSubmittedDocuments = Array.isArray(entry.submittedDocuments) ? entry.submittedDocuments.map((document) => ({
    id: String(document.id || `submission-${Date.now()}`),
    label: String(document.label || 'Supporting Document'),
    fileName: String(document.fileName || 'document'),
    mimeType: String(document.mimeType || 'application/octet-stream'),
    dataUrl: String(document.dataUrl || ''),
    uploadedAt: String(document.uploadedAt || new Date().toISOString()),
  })) : [];
  const requiredDocuments = Array.isArray(entry.requiredDocuments) ? entry.requiredDocuments.map(String).filter(Boolean) : (backgroundVerificationRequired ? defaultBackgroundVerificationDocuments : []);
  const backgroundVerificationStatus =
    entry.backgroundVerificationStatus
    || (backgroundVerificationRequired ? (normalizedSubmittedDocuments.length ? 'submitted' : 'not_started') : 'not_started');
  const onboardingCredentials = entry.onboardingCredentials && typeof entry.onboardingCredentials === 'object'
    ? {
        email: String(entry.onboardingCredentials.email || entry.employeeEmail || entry.clientEmail || ''),
        temporaryPassword: String(entry.onboardingCredentials.temporaryPassword || ''),
        generatedAt: String(entry.onboardingCredentials.generatedAt || generatedAt),
        lastSharedAt: entry.onboardingCredentials.lastSharedAt ? String(entry.onboardingCredentials.lastSharedAt) : undefined,
      }
    : undefined;
  const employeeQuestions = Array.isArray(entry.employeeQuestions) ? entry.employeeQuestions.map((question, index) => ({
    id: String(question.id || `question-${Date.now()}-${index}`),
    question: String(question.question || ''),
    askedAt: String(question.askedAt || generatedAt),
    askedBy: String(question.askedBy || entry.employeeEmail || entry.clientEmail || 'employee'),
    reply: question.reply ? String(question.reply) : undefined,
    repliedAt: question.repliedAt ? String(question.repliedAt) : undefined,
    repliedBy: question.repliedBy ? String(question.repliedBy) : undefined,
    status: question.status === 'resolved' ? ('resolved' as const) : ('open' as const),
  })) : [];
  return {
    id: entry.id || Date.now().toString(),
    shareId,
    shareUrl: entry.shareUrl || `/documents/${shareId}`,
    referenceNumber: entry.referenceNumber || generateReferenceNumber(entry.templateName || entry.documentType || 'Document', generatedAt),
    documentSourceType: entry.documentSourceType === 'uploaded_pdf' ? 'uploaded_pdf' : 'generated',
    templateId: entry.templateId || entry.documentType || 'unknown-template',
    templateName: entry.templateName || entry.documentType || 'Untitled Document',
    category: entry.category || 'General',
    data: entry.data && typeof entry.data === 'object' ? Object.fromEntries(Object.entries(entry.data).map(([key, value]) => [key, String(value ?? '')])) : {},
    generatedBy: entry.generatedBy || 'unknown',
    generatedAt,
    previewHtml: entry.previewHtml,
    pdfUrl: entry.pdfUrl,
    uploadedPdfFileName: entry.uploadedPdfFileName ? String(entry.uploadedPdfFileName) : undefined,
    uploadedPdfMimeType: entry.uploadedPdfMimeType ? String(entry.uploadedPdfMimeType) : undefined,
    uploadedPdfDataUrl: entry.uploadedPdfDataUrl ? String(entry.uploadedPdfDataUrl) : undefined,
    signedPdfFileName: entry.signedPdfFileName ? String(entry.signedPdfFileName) : undefined,
    signedPdfDataUrl: entry.signedPdfDataUrl ? String(entry.signedPdfDataUrl) : undefined,
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
    sharePassword: shareRequiresPassword ? (entry.sharePassword || generateSharePassword()) : undefined,
    shareRequiresPassword,
    shareAccessPolicy: entry.shareAccessPolicy === 'expiring' || entry.shareAccessPolicy === 'one_time' ? entry.shareAccessPolicy : 'standard',
    shareExpiresAt: entry.shareExpiresAt ? String(entry.shareExpiresAt) : undefined,
    maxAccessCount: typeof entry.maxAccessCount === 'number' ? entry.maxAccessCount : undefined,
    revokedAt: entry.revokedAt ? String(entry.revokedAt) : undefined,
    requiredDocumentWorkflowEnabled: entry.requiredDocumentWorkflowEnabled ?? backgroundVerificationRequired,
    requiredDocuments,
    submittedDocuments: normalizedSubmittedDocuments,
    documentsSubmittedAt: entry.documentsSubmittedAt,
    documentsSubmittedBy: entry.documentsSubmittedBy,
    documentsVerificationStatus: entry.documentsVerificationStatus || (entry.requiredDocumentWorkflowEnabled ? 'pending' : 'not_required'),
    documentsVerifiedAt: entry.documentsVerifiedAt,
    documentsVerifiedBy: entry.documentsVerifiedBy,
    documentsVerificationNotes: entry.documentsVerificationNotes,
    recipientSignatureRequired: entry.recipientSignatureRequired ?? true,
    recipientAccess: entry.recipientAccess || 'comment',
    dataCollectionEnabled: Boolean(entry.dataCollectionEnabled),
    dataCollectionStatus: entry.dataCollectionEnabled
      ? (entry.dataCollectionStatus === 'submitted' || entry.dataCollectionStatus === 'changes_requested' || entry.dataCollectionStatus === 'reviewed' || entry.dataCollectionStatus === 'finalized' ? entry.dataCollectionStatus : 'sent')
      : 'disabled',
    dataCollectionInstructions: entry.dataCollectionInstructions ? String(entry.dataCollectionInstructions) : undefined,
    dataCollectionSubmittedAt: entry.dataCollectionSubmittedAt ? String(entry.dataCollectionSubmittedAt) : undefined,
    dataCollectionSubmittedBy: entry.dataCollectionSubmittedBy ? String(entry.dataCollectionSubmittedBy) : undefined,
    dataCollectionSubmissions: Array.isArray(entry.dataCollectionSubmissions)
      ? entry.dataCollectionSubmissions.map((submission, index) => ({
          id: String(submission.id || `submission-${Date.now()}-${index}`),
          submittedAt: String(submission.submittedAt || new Date().toISOString()),
          submittedBy: String(submission.submittedBy || 'Recipient'),
          data: submission.data && typeof submission.data === 'object'
            ? Object.fromEntries(Object.entries(submission.data).map(([key, value]) => [key, String(value ?? '')]))
            : {},
        }))
      : [],
    dataCollectionReviewNotes: entry.dataCollectionReviewNotes ? String(entry.dataCollectionReviewNotes) : undefined,
    dataCollectionReviewedAt: entry.dataCollectionReviewedAt ? String(entry.dataCollectionReviewedAt) : undefined,
    dataCollectionReviewedBy: entry.dataCollectionReviewedBy ? String(entry.dataCollectionReviewedBy) : undefined,
    recipientSignerName: entry.recipientSignerName,
    recipientSignatureDataUrl: entry.recipientSignatureDataUrl,
    recipientSignatureSource: entry.recipientSignatureSource === 'uploaded' ? 'uploaded' : entry.recipientSignatureSource === 'drawn' ? 'drawn' : undefined,
    recipientSignedAt: entry.recipientSignedAt,
    recipientSignedIp: entry.recipientSignedIp,
    recipientPhotoDataUrl: entry.recipientPhotoDataUrl ? String(entry.recipientPhotoDataUrl) : undefined,
    recipientPhotoCapturedAt: entry.recipientPhotoCapturedAt ? String(entry.recipientPhotoCapturedAt) : undefined,
    recipientPhotoCapturedIp: entry.recipientPhotoCapturedIp ? String(entry.recipientPhotoCapturedIp) : undefined,
    recipientPhotoCaptureMethod: entry.recipientPhotoCaptureMethod === 'live_camera' ? 'live_camera' : undefined,
    recipientAadhaarVerificationRequired: entry.recipientAadhaarVerificationRequired ?? undefined,
    recipientAadhaarVerifiedAt: entry.recipientAadhaarVerifiedAt ? String(entry.recipientAadhaarVerifiedAt) : undefined,
    recipientAadhaarVerifiedIp: entry.recipientAadhaarVerifiedIp ? String(entry.recipientAadhaarVerifiedIp) : undefined,
    recipientAadhaarReferenceId: entry.recipientAadhaarReferenceId ? String(entry.recipientAadhaarReferenceId) : undefined,
    recipientAadhaarMaskedId: entry.recipientAadhaarMaskedId ? String(entry.recipientAadhaarMaskedId) : undefined,
    recipientAadhaarVerificationMode: entry.recipientAadhaarVerificationMode === 'otp' ? 'otp' : undefined,
    recipientAadhaarProviderLabel: entry.recipientAadhaarProviderLabel ? String(entry.recipientAadhaarProviderLabel) : undefined,
    pendingRecipientPhotoDataUrl: entry.pendingRecipientPhotoDataUrl ? String(entry.pendingRecipientPhotoDataUrl) : undefined,
    pendingRecipientPhotoCapturedAt: entry.pendingRecipientPhotoCapturedAt ? String(entry.pendingRecipientPhotoCapturedAt) : undefined,
    pendingRecipientPhotoCapturedIp: entry.pendingRecipientPhotoCapturedIp ? String(entry.pendingRecipientPhotoCapturedIp) : undefined,
    pendingRecipientPhotoCaptureToken: entry.pendingRecipientPhotoCaptureToken ? String(entry.pendingRecipientPhotoCaptureToken) : undefined,
    pendingRecipientAadhaarTransactionId: entry.pendingRecipientAadhaarTransactionId ? String(entry.pendingRecipientAadhaarTransactionId) : undefined,
    pendingRecipientAadhaarMaskedId: entry.pendingRecipientAadhaarMaskedId ? String(entry.pendingRecipientAadhaarMaskedId) : undefined,
    pendingRecipientAadhaarRequestedAt: entry.pendingRecipientAadhaarRequestedAt ? String(entry.pendingRecipientAadhaarRequestedAt) : undefined,
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
    editorState: entry.editorState && typeof entry.editorState === 'object'
      ? {
          title: entry.editorState.title ? String(entry.editorState.title) : undefined,
          lifecycleStage: entry.editorState.lifecycleStage === 'internal_review' || entry.editorState.lifecycleStage === 'approved' || entry.editorState.lifecycleStage === 'published' || entry.editorState.lifecycleStage === 'archived' ? entry.editorState.lifecycleStage : 'draft',
          documentStatus: entry.editorState.documentStatus === 'on_hold' || entry.editorState.documentStatus === 'expired' || entry.editorState.documentStatus === 'superseded' ? entry.editorState.documentStatus : 'active',
          department: entry.editorState.department ? String(entry.editorState.department) : undefined,
          owner: entry.editorState.owner ? String(entry.editorState.owner) : undefined,
          reviewer: entry.editorState.reviewer ? String(entry.editorState.reviewer) : undefined,
          classification: entry.editorState.classification === 'public' || entry.editorState.classification === 'confidential' || entry.editorState.classification === 'restricted' ? entry.editorState.classification : 'internal',
          versionLabel: entry.editorState.versionLabel ? String(entry.editorState.versionLabel) : undefined,
          effectiveDate: entry.editorState.effectiveDate ? String(entry.editorState.effectiveDate) : undefined,
          expiryDate: entry.editorState.expiryDate ? String(entry.editorState.expiryDate) : undefined,
          tags: Array.isArray(entry.editorState.tags) ? entry.editorState.tags.map(String).filter(Boolean) : [],
          complianceNotes: entry.editorState.complianceNotes ? String(entry.editorState.complianceNotes) : undefined,
          internalSummary: entry.editorState.internalSummary ? String(entry.editorState.internalSummary) : undefined,
          clauseLibrary: Array.isArray(entry.editorState.clauseLibrary) ? entry.editorState.clauseLibrary.map(String).filter(Boolean) : [],
          layoutPreset: entry.editorState.layoutPreset === 'executive' || entry.editorState.layoutPreset === 'legal' || entry.editorState.layoutPreset === 'hr' || entry.editorState.layoutPreset === 'client-ready' ? entry.editorState.layoutPreset : 'formal',
          designPreset: isDocumentDesignPreset(entry.editorState.designPreset) ? entry.editorState.designPreset : DEFAULT_DOCUMENT_DESIGN_PRESET,
          watermarkLabel: entry.editorState.watermarkLabel ? String(entry.editorState.watermarkLabel) : undefined,
          letterheadMode: entry.editorState.letterheadMode === 'image' || entry.editorState.letterheadMode === 'html' ? entry.editorState.letterheadMode : 'default',
          letterheadImageDataUrl: entry.editorState.letterheadImageDataUrl ? String(entry.editorState.letterheadImageDataUrl) : undefined,
          letterheadHtml: entry.editorState.letterheadHtml ? String(entry.editorState.letterheadHtml) : undefined,
        }
      : {
          title: entry.templateName || entry.documentType || 'Untitled Document',
          lifecycleStage: 'draft',
          documentStatus: 'active',
          classification: 'internal',
          tags: [],
          clauseLibrary: [],
          layoutPreset: 'formal',
          designPreset: DEFAULT_DOCUMENT_DESIGN_PRESET,
          letterheadMode: 'default',
        },
    managedFiles: Array.isArray(entry.managedFiles) ? entry.managedFiles.map((file) => ({
      id: String(file.id || `file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
      name: String(file.name || 'untitled-file'),
      category: file.category === 'supporting' || file.category === 'policy' || file.category === 'media' || file.category === 'appendix' ? file.category : 'attachment',
      mimeType: String(file.mimeType || 'application/octet-stream'),
      dataUrl: String(file.dataUrl || ''),
      sizeInBytes: Number(file.sizeInBytes || 0),
      uploadedAt: String(file.uploadedAt || new Date().toISOString()),
      uploadedBy: String(file.uploadedBy || entry.generatedBy || 'system'),
      notes: file.notes ? String(file.notes) : undefined,
    })) : [],
    clientName: entry.clientName ? String(entry.clientName) : undefined,
    clientEmail: entry.clientEmail ? String(entry.clientEmail).toLowerCase() : undefined,
    clientOrganization: entry.clientOrganization ? String(entry.clientOrganization) : undefined,
    folderLabel: entry.folderLabel ? String(entry.folderLabel) : undefined,
    organizationId: entry.organizationId ? String(entry.organizationId) : undefined,
    organizationName: entry.organizationName ? String(entry.organizationName) : undefined,
    versionSnapshots: Array.isArray(entry.versionSnapshots) ? entry.versionSnapshots.map((snapshot, index) => ({
      id: String(snapshot.id || `version-${Date.now()}-${index}`),
      versionLabel: String(snapshot.versionLabel || `v${index + 1}`),
      createdAt: String(snapshot.createdAt || new Date().toISOString()),
      createdBy: String(snapshot.createdBy || entry.generatedBy || 'system'),
      summary: snapshot.summary ? String(snapshot.summary) : undefined,
      previewHtml: snapshot.previewHtml ? String(snapshot.previewHtml) : undefined,
    })) : [],
    employeeName: entry.employeeName ? String(entry.employeeName) : (entry.clientName ? String(entry.clientName) : undefined),
    employeeEmail: entry.employeeEmail ? String(entry.employeeEmail).toLowerCase() : (entry.clientEmail ? String(entry.clientEmail).toLowerCase() : undefined),
    employeeDepartment: entry.employeeDepartment ? String(entry.employeeDepartment) : undefined,
    employeeDesignation: entry.employeeDesignation ? String(entry.employeeDesignation) : undefined,
    employeeCode: entry.employeeCode ? String(entry.employeeCode) : undefined,
    onboardingRequired,
    backgroundVerificationRequired,
    backgroundVerificationStatus,
    backgroundVerificationNotes: entry.backgroundVerificationNotes ? String(entry.backgroundVerificationNotes) : undefined,
    backgroundVerificationVerifiedAt: entry.backgroundVerificationVerifiedAt ? String(entry.backgroundVerificationVerifiedAt) : undefined,
    backgroundVerificationVerifiedBy: entry.backgroundVerificationVerifiedBy ? String(entry.backgroundVerificationVerifiedBy) : undefined,
    backgroundVerificationProfile: entry.backgroundVerificationProfile && typeof entry.backgroundVerificationProfile === 'object'
      ? {
          ...entry.backgroundVerificationProfile,
          lastUpdatedAt: entry.backgroundVerificationProfile.lastUpdatedAt ? String(entry.backgroundVerificationProfile.lastUpdatedAt) : undefined,
        }
      : undefined,
    onboardingCredentials,
    employeeQuestions,
    onboardingStage: entry.onboardingStage || deriveOnboardingStage({
      ...entry,
      submittedDocuments: normalizedSubmittedDocuments,
      backgroundVerificationStatus,
      onboardingCredentials,
      recipientSignedAt: entry.recipientSignedAt,
    }),
    onboardingProgress: typeof entry.onboardingProgress === 'number' ? entry.onboardingProgress : deriveOnboardingProgress({
      ...entry,
      submittedDocuments: normalizedSubmittedDocuments,
      backgroundVerificationStatus,
      onboardingCredentials,
      recipientSignedAt: entry.recipientSignedAt,
    }),
    docsheetWorkbook: entry.docsheetWorkbook ? normalizeDocSheetWorkbook(entry.docsheetWorkbook) : undefined,
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
    case 'camera_capture':
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
  const history = await getHistoryEntriesFromRepository();
  return history.map(normalizeHistoryEntry);
}

export async function saveHistoryEntries(entries: DocumentHistory[]) {
  await saveHistoryEntriesToRepository(entries);
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

export async function deleteHistoryEntry(id: string) {
  const entries = await getHistoryEntries();
  const nextEntries = entries.filter((entry) => entry.id !== id);
  if (nextEntries.length === entries.length) {
    return false;
  }
  await saveHistoryEntries(nextEntries);
  return true;
}

export function createEmailLogEntry(input: Omit<EmailLogEntry, 'id'>): EmailLogEntry {
  return {
    id: `email-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ...input,
  };
}
