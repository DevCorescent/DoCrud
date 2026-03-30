'use client';

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { BriefcaseBusiness, FileCog, FolderKanban, Plus, Save, ShieldCheck, Trash2, Upload, Users2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import RichTextEditor from '@/components/RichTextEditor';
import { DocumentEditorState, DocumentHistory, DocumentTemplate, ManagedFile, RecipientAccessLevel, RoleProfile, User } from '@/types/document';
import FeatureGuide from '@/components/FeatureGuide';

type WorkspaceMode = 'editor' | 'files' | 'roles';
type DropdownOptionMap = Record<string, string[]>;

type WorkspaceDocument = DocumentHistory & {
  editorState: DocumentEditorState;
  managedFiles: ManagedFile[];
};

interface EnterpriseWorkspaceProps {
  mode: WorkspaceMode;
}

const defaultRoleDraft = {
  name: '',
  description: '',
  baseRole: 'user' as 'admin' | 'hr' | 'legal' | 'user',
  permissions: '',
  governanceScopes: '',
};

const emptyEditorState: DocumentEditorState = {
  title: '',
  lifecycleStage: 'draft',
  documentStatus: 'active',
  classification: 'internal',
  department: '',
  owner: '',
  reviewer: '',
  versionLabel: 'v1.0',
  effectiveDate: '',
  expiryDate: '',
  tags: [],
  complianceNotes: '',
  internalSummary: '',
  clauseLibrary: [],
  layoutPreset: 'formal',
  watermarkLabel: '',
};

function normalizeDocument(entry: DocumentHistory): WorkspaceDocument {
  return {
    ...entry,
    editorState: {
      ...emptyEditorState,
      ...(entry.editorState || {}),
      tags: entry.editorState?.tags || [],
      clauseLibrary: entry.editorState?.clauseLibrary || [],
      title: entry.editorState?.title || entry.templateName,
    },
    managedFiles: entry.managedFiles || [],
  };
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function mergeOptions(options: string[], currentValue?: string) {
  return Array.from(new Set([...(currentValue?.trim() ? [currentValue.trim()] : []), ...options])).filter(Boolean);
}

export default function EnterpriseWorkspace({ mode }: EnterpriseWorkspaceProps) {
  const [documents, setDocuments] = useState<WorkspaceDocument[]>([]);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<RoleProfile[]>([]);
  const [dropdownOptions, setDropdownOptions] = useState<DropdownOptionMap>({});
  const [selectedDocumentId, setSelectedDocumentId] = useState('');
  const [documentSearch, setDocumentSearch] = useState('');
  const [workspaceDocument, setWorkspaceDocument] = useState<WorkspaceDocument | null>(null);
  const [roleDraft, setRoleDraft] = useState(defaultRoleDraft);
  const [fileCategory, setFileCategory] = useState<ManagedFile['category']>('attachment');
  const [fileNotes, setFileNotes] = useState('');
  const [newOptionDrafts, setNewOptionDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadWorkspace = useCallback(async () => {
    setError('');
    const response = await fetch('/api/workspace', { cache: 'no-store' });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(payload?.error || 'Failed to load enterprise workspace data.');
    }

    const normalizedDocuments = ((payload?.documents || []) as DocumentHistory[]).map(normalizeDocument).sort(
      (left, right) => new Date(right.generatedAt).getTime() - new Date(left.generatedAt).getTime(),
    );

    setDocuments(normalizedDocuments);
    setTemplates(Array.isArray(payload?.templates) ? payload.templates : []);
    setUsers(Array.isArray(payload?.users) ? payload.users : []);
    setRoles(Array.isArray(payload?.roles) ? payload.roles : []);
    setDropdownOptions(payload?.dropdownOptions && typeof payload.dropdownOptions === 'object' ? payload.dropdownOptions : {});

    if (!selectedDocumentId && normalizedDocuments[0]) {
      setSelectedDocumentId(normalizedDocuments[0].id);
      setWorkspaceDocument(normalizedDocuments[0]);
    }
  }, [selectedDocumentId]);

  useEffect(() => {
    void loadWorkspace().catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : 'Failed to initialize workspace');
    });
  }, [loadWorkspace]);

  useEffect(() => {
    if (!selectedDocumentId) return;
    const selected = documents.find((item) => item.id === selectedDocumentId) || null;
    setWorkspaceDocument(selected ? normalizeDocument(selected) : null);
  }, [documents, selectedDocumentId]);

  const filteredDocuments = useMemo(() => {
    const query = documentSearch.trim().toLowerCase();
    return documents.filter((item) => !query || [
      item.templateName,
      item.referenceNumber,
      item.generatedBy,
      item.editorState.title,
      item.editorState.department,
    ].filter(Boolean).some((value) => value?.toLowerCase().includes(query)));
  }, [documentSearch, documents]);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === workspaceDocument?.templateId),
    [templates, workspaceDocument?.templateId],
  );

  const editableFields = useMemo(() => {
    if (!workspaceDocument) return [];
    if (selectedTemplate?.fields?.length) {
      return selectedTemplate.fields.map((field) => ({
        key: field.name,
        label: field.label,
        type: field.type,
      }));
    }

    return Object.keys(workspaceDocument.data || {}).map((key) => ({
      key,
      label: key.replace(/([A-Z])/g, ' $1').replace(/^./, (value) => value.toUpperCase()),
      type: 'text',
    }));
  }, [selectedTemplate, workspaceDocument]);

  const documentCountByStage = useMemo(() => ({
    draft: documents.filter((item) => item.editorState.lifecycleStage === 'draft').length,
    review: documents.filter((item) => item.editorState.lifecycleStage === 'internal_review').length,
    approved: documents.filter((item) => item.editorState.lifecycleStage === 'approved').length,
  }), [documents]);

  const updateDocumentField = (field: string, value: string) => {
    setWorkspaceDocument((prev) => prev ? {
      ...prev,
      data: { ...prev.data, [field]: value },
    } : prev);
  };

  const updateEditorState = <K extends keyof DocumentEditorState>(field: K, value: DocumentEditorState[K]) => {
    setWorkspaceDocument((prev) => prev ? {
      ...prev,
      editorState: {
        ...prev.editorState,
        [field]: value,
      },
    } : prev);
  };

  const saveWorkspaceDocument = async () => {
    if (!workspaceDocument) return;

    try {
      setSaving(true);
      const response = await fetch('/api/documents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: workspaceDocument.id,
          data: workspaceDocument.data,
          previewHtml: workspaceDocument.previewHtml,
          requiredDocuments: workspaceDocument.requiredDocuments || [],
          requiredDocumentWorkflowEnabled: workspaceDocument.requiredDocumentWorkflowEnabled,
          recipientAccess: workspaceDocument.recipientAccess,
          recipientSignatureRequired: workspaceDocument.recipientSignatureRequired,
          sharePassword: workspaceDocument.sharePassword,
          managedFiles: workspaceDocument.managedFiles,
          editorState: workspaceDocument.editorState,
          clientName: workspaceDocument.clientName,
          clientEmail: workspaceDocument.clientEmail,
          clientOrganization: workspaceDocument.clientOrganization,
          folderLabel: workspaceDocument.folderLabel,
          organizationId: workspaceDocument.organizationId,
          organizationName: workspaceDocument.organizationName,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to save document workspace changes');
      }

      const normalized = normalizeDocument(payload);
      setDocuments((prev) => prev.map((item) => item.id === normalized.id ? normalized : item));
      setWorkspaceDocument(normalized);
      setMessage('Enterprise document configuration saved successfully.');
      setError('');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save document');
      setMessage('');
    } finally {
      setSaving(false);
    }
  };

  const saveDropdownOption = async (fieldKey: string, option: string, onSelect?: (value: string) => void) => {
    const nextOption = option.trim();
    if (!nextOption) return;

    try {
      const response = await fetch('/api/dropdown-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldKey, option: nextOption }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to save dropdown option');
      }

      setDropdownOptions(payload);
      setNewOptionDrafts((prev) => ({ ...prev, [fieldKey]: '' }));
      onSelect?.(nextOption);
      setMessage(`Saved "${nextOption}" for future use.`);
      setError('');
    } catch (optionError) {
      setError(optionError instanceof Error ? optionError.message : 'Failed to save dropdown option');
      setMessage('');
    }
  };

  const uploadManagedFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!workspaceDocument || !event.target.files?.length) return;

    try {
      const files = await Promise.all(
        Array.from(event.target.files).map(async (file) => ({
          id: `managed-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          category: fileCategory,
          mimeType: file.type || 'application/octet-stream',
          dataUrl: await readFileAsDataUrl(file),
          sizeInBytes: file.size,
          uploadedAt: new Date().toISOString(),
          uploadedBy: 'admin',
          notes: fileNotes.trim() || undefined,
        })),
      );

      setWorkspaceDocument({
        ...workspaceDocument,
        managedFiles: [...workspaceDocument.managedFiles, ...files],
      });
      setMessage(`${files.length} file${files.length === 1 ? '' : 's'} added to the workspace repository.`);
      setError('');
      setFileNotes('');
      event.target.value = '';
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Failed to prepare files');
      setMessage('');
    }
  };

  const removeManagedFile = (fileId: string) => {
    setWorkspaceDocument((prev) => prev ? {
      ...prev,
      managedFiles: prev.managedFiles.filter((file) => file.id !== fileId),
    } : prev);
  };

  const createRoleProfile = async () => {
    try {
      const response = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: roleDraft.name,
          description: roleDraft.description,
          baseRole: roleDraft.baseRole,
          permissions: roleDraft.permissions.split(',').map((value) => value.trim()).filter(Boolean),
          governanceScopes: roleDraft.governanceScopes.split(',').map((value) => value.trim()).filter(Boolean),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to create role profile');
      }

      setRoles((prev) => [...prev, payload]);
      setRoleDraft(defaultRoleDraft);
      setMessage('Role profile created successfully.');
      setError('');
    } catch (roleError) {
      setError(roleError instanceof Error ? roleError.message : 'Failed to create role');
      setMessage('');
    }
  };

  const assignRoleProfile = async (userId: string, roleProfileId: string) => {
    const user = users.find((entry) => entry.id === userId);
    const role = roles.find((entry) => entry.id === roleProfileId);
    if (!user || !role) return;

    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          role: role.baseRole,
          permissions: role.permissions,
          roleProfileId: role.id,
          roleProfileName: role.name,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to assign role profile');
      }

      setUsers((prev) => prev.map((entry) => entry.id === user.id ? payload : entry));
      setMessage(`Assigned ${role.name} to ${user.name}.`);
      setError('');
    } catch (assignmentError) {
      setError(assignmentError instanceof Error ? assignmentError.message : 'Failed to assign role');
      setMessage('');
    }
  };

  const SmartSelectField = ({
    label,
    fieldKey,
    value,
    onChange,
    options,
    placeholder,
  }: {
    label: string;
    fieldKey: string;
    value: string;
    onChange: (value: string) => void;
    options?: string[];
    placeholder?: string;
  }) => {
    const merged = mergeOptions(options || dropdownOptions[fieldKey] || [], value);

    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">{label}</label>
        <Select value={value || '__empty__'} onValueChange={(nextValue) => onChange(nextValue === '__empty__' ? '' : nextValue)}>
          <SelectTrigger><SelectValue placeholder={placeholder || `Select ${label.toLowerCase()}`} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__empty__">None selected</SelectItem>
            {merged.map((option) => (
              <SelectItem key={option} value={option}>{option}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Input
            value={newOptionDrafts[fieldKey] || ''}
            onChange={(event) => setNewOptionDrafts((prev) => ({ ...prev, [fieldKey]: event.target.value }))}
            placeholder={`Add new ${label.toLowerCase()} option`}
          />
          <Button type="button" variant="outline" onClick={() => void saveDropdownOption(fieldKey, newOptionDrafts[fieldKey] || '', onChange)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const renderEditorView = () => (
    <>
      <div className="grid gap-6 2xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-xl">Metadata and Governance</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <SmartSelectField
                label="Executive Title"
                fieldKey="editor.title"
                value={workspaceDocument?.editorState.title || ''}
                onChange={(value) => updateEditorState('title', value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Lifecycle Stage</label>
              <Select value={workspaceDocument?.editorState.lifecycleStage || 'draft'} onValueChange={(value) => updateEditorState('lifecycleStage', value as NonNullable<DocumentEditorState['lifecycleStage']>)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="internal_review">Internal Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Document Status</label>
              <Select value={workspaceDocument?.editorState.documentStatus || 'active'} onValueChange={(value) => updateEditorState('documentStatus', value as NonNullable<DocumentEditorState['documentStatus']>)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="superseded">Superseded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <SmartSelectField label="Department" fieldKey="editor.department" value={workspaceDocument?.editorState.department || ''} onChange={(value) => updateEditorState('department', value)} />
            <SmartSelectField label="Owner" fieldKey="editor.owner" value={workspaceDocument?.editorState.owner || ''} onChange={(value) => updateEditorState('owner', value)} />
            <SmartSelectField label="Reviewer" fieldKey="editor.reviewer" value={workspaceDocument?.editorState.reviewer || ''} onChange={(value) => updateEditorState('reviewer', value)} />
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Classification</label>
              <Select value={workspaceDocument?.editorState.classification || 'internal'} onValueChange={(value) => updateEditorState('classification', value as NonNullable<DocumentEditorState['classification']>)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="confidential">Confidential</SelectItem>
                  <SelectItem value="restricted">Restricted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Layout Preset</label>
              <Select value={workspaceDocument?.editorState.layoutPreset || 'formal'} onValueChange={(value) => updateEditorState('layoutPreset', value as NonNullable<DocumentEditorState['layoutPreset']>)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="executive">Executive</SelectItem>
                  <SelectItem value="legal">Legal</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                  <SelectItem value="client-ready">Client Ready</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <SmartSelectField label="Version Label" fieldKey="editor.versionLabel" value={workspaceDocument?.editorState.versionLabel || ''} onChange={(value) => updateEditorState('versionLabel', value)} />
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Effective Date</label>
              <Input type="date" value={workspaceDocument?.editorState.effectiveDate || ''} onChange={(event) => updateEditorState('effectiveDate', event.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Expiry Date</label>
              <Input type="date" value={workspaceDocument?.editorState.expiryDate || ''} onChange={(event) => updateEditorState('expiryDate', event.target.value)} />
            </div>
            <div className="md:col-span-2">
              <SmartSelectField label="Watermark Label" fieldKey="editor.watermarkLabel" value={workspaceDocument?.editorState.watermarkLabel || ''} onChange={(value) => updateEditorState('watermarkLabel', value)} />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Tags</label>
              <Input value={(workspaceDocument?.editorState.tags || []).join(', ')} onChange={(event) => updateEditorState('tags', event.target.value.split(',').map((value) => value.trim()).filter(Boolean))} placeholder="msa, vendor, onboarding, renewal" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Clause Library</label>
              <Input value={(workspaceDocument?.editorState.clauseLibrary || []).join(', ')} onChange={(event) => updateEditorState('clauseLibrary', event.target.value.split(',').map((value) => value.trim()).filter(Boolean))} placeholder="confidentiality, indemnity, payment terms" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-xl">Access and Delivery Controls</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Recipient Access</label>
              <Select value={workspaceDocument?.recipientAccess || 'comment'} onValueChange={(value) => setWorkspaceDocument((prev) => prev ? { ...prev, recipientAccess: value as RecipientAccessLevel } : prev)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">View</SelectItem>
                  <SelectItem value="comment">Comment</SelectItem>
                  <SelectItem value="edit">Edit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <SmartSelectField label="Share Password" fieldKey="editor.sharePassword" value={workspaceDocument?.sharePassword || ''} onChange={(value) => setWorkspaceDocument((prev) => prev ? { ...prev, sharePassword: value.toUpperCase() } : prev)} />
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Signature Requirement</label>
              <Select value={workspaceDocument?.recipientSignatureRequired ? 'required' : 'optional'} onValueChange={(value) => setWorkspaceDocument((prev) => prev ? { ...prev, recipientSignatureRequired: value === 'required' } : prev)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="required">Required</SelectItem>
                  <SelectItem value="optional">Optional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Required-Document Workflow</label>
              <Select value={workspaceDocument?.requiredDocumentWorkflowEnabled ? 'enabled' : 'disabled'} onValueChange={(value) => setWorkspaceDocument((prev) => prev ? { ...prev, requiredDocumentWorkflowEnabled: value === 'enabled' } : prev)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="enabled">Enabled</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Required Supporting Documents</label>
              <Input value={(workspaceDocument?.requiredDocuments || []).join(', ')} onChange={(event) => setWorkspaceDocument((prev) => prev ? { ...prev, requiredDocuments: event.target.value.split(',').map((value) => value.trim()).filter(Boolean) } : prev)} placeholder="PAN card, address proof, signed annexure" />
            </div>
            <div className="md:col-span-2">
              <SmartSelectField label="Client Name" fieldKey="client.name" value={workspaceDocument?.clientName || ''} onChange={(value) => setWorkspaceDocument((prev) => prev ? { ...prev, clientName: value } : prev)} />
            </div>
            <div>
              <SmartSelectField label="Client Email" fieldKey="client.email" value={workspaceDocument?.clientEmail || ''} onChange={(value) => setWorkspaceDocument((prev) => prev ? { ...prev, clientEmail: value.toLowerCase() } : prev)} />
            </div>
            <div>
              <SmartSelectField label="Client Organization" fieldKey="client.organization" value={workspaceDocument?.clientOrganization || ''} onChange={(value) => setWorkspaceDocument((prev) => prev ? { ...prev, clientOrganization: value } : prev)} />
            </div>
            <div>
              <SmartSelectField label="Folder Label" fieldKey="document.folder" value={workspaceDocument?.folderLabel || ''} onChange={(value) => setWorkspaceDocument((prev) => prev ? { ...prev, folderLabel: value } : prev)} />
            </div>
            <div>
              <SmartSelectField label="Organization Name" fieldKey="document.organization" value={workspaceDocument?.organizationName || ''} onChange={(value) => setWorkspaceDocument((prev) => prev ? { ...prev, organizationName: value } : prev)} />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Internal Summary</label>
              <RichTextEditor value={workspaceDocument?.editorState.internalSummary || ''} onChange={(value) => updateEditorState('internalSummary', value)} placeholder="Write internal context, approval notes, risk observations, or handoff remarks." minHeightClassName="min-h-[120px]" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Compliance Notes</label>
              <RichTextEditor value={workspaceDocument?.editorState.complianceNotes || ''} onChange={(value) => updateEditorState('complianceNotes', value)} placeholder="Capture policy flags, negotiated clauses, or audit notes." minHeightClassName="min-h-[120px]" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-xl">Structured Document Editing</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            {editableFields.map((field) => {
              const fieldKey = `template.${workspaceDocument?.templateId}.${field.key}`;
              const value = workspaceDocument?.data?.[field.key] || '';
              const savedOptions = dropdownOptions[fieldKey] || [];

              return (
                <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                  {field.type === 'textarea' ? (
                    <>
                      <label className="mb-1 block text-sm font-medium text-slate-700">{field.label}</label>
                      <RichTextEditor value={value} onChange={(nextValue) => updateDocumentField(field.key, nextValue)} placeholder={`Update ${field.label.toLowerCase()}`} minHeightClassName="min-h-[140px]" />
                    </>
                  ) : (
                    <SmartSelectField label={field.label} fieldKey={fieldKey} value={value} onChange={(nextValue) => updateDocumentField(field.key, nextValue)} options={savedOptions} placeholder={`Select ${field.label.toLowerCase()}`} />
                  )}
                </div>
              );
            })}
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Executive Body Editor</label>
            <RichTextEditor value={workspaceDocument?.previewHtml || ''} onChange={(value) => setWorkspaceDocument((prev) => prev ? { ...prev, previewHtml: value } : prev)} placeholder="Refine the already generated document body directly for advanced legal or business formatting." minHeightClassName="min-h-[280px]" />
          </div>
        </CardContent>
      </Card>
    </>
  );

  const renderFilesView = () => (
    <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
      <Card>
        <CardHeader><CardTitle className="text-xl">Upload to Repository</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <SmartSelectField label="Repository Category" fieldKey="files.category" value={fileCategory} onChange={(value) => setFileCategory(value as ManagedFile['category'])} options={['attachment', 'supporting', 'policy', 'media', 'appendix']} />
          <SmartSelectField label="Upload Notes" fieldKey="files.notes" value={fileNotes} onChange={setFileNotes} />
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white">
            <Upload className="h-4 w-4" />
            Upload Workspace Files
            <input type="file" multiple className="hidden" onChange={uploadManagedFiles} />
          </label>
          <Button type="button" onClick={() => void saveWorkspaceDocument()} disabled={saving || !workspaceDocument}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save File Changes'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-xl">Managed Files</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {workspaceDocument?.managedFiles.map((file) => (
            <div key={file.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{file.name}</p>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{file.category}</p>
                  <p className="mt-1 text-sm text-slate-500">{Math.max(1, Math.round(file.sizeInBytes / 1024))} KB • Uploaded {new Date(file.uploadedAt).toLocaleString()}</p>
                  {file.notes && <p className="mt-2 text-sm text-slate-600">{file.notes}</p>}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => removeManagedFile(file.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm"><a href={file.dataUrl} target="_blank" rel="noreferrer">Open</a></Button>
                <Button asChild variant="outline" size="sm"><a href={file.dataUrl} download={file.name}>Download</a></Button>
              </div>
            </div>
          ))}
          {!workspaceDocument?.managedFiles.length && (
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
              Upload annexures, scans, policy references, and signed support files to create a document-centric repository.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderRolesView = () => (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-xl">Role Creator</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <SmartSelectField label="Role Name" fieldKey="roles.name" value={roleDraft.name} onChange={(value) => setRoleDraft((prev) => ({ ...prev, name: value }))} />
          <SmartSelectField label="Role Description" fieldKey="roles.description" value={roleDraft.description} onChange={(value) => setRoleDraft((prev) => ({ ...prev, description: value }))} />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Base Access Tier</label>
            <Select value={roleDraft.baseRole} onValueChange={(value) => setRoleDraft((prev) => ({ ...prev, baseRole: value as 'admin' | 'hr' | 'legal' | 'user' }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="hr">HR</SelectItem>
                <SelectItem value="legal">Legal</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <SmartSelectField label="Template Permissions" fieldKey="roles.permissions" value={roleDraft.permissions} onChange={(value) => setRoleDraft((prev) => ({ ...prev, permissions: value }))} />
          <SmartSelectField label="Governance Scopes" fieldKey="roles.scopes" value={roleDraft.governanceScopes} onChange={(value) => setRoleDraft((prev) => ({ ...prev, governanceScopes: value }))} />
          <Button type="button" onClick={() => void createRoleProfile()}>
            <Plus className="mr-2 h-4 w-4" />
            Create Role Profile
          </Button>
          <div className="space-y-3 pt-2">
            {roles.map((role) => (
              <div key={role.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{role.name}</p>
                    <p className="text-sm text-slate-500">{role.description}</p>
                  </div>
                  <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">{role.baseRole}</span>
                </div>
                <p className="mt-3 text-sm text-slate-600">Permissions: {role.permissions.join(', ') || 'None'}</p>
                <p className="mt-1 text-sm text-slate-600">Scopes: {role.governanceScopes.join(', ') || 'None'}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-xl">Roles and Permissions Mapping</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{user.name}</p>
                  <p className="text-sm text-slate-500">{user.email}</p>
                  <p className="mt-1 text-sm text-slate-600">Current access: {user.roleProfileName || user.role} • {user.permissions.join(', ') || 'No explicit permissions'}</p>
                </div>
                <div className="w-full lg:w-[280px]">
                  <Select value={user.roleProfileId || '__unassigned__'} onValueChange={(value) => value !== '__unassigned__' ? void assignRoleProfile(user.id, value) : undefined}>
                    <SelectTrigger><SelectValue placeholder="Assign a role profile" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__unassigned__">No change</SelectItem>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );

  const modeMeta: Record<WorkspaceMode, { eyebrow: string; title: string; description: string; icon: typeof FileCog }> = {
    editor: {
      eyebrow: 'Document Operations',
      title: 'Advanced editing and governance for existing documents.',
      description: 'Use structured dropdown-heavy controls, save reusable field values to the backend, and refine generated content without disturbing the existing generation flow.',
      icon: FileCog,
    },
    files: {
      eyebrow: 'File Manager',
      title: 'Centralized repository for document-linked assets.',
      description: 'Keep annexures, media, policy files, and supporting artifacts in one place for each document record.',
      icon: FolderKanban,
    },
    roles: {
      eyebrow: 'Roles and Permissions',
      title: 'Enterprise access control with reusable role profiles.',
      description: 'Create reusable permission bundles and assign them to users through controlled dropdown-based governance.',
      icon: Users2,
    },
  };

  const currentMeta = modeMeta[mode];
  const guideContent: Record<WorkspaceMode, { tutorial: string[]; examples: string[] }> = {
    editor: {
      tutorial: [
        'Pick an existing document from the left rail to load its saved enterprise metadata and body.',
        'Use the dropdown-heavy governance controls to standardize titles, owners, organizations, and lifecycle stages.',
        'Add reusable values with the plus button next to a field so the same option appears next time for that exact field.',
        'Save changes to generate a fresh version snapshot and keep the document lifecycle consistent.',
      ],
      examples: [
        'Example: move a service agreement from Draft to Internal Review, assign Legal as reviewer, and save version label `v2.0`.',
        'Example: link a document to `client@partner.com`, folder `Client Agreements`, and organization `Partner Labs` so it appears in the client portal.',
      ],
    },
    files: {
      tutorial: [
        'Open a document first so uploaded files are attached to the correct document record.',
        'Choose a file category, optionally save reusable notes, and upload one or more supporting files.',
        'Use Save Changes after upload edits so repository state persists to the backend.',
      ],
      examples: [
        'Example: upload a signed annexure as `appendix` and a KYC PDF as `supporting` for the same client agreement.',
        'Example: use file notes like `Board-approved copy` or `Latest PAN submission` to help review teams later.',
      ],
    },
    roles: {
      tutorial: [
        'Create a reusable role profile with a base access tier and comma-separated permissions or scopes.',
        'Review the generated role list, then assign a role profile to a user from the mapping panel.',
        'Use client users for external visibility and internal roles for HR, Legal, and Admin operations.',
      ],
      examples: [
        'Example: create `Contract Governance Manager` with `nda,service-agreement,contractual-agreement` permissions.',
        'Example: assign a client user a client-only role so they only see linked documents in the client portal.',
      ],
    },
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,rgba(255,247,237,0.96)_0%,rgba(255,255,255,0.98)_36%,rgba(15,23,42,0.98)_100%)] p-6 text-white shadow-[0_28px_80px_rgba(15,23,42,0.12)]">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-200">{currentMeta.eyebrow}</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">{currentMeta.title}</h2>
            <p className="mt-3 max-w-3xl text-sm text-slate-200">{currentMeta.description}</p>
          </div>
          <div className="grid gap-3">
            {[
              { label: 'Draft pipeline', value: documentCountByStage.draft, icon: FileCog },
              { label: 'In review', value: documentCountByStage.review, icon: ShieldCheck },
              { label: 'Approved', value: documentCountByStage.approved, icon: BriefcaseBusiness },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-200">{item.label}</p>
                    <p className="mt-1 text-2xl font-semibold text-white">{item.value}</p>
                  </div>
                  <item.icon className="h-5 w-5 text-orange-200" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {(message || error) && (
        <Card className={error ? 'border-red-200 bg-red-50/80' : 'border-emerald-200 bg-emerald-50/80'}>
          <CardContent className="p-4">
            {message && <p className="text-sm text-emerald-800">{message}</p>}
            {error && <p className="text-sm text-red-700">{error}</p>}
          </CardContent>
        </Card>
      )}

      <FeatureGuide
        title={`${currentMeta.title} Guide`}
        tutorial={guideContent[mode].tutorial}
        examples={guideContent[mode].examples}
      />

      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="border-white/60 bg-white/85">
          <CardHeader>
            <CardTitle className="text-xl">Existing Documents</CardTitle>
            <Input value={documentSearch} onChange={(event) => setDocumentSearch(event.target.value)} placeholder="Search documents, owners, or references" />
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredDocuments.map((item) => (
              <button key={item.id} type="button" onClick={() => setSelectedDocumentId(item.id)} className={`w-full rounded-2xl border p-4 text-left transition ${selectedDocumentId === item.id ? 'border-slate-950 bg-orange-50' : 'border-slate-200 bg-white hover:border-orange-300 hover:bg-orange-50/50'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{item.editorState.title || item.templateName}</p>
                    <p className="text-sm text-slate-500">{item.referenceNumber}</p>
                  </div>
                  <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">{item.editorState.lifecycleStage?.replace('_', ' ') || 'draft'}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
                  <span>Owner: {item.editorState.owner || item.generatedBy}</span>
                  <span>Status: {item.editorState.documentStatus || 'active'}</span>
                </div>
              </button>
            ))}
            {filteredDocuments.length === 0 && <p className="text-sm text-slate-500">No matching documents found in the workspace.</p>}
          </CardContent>
        </Card>

        {workspaceDocument ? (
          <div className="space-y-6">
            <Card className="border-white/60 bg-white/90">
              <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle className="text-2xl">{workspaceDocument.editorState.title || workspaceDocument.templateName}</CardTitle>
                  <p className="mt-2 text-sm text-slate-500">Reference {workspaceDocument.referenceNumber || 'Not assigned'} • Generated by {workspaceDocument.generatedBy} • Backend-saved dropdown libraries are active for reusable fields.</p>
                </div>
                {mode !== 'roles' && (
                  <Button type="button" onClick={() => void saveWorkspaceDocument()} disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                )}
              </CardHeader>
            </Card>

            {mode === 'editor' && renderEditorView()}
            {mode === 'files' && renderFilesView()}
            {mode === 'roles' && renderRolesView()}
          </div>
        ) : (
          <Card>
            <CardContent className="flex min-h-[420px] items-center justify-center">
              <div className="text-center text-slate-500">
                <FolderKanban className="mx-auto mb-4 h-12 w-12" />
                <p>Select a document to open this workspace section.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
