import { createCipheriv, createDecipheriv, randomBytes, scryptSync, randomUUID, type DecipherGCM } from 'crypto';
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
      accessPassword: payload.password,
      securePassword: payload.securePassword,
      parserPassword: payload.parserPassword,
    });
  }
  return entry.dataUrl;
}

export async function getFileTransfers(): Promise<SecureFileTransfer[]> {
  return readJsonFile<SecureFileTransfer[]>(fileTransfersPath, []);
}

export async function saveFileTransfers(transfers: SecureFileTransfer[]): Promise<void> {
  await writeJsonFile(fileTransfersPath, transfers);
}

export async function appendFileTransfer(
  input: Omit<SecureFileTransfer, 'id' | 'shareId' | 'shareUrl' | 'publicOpenUrl' | 'createdAt' | 'updatedAt' | 'openCount' | 'downloadCount' | 'accessEvents'> & {
    encryptionEnabled?: boolean;
    passwords?: { accessPassword: string; securePassword: string; parserPassword: string };
    preferredAccessPassword?: string;
  },
): Promise<SecureFileTransfer> {
  const transfers = await getFileTransfers();
  const now = new Date().toISOString();
  const id = `transfer-${Date.now()}-${randomBytes(4).toString('hex')}`;

  let encryptedPayload: string | undefined;
  let accessPassword: string | undefined;
  let securePassword: string | undefined;
  let parserPassword: string | undefined;

  if (input.encryptionEnabled && input.passwords) {
    encryptedPayload = encryptTransferDataUrl(input.dataUrl, input.passwords);
    accessPassword = generateUniqueAccessPassword(transfers, input.preferredAccessPassword || input.passwords.accessPassword);
    securePassword = generateStrongSecret();
    parserPassword = generateStrongSecret();
  } else if (input.authMode === 'password' || input.authMode === 'password_and_email' || input.authMode === 'triple_password') {
    accessPassword = generateUniqueAccessPassword(transfers, input.preferredAccessPassword || input.accessPassword);
    if (input.authMode === 'triple_password') {
      securePassword = generateStrongSecret();
      parserPassword = generateStrongSecret();
    }
  }

  const transfer: SecureFileTransfer = {
    id,
    shareId: id,
    shareUrl: `/transfer/${id}`,
    publicOpenUrl: `/open/${id}`,
    title: input.title,
    fileName: input.fileName,
    mimeType: input.mimeType,
    dataUrl: input.encryptionEnabled ? '' : input.dataUrl,
    sizeInBytes: input.sizeInBytes,
    notes: input.notes,
    folderId: input.folderId,
    folderName: input.folderName,
    lockerId: input.lockerId,
    lockerName: input.lockerName,
    directoryVisibility: input.directoryVisibility,
    directoryCategory: input.directoryCategory,
    directoryTags: input.directoryTags,
    authMode: input.authMode,
    accessPassword,
    fileAccessPassword: input.fileAccessPassword,
    securePassword,
    parserPassword,
    recipientEmail: input.recipientEmail,
    encryptionEnabled: input.encryptionEnabled ?? false,
    encryptionAlgorithm: input.encryptionEnabled ? ENCRYPTION_ALGORITHM : undefined,
    encryptedPayload,
    maxDownloads: input.maxDownloads,
    expiresAt: input.expiresAt,
    uploadedBy: input.uploadedBy,
    uploadedByUserId: input.uploadedByUserId,
    organizationId: input.organizationId,
    organizationName: input.organizationName,
    thumbnailUrl: input.thumbnailUrl || undefined,
    openCount: 0,
    downloadCount: 0,
    accessEvents: [],
    createdAt: now,
    updatedAt: now,
  };

  await writeJsonFile(fileTransfersPath, [transfer, ...transfers]);
  return transfer;
}

export async function updateFileTransfer(
  id: string,
  patchOrUpdater: Partial<SecureFileTransfer> | ((entry: SecureFileTransfer) => Partial<SecureFileTransfer> | null),
): Promise<SecureFileTransfer | null> {
  const transfers = await getFileTransfers();
  const idx = transfers.findIndex((t) => t.id === id || t.shareId === id);
  if (idx === -1) return null;
  const patch = typeof patchOrUpdater === 'function' ? patchOrUpdater(transfers[idx]) : patchOrUpdater;
  if (!patch) return null;
  transfers[idx] = { ...transfers[idx], ...patch, updatedAt: new Date().toISOString() };
  await writeJsonFile(fileTransfersPath, transfers);
  return transfers[idx];
}

export async function recordFileTransferEvent(
  transferId: string,
  eventType: FileTransferAccessEvent['eventType'],
): Promise<void> {
  const transfers = await getFileTransfers();
  const idx = transfers.findIndex((t) => t.id === transferId || t.shareId === transferId);
  if (idx === -1) return;

  const entry = transfers[idx];
  const event: FileTransferAccessEvent = {
    id: `fte-${Date.now()}-${randomBytes(3).toString('hex')}`,
    eventType,
    createdAt: new Date().toISOString(),
  };

  const updatedEntry: SecureFileTransfer = {
    ...entry,
    accessEvents: [...(entry.accessEvents ?? []), event],
    updatedAt: new Date().toISOString(),
  };

  if (eventType === 'open') {
    updatedEntry.openCount = (entry.openCount ?? 0) + 1;
    updatedEntry.lastOpenedAt = event.createdAt;
    updatedEntry.viewCount = (entry.viewCount ?? 0) + 1;
  } else if (eventType === 'download') {
    updatedEntry.downloadCount = (entry.downloadCount ?? 0) + 1;
    updatedEntry.lastDownloadedAt = event.createdAt;
  }

  transfers[idx] = updatedEntry;
  await writeJsonFile(fileTransfersPath, transfers);
}

export function canUnlockFileTransfer(
  entry: SecureFileTransfer,
  payload: {
    password?: string;
    filePassword?: string;
    email?: string;
    securePassword?: string;
    parserPassword?: string;
  },
): { ok: boolean; error?: string } {
  const normalizedPassword = (payload.password || '').trim().toUpperCase();
  const normalizedFilePassword = (payload.filePassword || '').trim().toUpperCase();
  const normalizedEmail = (payload.email || '').trim().toLowerCase();
  const normalizedSecurePassword = (payload.securePassword || '').trim().toUpperCase();
  const normalizedParserPassword = (payload.parserPassword || '').trim().toUpperCase();

  const needsEmail = entry.authMode === 'email' || entry.authMode === 'password_and_email';
  const needsPassword = entry.authMode === 'password' || entry.authMode === 'password_and_email';
  const needsTriplePassword = entry.authMode === 'triple_password';

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

/* ── Engagement + featuring helpers ── */

export async function toggleLike(transferId: string, identifier: string): Promise<{ liked: boolean; likesCount: number }> {
  const transfers = await getFileTransfers();
  const idx = transfers.findIndex((t) => t.id === transferId || t.shareId === transferId);
  if (idx === -1) throw new Error('Post not found.');
  const t = transfers[idx];
  const likedBy: string[] = t.likedBy ?? [];
  const alreadyLiked = likedBy.includes(identifier);
  const nextLikedBy = alreadyLiked ? likedBy.filter((x) => x !== identifier) : [...likedBy, identifier];
  transfers[idx] = { ...t, likedBy: nextLikedBy, likesCount: nextLikedBy.length, updatedAt: new Date().toISOString() };
  await writeJsonFile(fileTransfersPath, transfers);
  return { liked: !alreadyLiked, likesCount: nextLikedBy.length };
}

export async function addComment(
  transferId: string,
  userId: string,
  userName: string,
  text: string,
  parentId?: string,
): Promise<SecureFileTransfer> {
  const transfers = await getFileTransfers();
  const idx = transfers.findIndex((t) => t.id === transferId || t.shareId === transferId);
  if (idx === -1) throw new Error('Post not found.');
  const t = transfers[idx];
  const comments = t.comments ?? [];
  const entry: { id: string; userId: string; userName: string; text: string; createdAt: string; parentId?: string } = {
    id: randomUUID(),
    userId,
    userName,
    text: text.slice(0, 1000),
    createdAt: new Date().toISOString(),
  };
  if (parentId) entry.parentId = parentId;
  comments.push(entry);
  transfers[idx] = { ...t, comments, commentsCount: comments.filter((c) => !c.parentId).length, updatedAt: new Date().toISOString() };
  await writeJsonFile(fileTransfersPath, transfers);
  return transfers[idx];
}

export async function toggleCommentLike(
  transferId: string,
  commentId: string,
  identifier: string,
): Promise<{ liked: boolean; likesCount: number }> {
  const transfers = await getFileTransfers();
  const idx = transfers.findIndex((t) => t.id === transferId || t.shareId === transferId);
  if (idx === -1) throw new Error('Post not found.');
  const t = transfers[idx];
  const comments = (t.comments ?? []).map((c) => {
    if (c.id !== commentId) return c;
    const likedBy = c.likedBy ?? [];
    const alreadyLiked = likedBy.includes(identifier);
    return { ...c, likedBy: alreadyLiked ? likedBy.filter((x) => x !== identifier) : [...likedBy, identifier] };
  });
  const updated = comments.find((c) => c.id === commentId);
  const liked = updated ? (updated.likedBy ?? []).includes(identifier) : false;
  const likesCount = updated ? (updated.likedBy ?? []).length : 0;
  transfers[idx] = { ...t, comments, updatedAt: new Date().toISOString() };
  await writeJsonFile(fileTransfersPath, transfers);
  return { liked, likesCount };
}

export async function featureTransfer(
  transferId: string,
  plan: 'spotlight' | 'boost' | 'prime',
  orderId: string,
): Promise<SecureFileTransfer> {
  const transfers = await getFileTransfers();
  const idx = transfers.findIndex((t) => t.id === transferId || t.shareId === transferId);
  if (idx === -1) throw new Error('Post not found.');
  const durationDays = plan === 'spotlight' ? 3 : plan === 'boost' ? 7 : 30;
  const featuredUntil = new Date(Date.now() + durationDays * 86400000).toISOString();
  transfers[idx] = {
    ...transfers[idx],
    featured: true,
    featuredPlan: plan,
    featuredAt: new Date().toISOString(),
    featuredUntil,
    featuredOrderId: orderId,
    updatedAt: new Date().toISOString(),
  };
  await writeJsonFile(fileTransfersPath, transfers);
  return transfers[idx];
}

export async function getPublicAnalyticsForUser(userId: string): Promise<{
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  publishCount: number;
  featuredCount: number;
}> {
  const transfers = await getFileTransfers();
  const now = new Date();
  const posts = transfers.filter(
    (t) => t.uploadedByUserId === userId && t.directoryVisibility === 'public' && !t.revokedAt,
  );
  return {
    totalViews: posts.reduce((s, t) => s + (t.viewCount ?? t.openCount ?? 0), 0),
    totalLikes: posts.reduce((s, t) => s + (t.likesCount ?? 0), 0),
    totalComments: posts.reduce((s, t) => s + (t.commentsCount ?? 0), 0),
    publishCount: posts.length,
    featuredCount: posts.filter((t) => t.featured && t.featuredUntil && new Date(t.featuredUntil) > now).length,
  };
}
