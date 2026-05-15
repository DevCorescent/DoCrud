import { promises as fs } from 'fs';
import path from 'path';
import { getAppStateKey, isDatabaseConfigured, readAppState, writeAppState } from '@/lib/server/database';

export const dataDir = path.join(process.cwd(), 'data');
export const customTemplatesPath = path.join(dataDir, 'custom', 'templates.json');
export const historyFilePath = path.join(dataDir, 'history.json');
export const usersPath = path.join(dataDir, 'users.json');
export const mailSettingsPath = path.join(dataDir, 'mail-settings.json');
export const emailOutboxPath = path.join(dataDir, 'email-outbox.json');
export const authSettingsPath = path.join(dataDir, 'auth-settings.json');
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
export const parserHistoryPath = path.join(dataDir, 'parser-history.json');
export const fileTransfersPath = path.join(dataDir, 'file-transfers.json');
export const fileDirectoryLockersPath = path.join(dataDir, 'file-directory-lockers.json');
export const fileManagerFoldersPath = path.join(dataDir, 'file-manager-folders.json');
export const billingTransactionsPath = path.join(dataDir, 'billing-transactions.json');
export const couponCodesPath = path.join(dataDir, 'coupons.json');
export const referralProgramPath = path.join(dataDir, 'referrals.json');
export const gigsSafetyReportsPath = path.join(dataDir, 'gigs-safety-reports.json');
export const internalMailboxPath = path.join(dataDir, 'internal-mailbox.json');
export const dealRoomsPath = path.join(dataDir, 'deal-rooms.json');
export const meetingRoomsPath = path.join(dataDir, 'meeting-rooms.json');
export const notificationStatePath = path.join(dataDir, 'notifications.json');
export const userActivityPath = path.join(dataDir, 'user-activity.json');
export const userFeedbackPath = path.join(dataDir, 'user-feedback.json');
export const adminAuditPath = path.join(dataDir, 'admin-audit.json');
export const hiringJobsPath = path.join(dataDir, 'hiring-jobs.json');
export const hiringApplicationsPath = path.join(dataDir, 'hiring-applications.json');
export const gigsPath = path.join(dataDir, 'gigs.json');
export const gigConnectionsPath = path.join(dataDir, 'gig-connections.json');
export const gigBidsPath = path.join(dataDir, 'gig-bids.json');
export const docrudiansPath = path.join(dataDir, 'docrudians.json');
export const virtualIdsPath = path.join(dataDir, 'virtual-ids.json');
export const certificatesPath = path.join(dataDir, 'certificates.json');
export const docwordDocumentsPath = path.join(dataDir, 'docword-documents.json');
export const blogPostsPath = path.join(dataDir, 'blog-posts.json');
export const webTelemetryPath = path.join(dataDir, 'web-telemetry.json');
export const securityBlocklistPath = path.join(dataDir, 'security-blocklist.json');
export const knowledgeBasePath = path.join(dataDir, 'knowledge-base.json');
export const webSourcesPath = path.join(dataDir, 'web-sources.json');
export const resumeDirectoryPath = path.join(dataDir, 'resume-directory.json');
export const earlyAccessFeaturesPath = path.join(dataDir, 'early-access-features.json');
export const earlyAccessWaitlistPath = path.join(dataDir, 'early-access-waitlist.json');
export const earlyAccessWishesPath = path.join(dataDir, 'early-access-wishes.json');
export const earlyAccessOtpsPath = path.join(dataDir, 'early-access-otps.json');
export const resumeConnectPurchasesPath = path.join(dataDir, 'resume-connect-purchases.json');
export const resumeConnectLeadsPath = path.join(dataDir, 'resume-connect-leads.json');
export const gigConnectPurchasesPath = path.join(dataDir, 'gig-connect-purchases.json');
export const templateMarketplaceItemsPath = path.join(dataDir, 'template-marketplace-items.json');
export const templateMarketplacePurchasesPath = path.join(dataDir, 'template-marketplace-purchases.json');
export const templateMarketplaceReviewsPath = path.join(dataDir, 'template-marketplace-reviews.json');
export const templateMarketplaceIncomePath = path.join(dataDir, 'template-marketplace-income.json');
export const templateMarketplaceWithdrawalsPath = path.join(dataDir, 'template-marketplace-withdrawals.json');
export const mailCampaignsPath = path.join(dataDir, 'mail-campaigns.json');
export const mailPoliciesPath = path.join(dataDir, 'mail-policies.json');
export const otpSessionsPath = path.join(dataDir, 'otp-sessions.json');
export const homepageAiChatsPath = path.join(dataDir, 'homepage-ai-chats.json');
export const userProfilesPath = path.join(dataDir, 'user-profiles.json');
export const followsPath = path.join(dataDir, 'follows.json');
export const upraisedPath = path.join(dataDir, 'upraised.json');
export const socialEventsPath = path.join(dataDir, 'social-events.json');

export async function ensureDirectory(filePath: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

export async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  const appStateKey = getAppStateKey(filePath);

  if (isDatabaseConfigured()) {
    try {
      const databaseValue = await readAppState<T>(appStateKey);
      if (databaseValue !== null) {
        return databaseValue;
      }
    } catch (error) {
      console.error(`Failed to read app state from database for ${appStateKey}`, error);
    }
  }

  try {
    const content = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(content) as T;

    if (isDatabaseConfigured()) {
      try {
        await writeAppState(appStateKey, parsed);
      } catch (error) {
        console.error(`Failed to seed app state into database for ${appStateKey}`, error);
      }
    }

    return parsed;
  } catch {
    return fallback;
  }
}

export async function writeJsonFile<T>(filePath: string, data: T) {
  if (isDatabaseConfigured()) {
    try {
      await writeAppState(getAppStateKey(filePath), data);
      return;
    } catch (error) {
      console.error(`Failed to write app state to database for ${getAppStateKey(filePath)}`, error);
      throw error;
    }
  }

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
