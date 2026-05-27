import { readJsonFile, sharesPath, writeJsonFile } from '@/lib/server/storage';
import type { ShareRecord } from '@/lib/shareStore';

export type { ShareRecord, SharePermission, ShareableKind } from '@/lib/shareStore';

export function generateShareToken(): string {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from(bytes).map(b => chars[b % chars.length]).join('');
}

async function loadAll(): Promise<ShareRecord[]> {
  return readJsonFile<ShareRecord[]>(sharesPath, []);
}

async function saveAll(records: ShareRecord[]): Promise<void> {
  await writeJsonFile(sharesPath, records);
}

export async function createShareRecord(record: ShareRecord): Promise<void> {
  const records = await loadAll();
  records.push(record);
  await saveAll(records);
}

export async function getShareRecord(token: string): Promise<ShareRecord | null> {
  const records = await loadAll();
  const record = records.find(r => r.token === token) ?? null;
  if (!record || record.revoked) return null;
  if (record.expiresAt && Date.now() > record.expiresAt) return null;
  return record;
}

export async function listShareRecordsForItem(itemId: string): Promise<ShareRecord[]> {
  const records = await loadAll();
  return records.filter(
    r => r.itemId === itemId && !r.revoked && (!r.expiresAt || Date.now() <= r.expiresAt),
  );
}

export async function recordShareAccess(token: string): Promise<void> {
  const records = await loadAll();
  const r = records.find(r => r.token === token);
  if (!r) return;
  r.accessCount += 1;
  await saveAll(records);
}

export async function revokeShareRecord(token: string): Promise<void> {
  const records = await loadAll();
  const r = records.find(r => r.token === token);
  if (!r) return;
  r.revoked = true;
  await saveAll(records);
}
