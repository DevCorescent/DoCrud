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

import type { DocumentDesignPreset } from '@/lib/document-designs';

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
  organizationId?: string;
  organizationName?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[]; // Array of template IDs or 'all'
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  roleProfileId?: string;
  roleProfileName?: string;
  organizationId?: string;
  organizationName?: string;
  organizationDomain?: string;
  subscription?: SaasSubscription;
  createdFromSignup?: boolean;
}

export type SaasFeatureKey =
  | 'dashboard'
  | 'document_summary'
  | 'generate_documents'
  | 'history'
  | 'client_portal'
  | 'tutorials'
  | 'analytics'
  | 'file_manager'
  | 'roles_permissions'
  | 'approvals'
  | 'versions'
  | 'clauses'
  | 'audit'
  | 'bulk_ops'
  | 'renewals'
  | 'integrations'
  | 'organizations'
  | 'ai_copilot'
  | 'api_docs'
  | 'branding';

export interface SaasPlan {
  id: string;
  name: string;
  description: string;
  priceLabel: string;
  billingModel: 'free' | 'payg' | 'subscription' | 'custom';
  includedFeatures: SaasFeatureKey[];
  freeDocumentGenerations: number;
  maxDocumentGenerations: number;
  overagePriceLabel?: string;
  watermarkOnFreeGenerations: boolean;
  isPublic: boolean;
  isDefault: boolean;
  active: boolean;
  ctaLabel?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaasSubscription {
  planId: string;
  planName: string;
  status: 'trial' | 'active' | 'upgrade_required' | 'suspended';
  startedAt: string;
  renewalDate?: string;
}

export interface SaasUsageSummary {
  totalGeneratedDocuments: number;
  freeGeneratedDocuments: number;
  remainingGenerations: number;
  limitReached: boolean;
}

export interface SaasOverview {
  plans: SaasPlan[];
  totalBusinessAccounts: number;
  activeBusinessAccounts: number;
  upgradeRequiredAccounts: number;
  totalGeneratedDocuments: number;
  onboardingCompletedAccounts: number;
  onboardingInProgressAccounts: number;
  onboardingCompletionRate: number;
  setupReadyAccounts: number;
  planDistribution: Array<{ planId: string; planName: string; businesses: number }>;
  industryDistribution: Array<{ industry: string; businesses: number }>;
  workspacePresetDistribution: Array<{ preset: string; businesses: number }>;
  recentSignups: Array<{
    userId: string;
    organizationName?: string;
    email: string;
    industry?: string;
    workspacePreset?: string;
    createdAt: string;
  }>;
  businessUsage: Array<{
    userId: string;
    name: string;
    email: string;
    organizationName?: string;
    industry?: string;
    companySize?: string;
    workspacePreset?: string;
    onboardingCompleted?: boolean;
    setupReadinessScore?: number;
    planId?: string;
    planName?: string;
    status?: string;
    generatedDocuments: number;
    remainingGenerations: number;
  }>;
}

export interface EmployeeCredential {
  email: string;
  temporaryPassword: string;
  generatedAt: string;
  lastSharedAt?: string;
}

export interface EmployeeQuestion {
  id: string;
  question: string;
  askedAt: string;
  askedBy: string;
  reply?: string;
  repliedAt?: string;
  repliedBy?: string;
  status: 'open' | 'resolved';
}

export interface BackgroundVerificationProfile {
  legalFullName?: string;
  preferredName?: string;
  personalEmail?: string;
  personalPhone?: string;
  alternatePhone?: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  maritalStatus?: string;
  fatherOrGuardianName?: string;
  motherName?: string;
  currentAddress?: string;
  currentAddressSince?: string;
  permanentAddress?: string;
  permanentAddressSince?: string;
  aadhaarNumber?: string;
  panNumber?: string;
  passportNumber?: string;
  voterIdNumber?: string;
  drivingLicenseNumber?: string;
  uanNumber?: string;
  pfNumber?: string;
  bankAccountHolderName?: string;
  bankAccountNumber?: string;
  bankIfscCode?: string;
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactPhone?: string;
  bloodGroup?: string;
  highestEducation?: string;
  institutionName?: string;
  courseName?: string;
  graduationYear?: string;
  previousEmployerName?: string;
  previousEmployerDesignation?: string;
  previousEmploymentStartDate?: string;
  previousEmploymentEndDate?: string;
  previousEmployerHrName?: string;
  previousEmployerHrEmail?: string;
  previousEmployerHrPhone?: string;
  referenceOneName?: string;
  referenceOneCompany?: string;
  referenceOnePhone?: string;
  referenceOneEmail?: string;
  referenceTwoName?: string;
  referenceTwoCompany?: string;
  referenceTwoPhone?: string;
  referenceTwoEmail?: string;
  criminalRecordDeclaration?: string;
  litigationDeclaration?: string;
  dualEmploymentDeclaration?: string;
  identityVerificationConsent?: boolean;
  addressVerificationConsent?: boolean;
  employmentVerificationConsent?: boolean;
  educationVerificationConsent?: boolean;
  criminalCheckConsent?: boolean;
  dataProcessingConsent?: boolean;
  lastUpdatedAt?: string;
}

export type OnboardingStage =
  | 'account_created'
  | 'documents_pending'
  | 'documents_submitted'
  | 'bgv_under_review'
  | 'bgv_verified'
  | 'ready_to_sign'
  | 'offer_signed'
  | 'completed';

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
  shareAccessPolicy?: 'standard' | 'expiring' | 'one_time';
  shareExpiresAt?: string;
  maxAccessCount?: number;
  revokedAt?: string;
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
  dataCollectionEnabled?: boolean;
  dataCollectionStatus?: DataCollectionStatus;
  dataCollectionInstructions?: string;
  dataCollectionSubmittedAt?: string;
  dataCollectionSubmittedBy?: string;
  dataCollectionReviewNotes?: string;
  dataCollectionReviewedAt?: string;
  dataCollectionReviewedBy?: string;
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
  editorState?: DocumentEditorState;
  managedFiles?: ManagedFile[];
  clientName?: string;
  clientEmail?: string;
  clientOrganization?: string;
  folderLabel?: string;
  organizationId?: string;
  organizationName?: string;
  versionSnapshots?: VersionSnapshot[];
  employeeName?: string;
  employeeEmail?: string;
  employeeDepartment?: string;
  employeeDesignation?: string;
  employeeCode?: string;
  onboardingRequired?: boolean;
  backgroundVerificationRequired?: boolean;
  backgroundVerificationStatus?: 'not_started' | 'in_progress' | 'submitted' | 'under_review' | 'verified' | 'rejected';
  backgroundVerificationNotes?: string;
  backgroundVerificationVerifiedAt?: string;
  backgroundVerificationVerifiedBy?: string;
  backgroundVerificationProfile?: BackgroundVerificationProfile;
  onboardingStage?: OnboardingStage;
  onboardingProgress?: number;
  onboardingCredentials?: EmployeeCredential;
  employeeQuestions?: EmployeeQuestion[];
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
export type DataCollectionStatus = 'disabled' | 'sent' | 'submitted' | 'changes_requested' | 'reviewed' | 'finalized';

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
  organizationId?: string;
  organizationName?: string;
}

export interface BusinessSettings {
  organizationId: string;
  organizationName: string;
  displayName: string;
  industry?: string;
  companySize?: string;
  primaryUseCase?: string;
  workspacePreset?: string;
  onboardingCompleted?: boolean;
  onboardingCompletedAt?: string;
  starterTemplatesSeededAt?: string;
  supportEmail: string;
  supportPhone: string;
  accentColor: string;
  watermarkLabel: string;
  letterheadMode?: 'default' | 'image' | 'html';
  letterheadImageDataUrl?: string;
  letterheadHtml?: string;
  businessDescription?: string;
  workspaceSetupChecklist?: {
    profileConfigured: boolean;
    brandingConfigured: boolean;
    starterTemplatesReady: boolean;
    signaturesReady: boolean;
    firstDocumentGenerated: boolean;
  };
  updatedAt: string;
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

export interface ManagedFile {
  id: string;
  name: string;
  category: 'attachment' | 'supporting' | 'policy' | 'media' | 'appendix';
  mimeType: string;
  dataUrl: string;
  sizeInBytes: number;
  uploadedAt: string;
  uploadedBy: string;
  notes?: string;
}

export interface DocumentEditorState {
  title?: string;
  lifecycleStage?: 'draft' | 'internal_review' | 'approved' | 'published' | 'archived';
  documentStatus?: 'active' | 'on_hold' | 'expired' | 'superseded';
  department?: string;
  owner?: string;
  reviewer?: string;
  classification?: 'public' | 'internal' | 'confidential' | 'restricted';
  versionLabel?: string;
  effectiveDate?: string;
  expiryDate?: string;
  tags?: string[];
  complianceNotes?: string;
  internalSummary?: string;
  clauseLibrary?: string[];
  layoutPreset?: 'formal' | 'executive' | 'legal' | 'hr' | 'client-ready';
  designPreset?: DocumentDesignPreset;
  watermarkLabel?: string;
  letterheadMode?: 'default' | 'image' | 'html';
  letterheadImageDataUrl?: string;
  letterheadHtml?: string;
}

export interface RoleProfile {
  id: string;
  name: string;
  description: string;
  baseRole: 'admin' | 'hr' | 'legal' | 'user';
  permissions: string[];
  governanceScopes: string[];
  createdAt: string;
  updatedAt: string;
  isSystem?: boolean;
}

export interface VersionSnapshot {
  id: string;
  versionLabel: string;
  createdAt: string;
  createdBy: string;
  summary?: string;
  previewHtml?: string;
}

export interface ThemeSettings {
  activeTheme: 'ember' | 'slate' | 'ocean' | 'forest' | 'midnight' | 'rose' | 'graphite';
  softwareName: string;
  accentLabel: string;
}

export interface WorkflowStep {
  id: string;
  label: string;
  ownerRole: string;
  slaHours?: number;
}

export interface WorkflowTemplateRecord {
  id: string;
  name: string;
  department: string;
  steps: WorkflowStep[];
  isActive: boolean;
}

export interface ClauseLibraryItem {
  id: string;
  title: string;
  category: string;
  body: string;
  tags: string[];
}

export interface IntegrationConfig {
  id: string;
  name: string;
  type: 'webhook' | 'crm' | 'hrms' | 'storage' | 'messaging';
  endpoint: string;
  status: 'active' | 'paused';
}

export interface OrganizationProfile {
  id: string;
  name: string;
  domain?: string;
  brandColor?: string;
  logoUrl?: string;
}

export interface ExpiryRule {
  id: string;
  name: string;
  daysBefore: number;
  actionLabel: string;
}

export interface PlatformConfig {
  workflows: WorkflowTemplateRecord[];
  clauses: ClauseLibraryItem[];
  integrations: IntegrationConfig[];
  organizations: OrganizationProfile[];
  expiryRules: ExpiryRule[];
  folderLibrary: string[];
}

export interface LandingPricingPlan {
  id: string;
  name: string;
  priceLabel: string;
  description: string;
  highlights: string[];
}

export interface LandingFeatureCard {
  id: string;
  title: string;
  description: string;
}

export interface LandingStat {
  id: string;
  value: string;
  label: string;
}

export interface LandingSoftwareModule {
  id: string;
  title: string;
  description: string;
  capabilities: string[];
}

export interface LandingScreenshotCard {
  id: string;
  title: string;
  description: string;
  imagePath: string;
}

export interface LandingHeroBanner {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  imagePath: string;
}

export interface LandingAudienceCard {
  id: string;
  businessType: string;
  usage: string;
  benefit: string;
}

export interface HomepageSectionToggles {
  hero: boolean;
  audiences: boolean;
  snapshot: boolean;
  softwareModules: boolean;
  screenshots: boolean;
  pricing: boolean;
  demo: boolean;
  contact: boolean;
}

export interface LandingSettings {
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  socialProofLabel: string;
  socialProofItems: string[];
  audienceSectionTitle: string;
  audienceSectionSubtitle: string;
  featureSectionTitle: string;
  softwareModulesTitle: string;
  softwareModulesSubtitle: string;
  pricingSectionTitle: string;
  pricingSectionSubtitle: string;
  pricingPageTitle: string;
  pricingPageSubtitle: string;
  contactEmail: string;
  contactPhone: string;
  contactHeading: string;
  contactSubtitle: string;
  contactPageTitle: string;
  contactPageSubtitle: string;
  demoPageTitle: string;
  demoPageSubtitle: string;
  demoBenefits: string[];
  screenshotsSectionTitle: string;
  screenshotsSectionSubtitle: string;
  featureHighlights: string[];
  featureCards: LandingFeatureCard[];
  stats: LandingStat[];
  softwareModules: LandingSoftwareModule[];
  featureScreenshots: LandingScreenshotCard[];
  heroBanners: LandingHeroBanner[];
  audienceProfiles: LandingAudienceCard[];
  pricingPlans: LandingPricingPlan[];
  enabledSections: HomepageSectionToggles;
}

export interface ContactRequest {
  id: string;
  requestType?: 'contact' | 'demo' | 'pricing';
  name: string;
  email: string;
  organization: string;
  phone?: string;
  message: string;
  preferredDate?: string;
  teamSize?: string;
  useCase?: string;
  createdAt: string;
}
