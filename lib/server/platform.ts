import { ExpiryRule, IntegrationConfig, OrganizationProfile, PlatformConfig, WorkflowTemplateRecord, ClauseLibraryItem } from '@/types/document';
import { platformConfigPath, readJsonFile, writeJsonFile } from '@/lib/server/storage';

export const defaultPlatformConfig: PlatformConfig = {
  workflows: [
    {
      id: 'wf-hr-onboarding',
      name: 'HR Onboarding Approval',
      department: 'HR',
      isActive: true,
      steps: [
        { id: 'wf-hr-onboarding-step-1', label: 'HR Review', ownerRole: 'hr', slaHours: 12 },
        { id: 'wf-hr-onboarding-step-2', label: 'Legal Validation', ownerRole: 'legal', slaHours: 24 },
        { id: 'wf-hr-onboarding-step-3', label: 'Admin Signoff', ownerRole: 'admin', slaHours: 8 },
      ],
    },
  ],
  clauses: [
    {
      id: 'clause-confidentiality',
      title: 'Confidentiality',
      category: 'Legal',
      body: 'Confidential information must not be disclosed to any unauthorized party.',
      tags: ['legal', 'nda', 'compliance'],
    },
  ],
  integrations: [
    {
      id: 'integration-webhook-audit',
      name: 'Audit Webhook',
      type: 'webhook',
      endpoint: 'https://example.com/webhooks/audit',
      status: 'paused',
    },
  ],
  organizations: [
    {
      id: 'org-corescent',
      name: 'Corescent Technologies',
      domain: 'company.com',
      brandColor: '#ea580c',
      logoUrl: '/corescent-logo.png',
    },
  ],
  expiryRules: [
    {
      id: 'expiry-30-day-warning',
      name: '30 Day Renewal Reminder',
      daysBefore: 30,
      actionLabel: 'Send renewal reminder',
    },
  ],
  folderLibrary: ['Contracts', 'HR Records', 'Client Agreements', 'Policies'],
};

function normalizeWorkflow(workflow: WorkflowTemplateRecord): WorkflowTemplateRecord {
  return {
    ...workflow,
    id: String(workflow.id || `wf-${Date.now()}`),
    name: String(workflow.name || 'Untitled Workflow'),
    department: String(workflow.department || 'General'),
    isActive: workflow.isActive !== false,
    steps: Array.isArray(workflow.steps)
      ? workflow.steps.map((step, index) => ({
          id: String(step.id || `step-${Date.now()}-${index}`),
          label: String(step.label || `Step ${index + 1}`),
          ownerRole: String(step.ownerRole || 'user'),
          slaHours: typeof step.slaHours === 'number' ? step.slaHours : undefined,
        }))
      : [],
  };
}

function normalizeClause(clause: ClauseLibraryItem): ClauseLibraryItem {
  return {
    ...clause,
    id: String(clause.id || `clause-${Date.now()}`),
    title: String(clause.title || 'Untitled Clause'),
    category: String(clause.category || 'General'),
    body: String(clause.body || ''),
    tags: Array.isArray(clause.tags) ? clause.tags.map(String).filter(Boolean) : [],
  };
}

function normalizeIntegration(integration: IntegrationConfig): IntegrationConfig {
  return {
    ...integration,
    id: String(integration.id || `integration-${Date.now()}`),
    name: String(integration.name || 'Untitled Integration'),
    type: integration.type || 'webhook',
    endpoint: String(integration.endpoint || ''),
    status: integration.status === 'active' ? 'active' : 'paused',
  };
}

function normalizeOrganization(organization: OrganizationProfile): OrganizationProfile {
  return {
    ...organization,
    id: String(organization.id || `org-${Date.now()}`),
    name: String(organization.name || 'Untitled Organization'),
    domain: organization.domain ? String(organization.domain) : undefined,
    brandColor: organization.brandColor ? String(organization.brandColor) : undefined,
    logoUrl: organization.logoUrl ? String(organization.logoUrl) : undefined,
  };
}

function normalizeExpiryRule(rule: ExpiryRule): ExpiryRule {
  return {
    ...rule,
    id: String(rule.id || `expiry-${Date.now()}`),
    name: String(rule.name || 'Untitled Expiry Rule'),
    daysBefore: Number(rule.daysBefore || 0),
    actionLabel: String(rule.actionLabel || 'Notify owner'),
  };
}

export function normalizePlatformConfig(config: PlatformConfig): PlatformConfig {
  return {
    workflows: Array.isArray(config.workflows) ? config.workflows.map(normalizeWorkflow) : [],
    clauses: Array.isArray(config.clauses) ? config.clauses.map(normalizeClause) : [],
    integrations: Array.isArray(config.integrations) ? config.integrations.map(normalizeIntegration) : [],
    organizations: Array.isArray(config.organizations) ? config.organizations.map(normalizeOrganization) : [],
    expiryRules: Array.isArray(config.expiryRules) ? config.expiryRules.map(normalizeExpiryRule) : [],
    folderLibrary: Array.isArray(config.folderLibrary) ? Array.from(new Set(config.folderLibrary.map(String).filter(Boolean))) : [],
  };
}

export async function getPlatformConfig() {
  const config = await readJsonFile<PlatformConfig>(platformConfigPath, defaultPlatformConfig);
  return normalizePlatformConfig(config);
}

export async function savePlatformConfig(config: PlatformConfig) {
  await writeJsonFile(platformConfigPath, normalizePlatformConfig(config));
}
