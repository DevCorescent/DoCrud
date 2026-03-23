import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/server/auth';
import { getSignatureSettings, saveSignatureSettings } from '@/lib/server/settings';
import { SignatureRecord, SignatureSettings } from '@/types/document';

export const dynamic = 'force-dynamic';

function getRequestIp(request: NextRequest) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(await getSignatureSettings());
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to load signature settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const payload = await request.json() as Omit<SignatureRecord, 'id' | 'signedAt' | 'signedIp' | 'createdBy'>;
    if (!payload.signerName?.trim() || !payload.signerRole?.trim() || !payload.signatureDataUrl?.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Signer name, role, and drawn signature are required' }, { status: 400 });
    }

    const settings = await getSignatureSettings();
    const signature: SignatureRecord = {
      id: `sig-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      signerName: payload.signerName.trim(),
      signerRole: payload.signerRole.trim(),
      signatureDataUrl: payload.signatureDataUrl,
      signedAt: new Date().toISOString(),
      signedIp: getRequestIp(request),
      createdBy: session.user.email || 'unknown',
    };

    const nextSettings: SignatureSettings = {
      signatures: [signature, ...(settings.signatures || [])],
    };

    await saveSignatureSettings(nextSettings);
    return NextResponse.json(nextSettings);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to save signature settings' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Signature ID required' }, { status: 400 });
    }

    const settings = await getSignatureSettings();
    const nextSettings: SignatureSettings = {
      signatures: settings.signatures.filter((signature) => signature.id !== id),
    };
    await saveSignatureSettings(nextSettings);
    return NextResponse.json(nextSettings);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete signature' }, { status: 500 });
  }
}
