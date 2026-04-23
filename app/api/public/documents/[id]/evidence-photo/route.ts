import { NextRequest, NextResponse } from 'next/server';
import { createAccessEvent, getHistoryEntries, updateHistoryEntry } from '@/lib/server/history';
import { getDeviceLabel, getRequestIp, getRequestUserAgent } from '@/lib/server/public-documents';

export const dynamic = 'force-dynamic';

function isValidImageDataUrl(value: string | undefined) {
  return Boolean(value && /^data:image\/(png|jpeg|jpg);base64,/i.test(value));
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = await request.json() as {
      password?: string;
      photoDataUrl?: string;
      capturedAt?: string;
    };

    if (!payload.password?.trim()) {
      return NextResponse.json({ error: 'Signing password is required before capturing evidence.' }, { status: 400 });
    }
    if (!isValidImageDataUrl(payload.photoDataUrl)) {
      return NextResponse.json({ error: 'A live camera capture is required. Uploaded images are not allowed.' }, { status: 400 });
    }

    const history = await getHistoryEntries();
    const entry = history.find((item) => item.shareId === params.id || item.id === params.id);
    if (!entry) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    if (!entry.recipientSignatureRequired) {
      return NextResponse.json({ error: 'This document does not require recipient signing.' }, { status: 400 });
    }
    if (entry.recipientSignatureDataUrl) {
      return NextResponse.json({ error: 'This document has already been signed.' }, { status: 409 });
    }
    if (entry.sharePassword !== payload.password.trim().toUpperCase()) {
      return NextResponse.json({ error: 'Invalid signing password' }, { status: 403 });
    }

    const captureToken = `photo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const capturedIp = getRequestIp(request);
    const capturedAt = payload.capturedAt ? new Date(payload.capturedAt).toISOString() : new Date().toISOString();
    const updated = await updateHistoryEntry(entry.id, (current) => ({
      ...current,
      pendingRecipientPhotoDataUrl: payload.photoDataUrl,
      pendingRecipientPhotoCapturedAt: capturedAt,
      pendingRecipientPhotoCapturedIp: capturedIp,
      pendingRecipientPhotoCaptureToken: captureToken,
      accessEvents: [
        createAccessEvent({
          eventType: 'camera_capture',
          createdAt: new Date().toISOString(),
          ip: capturedIp,
          userAgent: getRequestUserAgent(request),
          deviceLabel: getDeviceLabel(getRequestUserAgent(request)),
        }),
        ...(current.accessEvents || []),
      ].slice(0, 50),
      automationNotes: [...(current.automationNotes || []), 'Live signer photo evidence captured'],
    }));

    return NextResponse.json({
      evidenceCaptureToken: updated?.pendingRecipientPhotoCaptureToken || captureToken,
      photoDataUrl: updated?.pendingRecipientPhotoDataUrl || payload.photoDataUrl,
      capturedAt: updated?.pendingRecipientPhotoCapturedAt || capturedAt,
      capturedIp: updated?.pendingRecipientPhotoCapturedIp || capturedIp,
      captureMethod: 'live_camera',
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to capture live signer photo.' }, { status: 500 });
  }
}
