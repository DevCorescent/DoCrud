import { NextResponse } from 'next/server';
import { getAuthSession, getStoredUsers } from '@/lib/server/auth';
import { getBillingTransactions, markBillingTransactionPaid, syncPaidPlanToUser, verifyRazorpayPaymentSignature } from '@/lib/server/billing';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const orderId = typeof body?.razorpay_order_id === 'string' ? body.razorpay_order_id : '';
    const paymentId = typeof body?.razorpay_payment_id === 'string' ? body.razorpay_payment_id : '';
    const signature = typeof body?.razorpay_signature === 'string' ? body.razorpay_signature : '';

    if (!orderId || !paymentId || !signature) {
      return NextResponse.json({ error: 'Payment verification payload is incomplete.' }, { status: 400 });
    }

    const [users, transactions] = await Promise.all([getStoredUsers(), getBillingTransactions()]);
    const normalizedEmail = (session.user.email || '').trim().toLowerCase();
    const user = users.find((entry) => entry.email.trim().toLowerCase() === normalizedEmail);
    const transaction = transactions.find((entry) => entry.providerOrderId === orderId);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!transaction || transaction.userId !== user.id) {
      return NextResponse.json({ error: 'Billing transaction not found for this account.' }, { status: 404 });
    }

    const isValid = verifyRazorpayPaymentSignature(orderId, paymentId, signature);
    if (!isValid) {
      return NextResponse.json({ error: 'Razorpay payment signature verification failed.' }, { status: 400 });
    }

    const paidTransaction = await markBillingTransactionPaid({
      providerOrderId: orderId,
      providerPaymentId: paymentId,
      providerSignature: signature,
    });
    const updatedUser = await syncPaidPlanToUser(user.id, transaction.planId, paidTransaction, transaction.customConfiguration);

    return NextResponse.json({
      success: true,
      subscription: updatedUser?.subscription,
      transaction: paidTransaction,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to verify payment' },
      { status: 500 },
    );
  }
}
