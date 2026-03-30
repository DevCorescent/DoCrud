import { CollaborationSettings, LandingSettings, MailSettings, SignatureSettings, ThemeSettings, WorkflowAutomationSettings } from '@/types/document';
import { automationSettingsPath, collaborationSettingsPath, landingSettingsPath, mailSettingsPath, readJsonFile, signatureSettingsPath, themeSettingsPath, writeJsonFile } from '@/lib/server/storage';

export const defaultMailSettings: MailSettings = {
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

export const defaultAutomationSettings: WorkflowAutomationSettings = {
  autoGenerateReferenceNumber: true,
  autoStampGeneratedBy: true,
  autoBccAuditMailbox: false,
  auditMailbox: '',
  autoCcGenerator: false,
  enableDeliveryTracking: true,
};

export const defaultSignatureSettings: SignatureSettings = {
  signatures: [],
};

export const defaultCollaborationSettings: CollaborationSettings = {
  defaultRecipientAccess: 'comment',
};

export const defaultThemeSettings: ThemeSettings = {
  activeTheme: 'ember',
  softwareName: 'docrud',
  accentLabel: 'Premium Document Operations',
};

export const defaultLandingSettings: LandingSettings = {
  heroBadge: 'Apple-grade clarity for enterprise paperwork',
  heroTitle: 'The sleekest way to run document operations across teams, approvals, and clients',
  heroSubtitle: 'docrud brings together document generation, approval routing, client collaboration, file governance, and premium white-label workflows in one polished control layer.',
  primaryCtaLabel: 'Book a Demo',
  primaryCtaHref: '#contact-us',
  secondaryCtaLabel: 'Open Login',
  secondaryCtaHref: '/login',
  socialProofLabel: 'Built for founders, HR leaders, legal teams, and client-facing operations',
  socialProofItems: ['Approvals', 'Client Portals', 'Audit Trails', 'Custom Workflows'],
  featureSectionTitle: 'What makes docrud premium',
  softwareModulesTitle: 'Everything your teams need in one document operating system',
  softwareModulesSubtitle: 'Each capability is built to work together so super admins, internal teams, and clients all move through the same clean lifecycle.',
  pricingSectionTitle: 'One-time purchase plans',
  pricingSectionSubtitle: 'All plans include customization support, implementation guidance, and a rollout structure tailored to your organization.',
  pricingPageTitle: 'Choose the one-time purchase model that fits your rollout',
  pricingPageSubtitle: 'From focused team deployments to organization-wide digital operations, every plan supports custom workflows, branding, and guided implementation.',
  contactEmail: 'sales@corescent.com',
  contactPhone: '+91 98765 43210',
  contactHeading: 'Talk to our team about your rollout',
  contactSubtitle: 'Share your document workflows, approval complexity, client portal needs, and branding expectations. We will shape the right one-time purchase and customization scope.',
  contactPageTitle: 'Speak with docrud',
  contactPageSubtitle: 'Tell us where your document process slows down today. We will help you scope the right setup, customization path, and purchase plan.',
  demoPageTitle: 'Schedule a tailored docrud demo',
  demoPageSubtitle: 'Walk through the platform with your workflows, teams, and approval structure in mind so the demo feels like your future system, not a generic showcase.',
  demoBenefits: [
    'See document ops, approvals, file governance, and client flows together',
    'Review the exact modules relevant to HR, legal, admin, or leadership teams',
    'Discuss customization, migration, branding, and rollout planning live',
  ],
  screenshotsSectionTitle: 'See the software in action',
  screenshotsSectionSubtitle: 'Real product views help buyers understand the depth of the workspace before they book a call. Showcase the parts of docrud that matter most to your rollout.',
  featureHighlights: [
    'Role-based document generation, review, approval, and audit visibility',
    'Client-ready portal experience with controlled access and tracked activity',
    'One-time purchase plans with full customization and white-label rollout support',
  ],
  featureCards: [
    {
      id: 'feature-governed',
      title: 'Calm, governed workflows',
      description: 'Replace cluttered document handling with elegant approvals, tracked reviews, and neatly structured operations.',
    },
    {
      id: 'feature-client',
      title: 'Premium client experiences',
      description: 'Give clients a clean portal with role-aware access, shared documents, file requests, and clear workflow visibility.',
    },
    {
      id: 'feature-custom',
      title: 'Tailored for your business',
      description: 'Customize branding, roles, permissions, templates, integrations, and lifecycle flows without rebuilding your entire stack.',
    },
  ],
  stats: [
    { id: 'stat-1', value: '10x', label: 'faster document turnaround' },
    { id: 'stat-2', value: '100%', label: 'customizable purchase model' },
    { id: 'stat-3', value: '1', label: 'workspace for teams and clients' },
  ],
  softwareModules: [
    {
      id: 'module-doc-ops',
      title: 'Document Ops and advanced editing',
      description: 'Create, manage, revise, and govern documents with structured fields, direct content editing, metadata, and workflow-aware controls.',
      capabilities: ['Template-based generation', 'Advanced document editing', 'Version snapshots', 'Folder and file management'],
    },
    {
      id: 'module-governance',
      title: 'Roles, permissions, and approvals',
      description: 'Control who can access what, route documents through approval chains, and keep governance visible across every stage.',
      capabilities: ['Role creation', 'Permission mapping', 'Approval workflows', 'Audit-ready access history'],
    },
    {
      id: 'module-collaboration',
      title: 'Client portals and collaboration',
      description: 'Share relevant documents with clients, collect requirements, enable signatures, and track progress inside a clean portal.',
      capabilities: ['Client login', 'Shared document visibility', 'Requirements collection', 'Comments and signatures'],
    },
    {
      id: 'module-ops',
      title: 'Enterprise operations and intelligence',
      description: 'Run renewals, analytics, integrations, API connectivity, and guided admin operations from the same control surface.',
      capabilities: ['Renewal rules', 'Analytics views', 'API docs', 'Integration controls'],
    },
  ],
  featureScreenshots: [
    {
      id: 'shot-dashboard',
      title: 'Dashboard overview',
      description: 'A unified command layer for monitoring activity, workflows, and operational visibility.',
      imagePath: '/screenshots/dashboard-overview.png',
    },
    {
      id: 'shot-doc-ops',
      title: 'Document Ops workspace',
      description: 'Advanced editing, metadata controls, structured content handling, and enterprise document management.',
      imagePath: '/screenshots/document-ops.png',
    },
    {
      id: 'shot-files',
      title: 'File Manager',
      description: 'Centralized document repositories, supporting files, and managed content across the workspace.',
      imagePath: '/screenshots/file-manager.png',
    },
    {
      id: 'shot-roles',
      title: 'Roles and permissions',
      description: 'Govern access, responsibilities, and workflow authority with admin-grade control.',
      imagePath: '/screenshots/roles-permissions.png',
    },
  ],
  pricingPlans: [
    {
      id: 'launch',
      name: 'Launch',
      priceLabel: 'INR 1,49,000 one-time',
      description: 'Best for one business unit getting started with document automation.',
      highlights: ['Up to 10 internal users', 'Core workflows and templates', 'Branding and role setup', 'Go-live assistance'],
    },
    {
      id: 'growth',
      name: 'Growth',
      priceLabel: 'INR 3,49,000 one-time',
      description: 'For growing organizations that need multi-team automation and stronger governance.',
      highlights: ['Up to 50 users', 'Advanced approval flows', 'Client portal and audit center', 'Custom integrations and onboarding'],
    },
    {
      id: 'enterprise',
      name: 'Enterprise Custom',
      priceLabel: 'Custom one-time pricing',
      description: 'Built for large organizations needing tailored governance, data structures, and rollout support.',
      highlights: ['Unlimited workflows', 'Deep customizations', 'White-label experience', 'Priority implementation and support'],
    },
  ],
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

export async function getMailSettings() {
  const settings = await readJsonFile<Partial<MailSettings>>(mailSettingsPath, defaultMailSettings);
  return { ...defaultMailSettings, ...settings };
}

export async function saveMailSettings(settings: MailSettings) {
  await writeJsonFile(mailSettingsPath, settings);
}

export async function getAutomationSettings() {
  const settings = await readJsonFile<Partial<WorkflowAutomationSettings>>(automationSettingsPath, defaultAutomationSettings);
  return { ...defaultAutomationSettings, ...settings };
}

export async function saveAutomationSettings(settings: WorkflowAutomationSettings) {
  await writeJsonFile(automationSettingsPath, settings);
}

export async function getSignatureSettings() {
  const settings = await readJsonFile<Partial<SignatureSettings>>(signatureSettingsPath, defaultSignatureSettings);
  return { ...defaultSignatureSettings, ...settings };
}

export async function saveSignatureSettings(settings: SignatureSettings) {
  await writeJsonFile(signatureSettingsPath, settings);
}

export async function getCollaborationSettings() {
  const settings = await readJsonFile<Partial<CollaborationSettings>>(collaborationSettingsPath, defaultCollaborationSettings);
  return { ...defaultCollaborationSettings, ...settings };
}

export async function saveCollaborationSettings(settings: CollaborationSettings) {
  await writeJsonFile(collaborationSettingsPath, settings);
}

export async function getThemeSettings() {
  const settings = await readJsonFile<Partial<ThemeSettings>>(themeSettingsPath, defaultThemeSettings);
  return {
    ...defaultThemeSettings,
    ...settings,
    softwareName: !settings.softwareName || settings.softwareName === 'Corescent Document Generator' ? defaultThemeSettings.softwareName : settings.softwareName,
    accentLabel: !settings.accentLabel || settings.accentLabel === 'Enterprise Workflow Suite' ? defaultThemeSettings.accentLabel : settings.accentLabel,
  };
}

export async function saveThemeSettings(settings: ThemeSettings) {
  await writeJsonFile(themeSettingsPath, settings);
}

export async function getLandingSettings() {
  const settings = await readJsonFile<Partial<LandingSettings>>(landingSettingsPath, defaultLandingSettings);
  return {
    ...defaultLandingSettings,
    ...settings,
    featureHighlights: Array.isArray(settings.featureHighlights) && settings.featureHighlights.length ? settings.featureHighlights : defaultLandingSettings.featureHighlights,
    demoBenefits: Array.isArray(settings.demoBenefits) && settings.demoBenefits.length ? settings.demoBenefits : defaultLandingSettings.demoBenefits,
    socialProofItems: Array.isArray(settings.socialProofItems) && settings.socialProofItems.length ? settings.socialProofItems : defaultLandingSettings.socialProofItems,
    featureCards: Array.isArray(settings.featureCards) && settings.featureCards.length ? settings.featureCards : defaultLandingSettings.featureCards,
    stats: Array.isArray(settings.stats) && settings.stats.length ? settings.stats : defaultLandingSettings.stats,
    softwareModules: Array.isArray(settings.softwareModules) && settings.softwareModules.length ? settings.softwareModules : defaultLandingSettings.softwareModules,
    featureScreenshots: Array.isArray(settings.featureScreenshots) && settings.featureScreenshots.length ? settings.featureScreenshots : defaultLandingSettings.featureScreenshots,
    pricingPlans: Array.isArray(settings.pricingPlans) && settings.pricingPlans.length ? settings.pricingPlans : defaultLandingSettings.pricingPlans,
    enabledSections: {
      ...defaultLandingSettings.enabledSections,
      ...(settings.enabledSections || {}),
    },
  };
}

export async function saveLandingSettings(settings: LandingSettings) {
  await writeJsonFile(landingSettingsPath, settings);
}
