import { createCipheriv, createDecipheriv, randomBytes, scryptSync, type DecipherGCM } from 'crypto';
import { FileTransferAccessEvent, SecureFileTransfer } from '@/types/document';
import { fileTransfersPath, readJsonFile, writeJsonFile } from '@/lib/server/storage';
import { generateSharePassword } from '@/lib/server/history';

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

function deriveTransferKey(accessPassword: string, securePassword: string, parserPassword: string, salt: Buffer) {
  return scryptSync(`${accessPassword}::${securePassword}::${parserPassword}`, salt, 32);
}

function encodeEncryptedPayload(payload: Record<string, string>) {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
}

function decodeEncryptedPayload(payload: string) {
  return JSON.parse(Buffer.from(payload, 'base64').toString('utf8')) as Record<string, string>;
}

function generateStrongSecret(length = 14) {
  return randomBytes(length).toString('base64url').slice(0, length).toUpperCase();
}

function generateUniqueAccessPassword(existingTransfers: SecureFileTransfer[], preferred?: string) {
  const normalizedPreferred = preferred?.trim().toUpperCase();
  const existing = new Set(existingTransfers.map((item) => item.accessPassword?.trim().toUpperCase()).filter(Boolean));
  if (normalizedPreferred && !existing.has(normalizedPreferred)) {
    return normalizedPreferred;
  }

  let candidate = '';
  do {
    candidate = generateSharePassword();
  } while (existing.has(candidate));
  return candidate;
}

export function encryptTransferDataUrl(
  dataUrl: string,
  passwords: { accessPassword: string; securePassword: string; parserPassword: string },
) {
  const iv = randomBytes(16);
  const salt = randomBytes(16);
  const key = deriveTransferKey(passwords.accessPassword, passwords.securePassword, passwords.parserPassword, salt);
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(dataUrl, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return encodeEncryptedPayload({
    algorithm: ENCRYPTION_ALGORITHM,
    iv: iv.toString('base64'),
    salt: salt.toString('base64'),
    tag: tag.toString('base64'),
    encrypted: encrypted.toString('base64'),
  });
}

export function decryptTransferDataUrl(
  payload: string,
  passwords: { accessPassword: string; securePassword: string; parserPassword: string },
) {
  const decoded = decodeEncryptedPayload(payload);
  const salt = Buffer.from(decoded.salt, 'base64');
  const iv = Buffer.from(decoded.iv, 'base64');
  const tag = Buffer.from(decoded.tag, 'base64');
  const encrypted = Buffer.from(decoded.encrypted, 'base64');
  const key = deriveTransferKey(passwords.accessPassword, passwords.securePassword, passwords.parserPassword, salt);
  const decipher = createDecipheriv(decoded.algorithm || ENCRYPTION_ALGORITHM, key, iv) as DecipherGCM;
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

export function resolveFileTransferDataUrl(
  entry: SecureFileTransfer,
  payload?: { password?: string; securePassword?: string; parserPassword?: string },
) {
  if (entry.encryptionEnabled && entry.encryptedPayload) {
    if (!payload?.password || !payload.securePassword || !payload.parserPassword) {
      throw new Error('All decrypt credentials are required.');
    }
    return decryptTransferDataUrl(entry.encryptedPayload, {
      accessPassword: payload.password.trim().toUpperCase(),
      securePassword: payload.securePassword.trim().toUpperCase(),
      parserPassword: payload.parserPassword.trim().toUpperCase(),
    });
  }

  return entry.dataUrl;
}

export async function getFileTransfers() {
  return readJsonFile<SecureFileTransfer[]>(fileTransfersPath, []);
}

export async function saveFileTransfers(transfers: SecureFileTransfer[]) {
  await writeJsonFile(fileTransfersPath, transfers);
}

export function normalizeFileTransfer(entry: Partial<SecureFileTransfer>): SecureFileTransfer {
  const now = new Date().toISOString();
  const shareId = entry.shareId || `transfer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const authMode = entry.authMode || 'password';
  const accessPassword = authMode === 'public' ? undefined : (entry.accessPassword || generateSharePassword());
  const securePassword = authMode === 'triple_password' ? (entry.securePassword || generateStrongSecret(16)) : undefined;
  const parserPassword = authMode === 'triple_password' ? (entry.parserPassword || generateStrongSecret(12)) : undefined;
  const encryptionEnabled = authMode === 'triple_password' ? true : Boolean(entry.encryptionEnabled);
  const encryptedPayload = encryptionEnabled && entry.dataUrl
    ? encryptTransferDataUrl(String(entry.dataUrl), {
        accessPassword: accessPassword || generateSharePassword(),
        securePassword: securePassword || generateStrongSecret(16),
        parserPassword: parserPassword || generateStrongSecret(12),
      })
    : entry.encryptedPayload;

  return {
    id: entry.id || shareId,
    shareId,
    shareUrl: entry.shareUrl || `/transfer/${shareId}`,
    publicOpenUrl: entry.publicOpenUrl || `/open/${shareId}`,
    title: entry.title ? String(entry.title) : undefined,
    fileName: String(entry.fileName || 'shared-file'),
    mimeType: String(entry.mimeType || 'application/octet-stream'),
    dataUrl: encryptionEnabled ? '' : String(entry.dataUrl || ''),
    sizeInBytes: Number(entry.sizeInBytes || 0),
    notes: entry.notes ? String(entry.notes) : undefined,
    folderId: entry.folderId ? String(entry.folderId) : undefined,
    folderName: entry.folderName ? String(entry.folderName) : undefined,
    lockerId: entry.lockerId ? String(entry.lockerId) : undefined,
    lockerName: entry.lockerName ? String(entry.lockerName) : undefined,
    directoryVisibility: entry.directoryVisibility === 'public' ? 'public' : 'private',
    directoryCategory: entry.directoryCategory ? String(entry.directoryCategory) : undefined,
    directoryTags: Array.isArray(entry.directoryTags)
      ? entry.directoryTags.map((tag) => String(tag).trim()).filter(Boolean)
      : [],
    authMode,
    accessPassword,
    fileAccessPassword: entry.fileAccessPassword ? String(entry.fileAccessPassword).trim().toUpperCase() : undefined,
    securePassword,
    parserPassword,
    recipientEmail: entry.recipientEmail ? String(entry.recipientEmail).toLowerCase() : undefined,
    encryptionEnabled,
    encryptionAlgorithm: encryptionEnabled ? ENCRYPTION_ALGORITHM : entry.encryptionAlgorithm,
    encryptedPayload: encryptedPayload ? String(encryptedPayload) : undefined,
    maxDownloads: typeof entry.maxDownloads === 'number' ? entry.maxDownloads : undefined,
    expiresAt: entry.expiresAt ? String(entry.expiresAt) : undefined,
    uploadedBy: String(entry.uploadedBy || 'system'),
    uploadedByUserId: entry.uploadedByUserId ? String(entry.uploadedByUserId) : undefined,
    organizationId: entry.organizationId ? String(entry.organizationId) : undefined,
    organizationName: entry.organizationName ? String(entry.organizationName) : undefined,
    createdAt: entry.createdAt || now,
    updatedAt: entry.updatedAt || now,
    revokedAt: entry.revokedAt ? String(entry.revokedAt) : undefined,
    openCount: Number(entry.openCount || 0),
    downloadCount: Number(entry.downloadCount || 0),
    lastOpenedAt: entry.lastOpenedAt ? String(entry.lastOpenedAt) : undefined,
    lastDownloadedAt: entry.lastDownloadedAt ? String(entry.lastDownloadedAt) : undefined,
    accessEvents: Array.isArray(entry.accessEvents) ? entry.accessEvents : [],
  };
}

export async function appendFileTransfer(entry: Partial<SecureFileTransfer>) {
  const transfers = await getFileTransfers();
  const authMode = entry.authMode || 'password';
  const transfer = normalizeFileTransfer({
    ...entry,
    accessPassword: authMode === 'public' ? undefined : generateUniqueAccessPassword(transfers, entry.accessPassword),
  });
  await saveFileTransfers([transfer, ...transfers]);
  return transfer;
}

export async function updateFileTransfer(
  id: string,
  updater: (entry: SecureFileTransfer) => SecureFileTransfer | null,
) {
  const transfers = await getFileTransfers();
  const index = transfers.findIndex((entry) => entry.id === id || entry.shareId === id);
  if (index === -1) return null;
  const updated = updater(transfers[index]);
  if (!updated) return null;
  const next = transfers.map((entry, entryIndex) => (entryIndex === index ? updated : entry));
  await saveFileTransfers(next);
  return updated;
}

export async function recordFileTransferEvent(
  id: string,
  eventType: FileTransferAccessEvent['eventType'],
  payload: Omit<FileTransferAccessEvent, 'id' | 'eventType' | 'createdAt'> = {},
) {
  return updateFileTransfer(id, (entry) => {
    const event: FileTransferAccessEvent = {
      id: `fte-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      eventType,
      createdAt: new Date().toISOString(),
      actorEmail: payload.actorEmail,
      actorName: payload.actorName,
      ip: payload.ip,
    };
    return {
      ...entry,
      openCount: eventType === 'open' ? entry.openCount + 1 : entry.openCount,
      downloadCount: eventType === 'download' ? entry.downloadCount + 1 : entry.downloadCount,
      lastOpenedAt: eventType === 'open' ? event.createdAt : entry.lastOpenedAt,
      lastDownloadedAt: eventType === 'download' ? event.createdAt : entry.lastDownloadedAt,
      accessEvents: [event, ...(entry.accessEvents || [])],
      updatedAt: event.createdAt,
    };
  });
}

export function canUnlockFileTransfer(
  entry: SecureFileTransfer,
  payload: { password?: string; filePassword?: string; email?: string; securePassword?: string; parserPassword?: string },
) {
  if (entry.authMode === 'public') {
    return { ok: true };
  }

  const normalizedEmail = payload.email?.trim().toLowerCase();
  const normalizedPassword = payload.password?.trim().toUpperCase();
  const normalizedFilePassword = payload.filePassword?.trim().toUpperCase();
  const normalizedSecurePassword = payload.securePassword?.trim().toUpperCase();
  const normalizedParserPassword = payload.parserPassword?.trim().toUpperCase();
  const needsPassword = entry.authMode === 'password' || entry.authMode === 'password_and_email';
  const needsEmail = entry.authMode === 'email' || entry.authMode === 'password_and_email';
  const needsTriplePassword = entry.authMode === 'triple_password';
  const hasUnlockInput = Boolean(
    normalizedEmail || normalizedPassword || normalizedFilePassword || normalizedSecurePassword || normalizedParserPassword,
  );

  if (entry.revokedAt) {
    return { ok: false, error: 'This file transfer has been revoked.' };
  }

  if (entry.expiresAt && new Date(entry.expiresAt).getTime() < Date.now()) {
    return { ok: false, error: 'This file transfer has expired.' };
  }

  if (typeof entry.maxDownloads === 'number' && entry.downloadCount >= entry.maxDownloads) {
    return { ok: false, error: 'This file transfer has reached its download limit.' };
  }

  if (!hasUnlockInput && (needsPassword || needsEmail || needsTriplePassword || entry.fileAccessPassword)) {
    return { ok: false, error: undefined };
  }

  if (needsPassword && !normalizedPassword) {
    return { ok: false, error: 'Enter the transfer password.' };
  }

  if (needsTriplePassword && !normalizedPassword) {
    return { ok: false, error: 'Enter the transfer password.' };
  }

  if (needsTriplePassword && !normalizedSecurePassword) {
    return { ok: false, error: 'Enter the secure password.' };
  }

  if (needsTriplePassword && !normalizedParserPassword) {
    return { ok: false, error: 'Enter the parser password.' };
  }

  if (entry.fileAccessPassword && !normalizedFilePassword) {
    return { ok: false, error: 'Enter the file password.' };
  }

  if (needsEmail && !normalizedEmail) {
    return { ok: false, error: 'Enter the recipient email.' };
  }

  if (needsPassword && entry.accessPassword !== normalizedPassword) {
    return { ok: false, error: 'Invalid transfer password.' };
  }

  if (needsTriplePassword && entry.accessPassword !== normalizedPassword) {
    return { ok: false, error: 'Invalid transfer password.' };
  }

  if (needsTriplePassword && entry.securePassword !== normalizedSecurePassword) {
    return { ok: false, error: 'Invalid secure password.' };
  }

  if (needsTriplePassword && entry.parserPassword !== normalizedParserPassword) {
    return { ok: false, error: 'Invalid parser password.' };
  }

  if (entry.fileAccessPassword && entry.fileAccessPassword !== normalizedFilePassword) {
    return { ok: false, error: 'Invalid file password.' };
  }

  if (needsEmail && entry.recipientEmail !== normalizedEmail) {
    return { ok: false, error: 'Recipient email verification failed.' };
  }

  return { ok: true };
}

export function isPreviewableFile(mimeType: string) {
  return mimeType.startsWith('image/')
    || mimeType === 'application/pdf'
    || mimeType.startsWith('text/')
    || mimeType.includes('json');
}
