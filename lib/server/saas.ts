import { getHistoryEntries } from '@/lib/server/history';
import { getStoredUsers, saveStoredUsers } from '@/lib/server/auth';
import { readJsonFile, saasPlansPath, writeJsonFile } from '@/lib/server/storage';
import { SaasFeatureKey, SaasOverview, SaasPlan, SaasUsageSummary, User } from '@/types/document';
import { getAllBusinessSettings } from '@/lib/server/business';

const coreFeatures: SaasFeatureKey[] = [
  'dashboard',
  'document_summary',
  'generate_documents',
  'history',
  'client_portal',
  'tutorials',
];

export const defaultSaasPlans: SaasPlan[] = [
  {
    id: 'free-starter',
    name: 'Free Starter',
    description: 'Best for businesses trying Docuside with controlled self-serve generation and Docuside watermarking.',
    priceLabel: 'Free',
    billingModel: 'free',
    includedFeatures: coreFeatures,
    freeDocumentGenerations: 5,
    maxDocumentGenerations: 5,
    overagePriceLabel: 'Upgrade required after 5 documents',
    watermarkOnFreeGenerations: true,
    isPublic: true,
    isDefault: true,
    active: true,
    ctaLabel: 'Start Free',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'growth',
    name: 'Growth',
    description: 'For growing businesses that need more generation capacity, analytics visibility, and platform-level access.',
    priceLabel: 'INR 19,999 / org',
    billingModel: 'subscription',
    includedFeatures: [...coreFeatures, 'analytics', 'api_docs', 'branding'],
    freeDocumentGenerations: 5,
    maxDocumentGenerations: 50,
    overagePriceLabel: 'Custom billed above plan limit',
    watermarkOnFreeGenerations: false,
    isPublic: true,
    isDefault: false,
    active: true,
    ctaLabel: 'Choose Growth',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'scale',
    name: 'Scale',
    description: 'For businesses that want deeper controls, integrations, and higher document volumes.',
    priceLabel: 'Custom pricing',
    billingModel: 'custom',
    includedFeatures: [...coreFeatures, 'analytics', 'api_docs', 'branding', 'integrations', 'organizations'],
    freeDocumentGenerations: 5,
    maxDocumentGenerations: 250,
    overagePriceLabel: 'Enterprise commercial agreement',
    watermarkOnFreeGenerations: false,
    isPublic: true,
    isDefault: false,
    active: true,
    ctaLabel: 'Talk to Sales',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

export const saasFeatureCatalog: Array<{ key: SaasFeatureKey; label: string }> = [
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

export async function getSaasPlans() {
  const plans = await readJsonFile<SaasPlan[]>(saasPlansPath, defaultSaasPlans);
  return plans;
}

export async function saveSaasPlans(plans: SaasPlan[]) {
  await writeJsonFile(saasPlansPath, plans);
}

export async function getPublicSaasPlans() {
  const plans = await getSaasPlans();
  return plans.filter((plan) => plan.isPublic && plan.active);
}

export async function getDefaultPublicPlan() {
  const plans = await getSaasPlans();
  return plans.find((plan) => plan.isDefault && plan.active) || plans[0];
}

export async function getSaasPlanById(planId?: string) {
  const plans = await getSaasPlans();
  return plans.find((plan) => plan.id === planId) || null;
}

export async function assignUserPlan(userId: string, planId: string, status: 'trial' | 'active' | 'upgrade_required' | 'suspended' = 'active') {
  const [users, plan] = await Promise.all([getStoredUsers(), getSaasPlanById(planId)]);
  if (!plan) {
    throw new Error('Plan not found');
  }

  const nextUsers = users.map((user) =>
    user.id === userId
      ? {
          ...user,
          subscription: {
            planId: plan.id,
            planName: plan.name,
            status,
            startedAt: user.subscription?.startedAt || new Date().toISOString(),
            renewalDate: user.subscription?.renewalDate,
          },
        }
      : user,
  );
  await saveStoredUsers(nextUsers);
  return nextUsers.find((user) => user.id === userId) || null;
}

export async function getUserUsageSummary(user: User, preloadedHistory?: Awaited<ReturnType<typeof getHistoryEntries>>) {
  const history = preloadedHistory || await getHistoryEntries();
  const plan = await getSaasPlanById(user.subscription?.planId);
  const generatedDocuments = history.filter((entry) => (
    entry.generatedBy?.toLowerCase() === user.email.toLowerCase()
    || entry.clientEmail?.toLowerCase() === user.email.toLowerCase()
  )).length;
  const planFreeLimit = plan?.freeDocumentGenerations ?? 5;
  const planMaxLimit = plan?.maxDocumentGenerations ?? planFreeLimit;

  const usage: SaasUsageSummary = {
    totalGeneratedDocuments: generatedDocuments,
    freeGeneratedDocuments: Math.min(generatedDocuments, planFreeLimit),
    remainingGenerations: Math.max(planMaxLimit - generatedDocuments, 0),
    limitReached: generatedDocuments >= planMaxLimit,
  };

  return {
    plan,
    usage,
  };
}

export async function canUserAccessFeature(user: User, feature: SaasFeatureKey) {
  if (user.role === 'admin' || user.role === 'hr' || user.role === 'legal' || user.role === 'employee') {
    return true;
  }

  const plan = await getSaasPlanById(user.subscription?.planId);
  const features = new Set(plan?.includedFeatures || coreFeatures);
  return features.has(feature);
}

export async function getSaasOverview(): Promise<SaasOverview> {
  const [plans, users, history, businessSettings] = await Promise.all([getSaasPlans(), getStoredUsers(), getHistoryEntries(), getAllBusinessSettings()]);
  const businessUsers = users.filter((user) => user.role === 'client');
  const businessSettingsMap = new Map(businessSettings.map((entry) => [entry.organizationId, entry]));

  const businessUsage = await Promise.all(
    businessUsers.map(async (user) => {
      const { plan, usage } = await getUserUsageSummary(user, history);
      const settings = businessSettingsMap.get(user.id);
      const checklistValues = Object.values(settings?.workspaceSetupChecklist || {});
      const setupReadinessScore = checklistValues.length === 0 ? 0 : Math.round((checklistValues.filter(Boolean).length / checklistValues.length) * 100);
      return {
        userId: user.id,
        name: user.name,
        email: user.email,
        organizationName: user.organizationName,
        industry: settings?.industry,
        companySize: settings?.companySize,
        workspacePreset: settings?.workspacePreset,
        onboardingCompleted: settings?.onboardingCompleted,
        setupReadinessScore,
        planId: plan?.id || user.subscription?.planId,
        planName: plan?.name || user.subscription?.planName,
        status: user.subscription?.status,
        generatedDocuments: usage.totalGeneratedDocuments,
        remainingGenerations: usage.remainingGenerations,
      };
    }),
  );

  const industryDistributionMap = new Map<string, number>();
  const workspacePresetDistributionMap = new Map<string, number>();
  businessUsers.forEach((user) => {
    const settings = businessSettingsMap.get(user.id);
    const industryLabel = settings?.industry || 'unclassified';
    const workspacePreset = settings?.workspacePreset || 'unset';
    industryDistributionMap.set(industryLabel, (industryDistributionMap.get(industryLabel) || 0) + 1);
    workspacePresetDistributionMap.set(workspacePreset, (workspacePresetDistributionMap.get(workspacePreset) || 0) + 1);
  });

  const onboardingCompletedAccounts = businessUsers.filter((user) => businessSettingsMap.get(user.id)?.onboardingCompleted).length;
  const onboardingInProgressAccounts = businessUsers.length - onboardingCompletedAccounts;
  const setupReadyAccounts = businessUsers.filter((user) => {
    const checklist = businessSettingsMap.get(user.id)?.workspaceSetupChecklist;
    return checklist && Object.values(checklist).every(Boolean);
  }).length;

  return {
    plans,
    totalBusinessAccounts: businessUsers.length,
    activeBusinessAccounts: businessUsers.filter((user) => user.subscription?.status === 'active' || user.subscription?.status === 'trial').length,
    upgradeRequiredAccounts: businessUsers.filter((user) => user.subscription?.status === 'upgrade_required').length,
    totalGeneratedDocuments: history.length,
    onboardingCompletedAccounts,
    onboardingInProgressAccounts,
    onboardingCompletionRate: businessUsers.length === 0 ? 0 : Math.round((onboardingCompletedAccounts / businessUsers.length) * 100),
    setupReadyAccounts,
    planDistribution: plans.map((plan) => ({
      planId: plan.id,
      planName: plan.name,
      businesses: businessUsers.filter((user) => user.subscription?.planId === plan.id).length,
    })),
    industryDistribution: Array.from(industryDistributionMap.entries()).map(([industry, businesses]) => ({ industry, businesses })),
    workspacePresetDistribution: Array.from(workspacePresetDistributionMap.entries()).map(([preset, businesses]) => ({ preset, businesses })),
    recentSignups: [...businessUsers]
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, 6)
      .map((user) => {
        const settings = businessSettingsMap.get(user.id);
        return {
          userId: user.id,
          organizationName: user.organizationName,
          email: user.email,
          industry: settings?.industry,
          workspacePreset: settings?.workspacePreset,
          createdAt: user.createdAt,
        };
      }),
    businessUsage,
  };
}
