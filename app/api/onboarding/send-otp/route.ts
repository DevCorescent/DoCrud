import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getAuthSession, getStoredUsers } from '@/lib/server/auth';
import { otpSessionsPath, readJsonFile, writeJsonFile } from '@/lib/server/storage';
import { sendTrackedMail } from '@/lib/server/mailer';

export const dynamic = 'force-dynamic';

type EmailVerificationOtpSession = {
  id: string;
  purpose: 'email_verification';
  email: string;
  userId: string;
  otpHash: string;
  otpSalt: string;
  createdAt: string;
  expiresAt: string;
  attempts: number;
};

type OtpStore = {
  sessions: Array<Record<string, unknown>>;
};

function sha256Hex(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function generateId() {
  return crypto.randomBytes(18).toString('base64url');
}

async function getActor() {
  const session = await getAuthSession();
  if (!session?.user?.email) return null;
  const users = await getStoredUsers();
  return users.find((u) => u.email.toLowerCase() === session.user!.email!.toLowerCase()) ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const actor = await getActor();
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await req.json()) as { email?: string };
    const email = (body.email || actor.email).toLowerCase().trim();
    if (!email) return NextResponse.json({ error: 'Email is required.' }, { status: 400 });

    const otp = generateOtp();
    const otpSalt = crypto.randomBytes(16).toString('hex');
    const otpHash = sha256Hex(`${otpSalt}:${otp}`);
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const store = await readJsonFile<OtpStore>(otpSessionsPath, { sessions: [] });
    const sessions = Array.isArray(store.sessions) ? store.sessions : [];

    // Remove old email_verification sessions for this user
    const pruned = sessions.filter((s) => {
      const rec = s as Record<string, unknown>;
      if (rec['purpose'] === 'email_verification' && rec['userId'] === actor.id) return false;
      return true;
    });

    const newSession: EmailVerificationOtpSession = {
      id: generateId(),
      purpose: 'email_verification',
      email,
      userId: actor.id,
      otpHash,
      otpSalt,
      createdAt: now,
      expiresAt,
      attempts: 0,
    };

    pruned.unshift(newSession as unknown as Record<string, unknown>);
    await writeJsonFile(otpSessionsPath, { sessions: pruned });

    // Send OTP email
    await sendTrackedMail({
      policyKey: 'otp_verification',
      typeLabel: 'system',
      to: email,
      subject: `Your verification code: ${otp}`,
      preheader: `Your 6-digit Docrud verification code is ${otp}`,
      text: `Your Docrud email verification code is: ${otp}\n\nThis code expires in 10 minutes. Do not share it with anyone.`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0D0D0F;color:#fff;padding:40px 32px;border-radius:20px">
          <h1 style="font-size:22px;font-weight:700;margin:0 0 8px">Verify your email</h1>
          <p style="color:rgba(255,255,255,0.5);font-size:14px;margin:0 0 32px">Enter this code in the Docrud app to verify your account.</p>
          <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:28px;text-align:center;margin-bottom:28px">
            <p style="font-size:42px;font-weight:700;letter-spacing:12px;margin:0;font-variant-numeric:tabular-nums">${otp}</p>
          </div>
          <p style="color:rgba(255,255,255,0.35);font-size:12px;margin:0">This code expires in 10 minutes. If you did not request this, you can safely ignore this email.</p>
        </div>
      `,
      origin: 'onboarding',
    });

    return NextResponse.json({ sent: true });
  } catch (error) {
    console.error('[onboarding/send-otp] POST error', error);
    return NextResponse.json({ error: 'Failed to send OTP.' }, { status: 500 });
  }
}
