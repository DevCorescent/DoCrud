import { ContactRequest } from '@/types/document';
import { contactRequestsPath, readJsonFile, writeJsonFile } from '@/lib/server/storage';

export async function getContactRequests() {
  const requests = await readJsonFile<ContactRequest[]>(contactRequestsPath, []);
  return [...requests].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

export async function addContactRequest(payload: Omit<ContactRequest, 'id' | 'createdAt'>) {
  const requests = await getContactRequests();
  const next: ContactRequest = {
    id: `lead-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    ...payload,
  };

  requests.unshift(next);
  await writeJsonFile(contactRequestsPath, requests);
  return next;
}
