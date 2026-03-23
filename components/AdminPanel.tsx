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
import { CollaborationSettings, DocumentHistory, DocumentTemplate, MailSettings, SignatureRecord, SignatureSettings, User, WorkflowAutomationSettings } from '@/types/document';
import { Plus, Edit, Trash2, Users, FileText, Shield, Mail, Zap, CheckCircle2, PenTool, MessageSquare, FolderOpen, Search, ExternalLink, Download } from 'lucide-react';
import TemplateEditor from './TemplateEditor';
import SignaturePad from './SignaturePad';
import { buildGoogleMapsLink, formatSignatureLocation } from '@/lib/location';

const emptyMailSettings: MailSettings = {
  host: '',
  port: 587,
  secure: false,
  requireAuth: true,
  username: '',
  password: '',
  fromName: 'Corescent Technologies',
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
  const [documentSearch, setDocumentSearch] = useState('');
  const [documentStatusFilter, setDocumentStatusFilter] = useState<'all' | 'pending' | 'verified' | 'rejected' | 'not_required'>('all');
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
    role: 'user' as 'admin' | 'hr' | 'legal' | 'user',
    permissions: [] as string[],
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [smtpTesting, setSmtpTesting] = useState(false);

  const isAdmin = session?.user?.role === 'admin';
  const documentsPerPage = 6;

  useEffect(() => {
    if (isAdmin) {
      void Promise.all([fetchUsers(), fetchTemplates(), fetchMailSettings(), fetchAutomationSettings(), fetchSignatureSettings(), fetchCollaborationSettings(), fetchDocuments()]);
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
      return matchesSearch && matchesStatus;
    });
  }, [documentSearch, documentStatusFilter, documents]);

  const paginatedDocuments = useMemo(() => {
    const start = (documentPage - 1) * documentsPerPage;
    return filteredDocuments.slice(start, start + documentsPerPage);
  }, [documentPage, filteredDocuments]);

  const totalDocumentPages = Math.max(1, Math.ceil(filteredDocuments.length / documentsPerPage));
  const pendingDocuments = documents.filter((document) => document.requiredDocumentWorkflowEnabled && (document.documentsVerificationStatus || 'pending') === 'pending').length;
  const verifiedDocuments = documents.filter((document) => document.documentsVerificationStatus === 'verified').length;
  const rejectedDocuments = documents.filter((document) => document.documentsVerificationStatus === 'rejected').length;

  useEffect(() => {
    setDocumentPage(1);
  }, [documentSearch, documentStatusFilter]);

  const getRolePermissions = (role: string) => {
    const rolePermissions: Record<string, string[]> = {
      admin: ['all'],
      hr: ['internship-letter'],
      legal: ['nda', 'contractual-agreement'],
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
        <p className="text-muted-foreground">Manage users, templates, SMTP, workflow automation, and the authorized signature bank for the Corescent document platform.</p>
      </div>

      {(errorMessage || successMessage) && (
        <Card>
          <CardContent className="p-4">
            {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
            {successMessage && <p className="text-sm text-green-700">{successMessage}</p>}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="flex w-full flex-wrap gap-2 overflow-x-auto rounded-2xl">
          <TabsTrigger value="users" className="flex items-center gap-2"><Users className="w-4 h-4" />Users</TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2"><FolderOpen className="w-4 h-4" />Documents</TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2"><FileText className="w-4 h-4" />Templates</TabsTrigger>
          <TabsTrigger value="mail" className="flex items-center gap-2"><Mail className="w-4 h-4" />Mail</TabsTrigger>
          <TabsTrigger value="automation" className="flex items-center gap-2"><Zap className="w-4 h-4" />Automation</TabsTrigger>
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
                    <Select value={userForm.role} onValueChange={(value: 'admin' | 'hr' | 'legal' | 'user') => setUserForm((prev) => ({ ...prev, role: value, permissions: getRolePermissions(value) }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
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
                      setUserForm({ name: user.name, email: user.email, password: '', role: user.role, permissions: user.permissions });
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
          <Card>
            <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  className="pl-9"
                  value={documentSearch}
                  onChange={(event) => setDocumentSearch(event.target.value)}
                  placeholder="Search by template, reference, submitter, or link"
                />
              </div>
              <div className="w-full lg:w-64">
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
                        {buildGoogleMapsLink(document.recipientSignedLatitude, document.recipientSignedLongitude) && (
                          <Button asChild variant="outline" size="sm">
                            <a href={buildGoogleMapsLink(document.recipientSignedLatitude, document.recipientSignedLongitude)} target="_blank" rel="noreferrer">
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Verify Location
                            </a>
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
