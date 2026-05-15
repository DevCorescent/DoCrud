import { mailPoliciesPath, readJsonFile, writeJsonFile } from '@/lib/server/storage';

export type MailPolicyKey =
  | 'document_delivery'
  | 'collection_request'
  | 'document_signed_owner_notify'
  | 'admin_user_message'
  | 'smtp_test'
  | 'bulk_campaign'
  | 'otp_verification'
  | 'business_welcome'
  | 'billing_reminders'
  | 'billing_receipts'
  | 'gigs_notifications'
  | 'gigs_safety'
  | 'docrud_go_welcome';

export type MailPolicies = Record<MailPolicyKey, boolean>;

export const defaultMailPolicies: MailPolicies = {
  document_delivery: true,
  collection_request: true,
  document_signed_owner_notify: true,
  admin_user_message: true,
  smtp_test: true,
  bulk_campaign: true,
  otp_verification: true,
  business_welcome: true,
  billing_reminders: true,
  billing_receipts: true,
  gigs_notifications: true,
  gigs_safety: true,
  docrud_go_welcome: true,
};

export async function getMailPolicies(): Promise<MailPolicies> {
  const stored = await readJsonFile<Partial<MailPolicies>>(mailPoliciesPath, defaultMailPolicies);
  return { ...defaultMailPolicies, ...(stored || {}) };
}

export async function saveMailPolicies(next: MailPolicies) {
  const cleaned: MailPolicies = {
    document_delivery: Boolean(next.document_delivery),
    collection_request: Boolean(next.collection_request),
    document_signed_owner_notify: Boolean(next.document_signed_owner_notify),
    admin_user_message: Boolean(next.admin_user_message),
    smtp_test: Boolean(next.smtp_test),
    bulk_campaign: Boolean(next.bulk_campaign),
    otp_verification: Boolean(next.otp_verification),
    business_welcome: Boolean(next.business_welcome),
    billing_reminders: Boolean(next.billing_reminders),
    billing_receipts: Boolean(next.billing_receipts),
    gigs_notifications: Boolean(next.gigs_notifications),
    gigs_safety: Boolean(next.gigs_safety),
    docrud_go_welcome: Boolean(next.docrud_go_welcome),
  };
  await writeJsonFile(mailPoliciesPath, cleaned);
}
