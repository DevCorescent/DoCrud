'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import FeatureGuide from '@/components/FeatureGuide';

const endpointGroups = [
  {
    title: 'Authentication',
    endpoints: [
      'POST/GET ` /api/auth/[...nextauth] ` for credentials-based authentication',
      'Session-aware routes automatically use the authenticated user context',
    ],
  },
  {
    title: 'Documents',
    endpoints: [
      'GET ` /api/history ` returns visible documents for the logged-in user',
      'POST ` /api/history ` creates a document history entry',
      'PATCH ` /api/documents ` updates enterprise metadata, workflow, files, client mapping, and version snapshots',
      'GET ` /api/documents ` returns all documents for admins',
    ],
  },
  {
    title: 'Templates and Roles',
    endpoints: [
      'GET ` /api/templates ` returns system and custom templates',
      'POST/PUT/DELETE ` /api/templates/manage ` manages custom templates',
      'GET/POST/PUT/DELETE ` /api/roles ` manages reusable role profiles',
      'GET/POST/PUT/DELETE ` /api/users ` manages internal and client accounts',
    ],
  },
  {
    title: 'Settings and Platform',
    endpoints: [
      'GET/PUT ` /api/settings/theme ` controls software-wide theming',
      'GET/PUT ` /api/platform ` stores workflows, clauses, integrations, organizations, and renewal rules',
      'GET/POST/PUT/DELETE ` /api/saas/plans ` manages SaaS plans, feature access, and generation limits',
      'GET ` /api/saas/overview ` returns super-admin SaaS analytics and subscriber usage',
      'POST ` /api/saas/signup ` provisions new business SaaS accounts from the public website',
      'GET/POST ` /api/dropdown-options ` stores reusable dropdown values',
      'GET ` /api/workspace ` returns the aggregated admin workspace payload',
    ],
  },
  {
    title: 'Public Sharing',
    endpoints: [
      'GET/PATCH ` /api/public/documents/[id] ` opens and edits public document workflows',
      'POST ` /api/public/documents/[id]/comments ` saves comments or reviews',
      'POST ` /api/public/documents/[id]/sign ` captures recipient signatures',
      'POST ` /api/public/documents/[id]/requirements ` uploads required supporting documents',
      'GET ` /api/public/documents/[id]/pdf ` returns a generated PDF for the shared document',
    ],
  },
];

const integrationExamples = [
  {
    title: 'Create a document entry from another system',
    body: `fetch('/api/history', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    templateId: 'nda',
    templateName: 'Non-Disclosure Agreement',
    data: { engagedIndividualName: 'Ava Patel' },
    clientEmail: 'client@partner.com',
    clientOrganization: 'Partner Labs'
  })
})`,
  },
  {
    title: 'Update workflow metadata',
    body: `fetch('/api/documents', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: 'document-id',
    folderLabel: 'Client Agreements',
    clientEmail: 'client@partner.com',
    editorState: {
      lifecycleStage: 'internal_review',
      classification: 'confidential',
      versionLabel: 'v2.1'
    }
  })
})`,
  },
  {
    title: 'Provision reusable dropdown choices',
    body: `fetch('/api/dropdown-options', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fieldKey: 'client.organization',
    option: 'Northwind Holdings'
  })
})`,
  },
];

export default function ApiDocsCenter() {
  return (
    <div className="space-y-6">
      <div className="clay-hero rounded-[32px] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-200">Integration Docs</p>
        <h2 className="mt-3 text-3xl font-semibold text-white">API documentation for integrating this platform into your organization.</h2>
        <p className="mt-3 max-w-3xl text-sm text-slate-200">
          Use these endpoints to provision users, sync documents, attach workflows, expose client portals, and embed this software into larger business systems.
        </p>
      </div>

      <FeatureGuide
        title="API Integration Tutorial"
        tutorial={[
          'Authenticate with a platform user account first so protected routes inherit the correct organization context.',
          'Create or sync templates and users before pushing document transactions from your external system.',
          'Use `/api/history` for document creation, `/api/documents` for enterprise lifecycle updates, and `/api/platform` for shared configuration.',
          'Map client-facing documents with `clientEmail` and `clientOrganization` so the client portal can show only relevant items.',
          'Persist reusable dropdown data with `/api/dropdown-options` to standardize metadata across connected systems.',
          'Use the SaaS routes to manage public plans, business self-signup, and document-generation limits in a productized deployment.',
        ]}
        examples={[
          'Example: your HRMS creates offer letters by calling `/api/history`, then updates the workflow stage with `/api/documents`.',
          'Example: your CRM pushes client onboarding agreements, sets `folderLabel` to `Client Agreements`, and sends recipients to the public shared workflow link.',
          'Example: your internal admin tool syncs organization themes and workflow presets through `/api/settings/theme` and `/api/platform`.',
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        {endpointGroups.map((group) => (
          <Card key={group.title} className="clay-panel">
            <CardHeader><CardTitle className="text-xl">{group.title}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {group.endpoints.map((endpoint) => (
                <div key={endpoint} className="rounded-2xl bg-white/75 p-4 text-sm text-slate-700 shadow-[inset_5px_5px_12px_rgba(255,255,255,0.95),inset_-5px_-5px_12px_rgba(203,213,225,0.42)]">
                  {endpoint}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="clay-panel">
        <CardHeader><CardTitle className="text-xl">Integration Examples</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {integrationExamples.map((example) => (
            <div key={example.title} className="rounded-2xl bg-slate-950 p-5 text-slate-100 shadow-[0_18px_45px_rgba(15,23,42,0.2)]">
              <p className="mb-3 font-semibold">{example.title}</p>
              <pre className="overflow-x-auto text-xs leading-6 text-slate-200">{example.body}</pre>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
