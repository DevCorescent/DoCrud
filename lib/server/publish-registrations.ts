import fs from 'fs';
import path from 'path';

const FILE = path.join(process.cwd(), 'data', 'publish-registrations.json');

export type RegistrationKind = 'event' | 'hackathon' | 'job' | 'survey' | 'poll' | 'webinar' | 'general';

export interface PublishRegistration {
  id: string;
  kind: RegistrationKind;
  // The published item details
  itemId: string;
  itemTitle: string;
  itemCategory: string;
  publisherUserId: string;    // owner of the published post
  // Registrant details
  registrantUserId?: string;
  registrantName: string;
  registrantEmail: string;
  registrantPhone?: string;
  registrantOrg?: string;
  // Extra fields (notes, message, etc.)
  message?: string;
  // Job-specific
  applicationUrl?: string;
  resumeUrl?: string;
  // Status workflow
  status: 'pending' | 'shortlisted' | 'accepted' | 'rejected' | 'withdrawn';
  reviewNote?: string;
  reviewedAt?: string;
  // Timestamps
  registeredAt: string;
  updatedAt: string;
}

function read(): PublishRegistration[] {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')) as PublishRegistration[]; }
  catch { return []; }
}

function write(items: PublishRegistration[]) {
  fs.writeFileSync(FILE, JSON.stringify(items, null, 2));
}

export function getAllRegistrations(): PublishRegistration[] {
  return read();
}

export function getRegistrationsForItem(itemId: string): PublishRegistration[] {
  return read().filter(r => r.itemId === itemId);
}

export function getRegistrationsByPublisher(publisherUserId: string): PublishRegistration[] {
  return read().filter(r => r.publisherUserId === publisherUserId);
}

export function getRegistrationsByUser(registrantUserId: string): PublishRegistration[] {
  return read().filter(r => r.registrantUserId === registrantUserId);
}

export function findDuplicate(itemId: string, registrantUserId?: string, registrantEmail?: string): PublishRegistration | null {
  const all = read();
  return all.find(r =>
    r.itemId === itemId &&
    (
      (registrantUserId && r.registrantUserId === registrantUserId) ||
      (registrantEmail && r.registrantEmail.toLowerCase() === registrantEmail.toLowerCase())
    )
  ) ?? null;
}

export function createRegistration(data: Omit<PublishRegistration, 'id' | 'registeredAt' | 'updatedAt' | 'status'>): PublishRegistration {
  const all = read();
  const now = new Date().toISOString();
  const reg: PublishRegistration = {
    ...data,
    id: `reg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    status: 'pending',
    registeredAt: now,
    updatedAt: now,
  };
  write([reg, ...all]);
  return reg;
}

export function updateRegistrationStatus(
  id: string,
  publisherUserId: string,
  status: PublishRegistration['status'],
  reviewNote?: string,
): PublishRegistration | null {
  const all = read();
  const idx = all.findIndex(r => r.id === id && r.publisherUserId === publisherUserId);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], status, reviewNote, reviewedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  write(all);
  return all[idx];
}

export function deleteRegistration(id: string, requestingUserId: string): boolean {
  const all = read();
  const item = all.find(r => r.id === id);
  if (!item) return false;
  if (item.publisherUserId !== requestingUserId && item.registrantUserId !== requestingUserId) return false;
  write(all.filter(r => r.id !== id));
  return true;
}

/* ── CSV export ── */
export function registrationsToCSV(regs: PublishRegistration[]): string {
  const headers = ['ID','Item Title','Category','Kind','Name','Email','Phone','Organisation','Message','Status','Review Note','Registered At'];
  const rows = regs.map(r => [
    r.id, r.itemTitle, r.itemCategory, r.kind,
    r.registrantName, r.registrantEmail, r.registrantPhone ?? '',
    r.registrantOrg ?? '', r.message ?? '',
    r.status, r.reviewNote ?? '', new Date(r.registeredAt).toLocaleString('en-IN'),
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
  return [headers.join(','), ...rows].join('\r\n');
}
