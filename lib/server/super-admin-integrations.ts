import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';

const configPath = path.join(process.cwd(), 'data', 'integrations-config.json');

export interface GoogleAnalyticsConfig {
  enabled: boolean;
  measurementId: string;
  apiSecret: string;
}

export interface RazorpayConfig {
  enabled: boolean;
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  testMode: boolean;
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  label: string;
  events: string[];
  enabled: boolean;
  secret: string;
  createdAt: string;
}

export interface SlackConfig {
  enabled: boolean;
  webhookUrl: string;
  channel: string;
  notifyOnSignup: boolean;
  notifyOnPayment: boolean;
  notifyOnAlert: boolean;
}

export interface IntegrationsConfig {
  googleAnalytics: GoogleAnalyticsConfig;
  razorpay: RazorpayConfig;
  slack: SlackConfig;
  webhooks: WebhookEndpoint[];
  updatedAt: string;
}

const defaultConfig: IntegrationsConfig = {
  googleAnalytics: { enabled: false, measurementId: '', apiSecret: '' },
  razorpay: { enabled: false, keyId: process.env.RAZORPAY_KEY_ID || '', keySecret: '', webhookSecret: '', testMode: true },
  slack: { enabled: false, webhookUrl: '', channel: '#alerts', notifyOnSignup: true, notifyOnPayment: true, notifyOnAlert: true },
  webhooks: [],
  updatedAt: new Date().toISOString(),
};

export function getIntegrationsConfig(): IntegrationsConfig {
  try {
    if (!existsSync(configPath)) return defaultConfig;
    return { ...defaultConfig, ...JSON.parse(readFileSync(configPath, 'utf-8')) };
  } catch {
    return defaultConfig;
  }
}

export function saveIntegrationsConfig(config: Partial<IntegrationsConfig>) {
  const current = getIntegrationsConfig();
  const next = { ...current, ...config, updatedAt: new Date().toISOString() };
  writeFileSync(configPath, JSON.stringify(next, null, 2), 'utf-8');
}

export async function sendGoogleAnalyticsEvent(measurementId: string, apiSecret: string, events: object[]) {
  if (!measurementId || !apiSecret) return;
  try {
    await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: 'super-admin', events }),
    });
  } catch { /* non-critical */ }
}

export async function sendSlackNotification(message: string) {
  const cfg = getIntegrationsConfig();
  if (!cfg.slack.enabled || !cfg.slack.webhookUrl) return;
  try {
    await fetch(cfg.slack.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message, channel: cfg.slack.channel }),
    });
  } catch { /* non-critical */ }
}
