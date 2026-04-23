import { NextResponse } from 'next/server';
import { getAuthSession, getStoredUsers } from '@/lib/server/auth';
import { buildBillingAmounts, calculateCustomPlanAmountInPaise, createRazorpayOrder, getRazorpayConfig } from '@/lib/server/billing';
import { sanitizeCustomPlanConfiguration } from '@/lib/pricing-config';
import { getSaasPlanById } from '@/lib/server/saas';

export const dynamic = 'force-dynamic';

function isMockCheckoutEnabled() {
  return process.env.ENABLE_MOCK_CHECKOUT === 'true';
}

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const planId = typeof body?.planId === 'string' ? body.planId : '';
    const customConfiguration = sanitizeCustomPlanConfiguration(body?.customConfiguration);
    if (!planId) {
      return NextResponse.json({ error: 'Plan is required' }, { status: 400 });
    }

    const [users, plan] = await Promise.all([
      getStoredUsers(),
      getSaasPlanById(planId),
    ]);
    const normalizedEmail = (session.user.email || '').trim().toLowerCase();
    const user = users.find((entry) => entry.email.trim().toLowerCase() === normalizedEmail);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!plan || !plan.active) {
      return NextResponse.json({ error: 'Plan not available' }, { status: 404 });
    }

    if (plan.billingModel !== 'subscription' && plan.billingModel !== 'payg' && plan.billingModel !== 'custom') {
      return NextResponse.json({ error: 'This plan is not available for direct Razorpay checkout.' }, { status: 400 });
    }

    const targetAudience = user.accountType === 'individual' ? 'individual' : 'business';
    const isUniversalWorkspacePlan = plan.id.startsWith('workspace-');
    if (!isUniversalWorkspacePlan && (plan.targetAudience || 'business') !== targetAudience) {
      return NextResponse.json({
        error: `This ${plan.targetAudience || 'business'} plan is not available for your ${targetAudience} account. Please choose a matching plan from pricing.`,
        expectedAccountType: targetAudience,
        planAudience: plan.targetAudience || 'business',
        pricingUrl: '/pricing',
      }, { status: 403 });
    }

    const razorpayConfig = getRazorpayConfig();
    if (!razorpayConfig.serverConfigured) {
      return NextResponse.json({
        error: 'Razorpay payment gateway is not configured. Please contact support or try again later.',
        supportUrl: '/support',
        fallbackAvailable: isMockCheckoutEnabled(),
      }, { status: 503 });
    }

    if (customConfiguration && customConfiguration.basePlanId !== plan.id) {
      return NextResponse.json({ error: 'Custom configuration does not match the selected base plan.' }, { status: 400 });
    }

    const { order, transaction } = await createRazorpayOrder(user, plan, customConfiguration);
    const pricing = buildBillingAmounts(calculateCustomPlanAmountInPaise(plan, customConfiguration));

    return NextResponse.json({
      order,
      transaction,
      keyId: razorpayConfig.keyId,
      isTestMode: razorpayConfig.isTestMode,
      plan: {
        id: plan.id,
        name: plan.name,
        amountInPaise: plan.amountInPaise,
        priceLabel: plan.priceLabel,
      },
      customConfiguration,
      customer: {
        name: user.name,
        email: user.email,
        contact: '',
      },
      pricing,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create checkout order',
        fallbackAvailable: isMockCheckoutEnabled(),
      },
      { status: 500 },
    );
  }
}
