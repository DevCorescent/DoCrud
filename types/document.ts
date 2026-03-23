export interface DocumentField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'date' | 'textarea' | 'number' | 'email' | 'select';
  required: boolean;
  options?: string[]; // For select fields
  placeholder?: string;
  order: number;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  fields: DocumentField[];
  template: string; // HTML string with {{fieldName}}
  isCustom: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'hr' | 'legal' | 'user';
  permissions: string[]; // Array of template IDs or 'all'
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface DocumentHistory {
  id: string;
  shareId?: string;
  shareUrl?: string;
  referenceNumber?: string;
  templateId: string;
  templateName: string;
  category?: string;
  data: Record<string, string>;
  generatedBy: string;
  generatedAt: string;
  previewHtml?: string;
  pdfUrl?: string;
  emailSent?: boolean;
  emailTo?: string;
  emailSubject?: string;
  emailSentAt?: string;
  emailStatus?: 'pending' | 'sent' | 'failed';
  emailError?: string;
  deliveryHistory?: EmailLogEntry[];
  automationNotes?: string[];
  signatureId?: string;
  signatureName?: string;
  signatureRole?: string;
  signatureSignedAt?: string;
  signatureSignedIp?: string;
  sharePassword?: string;
  requiredDocumentWorkflowEnabled?: boolean;
  requiredDocuments?: string[];
  submittedDocuments?: SubmittedDocument[];
  documentsSubmittedAt?: string;
  documentsSubmittedBy?: string;
  documentsVerificationStatus?: 'not_required' | 'pending' | 'verified' | 'rejected';
  documentsVerifiedAt?: string;
  documentsVerifiedBy?: string;
  documentsVerificationNotes?: string;
  recipientSignatureRequired?: boolean;
  recipientAccess?: RecipientAccessLevel;
  recipientSignerName?: string;
  recipientSignatureDataUrl?: string;
  recipientSignatureSource?: 'drawn' | 'uploaded';
  recipientSignedAt?: string;
  recipientSignedIp?: string;
  recipientSignedLocationLabel?: string;
  recipientSignedLatitude?: number;
  recipientSignedLongitude?: number;
  recipientSignedAccuracyMeters?: number;
  collaborationComments?: CollaborationComment[];
  openCount?: number;
  downloadCount?: number;
  editCount?: number;
  accessEvents?: DocumentAccessEvent[];
  lastOpenedAt?: string;
  lastDownloadedAt?: string;
  lastEditedAt?: string;
}

export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
}

export interface EmailLogEntry {
  id: string;
  to: string;
  subject: string;
  status: 'sent' | 'failed' | 'tested';
  sentAt: string;
  sentBy: string;
  error?: string;
}

export interface MailSettings {
  host: string;
  port: number;
  secure: boolean;
  requireAuth: boolean;
  username: string;
  password: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  testRecipient?: string;
}

export interface WorkflowAutomationSettings {
  autoGenerateReferenceNumber: boolean;
  autoStampGeneratedBy: boolean;
  autoBccAuditMailbox: boolean;
  auditMailbox: string;
  autoCcGenerator: boolean;
  enableDeliveryTracking: boolean;
}

export type RecipientAccessLevel = 'view' | 'comment' | 'edit';

export interface CollaborationComment {
  id: string;
  type: 'comment' | 'review';
  message: string;
  authorName: string;
  createdAt: string;
  createdIp?: string;
  replyMessage?: string;
  repliedAt?: string;
  repliedBy?: string;
}

export interface DocumentAccessEvent {
  id: string;
  eventType: 'open' | 'download' | 'edit' | 'comment' | 'review' | 'sign' | 'upload' | 'verify';
  createdAt: string;
  ip?: string;
  userAgent?: string;
  deviceLabel?: string;
  actorName?: string;
}

export interface CollaborationSettings {
  defaultRecipientAccess: RecipientAccessLevel;
}

export interface DashboardMetrics {
  totalDocuments: number;
  documentsThisWeek: number;
  emailsSent: number;
  templatesUsed: number;
  topTemplates: Array<{ templateName: string; count: number }>;
  recentActivity: DocumentHistory[];
  recentFeedback: Array<CollaborationComment & {
    documentId: string;
    shareUrl?: string;
    templateName: string;
    referenceNumber?: string;
  }>;
  documentSummary: Array<{
    id: string;
    shareUrl?: string;
    templateName: string;
    referenceNumber?: string;
    generatedAt: string;
    openCount: number;
    downloadCount: number;
    editCount: number;
    commentCount: number;
    reviewCount: number;
    signCount: number;
    uniqueDevices: string[];
    latestActivityAt?: string;
    latestActivityLabel?: string;
    pendingFeedbackCount: number;
    signedLocationLabel?: string;
    signedLatitude?: number;
    signedLongitude?: number;
    signedAccuracyMeters?: number;
    recipientSignedAt?: string;
    recipientSignedIp?: string;
    recipientSignerName?: string;
  }>;
  signatureLocationDistribution: Array<{
    locationLabel: string;
    count: number;
    documentIds: string[];
  }>;
}

export interface SignatureRecord {
  id: string;
  signerName: string;
  signerRole: string;
  signatureDataUrl: string;
  signedAt?: string;
  signedIp?: string;
  createdBy?: string;
}

export interface RecipientSignatureRecord {
  signerName: string;
  signatureDataUrl: string;
  signatureSource?: 'drawn' | 'uploaded';
  signedAt?: string;
  signedIp?: string;
  signedLocationLabel?: string;
  signedLatitude?: number;
  signedLongitude?: number;
  signedAccuracyMeters?: number;
}

export interface SignatureSettings {
  signatures: SignatureRecord[];
}

export interface SubmittedDocument {
  id: string;
  label: string;
  fileName: string;
  mimeType: string;
  dataUrl: string;
  uploadedAt: string;
}
