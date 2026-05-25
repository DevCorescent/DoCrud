import { NextResponse } from 'next/server';
import { getAuthSession, getStoredUsers } from '@/lib/server/auth';
import {
  buildBillingAmounts,
  createPendingCommerceTransaction,
  getRazorpayConfig,
  markBillingTransactionPaid,
  sendBillingReceiptEmail,
  verifyRazorpayPaymentSignature,
} from '@/lib/server/billing';

export const dynamic = 'force-dynamic';

const DRIVE_PLAN_META: Record<string, { label: string; monthlyPaise: number; annualPaise: number; gb: number }> = {
  'drive-starter':    { label: 'DocRud Drive Starter',    monthlyPaise:  4900, annualPaise:  49000, gb: 10 },
  'drive-pro':        { label: 'DocRud Drive Pro',        monthlyPaise:  9900, annualPaise:  99000, gb: 50 },
  'drive-business':   { label: 'DocRud Drive Business',   monthlyPaise: 19900, annualPaise: 199000, gb: 200 },
  'drive-enterprise': { label: 'DocRud Drive Enterprise', monthlyPaise: 49900, annualPaise: 499000, gb: 1024 },
};

/** POST — create a Razorpay order for a drive storage plan */
export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const planId = typeof body?.planId === 'string' ? body.planId : '';
    const period: 'monthly' | 'annual' = body?.period === 'annual' ? 'annual' : 'monthly';

    const meta = DRIVE_PLAN_META[planId];
    if (!meta) {
      return NextResponse.json({ error: 'Invalid drive plan.' }, { status: 400 });
    }

    const { keyId, keySecret, serverConfigured } = getRazorpayConfig();
    if (!serverConfigured) {
      return NextResponse.json({ error: 'Payment gateway is not configured. Please contact support.' }, { status: 503 });
    }

    const users = await getStoredUsers();
    const normalizedEmail = (session.user.email || '').trim().toLowerCase();
    const user = users.find((u) => u.email.trim().toLowerCase() === normalizedEmail);
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const baseAmountInPaise = period === 'annual' ? meta.annualPaise : meta.monthlyPaise;
    const amounts = buildBillingAmounts(baseAmountInPaise);
    const receipt = `drv_${user.id.slice(-6)}_${Date.now()}`;

    const razorpayRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amounts.totalAmountInPaise,
        currency: 'INR',
        receipt,
        notes: {
          userId: user.id,
          planId,
          planName: meta.label,
          period,
          productType: 'drive_plan',
          baseAmountInPaise: String(amounts.baseAmountInPaise),
          gstAmountInPaise: String(amounts.gstAmountInPaise),
        },
      }),
    });

    const order = await razorpayRes.json().catch(() => null);
    if (!razorpayRes.ok || !order?.id) {
      throw new Error(order?.error?.description || 'Failed to create payment order.');
    }

    const transaction = await createPendingCommerceTransaction({
      user,
      providerOrderId: order.id,
      productType: 'drive_plan',
      productLabel: `${meta.label} · ${period === 'annual' ? 'Annual' : 'Monthly'}`,
      baseAmountInPaise: amounts.baseAmountInPaise,
      amountInPaise: amounts.totalAmountInPaise,
      gstRate: 0.18,
      receipt,
      notes: `Drive storage plan: ${planId}, period: ${period}`,
    });

    return NextResponse.json({
      order,
      transaction,
      keyId,
      planId,
      planLabel: meta.label,
      period,
      pricing: amounts,
      customer: { name: user.name || '', email: user.email },
    });
  } catch (error) {
    console.error('[drive-upgrade POST]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create drive upgrade order.' },
      { status: 500 },
    );
  }
}

/** PUT — verify Razorpay payment, mark paid, send receipt email */
export async function PUT(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const orderId = typeof body?.razorpay_order_id === 'string' ? body.razorpay_order_id : '';
    const paymentId = typeof body?.razorpay_payment_id === 'string' ? body.razorpay_payment_id : '';
    const signature = typeof body?.razorpay_signature === 'string' ? body.razorpay_signature : '';
    const planId = typeof body?.planId === 'string' ? body.planId : '';

    if (!orderId || !paymentId || !signature) {
      return NextResponse.json({ error: 'Payment verification payload is incomplete.' }, { status: 400 });
    }

    const isValid = verifyRazorpayPaymentSignature(orderId, paymentId, signature);
    if (!isValid) {
      return NextResponse.json({ error: 'Payment signature verification failed.' }, { status: 400 });
    }

    const paidTransaction = await markBillingTransactionPaid({
      providerOrderId: orderId,
      providerPaymentId: paymentId,
      providerSignature: signature,
    });

    if (paidTransaction) {
      await sendBillingReceiptEmail({ transaction: paidTransaction, origin: new URL(request.url).origin });
    }

    return NextResponse.json({ success: true, planId, transaction: paidTransaction });
  } catch (error) {
    console.error('[drive-upgrade PUT]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Payment verification failed.' },
      { status: 500 },
    );
  }
}
