'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { Input } from './ui/input';
import RichTextEditor from './RichTextEditor';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { CollaborationSettings, DashboardMetrics, DocumentField, DocumentHistory, DocumentTemplate, RecipientAccessLevel, SignatureRecord, SignatureSettings } from '../types/document';
import { renderDocumentTemplate } from '@/lib/template';
import { buildGoogleMapsLink, formatSignatureLocation } from '@/lib/location';
import { BarChart3, Bot, Copy, Download, Eye, FileSearch, FileText, History, Link2, LogOut, Mail, Menu, MessageSquare, PieChart, RefreshCw, Settings, Share2, Sparkles, X } from 'lucide-react';
import AdminPanel from './AdminPanel';

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
const DRAFT_STORAGE_PREFIX = 'corescent-template-draft:';
type ShareTarget = Partial<Pick<DocumentHistory, 'shareUrl' | 'shareId' | 'id'>>;

const sanitizeEditorHtml = (value: string) =>
  value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son[a-z]+="[^"]*"/gi, '')
    .replace(/\son[a-z]+='[^']*'/gi, '')
    .replace(/javascript:/gi, '');

const stripEditorHtml = (value: string) =>
  sanitizeEditorHtml(value).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

export default function DocumentGenerator() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [selectedSignatureId, setSelectedSignatureId] = useState('');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [generatedHtml, setGeneratedHtml] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailData, setEmailData] = useState({ to: '', subject: '', message: '' });
  const [recipientSignatureRequired, setRecipientSignatureRequired] = useState(true);
  const [requiredDocumentWorkflowEnabled, setRequiredDocumentWorkflowEnabled] = useState(false);
  const [requiredDocumentsText, setRequiredDocumentsText] = useState('');
  const [recipientAccess, setRecipientAccess] = useState<RecipientAccessLevel>('comment');
  const [history, setHistory] = useState<DocumentHistory[]>([]);
  const [dashboard, setDashboard] = useState<DashboardMetrics>(emptyDashboard);
  const [currentHistoryEntry, setCurrentHistoryEntry] = useState<DocumentHistory | null>(null);
  const [signatureSettings, setSignatureSettings] = useState<SignatureSettings>({ signatures: [] });
  const [collaborationSettings, setCollaborationSettings] = useState<CollaborationSettings>(emptyCollaborationSettings);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyingCommentId, setReplyingCommentId] = useState('');
  const [dashboardSearch, setDashboardSearch] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [summaryPage, setSummaryPage] = useState(1);
  const [feedbackPage, setFeedbackPage] = useState(1);
  const [botQuery, setBotQuery] = useState('');
  const [botResponse, setBotResponse] = useState('Ask about documents, feedback, downloads, top templates, pending replies, or access activity.');
  const [draftRestored, setDraftRestored] = useState(false);

  const userPermissions = useMemo(() => session?.user?.permissions || [], [session?.user?.permissions]);
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
  const historyPageCount = Math.max(1, Math.ceil(history.length / HISTORY_PAGE_SIZE));
  const summaryPageCount = Math.max(1, Math.ceil(dashboard.documentSummary.length / SUMMARY_PAGE_SIZE));
  const feedbackPageCount = Math.max(1, Math.ceil(dashboard.recentFeedback.length / FEEDBACK_PAGE_SIZE));

  useEffect(() => {
    if (status === 'authenticated') {
      void Promise.all([fetchTemplates(), fetchHistory(), fetchDashboard(), fetchSignatureSettings(), fetchCollaborationSettings()]);
    }
  }, [status]);

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

  const buildShareMessage = (item: Pick<DocumentHistory, 'templateName' | 'sharePassword' | 'recipientSignatureRequired' | 'recipientAccess' | 'shareUrl'>) => {
    const absoluteUrl = buildAbsoluteShareUrl(item);
    const passwordLine = item.recipientSignatureRequired && item.sharePassword
      ? `Signing password: ${item.sharePassword}`
      : '';
    const accessLabel = item.recipientAccess === 'edit'
      ? 'Recipient access: edit, comment, and review'
      : item.recipientAccess === 'view'
        ? 'Recipient access: view only'
        : 'Recipient access: comment and review';

    return [
      `Please review this ${item.templateName} from Corescent Technologies.`,
      absoluteUrl ? `Document link: ${absoluteUrl}` : '',
      accessLabel,
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
    setFormData({});
    setGeneratedHtml('');
    setCurrentHistoryEntry(null);
    setSelectedSignatureId('');
    setRequiredDocumentWorkflowEnabled(false);
    setRequiredDocumentsText('');
    setRecipientAccess(collaborationSettings.defaultRecipientAccess || 'comment');
    setActiveTab('generate');
    setSidebarOpen(false);
    setErrorMessage('');
    setSuccessMessage('');
    setDraftRestored(false);
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

  const saveToHistory = async (template: DocumentTemplate, data: Record<string, string>, previewHtml: string, signature: SignatureRecord) => {
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
        requiredDocumentWorkflowEnabled,
        requiredDocuments: requiredDocumentsText.split(',').map((item) => item.trim()).filter(Boolean),
        recipientSignatureRequired,
        recipientAccess,
      }),
    });
    if (!response.ok) throw new Error('Failed to save history');
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

      const initialPreviewHtml = renderDocumentTemplate(selectedTemplate, data, {
        generatedBy: session?.user?.email || 'Corescent Workflow',
        signature: selectedSignature,
      });
      const historyEntry = await saveToHistory(selectedTemplate, data, initialPreviewHtml, selectedSignature);
      const brandedHtml = renderDocumentTemplate(selectedTemplate, data, {
        referenceNumber: historyEntry.referenceNumber,
        generatedAt: historyEntry.generatedAt,
        generatedBy: historyEntry.generatedBy,
        signature: selectedSignature,
      });

      await fetch('/api/history', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: historyEntry.id,
          previewHtml: brandedHtml,
        }),
      });

      setGeneratedHtml(brandedHtml);
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
      setSuccessMessage('Preview generated successfully. You can now download, share, or email the signed document.');
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to generate preview.');
      setSuccessMessage('');
    } finally {
      setIsGeneratingPreview(false);
    }
  };

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
    setRequiredDocumentWorkflowEnabled(item.requiredDocumentWorkflowEnabled ?? false);
    setRequiredDocumentsText((item.requiredDocuments || []).join(', '));
    setRecipientSignatureRequired(item.recipientSignatureRequired ?? true);
    setRecipientAccess(item.recipientAccess || collaborationSettings.defaultRecipientAccess || 'comment');
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
        signature: historySignature,
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

  const answerBotQuery = () => {
    const query = botQuery.trim().toLowerCase();
    if (!query) {
      setBotResponse('Ask about opens, downloads, pending feedback, top templates, recent document activity, or reply backlogs.');
      return;
    }

    if (query.includes('pending') || query.includes('reply')) {
      const pending = dashboard.documentSummary.filter((item) => item.pendingFeedbackCount > 0);
      setBotResponse(
        pending.length > 0
          ? `There are ${pending.reduce((sum, item) => sum + item.pendingFeedbackCount, 0)} pending feedback items across ${pending.length} documents. The main backlog is ${pending.slice(0, 3).map((item) => `${item.templateName} (${item.pendingFeedbackCount})`).join(', ')}.`
          : 'All current feedback items have replies. No pending response backlog is visible right now.'
      );
      return;
    }

    if (query.includes('download')) {
      const top = [...dashboard.documentSummary].sort((a, b) => b.downloadCount - a.downloadCount).slice(0, 3);
      setBotResponse(
        top.some((item) => item.downloadCount > 0)
          ? `Most-downloaded documents: ${top.map((item) => `${item.templateName} (${item.downloadCount})`).join(', ')}.`
          : 'No recipient PDF downloads have been tracked yet.'
      );
      return;
    }

    if (query.includes('open') || query.includes('view')) {
      const top = [...dashboard.documentSummary].sort((a, b) => b.openCount - a.openCount).slice(0, 3);
      setBotResponse(
        top.some((item) => item.openCount > 0)
          ? `Most-opened document links: ${top.map((item) => `${item.templateName} (${item.openCount})`).join(', ')}.`
          : 'No shared-document opens have been tracked yet.'
      );
      return;
    }

    if (query.includes('template') || query.includes('popular')) {
      setBotResponse(
        dashboard.topTemplates.length > 0
          ? `Top templates in current usage are ${dashboard.topTemplates.slice(0, 3).map((item) => `${item.templateName} (${item.count})`).join(', ')}.`
          : 'Template usage data will appear once more documents are generated.'
      );
      return;
    }

    if (query.includes('device') || query.includes('where')) {
      const active = dashboard.documentSummary.find((item) => item.uniqueDevices.length > 0);
      setBotResponse(
        active
          ? `Tracked device usage is available. For example, ${active.templateName} has activity from ${active.uniqueDevices.join(', ')}. Use the Document Summary tab for full per-document device trails.`
          : 'No device activity has been recorded yet on shared document links.'
      );
      return;
    }

    if (query.includes('edit')) {
      const edited = dashboard.documentSummary.filter((item) => item.editCount > 0);
      setBotResponse(
        edited.length > 0
          ? `Documents with recipient edits: ${edited.slice(0, 5).map((item) => `${item.templateName} (${item.editCount})`).join(', ')}.`
          : 'No recipient-side document edits have been tracked yet.'
      );
      return;
    }

    setBotResponse('I can answer dashboard questions about opens, downloads, edits, top templates, pending replies, device activity, and recent feedback trends. Try asking one of those directly.');
  };

  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div></div>;
  }
  if (status === 'unauthenticated') return null;

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 py-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}><Menu className="h-6 w-6" /></Button>
              <div className="min-w-0">
                <Image 
                  src="/corescent-logo.png"
                  alt="Corescent"
                
                  width={188}
                  height={72}
                  className="h-auto w-[136px] sm:w-[164px] lg:w-[188px]"
                />
               
              </div>
            </div>
            <div className="flex w-full flex-wrap items-center justify-end gap-2 md:w-auto md:gap-4">
              <span className="max-w-full truncate text-sm text-slate-600">Welcome, {session?.user?.name}</span>
              <Button variant="outline" size="sm" onClick={() => signOut()}><LogOut className="h-4 w-4 mr-2" />Logout</Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-[88vw] max-w-72 bg-white shadow-lg transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-0`}>
          <div className="flex items-center justify-between p-4 border-b md:hidden">
            <h2 className="text-lg font-semibold">Menu</h2>
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}><X className="h-6 w-6" /></Button>
          </div>

          <nav className="p-4 space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} orientation="vertical">
              <TabsList className="grid w-full grid-cols-1 h-auto">
                <TabsTrigger value="dashboard" className="justify-start"><BarChart3 className="w-4 h-4 mr-2" />Dashboard</TabsTrigger>
                <TabsTrigger value="summary" className="justify-start"><PieChart className="w-4 h-4 mr-2" />Document Summary</TabsTrigger>
                <TabsTrigger value="generate" className="justify-start"><FileText className="w-4 h-4 mr-2" />Generate Documents</TabsTrigger>
                <TabsTrigger value="history" className="justify-start"><History className="w-4 h-4 mr-2" />History</TabsTrigger>
                {session?.user?.role === 'admin' && <TabsTrigger value="admin" className="justify-start"><Settings className="w-4 h-4 mr-2" />Admin Panel</TabsTrigger>}
              </TabsList>
            </Tabs>

            <div className="rounded-2xl border bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold mb-2">Workflow status</p>
              <p className="text-sm text-slate-700">Select a template, choose an approved admin signature, generate the preview, then download, email, or share the signed document link.</p>
            </div>

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
          </nav>
        </aside>

        <main className="min-w-0 flex-1 p-4 md:p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsContent value="dashboard" className="space-y-6">
              <Card className="border-white/60 bg-white/75 backdrop-blur">
                <CardContent className="p-5">
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-600">Global Search</p>
                      <div className="mt-3 flex items-center gap-3 rounded-2xl border bg-white/80 px-4 py-3">
                        <FileSearch className="h-4 w-4 text-slate-500" />
                        <Input
                          value={dashboardSearch}
                          onChange={(event) => setDashboardSearch(event.target.value)}
                          placeholder="Search by template, reference, device, or activity"
                          className="border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                        />
                      </div>
                      {dashboardSearch.trim() && (
                        <div className="mt-3 rounded-2xl border bg-white">
                          {searchResults.length > 0 ? searchResults.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setActiveTab('summary')}
                              className="flex w-full items-center justify-between border-b px-4 py-3 text-left last:border-b-0 hover:bg-orange-50"
                            >
                              <div>
                                <p className="font-medium text-slate-900">{item.templateName}</p>
                                <p className="text-sm text-slate-500">{item.referenceNumber}</p>
                              </div>
                              <span className="text-xs text-slate-500">{item.openCount} opens</span>
                            </button>
                          )) : <p className="px-4 py-3 text-sm text-slate-500">No matching documents found.</p>}
                        </div>
                      )}
                    </div>
                    <div className="rounded-3xl bg-gradient-to-br from-black via-zinc-900 to-orange-950 p-5 text-white">
                      <div className="flex items-center gap-2">
                        <Bot className="h-5 w-5 text-orange-300" />
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-200">Admin Assistant</p>
                      </div>
                      <p className="mt-3 text-sm text-zinc-200">{botResponse}</p>
                      <div className="mt-4 flex flex-col gap-3">
                        <Input
                          value={botQuery}
                          onChange={(event) => setBotQuery(event.target.value)}
                          placeholder="Ask about downloads, pending replies, devices, edits..."
                          className="border-white/10 bg-white/10 text-white placeholder:text-zinc-300"
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button onClick={answerBotQuery}>Ask Assistant</Button>
                          <Button type="button" variant="outline" onClick={() => setBotQuery('Which documents need replies?')}>Pending replies</Button>
                          <Button type="button" variant="outline" onClick={() => setBotQuery('Which documents were downloaded most?')}>Top downloads</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {[
                  { label: 'Total Documents', value: dashboard.totalDocuments, icon: FileText },
                  { label: 'Generated This Week', value: dashboard.documentsThisWeek, icon: Sparkles },
                  { label: 'Emails Sent', value: dashboard.emailsSent, icon: Mail },
                  { label: 'Templates Used', value: dashboard.templatesUsed, icon: BarChart3 },
                ].map((card) => (
                <Card key={card.label} className="overflow-hidden"><CardContent className="p-6"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm text-slate-500">{card.label}</p><p className="mt-2 break-words text-3xl font-bold text-slate-900">{card.value}</p></div><card.icon className="h-5 w-5 shrink-0 text-emerald-700" /></div></CardContent></Card>
                ))}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Card className="border-white/60 bg-white/75 backdrop-blur">
                  <CardHeader><CardTitle>Reports</CardTitle></CardHeader>
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
                    {dashboard.topTemplates.length === 0 && <p className="text-sm text-slate-500">Reports will become richer as document volume grows.</p>}
                  </CardContent>
                </Card>

                <Card className="border-white/60 bg-white/75 backdrop-blur">
                  <CardHeader><CardTitle>Tracking Summary</CardTitle></CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="rounded-2xl bg-orange-50 p-4">
                      <p className="font-medium text-slate-900">Shared link opens</p>
                      <p className="mt-1 text-2xl font-bold text-black">{dashboard.documentSummary.reduce((sum, item) => sum + item.openCount, 0)}</p>
                    </div>
                    <div className="rounded-2xl bg-orange-50 p-4">
                      <p className="font-medium text-slate-900">Recipient downloads</p>
                      <p className="mt-1 text-2xl font-bold text-black">{dashboard.documentSummary.reduce((sum, item) => sum + item.downloadCount, 0)}</p>
                    </div>
                    <div className="rounded-2xl bg-orange-50 p-4">
                      <p className="font-medium text-slate-900">Pending feedback replies</p>
                      <p className="mt-1 text-2xl font-bold text-black">{dashboard.documentSummary.reduce((sum, item) => sum + item.pendingFeedbackCount, 0)}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Card className="border-white/60 bg-white/75 backdrop-blur">
                  <CardHeader><CardTitle>Signature Location Distribution</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    {dashboard.signatureLocationDistribution.map((item) => {
                      const max = dashboard.signatureLocationDistribution[0]?.count || 1;
                      return (
                        <div key={item.locationLabel}>
                          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                            <span className="font-medium text-slate-900">{item.locationLabel}</span>
                            <span className="text-slate-500">{item.count}</span>
                          </div>
                          <div className="h-3 rounded-full bg-orange-100">
                            <div className="h-3 rounded-full bg-black" style={{ width: `${(item.count / max) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                    {dashboard.signatureLocationDistribution.length === 0 && <p className="text-sm text-slate-500">Location analytics will appear after recipients sign documents with live location enabled.</p>}
                  </CardContent>
                </Card>

                <Card className="border-white/60 bg-white/75 backdrop-blur">
                  <CardHeader><CardTitle>Signature Geography</CardTitle></CardHeader>
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

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle>Recent Generation</CardTitle></CardHeader>
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

                <Card>
                  <CardHeader><CardTitle>Top Templates</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {dashboard.topTemplates.map((item) => (
                      <div key={item.templateName} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                        <span className="font-medium text-slate-900">{item.templateName}</span>
                        <span className="text-sm text-slate-600">{item.count} generated</span>
                      </div>
                    ))}
                    {dashboard.topTemplates.length === 0 && <p className="text-sm text-slate-500">Template usage metrics will appear after document generation starts.</p>}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader><CardTitle>Recent Comments and Feedback</CardTitle></CardHeader>
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

            <TabsContent value="generate" className="space-y-6">
              {(errorMessage || successMessage) && <Card><CardContent className="p-4">{errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}{successMessage && <p className="text-sm text-green-700">{successMessage}</p>}</CardContent></Card>}

              {selectedTemplate ? (
                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,460px)_minmax(0,1fr)] gap-6 items-start">
                  <Card>
                    <CardHeader>
                      <CardTitle>{selectedTemplate.name}</CardTitle>
                      <p className="text-sm text-slate-500">{selectedTemplate.description || `${selectedTemplate.category} document template with Corescent branding and watermark.`}</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                      <label className="flex items-center gap-2 text-sm rounded-2xl border bg-slate-50 p-4">
                        <input
                          type="checkbox"
                          checked={recipientSignatureRequired}
                          onChange={(event) => setRecipientSignatureRequired(event.target.checked)}
                        />
                        Require recipient-side signature with auto-generated password verification
                      </label>
                      <div className="rounded-2xl border bg-slate-50 p-4 space-y-3">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={requiredDocumentWorkflowEnabled}
                            onChange={(event) => setRequiredDocumentWorkflowEnabled(event.target.checked)}
                          />
                          Collect required documents before recipient signature
                        </label>
                        {requiredDocumentWorkflowEnabled && (
                          <div>
                            <label className="block text-sm font-medium mb-2">Required Documents</label>
                            <Input
                              value={requiredDocumentsText}
                              onChange={(event) => setRequiredDocumentsText(event.target.value)}
                              placeholder="Example: PAN Card, Aadhaar Card, Signed NDA"
                            />
                            <p className="mt-2 text-xs text-slate-500">Enter a comma-separated list. The recipient must upload these files, and admin must verify them before signing unlocks.</p>
                          </div>
                        )}
                      </div>
                      <div className="rounded-2xl border bg-slate-50 p-4">
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

                      {selectedTemplate.fields.map((field) => (
                        <div key={field.id}>
                          <label className="block text-sm font-medium mb-1">{field.label} {field.required && <span className="text-red-500">*</span>}</label>
                          {renderField(field)}
                        </div>
                      ))}

                      <div className="flex flex-wrap gap-2 pt-4">
                        <Button onClick={() => void generateDocument()} className="flex-1 min-w-[180px]" disabled={!selectedSignature || isGeneratingPreview}>
                          <Eye className="w-4 h-4 mr-2" />
                          {isGeneratingPreview ? 'Generating...' : 'Generate Preview'}
                        </Button>
                        <Button variant="outline" onClick={() => void generatePDF()} disabled={!generatedHtml || !selectedSignature || isGeneratingPdf}>
                          <Download className="w-4 h-4 mr-2" />
                          {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
                        </Button>
                        <Button variant="outline" onClick={() => currentHistoryEntry && openDocumentLink(currentHistoryEntry)} disabled={!currentHistoryEntry}>
                          <Link2 className="w-4 h-4 mr-2" />
                          Share Link
                        </Button>
                        <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
                          <DialogTrigger asChild>
                            <Button variant="outline" disabled={!generatedHtml || !currentHistoryEntry || !selectedSignature}>
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
                          <p className="text-sm text-slate-600">Signature: {currentHistoryEntry.signatureName} ({currentHistoryEntry.signatureRole})</p>
                          <p className="text-sm text-slate-600">Signing password: {currentHistoryEntry.sharePassword || 'Pending'}</p>
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
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle>Preview</CardTitle></CardHeader>
                    <CardContent className="min-w-0">
                      {generatedHtml ? (
                        <iframe title="Document Preview" srcDoc={generatedHtml} className="w-full min-h-[72vh] md:min-h-[900px] rounded-xl border bg-white" />
                      ) : (
                        <div className="flex items-center justify-center h-64 text-slate-500"><div className="text-center"><FileText className="w-12 h-12 mx-auto mb-4" /><p>Choose a signature, fill the form, and generate the preview to unlock the full document flow.</p></div></div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64"><div className="text-center"><FileText className="w-16 h-16 mx-auto mb-4 text-slate-400" /><h2 className="text-2xl font-bold mb-2">Select a Template</h2><p className="text-slate-500">Choose a template from the sidebar to start generating Corescent documents.</p></div></div>
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

            {session?.user?.role === 'admin' && <TabsContent value="admin"><AdminPanel /></TabsContent>}
          </Tabs>
        </main>
      </div>
    </div>
  );
}
