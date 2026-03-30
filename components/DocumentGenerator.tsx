'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { Input } from './ui/input';
import RichTextEditor from './RichTextEditor';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { CollaborationSettings, DashboardMetrics, DataCollectionStatus, DocumentField, DocumentHistory, DocumentTemplate, RecipientAccessLevel, SignatureRecord, SignatureSettings } from '../types/document';
import { DEFAULT_DOCUMENT_DESIGN_PRESET, documentDesignPresets, type DocumentDesignPreset } from '@/lib/document-designs';
import { getIndustryWorkspaceProfile, getWorkspacePresetLabel } from '@/lib/industry-presets';
import { renderDocumentTemplate } from '@/lib/template';
import { buildGoogleMapsLink, formatSignatureLocation } from '@/lib/location';
import { BarChart3, BookOpen, BriefcaseBusiness, ChevronDown, ChevronRight, Copy, Download, Eye, FileSearch, FileText, FolderKanban, History, Link2, LogOut, Mail, Menu, MessageSquare, PanelLeftClose, PanelLeftOpen, PieChart, RefreshCw, Settings, Share2, ShieldCheck, Sparkles, X } from 'lucide-react';
import AdminPanel from './AdminPanel';
import EnterpriseWorkspace from './EnterpriseWorkspace';
import FloatingAssistant from './FloatingAssistant';
import ClientPortal from './ClientPortal';
import EmployeePortal from './EmployeePortal';
import BusinessSettingsCenter from './BusinessSettingsCenter';
import PlatformFeatureCenter from './PlatformFeatureCenter';
import ApiDocsCenter from './ApiDocsCenter';
import TutorialsCenter from './TutorialsCenter';
import type { BusinessSettings } from '@/types/document';

const emptyDashboard: DashboardMetrics = {
  totalDocuments: 0,
  documentsThisWeek: 0,
  emailsSent: 0,
  templatesUsed: 0,
  topTemplates: [],
  recentActivity: [],
  recentFeedback: [],
  documentSummary: [],
  signatureLocationDistribution: [],
};

const emptyCollaborationSettings: CollaborationSettings = {
  defaultRecipientAccess: 'comment',
};

const HISTORY_PAGE_SIZE = 8;
const SUMMARY_PAGE_SIZE = 6;
const FEEDBACK_PAGE_SIZE = 5;
const DRAFT_STORAGE_PREFIX = 'docrud-template-draft:';
const ONBOARDING_TEMPLATE_IDS = ['internship-letter', 'offer-letter', 'appointment-letter', 'employment-contract'];
const DEFAULT_BGV_DOCUMENTS = [
  'Government Photo ID Proof',
  'Address Proof',
  'PAN Card',
  'Aadhaar Card',
  'Passport Size Photograph',
  'Educational Certificates',
  'Latest Resume',
  'Previous Employment Relieving Letter',
  'Previous Employment Payslips',
  'Bank Account Proof',
];
type ShareTarget = Partial<Pick<DocumentHistory, 'shareUrl' | 'shareId' | 'id'>>;

const sanitizeEditorHtml = (value: string) =>
  value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son[a-z]+="[^"]*"/gi, '')
    .replace(/\son[a-z]+='[^']*'/gi, '')
    .replace(/javascript:/gi, '');

const stripEditorHtml = (value: string) =>
  sanitizeEditorHtml(value).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const examplePreviewTemplate: DocumentTemplate = {
  id: 'design-preview-template',
  name: 'Master Services Agreement',
  category: 'Legal',
  description: 'Example preview template for document design presets.',
  isCustom: false,
  fields: [
    { id: 'company-name', name: 'companyName', label: 'Company Name', type: 'text', required: true, order: 1 },
    { id: 'recipient-name', name: 'recipientName', label: 'Recipient Name', type: 'text', required: true, order: 2 },
    { id: 'effective-date', name: 'effectiveDate', label: 'Effective Date', type: 'date', required: true, order: 3 },
    { id: 'summary', name: 'summary', label: 'Summary', type: 'textarea', required: true, order: 4 },
  ],
  template: `
    <p>This Master Services Agreement is entered into between <strong>{{companyName}}</strong> and <strong>{{recipientName}}</strong> effective from <strong>{{effectiveDate}}</strong>.</p>
    <p>{{companyName}} will provide enterprise document workflow, compliance tracking, and managed support operations under the agreed commercial schedule.</p>
    <h3>Scope Overview</h3>
    <p>{{summary}}</p>
    <h3>Governance Notes</h3>
    <ul>
      <li>All deliverables follow approved review and audit controls.</li>
      <li>Both parties will maintain confidentiality and operational compliance.</li>
      <li>Commercial amendments must be approved in writing by authorized stakeholders.</li>
    </ul>
  `,
};

const examplePreviewData = {
  companyName: 'Northstar Industrial Systems Pvt. Ltd.',
  recipientName: 'Avery Morgan',
  effectiveDate: '2026-04-01',
  summary: 'This agreement covers onboarding, compliance documentation, vendor approvals, and recurring document operations across legal, HR, and client services teams.',
};

const CLIENT_PREVIEW_WATERMARK = 'SAMPLE';

export default function DocumentGenerator() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [selectedSignatureId, setSelectedSignatureId] = useState('');
  const [selectedDesignPreset, setSelectedDesignPreset] = useState<DocumentDesignPreset>(DEFAULT_DOCUMENT_DESIGN_PRESET);
  const [examplePreviewOpen, setExamplePreviewOpen] = useState(false);
  const [examplePreviewPreset, setExamplePreviewPreset] = useState<DocumentDesignPreset>(DEFAULT_DOCUMENT_DESIGN_PRESET);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [generatedHtml, setGeneratedHtml] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [expandedNavGroups, setExpandedNavGroups] = useState<string[]>(['core', 'portal', 'operations', 'platform', 'help']);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailData, setEmailData] = useState({ to: '', subject: '', message: '' });
  const [recipientSignatureRequired, setRecipientSignatureRequired] = useState(true);
  const [requiredDocumentWorkflowEnabled, setRequiredDocumentWorkflowEnabled] = useState(false);
  const [requiredDocumentsText, setRequiredDocumentsText] = useState('');
  const [shareAccessPolicy, setShareAccessPolicy] = useState<'standard' | 'expiring' | 'one_time'>('standard');
  const [shareExpiryDays, setShareExpiryDays] = useState('7');
  const [maxAccessCount, setMaxAccessCount] = useState('1');
  const [recipientAccess, setRecipientAccess] = useState<RecipientAccessLevel>('comment');
  const [dataCollectionEnabled, setDataCollectionEnabled] = useState(false);
  const [dataCollectionInstructions, setDataCollectionInstructions] = useState('');
  const [history, setHistory] = useState<DocumentHistory[]>([]);
  const [dashboard, setDashboard] = useState<DashboardMetrics>(emptyDashboard);
  const [currentHistoryEntry, setCurrentHistoryEntry] = useState<DocumentHistory | null>(null);
  const [signatureSettings, setSignatureSettings] = useState<SignatureSettings>({ signatures: [] });
  const [collaborationSettings, setCollaborationSettings] = useState<CollaborationSettings>(emptyCollaborationSettings);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isCreatingDataCollectionRequest, setIsCreatingDataCollectionRequest] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyingCommentId, setReplyingCommentId] = useState('');
  const [dashboardSearch, setDashboardSearch] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [summaryPage, setSummaryPage] = useState(1);
  const [feedbackPage, setFeedbackPage] = useState(1);
  const [draftRestored, setDraftRestored] = useState(false);
  const [clientBusinessSettings, setClientBusinessSettings] = useState<BusinessSettings | null>(null);
  const [onboardingContext, setOnboardingContext] = useState({
    employeeName: '',
    employeeEmail: '',
    employeeDepartment: '',
    employeeDesignation: '',
    employeeCode: '',
  });

  const userPermissions = useMemo(() => session?.user?.permissions || [], [session?.user?.permissions]);
  const isClient = session?.user?.role === 'client';
  const isEmployee = session?.user?.role === 'employee';
  const isAdmin = session?.user?.role === 'admin';
  const clientPlanFeatures = useMemo(() => new Set(session?.user?.planFeatures || []), [session?.user?.planFeatures]);
  const clientPlanName = session?.user?.subscription?.planName || 'Free Starter';
  const hasClientFeature = useCallback((feature: string) => !isClient || clientPlanFeatures.has(feature), [clientPlanFeatures, isClient]);
  const clientCanAccessDashboard = !isClient || clientPlanFeatures.has('dashboard');
  const isOnboardingTemplate = useMemo(() => {
    if (!selectedTemplate) return false;
    return selectedTemplate.category?.toLowerCase() === 'hr' || ONBOARDING_TEMPLATE_IDS.includes(selectedTemplate.id);
  }, [selectedTemplate]);
  const allowedTemplates = useMemo(() => {
    if (userPermissions.includes('all')) {
      return templates;
    }

    const permitted = templates.filter((template) => userPermissions.includes(template.id));
    return permitted.length > 0 ? permitted : templates;
  }, [templates, userPermissions]);
  const availableSignatures = useMemo(() => signatureSettings.signatures || [], [signatureSettings.signatures]);
  const selectedSignature: SignatureRecord | null = useMemo(
    () => availableSignatures.find((signature) => signature.id === selectedSignatureId) || null,
    [availableSignatures, selectedSignatureId]
  );
  const completedRequiredFields = useMemo(
    () => (selectedTemplate?.fields || []).filter((field) => field.required && formData[field.name]?.trim()).length,
    [formData, selectedTemplate]
  );
  const requiredFieldCount = useMemo(
    () => (selectedTemplate?.fields || []).filter((field) => field.required).length,
    [selectedTemplate]
  );
  const completionPercentage = requiredFieldCount === 0 ? 100 : Math.round((completedRequiredFields / requiredFieldCount) * 100);
  const latestTemplateHistoryEntry = useMemo(
    () => history.find((entry) => entry.templateId === selectedTemplate?.id),
    [history, selectedTemplate?.id]
  );
  const searchResults = useMemo(() => {
    const query = dashboardSearch.trim().toLowerCase();
    if (!query) return [];
    return dashboard.documentSummary.filter((item) =>
      [item.templateName, item.referenceNumber, item.latestActivityLabel, ...(item.uniqueDevices || [])]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query))
    ).slice(0, 6);
  }, [dashboard.documentSummary, dashboardSearch]);
  const paginatedHistory = useMemo(() => {
    const start = (historyPage - 1) * HISTORY_PAGE_SIZE;
    return history.slice(start, start + HISTORY_PAGE_SIZE);
  }, [history, historyPage]);
  const paginatedSummary = useMemo(() => {
    const start = (summaryPage - 1) * SUMMARY_PAGE_SIZE;
    return dashboard.documentSummary.slice(start, start + SUMMARY_PAGE_SIZE);
  }, [dashboard.documentSummary, summaryPage]);
  const paginatedFeedback = useMemo(() => {
    const start = (feedbackPage - 1) * FEEDBACK_PAGE_SIZE;
    return dashboard.recentFeedback.slice(start, start + FEEDBACK_PAGE_SIZE);
  }, [dashboard.recentFeedback, feedbackPage]);
  const examplePreviewHtml = useMemo(
    () => renderDocumentTemplate(examplePreviewTemplate, examplePreviewData, {
      generatedBy: 'docrud design studio',
      designPreset: examplePreviewPreset,
      watermarkLabel: CLIENT_PREVIEW_WATERMARK,
    }),
    [examplePreviewPreset]
  );
  const historyPageCount = Math.max(1, Math.ceil(history.length / HISTORY_PAGE_SIZE));
  const summaryPageCount = Math.max(1, Math.ceil(dashboard.documentSummary.length / SUMMARY_PAGE_SIZE));
  const feedbackPageCount = Math.max(1, Math.ceil(dashboard.recentFeedback.length / FEEDBACK_PAGE_SIZE));
  const dashboardQuickActions = useMemo(() => {
    const actions: Array<{ id: string; label: string; description: string; icon: typeof FileText; tab: string }> = [];

    if (!isEmployee && (!isClient || hasClientFeature('generate_documents'))) {
      actions.push({ id: 'generate', label: 'Generate', description: 'Create a new document', icon: FileText, tab: 'generate' });
    }
    if (!isEmployee && (!isClient || hasClientFeature('history'))) {
      actions.push({ id: 'history', label: 'History', description: 'Open recent document runs', icon: History, tab: 'history' });
    }
    if (!isEmployee && (!isClient || hasClientFeature('document_summary'))) {
      actions.push({ id: 'summary', label: 'Summary', description: 'Review engagement metrics', icon: PieChart, tab: 'summary' });
    }
    if (isAdmin) {
      actions.push({ id: 'ops', label: 'Document Ops', description: 'Go to workspace operations', icon: FolderKanban, tab: 'workspace' });
    }
    if (isClient && hasClientFeature('client_portal')) {
      actions.push({ id: 'portal', label: 'Client Portal', description: 'Track delivery and access', icon: BriefcaseBusiness, tab: 'client-portal' });
    }
    actions.push({ id: 'tutorials', label: 'Tutorials', description: 'Open product walkthroughs', icon: BookOpen, tab: 'tutorials' });

    return actions.slice(0, 6);
  }, [hasClientFeature, isAdmin, isClient, isEmployee]);
  const dashboardGuideCards = useMemo(
    () => [
      {
        id: 'generate',
        label: 'Generate Documents',
        why: 'Use this when you need a fresh controlled document, intake form, or signing workflow from an approved template.',
        steps: ['Choose a template.', 'Fill required fields and controls.', 'Generate preview, then send or download.'],
      },
      {
        id: 'history',
        label: 'History & Reuse',
        why: 'Use this to verify what happened, reopen shared records, or quickly issue similar documents again.',
        steps: ['Open the latest run.', 'Check delivery and comments.', 'Reuse past data for the next cycle.'],
      },
      {
        id: 'summary',
        label: 'Document Summary',
        why: 'Use this to track opens, downloads, edits, comments, and signature activity before following up.',
        steps: ['Review engagement metrics.', 'Spot stalled documents.', 'Open the relevant shared link and act.'],
      },
      {
        id: 'tutorials',
        label: 'Tutorial Center',
        why: 'Use this when a teammate needs plain-language guidance on what a feature does and how to operate it correctly.',
        steps: ['Pick a feature area.', 'Read why it matters.', 'Follow the step-by-step rollout notes.'],
      },
    ],
    []
  );
  const dashboardTrackingCards = useMemo(
    () => [
      {
        label: 'Shared link opens',
        value: dashboard.documentSummary.reduce((sum, item) => sum + item.openCount, 0),
        tone: 'bg-slate-950 text-white',
      },
      {
        label: 'Recipient downloads',
        value: dashboard.documentSummary.reduce((sum, item) => sum + item.downloadCount, 0),
        tone: 'bg-orange-50 text-slate-950',
      },
      {
        label: 'Pending feedback replies',
        value: dashboard.documentSummary.reduce((sum, item) => sum + item.pendingFeedbackCount, 0),
        tone: 'bg-amber-50 text-slate-950',
      },
    ],
    [dashboard.documentSummary]
  );
  const clientIndustryProfile = useMemo(
    () => getIndustryWorkspaceProfile(clientBusinessSettings?.industry),
    [clientBusinessSettings?.industry]
  );
  const clientStarterTemplates = useMemo(
    () => allowedTemplates.filter((template) => template.organizationId === session?.user?.id).slice(0, 4),
    [allowedTemplates, session?.user?.id]
  );
  const sidebarGroups = useMemo(() => {
    const groups: Array<{
      id: string;
      label: string;
      badge?: string;
      items: Array<{ id: string; label: string; icon: typeof FileText; description: string }>;
    }> = [];

    if (!isEmployee && (!isClient || hasClientFeature('dashboard') || hasClientFeature('document_summary') || hasClientFeature('generate_documents') || hasClientFeature('history'))) {
      groups.push({
        id: 'core',
        label: 'Core Workspace',
        badge: 'Daily',
        items: [
          ...((!isClient || hasClientFeature('dashboard')) ? [{ id: 'dashboard', label: 'Dashboard', icon: BarChart3, description: 'Overview and next actions' }] : []),
          ...((!isClient || hasClientFeature('document_summary')) ? [{ id: 'summary', label: 'Document Summary', icon: PieChart, description: 'Tracking and recipient analytics' }] : []),
          ...((!isClient || hasClientFeature('generate_documents')) ? [{ id: 'generate', label: 'Generate Documents', icon: FileText, description: 'Create, preview, and send documents' }] : []),
          ...((!isClient || hasClientFeature('history')) ? [{ id: 'history', label: 'History', icon: History, description: 'Reuse and verify prior runs' }] : []),
        ],
      });
    }

    if (isClient || isEmployee) {
      groups.push({
        id: 'portal',
        label: 'My Space',
        badge: isEmployee ? 'Personal' : 'Client',
        items: [
          ...(isClient && hasClientFeature('client_portal') ? [{ id: 'client-portal', label: 'Client Portal', icon: BriefcaseBusiness, description: 'Track shared documents and actions' }] : []),
          ...(isClient ? [{ id: 'business-settings', label: 'Business Settings', icon: Settings, description: 'Branding, presets, and starter packs' }] : []),
          ...(isEmployee ? [{ id: 'employee-portal', label: 'Employee Portal', icon: ShieldCheck, description: 'Onboarding and verification progress' }] : []),
        ],
      });
    }

    if (isAdmin) {
      groups.push({
        id: 'operations',
        label: 'Operations',
        badge: 'Admin',
        items: [
          { id: 'workspace', label: 'Document Ops', icon: BriefcaseBusiness, description: 'Govern workspace documents' },
          { id: 'file-manager', label: 'File Manager', icon: FolderKanban, description: 'Store supporting files' },
          { id: 'roles', label: 'Roles & Permissions', icon: ShieldCheck, description: 'Control access and responsibilities' },
          { id: 'approvals', label: 'Approvals', icon: BriefcaseBusiness, description: 'Set approval workflows' },
          { id: 'versions', label: 'Versions', icon: History, description: 'Track revisions and snapshots' },
          { id: 'clauses', label: 'Clauses', icon: FileText, description: 'Manage reusable content blocks' },
          { id: 'audit', label: 'Audit', icon: Eye, description: 'Inspect action logs and trails' },
          { id: 'bulk', label: 'Bulk Ops', icon: Copy, description: 'Run multi-document actions' },
          { id: 'renewals', label: 'Renewals', icon: RefreshCw, description: 'Handle expiry and refresh cycles' },
        ],
      });
      groups.push({
        id: 'platform',
        label: 'Platform',
        badge: 'Scale',
        items: [
          { id: 'analytics', label: 'Analytics', icon: BarChart3, description: 'Platform usage and trends' },
          { id: 'integrations', label: 'Integrations', icon: Share2, description: 'External systems and endpoints' },
          { id: 'organizations', label: 'Organizations', icon: Settings, description: 'Multi-entity platform controls' },
          { id: 'copilot', label: 'AI Copilot', icon: MessageSquare, description: 'AI standards and assistive workflows' },
          { id: 'api-docs', label: 'API Docs', icon: Link2, description: 'Integration payloads and routes' },
          { id: 'admin', label: 'Admin Panel', icon: Settings, description: 'Users, SaaS, theme, and controls' },
        ],
      });
    }

    groups.push({
      id: 'help',
      label: 'Guidance',
      badge: 'Learn',
      items: [{ id: 'tutorials', label: 'Tutorials', icon: BookOpen, description: 'Step-wise guides and product usage' }],
    });

    return groups.filter((group) => group.items.length > 0);
  }, [hasClientFeature, isAdmin, isClient, isEmployee]);

  useEffect(() => {
    if (status === 'authenticated') {
      void Promise.all([fetchTemplates(), fetchHistory(), fetchDashboard(), fetchSignatureSettings(), fetchCollaborationSettings()]);
      if (session?.user?.role === 'client') {
        void fetch('/api/business/settings').then((response) => response.ok ? response.json() : null).then((payload) => setClientBusinessSettings(payload));
      }
    }
  }, [session?.user?.role, status]);

  useEffect(() => {
    if (status === 'authenticated' && isClient) {
      setActiveTab(clientCanAccessDashboard ? 'dashboard' : 'client-portal');
    }
    if (status === 'authenticated' && isEmployee) {
      setActiveTab('employee-portal');
    }
  }, [clientCanAccessDashboard, isClient, isEmployee, status]);

  useEffect(() => {
    if (!selectedTemplate || !isOnboardingTemplate) {
      return;
    }

    setRequiredDocumentWorkflowEnabled(true);
    setRequiredDocumentsText((current) => current || DEFAULT_BGV_DOCUMENTS.join(', '));
    setRecipientSignatureRequired(true);
  }, [isOnboardingTemplate, selectedTemplate]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [activeTab]);

  const fetchTemplates = async () => {
    const response = await fetch('/api/templates');
    if (response.ok) setTemplates(await response.json());
    else setErrorMessage('Unable to load templates.');
  };

  const fetchHistory = async () => {
    const response = await fetch('/api/history');
    if (response.ok) setHistory(await response.json());
    else setErrorMessage('Unable to load history.');
  };

  const fetchDashboard = async () => {
    const response = await fetch('/api/dashboard');
    if (response.ok) setDashboard(await response.json());
    else setErrorMessage('Unable to load dashboard metrics.');
  };

  const fetchSignatureSettings = async () => {
    const response = await fetch('/api/settings/signature');
    if (response.ok) setSignatureSettings(await response.json());
  };

  const fetchCollaborationSettings = async () => {
    const response = await fetch('/api/settings/collaboration');
    if (response.ok) {
      const settings = await response.json();
      setCollaborationSettings(settings);
      setRecipientAccess(settings.defaultRecipientAccess || 'comment');
    }
  };

  const validateRequiredFields = (template: DocumentTemplate, data: Record<string, string>) =>
    template.fields.filter((field) => field.required && !data[field.name]?.trim());

  const buildTemplateData = () =>
    (selectedTemplate?.fields || []).reduce<Record<string, string>>((acc, field) => {
      acc[field.name] = formData[field.name] || '';
      return acc;
    }, {});

  const buildRelativeSharePath = (item?: ShareTarget | null) => {
    if (!item) return '';
    if (item.shareUrl) {
      return item.shareUrl.startsWith('http')
        ? new URL(item.shareUrl).pathname
        : item.shareUrl;
    }
    if (item.shareId) return `/documents/${item.shareId}`;
    if (item.id) return `/documents/${item.id}`;
    return '';
  };

  const buildAbsoluteShareUrl = (item?: ShareTarget | null) => {
    const relativePath = buildRelativeSharePath(item);
    if (!relativePath) return '';
    return relativePath.startsWith('http') ? relativePath : `${window.location.origin}${relativePath}`;
  };

  const buildShareMessage = (item: Pick<DocumentHistory, 'templateName' | 'sharePassword' | 'recipientSignatureRequired' | 'recipientAccess' | 'shareUrl' | 'dataCollectionEnabled' | 'dataCollectionInstructions'>) => {
    const absoluteUrl = buildAbsoluteShareUrl(item);
    const passwordLine = item.recipientSignatureRequired && item.sharePassword
      ? `Signing password: ${item.sharePassword}`
      : item.sharePassword
        ? `Access password: ${item.sharePassword}`
        : '';
    const introLine = item.dataCollectionEnabled
      ? `Please complete the requested ${item.templateName} form from docrud.`
      : `Please review this ${item.templateName} from docrud.`;
    const instructionsLine = item.dataCollectionEnabled && item.dataCollectionInstructions?.trim()
      ? `Instructions: ${item.dataCollectionInstructions.trim()}`
      : '';
    const accessLabel = item.recipientAccess === 'edit'
      ? 'Recipient access: edit, comment, and review'
      : item.recipientAccess === 'view'
        ? 'Recipient access: view only'
        : 'Recipient access: comment and review';

    return [
      introLine,
      absoluteUrl ? `Document link: ${absoluteUrl}` : '',
      accessLabel,
      instructionsLine,
      passwordLine,
    ]
      .filter(Boolean)
      .join('\n');
  };

  useEffect(() => {
    const firstSharePath = buildRelativeSharePath(currentHistoryEntry || history.find((entry) => entry.shareUrl || entry.shareId));
    if (firstSharePath) {
      router.prefetch(firstSharePath);
    }
  }, [currentHistoryEntry, history, router]);

  const handleTemplateSelect = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
    setSelectedDesignPreset(DEFAULT_DOCUMENT_DESIGN_PRESET);
    setFormData({});
    setOnboardingContext({
      employeeName: '',
      employeeEmail: '',
      employeeDepartment: '',
      employeeDesignation: '',
      employeeCode: '',
    });
    setGeneratedHtml('');
    setCurrentHistoryEntry(null);
    setSelectedSignatureId('');
    setRequiredDocumentWorkflowEnabled(false);
    setRequiredDocumentsText('');
    setDataCollectionEnabled(false);
    setDataCollectionInstructions('');
    setRecipientAccess(collaborationSettings.defaultRecipientAccess || 'comment');
    setActiveTab('generate');
    setSidebarOpen(false);
    setErrorMessage('');
    setSuccessMessage('');
    setDraftRestored(false);
  };

  const handleDesignPresetChange = (preset: DocumentDesignPreset) => {
    setSelectedDesignPreset(preset);
    setGeneratedHtml('');
    setCurrentHistoryEntry(null);
    setSuccessMessage('');
    setErrorMessage('');
  };

  const openExamplePreview = (preset: DocumentDesignPreset) => {
    setExamplePreviewPreset(preset);
    setExamplePreviewOpen(true);
  };

  useEffect(() => {
    if (!selectedTemplate || typeof window === 'undefined') {
      return;
    }

    const rawDraft = window.localStorage.getItem(`${DRAFT_STORAGE_PREFIX}${selectedTemplate.id}`);
    if (!rawDraft) {
      setDraftRestored(false);
      return;
    }

    try {
      const parsed = JSON.parse(rawDraft) as Record<string, string>;
      if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
        setFormData(parsed);
        setSuccessMessage('Recovered your saved draft for this template.');
        setErrorMessage('');
        setDraftRestored(true);
      }
    } catch {
      window.localStorage.removeItem(`${DRAFT_STORAGE_PREFIX}${selectedTemplate.id}`);
      setDraftRestored(false);
    }
  }, [selectedTemplate]);

  useEffect(() => {
    if (!selectedTemplate || typeof window === 'undefined') {
      return;
    }

    const storageKey = `${DRAFT_STORAGE_PREFIX}${selectedTemplate.id}`;
    const hasContent = Object.values(formData).some((value) => value?.trim());

    if (hasContent) {
      window.localStorage.setItem(storageKey, JSON.stringify(formData));
    } else {
      window.localStorage.removeItem(storageKey);
    }
  }, [formData, selectedTemplate]);

  const saveToHistory = async (
    template: DocumentTemplate,
    data: Record<string, string>,
    previewHtml: string,
    signature: SignatureRecord,
    options?: {
      recipientAccess?: RecipientAccessLevel;
      recipientSignatureRequired?: boolean;
        dataCollectionEnabled?: boolean;
        dataCollectionStatus?: DataCollectionStatus;
        dataCollectionInstructions?: string;
        shareAccessPolicy?: 'standard' | 'expiring' | 'one_time';
        shareExpiresAt?: string;
        maxAccessCount?: number;
      }
  ) => {
    const requiresOnboarding = template.category?.toLowerCase() === 'hr' || ONBOARDING_TEMPLATE_IDS.includes(template.id);
    const response = await fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateId: template.id,
        templateName: template.name,
        category: template.category,
        data,
        previewHtml,
        signatureId: signature.id,
        signatureName: signature.signerName,
        signatureRole: signature.signerRole,
        signatureSignedAt: signature.signedAt,
        signatureSignedIp: signature.signedIp,
        requiredDocumentWorkflowEnabled: requiresOnboarding ? true : requiredDocumentWorkflowEnabled,
        requiredDocuments: requiresOnboarding
          ? DEFAULT_BGV_DOCUMENTS
          : requiredDocumentsText.split(',').map((item) => item.trim()).filter(Boolean),
        recipientSignatureRequired: requiresOnboarding ? true : (options?.recipientSignatureRequired ?? recipientSignatureRequired),
        recipientAccess: options?.recipientAccess || recipientAccess,
        dataCollectionEnabled: options?.dataCollectionEnabled ?? dataCollectionEnabled,
        dataCollectionStatus: options?.dataCollectionStatus || ((options?.dataCollectionEnabled ?? dataCollectionEnabled) ? 'sent' : 'disabled'),
        dataCollectionInstructions: options?.dataCollectionInstructions ?? dataCollectionInstructions,
        shareAccessPolicy: options?.shareAccessPolicy ?? shareAccessPolicy,
        shareExpiresAt: options?.shareExpiresAt ?? (shareAccessPolicy === 'expiring' && shareExpiryDays ? new Date(Date.now() + Number(shareExpiryDays) * 24 * 60 * 60 * 1000).toISOString() : undefined),
        maxAccessCount: options?.maxAccessCount ?? (shareAccessPolicy === 'one_time' ? Math.max(1, Number(maxAccessCount) || 1) : undefined),
        onboardingRequired: requiresOnboarding,
        employeeName: onboardingContext.employeeName.trim(),
        employeeEmail: onboardingContext.employeeEmail.trim(),
        employeeDepartment: onboardingContext.employeeDepartment.trim(),
        employeeDesignation: onboardingContext.employeeDesignation.trim(),
        employeeCode: onboardingContext.employeeCode.trim(),
        editorState: isClient ? {
          designPreset: selectedDesignPreset,
          letterheadMode: clientBusinessSettings?.letterheadMode || 'default',
          letterheadImageDataUrl: clientBusinessSettings?.letterheadImageDataUrl,
          letterheadHtml: clientBusinessSettings?.letterheadHtml,
          watermarkLabel: clientBusinessSettings?.watermarkLabel,
        } : {
          designPreset: selectedDesignPreset,
        },
      }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error || 'Failed to save history');
    }
    const entry = await response.json();
    setCurrentHistoryEntry(entry);
    await Promise.all([fetchHistory(), fetchDashboard()]);
    return entry as DocumentHistory;
  };

  const generateDocument = async () => {
    if (!selectedTemplate) return;
    if (!selectedSignature) {
      setErrorMessage('Please choose an authorized admin signature before generating the document.');
      setSuccessMessage('');
      return;
    }

    try {
      setIsGeneratingPreview(true);
      const data = buildTemplateData();
      const missingFields = validateRequiredFields(selectedTemplate, data);
      if (missingFields.length > 0) {
        throw new Error(`Please fill in: ${missingFields.map((field) => field.label).join(', ')}`);
      }
      if (isOnboardingTemplate) {
        if (!onboardingContext.employeeName.trim() || !onboardingContext.employeeEmail.trim()) {
          throw new Error('Employee name and employee email are required for onboarding workflows.');
        }
      }

      const initialPreviewHtml = renderDocumentTemplate(selectedTemplate, data, {
        generatedBy: session?.user?.email || 'docrud workflow',
        designPreset: selectedDesignPreset,
        signature: selectedSignature,
        watermarkLabel: isClient && session?.user?.subscription?.status === 'trial' ? 'docrud trial workspace' : undefined,
        letterheadMode: clientBusinessSettings?.letterheadMode,
        letterheadImageDataUrl: clientBusinessSettings?.letterheadImageDataUrl,
        letterheadHtml: clientBusinessSettings?.letterheadHtml,
      });
      const historyEntry = await saveToHistory(selectedTemplate, data, initialPreviewHtml, selectedSignature);
      const brandedHtml = renderDocumentTemplate(selectedTemplate, data, {
        referenceNumber: historyEntry.referenceNumber,
        generatedAt: historyEntry.generatedAt,
        generatedBy: historyEntry.generatedBy,
        designPreset: historyEntry.editorState?.designPreset,
        signature: selectedSignature,
        watermarkLabel: historyEntry.editorState?.watermarkLabel,
        letterheadMode: historyEntry.editorState?.letterheadMode,
        letterheadImageDataUrl: historyEntry.editorState?.letterheadImageDataUrl,
        letterheadHtml: historyEntry.editorState?.letterheadHtml,
      });

      await fetch('/api/history', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: historyEntry.id,
          previewHtml: brandedHtml,
        }),
      });

      const clientPreviewHtml = isClient
        ? buildClientPreviewHtml(selectedTemplate, data, selectedSignature, {
            referenceNumber: historyEntry.referenceNumber,
            generatedAt: historyEntry.generatedAt,
            generatedBy: historyEntry.generatedBy,
            designPreset: historyEntry.editorState?.designPreset,
            letterheadMode: historyEntry.editorState?.letterheadMode,
            letterheadImageDataUrl: historyEntry.editorState?.letterheadImageDataUrl,
            letterheadHtml: historyEntry.editorState?.letterheadHtml,
          })
        : brandedHtml;

      setGeneratedHtml(clientPreviewHtml);
      setCurrentHistoryEntry({ ...historyEntry, previewHtml: brandedHtml });
      if (selectedTemplate && typeof window !== 'undefined') {
        window.localStorage.removeItem(`${DRAFT_STORAGE_PREFIX}${selectedTemplate.id}`);
      }
      setDraftRestored(false);
      setEmailData((prev) => ({
        to: prev.to,
        subject: `${selectedTemplate.name} - ${historyEntry.referenceNumber}`,
        message: prev.message || buildShareMessage(historyEntry),
      }));
      setSuccessMessage('Preview generated successfully. You can now download, share, or email the document.');
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to generate preview.');
      setSuccessMessage('');
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const createDataCollectionRequest = async () => {
    if (!selectedTemplate) return;
    if (!selectedSignature) {
      setErrorMessage('Please choose an authorized admin signature before creating a data collection form.');
      setSuccessMessage('');
      return;
    }

    try {
      setIsCreatingDataCollectionRequest(true);
      const data = buildTemplateData();
      const previewHtml = renderDocumentTemplate(selectedTemplate, data, {
        generatedBy: session?.user?.email || 'docrud workflow',
        designPreset: selectedDesignPreset,
        signature: selectedSignature,
        watermarkLabel: isClient && session?.user?.subscription?.status === 'trial' ? 'docrud trial workspace' : undefined,
        letterheadMode: clientBusinessSettings?.letterheadMode,
        letterheadImageDataUrl: clientBusinessSettings?.letterheadImageDataUrl,
        letterheadHtml: clientBusinessSettings?.letterheadHtml,
      });

      const historyEntry = await saveToHistory(selectedTemplate, data, previewHtml, selectedSignature, {
        recipientAccess: 'edit',
        recipientSignatureRequired: false,
        dataCollectionEnabled: true,
        dataCollectionStatus: 'sent',
        dataCollectionInstructions,
        shareAccessPolicy,
        shareExpiresAt: shareAccessPolicy === 'expiring' && shareExpiryDays ? new Date(Date.now() + Number(shareExpiryDays) * 24 * 60 * 60 * 1000).toISOString() : undefined,
        maxAccessCount: shareAccessPolicy === 'one_time' ? Math.max(1, Number(maxAccessCount) || 1) : undefined,
      });

      setGeneratedHtml(isClient ? buildClientPreviewHtml(selectedTemplate, data, selectedSignature) : previewHtml);
      setCurrentHistoryEntry({ ...historyEntry, previewHtml });
      setRecipientAccess('edit');
      setSuccessMessage(`Data collection form created successfully. Share link ready at ${buildAbsoluteShareUrl(historyEntry) || historyEntry.shareUrl || `/documents/${historyEntry.shareId}`}.`);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create data collection form');
      setSuccessMessage('');
    } finally {
      setIsCreatingDataCollectionRequest(false);
    }
  };

  const buildClientPreviewHtml = (
    template: DocumentTemplate,
    data: Record<string, string>,
    signature: SignatureRecord,
    overrides?: {
      referenceNumber?: string;
      generatedAt?: string;
      generatedBy?: string;
      designPreset?: DocumentDesignPreset;
      letterheadMode?: 'default' | 'image' | 'html';
      letterheadImageDataUrl?: string;
      letterheadHtml?: string;
    }
  ) => renderDocumentTemplate(template, data, {
    referenceNumber: overrides?.referenceNumber,
    generatedAt: overrides?.generatedAt,
    generatedBy: overrides?.generatedBy || session?.user?.email || 'docrud workflow',
    designPreset: overrides?.designPreset || selectedDesignPreset,
    signature,
    watermarkLabel: CLIENT_PREVIEW_WATERMARK,
    letterheadMode: overrides?.letterheadMode ?? clientBusinessSettings?.letterheadMode,
    letterheadImageDataUrl: overrides?.letterheadImageDataUrl ?? clientBusinessSettings?.letterheadImageDataUrl,
    letterheadHtml: overrides?.letterheadHtml ?? clientBusinessSettings?.letterheadHtml,
  });

  const requestPdf = async () => {
    if (!selectedTemplate || !selectedSignature) {
      throw new Error('Please select a template and signature first.');
    }

    const data = buildTemplateData();
    const response = await fetch('/api/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template: selectedTemplate,
        data,
        referenceNumber: currentHistoryEntry?.referenceNumber,
        generatedAt: currentHistoryEntry?.generatedAt,
        generatedBy: currentHistoryEntry?.generatedBy || session?.user?.email,
        signatureId: selectedSignature.id,
        designPreset: currentHistoryEntry?.editorState?.designPreset || selectedDesignPreset,
        watermarkLabel: currentHistoryEntry?.editorState?.watermarkLabel,
        letterheadMode: currentHistoryEntry?.editorState?.letterheadMode,
        letterheadImageDataUrl: currentHistoryEntry?.editorState?.letterheadImageDataUrl,
        letterheadHtml: currentHistoryEntry?.editorState?.letterheadHtml,
      }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error || 'Failed to generate PDF');
    }
    return response.blob();
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  };

  const generatePDF = async () => {
    if (!generatedHtml || !selectedTemplate) return;
    try {
      setIsGeneratingPdf(true);
      const blob = await requestPdf();
      downloadBlob(blob, `${selectedTemplate.name.replace(/\s+/g, '_')}.pdf`);
      setSuccessMessage('PDF generated successfully.');
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Error generating PDF');
      setSuccessMessage('');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const sendEmail = async () => {
    if (!generatedHtml || !selectedTemplate || !currentHistoryEntry) return;
    try {
      setIsSendingEmail(true);
      const pdfBlob = await requestPdf();
      const pdfBuffer = await pdfBlob.arrayBuffer();
      const emailText = [emailData.message.trim(), buildShareMessage(currentHistoryEntry)]
        .map((value) => stripEditorHtml(value))
        .filter(Boolean)
        .join('\n\n');
      const emailResponse = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          historyId: currentHistoryEntry.id,
          to: emailData.to,
          subject: emailData.subject,
          text: emailText,
          attachment: Array.from(new Uint8Array(pdfBuffer)),
        }),
      });
      const payload = await emailResponse.json().catch(() => null);
      if (!emailResponse.ok) throw new Error(payload?.error || 'Failed to send email');
      setSuccessMessage('Email sent successfully.');
      setErrorMessage('');
      setEmailDialogOpen(false);
      await Promise.all([fetchHistory(), fetchDashboard()]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to send email');
      setSuccessMessage('');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const revokeCurrentShare = async () => {
    if (!currentHistoryEntry) return;
    if (!confirm('Revoke this shared link? Recipients will no longer be able to open it.')) return;
    try {
      const response = await fetch('/api/history', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentHistoryEntry.id,
          revokedAt: new Date().toISOString(),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Failed to revoke link');
      setCurrentHistoryEntry(payload);
      await Promise.all([fetchHistory(), fetchDashboard()]);
      setSuccessMessage('Shared link revoked successfully.');
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to revoke link');
      setSuccessMessage('');
    }
  };

  const reuseHistoryItem = (item: DocumentHistory) => {
    const template = templates.find((entry) => entry.id === item.templateId || entry.name === item.templateName);
    if (!template) {
      setErrorMessage('This history entry uses a template that is no longer available.');
      setSuccessMessage('');
      return;
    }

    const historySignature = availableSignatures.find((signature) => signature.id === item.signatureId) || null;
    setSelectedTemplate(template);
    setSelectedSignatureId(historySignature?.id || '');
    setSelectedDesignPreset(item.editorState?.designPreset || DEFAULT_DOCUMENT_DESIGN_PRESET);
    setRequiredDocumentWorkflowEnabled(item.requiredDocumentWorkflowEnabled ?? false);
    setRequiredDocumentsText((item.requiredDocuments || []).join(', '));
    setShareAccessPolicy(item.shareAccessPolicy || 'standard');
    setShareExpiryDays(item.shareExpiresAt ? String(Math.max(1, Math.ceil((new Date(item.shareExpiresAt).getTime() - Date.now()) / 86400000))) : '7');
    setMaxAccessCount(String(item.maxAccessCount || 1));
    setRecipientSignatureRequired(item.recipientSignatureRequired ?? true);
    setRecipientAccess(item.recipientAccess || collaborationSettings.defaultRecipientAccess || 'comment');
    setDataCollectionEnabled(Boolean(item.dataCollectionEnabled));
    setDataCollectionInstructions(item.dataCollectionInstructions || '');
    setOnboardingContext({
      employeeName: item.employeeName || '',
      employeeEmail: item.employeeEmail || '',
      employeeDepartment: item.employeeDepartment || '',
      employeeDesignation: item.employeeDesignation || '',
      employeeCode: item.employeeCode || '',
    });
    setFormData(item.data || {});
    const recipientSignature = item.recipientSignatureDataUrl
      ? {
          signerName: item.recipientSignerName || 'Recipient',
          signatureDataUrl: item.recipientSignatureDataUrl,
          signatureSource: item.recipientSignatureSource,
          signedAt: item.recipientSignedAt,
          signedIp: item.recipientSignedIp,
          signedLocationLabel: item.recipientSignedLocationLabel,
          signedLatitude: item.recipientSignedLatitude,
          signedLongitude: item.recipientSignedLongitude,
          signedAccuracyMeters: item.recipientSignedAccuracyMeters,
        }
      : null;
    setGeneratedHtml(
      renderDocumentTemplate(template, item.data || {}, {
        referenceNumber: item.referenceNumber,
        generatedAt: item.generatedAt,
        generatedBy: item.generatedBy,
        designPreset: item.editorState?.designPreset,
        signature: historySignature,
        watermarkLabel: item.editorState?.watermarkLabel,
        letterheadMode: item.editorState?.letterheadMode,
        letterheadImageDataUrl: item.editorState?.letterheadImageDataUrl,
        letterheadHtml: item.editorState?.letterheadHtml,
        recipientSignature,
      })
    );
    setCurrentHistoryEntry(item);
    setActiveTab('generate');
    setEmailData({
      to: item.emailTo || '',
      subject: item.emailSubject || `${item.templateName} - ${item.referenceNumber || ''}`.trim(),
      message: buildShareMessage(item),
    });
    setSuccessMessage(`Loaded ${item.templateName} from history.`);
    setErrorMessage('');
  };

  const openDocumentLink = (item?: ShareTarget | null) => {
    const relativePath = buildRelativeSharePath(item);
    if (!relativePath) {
      setErrorMessage('This document does not have a generated share link yet.');
      setSuccessMessage('');
      return;
    }
    router.push(relativePath);
  };

  const copyDocumentLink = async (item?: ShareTarget | null) => {
    const absoluteUrl = buildAbsoluteShareUrl(item);
    if (!absoluteUrl) return;
    await navigator.clipboard.writeText(absoluteUrl);
    setSuccessMessage('Document link copied successfully.');
    setErrorMessage('');
  };

  const shareByWhatsApp = (item: DocumentHistory) => {
    const absoluteUrl = buildAbsoluteShareUrl(item);
    if (!absoluteUrl) return;
    const text = encodeURIComponent(buildShareMessage(item));
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const nativeShare = async (item: DocumentHistory) => {
    const absoluteUrl = buildAbsoluteShareUrl(item);
    if (!absoluteUrl) return;
    if (navigator.share) {
      await navigator.share({
        title: item.templateName,
        text: buildShareMessage(item),
        url: absoluteUrl,
      });
      return;
    }
    await copyDocumentLink(item);
  };

  const restoreLatestTemplateData = () => {
    if (!latestTemplateHistoryEntry) {
      setErrorMessage('No previously generated document data is available for this template yet.');
      setSuccessMessage('');
      return;
    }

    setFormData(latestTemplateHistoryEntry.data || {});
    setOnboardingContext({
      employeeName: latestTemplateHistoryEntry.employeeName || '',
      employeeEmail: latestTemplateHistoryEntry.employeeEmail || '',
      employeeDepartment: latestTemplateHistoryEntry.employeeDepartment || '',
      employeeDesignation: latestTemplateHistoryEntry.employeeDesignation || '',
      employeeCode: latestTemplateHistoryEntry.employeeCode || '',
    });
    setSelectedDesignPreset(latestTemplateHistoryEntry.editorState?.designPreset || DEFAULT_DOCUMENT_DESIGN_PRESET);
    setDataCollectionEnabled(Boolean(latestTemplateHistoryEntry.dataCollectionEnabled));
    setDataCollectionInstructions(latestTemplateHistoryEntry.dataCollectionInstructions || '');
    setShareAccessPolicy(latestTemplateHistoryEntry.shareAccessPolicy || 'standard');
    setShareExpiryDays(latestTemplateHistoryEntry.shareExpiresAt ? String(Math.max(1, Math.ceil((new Date(latestTemplateHistoryEntry.shareExpiresAt).getTime() - Date.now()) / 86400000))) : '7');
    setMaxAccessCount(String(latestTemplateHistoryEntry.maxAccessCount || 1));
    setGeneratedHtml('');
    setCurrentHistoryEntry(null);
    setSuccessMessage(`Loaded the latest saved values from ${latestTemplateHistoryEntry.referenceNumber}.`);
    setErrorMessage('');
  };

  const clearDraft = () => {
    if (selectedTemplate && typeof window !== 'undefined') {
      window.localStorage.removeItem(`${DRAFT_STORAGE_PREFIX}${selectedTemplate.id}`);
    }
    setFormData({});
    setDraftRestored(false);
    setSuccessMessage('Draft cleared for this template.');
    setErrorMessage('');
  };

  const renderField = (field: DocumentField) => {
    const value = formData[field.name] || '';
    switch (field.type) {
      case 'textarea':
        return (
          <RichTextEditor
            value={value}
            onChange={(nextValue) => setFormData((prev) => ({ ...prev, [field.name]: nextValue }))}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
          />
        );
      case 'select':
        return (
          <Select value={value} onValueChange={(nextValue) => setFormData((prev) => ({ ...prev, [field.name]: nextValue }))}>
            <SelectTrigger><SelectValue placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`} /></SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
            </SelectContent>
          </Select>
        );
      default:
        return <Input type={field.type} value={value} onChange={(event) => setFormData((prev) => ({ ...prev, [field.name]: event.target.value }))} placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`} required={field.required} />;
    }
  };

  const submitFeedbackReply = async (item: DashboardMetrics['recentFeedback'][number]) => {
    const replyMessage = replyDrafts[item.id]?.trim();
    if (!replyMessage) return;

    try {
      setReplyingCommentId(item.id);
      const shareId = item.shareUrl?.split('/').pop() || item.documentId;
      const response = await fetch(`/api/public/documents/${shareId}/comments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId: item.id,
          replyMessage,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to save reply');
      }
      setReplyDrafts((prev) => ({ ...prev, [item.id]: '' }));
      setSuccessMessage('Reply added successfully.');
      setErrorMessage('');
      await Promise.all([fetchHistory(), fetchDashboard()]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save reply');
      setSuccessMessage('');
    } finally {
      setReplyingCommentId('');
    }
  };

  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div></div>;
  }
  if (status === 'unauthenticated') return null;

  const setupChecklist = clientBusinessSettings?.workspaceSetupChecklist;
  const setupChecklistItems = [
    { key: 'profileConfigured', label: 'Complete business profile', tab: 'business-settings' },
    { key: 'brandingConfigured', label: 'Configure branding and letterhead', tab: 'business-settings' },
    { key: 'starterTemplatesReady', label: 'Review starter templates', tab: 'business-settings' },
    { key: 'signaturesReady', label: 'Add at least one signature', tab: 'business-settings' },
    { key: 'firstDocumentGenerated', label: 'Generate your first document', tab: 'generate' },
  ] as const;
  const setupCompletion = setupChecklist ? Math.round((setupChecklistItems.filter((item) => Boolean(setupChecklist[item.key])).length / setupChecklistItems.length) * 100) : 0;

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-100">
      <header className="sticky top-0 z-30 border-b border-white/60 bg-white/70 backdrop-blur-xl shadow-[0_18px_40px_rgba(148,163,184,0.14)]">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 py-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}><Menu className="h-6 w-6" /></Button>
              <Button
                variant="outline"
                size="icon"
                className="hidden md:inline-flex"
                onClick={() => setSidebarHidden((prev) => !prev)}
              >
                {sidebarHidden ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </Button>
              <div className="min-w-0">
                <div className="inline-flex items-center rounded-2xl bg-slate-950 px-4 py-2 text-xl font-black lowercase tracking-[0.12em] text-white shadow-[0_16px_36px_rgba(15,23,42,0.18)] sm:text-2xl">
                  docrud
                </div>
              </div>
            </div>
            <div className="flex w-full flex-wrap items-center justify-between gap-2 md:w-auto md:justify-end md:gap-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">Welcome, {session?.user?.name}</p>
                <p className="truncate text-xs text-slate-500">{session?.user?.role === 'admin' ? 'Admin workspace' : session?.user?.role === 'client' ? 'Client workspace' : 'Employee workspace'}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => signOut()}><LogOut className="h-4 w-4 mr-2" />Logout</Button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px] gap-0 px-0 md:px-4 lg:px-6">
        <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${sidebarHidden ? 'md:hidden' : 'md:block'} fixed inset-y-0 left-0 z-50 w-[88vw] max-w-72 border-r border-white/60 bg-white/70 shadow-[18px_18px_42px_rgba(148,163,184,0.16),-8px_-8px_24px_rgba(255,255,255,0.82)] backdrop-blur-2xl transform transition-transform duration-300 ease-in-out md:sticky md:top-[81px] md:h-[calc(100vh-96px)] md:translate-x-0 md:rounded-[28px] md:border md:shadow-[18px_18px_42px_rgba(148,163,184,0.12),-8px_-8px_24px_rgba(255,255,255,0.72)]`}>
          <div className="flex items-center justify-between p-4 border-b md:hidden">
            <h2 className="text-lg font-semibold">Menu</h2>
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}><X className="h-6 w-6" /></Button>
          </div>

          <nav className="h-full overflow-y-auto p-4 space-y-6">
            <div className="space-y-3">
              {sidebarGroups.map((group) => {
                const expanded = expandedNavGroups.includes(group.id);
                return (
                  <div key={group.id} className="rounded-[24px] border border-white/70 bg-white/72 p-2 shadow-[8px_8px_24px_rgba(148,163,184,0.12),-6px_-6px_18px_rgba(255,255,255,0.82)]">
                    <button
                      type="button"
                      onClick={() => setExpandedNavGroups((prev) => expanded ? prev.filter((entry) => entry !== group.id) : [...prev, group.id])}
                      className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left"
                    >
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">{group.label}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {group.badge && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">{group.badge}</span>}
                        {expanded ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
                      </div>
                    </button>
                    {expanded && (
                      <div className="mt-2 space-y-1">
                        {group.items.map((item) => {
                          const active = activeTab === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setActiveTab(item.id);
                                setSidebarOpen(false);
                              }}
                              className={`w-full rounded-2xl px-3 py-3 text-left transition ${active ? 'bg-slate-950 text-white shadow-[0_18px_35px_rgba(15,23,42,0.18)]' : 'text-slate-700 hover:bg-slate-50'}`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`rounded-xl p-2 ${active ? 'bg-white/10' : 'bg-slate-100'}`}>
                                  <item.icon className={`h-4 w-4 ${active ? 'text-white' : 'text-slate-700'}`} />
                                </div>
                                <div className="min-w-0">
                                  <p className={`text-sm font-semibold ${active ? 'text-white' : 'text-slate-900'}`}>{item.label}</p>
                                  <p className={`mt-1 text-xs leading-5 ${active ? 'text-slate-300' : 'text-slate-500'}`}>{item.description}</p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {!isEmployee && (!isClient || hasClientFeature('generate_documents')) && (
            <div>
              <h3 className="text-sm font-medium text-slate-900 mb-3">Available Templates</h3>
              <div className="space-y-2 max-h-[50vh] overflow-auto">
                {allowedTemplates.map((template) => (
                  <button key={template.id} onClick={() => handleTemplateSelect(template)} className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${selectedTemplate?.id === template.id ? 'bg-blue-100 text-blue-900' : 'text-slate-700 hover:bg-slate-100'}`}>
                    <div className="font-medium">{template.name}</div>
                    <div className="text-xs text-slate-500">{template.category}</div>
                  </button>
                ))}
                {allowedTemplates.length === 0 && (
                  <p className="text-sm text-slate-500">No templates available for this account yet.</p>
                )}
              </div>
            </div>
            )}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 p-4 md:p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsContent value="dashboard" className="space-y-6">
              {isClient && clientBusinessSettings && setupCompletion < 100 && (
                <Card className="clay-soft border-white/60 bg-white/85 backdrop-blur">
                  <CardContent className="p-5 md:p-6">
                    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-600">Workspace Setup</p>
                        <h2 className="mt-2 text-2xl font-semibold text-slate-950">Finish the rollout checklist to make this tenant fully ready.</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-600">docrud is live, but a few setup tasks still need to be completed so your workspace is safe, branded, and ready for day-to-day production use.</p>
                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                          <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400" style={{ width: `${setupCompletion}%` }} />
                        </div>
                        <p className="mt-2 text-sm font-medium text-slate-700">{setupCompletion}% complete</p>
                      </div>
                      <div className="space-y-2">
                        {setupChecklistItems.map((item) => {
                          const done = Boolean(setupChecklist?.[item.key]);
                          return (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => setActiveTab(item.tab)}
                              className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${done ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'}`}
                            >
                              {done ? 'Done' : 'Next'}: {item.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="clay-panel overflow-hidden border-white/60 bg-white/80 backdrop-blur">
                <CardContent className="p-5 md:p-6">
                  <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
                    <div className="min-w-0 space-y-5">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-600">Workspace Overview</p>
                        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">A simpler command center for daily document operations.</h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                          Start here to search active records, jump into the next action, and follow a cleaner document workflow without hunting through multiple panels.
                        </p>
                      </div>
                      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                        <div className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/90 px-4 py-3 shadow-sm">
                          <FileSearch className="h-4 w-4 shrink-0 text-slate-500" />
                          <Input
                            value={dashboardSearch}
                            onChange={(event) => setDashboardSearch(event.target.value)}
                            placeholder="Search by template, reference, device, or latest activity"
                            className="border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-slate-50/90 p-2 text-center text-xs font-medium text-slate-600">
                          <div className="rounded-xl bg-white px-3 py-2 shadow-sm">1. Create</div>
                          <div className="rounded-xl bg-white px-3 py-2 shadow-sm">2. Review</div>
                          <div className="rounded-xl bg-white px-3 py-2 shadow-sm">3. Send</div>
                        </div>
                      </div>
                      {dashboardSearch.trim() && (
                        <div className="overflow-hidden rounded-2xl border border-white/70 bg-white/90">
                          {searchResults.length > 0 ? searchResults.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setActiveTab('summary')}
                              className="flex w-full items-center justify-between gap-4 border-b px-4 py-3 text-left last:border-b-0 hover:bg-orange-50/70"
                            >
                              <div className="min-w-0">
                                <p className="truncate font-medium text-slate-900">{item.templateName}</p>
                                <p className="truncate text-sm text-slate-500">{item.referenceNumber}</p>
                              </div>
                              <span className="shrink-0 text-xs text-slate-500">{item.openCount} opens</span>
                            </button>
                          )) : <p className="px-4 py-3 text-sm text-slate-500">No matching documents found.</p>}
                        </div>
                      )}
                      <div className="grid gap-3 lg:grid-cols-3">
                        {dashboardTrackingCards.map((card) => (
                          <div key={card.label} className={`rounded-2xl p-4 shadow-sm ${card.tone}`}>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-current/70">{card.label}</p>
                            <p className="mt-2 text-2xl font-semibold">{card.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-orange-700 p-5 text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-200">Quick Actions</p>
                          <p className="mt-2 text-lg font-semibold">Most-used actions</p>
                        </div>
                        <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-slate-100">{dashboardQuickActions.length} shortcuts</span>
                      </div>
                      <div className="mt-5 grid gap-3">
                        {dashboardQuickActions.map((action) => (
                          <button
                            key={action.id}
                            type="button"
                            onClick={() => setActiveTab(action.tab)}
                            className="rounded-2xl border border-white/10 bg-white/10 p-4 text-left transition hover:bg-white/15"
                          >
                            <div className="flex items-start gap-3">
                              <div className="rounded-xl bg-white/10 p-2">
                                <action.icon className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-white">{action.label}</p>
                                <p className="mt-1 text-xs leading-5 text-slate-200">{action.description}</p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                      <div className="mt-5 rounded-2xl border border-white/10 bg-white/10 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-200">Best Practice</p>
                        <p className="mt-2 text-sm leading-6 text-slate-100">Use quick actions for the first jump only. Once you are inside a workflow, keep working from that feature tab so context and recent progress stay together.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {isClient && clientBusinessSettings && (
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
                  <Card className="clay-soft border-white/60 bg-white/80 backdrop-blur">
                    <CardHeader>
                      <CardTitle>{clientIndustryProfile.heroTitle}</CardTitle>
                      <p className="text-sm text-slate-600">{clientIndustryProfile.heroDescription}</p>
                    </CardHeader>
                    <CardContent className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-[24px] border border-slate-200 bg-slate-50/90 p-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Workspace Alignment</p>
                        <p className="mt-3 text-lg font-semibold text-slate-950">{clientIndustryProfile.label} · {getWorkspacePresetLabel(clientBusinessSettings.workspacePreset)}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">Primary use case: {clientBusinessSettings.primaryUseCase || 'Not added yet. Add your main workflow in Business Settings.'}</p>
                        <div className="mt-4 space-y-2">
                          {clientIndustryProfile.dashboardFocus.map((item) => (
                            <div key={item} className="rounded-2xl bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">{item}</div>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-[24px] bg-slate-950 p-5 text-white">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-200">Onboarding Journey</p>
                        <div className="mt-4 space-y-3">
                          {clientIndustryProfile.onboardingSteps.map((step, index) => (
                            <div key={step} className="rounded-2xl bg-white/10 px-3 py-3 text-sm text-slate-100">
                              <span className="mr-2 font-semibold text-white">{index + 1}.</span>
                              {step}
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="clay-soft border-white/60 bg-white/80 backdrop-blur">
                    <CardHeader>
                      <CardTitle>Starter Templates</CardTitle>
                      <p className="text-sm text-slate-600">These editable templates were aligned to your industry during signup so your team can start quickly and refine them over time.</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {clientStarterTemplates.map((template) => (
                        <div key={template.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900">{template.name}</p>
                              <p className="mt-1 text-sm text-slate-500">{template.description || template.category}</p>
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={() => handleTemplateSelect(template)}>
                              Use
                            </Button>
                          </div>
                        </div>
                      ))}
                      {clientStarterTemplates.length === 0 && <p className="text-sm text-slate-500">Starter templates will appear here after your business profile is fully aligned.</p>}
                    </CardContent>
                  </Card>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: 'Total Documents', value: dashboard.totalDocuments, icon: FileText },
                  { label: 'Generated This Week', value: dashboard.documentsThisWeek, icon: Sparkles },
                  { label: 'Emails Sent', value: dashboard.emailsSent, icon: Mail },
                  { label: 'Templates Used', value: dashboard.templatesUsed, icon: BarChart3 },
                ].map((card) => (
                <Card key={card.label} className="clay-soft overflow-hidden border-white/70 bg-white/80"><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{card.label}</p><p className="mt-3 break-words text-3xl font-bold leading-none text-slate-950 sm:text-4xl">{card.value}</p></div><div className="rounded-2xl bg-orange-50 p-3"><card.icon className="h-5 w-5 shrink-0 text-orange-600" /></div></div></CardContent></Card>
                ))}
              </div>

              <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
                <Card className="clay-soft border-white/60 bg-white/75 backdrop-blur">
                  <CardHeader>
                    <CardTitle>Recent Generation Queue</CardTitle>
                    <p className="text-sm text-slate-500">Use this list as the daily follow-up stack for active document links and recipient interactions.</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {dashboard.recentActivity.map((item) => (
                      <div key={item.id} className="rounded-xl border p-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="font-medium text-slate-900">{item.templateName}</p>
                          <p className="text-sm text-slate-500">{item.referenceNumber}</p>
                          <p className="text-sm text-slate-500">{new Date(item.generatedAt).toLocaleString()}</p>
                          {item.recipientSignatureRequired && (
                            <p className="text-sm text-slate-500">Signing password: {item.sharePassword || 'Pending'}</p>
                          )}
                          {!!item.collaborationComments?.length && (
                            <p className="mt-2 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
                              {item.collaborationComments.length} feedback item{item.collaborationComments.length > 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" onClick={() => openDocumentLink(item)}>Open</Button>
                          <Button variant="outline" size="sm" onClick={() => void copyDocumentLink(item)}><Copy className="w-4 h-4 mr-2" />Copy</Button>
                          <Button variant="outline" size="sm" onClick={() => shareByWhatsApp(item)}><Share2 className="w-4 h-4 mr-2" />WhatsApp</Button>
                          <Button variant="outline" size="sm" onClick={() => void nativeShare(item)}><Share2 className="w-4 h-4 mr-2" />Share</Button>
                        </div>
                      </div>
                    ))}
                    {dashboard.recentActivity.length === 0 && <p className="text-sm text-slate-500">No recent activity available.</p>}
                  </CardContent>
                </Card>

                <div className="space-y-6">
                  <Card className="clay-soft border-white/60 bg-white/75 backdrop-blur">
                    <CardHeader>
                      <CardTitle>Template Demand</CardTitle>
                      <p className="text-sm text-slate-500">See which templates drive the most operational volume.</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {[...dashboard.topTemplates].slice(0, 5).map((item) => {
                        const max = dashboard.topTemplates[0]?.count || 1;
                        return (
                          <div key={item.templateName}>
                            <div className="mb-2 flex items-center justify-between text-sm">
                              <span className="font-medium text-slate-900">{item.templateName}</span>
                              <span className="text-slate-500">{item.count}</span>
                            </div>
                            <div className="h-3 rounded-full bg-orange-100">
                              <div className="h-3 rounded-full bg-black" style={{ width: `${(item.count / max) * 100}%` }} />
                            </div>
                          </div>
                        );
                      })}
                      {dashboard.topTemplates.length === 0 && <p className="text-sm text-slate-500">Template usage metrics will appear after document generation starts.</p>}
                    </CardContent>
                  </Card>

                  <Card className="clay-soft border-white/60 bg-white/75 backdrop-blur">
                    <CardHeader>
                      <CardTitle>Signature Geography</CardTitle>
                      <p className="text-sm text-slate-500">Use this when you need a quick location-level view of signing activity.</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {dashboard.signatureLocationDistribution.slice(0, 5).map((item) => (
                        <div key={item.locationLabel} className="rounded-2xl bg-orange-50 p-4">
                          <p className="font-medium text-slate-900">{item.locationLabel}</p>
                          <p className="mt-1 text-sm text-slate-600">{item.count} signed document{item.count > 1 ? 's' : ''} tracked from this location bucket.</p>
                        </div>
                      ))}
                      {dashboard.signatureLocationDistribution.length === 0 && <p className="text-sm text-slate-500">No signature geography has been recorded yet.</p>}
                    </CardContent>
                  </Card>
                </div>
              </div>

              <Card className="clay-soft border-white/60 bg-white/80 backdrop-blur">
                <CardHeader>
                  <CardTitle>Feature Playbooks</CardTitle>
                  <p className="text-sm text-slate-500">Each card explains when to use a feature, why it exists, and the shortest path to getting value from it.</p>
                </CardHeader>
                <CardContent className="grid gap-4 xl:grid-cols-2">
                  {dashboardGuideCards.map((guide) => (
                    <div key={guide.id} className="rounded-[24px] border border-slate-200 bg-white/90 p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">{guide.label}</p>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{guide.why}</p>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={() => setActiveTab(guide.id)}>
                          Open
                        </Button>
                      </div>
                      <div className="mt-4 grid gap-2">
                        {guide.steps.map((step, index) => (
                          <div key={`${guide.id}-${step}`} className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                            <span className="mr-2 font-semibold text-slate-900">{index + 1}.</span>
                            {step}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="clay-soft border-white/60 bg-white/75 backdrop-blur">
                <CardHeader>
                  <CardTitle>Recent Comments and Feedback</CardTitle>
                  <p className="text-sm text-slate-500">Use this queue to reply quickly when recipients ask questions or leave review notes on shared documents.</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {paginatedFeedback.map((item) => (
                    <div key={item.id} className="rounded-2xl border bg-white p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-slate-900">{item.templateName}</p>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-600">{item.type}</span>
                            {!item.replyMessage && (
                              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">Needs reply</span>
                            )}
                          </div>
                          <p className="text-sm text-slate-500">{item.referenceNumber}</p>
                          <div className="prose prose-sm max-w-none text-sm text-slate-700" dangerouslySetInnerHTML={{ __html: sanitizeEditorHtml(item.message) }} />
                          <p className="text-xs text-slate-500">
                            {item.authorName} on {new Date(item.createdAt).toLocaleString()}{item.createdIp ? ` from ${item.createdIp}` : ''}
                          </p>
                          {item.replyMessage && (
                            <div className="rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-900">
                              <span dangerouslySetInnerHTML={{ __html: sanitizeEditorHtml(`Reply from ${item.repliedBy || 'Internal team'} on ${item.repliedAt ? new Date(item.repliedAt).toLocaleString() : 'Unknown'}: ${item.replyMessage || ''}`) }} />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" onClick={() => openDocumentLink({ shareUrl: item.shareUrl })}>Open Link</Button>
                          <Button variant="outline" size="sm" onClick={() => void copyDocumentLink({ shareUrl: item.shareUrl })}><Copy className="w-4 h-4 mr-2" />Copy Link</Button>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                        <Input
                          value={replyDrafts[item.id] || ''}
                          onChange={(event) => setReplyDrafts((prev) => ({ ...prev, [item.id]: event.target.value }))}
                          placeholder="Reply to this feedback"
                        />
                        <Button onClick={() => void submitFeedbackReply(item)} disabled={replyingCommentId === item.id || !replyDrafts[item.id]?.trim()}>
                          {replyingCommentId === item.id ? 'Replying...' : 'Reply'}
                        </Button>
                      </div>
                    </div>
                  ))}
                  {dashboard.recentFeedback.length === 0 && <p className="text-sm text-slate-500">No recent comments or reviews yet.</p>}
                  {dashboard.recentFeedback.length > FEEDBACK_PAGE_SIZE && (
                    <div className="flex items-center justify-end gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setFeedbackPage((prev) => Math.max(1, prev - 1))} disabled={feedbackPage === 1}>Previous</Button>
                      <span className="text-sm text-slate-500">Page {feedbackPage} of {feedbackPageCount}</span>
                      <Button type="button" variant="outline" size="sm" onClick={() => setFeedbackPage((prev) => Math.min(feedbackPageCount, prev + 1))} disabled={feedbackPage === feedbackPageCount}>Next</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="summary" className="space-y-6">
              <Card className="border-white/60 bg-white/75 backdrop-blur">
                <CardHeader><CardTitle>Document Summary</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {paginatedSummary.map((item) => (
                    <div key={item.id} className="rounded-2xl border bg-white p-4">
                      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-slate-900">{item.templateName}</p>
                            {item.pendingFeedbackCount > 0 && (
                              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">{item.pendingFeedbackCount} pending feedback</span>
                            )}
                          </div>
                          <p className="text-sm text-slate-500">{item.referenceNumber}</p>
                          <p className="text-sm text-slate-500">Generated on {new Date(item.generatedAt).toLocaleString()}</p>
                          <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-600 md:grid-cols-3 xl:grid-cols-6">
                            <div className="rounded-xl bg-orange-50 p-3"><p className="text-xs uppercase tracking-[0.16em] text-slate-400">Opens</p><p className="mt-1 font-semibold text-slate-900">{item.openCount}</p></div>
                            <div className="rounded-xl bg-orange-50 p-3"><p className="text-xs uppercase tracking-[0.16em] text-slate-400">Downloads</p><p className="mt-1 font-semibold text-slate-900">{item.downloadCount}</p></div>
                            <div className="rounded-xl bg-orange-50 p-3"><p className="text-xs uppercase tracking-[0.16em] text-slate-400">Edits</p><p className="mt-1 font-semibold text-slate-900">{item.editCount}</p></div>
                            <div className="rounded-xl bg-orange-50 p-3"><p className="text-xs uppercase tracking-[0.16em] text-slate-400">Comments</p><p className="mt-1 font-semibold text-slate-900">{item.commentCount}</p></div>
                            <div className="rounded-xl bg-orange-50 p-3"><p className="text-xs uppercase tracking-[0.16em] text-slate-400">Reviews</p><p className="mt-1 font-semibold text-slate-900">{item.reviewCount}</p></div>
                            <div className="rounded-xl bg-orange-50 p-3"><p className="text-xs uppercase tracking-[0.16em] text-slate-400">Signed</p><p className="mt-1 font-semibold text-slate-900">{item.signCount}</p></div>
                          </div>
                          <div className="mt-3 space-y-1">
                            <p className="text-sm text-slate-600">Devices: {item.uniqueDevices.length > 0 ? item.uniqueDevices.join(' | ') : 'No tracked devices yet'}</p>
                            {item.latestActivityAt && <p className="text-sm text-slate-600">Latest activity: {new Date(item.latestActivityAt).toLocaleString()} {item.latestActivityLabel ? `on ${item.latestActivityLabel}` : ''}</p>}
                            {item.recipientSignedAt && (
                              <p className="text-sm text-slate-600">
                                Signature location: {formatSignatureLocation({
                                  label: item.signedLocationLabel,
                                  latitude: item.signedLatitude,
                                  longitude: item.signedLongitude,
                                  accuracyMeters: item.signedAccuracyMeters,
                                })}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 xl:justify-end">
                          <Button variant="outline" size="sm" onClick={() => openDocumentLink({ shareUrl: item.shareUrl })}>Open Link</Button>
                          <Button variant="outline" size="sm" onClick={() => void copyDocumentLink({ shareUrl: item.shareUrl })}><Copy className="w-4 h-4 mr-2" />Copy Link</Button>
                          {buildGoogleMapsLink(item.signedLatitude, item.signedLongitude) && (
                            <Button variant="outline" size="sm" onClick={() => window.open(buildGoogleMapsLink(item.signedLatitude, item.signedLongitude), '_blank', 'noopener,noreferrer')}>
                              Verify Location
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {dashboard.documentSummary.length === 0 && <p className="text-sm text-slate-500">Document tracking will appear after links start being opened and used.</p>}
                  {dashboard.documentSummary.length > SUMMARY_PAGE_SIZE && (
                    <div className="flex items-center justify-end gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setSummaryPage((prev) => Math.max(1, prev - 1))} disabled={summaryPage === 1}>Previous</Button>
                      <span className="text-sm text-slate-500">Page {summaryPage} of {summaryPageCount}</span>
                      <Button type="button" variant="outline" size="sm" onClick={() => setSummaryPage((prev) => Math.min(summaryPageCount, prev + 1))} disabled={summaryPage === summaryPageCount}>Next</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tutorials" className="space-y-6">
              <TutorialsCenter />
            </TabsContent>

            <TabsContent value="generate" className="space-y-6">
              {(errorMessage || successMessage) && <Card><CardContent className="p-4">{errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}{successMessage && <p className="text-sm text-green-700">{successMessage}</p>}</CardContent></Card>}

              {selectedTemplate ? (
                <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1.08fr)_minmax(540px,0.92fr)] items-start">
                  <Card className="clay-soft border-white/60 bg-white/80 backdrop-blur">
                    <CardHeader>
                      <CardTitle>{selectedTemplate.name}</CardTitle>
                      <p className="text-sm text-slate-500">{selectedTemplate.description || `${selectedTemplate.category} document template with docrud branding and workflow controls.`}</p>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="rounded-2xl border bg-white p-4 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Readiness</p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">
                              {requiredFieldCount === 0
                                ? 'This template has no mandatory fields.'
                                : `${completedRequiredFields} of ${requiredFieldCount} required fields completed`}
                            </p>
                          </div>
                          <div className="rounded-full bg-slate-950 px-3 py-1 text-sm font-semibold text-white">
                            {completionPercentage}%
                          </div>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                          <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400" style={{ width: `${completionPercentage}%` }} />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={restoreLatestTemplateData} disabled={!latestTemplateHistoryEntry}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Restore Last Values
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={clearDraft}>
                            <X className="mr-2 h-4 w-4" />
                            Clear Draft
                          </Button>
                        </div>
                        <p className="mt-2 text-xs text-slate-500">
                          Drafts autosave in this browser for each template. {draftRestored ? 'Recovered draft is active right now.' : 'The latest typed values will stay available until you generate or clear them.'}
                        </p>
                      </div>
                      <div className="rounded-2xl border bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-4 text-white">
                        <p className="text-xs uppercase tracking-[0.22em] text-emerald-200">Flow</p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-3">
                          <div className="rounded-2xl bg-white/10 p-3">
                            <p className="text-sm font-semibold">1. Prepare</p>
                            <p className="mt-1 text-xs text-slate-200">Pick template, fill fields, and select an admin signature.</p>
                          </div>
                          <div className="rounded-2xl bg-white/10 p-3">
                            <p className="text-sm font-semibold">2. Review</p>
                            <p className="mt-1 text-xs text-slate-200">Generate a responsive preview with watermark and audit metadata.</p>
                          </div>
                          <div className="rounded-2xl bg-white/10 p-3">
                            <p className="text-sm font-semibold">3. Share</p>
                            <p className="mt-1 text-xs text-slate-200">Send link, apply recipient access, collect comments or edits, and track completion history.</p>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-2xl border bg-slate-50 p-4">
                        <label className="block text-sm font-medium mb-2">Choose Admin Signature</label>
                        <Select value={selectedSignatureId} onValueChange={setSelectedSignatureId}>
                          <SelectTrigger><SelectValue placeholder={availableSignatures.length > 0 ? 'Select authorized signature' : 'No signatures available'} /></SelectTrigger>
                          <SelectContent>
                            {availableSignatures.map((signature) => (
                              <SelectItem key={signature.id} value={signature.id}>
                                {signature.signerName} - {signature.signerRole}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="mt-2 text-xs text-slate-500">
                          {availableSignatures.length > 0
                            ? 'Each signature preserves its original admin capture timestamp and IP in the final document.'
                            : session?.user?.role === 'admin'
                              ? 'Add signatures in the Admin Panel to enable signed document generation.'
                              : 'Ask an administrator to add at least one signature in the Admin Panel.'}
                        </p>
                      </div>
                      <div className="rounded-2xl border bg-slate-50 p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <label className="block text-sm font-medium mb-1">Document Design</label>
                            <p className="text-xs text-slate-500">Choose one of five professional letterhead styles for preview, share view, and PDF export.</p>
                          </div>
                          <div className="w-fit shrink-0 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                            {documentDesignPresets.find((preset) => preset.id === selectedDesignPreset)?.label}
                          </div>
                        </div>
                        <div className="mt-4 grid gap-3 lg:grid-cols-2">
                          {documentDesignPresets.map((preset) => {
                            const selected = preset.id === selectedDesignPreset;
                            return (
                              <div
                                key={preset.id}
                                className={`flex h-full min-w-0 flex-col justify-between rounded-2xl border p-4 transition ${selected ? 'border-slate-900 bg-slate-900 text-white shadow-lg' : 'border-slate-200 bg-white text-slate-900 hover:border-slate-400 hover:bg-slate-50'}`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className={`text-sm font-semibold break-words ${selected ? 'text-white' : 'text-slate-900'}`}>{preset.label}</p>
                                    <p className={`mt-2 text-xs leading-5 ${selected ? 'text-slate-200' : 'text-slate-500'}`}>{preset.description}</p>
                                  </div>
                                  {selected && (
                                    <span className="shrink-0 rounded-full border border-white/20 bg-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
                                      Active
                                    </span>
                                  )}
                                </div>
                                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => handleDesignPresetChange(preset.id)}
                                    variant={selected ? 'secondary' : 'outline'}
                                    className={selected ? 'bg-white text-slate-900 hover:bg-slate-100' : 'w-full'}
                                  >
                                    Use Design
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={selected ? 'outline' : 'ghost'}
                                    onClick={() => openExamplePreview(preset.id)}
                                    className={selected ? 'border-white/20 text-white hover:bg-white/10 hover:text-white' : 'w-full justify-center'}
                                  >
                                    Example Preview
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <p className="mt-3 text-xs text-slate-500">
                          Changing the design resets the current preview so the next generation uses the selected document style cleanly.
                        </p>
                        <Dialog open={examplePreviewOpen} onOpenChange={setExamplePreviewOpen}>
                          <DialogContent className="max-w-6xl">
                            <DialogHeader>
                              <DialogTitle>{documentDesignPresets.find((preset) => preset.id === examplePreviewPreset)?.label} Example Preview</DialogTitle>
                              <p className="text-sm text-slate-500">
                                Sample enterprise agreement content rendered with the selected document design.
                              </p>
                            </DialogHeader>
                            <div className="rounded-2xl border bg-slate-100 p-3">
                              <iframe
                                title="Document design example preview"
                                srcDoc={examplePreviewHtml}
                                className="h-[70vh] w-full rounded-xl bg-white"
                              />
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="grid gap-4 xl:grid-cols-2">
                        <label className="flex items-start gap-3 rounded-2xl border bg-slate-50 p-4 text-sm">
                          <input
                            type="checkbox"
                            checked={recipientSignatureRequired}
                            onChange={(event) => setRecipientSignatureRequired(event.target.checked)}
                            className="mt-1"
                          />
                          <span className="min-w-0">
                            <span className="block font-medium text-slate-900">Recipient signature</span>
                            <span className="mt-1 block text-xs leading-5 text-slate-500">Require recipient-side signature with auto-generated password verification.</span>
                          </span>
                        </label>
                        <div className="rounded-2xl border bg-slate-50 p-4 space-y-3">
                          <label className="flex items-start gap-3 text-sm">
                            <input
                              type="checkbox"
                              checked={requiredDocumentWorkflowEnabled}
                              onChange={(event) => setRequiredDocumentWorkflowEnabled(event.target.checked)}
                              disabled={isOnboardingTemplate}
                              className="mt-1"
                            />
                            <span className="min-w-0">
                              <span className="block font-medium text-slate-900">Required document collection</span>
                              <span className="mt-1 block text-xs leading-5 text-slate-500">Collect required documents before recipient signature.</span>
                            </span>
                          </label>
                          {isOnboardingTemplate && (
                            <p className="text-xs text-amber-700">
                              This is mandatory for onboarding documents. Background verification must be approved before the employee can sign the offer.
                            </p>
                          )}
                          {requiredDocumentWorkflowEnabled && (
                            <div>
                              <label className="mb-2 block text-sm font-medium">Required Documents</label>
                              <Input
                                value={requiredDocumentsText}
                                onChange={(event) => setRequiredDocumentsText(event.target.value)}
                                placeholder="Example: PAN Card, Aadhaar Card, Signed NDA"
                              />
                              <p className="mt-2 text-xs text-slate-500">Enter a comma-separated list. The recipient must upload these files, and admin must verify them before signing unlocks.</p>
                            </div>
                          )}
                        </div>
                      </div>
                      {isOnboardingTemplate && (
                        <div className="rounded-2xl border bg-slate-50 p-4 space-y-4">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">Employee Onboarding Access</p>
                            <p className="mt-1 text-xs text-slate-500">These details are used to auto-create a protected employee dashboard account and tie the background-verification workflow to this onboarding packet.</p>
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <label className="mb-1 block text-sm font-medium">Employee Name</label>
                              <Input value={onboardingContext.employeeName} onChange={(event) => setOnboardingContext((prev) => ({ ...prev, employeeName: event.target.value }))} placeholder="Full legal name" />
                            </div>
                            <div>
                              <label className="mb-1 block text-sm font-medium">Employee Email</label>
                              <Input type="email" value={onboardingContext.employeeEmail} onChange={(event) => setOnboardingContext((prev) => ({ ...prev, employeeEmail: event.target.value }))} placeholder="employee@company.com" />
                            </div>
                            <div>
                              <label className="mb-1 block text-sm font-medium">Department</label>
                              <Input value={onboardingContext.employeeDepartment} onChange={(event) => setOnboardingContext((prev) => ({ ...prev, employeeDepartment: event.target.value }))} placeholder="Engineering / Finance / HR" />
                            </div>
                            <div>
                              <label className="mb-1 block text-sm font-medium">Designation</label>
                              <Input value={onboardingContext.employeeDesignation} onChange={(event) => setOnboardingContext((prev) => ({ ...prev, employeeDesignation: event.target.value }))} placeholder="Associate / Manager / Analyst" />
                            </div>
                            <div>
                              <label className="mb-1 block text-sm font-medium">Employee Code</label>
                              <Input value={onboardingContext.employeeCode} onChange={(event) => setOnboardingContext((prev) => ({ ...prev, employeeCode: event.target.value }))} placeholder="EMP-2026-001" />
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="rounded-2xl border bg-slate-50 p-4 xl:max-w-[420px]">
                        <label className="block text-sm font-medium mb-2">Recipient Access</label>
                        <Select value={recipientAccess} onValueChange={(value: RecipientAccessLevel) => setRecipientAccess(value)}>
                          <SelectTrigger><SelectValue placeholder="Select recipient access" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="view">View only</SelectItem>
                            <SelectItem value="comment">Comment and review</SelectItem>
                            <SelectItem value="edit">Edit, comment, and review</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="mt-2 text-xs text-slate-500">
                          Signature capture remains available for every access level. Comments and reviews are available for `comment` and `edit`, while field updates are available for `edit`.
                        </p>
                      </div>
                      <div className="rounded-2xl border bg-slate-50 p-4 space-y-4 xl:max-w-[520px]">
                        <div>
                          <label className="mb-2 block text-sm font-medium">Share Security</label>
                          <Select value={shareAccessPolicy} onValueChange={(value: 'standard' | 'expiring' | 'one_time') => setShareAccessPolicy(value)}>
                            <SelectTrigger><SelectValue placeholder="Select share policy" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="standard">Standard secure link</SelectItem>
                              <SelectItem value="expiring">Expiring secure link</SelectItem>
                              <SelectItem value="one_time">One-time secure link</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="mt-2 text-xs text-slate-500">Use expiring or one-time links for higher-sensitivity workflows, external vendors, or time-bound approvals.</p>
                        </div>
                        {shareAccessPolicy === 'expiring' && (
                          <div>
                            <label className="mb-2 block text-sm font-medium">Expiry Window (days)</label>
                            <Input value={shareExpiryDays} onChange={(event) => setShareExpiryDays(event.target.value)} placeholder="7" />
                          </div>
                        )}
                        {shareAccessPolicy === 'one_time' && (
                          <div>
                            <label className="mb-2 block text-sm font-medium">Allowed Access Count</label>
                            <Input value={maxAccessCount} onChange={(event) => setMaxAccessCount(event.target.value)} placeholder="1" />
                          </div>
                        )}
                      </div>
                      <div className="rounded-2xl border bg-slate-50 p-4 space-y-4">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={dataCollectionEnabled}
                            onChange={(event) => setDataCollectionEnabled(event.target.checked)}
                            className="mt-1"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900">Create recipient data collection form</p>
                            <p className="mt-1 text-xs leading-5 text-slate-500">
                              Send a secure form link to the recipient so they can fill the required document data directly. Their submission updates the same document record and remains editable by admin.
                            </p>
                          </div>
                        </div>
                        {dataCollectionEnabled && (
                          <div>
                            <label className="mb-2 block text-sm font-medium">Collection Instructions</label>
                            <textarea
                              value={dataCollectionInstructions}
                              onChange={(event) => setDataCollectionInstructions(event.target.value)}
                              className="min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                              placeholder="Example: Please complete all fields exactly as they should appear on the final letter. Admin will review and prepare the final signing copy after submission."
                            />
                            <p className="mt-2 text-xs text-slate-500">Recipients will see these instructions above the editable form on the shared document page.</p>
                          </div>
                        )}
                      </div>

                      <div className="grid gap-4 xl:grid-cols-2">
                      {selectedTemplate.fields.map((field) => (
                        <div
                          key={field.id}
                          className={field.type === 'textarea' ? 'xl:col-span-2' : ''}
                        >
                          <label className="block text-sm font-medium mb-1">{field.label} {field.required && <span className="text-red-500">*</span>}</label>
                          {renderField(field)}
                        </div>
                      ))}
                      </div>

                      <div className={`grid gap-3 pt-4 ${dataCollectionEnabled ? 'sm:grid-cols-2 2xl:grid-cols-5' : 'sm:grid-cols-2 2xl:grid-cols-4'}`}>
                        {dataCollectionEnabled && (
                          <Button
                            variant="outline"
                            onClick={() => void createDataCollectionRequest()}
                            disabled={!selectedSignature || isCreatingDataCollectionRequest}
                            className="w-full"
                          >
                            <Share2 className="w-4 h-4 mr-2" />
                            {isCreatingDataCollectionRequest ? 'Creating Form...' : 'Create Data Form'}
                          </Button>
                        )}
                        <Button onClick={() => void generateDocument()} className="w-full" disabled={!selectedSignature || isGeneratingPreview}>
                          <Eye className="w-4 h-4 mr-2" />
                          {isGeneratingPreview ? 'Generating...' : 'Generate Preview'}
                        </Button>
                        <Button variant="outline" onClick={() => void generatePDF()} disabled={!generatedHtml || !selectedSignature || isGeneratingPdf} className="w-full">
                          <Download className="w-4 h-4 mr-2" />
                          {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
                        </Button>
                        <Button variant="outline" onClick={() => currentHistoryEntry && openDocumentLink(currentHistoryEntry)} disabled={!currentHistoryEntry} className="w-full">
                          <Link2 className="w-4 h-4 mr-2" />
                          Share Link
                        </Button>
                        <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
                          <DialogTrigger asChild>
                            <Button variant="outline" disabled={!generatedHtml || !currentHistoryEntry || !selectedSignature} className="w-full">
                              <Mail className="w-4 h-4 mr-2" />
                              Send Email
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>Send Document via Email</DialogTitle></DialogHeader>
                            <div className="space-y-4">
                              <div><label className="block text-sm font-medium mb-1">Recipient Email</label><Input type="email" value={emailData.to} onChange={(event) => setEmailData((prev) => ({ ...prev, to: event.target.value }))} placeholder="recipient@example.com" /></div>
                              <div><label className="block text-sm font-medium mb-1">Subject</label><Input value={emailData.subject} onChange={(event) => setEmailData((prev) => ({ ...prev, subject: event.target.value }))} placeholder="Document subject" /></div>
                              <div>
                                <label className="block text-sm font-medium mb-1">Message</label>
                                <RichTextEditor value={emailData.message} onChange={(nextValue) => setEmailData((prev) => ({ ...prev, message: nextValue }))} />
                              </div>
                              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>Cancel</Button>
                                <Button onClick={() => void sendEmail()} disabled={isSendingEmail}>{isSendingEmail ? 'Sending...' : 'Send Email'}</Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>

                      {currentHistoryEntry && (
                        <div className="rounded-xl border bg-slate-50 p-4 space-y-1">
                          <p className="text-sm font-medium text-slate-900">Document Metadata</p>
                          <p className="text-sm text-slate-600">Reference: {currentHistoryEntry.referenceNumber}</p>
                          <p className="text-sm text-slate-600">Generated: {new Date(currentHistoryEntry.generatedAt).toLocaleString()}</p>
                          <p className="text-sm text-slate-600">Prepared by: {currentHistoryEntry.generatedBy}</p>
                          {currentHistoryEntry.dataCollectionEnabled && (
                            <>
                              <p className="text-sm text-slate-600">Data collection: Enabled</p>
                              <p className="text-sm text-slate-600">Collection status: {currentHistoryEntry.dataCollectionStatus || 'sent'}</p>
                            </>
                          )}
                          <p className="text-sm text-slate-600">Signature: {currentHistoryEntry.signatureName} ({currentHistoryEntry.signatureRole})</p>
                          <p className="text-sm text-slate-600">Signing password: {currentHistoryEntry.sharePassword || 'Pending'}</p>
                          <p className="text-sm text-slate-600">Share security: {currentHistoryEntry.shareAccessPolicy || 'standard'}</p>
                          {currentHistoryEntry.shareExpiresAt && <p className="text-sm text-slate-600">Share expiry: {new Date(currentHistoryEntry.shareExpiresAt).toLocaleString()}</p>}
                          {currentHistoryEntry.maxAccessCount && <p className="text-sm text-slate-600">Max accesses: {currentHistoryEntry.maxAccessCount}</p>}
                          {currentHistoryEntry.revokedAt && <p className="text-sm text-rose-600">Link revoked on {new Date(currentHistoryEntry.revokedAt).toLocaleString()}</p>}
                          <p className="text-sm text-slate-600">Required documents workflow: {currentHistoryEntry.requiredDocumentWorkflowEnabled ? 'Enabled' : 'Disabled'}</p>
                          {currentHistoryEntry.requiredDocumentWorkflowEnabled && <p className="text-sm text-slate-600">Document verification status: {currentHistoryEntry.documentsVerificationStatus || 'pending'}</p>}
                          <p className="text-sm text-slate-600">Recipient access: {currentHistoryEntry.recipientAccess || 'comment'}</p>
                          <p className="text-sm text-slate-600">Recipient signature required: {currentHistoryEntry.recipientSignatureRequired ? 'Yes' : 'No'}</p>
                          {currentHistoryEntry.recipientSignedAt && (
                            <>
                              <p className="text-sm text-slate-600">
                                Recipient signed: {currentHistoryEntry.recipientSignerName || 'Recipient'} on {new Date(currentHistoryEntry.recipientSignedAt).toLocaleString()} from {currentHistoryEntry.recipientSignedIp || 'unknown IP'}
                              </p>
                              <p className="text-sm text-slate-600">
                                Signed location: {formatSignatureLocation({
                                  label: currentHistoryEntry.recipientSignedLocationLabel,
                                  latitude: currentHistoryEntry.recipientSignedLatitude,
                                  longitude: currentHistoryEntry.recipientSignedLongitude,
                                  accuracyMeters: currentHistoryEntry.recipientSignedAccuracyMeters,
                                })}
                              </p>
                            </>
                          )}
                          <div className="flex flex-wrap gap-2 pt-2">
                            <Button variant="outline" size="sm" onClick={() => openDocumentLink(currentHistoryEntry)}><Link2 className="w-4 h-4 mr-2" />Open Link</Button>
                            <Button variant="outline" size="sm" onClick={() => void copyDocumentLink(currentHistoryEntry)}><Copy className="w-4 h-4 mr-2" />Copy Link</Button>
                            <Button variant="outline" size="sm" onClick={() => shareByWhatsApp(currentHistoryEntry)}><Share2 className="w-4 h-4 mr-2" />WhatsApp</Button>
                            <Button variant="outline" size="sm" onClick={() => void nativeShare(currentHistoryEntry)}><Share2 className="w-4 h-4 mr-2" />Share</Button>
                            {!currentHistoryEntry.revokedAt && <Button variant="outline" size="sm" onClick={() => void revokeCurrentShare()}><X className="w-4 h-4 mr-2" />Revoke Link</Button>}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="clay-soft sticky top-[104px] border-white/60 bg-white/82 backdrop-blur">
                    <CardHeader>
                      <CardTitle>Preview</CardTitle>
                      <p className="text-sm text-slate-500">Live document rendering updates here once you generate the preview.</p>
                    </CardHeader>
                    <CardContent className="min-w-0">
                      {generatedHtml ? (
                        <iframe title="Document Preview" srcDoc={generatedHtml} className="w-full min-h-[72vh] rounded-xl border bg-white 2xl:min-h-[880px]" />
                      ) : (
                        <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-slate-500">
                          <div className="max-w-sm px-6 text-center">
                            <FileText className="mx-auto mb-4 h-12 w-12" />
                            <p className="text-base font-medium text-slate-700">Preview will appear here</p>
                            <p className="mt-2 text-sm leading-6 text-slate-500">Choose a signature, complete the form, and generate the preview to unlock the full document workflow.</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64"><div className="text-center"><FileText className="w-16 h-16 mx-auto mb-4 text-slate-400" /><h2 className="text-2xl font-bold mb-2">Select a Template</h2><p className="text-slate-500">Choose a template from the sidebar to start generating secure docrud documents.</p></div></div>
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-6">
              <Card>
                <CardHeader><CardTitle>Generation and Delivery History</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {paginatedHistory.map((item) => (
                    <div key={item.id} className="flex flex-col gap-4 rounded-xl border bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <h3 className="font-medium text-slate-900">{item.templateName}</h3>
                        <p className="text-sm text-slate-500">{item.referenceNumber}</p>
                        <p className="text-sm text-slate-500">Generated on {new Date(item.generatedAt).toLocaleString()} by {item.generatedBy}</p>
                        <p className="text-sm text-slate-500">Signature: {item.signatureName || 'Not recorded'} {item.signatureRole ? `(${item.signatureRole})` : ''}</p>
                        <p className="text-sm text-slate-500">Signing password: {item.sharePassword || 'Pending'}</p>
                        <p className="text-sm text-slate-500">Required documents: {item.requiredDocumentWorkflowEnabled ? (item.requiredDocuments || []).join(', ') || 'Enabled' : 'Not required'}</p>
                        {item.requiredDocumentWorkflowEnabled && <p className="text-sm text-slate-500">Verification: {item.documentsVerificationStatus || 'pending'}</p>}
                        <p className="text-sm text-slate-500">Recipient access: {item.recipientAccess || 'comment'}</p>
                        <p className="text-sm text-slate-500">Email status: {item.emailStatus || (item.emailSent ? 'sent' : 'pending')}</p>
                        {item.emailTo && <p className="text-sm text-slate-500">Delivered to: {item.emailTo}</p>}
                        {item.recipientSignedAt && (
                          <>
                            <p className="text-sm text-slate-500">Recipient signed on {new Date(item.recipientSignedAt).toLocaleString()} from {item.recipientSignedIp || 'unknown IP'}</p>
                            <p className="text-sm text-slate-500">
                              Signed location: {formatSignatureLocation({
                                label: item.recipientSignedLocationLabel,
                                latitude: item.recipientSignedLatitude,
                                longitude: item.recipientSignedLongitude,
                                accuracyMeters: item.recipientSignedAccuracyMeters,
                              })}
                            </p>
                          </>
                        )}
                        {!!item.collaborationComments?.length && <p className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">Comments and reviews: {item.collaborationComments.length}</p>}
                      </div>
                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        <Button variant="outline" size="sm" onClick={() => openDocumentLink(item)}><Link2 className="w-4 h-4 mr-2" />Open</Button>
                        <Button variant="outline" size="sm" onClick={() => reuseHistoryItem(item)}><RefreshCw className="w-4 h-4 mr-2" />Reuse</Button>
                        <Button variant="outline" size="sm" onClick={() => void copyDocumentLink(item)}><Copy className="w-4 h-4 mr-2" />Copy Link</Button>
                        <Button variant="outline" size="sm" onClick={() => shareByWhatsApp(item)}><Share2 className="w-4 h-4 mr-2" />WhatsApp</Button>
                        {buildGoogleMapsLink(item.recipientSignedLatitude, item.recipientSignedLongitude) && (
                          <Button variant="outline" size="sm" onClick={() => window.open(buildGoogleMapsLink(item.recipientSignedLatitude, item.recipientSignedLongitude), '_blank', 'noopener,noreferrer')}>Verify Location</Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {history.length === 0 && <p className="text-sm text-slate-500">No document history found yet.</p>}
                  {history.length > HISTORY_PAGE_SIZE && (
                    <div className="flex items-center justify-end gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setHistoryPage((prev) => Math.max(1, prev - 1))} disabled={historyPage === 1}>Previous</Button>
                      <span className="text-sm text-slate-500">Page {historyPage} of {historyPageCount}</span>
                      <Button type="button" variant="outline" size="sm" onClick={() => setHistoryPage((prev) => Math.min(historyPageCount, prev + 1))} disabled={historyPage === historyPageCount}>Next</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {isClient && hasClientFeature('client_portal') && (
              <TabsContent value="client-portal" className="space-y-6">
                <ClientPortal />
              </TabsContent>
            )}

            {isClient && (
              <TabsContent value="business-settings" className="space-y-6">
                <BusinessSettingsCenter />
              </TabsContent>
            )}

            {isEmployee && (
              <TabsContent value="employee-portal" className="space-y-6">
                <EmployeePortal />
              </TabsContent>
            )}

            {session?.user?.role === 'admin' && (
              <TabsContent value="workspace" className="space-y-6">
                <EnterpriseWorkspace mode="editor" />
              </TabsContent>
            )}

            {session?.user?.role === 'admin' && (
              <TabsContent value="file-manager" className="space-y-6">
                <EnterpriseWorkspace mode="files" />
              </TabsContent>
            )}

            {session?.user?.role === 'admin' && (
              <TabsContent value="roles" className="space-y-6">
                <EnterpriseWorkspace mode="roles" />
              </TabsContent>
            )}

            {isAdmin && <TabsContent value="approvals" className="space-y-6"><PlatformFeatureCenter mode="approvals" /></TabsContent>}
            {isAdmin && <TabsContent value="versions" className="space-y-6"><PlatformFeatureCenter mode="versions" /></TabsContent>}
            {isAdmin && <TabsContent value="clauses" className="space-y-6"><PlatformFeatureCenter mode="clauses" /></TabsContent>}
            {isAdmin && <TabsContent value="audit" className="space-y-6"><PlatformFeatureCenter mode="audit" /></TabsContent>}
            {isAdmin && <TabsContent value="bulk" className="space-y-6"><PlatformFeatureCenter mode="bulk" /></TabsContent>}
            {isAdmin && <TabsContent value="renewals" className="space-y-6"><PlatformFeatureCenter mode="renewals" /></TabsContent>}
            {isAdmin && <TabsContent value="analytics" className="space-y-6"><PlatformFeatureCenter mode="analytics" /></TabsContent>}
            {isAdmin && <TabsContent value="integrations" className="space-y-6"><PlatformFeatureCenter mode="integrations" /></TabsContent>}
            {isAdmin && <TabsContent value="organizations" className="space-y-6"><PlatformFeatureCenter mode="organizations" /></TabsContent>}
            {isAdmin && <TabsContent value="copilot" className="space-y-6"><PlatformFeatureCenter mode="copilot" /></TabsContent>}
            {isAdmin && <TabsContent value="api-docs" className="space-y-6"><ApiDocsCenter /></TabsContent>}

            {session?.user?.role === 'admin' && <TabsContent value="admin"><AdminPanel /></TabsContent>}
          </Tabs>
        </main>
      </div>
      {!isEmployee && <FloatingAssistant dashboard={dashboard} history={history} />}
    </div>
  );
}
