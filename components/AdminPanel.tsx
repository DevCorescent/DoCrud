'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CollaborationSettings, ContactRequest, DocumentHistory, DocumentTemplate, LandingPricingPlan, LandingSettings, MailSettings, SaasFeatureKey, SaasOverview, SaasPlan, SignatureRecord, SignatureSettings, ThemeSettings, User, WorkflowAutomationSettings } from '@/types/document';
import { Plus, Edit, Trash2, Users, FileText, Shield, Mail, Zap, CheckCircle2, PenTool, MessageSquare, FolderOpen, Search, ExternalLink, Download, LayoutTemplate, BadgeIndianRupee } from 'lucide-react';
import TemplateEditor from './TemplateEditor';
import SignaturePad from './SignaturePad';
import { buildGoogleMapsLink, formatSignatureLocation } from '@/lib/location';
import FeatureGuide from './FeatureGuide';
import { getWorkspacePresetLabel, industryOptions } from '@/lib/industry-presets';

const emptyMailSettings: MailSettings = {
  host: '',
  port: 587,
  secure: false,
  requireAuth: true,
  username: '',
  password: '',
  fromName: 'docrud',
  fromEmail: '',
  replyTo: '',
  testRecipient: '',
};

const emptyAutomationSettings: WorkflowAutomationSettings = {
  autoGenerateReferenceNumber: true,
  autoStampGeneratedBy: true,
  autoBccAuditMailbox: false,
  auditMailbox: '',
  autoCcGenerator: false,
  enableDeliveryTracking: true,
};

const emptySignatureDraft = {
  signerName: '',
  signerRole: '',
  signatureDataUrl: '',
};

const emptyCollaborationSettings: CollaborationSettings = {
  defaultRecipientAccess: 'comment',
};

const emptyThemeSettings: ThemeSettings = {
  activeTheme: 'ember',
  softwareName: 'docrud',
  accentLabel: 'Premium Document Operations',
};

const emptyLandingSettings: LandingSettings = {
  heroBadge: '',
  heroTitle: '',
  heroSubtitle: '',
  primaryCtaLabel: '',
  primaryCtaHref: '#contact-us',
  secondaryCtaLabel: '',
  secondaryCtaHref: '/login',
  socialProofLabel: '',
  socialProofItems: [''],
  featureSectionTitle: '',
  softwareModulesTitle: '',
  softwareModulesSubtitle: '',
  pricingSectionTitle: '',
  pricingSectionSubtitle: '',
  pricingPageTitle: '',
  pricingPageSubtitle: '',
  contactEmail: '',
  contactPhone: '',
  contactHeading: '',
  contactSubtitle: '',
  contactPageTitle: '',
  contactPageSubtitle: '',
  demoPageTitle: '',
  demoPageSubtitle: '',
  demoBenefits: [''],
  screenshotsSectionTitle: '',
  screenshotsSectionSubtitle: '',
  featureHighlights: [''],
  featureCards: [],
  stats: [],
  softwareModules: [],
  featureScreenshots: [],
  pricingPlans: [],
  enabledSections: {
    hero: true,
    snapshot: true,
    softwareModules: true,
    screenshots: true,
    pricing: true,
    demo: true,
    contact: true,
  },
};

const emptyPricingPlan: LandingPricingPlan = {
  id: '',
  name: '',
  priceLabel: '',
  description: '',
  highlights: [''],
};

const saasFeatureCatalog: Array<{ key: SaasFeatureKey; label: string }> = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'document_summary', label: 'Document Summary' },
  { key: 'generate_documents', label: 'Document Generation' },
  { key: 'history', label: 'History' },
  { key: 'client_portal', label: 'Client Portal' },
  { key: 'tutorials', label: 'Tutorials' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'file_manager', label: 'File Manager' },
  { key: 'roles_permissions', label: 'Roles & Permissions' },
  { key: 'approvals', label: 'Approvals' },
  { key: 'versions', label: 'Versions' },
  { key: 'clauses', label: 'Clauses' },
  { key: 'audit', label: 'Audit' },
  { key: 'bulk_ops', label: 'Bulk Ops' },
  { key: 'renewals', label: 'Renewals' },
  { key: 'integrations', label: 'Integrations' },
  { key: 'organizations', label: 'Organizations' },
  { key: 'ai_copilot', label: 'AI Copilot' },
  { key: 'api_docs', label: 'API Docs' },
  { key: 'branding', label: 'Branding Controls' },
];

const emptySaasPlan: SaasPlan = {
  id: '',
  name: '',
  description: '',
  priceLabel: '',
  billingModel: 'subscription',
  includedFeatures: ['dashboard', 'document_summary', 'generate_documents', 'history', 'client_portal', 'tutorials'],
  freeDocumentGenerations: 5,
  maxDocumentGenerations: 5,
  overagePriceLabel: '',
  watermarkOnFreeGenerations: true,
  isPublic: true,
  isDefault: false,
  active: true,
  ctaLabel: 'Choose Plan',
  createdAt: '',
  updatedAt: '',
};

export default function AdminPanel() {
  const { data: session } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [mailSettings, setMailSettings] = useState<MailSettings>(emptyMailSettings);
  const [automationSettings, setAutomationSettings] = useState<WorkflowAutomationSettings>(emptyAutomationSettings);
  const [signatureSettings, setSignatureSettings] = useState<SignatureSettings>({ signatures: [] });
  const [collaborationSettings, setCollaborationSettings] = useState<CollaborationSettings>(emptyCollaborationSettings);
  const [documents, setDocuments] = useState<DocumentHistory[]>([]);
  const [onboardingRecords, setOnboardingRecords] = useState<DocumentHistory[]>([]);
  const [saasOverview, setSaasOverview] = useState<SaasOverview | null>(null);
  const [saasPlans, setSaasPlans] = useState<SaasPlan[]>([]);
  const [saasPlanDraft, setSaasPlanDraft] = useState<SaasPlan>(emptySaasPlan);
  const [editingSaasPlanId, setEditingSaasPlanId] = useState('');
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>(emptyThemeSettings);
  const [landingSettings, setLandingSettings] = useState<LandingSettings>(emptyLandingSettings);
  const [contactRequests, setContactRequests] = useState<ContactRequest[]>([]);
  const [documentSearch, setDocumentSearch] = useState('');
  const [documentStatusFilter, setDocumentStatusFilter] = useState<'all' | 'pending' | 'verified' | 'rejected' | 'not_required'>('all');
  const [collectionFilter, setCollectionFilter] = useState<'all' | 'collection_only' | 'sent' | 'submitted' | 'changes_requested' | 'reviewed' | 'finalized'>('all');
  const [documentPage, setDocumentPage] = useState(1);
  const [signatureDraft, setSignatureDraft] = useState(emptySignatureDraft);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user' as 'admin' | 'hr' | 'legal' | 'user' | 'client' | 'employee',
    permissions: [] as string[],
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [smtpTesting, setSmtpTesting] = useState(false);

  const isAdmin = session?.user?.role === 'admin';
  const documentsPerPage = 6;

  useEffect(() => {
    if (isAdmin) {
      void Promise.all([fetchUsers(), fetchTemplates(), fetchMailSettings(), fetchAutomationSettings(), fetchSignatureSettings(), fetchCollaborationSettings(), fetchDocuments(), fetchOnboardingRecords(), fetchSaasOverview(), fetchSaasPlans(), fetchThemeSettings(), fetchLandingSettings(), fetchContactRequests()]);
    }
  }, [isAdmin]);

  useEffect(() => {
    const firstSharePath = documents.find((document) => document.shareUrl)?.shareUrl;
    if (firstSharePath) {
      router.prefetch(firstSharePath);
    }
  }, [documents, router]);

  const fetchUsers = async () => {
    const response = await fetch('/api/users');
    if (response.ok) setUsers(await response.json());
  };

  const fetchTemplates = async () => {
    const response = await fetch('/api/templates');
    if (response.ok) setTemplates(await response.json());
  };

  const fetchMailSettings = async () => {
    const response = await fetch('/api/settings/mail');
    if (response.ok) setMailSettings(await response.json());
  };

  const fetchAutomationSettings = async () => {
    const response = await fetch('/api/settings/automation');
    if (response.ok) setAutomationSettings(await response.json());
  };

  const fetchSignatureSettings = async () => {
    const response = await fetch('/api/settings/signature');
    if (response.ok) setSignatureSettings(await response.json());
  };

  const fetchCollaborationSettings = async () => {
    const response = await fetch('/api/settings/collaboration');
    if (response.ok) setCollaborationSettings(await response.json());
  };

  const fetchDocuments = async () => {
    const response = await fetch('/api/documents');
    if (response.ok) {
      const payload = await response.json();
      setDocuments(
        [...payload].sort((left: DocumentHistory, right: DocumentHistory) =>
          new Date(right.generatedAt).getTime() - new Date(left.generatedAt).getTime(),
        ),
      );
    }
  };

  const fetchOnboardingRecords = async () => {
    const response = await fetch('/api/onboarding');
    if (response.ok) {
      const payload = await response.json();
      setOnboardingRecords(
        [...payload].sort((left: DocumentHistory, right: DocumentHistory) =>
          new Date(right.generatedAt).getTime() - new Date(left.generatedAt).getTime(),
        ),
      );
    }
  };

  const fetchThemeSettings = async () => {
    const response = await fetch('/api/settings/theme');
    if (response.ok) setThemeSettings(await response.json());
  };

  const fetchLandingSettings = async () => {
    const response = await fetch('/api/settings/landing');
    if (response.ok) setLandingSettings(await response.json());
  };

  const fetchContactRequests = async () => {
    const response = await fetch('/api/contact-requests');
    if (response.ok) setContactRequests(await response.json());
  };

  const fetchSaasOverview = async () => {
    const response = await fetch('/api/saas/overview');
    if (response.ok) setSaasOverview(await response.json());
  };

  const fetchSaasPlans = async () => {
    const response = await fetch('/api/saas/plans');
    if (response.ok) setSaasPlans(await response.json());
  };

  const filteredDocuments = useMemo(() => {
    const query = documentSearch.trim().toLowerCase();
    return documents.filter((document) => {
      const matchesSearch = !query || [
        document.templateName,
        document.referenceNumber,
        document.generatedBy,
        document.documentsSubmittedBy,
        document.shareUrl,
      ].some((value) => value?.toLowerCase().includes(query));
      const status = document.requiredDocumentWorkflowEnabled ? (document.documentsVerificationStatus || 'pending') : 'not_required';
      const matchesStatus = documentStatusFilter === 'all' || status === documentStatusFilter;
      const matchesCollection = collectionFilter === 'all'
        || (collectionFilter === 'collection_only' && Boolean(document.dataCollectionEnabled))
        || (collectionFilter === 'sent' && document.dataCollectionStatus === 'sent')
        || (collectionFilter === 'submitted' && document.dataCollectionStatus === 'submitted')
        || (collectionFilter === 'changes_requested' && document.dataCollectionStatus === 'changes_requested')
        || (collectionFilter === 'reviewed' && document.dataCollectionStatus === 'reviewed')
        || (collectionFilter === 'finalized' && document.dataCollectionStatus === 'finalized');
      return matchesSearch && matchesStatus && matchesCollection;
    });
  }, [collectionFilter, documentSearch, documentStatusFilter, documents]);

  const paginatedDocuments = useMemo(() => {
    const start = (documentPage - 1) * documentsPerPage;
    return filteredDocuments.slice(start, start + documentsPerPage);
  }, [documentPage, filteredDocuments]);
  const collectionDocuments = useMemo(
    () => documents.filter((document) => document.dataCollectionEnabled),
    [documents]
  );

  const totalDocumentPages = Math.max(1, Math.ceil(filteredDocuments.length / documentsPerPage));
  const pendingDocuments = documents.filter((document) => document.requiredDocumentWorkflowEnabled && (document.documentsVerificationStatus || 'pending') === 'pending').length;
  const verifiedDocuments = documents.filter((document) => document.documentsVerificationStatus === 'verified').length;
  const rejectedDocuments = documents.filter((document) => document.documentsVerificationStatus === 'rejected').length;
  const collectionRequests = documents.filter((document) => document.dataCollectionEnabled).length;
  const collectionSubmitted = documents.filter((document) => document.dataCollectionStatus === 'submitted').length;
  const collectionReviewed = documents.filter((document) => document.dataCollectionStatus === 'reviewed').length;
  const onboardingPendingCount = onboardingRecords.filter((record) => ['submitted', 'under_review', 'in_progress', 'not_started'].includes(record.backgroundVerificationStatus || 'not_started')).length;
  const onboardingVerifiedCount = onboardingRecords.filter((record) => record.backgroundVerificationStatus === 'verified').length;
  const onboardingRejectedCount = onboardingRecords.filter((record) => record.backgroundVerificationStatus === 'rejected').length;

  useEffect(() => {
    setDocumentPage(1);
  }, [collectionFilter, documentSearch, documentStatusFilter]);

  const getRolePermissions = (role: string) => {
    const rolePermissions: Record<string, string[]> = {
      admin: ['all'],
      hr: ['internship-letter'],
      legal: ['nda', 'contractual-agreement'],
      client: ['all'],
      employee: [],
      user: [],
    };
    return rolePermissions[role] || [];
  };

  const resetUserDialog = () => {
    setShowUserDialog(false);
    setEditingUser(null);
    setErrorMessage('');
    setUserForm({ name: '', email: '', password: '', role: 'user', permissions: [] });
  };

  const handleSaveUser = async () => {
    try {
      const method = editingUser ? 'PUT' : 'POST';
      const response = await fetch('/api/users', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editingUser ? { id: editingUser.id } : {}),
          ...userForm,
          isActive: true,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Failed to save user');
      }
      await fetchUsers();
      resetUserDialog();
      setSuccessMessage(editingUser ? 'User updated successfully.' : 'User created successfully.');
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    const response = await fetch(`/api/users?id=${userId}`, { method: 'DELETE' });
    if (response.ok) {
      await fetchUsers();
      setSuccessMessage('User deleted successfully.');
    }
  };

  const handleSaveTemplate = async (template: DocumentTemplate) => {
    const method = template.id.startsWith('custom-') && templates.find((entry) => entry.id === template.id) ? 'PUT' : 'POST';
    const response = await fetch('/api/templates/manage', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template),
    });
    if (response.ok) {
      setShowTemplateEditor(false);
      setEditingTemplate(null);
      await fetchTemplates();
      setSuccessMessage('Template saved successfully.');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    const response = await fetch(`/api/templates/manage?id=${templateId}`, { method: 'DELETE' });
    if (response.ok) {
      await fetchTemplates();
      setSuccessMessage('Template deleted successfully.');
    }
  };

  const saveMailConfiguration = async () => {
    const response = await fetch('/api/settings/mail', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mailSettings),
    });
    if (response.ok) {
      setMailSettings(await response.json());
      setSuccessMessage('Mail settings saved successfully.');
      setErrorMessage('');
    } else {
      setErrorMessage('Failed to save mail settings.');
    }
  };

  const testSmtp = async () => {
    setSmtpTesting(true);
    try {
      const response = await fetch('/api/settings/mail/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testRecipient: mailSettings.testRecipient }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'SMTP test failed');
      setSuccessMessage(payload?.message || 'SMTP test succeeded.');
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'SMTP test failed');
    } finally {
      setSmtpTesting(false);
    }
  };

  const saveAutomationConfiguration = async () => {
    const response = await fetch('/api/settings/automation', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(automationSettings),
    });
    if (response.ok) {
      setAutomationSettings(await response.json());
      setSuccessMessage('Automation settings saved successfully.');
      setErrorMessage('');
    } else {
      setErrorMessage('Failed to save automation settings.');
    }
  };

  const saveCollaborationConfiguration = async () => {
    const response = await fetch('/api/settings/collaboration', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(collaborationSettings),
    });
    if (response.ok) {
      setCollaborationSettings(await response.json());
      setSuccessMessage('Collaboration access settings saved successfully.');
      setErrorMessage('');
    } else {
      setErrorMessage('Failed to save collaboration access settings.');
    }
  };

  const saveThemeConfiguration = async () => {
    const response = await fetch('/api/settings/theme', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(themeSettings),
    });
    if (response.ok) {
      setThemeSettings(await response.json());
      setSuccessMessage('Theme settings saved successfully.');
      setErrorMessage('');
    } else {
      setErrorMessage('Failed to save theme settings.');
    }
  };

  const saveLandingConfiguration = async () => {
    const response = await fetch('/api/settings/landing', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...landingSettings,
        heroBadge: landingSettings.heroBadge.trim(),
        secondaryCtaLabel: landingSettings.secondaryCtaLabel.trim(),
        secondaryCtaHref: landingSettings.secondaryCtaHref.trim(),
        socialProofLabel: landingSettings.socialProofLabel.trim(),
        socialProofItems: landingSettings.socialProofItems.map((item) => item.trim()).filter(Boolean),
        featureSectionTitle: landingSettings.featureSectionTitle.trim(),
        softwareModulesTitle: landingSettings.softwareModulesTitle.trim(),
        softwareModulesSubtitle: landingSettings.softwareModulesSubtitle.trim(),
        pricingSectionTitle: landingSettings.pricingSectionTitle.trim(),
        pricingSectionSubtitle: landingSettings.pricingSectionSubtitle.trim(),
        pricingPageTitle: landingSettings.pricingPageTitle.trim(),
        pricingPageSubtitle: landingSettings.pricingPageSubtitle.trim(),
        contactSubtitle: landingSettings.contactSubtitle.trim(),
        contactPageTitle: landingSettings.contactPageTitle.trim(),
        contactPageSubtitle: landingSettings.contactPageSubtitle.trim(),
        demoPageTitle: landingSettings.demoPageTitle.trim(),
        demoPageSubtitle: landingSettings.demoPageSubtitle.trim(),
        demoBenefits: landingSettings.demoBenefits.map((item) => item.trim()).filter(Boolean),
        screenshotsSectionTitle: landingSettings.screenshotsSectionTitle.trim(),
        screenshotsSectionSubtitle: landingSettings.screenshotsSectionSubtitle.trim(),
        featureHighlights: landingSettings.featureHighlights.map((item) => item.trim()).filter(Boolean),
        featureCards: landingSettings.featureCards
          .map((card, index) => ({
            ...card,
            id: card.id?.trim() || `feature-${index + 1}`,
            title: card.title.trim(),
            description: card.description.trim(),
          }))
          .filter((card) => card.title && card.description),
        stats: landingSettings.stats
          .map((stat, index) => ({
            ...stat,
            id: stat.id?.trim() || `stat-${index + 1}`,
            value: stat.value.trim(),
            label: stat.label.trim(),
          }))
          .filter((stat) => stat.value && stat.label),
        softwareModules: landingSettings.softwareModules
          .map((module, index) => ({
            ...module,
            id: module.id?.trim() || `module-${index + 1}`,
            title: module.title.trim(),
            description: module.description.trim(),
            capabilities: module.capabilities.map((item) => item.trim()).filter(Boolean),
          }))
          .filter((module) => module.title && module.description),
        featureScreenshots: landingSettings.featureScreenshots
          .map((shot, index) => ({
            ...shot,
            id: shot.id?.trim() || `screenshot-${index + 1}`,
            title: shot.title.trim(),
            description: shot.description.trim(),
            imagePath: shot.imagePath.trim(),
          }))
          .filter((shot) => shot.title && shot.description && shot.imagePath),
        pricingPlans: landingSettings.pricingPlans.map((plan, index) => ({
          ...plan,
          id: plan.id?.trim() || `plan-${index + 1}`,
          name: plan.name.trim(),
          priceLabel: plan.priceLabel.trim(),
          description: plan.description.trim(),
          highlights: plan.highlights.map((item) => item.trim()).filter(Boolean),
        })).filter((plan) => plan.name && plan.priceLabel),
        enabledSections: landingSettings.enabledSections,
      }),
    });
    if (response.ok) {
      setLandingSettings(await response.json());
      setSuccessMessage('Homepage content saved successfully.');
      setErrorMessage('');
    } else {
      setErrorMessage('Failed to save homepage content.');
    }
  };

  const addSignature = async () => {
    const response = await fetch('/api/settings/signature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signatureDraft),
    });
    const payload = await response.json().catch(() => null);
    if (response.ok) {
      setSignatureSettings(payload);
      setSignatureDraft(emptySignatureDraft);
      setSuccessMessage('Authorized signature saved successfully.');
      setErrorMessage('');
    } else {
      setErrorMessage(payload?.error || 'Failed to save signature');
    }
  };

  const deleteSignature = async (signature: SignatureRecord) => {
    if (!confirm(`Delete signature for ${signature.signerName}?`)) return;
    const response = await fetch(`/api/settings/signature?id=${signature.id}`, { method: 'DELETE' });
    const payload = await response.json().catch(() => null);
    if (response.ok) {
      setSignatureSettings(payload);
      setSuccessMessage('Signature deleted successfully.');
      setErrorMessage('');
    } else {
      setErrorMessage(payload?.error || 'Failed to delete signature');
    }
  };

  const updateDocumentVerification = async (documentId: string, status: 'verified' | 'rejected') => {
    const notes = prompt(status === 'verified' ? 'Optional verification note' : 'Reason for rejection') || '';
    const response = await fetch('/api/documents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: documentId,
        documentsVerificationStatus: status,
        documentsVerificationNotes: notes,
      }),
    });
    const payload = await response.json().catch(() => null);
    if (response.ok) {
      await fetchDocuments();
      setSuccessMessage(`Document requirements ${status} successfully.`);
      setErrorMessage('');
    } else {
      setErrorMessage(payload?.error || 'Failed to update document verification');
    }
  };

  const sendCollectionRequestEmail = async (document: DocumentHistory) => {
    const recipient = prompt('Recipient email for the collection request', document.clientEmail || document.employeeEmail || document.emailTo || '')?.trim() || '';
    if (!recipient) {
      return;
    }

    const shareLink = document.shareUrl ? (document.shareUrl.startsWith('http') ? document.shareUrl : `${window.location.origin}${document.shareUrl}`) : '';
    const passwordLine = document.sharePassword ? `Access password: ${document.sharePassword}` : '';
    const instructionsLine = document.dataCollectionInstructions?.trim() ? `Instructions: ${document.dataCollectionInstructions.trim()}` : '';

    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        historyId: document.id,
        to: recipient,
        subject: `Complete requested form: ${document.templateName}`,
        text: [
          `Please complete the requested ${document.templateName} form from docrud.`,
          shareLink ? `Form link: ${shareLink}` : '',
          passwordLine,
          instructionsLine,
          'Your submitted information will be reviewed by admin before final document issuance.',
        ].filter(Boolean).join('\n\n'),
        emailType: 'collection_request',
      }),
    });
    const payload = await response.json().catch(() => null);
    if (response.ok) {
      await fetchDocuments();
      setSuccessMessage('Collection request email sent successfully.');
      setErrorMessage('');
    } else {
      setErrorMessage(payload?.error || 'Failed to send collection request email');
    }
  };

  const finalizeCollectionRequest = async (document: DocumentHistory) => {
    const response = await fetch('/api/documents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: document.id,
        dataCollectionStatus: 'finalized',
        automationNotes: ['Collection request finalized by admin and prepared for final document generation'],
      }),
    });
    const payload = await response.json().catch(() => null);
    if (response.ok) {
      await fetchDocuments();
      setSuccessMessage('Collection request finalized and ready for final document generation.');
      setErrorMessage('');
    } else {
      setErrorMessage(payload?.error || 'Failed to finalize collection request');
    }
  };

  const requestCollectionChanges = async (document: DocumentHistory) => {
    const notes = prompt('What changes should the recipient make before resubmitting?')?.trim() || '';
    if (!notes) {
      return;
    }

    const response = await fetch('/api/documents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: document.id,
        dataCollectionStatus: 'changes_requested',
        dataCollectionReviewNotes: notes,
        automationNotes: ['Admin requested changes on submitted collection data'],
      }),
    });
    const payload = await response.json().catch(() => null);
    if (response.ok) {
      await fetchDocuments();
      setSuccessMessage('Collection request marked as changes requested.');
      setErrorMessage('');
    } else {
      setErrorMessage(payload?.error || 'Failed to request changes');
    }
  };

  const revokeDocumentShare = async (document: DocumentHistory) => {
    if (!confirm(`Revoke the shared link for ${document.templateName}?`)) return;
    const response = await fetch('/api/documents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: document.id,
        revokedAt: new Date().toISOString(),
        automationNotes: ['Shared link revoked by admin'],
      }),
    });
    const payload = await response.json().catch(() => null);
    if (response.ok) {
      await fetchDocuments();
      setSuccessMessage('Shared link revoked successfully.');
      setErrorMessage('');
    } else {
      setErrorMessage(payload?.error || 'Failed to revoke shared link');
    }
  };

  const handleOnboardingAction = async (
    recordId: string,
    action: 'verify_bgv' | 'reject_bgv' | 'reply_question',
    questionId?: string,
  ) => {
    const notes = action === 'reply_question'
      ? prompt('Reply for employee')
      : prompt(action === 'verify_bgv' ? 'Verification note' : 'Reason for rejection') || '';

    if (action === 'reply_question' && !notes?.trim()) {
      return;
    }

    const response = await fetch('/api/onboarding', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: recordId,
        action,
        notes,
        reply: action === 'reply_question' ? notes : undefined,
        questionId,
      }),
    });
    const payload = await response.json().catch(() => null);
    if (response.ok) {
      await Promise.all([fetchOnboardingRecords(), fetchDocuments()]);
      setSuccessMessage(
        action === 'verify_bgv'
          ? 'Background verification approved successfully.'
          : action === 'reject_bgv'
            ? 'Background verification marked as rejected.'
            : 'Employee question answered successfully.',
      );
      setErrorMessage('');
    } else {
      setErrorMessage(payload?.error || 'Failed to update onboarding workflow');
    }
  };

  const resetSaasPlanDraft = () => {
    setEditingSaasPlanId('');
    setSaasPlanDraft(emptySaasPlan);
  };

  const handleSaveSaasPlan = async () => {
    const method = editingSaasPlanId ? 'PUT' : 'POST';
    const response = await fetch('/api/saas/plans', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...saasPlanDraft,
        ...(editingSaasPlanId ? { id: editingSaasPlanId } : {}),
      }),
    });
    const payload = await response.json().catch(() => null);
    if (response.ok) {
      await Promise.all([fetchSaasPlans(), fetchSaasOverview()]);
      resetSaasPlanDraft();
      setSuccessMessage(editingSaasPlanId ? 'SaaS plan updated successfully.' : 'SaaS plan created successfully.');
      setErrorMessage('');
    } else {
      setErrorMessage(payload?.error || 'Failed to save SaaS plan');
    }
  };

  const handleDeleteSaasPlan = async (planId: string) => {
    if (!confirm('Delete this SaaS plan?')) return;
    const response = await fetch(`/api/saas/plans?id=${planId}`, { method: 'DELETE' });
    const payload = await response.json().catch(() => null);
    if (response.ok) {
      await Promise.all([fetchSaasPlans(), fetchSaasOverview()]);
      setSuccessMessage('SaaS plan deleted successfully.');
      setErrorMessage('');
    } else {
      setErrorMessage(payload?.error || 'Failed to delete SaaS plan');
    }
  };

  const handleAssignPlanToUser = async (user: User, planId: string) => {
    const plan = saasPlans.find((entry) => entry.id === planId);
    const response = await fetch('/api/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: user.id,
        subscription: {
          planId,
          planName: plan?.name || user.subscription?.planName || 'Plan',
          status: user.subscription?.status || 'active',
          startedAt: user.subscription?.startedAt || new Date().toISOString(),
          renewalDate: user.subscription?.renewalDate,
        },
      }),
    });
    const payload = await response.json().catch(() => null);
    if (response.ok) {
      await Promise.all([fetchUsers(), fetchSaasOverview()]);
      setSuccessMessage(`Plan updated for ${user.name}.`);
      setErrorMessage('');
    } else {
      setErrorMessage(payload?.error || 'Failed to assign plan');
    }
  };

  const handleUpdateUserSubscriptionStatus = async (user: User, status: 'trial' | 'active' | 'upgrade_required' | 'suspended') => {
    const response = await fetch('/api/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: user.id,
        subscription: {
          planId: user.subscription?.planId,
          planName: user.subscription?.planName,
          status,
          startedAt: user.subscription?.startedAt || new Date().toISOString(),
          renewalDate: user.subscription?.renewalDate,
        },
      }),
    });
    const payload = await response.json().catch(() => null);
    if (response.ok) {
      await Promise.all([fetchUsers(), fetchSaasOverview()]);
      setSuccessMessage(`Subscription status updated for ${user.name}.`);
      setErrorMessage('');
    } else {
      setErrorMessage(payload?.error || 'Failed to update subscription status');
    }
  };

  const openSharedDocument = (shareUrl?: string) => {
    if (!shareUrl) return;
    router.push(shareUrl);
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You need admin privileges to access this panel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-3 py-4 sm:px-4 md:px-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Admin Control Center</h1>
        <p className="text-muted-foreground">Manage users, templates, SMTP, workflow automation, and the authorized signature bank for the docrud platform.</p>
      </div>

      {(errorMessage || successMessage) && (
        <Card>
          <CardContent className="p-4">
            {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
            {successMessage && <p className="text-sm text-green-700">{successMessage}</p>}
          </CardContent>
        </Card>
      )}

      <FeatureGuide
        title="Admin Control Center Guide"
        purpose="Use this area to configure the platform itself before operational teams scale document generation, onboarding, and delivery."
        whyItMatters={[
          'It gives admins a single control center for users, mail, signatures, collaboration defaults, and branding.',
          'It reduces setup errors by keeping platform-wide changes visible and reviewable in one place.',
        ]}
        tutorial={[
          'Create internal users or client users from the Users tab before assigning workflows.',
          'Use Templates, Mail, Automation, and Theme settings to prepare the platform for organization-wide rollout.',
          'Monitor document verification and collaboration settings before sharing public document links externally.',
        ]}
        examples={[
          'Example: create a client user, assign them linked documents, and let them review everything from the client portal.',
          'Example: switch the platform theme to `slate`, configure SMTP, and then automate HR onboarding letters.',
        ]}
      />

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="flex w-full flex-wrap gap-2 overflow-x-auto rounded-2xl">
          <TabsTrigger value="users" className="flex items-center gap-2"><Users className="w-4 h-4" />Users</TabsTrigger>
          <TabsTrigger value="saas" className="flex items-center gap-2"><BadgeIndianRupee className="w-4 h-4" />SaaS</TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2"><FolderOpen className="w-4 h-4" />Documents</TabsTrigger>
          <TabsTrigger value="collections" className="flex items-center gap-2"><Mail className="w-4 h-4" />Collections</TabsTrigger>
          <TabsTrigger value="onboarding" className="flex items-center gap-2"><Shield className="w-4 h-4" />Onboarding</TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2"><FileText className="w-4 h-4" />Templates</TabsTrigger>
          <TabsTrigger value="mail" className="flex items-center gap-2"><Mail className="w-4 h-4" />Mail</TabsTrigger>
          <TabsTrigger value="automation" className="flex items-center gap-2"><Zap className="w-4 h-4" />Automation</TabsTrigger>
          <TabsTrigger value="theme" className="flex items-center gap-2"><Shield className="w-4 h-4" />Theme</TabsTrigger>
          <TabsTrigger value="homepage" className="flex items-center gap-2"><LayoutTemplate className="w-4 h-4" />Homepage</TabsTrigger>
          <TabsTrigger value="collaboration" className="flex items-center gap-2"><MessageSquare className="w-4 h-4" />Collab</TabsTrigger>
          <TabsTrigger value="signature" className="flex items-center gap-2"><PenTool className="w-4 h-4" />Signatures</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-semibold">Users</h2>
            <Dialog open={showUserDialog} onOpenChange={(open) => { if (!open) resetUserDialog(); else setShowUserDialog(true); }}>
              <DialogTrigger asChild>
                <Button onClick={resetUserDialog}><Plus className="w-4 h-4 mr-2" />Add User</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xl">
                <DialogHeader><DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><label className="block text-sm font-medium mb-1">Name</label><Input value={userForm.name} onChange={(e) => setUserForm((prev) => ({ ...prev, name: e.target.value }))} /></div>
                  <div><label className="block text-sm font-medium mb-1">Email</label><Input type="email" value={userForm.email} onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))} /></div>
                  <div><label className="block text-sm font-medium mb-1">Password {editingUser ? '(optional)' : '*'}</label><Input type="password" value={userForm.password} onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))} /></div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Role</label>
                    <Select value={userForm.role} onValueChange={(value: 'admin' | 'hr' | 'legal' | 'user' | 'client' | 'employee') => setUserForm((prev) => ({ ...prev, role: value, permissions: getRolePermissions(value) }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="client">Client</SelectItem>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="hr">HR</SelectItem>
                        <SelectItem value="legal">Legal</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={resetUserDialog}>Cancel</Button>
                    <Button onClick={() => void handleSaveUser()}>{editingUser ? 'Save User' : 'Create User'}</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid gap-4">
            {users.map((user) => (
              <Card key={user.id}>
                <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold">{user.name}</h3>
                    <p className="text-muted-foreground">{user.email}</p>
                    <p className="text-sm">Role: <span className="capitalize font-medium">{user.role}</span></p>
                    <p className="text-sm">Permissions: {user.permissions.join(', ') || 'None'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <Button variant="outline" size="sm" onClick={() => {
                      setEditingUser(user);
                      setUserForm({ name: user.name, email: user.email, password: '', role: (user.role as 'admin' | 'hr' | 'legal' | 'user' | 'client' | 'employee') || 'user', permissions: user.permissions });
                      setShowUserDialog(true);
                    }}><Edit className="w-4 h-4" /></Button>
                    <Button variant="destructive" size="sm" onClick={() => void handleDeleteUser(user.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-semibold">Created Documents</h2>
            <p className="text-sm text-slate-500">Review all generated documents, required submissions, and verification status.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Total Documents</p><p className="mt-2 text-2xl font-semibold text-slate-900">{documents.length}</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Pending Verification</p><p className="mt-2 text-2xl font-semibold text-amber-600">{pendingDocuments}</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Verified</p><p className="mt-2 text-2xl font-semibold text-emerald-600">{verifiedDocuments}</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Rejected</p><p className="mt-2 text-2xl font-semibold text-rose-600">{rejectedDocuments}</p></CardContent></Card>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Collection Requests</p><p className="mt-2 text-2xl font-semibold text-slate-900">{collectionRequests}</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Collection Submitted</p><p className="mt-2 text-2xl font-semibold text-amber-600">{collectionSubmitted}</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Collection Reviewed</p><p className="mt-2 text-2xl font-semibold text-emerald-600">{collectionReviewed}</p></CardContent></Card>
          </div>
          <Card>
            <CardContent className="flex flex-col gap-3 p-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="relative w-full xl:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  className="pl-9"
                  value={documentSearch}
                  onChange={(event) => setDocumentSearch(event.target.value)}
                  placeholder="Search by template, reference, submitter, or link"
                />
              </div>
              <div className="grid w-full gap-3 xl:w-auto xl:grid-cols-2">
                <div className="w-full xl:w-64">
                <Select value={documentStatusFilter} onValueChange={(value: 'all' | 'pending' | 'verified' | 'rejected' | 'not_required') => setDocumentStatusFilter(value)}>
                  <SelectTrigger><SelectValue placeholder="Filter by status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All documents</SelectItem>
                    <SelectItem value="pending">Pending verification</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="not_required">No verification required</SelectItem>
                  </SelectContent>
                </Select>
                </div>
                <div className="w-full xl:w-64">
                  <Select value={collectionFilter} onValueChange={(value: 'all' | 'collection_only' | 'sent' | 'submitted' | 'changes_requested' | 'reviewed' | 'finalized') => setCollectionFilter(value)}>
                    <SelectTrigger><SelectValue placeholder="Filter by collection" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All workflow types</SelectItem>
                      <SelectItem value="collection_only">Collection requests only</SelectItem>
                      <SelectItem value="sent">Collection sent</SelectItem>
                      <SelectItem value="submitted">Collection submitted</SelectItem>
                      <SelectItem value="changes_requested">Changes requested</SelectItem>
                      <SelectItem value="reviewed">Collection reviewed</SelectItem>
                      <SelectItem value="finalized">Finalized</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="grid gap-4">
            {paginatedDocuments.map((document) => (
              <Card key={document.id}>
                <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className="font-semibold text-slate-900">{document.templateName}</p>
                    <p className="text-sm text-slate-500">{document.referenceNumber}</p>
                    <p className="text-sm text-slate-500">Generated by {document.generatedBy} on {new Date(document.generatedAt).toLocaleString()}</p>
                    <p className="text-sm text-slate-600">Required document workflow: {document.requiredDocumentWorkflowEnabled ? 'Enabled' : 'Disabled'}</p>
                    {document.dataCollectionEnabled && (
                      <>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">Collection request</span>
                          <span className={`rounded-full px-3 py-1 text-xs font-medium ${document.dataCollectionStatus === 'reviewed' ? 'bg-emerald-100 text-emerald-800' : document.dataCollectionStatus === 'submitted' ? 'bg-amber-100 text-amber-900' : 'bg-sky-100 text-sky-800'}`}>
                            {document.dataCollectionStatus || 'sent'}
                          </span>
                        </div>
                        {document.dataCollectionInstructions && <p className="text-sm text-slate-600">Instructions: {document.dataCollectionInstructions}</p>}
                        {document.dataCollectionSubmittedAt && (
                          <p className="text-sm text-slate-600">
                            Latest submission: {new Date(document.dataCollectionSubmittedAt).toLocaleString()}
                            {document.dataCollectionSubmittedBy ? ` by ${document.dataCollectionSubmittedBy}` : ''}
                          </p>
                        )}
                      </>
                    )}
                    {document.recipientSignedAt && (
                      <>
                        <p className="text-sm text-slate-600">Recipient signed on {new Date(document.recipientSignedAt).toLocaleString()} from {document.recipientSignedIp || 'unknown IP'}</p>
                        <p className="text-sm text-slate-600">
                          Signature location: {formatSignatureLocation({
                            label: document.recipientSignedLocationLabel,
                            latitude: document.recipientSignedLatitude,
                            longitude: document.recipientSignedLongitude,
                            accuracyMeters: document.recipientSignedAccuracyMeters,
                          })}
                        </p>
                      </>
                    )}
                    {document.shareUrl && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button variant="outline" size="sm" onClick={() => openSharedDocument(document.shareUrl)}>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Open Shared Document
                        </Button>
                        {!document.revokedAt && (
                          <Button variant="outline" size="sm" onClick={() => void revokeDocumentShare(document)}>
                            Revoke Link
                          </Button>
                        )}
                        {buildGoogleMapsLink(document.recipientSignedLatitude, document.recipientSignedLongitude) && (
                          <Button asChild variant="outline" size="sm">
                            <a href={buildGoogleMapsLink(document.recipientSignedLatitude, document.recipientSignedLongitude)} target="_blank" rel="noreferrer">
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Verify Location
                            </a>
                          </Button>
                        )}
                        {document.dataCollectionEnabled && (
                          <Button variant="outline" size="sm" onClick={() => void sendCollectionRequestEmail(document)}>
                            <Mail className="mr-2 h-4 w-4" />
                            Send Collection Email
                          </Button>
                        )}
                      </div>
                    )}
                    {document.requiredDocumentWorkflowEnabled && (
                      <>
                        <p className="text-sm text-slate-600">Required documents: {(document.requiredDocuments || []).join(', ') || 'None listed'}</p>
                        <p className="text-sm text-slate-600">Verification status: {document.documentsVerificationStatus || 'pending'}</p>
                        {document.documentsSubmittedBy && <p className="text-sm text-slate-600">Submitted by: {document.documentsSubmittedBy}</p>}
                        {!!document.submittedDocuments?.length && (
                          <div className="pt-2 space-y-1">
                            {document.submittedDocuments.map((item) => (
                              <div key={item.id} className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-slate-900">{item.label}</p>
                                  <p className="truncate text-sm text-slate-500">{item.fileName}</p>
                                  <p className="text-xs text-slate-400">Uploaded {new Date(item.uploadedAt).toLocaleString()}</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Button asChild variant="outline" size="sm">
                                    <a href={item.dataUrl} target="_blank" rel="noreferrer">
                                      <ExternalLink className="mr-2 h-4 w-4" />
                                      Preview File
                                    </a>
                                  </Button>
                                  <Button asChild variant="outline" size="sm">
                                    <a href={item.dataUrl} download={item.fileName}>
                                      <Download className="mr-2 h-4 w-4" />
                                      Download
                                    </a>
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {document.documentsVerificationNotes && <p className="text-sm text-slate-500">Note: {document.documentsVerificationNotes}</p>}
                        {document.documentsVerifiedBy && (
                          <p className="text-sm text-slate-500">
                            Last reviewed by {document.documentsVerifiedBy} {document.documentsVerifiedAt ? `on ${new Date(document.documentsVerifiedAt).toLocaleString()}` : ''}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  {document.requiredDocumentWorkflowEnabled && (
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <Button variant="outline" size="sm" onClick={() => void updateDocumentVerification(document.id, 'verified')} disabled={!document.submittedDocuments?.length}>Verify</Button>
                      <Button variant="outline" size="sm" onClick={() => void updateDocumentVerification(document.id, 'rejected')} disabled={!document.submittedDocuments?.length}>Reject</Button>
                      {document.dataCollectionEnabled && document.dataCollectionStatus === 'submitted' && (
                        <Button variant="outline" size="sm" onClick={() => void finalizeCollectionRequest(document)}>
                          Finalize From Submission
                        </Button>
                      )}
                    </div>
                  )}
                  {!document.requiredDocumentWorkflowEnabled && document.dataCollectionEnabled && document.dataCollectionStatus === 'submitted' && (
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <Button variant="outline" size="sm" onClick={() => void finalizeCollectionRequest(document)}>
                        Finalize From Submission
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {paginatedDocuments.length === 0 && <p className="text-sm text-slate-500">No generated documents match the current filters yet.</p>}
          </div>
          <div className="flex flex-col gap-3 rounded-2xl border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Showing {filteredDocuments.length === 0 ? 0 : (documentPage - 1) * documentsPerPage + 1}-
              {Math.min(documentPage * documentsPerPage, filteredDocuments.length)} of {filteredDocuments.length} documents
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setDocumentPage((prev) => Math.max(1, prev - 1))} disabled={documentPage === 1}>
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDocumentPage((prev) => Math.min(totalDocumentPages, prev + 1))} disabled={documentPage === totalDocumentPages}>
                Next
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="collections" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Total Collection Requests</p><p className="mt-2 text-2xl font-semibold text-slate-900">{collectionRequests}</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Awaiting Recipient/Admin Action</p><p className="mt-2 text-2xl font-semibold text-amber-600">{collectionDocuments.filter((document) => document.dataCollectionStatus === 'sent' || document.dataCollectionStatus === 'submitted' || document.dataCollectionStatus === 'changes_requested').length}</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Finalized</p><p className="mt-2 text-2xl font-semibold text-emerald-600">{collectionDocuments.filter((document) => document.dataCollectionStatus === 'finalized').length}</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Collection Inbox</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {collectionDocuments.map((document) => (
                <div key={document.id} className="rounded-2xl border bg-white p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">{document.templateName}</p>
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${document.dataCollectionStatus === 'finalized' ? 'bg-emerald-100 text-emerald-800' : document.dataCollectionStatus === 'changes_requested' ? 'bg-rose-100 text-rose-800' : document.dataCollectionStatus === 'submitted' ? 'bg-amber-100 text-amber-900' : 'bg-sky-100 text-sky-800'}`}>{document.dataCollectionStatus || 'sent'}</span>
                      </div>
                      <p className="text-sm text-slate-500">{document.referenceNumber}</p>
                      <p className="text-sm text-slate-600">Generated by {document.generatedBy} on {new Date(document.generatedAt).toLocaleString()}</p>
                      {document.dataCollectionInstructions && <p className="text-sm text-slate-600">Instructions: {document.dataCollectionInstructions}</p>}
                      {document.dataCollectionSubmittedAt && <p className="text-sm text-slate-600">Latest submission: {new Date(document.dataCollectionSubmittedAt).toLocaleString()} {document.dataCollectionSubmittedBy ? `by ${document.dataCollectionSubmittedBy}` : ''}</p>}
                      {document.dataCollectionReviewNotes && <p className="text-sm text-slate-600">Review notes: {document.dataCollectionReviewNotes}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2 xl:justify-end">
                      {document.shareUrl && <Button variant="outline" size="sm" onClick={() => openSharedDocument(document.shareUrl)}><ExternalLink className="mr-2 h-4 w-4" />Open Form</Button>}
                      {!document.revokedAt && <Button variant="outline" size="sm" onClick={() => void revokeDocumentShare(document)}>Revoke Link</Button>}
                      <Button variant="outline" size="sm" onClick={() => void sendCollectionRequestEmail(document)}><Mail className="mr-2 h-4 w-4" />Send Email</Button>
                      {(document.dataCollectionStatus === 'submitted' || document.dataCollectionStatus === 'reviewed') && (
                        <Button variant="outline" size="sm" onClick={() => void requestCollectionChanges(document)}>Request Changes</Button>
                      )}
                      {document.dataCollectionStatus === 'submitted' && (
                        <Button variant="outline" size="sm" onClick={() => void finalizeCollectionRequest(document)}>Finalize Submission</Button>
                      )}
                      {document.dataCollectionStatus === 'finalized' && (
                        <Button variant="outline" size="sm" onClick={() => openSharedDocument(document.shareUrl)}><FileText className="mr-2 h-4 w-4" />Review Final Source</Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {collectionDocuments.length === 0 && <p className="text-sm text-slate-500">No collection requests have been created yet.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="saas" className="space-y-6">
          <FeatureGuide
            title="SaaS Control Center Guide"
            purpose="Use this area to package the product for subscription customers, manage business accounts, and monitor commercial platform usage."
            whyItMatters={[
              'It helps commercial teams manage plans, limits, and upgrades without engineering involvement.',
              'It gives leadership a clearer view of account health, adoption, and monetization readiness.',
            ]}
            tutorial={[
              'Create plans with document-generation limits, free generation quotas, watermark settings, and feature entitlements.',
              'Use the business accounts table to assign paid plans, change subscription status, and monitor which organizations need an upgrade.',
              'Track platform-level SaaS analytics like business signups, plan distribution, and document-generation consumption from one place.',
            ]}
            examples={[
              'Example: publish a Free Starter plan with 5 watermarked generations and a Growth plan with 50 documents plus analytics access.',
              'Example: upgrade a client from trial to active after commercial approval so their organization can generate beyond the free tier.',
            ]}
          />

          <div className="grid gap-4 md:grid-cols-4">
            <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Business Accounts</p><p className="mt-2 text-2xl font-semibold text-slate-900">{saasOverview?.totalBusinessAccounts || 0}</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Active Accounts</p><p className="mt-2 text-2xl font-semibold text-emerald-600">{saasOverview?.activeBusinessAccounts || 0}</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Upgrade Required</p><p className="mt-2 text-2xl font-semibold text-amber-600">{saasOverview?.upgradeRequiredAccounts || 0}</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Generated Documents</p><p className="mt-2 text-2xl font-semibold text-slate-900">{saasOverview?.totalGeneratedDocuments || 0}</p></CardContent></Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Onboarding Completed</p><p className="mt-2 text-2xl font-semibold text-emerald-600">{saasOverview?.onboardingCompletedAccounts || 0}</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Onboarding In Progress</p><p className="mt-2 text-2xl font-semibold text-amber-600">{saasOverview?.onboardingInProgressAccounts || 0}</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Onboarding Completion Rate</p><p className="mt-2 text-2xl font-semibold text-slate-900">{saasOverview?.onboardingCompletionRate || 0}%</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Setup Ready Tenants</p><p className="mt-2 text-2xl font-semibold text-slate-900">{saasOverview?.setupReadyAccounts || 0}</p></CardContent></Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-1">
              <CardHeader><CardTitle>Industry Distribution</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {(saasOverview?.industryDistribution || []).map((entry) => (
                  <div key={entry.industry} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="font-medium text-slate-900">{industryOptions.find((option) => option.key === entry.industry)?.label || entry.industry}</span>
                    <span className="text-sm text-slate-600">{entry.businesses}</span>
                  </div>
                ))}
                {!(saasOverview?.industryDistribution || []).length && <p className="text-sm text-slate-500">Industry analytics will appear after business signup activity starts.</p>}
              </CardContent>
            </Card>
            <Card className="xl:col-span-1">
              <CardHeader><CardTitle>Workspace Presets</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {(saasOverview?.workspacePresetDistribution || []).map((entry) => (
                  <div key={entry.preset} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="font-medium text-slate-900">{getWorkspacePresetLabel(entry.preset)}</span>
                    <span className="text-sm text-slate-600">{entry.businesses}</span>
                  </div>
                ))}
                {!(saasOverview?.workspacePresetDistribution || []).length && <p className="text-sm text-slate-500">Preset distribution will appear after business onboarding starts.</p>}
              </CardContent>
            </Card>
            <Card className="xl:col-span-1">
              <CardHeader><CardTitle>Recent Business Signups</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {(saasOverview?.recentSignups || []).map((entry) => (
                  <div key={entry.userId} className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="font-medium text-slate-900">{entry.organizationName || entry.email}</p>
                    <p className="text-sm text-slate-500">{entry.email}</p>
                    <p className="mt-1 text-sm text-slate-600">{industryOptions.find((option) => option.key === entry.industry)?.label || 'General'} · {getWorkspacePresetLabel(entry.workspacePreset)}</p>
                    <p className="mt-1 text-xs text-slate-500">Created {new Date(entry.createdAt).toLocaleString()}</p>
                  </div>
                ))}
                {!(saasOverview?.recentSignups || []).length && <p className="text-sm text-slate-500">Recent signup activity will appear here.</p>}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>SaaS Plan Builder</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div><label className="mb-1 block text-sm font-medium">Plan Name</label><Input value={saasPlanDraft.name} onChange={(e) => setSaasPlanDraft((prev) => ({ ...prev, name: e.target.value }))} /></div>
                <div><label className="mb-1 block text-sm font-medium">Price Label</label><Input value={saasPlanDraft.priceLabel} onChange={(e) => setSaasPlanDraft((prev) => ({ ...prev, priceLabel: e.target.value }))} placeholder="INR 19,999 / org" /></div>
                <div className="md:col-span-2"><label className="mb-1 block text-sm font-medium">Description</label><textarea value={saasPlanDraft.description} onChange={(e) => setSaasPlanDraft((prev) => ({ ...prev, description: e.target.value }))} className="min-h-[88px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm" /></div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Billing Model</label>
                  <Select value={saasPlanDraft.billingModel} onValueChange={(value: SaasPlan['billingModel']) => setSaasPlanDraft((prev) => ({ ...prev, billingModel: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="payg">Pay as you go</SelectItem>
                      <SelectItem value="subscription">Subscription</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><label className="mb-1 block text-sm font-medium">CTA Label</label><Input value={saasPlanDraft.ctaLabel || ''} onChange={(e) => setSaasPlanDraft((prev) => ({ ...prev, ctaLabel: e.target.value }))} /></div>
                <div><label className="mb-1 block text-sm font-medium">Free Generations</label><Input type="number" value={saasPlanDraft.freeDocumentGenerations} onChange={(e) => setSaasPlanDraft((prev) => ({ ...prev, freeDocumentGenerations: Number(e.target.value) || 0 }))} /></div>
                <div><label className="mb-1 block text-sm font-medium">Max Generations</label><Input type="number" value={saasPlanDraft.maxDocumentGenerations} onChange={(e) => setSaasPlanDraft((prev) => ({ ...prev, maxDocumentGenerations: Number(e.target.value) || 0 }))} /></div>
                <div className="md:col-span-2"><label className="mb-1 block text-sm font-medium">Overage Label</label><Input value={saasPlanDraft.overagePriceLabel || ''} onChange={(e) => setSaasPlanDraft((prev) => ({ ...prev, overagePriceLabel: e.target.value }))} placeholder="Upgrade required after free limit" /></div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {saasFeatureCatalog.map((feature) => (
                  <label key={feature.key} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={saasPlanDraft.includedFeatures.includes(feature.key)}
                      onChange={(e) => setSaasPlanDraft((prev) => ({
                        ...prev,
                        includedFeatures: e.target.checked
                          ? Array.from(new Set([...prev.includedFeatures, feature.key]))
                          : prev.includedFeatures.filter((entry) => entry !== feature.key),
                      }))}
                    />
                    {feature.label}
                  </label>
                ))}
              </div>

              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2"><input type="checkbox" checked={saasPlanDraft.watermarkOnFreeGenerations} onChange={(e) => setSaasPlanDraft((prev) => ({ ...prev, watermarkOnFreeGenerations: e.target.checked }))} />Watermark free generations</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={saasPlanDraft.isPublic} onChange={(e) => setSaasPlanDraft((prev) => ({ ...prev, isPublic: e.target.checked }))} />Show on website</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={saasPlanDraft.isDefault} onChange={(e) => setSaasPlanDraft((prev) => ({ ...prev, isDefault: e.target.checked }))} />Default signup plan</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={saasPlanDraft.active} onChange={(e) => setSaasPlanDraft((prev) => ({ ...prev, active: e.target.checked }))} />Active</label>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={resetSaasPlanDraft}>Reset</Button>
                <Button onClick={() => void handleSaveSaasPlan()}>{editingSaasPlanId ? 'Update Plan' : 'Create Plan'}</Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {saasPlans.map((plan) => (
              <Card key={plan.id}>
                <CardContent className="space-y-4 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">{plan.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{plan.description}</p>
                      <p className="mt-2 text-sm text-slate-600">{plan.priceLabel} · {plan.billingModel}</p>
                      <p className="mt-1 text-sm text-slate-600">Free generations: {plan.freeDocumentGenerations} · Max generations: {plan.maxDocumentGenerations}</p>
                      <p className="mt-1 text-sm text-slate-600">Features: {plan.includedFeatures.join(', ') || 'None'}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setEditingSaasPlanId(plan.id); setSaasPlanDraft(plan); }}>Edit</Button>
                      <Button variant="destructive" size="sm" onClick={() => void handleDeleteSaasPlan(plan.id)}>Delete</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader><CardTitle>Business Accounts and Plan Usage</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {(users.filter((user) => user.role === 'client')).map((user) => (
                <div key={user.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{user.organizationName || user.name}</p>
                      <p className="text-sm text-slate-500">{user.email}</p>
                      <p className="text-sm text-slate-600">Current plan: {user.subscription?.planName || 'Unassigned'} · Status: {user.subscription?.status || 'trial'}</p>
                      <p className="text-sm text-slate-600">
                        Generated: {saasOverview?.businessUsage.find((entry) => entry.userId === user.id)?.generatedDocuments || 0}
                        {' '}· Remaining: {saasOverview?.businessUsage.find((entry) => entry.userId === user.id)?.remainingGenerations || 0}
                      </p>
                      <p className="text-sm text-slate-600">
                        Industry: {industryOptions.find((option) => option.key === saasOverview?.businessUsage.find((entry) => entry.userId === user.id)?.industry)?.label || 'General'}
                        {' '}· Preset: {getWorkspacePresetLabel(saasOverview?.businessUsage.find((entry) => entry.userId === user.id)?.workspacePreset)}
                      </p>
                      <p className="text-sm text-slate-600">
                        Onboarding: {saasOverview?.businessUsage.find((entry) => entry.userId === user.id)?.onboardingCompleted ? 'Completed' : 'In progress'}
                      </p>
                      <p className="text-sm text-slate-600">
                        Setup readiness: {saasOverview?.businessUsage.find((entry) => entry.userId === user.id)?.setupReadinessScore || 0}%
                      </p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Select value={user.subscription?.planId || 'unassigned'} onValueChange={(value) => value !== 'unassigned' ? void handleAssignPlanToUser(user, value) : undefined}>
                        <SelectTrigger className="min-w-[220px]"><SelectValue placeholder="Assign plan" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {saasPlans.map((plan) => (
                            <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={user.subscription?.status || 'trial'} onValueChange={(value: 'trial' | 'active' | 'upgrade_required' | 'suspended') => void handleUpdateUserSubscriptionStatus(user, value)}>
                        <SelectTrigger className="min-w-[220px]"><SelectValue placeholder="Subscription status" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="trial">Trial</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="upgrade_required">Upgrade Required</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
              {users.filter((user) => user.role === 'client').length === 0 && <p className="text-sm text-slate-500">No SaaS business accounts have signed up yet.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="onboarding" className="space-y-6">
          <FeatureGuide
            title="Employee Onboarding Guide"
            purpose="Use this workflow to collect employee verification data, review submitted proofs, and control when final onboarding steps can proceed."
            whyItMatters={[
              'It keeps onboarding evidence, admin review, and final signing in one governed flow.',
              'It reduces missed documents and unclear ownership during high-volume hiring cycles.',
            ]}
            tutorial={[
              'Generate an HR onboarding document with employee name and email to auto-create a protected employee account.',
              'The employee completes the background verification profile, uploads required KYC and employment documents, and asks questions from their own portal.',
              'Admin verifies or rejects the BGV package here. Only verified onboarding records unlock the final offer-sign workflow.',
            ]}
            examples={[
              'Example: generate an internship or offer letter and the platform issues an employee login with temporary credentials automatically.',
              'Example: reject a missing payslip package with notes, then answer the employee question from the same tracker.',
            ]}
          />

          <div className="grid gap-4 md:grid-cols-4">
            <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Onboarding Records</p><p className="mt-2 text-2xl font-semibold text-slate-900">{onboardingRecords.length}</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Awaiting Review</p><p className="mt-2 text-2xl font-semibold text-amber-600">{onboardingPendingCount}</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Verified</p><p className="mt-2 text-2xl font-semibold text-emerald-600">{onboardingVerifiedCount}</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Rejected</p><p className="mt-2 text-2xl font-semibold text-rose-600">{onboardingRejectedCount}</p></CardContent></Card>
          </div>

          <div className="grid gap-4">
            {onboardingRecords.map((record) => (
              <Card key={record.id}>
                <CardContent className="space-y-5 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1">
                      <p className="text-lg font-semibold text-slate-900">{record.employeeName || 'Unassigned employee'}</p>
                      <p className="text-sm text-slate-500">{record.employeeEmail || 'No employee email saved yet'}</p>
                      <p className="text-sm text-slate-500">{record.templateName} · {record.referenceNumber}</p>
                      <p className="text-sm text-slate-600">Department: {record.employeeDepartment || 'Not set'} · Designation: {record.employeeDesignation || 'Not set'} · Employee Code: {record.employeeCode || 'Not set'}</p>
                      <p className="text-sm text-slate-600">Stage: {(record.onboardingStage || 'account_created').replace(/_/g, ' ')} · Progress: {record.onboardingProgress || 0}%</p>
                      <p className="text-sm text-slate-600">BGV Status: {record.backgroundVerificationStatus || 'not_started'}</p>
                      <p className="text-sm text-slate-600">Required documents: {(record.requiredDocuments || []).join(', ') || 'None configured'}</p>
                      {record.backgroundVerificationNotes && <p className="text-sm text-slate-600">Admin note: {record.backgroundVerificationNotes}</p>}
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                      <p className="font-semibold text-slate-900">Employee Credentials</p>
                      <p className="mt-2 text-slate-600">Email: {record.onboardingCredentials?.email || record.employeeEmail || 'Pending'}</p>
                      <p className="text-slate-600">Temporary password: {record.onboardingCredentials?.temporaryPassword || 'Pending'}</p>
                      <p className="mt-2 text-xs text-slate-500">Generated {record.onboardingCredentials?.generatedAt ? new Date(record.onboardingCredentials.generatedAt).toLocaleString() : 'Not generated yet'}</p>
                    </div>
                  </div>

                  {!!record.submittedDocuments?.length && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-900">Submitted Background Verification Documents</p>
                      {record.submittedDocuments.map((item) => (
                        <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-900">{item.label}</p>
                            <p className="text-sm text-slate-500">{item.fileName}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button asChild variant="outline" size="sm">
                              <a href={item.dataUrl} target="_blank" rel="noreferrer">
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Preview
                              </a>
                            </Button>
                            <Button asChild variant="outline" size="sm">
                              <a href={item.dataUrl} download={item.fileName}>
                                <Download className="mr-2 h-4 w-4" />
                                Download
                              </a>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {!!record.employeeQuestions?.length && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-900">Employee Questions</p>
                      {record.employeeQuestions.map((question) => (
                        <div key={question.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                          <p className="text-sm font-medium text-slate-900">{question.question}</p>
                          <p className="mt-1 text-xs text-slate-500">Asked {new Date(question.askedAt).toLocaleString()} by {question.askedBy}</p>
                          {question.reply ? (
                            <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Reply: {question.reply}</p>
                          ) : (
                            <div className="mt-3">
                              <Button variant="outline" size="sm" onClick={() => void handleOnboardingAction(record.id, 'reply_question', question.id)}>
                                <MessageSquare className="mr-2 h-4 w-4" />
                                Reply
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => void handleOnboardingAction(record.id, 'verify_bgv')} disabled={!record.submittedDocuments?.length}>
                      Verify BGV
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => void handleOnboardingAction(record.id, 'reject_bgv')} disabled={!record.submittedDocuments?.length}>
                      Reject BGV
                    </Button>
                    {record.shareUrl && (
                      <Button variant="outline" size="sm" onClick={() => openSharedDocument(record.shareUrl)}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open Offer Workflow
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {onboardingRecords.length === 0 && <p className="text-sm text-slate-500">No employee onboarding records have been created yet. Generate an HR onboarding document with employee details to start the workflow.</p>}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-semibold">Custom Templates</h2>
            <Button onClick={() => { setEditingTemplate(null); setShowTemplateEditor(true); }}><Plus className="w-4 h-4 mr-2" />Create Template</Button>
          </div>
          <div className="grid gap-4">
            {templates.filter((template) => template.isCustom).map((template) => (
              <Card key={template.id}>
                <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold">{template.name}</h3>
                    <p className="text-muted-foreground">{template.description}</p>
                    <p className="text-sm">Category: {template.category}</p>
                    <p className="text-sm">Fields: {template.fields.length}</p>
                    <p className="text-sm">Version: {template.version}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <Button variant="outline" size="sm" onClick={() => { setEditingTemplate(template); setShowTemplateEditor(true); }}><Edit className="w-4 h-4" /></Button>
                    <Button variant="destructive" size="sm" onClick={() => void handleDeleteTemplate(template.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="mail" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>SMTP Settings</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div><label className="block text-sm font-medium mb-1">Host</label><Input value={mailSettings.host} onChange={(e) => setMailSettings((prev) => ({ ...prev, host: e.target.value }))} placeholder="smtp.company.com" /></div>
              <div><label className="block text-sm font-medium mb-1">Port</label><Input type="number" value={mailSettings.port} onChange={(e) => setMailSettings((prev) => ({ ...prev, port: Number(e.target.value) || 0 }))} /></div>
              <div><label className="block text-sm font-medium mb-1">Username</label><Input value={mailSettings.username} onChange={(e) => setMailSettings((prev) => ({ ...prev, username: e.target.value }))} /></div>
              <div><label className="block text-sm font-medium mb-1">Password</label><Input type="password" value={mailSettings.password} onChange={(e) => setMailSettings((prev) => ({ ...prev, password: e.target.value }))} /></div>
              <div><label className="block text-sm font-medium mb-1">From Name</label><Input value={mailSettings.fromName} onChange={(e) => setMailSettings((prev) => ({ ...prev, fromName: e.target.value }))} /></div>
              <div><label className="block text-sm font-medium mb-1">From Email</label><Input type="email" value={mailSettings.fromEmail} onChange={(e) => setMailSettings((prev) => ({ ...prev, fromEmail: e.target.value }))} /></div>
              <div><label className="block text-sm font-medium mb-1">Reply-To</label><Input type="email" value={mailSettings.replyTo || ''} onChange={(e) => setMailSettings((prev) => ({ ...prev, replyTo: e.target.value }))} /></div>
              <div><label className="block text-sm font-medium mb-1">Test Recipient</label><Input type="email" value={mailSettings.testRecipient || ''} onChange={(e) => setMailSettings((prev) => ({ ...prev, testRecipient: e.target.value }))} /></div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={mailSettings.secure} onChange={(e) => setMailSettings((prev) => ({ ...prev, secure: e.target.checked }))} />Use secure connection</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={mailSettings.requireAuth} onChange={(e) => setMailSettings((prev) => ({ ...prev, requireAuth: e.target.checked }))} />SMTP requires authentication</label>
              <div className="md:col-span-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button onClick={() => void saveMailConfiguration()}><Mail className="w-4 h-4 mr-2" />Save Mail Settings</Button>
                <Button variant="outline" onClick={() => void testSmtp()} disabled={smtpTesting}><CheckCircle2 className="w-4 h-4 mr-2" />{smtpTesting ? 'Testing...' : 'Test SMTP'}</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Workflow Automation</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={automationSettings.autoGenerateReferenceNumber} onChange={(e) => setAutomationSettings((prev) => ({ ...prev, autoGenerateReferenceNumber: e.target.checked }))} />Auto-generate reference numbers for every document</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={automationSettings.autoStampGeneratedBy} onChange={(e) => setAutomationSettings((prev) => ({ ...prev, autoStampGeneratedBy: e.target.checked }))} />Stamp generator identity into document metadata</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={automationSettings.autoCcGenerator} onChange={(e) => setAutomationSettings((prev) => ({ ...prev, autoCcGenerator: e.target.checked }))} />CC the logged-in generator on outgoing mails</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={automationSettings.enableDeliveryTracking} onChange={(e) => setAutomationSettings((prev) => ({ ...prev, enableDeliveryTracking: e.target.checked }))} />Keep delivery tracking in document history</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={automationSettings.autoBccAuditMailbox} onChange={(e) => setAutomationSettings((prev) => ({ ...prev, autoBccAuditMailbox: e.target.checked }))} />BCC all outgoing mails to the audit mailbox</label>
              <div><label className="block text-sm font-medium mb-1">Audit Mailbox</label><Input value={automationSettings.auditMailbox} onChange={(e) => setAutomationSettings((prev) => ({ ...prev, auditMailbox: e.target.value }))} placeholder="audit@corescent.com" /></div>
              <Button onClick={() => void saveAutomationConfiguration()}><Zap className="w-4 h-4 mr-2" />Save Automation Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="theme" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Super Admin Theme Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">Software Name</label><Input value={themeSettings.softwareName} onChange={(e) => setThemeSettings((prev) => ({ ...prev, softwareName: e.target.value }))} /></div>
              <div><label className="block text-sm font-medium mb-1">Accent Label</label><Input value={themeSettings.accentLabel} onChange={(e) => setThemeSettings((prev) => ({ ...prev, accentLabel: e.target.value }))} /></div>
              <div>
                <label className="block text-sm font-medium mb-1">Theme</label>
                <Select value={themeSettings.activeTheme} onValueChange={(value: ThemeSettings['activeTheme']) => setThemeSettings((prev) => ({ ...prev, activeTheme: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ember">Ember</SelectItem>
                    <SelectItem value="slate">Slate</SelectItem>
                    <SelectItem value="ocean">Ocean</SelectItem>
                    <SelectItem value="forest">Forest</SelectItem>
                    <SelectItem value="midnight">Midnight</SelectItem>
                    <SelectItem value="rose">Rose Executive</SelectItem>
                    <SelectItem value="graphite">Graphite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => void saveThemeConfiguration()}><Shield className="w-4 h-4 mr-2" />Save Theme Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="homepage" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Public Homepage Content</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">Homepage Section Visibility</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={landingSettings.enabledSections.hero} onChange={(e) => setLandingSettings((prev) => ({ ...prev, enabledSections: { ...prev.enabledSections, hero: e.target.checked } }))} />Hero section</label>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={landingSettings.enabledSections.snapshot} onChange={(e) => setLandingSettings((prev) => ({ ...prev, enabledSections: { ...prev.enabledSections, snapshot: e.target.checked } }))} />Platform snapshot</label>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={landingSettings.enabledSections.softwareModules} onChange={(e) => setLandingSettings((prev) => ({ ...prev, enabledSections: { ...prev.enabledSections, softwareModules: e.target.checked } }))} />Software modules</label>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={landingSettings.enabledSections.screenshots} onChange={(e) => setLandingSettings((prev) => ({ ...prev, enabledSections: { ...prev.enabledSections, screenshots: e.target.checked } }))} />Screenshots section</label>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={landingSettings.enabledSections.pricing} onChange={(e) => setLandingSettings((prev) => ({ ...prev, enabledSections: { ...prev.enabledSections, pricing: e.target.checked } }))} />Pricing section</label>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={landingSettings.enabledSections.demo} onChange={(e) => setLandingSettings((prev) => ({ ...prev, enabledSections: { ...prev.enabledSections, demo: e.target.checked } }))} />Demo section</label>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={landingSettings.enabledSections.contact} onChange={(e) => setLandingSettings((prev) => ({ ...prev, enabledSections: { ...prev.enabledSections, contact: e.target.checked } }))} />Contact section</label>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Hero Badge</label>
                  <Input value={landingSettings.heroBadge} onChange={(e) => setLandingSettings((prev) => ({ ...prev, heroBadge: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Hero Title</label>
                  <Input value={landingSettings.heroTitle} onChange={(e) => setLandingSettings((prev) => ({ ...prev, heroTitle: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Primary CTA Label</label>
                  <Input value={landingSettings.primaryCtaLabel} onChange={(e) => setLandingSettings((prev) => ({ ...prev, primaryCtaLabel: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Secondary CTA Label</label>
                  <Input value={landingSettings.secondaryCtaLabel} onChange={(e) => setLandingSettings((prev) => ({ ...prev, secondaryCtaLabel: e.target.value }))} />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium">Hero Subtitle</label>
                  <textarea
                    value={landingSettings.heroSubtitle}
                    onChange={(e) => setLandingSettings((prev) => ({ ...prev, heroSubtitle: e.target.value }))}
                    className="min-h-[100px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Primary CTA Href</label>
                  <Input value={landingSettings.primaryCtaHref} onChange={(e) => setLandingSettings((prev) => ({ ...prev, primaryCtaHref: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Secondary CTA Href</label>
                  <Input value={landingSettings.secondaryCtaHref} onChange={(e) => setLandingSettings((prev) => ({ ...prev, secondaryCtaHref: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Contact Heading</label>
                  <Input value={landingSettings.contactHeading} onChange={(e) => setLandingSettings((prev) => ({ ...prev, contactHeading: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Social Proof Label</label>
                  <Input value={landingSettings.socialProofLabel} onChange={(e) => setLandingSettings((prev) => ({ ...prev, socialProofLabel: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Contact Email</label>
                  <Input value={landingSettings.contactEmail} onChange={(e) => setLandingSettings((prev) => ({ ...prev, contactEmail: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Contact Phone</label>
                  <Input value={landingSettings.contactPhone} onChange={(e) => setLandingSettings((prev) => ({ ...prev, contactPhone: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Feature Section Title</label>
                  <Input value={landingSettings.featureSectionTitle} onChange={(e) => setLandingSettings((prev) => ({ ...prev, featureSectionTitle: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Software Modules Title</label>
                  <Input value={landingSettings.softwareModulesTitle} onChange={(e) => setLandingSettings((prev) => ({ ...prev, softwareModulesTitle: e.target.value }))} />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium">Software Modules Subtitle</label>
                  <textarea
                    value={landingSettings.softwareModulesSubtitle}
                    onChange={(e) => setLandingSettings((prev) => ({ ...prev, softwareModulesSubtitle: e.target.value }))}
                    className="min-h-[90px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Pricing Section Title</label>
                  <Input value={landingSettings.pricingSectionTitle} onChange={(e) => setLandingSettings((prev) => ({ ...prev, pricingSectionTitle: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Pricing Page Title</label>
                  <Input value={landingSettings.pricingPageTitle} onChange={(e) => setLandingSettings((prev) => ({ ...prev, pricingPageTitle: e.target.value }))} />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium">Pricing Section Subtitle</label>
                  <textarea
                    value={landingSettings.pricingSectionSubtitle}
                    onChange={(e) => setLandingSettings((prev) => ({ ...prev, pricingSectionSubtitle: e.target.value }))}
                    className="min-h-[90px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium">Pricing Page Subtitle</label>
                  <textarea
                    value={landingSettings.pricingPageSubtitle}
                    onChange={(e) => setLandingSettings((prev) => ({ ...prev, pricingPageSubtitle: e.target.value }))}
                    className="min-h-[90px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium">Contact Subtitle</label>
                  <textarea
                    value={landingSettings.contactSubtitle}
                    onChange={(e) => setLandingSettings((prev) => ({ ...prev, contactSubtitle: e.target.value }))}
                    className="min-h-[90px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Contact Page Title</label>
                  <Input value={landingSettings.contactPageTitle} onChange={(e) => setLandingSettings((prev) => ({ ...prev, contactPageTitle: e.target.value }))} />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium">Contact Page Subtitle</label>
                  <textarea
                    value={landingSettings.contactPageSubtitle}
                    onChange={(e) => setLandingSettings((prev) => ({ ...prev, contactPageSubtitle: e.target.value }))}
                    className="min-h-[90px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Demo Page Title</label>
                  <Input value={landingSettings.demoPageTitle} onChange={(e) => setLandingSettings((prev) => ({ ...prev, demoPageTitle: e.target.value }))} />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium">Demo Page Subtitle</label>
                  <textarea
                    value={landingSettings.demoPageSubtitle}
                    onChange={(e) => setLandingSettings((prev) => ({ ...prev, demoPageSubtitle: e.target.value }))}
                    className="min-h-[90px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Screenshots Section Title</label>
                  <Input value={landingSettings.screenshotsSectionTitle} onChange={(e) => setLandingSettings((prev) => ({ ...prev, screenshotsSectionTitle: e.target.value }))} />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium">Screenshots Section Subtitle</label>
                  <textarea
                    value={landingSettings.screenshotsSectionSubtitle}
                    onChange={(e) => setLandingSettings((prev) => ({ ...prev, screenshotsSectionSubtitle: e.target.value }))}
                    className="min-h-[90px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">Feature Highlights</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setLandingSettings((prev) => ({ ...prev, featureHighlights: [...prev.featureHighlights, ''] }))}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Highlight
                  </Button>
                </div>
                {landingSettings.featureHighlights.map((item, index) => (
                  <div key={`highlight-${index}`} className="flex gap-2">
                    <Input
                      value={item}
                      onChange={(e) => setLandingSettings((prev) => ({
                        ...prev,
                        featureHighlights: prev.featureHighlights.map((entry, entryIndex) => entryIndex === index ? e.target.value : entry),
                      }))}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setLandingSettings((prev) => ({
                        ...prev,
                        featureHighlights: prev.featureHighlights.filter((_, entryIndex) => entryIndex !== index),
                      }))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">Social Proof Chips</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setLandingSettings((prev) => ({ ...prev, socialProofItems: [...prev.socialProofItems, ''] }))}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Chip
                  </Button>
                </div>
                {landingSettings.socialProofItems.map((item, index) => (
                  <div key={`proof-${index}`} className="flex gap-2">
                    <Input
                      value={item}
                      onChange={(e) => setLandingSettings((prev) => ({
                        ...prev,
                        socialProofItems: prev.socialProofItems.map((entry, entryIndex) => entryIndex === index ? e.target.value : entry),
                      }))}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setLandingSettings((prev) => ({
                        ...prev,
                        socialProofItems: prev.socialProofItems.filter((_, entryIndex) => entryIndex !== index),
                      }))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">Feature Cards</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setLandingSettings((prev) => ({
                      ...prev,
                      featureCards: [...prev.featureCards, { id: `feature-${Date.now()}`, title: '', description: '' }],
                    }))}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Card
                  </Button>
                </div>
                {landingSettings.featureCards.map((card, index) => (
                  <Card key={card.id || `feature-card-${index}`}>
                    <CardContent className="grid gap-4 p-5 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium">Title</label>
                        <Input value={card.title} onChange={(e) => setLandingSettings((prev) => ({
                          ...prev,
                          featureCards: prev.featureCards.map((entry, entryIndex) => entryIndex === index ? { ...entry, title: e.target.value } : entry),
                        }))} />
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-sm font-medium">Description</label>
                        <textarea
                          value={card.description}
                          onChange={(e) => setLandingSettings((prev) => ({
                            ...prev,
                            featureCards: prev.featureCards.map((entry, entryIndex) => entryIndex === index ? { ...entry, description: e.target.value } : entry),
                          }))}
                          className="min-h-[90px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="md:col-span-2 flex justify-end">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => setLandingSettings((prev) => ({
                            ...prev,
                            featureCards: prev.featureCards.filter((_, entryIndex) => entryIndex !== index),
                          }))}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove Card
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">Homepage Stats</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setLandingSettings((prev) => ({
                      ...prev,
                      stats: [...prev.stats, { id: `stat-${Date.now()}`, value: '', label: '' }],
                    }))}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Stat
                  </Button>
                </div>
                {landingSettings.stats.map((stat, index) => (
                  <Card key={stat.id || `stat-card-${index}`}>
                    <CardContent className="grid gap-4 p-5 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium">Value</label>
                        <Input value={stat.value} onChange={(e) => setLandingSettings((prev) => ({
                          ...prev,
                          stats: prev.stats.map((entry, entryIndex) => entryIndex === index ? { ...entry, value: e.target.value } : entry),
                        }))} />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">Label</label>
                        <Input value={stat.label} onChange={(e) => setLandingSettings((prev) => ({
                          ...prev,
                          stats: prev.stats.map((entry, entryIndex) => entryIndex === index ? { ...entry, label: e.target.value } : entry),
                        }))} />
                      </div>
                      <div className="md:col-span-2 flex justify-end">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => setLandingSettings((prev) => ({
                            ...prev,
                            stats: prev.stats.filter((_, entryIndex) => entryIndex !== index),
                          }))}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove Stat
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">Demo Benefits</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setLandingSettings((prev) => ({ ...prev, demoBenefits: [...prev.demoBenefits, ''] }))}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Benefit
                  </Button>
                </div>
                {landingSettings.demoBenefits.map((item, index) => (
                  <div key={`demo-benefit-${index}`} className="flex gap-2">
                    <Input
                      value={item}
                      onChange={(e) => setLandingSettings((prev) => ({
                        ...prev,
                        demoBenefits: prev.demoBenefits.map((entry, entryIndex) => entryIndex === index ? e.target.value : entry),
                      }))}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setLandingSettings((prev) => ({
                        ...prev,
                        demoBenefits: prev.demoBenefits.filter((_, entryIndex) => entryIndex !== index),
                      }))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">Software Modules</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setLandingSettings((prev) => ({
                      ...prev,
                      softwareModules: [...prev.softwareModules, { id: `module-${Date.now()}`, title: '', description: '', capabilities: [''] }],
                    }))}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Module
                  </Button>
                </div>
                {landingSettings.softwareModules.map((module, index) => (
                  <Card key={module.id || `module-card-${index}`}>
                    <CardContent className="space-y-4 p-5">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-sm font-medium">Module Title</label>
                          <Input value={module.title} onChange={(e) => setLandingSettings((prev) => ({
                            ...prev,
                            softwareModules: prev.softwareModules.map((entry, entryIndex) => entryIndex === index ? { ...entry, title: e.target.value } : entry),
                          }))} />
                        </div>
                        <div className="md:col-span-2">
                          <label className="mb-1 block text-sm font-medium">Module Description</label>
                          <textarea
                            value={module.description}
                            onChange={(e) => setLandingSettings((prev) => ({
                              ...prev,
                              softwareModules: prev.softwareModules.map((entry, entryIndex) => entryIndex === index ? { ...entry, description: e.target.value } : entry),
                            }))}
                            className="min-h-[90px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                          />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium">Module Capabilities</p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setLandingSettings((prev) => ({
                              ...prev,
                              softwareModules: prev.softwareModules.map((entry, entryIndex) => entryIndex === index ? { ...entry, capabilities: [...entry.capabilities, ''] } : entry),
                            }))}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Capability
                          </Button>
                        </div>
                        {module.capabilities.map((capability, capabilityIndex) => (
                          <div key={`${module.id}-capability-${capabilityIndex}`} className="flex gap-2">
                            <Input
                              value={capability}
                              onChange={(e) => setLandingSettings((prev) => ({
                                ...prev,
                                softwareModules: prev.softwareModules.map((entry, entryIndex) => entryIndex === index ? {
                                  ...entry,
                                  capabilities: entry.capabilities.map((capabilityEntry, nestedIndex) => nestedIndex === capabilityIndex ? e.target.value : capabilityEntry),
                                } : entry),
                              }))}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => setLandingSettings((prev) => ({
                                ...prev,
                                softwareModules: prev.softwareModules.map((entry, entryIndex) => entryIndex === index ? {
                                  ...entry,
                                  capabilities: entry.capabilities.filter((_, nestedIndex) => nestedIndex !== capabilityIndex),
                                } : entry),
                              }))}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => setLandingSettings((prev) => ({
                            ...prev,
                            softwareModules: prev.softwareModules.filter((_, entryIndex) => entryIndex !== index),
                          }))}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove Module
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">Feature Screenshots</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setLandingSettings((prev) => ({
                      ...prev,
                      featureScreenshots: [...prev.featureScreenshots, { id: `screenshot-${Date.now()}`, title: '', description: '', imagePath: '' }],
                    }))}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Screenshot
                  </Button>
                </div>
                {landingSettings.featureScreenshots.map((shot, index) => (
                  <Card key={shot.id || `shot-${index}`}>
                    <CardContent className="grid gap-4 p-5 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium">Title</label>
                        <Input value={shot.title} onChange={(e) => setLandingSettings((prev) => ({
                          ...prev,
                          featureScreenshots: prev.featureScreenshots.map((entry, entryIndex) => entryIndex === index ? { ...entry, title: e.target.value } : entry),
                        }))} />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">Image Path</label>
                        <Input value={shot.imagePath} onChange={(e) => setLandingSettings((prev) => ({
                          ...prev,
                          featureScreenshots: prev.featureScreenshots.map((entry, entryIndex) => entryIndex === index ? { ...entry, imagePath: e.target.value } : entry),
                        }))} placeholder="/screenshots/document-ops.png" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-sm font-medium">Description</label>
                        <textarea
                          value={shot.description}
                          onChange={(e) => setLandingSettings((prev) => ({
                            ...prev,
                            featureScreenshots: prev.featureScreenshots.map((entry, entryIndex) => entryIndex === index ? { ...entry, description: e.target.value } : entry),
                          }))}
                          className="min-h-[90px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="md:col-span-2 flex justify-end">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => setLandingSettings((prev) => ({
                            ...prev,
                            featureScreenshots: prev.featureScreenshots.filter((_, entryIndex) => entryIndex !== index),
                          }))}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove Screenshot
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">One-Time Pricing Plans</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setLandingSettings((prev) => ({ ...prev, pricingPlans: [...prev.pricingPlans, { ...emptyPricingPlan, id: `plan-${Date.now()}` }] }))}
                  >
                    <BadgeIndianRupee className="mr-2 h-4 w-4" />
                    Add Plan
                  </Button>
                </div>
                <div className="grid gap-4">
                  {landingSettings.pricingPlans.map((plan, index) => (
                    <Card key={plan.id || `plan-${index}`}>
                      <CardContent className="space-y-4 p-5">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-sm font-medium">Plan Name</label>
                            <Input value={plan.name} onChange={(e) => setLandingSettings((prev) => ({
                              ...prev,
                              pricingPlans: prev.pricingPlans.map((entry, entryIndex) => entryIndex === index ? { ...entry, name: e.target.value } : entry),
                            }))} />
                          </div>
                          <div>
                            <label className="mb-1 block text-sm font-medium">Price Label</label>
                            <Input value={plan.priceLabel} onChange={(e) => setLandingSettings((prev) => ({
                              ...prev,
                              pricingPlans: prev.pricingPlans.map((entry, entryIndex) => entryIndex === index ? { ...entry, priceLabel: e.target.value } : entry),
                            }))} />
                          </div>
                          <div className="md:col-span-2">
                            <label className="mb-1 block text-sm font-medium">Description</label>
                            <textarea
                              value={plan.description}
                              onChange={(e) => setLandingSettings((prev) => ({
                                ...prev,
                                pricingPlans: prev.pricingPlans.map((entry, entryIndex) => entryIndex === index ? { ...entry, description: e.target.value } : entry),
                              }))}
                              className="min-h-[90px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                            />
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium">Plan Highlights</p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setLandingSettings((prev) => ({
                                ...prev,
                                pricingPlans: prev.pricingPlans.map((entry, entryIndex) => entryIndex === index ? { ...entry, highlights: [...entry.highlights, ''] } : entry),
                              }))}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Add Item
                            </Button>
                          </div>
                          {plan.highlights.map((highlight, highlightIndex) => (
                            <div key={`${plan.id}-highlight-${highlightIndex}`} className="flex gap-2">
                              <Input
                                value={highlight}
                                onChange={(e) => setLandingSettings((prev) => ({
                                  ...prev,
                                  pricingPlans: prev.pricingPlans.map((entry, entryIndex) => entryIndex === index ? {
                                    ...entry,
                                    highlights: entry.highlights.map((highlightEntry, nestedIndex) => nestedIndex === highlightIndex ? e.target.value : highlightEntry),
                                  } : entry),
                                }))}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => setLandingSettings((prev) => ({
                                  ...prev,
                                  pricingPlans: prev.pricingPlans.map((entry, entryIndex) => entryIndex === index ? {
                                    ...entry,
                                    highlights: entry.highlights.filter((_, nestedIndex) => nestedIndex !== highlightIndex),
                                  } : entry),
                                }))}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => setLandingSettings((prev) => ({
                              ...prev,
                              pricingPlans: prev.pricingPlans.filter((_, entryIndex) => entryIndex !== index),
                            }))}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove Plan
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <Button onClick={() => void saveLandingConfiguration()}>
                <LayoutTemplate className="mr-2 h-4 w-4" />
                Save Homepage Content
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Sales Enquiries</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {contactRequests.length === 0 && <p className="text-sm text-slate-500">No homepage enquiries yet.</p>}
              {contactRequests.map((request) => (
                <div key={request.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{request.name}</p>
                      <p className="text-sm text-slate-500">{request.email}</p>
                      <p className="text-sm text-slate-600">{request.organization}</p>
                      {request.phone && <p className="text-sm text-slate-600">{request.phone}</p>}
                    </div>
                    <p className="text-xs text-slate-400">{new Date(request.createdAt).toLocaleString()}</p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-700">{request.message}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="collaboration" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>External Collaboration Access</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-500">
                Set the default access given to recipients who open generated document links. Signature capture remains available in every mode.
              </p>
              <div>
                <label className="block text-sm font-medium mb-2">Default Recipient Access</label>
                <Select
                  value={collaborationSettings.defaultRecipientAccess}
                  onValueChange={(value: 'view' | 'comment' | 'edit') => setCollaborationSettings((prev) => ({ ...prev, defaultRecipientAccess: value }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select default access" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">View only</SelectItem>
                    <SelectItem value="comment">Comment and review</SelectItem>
                    <SelectItem value="edit">Edit, comment, and review</SelectItem>
                  </SelectContent>
                </Select>
              </div>
                <div className="rounded-2xl border bg-slate-50 p-4 text-sm text-slate-600 space-y-2">
                <p><span className="font-medium text-slate-900">View only:</span> recipient can read and sign.</p>
                <p><span className="font-medium text-slate-900">Comment and review:</span> recipient can read, sign, and add comments or review notes.</p>
                <p><span className="font-medium text-slate-900">Edit, comment, and review:</span> recipient can also update document fields from the shared page before signing.</p>
              </div>
              <Button onClick={() => void saveCollaborationConfiguration()}>
                <MessageSquare className="w-4 h-4 mr-2" />
                Save Collaboration Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="signature" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Authorized Signature Bank</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-500">Add multiple approved admin signatures. Each signature is stamped with timestamp and source IP when it is created, and users can choose which signature to apply per document.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Signer Name</label><Input value={signatureDraft.signerName} onChange={(e) => setSignatureDraft((prev) => ({ ...prev, signerName: e.target.value }))} placeholder="Authorized Signatory" /></div>
                <div><label className="block text-sm font-medium mb-1">Signer Role</label><Input value={signatureDraft.signerRole} onChange={(e) => setSignatureDraft((prev) => ({ ...prev, signerRole: e.target.value }))} placeholder="Director / VP / HR Head" /></div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Draw Signature</label>
                <SignaturePad value={signatureDraft.signatureDataUrl} onChange={(value) => setSignatureDraft((prev) => ({ ...prev, signatureDataUrl: value }))} />
              </div>
              <Button onClick={() => void addSignature()}><PenTool className="w-4 h-4 mr-2" />Add Signature</Button>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {signatureSettings.signatures.map((signature) => (
              <Card key={signature.id}>
                <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-900">{signature.signerName}</p>
                    <p className="text-sm text-slate-500">{signature.signerRole}</p>
                    <p className="text-sm text-slate-500">Captured {signature.signedAt ? new Date(signature.signedAt).toLocaleString() : 'Unknown'} from {signature.signedIp || 'unknown IP'}</p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Image src={signature.signatureDataUrl} alt={signature.signerName} width={160} height={64} unoptimized className="h-16 w-full max-w-40 object-contain rounded border bg-white p-2" />
                    <Button variant="destructive" size="sm" onClick={() => void deleteSignature(signature)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {signatureSettings.signatures.length === 0 && <p className="text-sm text-slate-500">No signatures saved yet.</p>}
          </div>
        </TabsContent>
      </Tabs>

      {showTemplateEditor && (
        <TemplateEditor
          template={editingTemplate || undefined}
          onSave={handleSaveTemplate}
          onClose={() => {
            setShowTemplateEditor(false);
            setEditingTemplate(null);
          }}
        />
      )}
    </div>
  );
}
