import { NextRequest, NextResponse } from 'next/server';
import { getStoredUsers, saveStoredUsers } from '@/lib/server/auth';
import { createPasswordHash, isValidEmail, normalizeEmail } from '@/lib/server/security';
import { getDefaultPublicPlan } from '@/lib/server/saas';
import { saveBusinessSettings, seedStarterTemplatesForBusiness } from '@/lib/server/business';
import { BusinessSettings } from '@/types/document';

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
    };

    if (!payload.name?.trim() || !payload.organizationName?.trim() || !isValidEmail(payload.email || '') || !payload.password || payload.password.length < 8) {
      return NextResponse.json({ error: 'Name, organization, valid email, and password with at least 8 characters are required' }, { status: 400 });
    }

    const users = await getStoredUsers();
    const normalizedEmail = normalizeEmail(payload.email || '');
    if (users.some((user) => user.email === normalizedEmail)) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }

    const defaultPlan = await getDefaultPublicPlan();
    const now = new Date().toISOString();
    const userId = `user-${Date.now()}`;
    const organizationName = payload.organizationName.trim();
    const newUser = {
      id: userId,
      name: payload.name.trim(),
      email: normalizedEmail,
      role: 'client',
      permissions: ['all'],
      isActive: true,
      createdAt: now,
      organizationId: userId,
      organizationName,
      organizationDomain: payload.organizationDomain?.trim() || undefined,
      createdFromSignup: true,
      subscription: defaultPlan ? {
        planId: defaultPlan.id,
        planName: defaultPlan.name,
        status: 'trial' as const,
        startedAt: now,
      } : undefined,
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
      watermarkLabel: 'docrud trial workspace',
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
      message: 'Business workspace created successfully. Your industry-ready dashboard and starter templates are ready after login.',
    }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create business profile' }, { status: 500 });
  }
}
