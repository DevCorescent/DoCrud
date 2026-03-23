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
  await ensureDirectory(filePath);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}
