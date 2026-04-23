import { NextRequest, NextResponse } from 'next/server';
import { getStoredUsers, saveStoredUsers } from '@/lib/server/auth';
import { createPasswordHash, isValidEmail, normalizeEmail } from '@/lib/server/security';
import { applyRoadmapPromotionToSubscription, getDefaultPublicPlan } from '@/lib/server/saas';
import { saveBusinessSettings, seedStarterTemplatesForBusiness } from '@/lib/server/business';
import { BusinessSettings } from '@/types/document';
import { buildPolicyAcceptance } from '@/lib/policy-consent';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json() as {
      name?: string;
      email?: string;
      password?: string;
      organizationName?: string;
      organizationDomain?: string;
      industry?: string;
      companySize?: string;
      primaryUseCase?: string;
      workspacePreset?: string;
      policyAccepted?: boolean;
    };

    if (!payload.name?.trim() || !payload.organizationName?.trim() || !isValidEmail(payload.email || '') || !payload.password || payload.password.length < 8) {
      return NextResponse.json({ error: 'Name, organization, valid email, and password with at least 8 characters are required' }, { status: 400 });
    }

    if (!payload.policyAccepted) {
      return NextResponse.json({ error: 'You must accept the required policies before creating a workspace.' }, { status: 400 });
    }

    const users = await getStoredUsers();
    const normalizedEmail = normalizeEmail(payload.email || '');
    if (users.some((user) => user.email === normalizedEmail)) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }

    const defaultPlan = await getDefaultPublicPlan('business');
    const now = new Date().toISOString();
    const userId = `user-${Date.now()}`;
    const organizationName = payload.organizationName.trim();
    const newUser = {
      id: userId,
      name: payload.name.trim(),
      email: normalizedEmail,
      role: 'client',
      accountType: 'business' as const,
      permissions: ['all'],
      isActive: true,
      createdAt: now,
      organizationId: userId,
      organizationName,
      organizationDomain: payload.organizationDomain?.trim() || undefined,
      createdFromSignup: true,
      policyAcceptance: buildPolicyAcceptance('business_signup', request.headers.get('x-forwarded-for') || undefined),
      subscription: defaultPlan ? applyRoadmapPromotionToSubscription({
        planId: defaultPlan.id,
        planName: defaultPlan.name,
        status: 'trial' as const,
        startedAt: now,
        aiTrialLimit: defaultPlan.freeAiRuns || 0,
        aiTrialUsed: 0,
        monthlyAiCredits: defaultPlan.monthlyAiCredits || 0,
        remainingAiCredits: defaultPlan.monthlyAiCredits || 0,
        aiCreditsResetAt: defaultPlan.billingModel === 'free' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : undefined,
      }, now) : undefined,
      ...createPasswordHash(payload.password),
    };

    users.push(newUser);
    await saveStoredUsers(users);

    const businessSettings: BusinessSettings = {
      organizationId: userId,
      organizationName,
      displayName: organizationName,
      industry: payload.industry?.trim() || 'technology',
      companySize: payload.companySize?.trim() || '1-25',
      primaryUseCase: payload.primaryUseCase?.trim() || '',
      workspacePreset: payload.workspacePreset?.trim() || 'executive_control',
      onboardingCompleted: true,
      onboardingCompletedAt: now,
      starterTemplatesSeededAt: now,
      supportEmail: normalizedEmail,
      supportPhone: '',
      accentColor: '#2719FF',
      watermarkLabel: 'docrud workspace',
      letterheadMode: 'default',
      letterheadImageDataUrl: '',
      letterheadHtml: '',
      businessDescription: payload.primaryUseCase?.trim() || '',
      workspaceSetupChecklist: {
        profileConfigured: true,
        brandingConfigured: true,
        starterTemplatesReady: true,
        signaturesReady: false,
        firstDocumentGenerated: false,
      },
      updatedAt: now,
    };
    await saveBusinessSettings(businessSettings);
    await seedStarterTemplatesForBusiness(businessSettings);

    return NextResponse.json({
      success: true,
      email: normalizedEmail,
      planName: defaultPlan?.name,
      message: 'docrud workspace created successfully. Your trial is active, non-AI features are ready immediately, and a few AI tries are waiting once you log in.',
    }, { status: 201 });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Failed to create business profile';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
