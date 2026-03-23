import { CollaborationSettings, MailSettings, SignatureSettings, WorkflowAutomationSettings } from '@/types/document';
import { automationSettingsPath, collaborationSettingsPath, mailSettingsPath, readJsonFile, signatureSettingsPath, writeJsonFile } from '@/lib/server/storage';

export const defaultMailSettings: MailSettings = {
  host: '',
  port: 587,
  secure: false,
  requireAuth: true,
  username: '',
  password: '',
  fromName: 'Corescent Technologies',
  fromEmail: '',
  replyTo: '',
  testRecipient: '',
};

export const defaultAutomationSettings: WorkflowAutomationSettings = {
  autoGenerateReferenceNumber: true,
  autoStampGeneratedBy: true,
  autoBccAuditMailbox: false,
  auditMailbox: '',
  autoCcGenerator: false,
  enableDeliveryTracking: true,
};

export const defaultSignatureSettings: SignatureSettings = {
  signatures: [],
};

export const defaultCollaborationSettings: CollaborationSettings = {
  defaultRecipientAccess: 'comment',
};

export async function getMailSettings() {
  const settings = await readJsonFile<Partial<MailSettings>>(mailSettingsPath, defaultMailSettings);
  return { ...defaultMailSettings, ...settings };
}

export async function saveMailSettings(settings: MailSettings) {
  await writeJsonFile(mailSettingsPath, settings);
}

export async function getAutomationSettings() {
  const settings = await readJsonFile<Partial<WorkflowAutomationSettings>>(automationSettingsPath, defaultAutomationSettings);
  return { ...defaultAutomationSettings, ...settings };
}

export async function saveAutomationSettings(settings: WorkflowAutomationSettings) {
  await writeJsonFile(automationSettingsPath, settings);
}

export async function getSignatureSettings() {
  const settings = await readJsonFile<Partial<SignatureSettings>>(signatureSettingsPath, defaultSignatureSettings);
  return { ...defaultSignatureSettings, ...settings };
}

export async function saveSignatureSettings(settings: SignatureSettings) {
  await writeJsonFile(signatureSettingsPath, settings);
}

export async function getCollaborationSettings() {
  const settings = await readJsonFile<Partial<CollaborationSettings>>(collaborationSettingsPath, defaultCollaborationSettings);
  return { ...defaultCollaborationSettings, ...settings };
}

export async function saveCollaborationSettings(settings: CollaborationSettings) {
  await writeJsonFile(collaborationSettingsPath, settings);
}
