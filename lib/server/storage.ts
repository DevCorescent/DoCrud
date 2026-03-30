import { promises as fs } from 'fs';
import path from 'path';

export const dataDir = path.join(process.cwd(), 'data');
export const customTemplatesPath = path.join(dataDir, 'custom', 'templates.json');
export const historyFilePath = path.join(dataDir, 'history.json');
export const usersPath = path.join(dataDir, 'users.json');
export const mailSettingsPath = path.join(dataDir, 'mail-settings.json');
export const automationSettingsPath = path.join(dataDir, 'automation-settings.json');
export const collaborationSettingsPath = path.join(dataDir, 'collaboration-settings.json');
export const signatureSettingsPath = path.join(dataDir, 'signature-settings.json');
export const roleProfilesPath = path.join(dataDir, 'role-profiles.json');
export const dropdownOptionsPath = path.join(dataDir, 'dropdown-options.json');
export const themeSettingsPath = path.join(dataDir, 'theme-settings.json');
export const platformConfigPath = path.join(dataDir, 'platform-config.json');
export const landingSettingsPath = path.join(dataDir, 'landing-settings.json');
export const contactRequestsPath = path.join(dataDir, 'contact-requests.json');
export const saasPlansPath = path.join(dataDir, 'saas-plans.json');
export const businessSettingsPath = path.join(dataDir, 'business-settings.json');

export async function ensureDirectory(filePath: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

export async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content) as T;
  } catch {
    return fallback;
  }
}

export async function writeJsonFile<T>(filePath: string, data: T) {
  try {
    await ensureDirectory(filePath);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error) {
      const code = String(error.code);
      if (code === 'EROFS' || code === 'EPERM' || code === 'EACCES') {
        throw new Error('Persistent writes are not available on this deployment. Configure a database or hosted key-value store for production workspace creation.');
      }
    }
    throw error;
  }
}
