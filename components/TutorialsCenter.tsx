'use client';

import { useMemo, useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, Lightbulb, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type TutorialSection = {
  id: string;
  title: string;
  subtitle: string;
  audience: string;
  purpose: string;
  whyItMatters: string[];
  steps: string[];
  examples: string[];
};

const tutorials: TutorialSection[] = [
  {
    id: 'dashboard',
    title: 'Dashboard & Document Summary',
    subtitle: 'Use the analytics surfaces to understand usage, delivery, signature events, and feedback volume.',
    audience: 'All internal users',
    purpose: 'This is the command layer for monitoring what needs action, what is already progressing, and where teams are losing momentum.',
    whyItMatters: [
      'Teams use it to prioritize follow-ups instead of checking history and reports one by one.',
      'Leaders use it to spot stalled signatures, high-interest documents, and rising feedback before delays compound.',
    ],
    steps: [
      'Open Dashboard to review total documents, weekly activity, emails sent, top templates, and location-based signature patterns.',
      'Use the global search box to search by template name, reference number, device label, or recent activity and jump into the related summary.',
      'Move to Document Summary to see per-document opens, downloads, pending feedback, and recipient interaction data before you follow up.',
      'Use these views first each day to identify what is blocked, what is already progressing, and which workflows need intervention.',
    ],
    examples: [
      'Example: a sales coordinator checks Dashboard and sees one proposal with high opens but no signature. They move into Document Summary and follow up on that hot lead first.',
      'Example: HR notices rising feedback on onboarding packets and uses the summary table to identify which offer links are still pending review.',
    ],
  },
  {
    id: 'document-generation',
    title: 'Generate Documents',
    subtitle: 'Create signed, trackable documents with mandatory workflow controls and collaboration settings.',
    audience: 'Internal users with template access',
    purpose: 'This is the production workspace for creating final shareable documents, controlled intake forms, and governed recipient journeys.',
    whyItMatters: [
      'Teams use it to standardize outgoing documents so every letter, contract, or onboarding pack follows the same approved process.',
      'It reduces manual drafting errors by combining templates, signatures, access controls, and delivery from one place.',
    ],
    steps: [
      'Choose a template from the left sidebar. The form, readiness tracker, signature selector, and workflow settings are shown automatically.',
      'Select an approved admin signature, fill all required fields, then choose whether recipient signing, recipient access, and required-document checks should apply.',
      'Generate Preview to create the shareable record. After preview creation you can download PDF, open the share link, copy it, or send the document by email.',
      'Use Restore Last Values to quickly prepare a new document from a previous run, especially for recurring HR, legal, or sales workflows.',
    ],
    examples: [
      'Example: legal generates an NDA, sets recipient access to comment, emails the link, then tracks edits and review feedback from the same record.',
      'Example: HR generates an offer letter, requires recipient signature and pre-sign document verification, and uses the shared link for a controlled onboarding flow.',
    ],
  },
  {
    id: 'history',
    title: 'History & Reuse',
    subtitle: 'Use the history archive as an operational ledger for generation, delivery, and signing.',
    audience: 'Internal users',
    purpose: 'This is the running ledger for what was created, sent, opened, edited, and signed across the organization.',
    whyItMatters: [
      'Operations teams use it to verify what happened before escalating support or compliance questions.',
      'Frequent issuers use it to reuse successful runs and shorten turnaround for repeat document cycles.',
    ],
    steps: [
      'Open History to review all generated documents, delivery outcomes, required-document status, comments, and recipient signatures.',
      'Use Reuse on any successful document to repopulate the template form and speed up repetitive drafting.',
      'Open or copy the live document link directly from History when you need to resend, verify, or troubleshoot the recipient workflow.',
      'Treat History as the audit trail for operational follow-up before moving to deeper admin or enterprise tabs.',
    ],
    examples: [
      'Example: operations reuses a previous vendor contract to issue a near-identical contract for a new supplier in under a minute.',
      'Example: support opens History to verify whether a recipient actually received and signed a document before escalating the case.',
    ],
  },
  {
    id: 'onboarding',
    title: 'Employee Onboarding & Background Verification',
    subtitle: 'Run complete onboarding with employee account creation, BGV submission, admin review, and gated offer signing.',
    audience: 'HR, Admin, Employee',
    purpose: 'This workflow turns onboarding into a controlled multi-step process instead of a scattered email-and-attachment exchange.',
    whyItMatters: [
      'HR teams use it to collect KYC and joining documents before final signing without losing review visibility.',
      'Admin teams use it to gate offer completion until verification is complete, reducing compliance risk.',
    ],
    steps: [
      'Generate an HR onboarding document and fill the Employee Onboarding Access section with employee name, email, department, designation, and code.',
      'The platform automatically creates a protected employee account, enables mandatory background verification, and attaches the required BGV document checklist.',
      'The employee logs into Employee Portal, completes the verification profile, uploads KYC and employment documents, tracks onboarding progress, and asks questions.',
      'Admin reviews the onboarding record in Admin Panel > Onboarding, downloads submitted files, verifies or rejects BGV, and only verified records unlock final offer signing.',
    ],
    examples: [
      'Example: HR creates an internship letter for a new intern. The intern receives temporary credentials, uploads Aadhaar, PAN, resume, and college documents, then signs only after admin approval.',
      'Example: admin rejects a BGV package because the last employer proof is missing, adds notes, and the employee sees the issue immediately in their portal.',
    ],
  },
  {
    id: 'enterprise-workspace',
    title: 'Document Ops, File Manager, and Roles',
    subtitle: 'Manage enterprise documents, controlled file libraries, and role governance from dedicated work areas.',
    audience: 'Admin',
    purpose: 'These operational centers keep document records, supporting files, and user permissions organized after generation starts scaling.',
    whyItMatters: [
      'Admin teams use it to keep edits, attachments, and access control aligned under one governance model.',
      'It prevents the platform from becoming messy when multiple departments handle documents simultaneously.',
    ],
    steps: [
      'Open Document Ops to edit existing documents, adjust lifecycle metadata, update summaries, and maintain governance-ready records.',
      'Use File Manager to attach supporting files, keep a document repository, and manage operational assets tied to documents.',
      'Use Roles & Permissions to create role structures, assign template permissions, and control which users can view or edit each capability.',
      'Keep these areas aligned so document governance, file handling, and user access are maintained from one administration model.',
    ],
    examples: [
      'Example: compliance updates a published policy in Document Ops, uploads a revised appendix in File Manager, and gives only legal reviewers edit rights through Roles & Permissions.',
      'Example: admin creates a new operations role that can work on file workflows but cannot access clause governance or audit exports.',
    ],
  },
  {
    id: 'platform-features',
    title: 'Approvals, Versions, Clauses, Audit, Bulk Ops, Renewals, Analytics, Integrations, Organizations, and AI Copilot',
    subtitle: 'Use the advanced enterprise tabs to control scale operations, policy quality, and future-ready platform rollout.',
    audience: 'Admin',
    purpose: 'These are the scale features that turn the product from a document tool into a governed enterprise operations platform.',
    whyItMatters: [
      'Leadership and compliance teams use these controls to standardize approvals, maintain traceability, and scale repeatable workflows.',
      'IT and operations teams use them to support renewals, integrations, reporting, and multi-organization rollouts.',
    ],
    steps: [
      'Use Approvals to define operational review sequences and visibility rules before documents move forward.',
      'Use Versions, Clauses, and Audit to maintain controlled content evolution, reusable legal language, and traceability.',
      'Use Bulk Ops and Renewals for large-scale repeated activity such as scheduled document refreshes, reminders, or batch processing.',
      'Use Analytics, Integrations, Organizations, and AI Copilot to prepare the platform for enterprise reporting, connector readiness, multi-org operations, and AI-assisted work.',
    ],
    examples: [
      'Example: legal stores approved fallback clauses, versions a master agreement, and retains audit visibility for every change and reviewer touchpoint.',
      'Example: admin configures multiple organizations, prepares integrations and analytics dashboards, and uses Bulk Ops to handle quarterly policy refreshes.',
    ],
  },
  {
    id: 'admin',
    title: 'Admin Panel & Public Site Controls',
    subtitle: 'Use the admin center to manage users, SMTP, theme, signatures, landing content, and onboarding governance.',
    audience: 'Admin',
    purpose: 'This is the platform configuration hub for users, branding, delivery infrastructure, signatures, and rollout controls.',
    whyItMatters: [
      'Admins use it to set the operating baseline before teams start generating or sharing documents at volume.',
      'It keeps commercial setup, branding, and governance changes out of code so business teams can move faster.',
    ],
    steps: [
      'Create internal, client, or employee users from the Users tab and keep role permissions aligned with the responsibilities of each team member.',
      'Configure SMTP, automation, collaboration defaults, signatures, and theme settings before wider rollout so the platform behaves consistently.',
      'Use Homepage controls to manage public landing content, pricing, screenshots, and section visibility without editing code.',
      'Use the Onboarding admin tab to review employee progress, answer onboarding questions, and verify background checks.',
    ],
    examples: [
      'Example: super admin changes software branding, updates pricing plans, and enables only the marketing sections required for a customer demo.',
      'Example: admin creates a new employee manually, then later assigns that employee an onboarding record and verifies their BGV submission from the onboarding tracker.',
    ],
  },
  {
    id: 'api-docs',
    title: 'API Docs & External Adoption',
    subtitle: 'Use the built-in API documentation to integrate Docuside workflows into external business systems.',
    audience: 'Admin, Technical teams',
    purpose: 'This is the handoff point for connecting document workflows to HRMS, CRM, ERP, and partner systems.',
    whyItMatters: [
      'Technical teams use it to automate document creation and status retrieval instead of relying on manual handoffs.',
      'Enterprise customers use integrations to make the platform part of broader onboarding, sales, and compliance journeys.',
    ],
    steps: [
      'Open API Docs to review authentication expectations, endpoint groups, workflow payloads, and example request structures.',
      'Map your external HRMS, CRM, ERP, or portal flow to the platform endpoints that create, update, or retrieve documents and workflow data.',
      'Use integration examples to understand how to push onboarding, document creation, or reporting activity into Docuside from another system.',
      'Validate your connector logic against real internal usage patterns before rolling it out to production teams.',
    ],
    examples: [
      'Example: an HRMS pushes candidate onboarding data to Docuside so the offer and BGV journey begin automatically after hiring approval.',
      'Example: a CRM triggers contract-generation workflows when a deal reaches the final negotiation stage.',
    ],
  },
];

export default function TutorialsCenter() {
  const [openId, setOpenId] = useState<string>(tutorials[0].id);

  const selected = useMemo(
    () => tutorials.find((item) => item.id === openId) || tutorials[0],
    [openId],
  );

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-white/60 bg-[linear-gradient(135deg,rgba(15,23,42,0.96)_0%,rgba(37,99,235,0.94)_100%)] p-6 text-white shadow-[0_28px_80px_rgba(15,23,42,0.16)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-100">Tutorial Center</p>
        <h1 className="mt-3 text-3xl font-semibold">Detailed walkthroughs for every major feature in Docuside.</h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-100">Use this section as the in-product operating manual. Every guide explains what the feature does, how to use it step by step, and what a real usage example looks like inside an organization.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="clay-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <BookOpen className="h-5 w-5 text-blue-600" />
              Tutorial Topics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tutorials.map((item) => {
              const isOpen = item.id === selected.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setOpenId(item.id)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition-all ${
                    isOpen
                      ? 'border-slate-900 bg-slate-950 text-white shadow-[0_18px_35px_rgba(15,23,42,0.18)]'
                      : 'border-slate-200 bg-white/75 text-slate-800 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{item.title}</p>
                      <p className={`mt-1 text-xs ${isOpen ? 'text-slate-300' : 'text-slate-500'}`}>{item.audience}</p>
                      <p className={`mt-2 line-clamp-2 text-xs leading-5 ${isOpen ? 'text-slate-200' : 'text-slate-500'}`}>{item.purpose}</p>
                    </div>
                    {isOpen ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card className="clay-panel">
          <CardHeader className="space-y-3">
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
              <Rocket className="h-3.5 w-3.5" />
              {selected.audience}
            </div>
            <CardTitle className="text-2xl">{selected.title}</CardTitle>
            <p className="text-sm text-slate-600">{selected.subtitle}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-2xl border border-blue-100 bg-blue-50/85 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-700">Why This Feature Exists</p>
              <p className="mt-3 text-sm leading-6 text-slate-700">{selected.purpose}</p>
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {selected.whyItMatters.map((item) => (
                  <div key={item} className="rounded-2xl bg-white/90 p-4 text-sm text-slate-700 shadow-[inset_4px_4px_10px_rgba(255,255,255,0.9),inset_-4px_-4px_10px_rgba(147,197,253,0.16)]">
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">How To Use</p>
              <div className="mt-3 space-y-3">
                {selected.steps.map((step, index) => (
                  <div key={`${selected.id}-step-${index}`} className="rounded-2xl bg-white/85 p-4 text-sm text-slate-700 shadow-[inset_4px_4px_10px_rgba(255,255,255,0.88),inset_-4px_-4px_10px_rgba(203,213,225,0.38)]">
                    <span className="mr-2 font-semibold text-slate-900">{index + 1}.</span>
                    {step}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Examples</p>
              <div className="mt-3 space-y-3">
                {selected.examples.map((example, index) => (
                  <div key={`${selected.id}-example-${index}`} className="rounded-2xl bg-slate-950/95 p-4 text-sm text-slate-100 shadow-[0_18px_45px_rgba(15,23,42,0.18)]">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-orange-300">
                      <Lightbulb className="h-4 w-4" />
                      Practical Example
                    </div>
                    {example}
                  </div>
                ))}
              </div>
            </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white/75 p-5 shadow-[0_18px_40px_rgba(148,163,184,0.12)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Recommended rollout order</p>
            <p className="mt-1 text-sm text-slate-600">Start with document generation, history, and signatures. Then move into onboarding, enterprise controls, and finally admin/public-site configuration.</p>
          </div>
          <Button type="button" variant="outline" onClick={() => setOpenId('document-generation')}>
            Open Core Workflow Tutorial
          </Button>
        </div>
      </div>
    </div>
  );
}
