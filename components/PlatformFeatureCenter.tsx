'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import RichTextEditor from '@/components/RichTextEditor';
import { DashboardMetrics, DocumentHistory, PlatformConfig, ThemeSettings } from '@/types/document';
import { BarChart3, BellRing, Boxes, BrainCircuit, FileDiff, FileStack, Globe2, Link2, ShieldCheck, Workflow } from 'lucide-react';
import FeatureGuide from '@/components/FeatureGuide';

type FeatureMode = 'approvals' | 'versions' | 'clauses' | 'audit' | 'bulk' | 'renewals' | 'analytics' | 'integrations' | 'organizations' | 'copilot';

const emptyPlatform: PlatformConfig = {
  workflows: [],
  clauses: [],
  integrations: [],
  organizations: [],
  expiryRules: [],
  folderLibrary: [],
};

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

export default function PlatformFeatureCenter({ mode }: { mode: FeatureMode }) {
  const [platform, setPlatform] = useState<PlatformConfig>(emptyPlatform);
  const [documents, setDocuments] = useState<DocumentHistory[]>([]);
  const [dashboard, setDashboard] = useState<DashboardMetrics>(emptyDashboard);
  const [theme, setTheme] = useState<ThemeSettings | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    void Promise.all([
      fetch('/api/platform').then((response) => response.ok ? response.json() : emptyPlatform),
      fetch('/api/documents').then((response) => response.ok ? response.json() : []),
      fetch('/api/dashboard').then((response) => response.ok ? response.json() : emptyDashboard),
      fetch('/api/settings/theme').then((response) => response.ok ? response.json() : null),
    ]).then(([platformPayload, documentsPayload, dashboardPayload, themePayload]) => {
      setPlatform(platformPayload);
      setDocuments(documentsPayload);
      setDashboard(dashboardPayload);
      setTheme(themePayload);
    });
  }, []);

  const savePlatform = async (nextConfig: PlatformConfig) => {
    const response = await fetch('/api/platform', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nextConfig),
    });
    if (!response.ok) return;
    const payload = await response.json();
    setPlatform(payload);
  };

  const saveTheme = async (nextTheme: ThemeSettings) => {
    const response = await fetch('/api/settings/theme', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nextTheme),
    });
    if (!response.ok) return;
    const payload = await response.json();
    setTheme(payload);
    document.documentElement.setAttribute('data-theme', payload.activeTheme);
  };

  const bulkUpdate = async () => {
    await Promise.all(selectedDocumentIds.map((id) =>
      fetch('/api/documents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          folderLabel: draft.bulkFolder || undefined,
          clientOrganization: draft.bulkOrganization || undefined,
          editorState: {
            lifecycleStage: draft.bulkLifecycle || undefined,
            classification: draft.bulkClassification || undefined,
          },
        }),
      }),
    ));
    setMessage(`Updated ${selectedDocumentIds.length} document${selectedDocumentIds.length === 1 ? '' : 's'}.`);
  };

  const renderApprovals = () => (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-xl">Approval Workflows</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input value={draft.workflowName || ''} onChange={(event) => setDraft((prev) => ({ ...prev, workflowName: event.target.value }))} placeholder="Workflow name" />
          <Input value={draft.workflowDepartment || ''} onChange={(event) => setDraft((prev) => ({ ...prev, workflowDepartment: event.target.value }))} placeholder="Department" />
          <Input value={draft.workflowSteps || ''} onChange={(event) => setDraft((prev) => ({ ...prev, workflowSteps: event.target.value }))} placeholder="Comma-separated steps: HR Review, Legal Validation, Admin Signoff" />
          <Button onClick={() => void savePlatform({
            ...platform,
            workflows: [
              {
                id: `wf-${Date.now()}`,
                name: draft.workflowName || 'Untitled Workflow',
                department: draft.workflowDepartment || 'General',
                isActive: true,
                steps: (draft.workflowSteps || '').split(',').map((step, index) => ({
                  id: `step-${Date.now()}-${index}`,
                  label: step.trim(),
                  ownerRole: step.trim().toLowerCase().includes('legal') ? 'legal' : step.trim().toLowerCase().includes('admin') ? 'admin' : 'hr',
                })).filter((step) => step.label),
              },
              ...platform.workflows,
            ],
          })}>Save Workflow</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-xl">Saved Workflow Chains</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {platform.workflows.map((workflow) => (
            <div key={workflow.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="font-semibold text-slate-900">{workflow.name}</p>
              <p className="text-sm text-slate-500">{workflow.department}</p>
              <p className="mt-2 text-sm text-slate-600">{workflow.steps.map((step) => step.label).join(' -> ')}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );

  const renderVersions = () => (
    <Card>
      <CardHeader><CardTitle className="text-xl">Version Control</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {documents.map((document) => (
          <div key={document.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="font-semibold text-slate-900">{document.templateName}</p>
            <p className="text-sm text-slate-500">{document.referenceNumber}</p>
            <div className="mt-3 space-y-2">
              {(document.versionSnapshots || []).slice(0, 4).map((snapshot) => (
                <div key={snapshot.id} className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                  <span className="font-medium text-slate-900">{snapshot.versionLabel}</span> • {new Date(snapshot.createdAt).toLocaleString()} • {snapshot.createdBy}
                </div>
              ))}
              {!(document.versionSnapshots || []).length && <p className="text-sm text-slate-500">No saved versions yet.</p>}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );

  const renderClauses = () => (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-xl">Clause Library</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input value={draft.clauseTitle || ''} onChange={(event) => setDraft((prev) => ({ ...prev, clauseTitle: event.target.value }))} placeholder="Clause title" />
          <Input value={draft.clauseCategory || ''} onChange={(event) => setDraft((prev) => ({ ...prev, clauseCategory: event.target.value }))} placeholder="Clause category" />
          <Input value={draft.clauseTags || ''} onChange={(event) => setDraft((prev) => ({ ...prev, clauseTags: event.target.value }))} placeholder="Tags" />
          <RichTextEditor value={draft.clauseBody || ''} onChange={(value) => setDraft((prev) => ({ ...prev, clauseBody: value }))} placeholder="Clause body" minHeightClassName="min-h-[180px]" />
          <Button onClick={() => void savePlatform({
            ...platform,
            clauses: [
              {
                id: `clause-${Date.now()}`,
                title: draft.clauseTitle || 'Untitled Clause',
                category: draft.clauseCategory || 'General',
                body: draft.clauseBody || '',
                tags: (draft.clauseTags || '').split(',').map((item) => item.trim()).filter(Boolean),
              },
              ...platform.clauses,
            ],
          })}>Save Clause</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-xl">Stored Clauses</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {platform.clauses.map((clause) => (
            <div key={clause.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="font-semibold text-slate-900">{clause.title}</p>
              <p className="text-sm text-slate-500">{clause.category}</p>
              <div className="mt-2 text-sm text-slate-600" dangerouslySetInnerHTML={{ __html: clause.body }} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );

  const renderAudit = () => (
    <Card>
      <CardHeader><CardTitle className="text-xl">Audit and Compliance Center</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {documents.slice(0, 10).map((document) => (
          <div key={document.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="font-semibold text-slate-900">{document.templateName}</p>
            <p className="text-sm text-slate-500">{document.referenceNumber}</p>
            <p className="mt-2 text-sm text-slate-600">Access events: {(document.accessEvents || []).length} • Comments: {(document.collaborationComments || []).length} • Downloads: {document.downloadCount || 0}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );

  const renderBulk = () => (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <CardHeader><CardTitle className="text-xl">Select Documents</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {documents.map((document) => (
            <label key={document.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <input type="checkbox" checked={selectedDocumentIds.includes(document.id)} onChange={(event) => setSelectedDocumentIds((prev) => event.target.checked ? [...prev, document.id] : prev.filter((item) => item !== document.id))} />
              <div>
                <p className="font-medium text-slate-900">{document.templateName}</p>
                <p className="text-sm text-slate-500">{document.referenceNumber}</p>
              </div>
            </label>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-xl">Bulk Actions</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input value={draft.bulkFolder || ''} onChange={(event) => setDraft((prev) => ({ ...prev, bulkFolder: event.target.value }))} placeholder="Folder label" />
          <Input value={draft.bulkOrganization || ''} onChange={(event) => setDraft((prev) => ({ ...prev, bulkOrganization: event.target.value }))} placeholder="Organization name" />
          <Input value={draft.bulkLifecycle || ''} onChange={(event) => setDraft((prev) => ({ ...prev, bulkLifecycle: event.target.value }))} placeholder="Lifecycle stage" />
          <Input value={draft.bulkClassification || ''} onChange={(event) => setDraft((prev) => ({ ...prev, bulkClassification: event.target.value }))} placeholder="Classification" />
          <Button onClick={() => void bulkUpdate()} disabled={selectedDocumentIds.length === 0}>Apply Bulk Update</Button>
          {message && <p className="text-sm text-emerald-700">{message}</p>}
        </CardContent>
      </Card>
    </div>
  );

  const renderRenewals = () => {
    const expiring = documents.filter((document) => {
      const expiry = document.editorState?.expiryDate;
      if (!expiry) return false;
      const daysDiff = Math.ceil((new Date(expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return daysDiff <= 45;
    });

    return (
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-xl">Renewal Rules</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {platform.expiryRules.map((rule) => (
              <div key={rule.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="font-semibold text-slate-900">{rule.name}</p>
                <p className="text-sm text-slate-500">{rule.daysBefore} days before expiry</p>
                <p className="mt-1 text-sm text-slate-600">{rule.actionLabel}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-xl">Expiring Documents</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {expiring.map((document) => (
              <div key={document.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="font-semibold text-slate-900">{document.templateName}</p>
                <p className="text-sm text-slate-500">Expiry {document.editorState?.expiryDate}</p>
              </div>
            ))}
            {expiring.length === 0 && <p className="text-sm text-slate-500">No near-term renewals detected.</p>}
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderAnalytics = () => (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {[
        ['Total Documents', String(dashboard.totalDocuments)],
        ['Templates Used', String(dashboard.templatesUsed)],
        ['Emails Sent', String(dashboard.emailsSent)],
        ['This Week', String(dashboard.documentsThisWeek)],
      ].map(([label, value]) => (
        <Card key={label}><CardContent className="p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p></CardContent></Card>
      ))}
    </div>
  );

  const renderIntegrations = () => (
    <Card>
      <CardHeader><CardTitle className="text-xl">Integrations and Webhooks</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {platform.integrations.map((integration) => (
          <div key={integration.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="font-semibold text-slate-900">{integration.name}</p>
            <p className="text-sm text-slate-500">{integration.type}</p>
            <p className="mt-1 text-sm text-slate-600">{integration.endpoint}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );

  const renderOrganizations = () => (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-xl">Organizations and Branding</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {platform.organizations.map((organization) => (
            <div key={organization.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="font-semibold text-slate-900">{organization.name}</p>
              <p className="text-sm text-slate-500">{organization.domain}</p>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-xl">Super Admin Theme</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input value={theme?.softwareName || ''} onChange={(event) => setTheme((prev) => prev ? { ...prev, softwareName: event.target.value } : prev)} placeholder="Software name" />
          <Input value={theme?.accentLabel || ''} onChange={(event) => setTheme((prev) => prev ? { ...prev, accentLabel: event.target.value } : prev)} placeholder="Accent label" />
          <Input value={theme?.activeTheme || 'ember'} onChange={(event) => setTheme((prev) => prev ? { ...prev, activeTheme: event.target.value as ThemeSettings['activeTheme'] } : prev)} placeholder="Theme key" />
          {theme && <Button onClick={() => void saveTheme(theme)}>Save Theme</Button>}
        </CardContent>
      </Card>
    </div>
  );

  const renderCopilot = () => (
    <Card>
      <CardHeader><CardTitle className="text-xl">AI Document Copilot</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-600">The floating assistant is active across the app. This section serves as the control plane for future prompt packs, summarization policies, and risk review playbooks.</p>
        <RichTextEditor value={draft.copilotPolicy || ''} onChange={(value) => setDraft((prev) => ({ ...prev, copilotPolicy: value }))} placeholder="Draft internal AI review policy, standard prompts, or guardrails." minHeightClassName="min-h-[220px]" />
      </CardContent>
    </Card>
  );

  const meta = useMemo(() => ({
    approvals: { title: 'Approvals and Workflow', icon: Workflow },
    versions: { title: 'Version Control', icon: FileDiff },
    clauses: { title: 'Clause Library', icon: FileStack },
    audit: { title: 'Audit Center', icon: ShieldCheck },
    bulk: { title: 'Bulk Operations', icon: Boxes },
    renewals: { title: 'Expiry and Renewal Engine', icon: BellRing },
    analytics: { title: 'Analytics', icon: BarChart3 },
    integrations: { title: 'Integrations', icon: Link2 },
    organizations: { title: 'Organizations and Theme', icon: Globe2 },
    copilot: { title: 'AI Copilot', icon: BrainCircuit },
  }), []);

  const guides: Record<FeatureMode, { tutorial: string[]; examples: string[] }> = {
    approvals: {
      tutorial: ['Create a workflow name, department, and comma-separated steps.', 'Save the workflow so it becomes reusable across document operations.', 'Use these steps as your standard approval chain for HR, Legal, and Admin signoff.'],
      examples: ['Example: `HR Review, Legal Validation, Admin Signoff` for onboarding letters.', 'Example: `Sales Review, Legal Review, CFO Approval` for enterprise contract approvals.'],
    },
    versions: {
      tutorial: ['Open this view to inspect document version snapshots created by the enterprise editor.', 'Use version labels to track major or minor revisions.', 'Compare timestamps and authors before rolling out a renewed draft operationally.'],
      examples: ['Example: `v1.0` initial issue, `v1.1` metadata correction, `v2.0` commercial revision.', 'Example: review who changed a contract before sending a renewal pack to a client.'],
    },
    clauses: {
      tutorial: ['Create a clause with title, category, tags, and rich-text content.', 'Store reusable clauses so legal or HR teams can standardize language.', 'Reuse clause references while drafting templates or policy notes.'],
      examples: ['Example: store an indemnity clause tagged `msa,legal,risk`.', 'Example: save a probation clause tagged `hr,employment,onboarding`.'],
    },
    audit: {
      tutorial: ['Use this view to inspect access events, comments, and tracked actions for the most recent documents.', 'Cross-check downloads, comments, and signatures before compliance export.', 'Pair this with the document summary tab for operational analysis.'],
      examples: ['Example: confirm whether a client opened and downloaded an agreement before follow-up.', 'Example: review audit activity before internal compliance reporting.'],
    },
    bulk: {
      tutorial: ['Select multiple documents from the left panel.', 'Set the shared target values like folder, organization, lifecycle, or classification.', 'Run Apply Bulk Update to save the same change across the selection.'],
      examples: ['Example: move 20 contracts into `Client Agreements` in one action.', 'Example: mark a set of expiring policies as `internal_review` before renewal.'],
    },
    renewals: {
      tutorial: ['Configure expiry rules from the platform backend.', 'Use this panel to review documents nearing their expiry date.', 'Move them into a renewal lifecycle before deadlines are missed.'],
      examples: ['Example: send a 30-day reminder for expiring NDAs.', 'Example: monitor service agreements expiring within 45 days.'],
    },
    analytics: {
      tutorial: ['Review usage KPIs like total documents, templates used, and weekly activity.', 'Use analytics to identify adoption and throughput trends.', 'Pair with workflows and audit data for operational optimization.'],
      examples: ['Example: track document growth after onboarding a new client team.', 'Example: compare template usage before and after policy standardization.'],
    },
    integrations: {
      tutorial: ['Store external system endpoints and status labels here.', 'Use the API docs tab for exact integration payloads.', 'Keep integration metadata centralized so admins know which systems are active or paused.'],
      examples: ['Example: add a webhook endpoint for audit sync.', 'Example: register a CRM integration endpoint for client agreement creation.'],
    },
    organizations: {
      tutorial: ['Manage organization records and theme settings from this section.', 'Use branding and theme controls to tailor the software appearance across deployments.', 'Update software name and accent labels for enterprise rollout.'],
      examples: ['Example: create an organization record for `Northwind Holdings`.', 'Example: switch from `ember` to `slate` for a more neutral corporate theme.'],
    },
    copilot: {
      tutorial: ['Use this panel to document AI guardrails, prompt packs, and internal drafting standards.', 'Keep operational AI policy visible to admins before enabling deeper automation.', 'Use the floating assistant for day-to-day insights while this panel governs policy.'],
      examples: ['Example: define a rule that contract summaries must always include risk, payment, and renewal sections.', 'Example: save a prompt standard for extracting obligations from agreements.'],
    },
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-slate-200 bg-white/80 p-6 shadow-sm">
        <div className="flex items-center gap-3">
          {(() => { const Icon = meta[mode].icon; return <Icon className="h-6 w-6 text-orange-600" />; })()}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-600">Platform Feature</p>
            <h2 className="text-2xl font-semibold text-slate-900">{meta[mode].title}</h2>
          </div>
        </div>
      </div>
      <FeatureGuide
        title={`${meta[mode].title} Guide`}
        purpose={`Use ${meta[mode].title} to operationalize this part of the platform in a structured, repeatable way.`}
        whyItMatters={[
          `This feature helps teams handle ${meta[mode].title.toLowerCase()} without moving into disconnected tools or side processes.`,
          'It gives admins clearer control, auditability, and repeatability as document volume increases.',
        ]}
        tutorial={guides[mode].tutorial}
        examples={guides[mode].examples}
      />
      {mode === 'approvals' && renderApprovals()}
      {mode === 'versions' && renderVersions()}
      {mode === 'clauses' && renderClauses()}
      {mode === 'audit' && renderAudit()}
      {mode === 'bulk' && renderBulk()}
      {mode === 'renewals' && renderRenewals()}
      {mode === 'analytics' && renderAnalytics()}
      {mode === 'integrations' && renderIntegrations()}
      {mode === 'organizations' && renderOrganizations()}
      {mode === 'copilot' && renderCopilot()}
    </div>
  );
}
