import { NextRequest, NextResponse } from 'next/server';
import { getStoredUsers, saveStoredUsers } from '@/lib/server/auth';
import { createPasswordHash, isValidEmail, normalizeEmail } from '@/lib/server/security';
import { applyRoadmapPromotionToSubscription, getDefaultPublicPlan } from '@/lib/server/saas';
import { buildPolicyAcceptance } from '@/lib/policy-consent';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json() as {
      name?: string;
      email?: string;
      password?: string;
      profession?: string;
      primaryUseCase?: string;
      policyAccepted?: boolean;
    };

    if (!payload.name?.trim() || !isValidEmail(payload.email || '') || !payload.password || payload.password.length < 8) {
      return NextResponse.json({ error: 'Name, valid email, and password with at least 8 characters are required.' }, { status: 400 });
    }

    if (!payload.policyAccepted) {
      return NextResponse.json({ error: 'You must accept the required policies before creating a profile.' }, { status: 400 });
    }

    const users = await getStoredUsers();
    const normalizedEmail = normalizeEmail(payload.email || '');
    if (users.some((user) => user.email === normalizedEmail)) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }

    const selectedPlan = await getDefaultPublicPlan('business');

    const now = new Date().toISOString();
    const userId = `individual-${Date.now()}`;
    const newUser = {
      id: userId,
      name: payload.name.trim(),
      email: normalizedEmail,
      role: 'individual' as const,
      accountType: 'individual' as const,
      permissions: ['self'],
      isActive: true,
      createdAt: now,
      organizationName: payload.profession?.trim() || 'Individual Workspace',
      createdFromSignup: true,
      policyAcceptance: buildPolicyAcceptance('individual_signup', request.headers.get('x-forwarded-for') || undefined),
      subscription: applyRoadmapPromotionToSubscription({
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        status: 'trial' as const,
        startedAt: now,
        aiTrialLimit: selectedPlan.freeAiRuns || 0,
        aiTrialUsed: 0,
        monthlyAiCredits: selectedPlan.monthlyAiCredits || 0,
        remainingAiCredits: selectedPlan.monthlyAiCredits || 0,
        aiCreditsResetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }, now),
      ...createPasswordHash(payload.password),
    };

    users.push(newUser);
    await saveStoredUsers(users);

    return NextResponse.json({
      success: true,
      email: normalizedEmail,
      planName: selectedPlan.name,
      message: 'Your docrud workspace trial is ready. Non-AI features open immediately after login, and a few AI tries are included to help you get started smoothly.',
    }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create individual profile' }, { status: 500 });
  }
}
