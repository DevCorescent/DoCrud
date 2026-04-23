import crypto from 'crypto';
import { getStoredUsers, saveStoredUsers } from '@/lib/server/auth';
import { applyRoadmapPromotionToSubscription, getEffectiveSaasPlanForUser, getPublicSaasPlansByAudience, getRoadmapPromotionSnapshot, getSaasPlanById, getUserUsageSummary } from '@/lib/server/saas';
import { billingTransactionsPath, readJsonFile, writeJsonFile } from '@/lib/server/storage';
import { BillingOverview, BillingTransaction, CustomPlanConfiguration, SaasPlan, SaasFeatureKey, User } from '@/types/document';

const DEFAULT_CURRENCY = 'INR';
export const GST_RATE = 0.18;
const CUSTOM_TEAM_SEAT_PRICE_IN_PAISE = 900;
const CUSTOM_MAILBOX_BLOCK_PRICE_IN_PAISE = 300;

const CUSTOM_FEATURE_PRICE_IN_PAISE: Partial<Record<SaasFeatureKey, number>> = {
  doxpert: 9900,
  analytics: 8900,
  file_manager: 4900,
  approvals: 6900,
  audit: 5900,
  branding: 3900,
  document_encrypter: 5900,
  docrudians: 1900,
  virtual_id: 2900,
  e_certificates: 3900,
  integrations: 9900,
  roles_permissions: 4900,
  ai_copilot: 7900,
  history: 1500,
};

function sanitizeReceiptSegment(value: string, limit: number) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, limit);
}

function truncateRazorpayNote(value: string, limit = 200) {
  return value.length > limit ? value.slice(0, limit) : value;
}

export function buildRazorpayReceipt(userId: string, planId: string) {
  const userSegment = sanitizeReceiptSegment(userId, 8) || 'user';
  const planSegment = sanitizeReceiptSegment(planId, 8) || 'plan';
  const timeSegment = Date.now().toString(36).slice(-8);
  const randomSegment = crypto.randomBytes(2).toString('hex');
  const receipt = `dcr_${userSegment}_${planSegment}_${timeSegment}_${randomSegment}`;
  return receipt.slice(0, 40);
}

function parseAmountFromPriceLabel(priceLabel?: string) {
  if (!priceLabel) {
    return 0;
  }

  const normalized = priceLabel.replace(/,/g, '');
  const match = normalized.match(/₹\s*([\d.]+)/);
  if (!match) {
    return 0;
  }

  const amount = Number(match[1]);
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

export function parseOveragePriceLabel(overagePriceLabel?: string) {
  const match = overagePriceLabel?.replace(/,/g, '').match(/₹\s?(\d+(?:\.\d+)?)/i);
  if (!match) return 0;
  return Math.round(Number(match[1]) * 100);
}

export function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
  const isTestMode = keyId.startsWith('rzp_test_') || Boolean(process.env.RAZORPAY_TEST_MODE === 'true');

  return {
    keyId,
    keySecret,
    isTestMode,
    publishableKeyAvailable: Boolean(keyId),
    serverConfigured: Boolean(keyId && keySecret),
  };
}

export function getPlanAmountInPaise(plan: SaasPlan) {
  return plan.amountInPaise ?? parseAmountFromPriceLabel(plan.priceLabel);
}

export function calculateCustomPlanAmountInPaise(plan: SaasPlan, customConfiguration?: CustomPlanConfiguration | null) {
  const baseAmountInPaise = getPlanAmountInPaise(plan);
  if (!customConfiguration) {
    return baseAmountInPaise;
  }

  const selectedFeatures = Array.from(new Set(customConfiguration.featureKeys || []));
  const addOnFeatureTotal = selectedFeatures
    .filter((feature) => !plan.includedFeatures.includes(feature))
    .reduce((sum, feature) => sum + (CUSTOM_FEATURE_PRICE_IN_PAISE[feature] || 0), 0);

  const extraDocs = Math.max((customConfiguration.maxDocumentGenerations || 0) - (plan.maxDocumentGenerations || 0), 0);
  const extraUsers = Math.max((customConfiguration.maxInternalUsers || 0) - (plan.maxInternalUsers || 0), 0);
  const extraMailboxThreads = Math.max((customConfiguration.maxMailboxThreads || 0) - (plan.maxMailboxThreads || 0), 0);
  const extraAiCredits = Math.max((customConfiguration.monthlyAiCredits || 0) - (plan.monthlyAiCredits || 0), 0);

  const documentOveragePriceInPaise = parseOveragePriceLabel(plan.overagePriceLabel);
  const documentCapacityTotal = extraDocs * documentOveragePriceInPaise;
  const seatTotal = extraUsers * CUSTOM_TEAM_SEAT_PRICE_IN_PAISE;
  const mailboxBlocks = Math.ceil(extraMailboxThreads / 100);
  const mailboxTotal = mailboxBlocks * CUSTOM_MAILBOX_BLOCK_PRICE_IN_PAISE;
  const aiCreditsTotal = extraAiCredits * 45;

  return baseAmountInPaise + addOnFeatureTotal + documentCapacityTotal + seatTotal + mailboxTotal + aiCreditsTotal;
}

export function buildBillingAmounts(baseAmountInPaise: number) {
  const safeBase = Math.max(0, Math.round(baseAmountInPaise || 0));
  const gstAmountInPaise = Math.round(safeBase * GST_RATE);
  const totalAmountInPaise = safeBase + gstAmountInPaise;

  return {
    baseAmountInPaise: safeBase,
    gstRate: GST_RATE,
    gstAmountInPaise,
    totalAmountInPaise,
  };
}

export function buildBillingThreshold(percentUsed: number, remainingGenerations: number): {
  state: 'healthy' | 'watch' | 'critical' | 'limit_reached';
  recommendation: string;
} {
  const state: 'healthy' | 'watch' | 'critical' | 'limit_reached' = percentUsed >= 100
    ? 'limit_reached'
    : percentUsed >= 90
      ? 'critical'
      : percentUsed >= 75
        ? 'watch'
        : 'healthy';

  const recommendation = state === 'limit_reached'
    ? 'You have exhausted the current plan limit. Upgrade now to avoid interrupted work.'
    : state === 'critical'
      ? `Only ${remainingGenerations} generations remain at the current pace. Upgrade before the team gets blocked.`
      : state === 'watch'
        ? `Usage is approaching the current threshold. Plan the next upgrade before the cycle gets tight.`
        : 'Usage is healthy. Your current plan still has comfortable runway.';

  return { state, recommendation };
}

export async function getBillingTransactions() {
  return readJsonFile<BillingTransaction[]>(billingTransactionsPath, []);
}

async function saveBillingTransactions(transactions: BillingTransaction[]) {
  await writeJsonFile(billingTransactionsPath, transactions);
}

export async function createPendingBillingTransaction(
  user: User,
  plan: SaasPlan,
  providerOrderId: string,
  notes?: string,
  receipt?: string,
  customConfiguration?: CustomPlanConfiguration | null,
) {
  const transactions = await getBillingTransactions();
  const now = new Date().toISOString();
  const amounts = buildBillingAmounts(calculateCustomPlanAmountInPaise(plan, customConfiguration));

  const transaction: BillingTransaction = {
    id: `bill_${Math.random().toString(36).slice(2, 10)}`,
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    organizationId: user.organizationId,
    organizationName: user.organizationName,
    accountType: user.accountType || 'business',
    planId: plan.id,
    planName: plan.name,
    billingModel: plan.billingModel,
    baseAmountInPaise: amounts.baseAmountInPaise,
    gstRate: amounts.gstRate,
    gstAmountInPaise: amounts.gstAmountInPaise,
    totalAmountInPaise: amounts.totalAmountInPaise,
    amountInPaise: amounts.totalAmountInPaise,
    currency: DEFAULT_CURRENCY,
    status: 'created',
    provider: 'razorpay',
    providerOrderId,
    receipt: receipt || buildRazorpayReceipt(user.id, plan.id),
    notes,
    customConfiguration: customConfiguration || undefined,
    createdAt: now,
    updatedAt: now,
  };

  await saveBillingTransactions([transaction, ...transactions]);
  return transaction;
}

export async function markBillingTransactionPaid(params: {
  providerOrderId: string;
  providerPaymentId: string;
  providerSignature: string;
}) {
  const transactions = await getBillingTransactions();
  const now = new Date().toISOString();
  let updatedTransaction: BillingTransaction | null = null;

  const nextTransactions = transactions.map((transaction) => {
    if (transaction.providerOrderId !== params.providerOrderId) {
      return transaction;
    }

    updatedTransaction = {
      ...transaction,
      status: 'paid',
      invoiceNumber: transaction.invoiceNumber || `INV-${new Date().getFullYear()}-${transaction.id.slice(-6).toUpperCase()}`,
      providerPaymentId: params.providerPaymentId,
      providerSignature: params.providerSignature,
      paidAt: now,
      updatedAt: now,
    };
    return updatedTransaction;
  });

  await saveBillingTransactions(nextTransactions);
  return updatedTransaction;
}

export async function markBillingTransactionFailed(providerOrderId: string, status: 'failed' | 'cancelled' = 'failed') {
  const transactions = await getBillingTransactions();
  const now = new Date().toISOString();

  await saveBillingTransactions(
    transactions.map((transaction) =>
      transaction.providerOrderId === providerOrderId
        ? { ...transaction, status, updatedAt: now }
        : transaction,
    ),
  );
}

export function verifyRazorpayPaymentSignature(orderId: string, paymentId: string, signature: string) {
  const { keySecret } = getRazorpayConfig();
  if (!keySecret) {
    throw new Error('Razorpay key secret is missing.');
  }

  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  return expectedSignature === signature;
}

export async function createRazorpayOrder(user: User, plan: SaasPlan, customConfiguration?: CustomPlanConfiguration | null) {
  const { keyId, keySecret } = getRazorpayConfig();
  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials are not configured.');
  }

  const amount = calculateCustomPlanAmountInPaise(plan, customConfiguration);
  if (!amount) {
    throw new Error('This plan does not support direct checkout.');
  }
  const amounts = buildBillingAmounts(amount);

  const receipt = buildRazorpayReceipt(user.id, plan.id);
  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: amounts.totalAmountInPaise,
      currency: DEFAULT_CURRENCY,
      receipt,
      notes: {
        userId: user.id,
        planId: plan.id,
        planName: truncateRazorpayNote(plan.name, 80),
        accountType: user.accountType || 'business',
        baseAmountInPaise: String(amounts.baseAmountInPaise),
        gstAmountInPaise: String(amounts.gstAmountInPaise),
        customConfiguration: truncateRazorpayNote(JSON.stringify(customConfiguration || {}), 180),
      },
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.id) {
    throw new Error(payload?.error?.description || 'Unable to create Razorpay order.');
  }

  const transaction = await createPendingBillingTransaction(
    user,
    plan,
    payload.id,
    `Checkout created for ${plan.name}`,
    receipt,
    customConfiguration,
  );
  return { order: payload, transaction };
}

export async function syncPaidPlanToUser(userId: string, planId: string, transaction?: BillingTransaction | null, customConfiguration?: CustomPlanConfiguration | null) {
  const users = await getStoredUsers();
  const plan = await getSaasPlanById(planId);
  if (!plan) {
    throw new Error('Plan not found.');
  }

  const now = new Date().toISOString();
  const currentPeriodEnd = plan.billingModel === 'subscription'
    ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    : undefined;
  const monthlyAiCredits = plan.id === 'workspace-build-your-own'
    ? Math.max(customConfiguration?.monthlyAiCredits || 0, 0)
    : Math.max(plan.monthlyAiCredits || 0, 0);

  const nextUsers = users.map((user) =>
    user.id === userId
      ? {
          ...user,
          subscription: {
            planId: plan.id,
            planName: plan.name,
            status: 'active' as const,
            billingProvider: 'razorpay' as const,
            startedAt: now,
            currentPeriodStart: now,
            currentPeriodEnd,
            renewalDate: currentPeriodEnd,
            lastPaymentAt: now,
            lastOrderId: transaction?.providerOrderId,
            customConfiguration: customConfiguration || transaction?.customConfiguration,
            roadmapPromoCampaignId: user.subscription?.roadmapPromoCampaignId,
            roadmapPromoQualifiedAt: user.subscription?.roadmapPromoQualifiedAt,
            roadmapPromoValidUntil: user.subscription?.roadmapPromoValidUntil,
            roadmapPromoLabel: user.subscription?.roadmapPromoLabel,
            aiTrialLimit: 0,
            aiTrialUsed: 0,
            monthlyAiCredits,
            remainingAiCredits: monthlyAiCredits,
            aiCreditsResetAt: currentPeriodEnd,
          },
        }
      : user,
  );

  const promotedUsers = nextUsers.map((entry) => (
    entry.id === userId
      ? { ...entry, subscription: applyRoadmapPromotionToSubscription(entry.subscription, now) }
      : entry
  ));
  await saveStoredUsers(promotedUsers);
  return promotedUsers.find((user) => user.id === userId) || null;
}

export async function getBillingOverview(user: User): Promise<BillingOverview> {
  const [plan, transactions, publicPlans, usageSummary] = await Promise.all([
    getEffectiveSaasPlanForUser(user),
    getBillingTransactions(),
    getPublicSaasPlansByAudience(user.accountType === 'individual' ? 'individual' : 'business'),
    getUserUsageSummary(user),
  ]);
  const config = getRazorpayConfig();
  const percentUsed = usageSummary.usage.thresholdPercentUsed ?? 0;
  const threshold = buildBillingThreshold(percentUsed, usageSummary.usage.remainingGenerations);

  return {
    provider: 'razorpay',
    isTestMode: config.isTestMode,
    publishableKeyAvailable: config.publishableKeyAvailable,
    currentPlan: plan,
    availablePlans: publicPlans.filter((entry) => entry.active),
    aiAllowance: {
      remainingTrialRuns: Math.max((user.subscription?.aiTrialLimit || 0) - (user.subscription?.aiTrialUsed || 0), 0),
      monthlyCredits: Math.max(user.subscription?.monthlyAiCredits || 0, 0),
      remainingCredits: Math.max(user.subscription?.remainingAiCredits || 0, 0),
      upgradeRecommended: Math.max((user.subscription?.aiTrialLimit || 0) - (user.subscription?.aiTrialUsed || 0), 0) === 0
        && Math.max(user.subscription?.remainingAiCredits || 0, 0) === 0,
    },
    threshold: {
      state: threshold.state,
      percentUsed,
      recommendation: threshold.recommendation,
    },
    roadmapPromotion: getRoadmapPromotionSnapshot(user.subscription),
    transactions: transactions
      .filter((transaction) => transaction.userId === user.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    testModeNotes: config.isTestMode
      ? [
          'Razorpay is currently in test mode.',
          'Use your Razorpay test Key ID and Key Secret in environment variables.',
          'Use Razorpay official test payment methods while validating checkout before going live.',
        ]
      : ['Razorpay live mode is enabled. Only real payments should be attempted.'],
  };
}

export function buildInvoiceHtml(transaction: BillingTransaction) {
  const issueDate = new Date(transaction.paidAt || transaction.updatedAt || transaction.createdAt).toLocaleString('en-IN');
  const accountLabel = transaction.accountType === 'individual' ? transaction.userName || transaction.userEmail : transaction.organizationName || transaction.userName || transaction.userEmail;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${transaction.invoiceNumber || transaction.id} - docrud Invoice</title>
    <style>
      body { font-family: Inter, Arial, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 32px; }
      .wrap { max-width: 960px; margin: 0 auto; background: white; border: 1px solid #e2e8f0; border-radius: 28px; overflow: hidden; box-shadow: 0 20px 60px rgba(15,23,42,0.08); }
      .hero { padding: 32px; background: linear-gradient(180deg,#ffffff,#f8fafc); border-bottom: 1px solid #e2e8f0; }
      .eyebrow { font-size: 11px; letter-spacing: 0.24em; text-transform: uppercase; color: #64748b; font-weight: 600; }
      .grid { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 20px; padding: 32px; }
      .card { border: 1px solid #e2e8f0; border-radius: 22px; padding: 20px; background: #fff; }
      .totals { background: #0f172a; color: white; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      th, td { padding: 12px 0; border-bottom: 1px solid #e2e8f0; text-align: left; font-size: 14px; }
      .totals th, .totals td { border-bottom-color: rgba(255,255,255,0.12); }
      .right { text-align: right; }
      .muted { color: #64748b; }
      .totals .muted { color: rgba(255,255,255,0.72); }
      .footer { padding: 0 32px 32px; font-size: 12px; line-height: 1.8; color: #64748b; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="hero">
        <div class="eyebrow">docrud Purchase Invoice</div>
        <h1 style="margin:12px 0 8px;font-size:32px;">Invoice ${transaction.invoiceNumber || transaction.id}</h1>
        <p class="muted" style="margin:0;font-size:14px;">Professional billing statement for your docrud subscription purchase.</p>
      </div>
      <div class="grid">
        <div class="card">
          <div class="eyebrow">Billed To</div>
          <p style="margin:14px 0 0;font-size:20px;font-weight:600;">${accountLabel}</p>
          <p class="muted" style="margin:8px 0 0;">${transaction.userEmail}</p>
          <p class="muted" style="margin:8px 0 0;">Plan: ${transaction.planName}</p>
          <p class="muted" style="margin:8px 0 0;">Issued: ${issueDate}</p>
          <p class="muted" style="margin:8px 0 0;">Provider Payment ID: ${transaction.providerPaymentId || 'Pending'}</p>
          <p class="muted" style="margin:8px 0 0;">Receipt: ${transaction.receipt}</p>
        </div>
        <div class="card totals">
          <div class="eyebrow" style="color: rgba(255,255,255,0.72);">Amount Breakdown</div>
          <table>
            <tr><th class="muted">Base price</th><td class="right">₹${(transaction.baseAmountInPaise / 100).toFixed(2)}</td></tr>
            <tr><th class="muted">GST (${Math.round(transaction.gstRate * 100)}%)</th><td class="right">₹${(transaction.gstAmountInPaise / 100).toFixed(2)}</td></tr>
            <tr><th>Total paid</th><td class="right" style="font-size:18px;font-weight:700;">₹${(transaction.totalAmountInPaise / 100).toFixed(2)}</td></tr>
          </table>
        </div>
      </div>
      <div class="footer">
        <p>This invoice is generated by docrud for the selected plan purchase. Taxes are shown transparently for clarity. Please retain this invoice for accounting, reimbursement, and internal procurement records.</p>
      </div>
    </div>
  </body>
</html>`;
}
