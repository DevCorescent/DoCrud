import crypto from 'crypto';
import { readJsonFile, writeJsonFile, messagesPath, followsPath } from '@/lib/server/storage';

export interface ReplyTo {
  id: string;
  content: string;
  senderId: string;
  type: 'text' | 'image' | 'file';
  attachmentName?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'file';
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentSize?: number;
  attachmentMimeType?: string;
  sentAt: string;
  seenBy: string[];
  replyTo?: ReplyTo;
  edited?: boolean;
  editedAt?: string;
  deleted?: boolean;
  deletedAt?: string;
}

export interface Conversation {
  id: string;
  participants: string[];
  status: 'active' | 'request' | 'rejected';
  requestFrom?: string;
  source?: 'service';
  createdAt: string;
  updatedAt: string;
  lastMessage?: {
    content: string;
    senderId: string;
    sentAt: string;
    type: string;
  };
  unreadCount: Record<string, number>;
}

export interface ChatMeta {
  label?: string;        // e.g. 'Work', 'Client', 'Important'
  labelColor?: string;   // hex e.g. '#3b82f6'
  bgColor?: string;      // custom chat bg key e.g. 'navy', 'forest', 'default'
  notes?: string;        // private per-user notes
  pinnedAt?: string;     // ISO date if pinned
}

export interface AutoReplySettings {
  enabled: boolean;
  message: string;
  cooldownMinutes: number;           // min gap between auto-replies per conversation
  lastSentAt: Record<string, string>; // convId → ISO timestamp of last auto-reply sent
}

export interface QuickReply {
  id: string;
  title: string;   // short label shown in picker
  content: string; // message content
}

export interface BusinessTool {
  id: string;
  label: string;    // e.g. "Calendly", "UPI ID", "WhatsApp"
  value: string;    // URL / phone / UPI / email
  extra?: string;   // optional note / description
}

export interface BusinessProfile {
  catalogues: BusinessTool[];
  meetings: BusinessTool[];
  payments: BusinessTool[];
  contacts: BusinessTool[];
}

interface MessagesData {
  conversations: Record<string, Conversation>;
  messages: Record<string, Message[]>;
  typingStatus: Record<string, Record<string, number>>;
  // messageIndex[userId][convId] = array of bookmarked message IDs
  messageIndex: Record<string, Record<string, string[]>>;
  // chatMeta[userId][convId] = per-user metadata (labels, bg, notes, pin)
  chatMeta: Record<string, Record<string, ChatMeta>>;
  // autoReply[userId] = auto-reply configuration
  autoReply: Record<string, AutoReplySettings>;
  // quickReplies[userId] = array of saved quick-reply templates
  quickReplies: Record<string, QuickReply[]>;
  businessProfiles: Record<string, BusinessProfile>;
}

async function getData(): Promise<MessagesData> {
  return readJsonFile<MessagesData>(messagesPath, {
    conversations: {},
    messages: {},
    typingStatus: {},
    messageIndex: {},
    chatMeta: {},
    autoReply: {},
    quickReplies: {},
    businessProfiles: {},
  });
}

async function saveData(data: MessagesData): Promise<void> {
  await writeJsonFile(messagesPath, data);
}

async function areMutualFollowers(userA: string, userB: string): Promise<boolean> {
  const follows = await readJsonFile<Record<string, string[]>>(followsPath, {});
  const aFollowsB = (follows[userA] ?? []).includes(userB);
  const bFollowsA = (follows[userB] ?? []).includes(userA);
  return aFollowsB && bFollowsA;
}

export async function getOrCreateConversation(
  fromUserId: string,
  toUserId: string,
  source?: 'service'
): Promise<{ conversation: Conversation; created: boolean }> {
  const data = await getData();

  // Check if conversation already exists between these two users
  const existing = Object.values(data.conversations).find(
    (c) =>
      c.participants.includes(fromUserId) &&
      c.participants.includes(toUserId) &&
      c.participants.length === 2
  );

  if (existing) {
    // Upgrade source to 'service' if not already set and this is a service-initiated open
    if (source === 'service' && !existing.source) {
      existing.source = 'service';
      data.conversations[existing.id] = existing;
      await saveData(data);
    }
    return { conversation: existing, created: false };
  }

  const mutual = await areMutualFollowers(fromUserId, toUserId);
  const status: Conversation['status'] = mutual ? 'active' : 'request';

  const id = `conv_${crypto.randomBytes(8).toString('hex')}`;
  const now = new Date().toISOString();
  const conversation: Conversation = {
    id,
    participants: [fromUserId, toUserId],
    status,
    requestFrom: mutual ? undefined : fromUserId,
    ...(source ? { source } : {}),
    createdAt: now,
    updatedAt: now,
    unreadCount: { [fromUserId]: 0, [toUserId]: 0 },
  };

  data.conversations[id] = conversation;
  data.messages[id] = [];
  await saveData(data);

  return { conversation, created: true };
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string,
  type: Message['type'] = 'text',
  attachment?: Pick<Message, 'attachmentUrl' | 'attachmentName' | 'attachmentSize' | 'attachmentMimeType'>,
  replyTo?: ReplyTo
): Promise<Message> {
  const data = await getData();
  const conv = data.conversations[conversationId];
  if (!conv) throw new Error('Conversation not found');

  const id = `msg_${crypto.randomBytes(8).toString('hex')}`;
  const now = new Date().toISOString();

  const message: Message = {
    id,
    conversationId,
    senderId,
    content,
    type,
    ...attachment,
    sentAt: now,
    seenBy: [senderId],
    ...(replyTo ? { replyTo } : {}),
  };

  if (!data.messages[conversationId]) data.messages[conversationId] = [];
  data.messages[conversationId].push(message);

  // Update conversation metadata
  const displayContent = type === 'image' ? '📷 Image' : type === 'file' ? `📎 ${attachment?.attachmentName ?? 'File'}` : content;
  data.conversations[conversationId].lastMessage = {
    content: displayContent,
    senderId,
    sentAt: now,
    type,
  };
  data.conversations[conversationId].updatedAt = now;

  // Increment unread for all other participants
  for (const participant of conv.participants) {
    if (participant !== senderId) {
      data.conversations[conversationId].unreadCount[participant] =
        (data.conversations[conversationId].unreadCount[participant] ?? 0) + 1;
    }
  }

  await saveData(data);
  return message;
}

export async function getConversations(userId: string): Promise<Conversation[]> {
  const data = await getData();
  return Object.values(data.conversations)
    .filter((c) => c.participants.includes(userId))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const data = await getData();
  return (data.messages[conversationId] ?? []).filter((m) => !m.deleted);
}

export async function markAsRead(conversationId: string, userId: string): Promise<void> {
  const data = await getData();
  if (!data.conversations[conversationId]) return;

  // Mark all messages as seen by this user
  if (data.messages[conversationId]) {
    data.messages[conversationId] = data.messages[conversationId].map((m) =>
      m.seenBy.includes(userId) ? m : { ...m, seenBy: [...m.seenBy, userId] }
    );
  }

  // Reset unread count
  data.conversations[conversationId].unreadCount[userId] = 0;
  await saveData(data);
}

export async function setTyping(conversationId: string, userId: string, isTyping: boolean): Promise<void> {
  const data = await getData();
  if (!data.typingStatus) data.typingStatus = {};
  if (!data.typingStatus[conversationId]) data.typingStatus[conversationId] = {};

  if (isTyping) {
    data.typingStatus[conversationId][userId] = Date.now();
  } else {
    delete data.typingStatus[conversationId][userId];
  }
  await saveData(data);
}

export async function getTypingUsers(conversationId: string, excludeUserId: string): Promise<string[]> {
  const data = await getData();
  const typingData = data.typingStatus?.[conversationId] ?? {};
  const cutoff = Date.now() - 4000; // 4-second TTL
  return Object.entries(typingData)
    .filter(([uid, ts]) => uid !== excludeUserId && ts > cutoff)
    .map(([uid]) => uid);
}

export async function acceptRequest(conversationId: string, userId: string): Promise<void> {
  const data = await getData();
  const conv = data.conversations[conversationId];
  if (!conv) throw new Error('Conversation not found');
  if (!conv.participants.includes(userId)) throw new Error('Not a participant');
  conv.status = 'active';
  conv.requestFrom = undefined;
  await saveData(data);
}

export async function rejectRequest(conversationId: string, userId: string): Promise<void> {
  const data = await getData();
  const conv = data.conversations[conversationId];
  if (!conv) throw new Error('Conversation not found');
  if (!conv.participants.includes(userId)) throw new Error('Not a participant');
  conv.status = 'rejected';
  await saveData(data);
}

export async function getPollData(
  userId: string,
  conversationId: string,
  since: number
): Promise<{
  newMessages: Message[];
  typingUsers: string[];
  conversations: Conversation[];
  deletedMessageIds: string[];
}> {
  const data = await getData();

  const newMessages = (data.messages[conversationId] ?? []).filter(
    (m) => new Date(m.sentAt).getTime() > since && !m.deleted
  );

  // Messages deleted since `since` — so clients can remove them in real time
  const deletedMessageIds = (data.messages[conversationId] ?? [])
    .filter(
      (m) =>
        m.deleted &&
        m.deletedAt &&
        new Date(m.deletedAt).getTime() > since
    )
    .map((m) => m.id);

  const cutoff = Date.now() - 4000;
  const typingData = data.typingStatus?.[conversationId] ?? {};
  const typingUsers = Object.entries(typingData)
    .filter(([uid, ts]) => uid !== userId && ts > cutoff)
    .map(([uid]) => uid);

  const conversations = Object.values(data.conversations)
    .filter((c) => c.participants.includes(userId))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return { newMessages, typingUsers, conversations, deletedMessageIds };
}

export async function getTotalUnread(userId: string): Promise<number> {
  const data = await getData();
  return Object.values(data.conversations)
    .filter((c) => c.participants.includes(userId) && c.status === 'active')
    .reduce((sum, c) => sum + (c.unreadCount[userId] ?? 0), 0);
}

export async function getMessageRequests(userId: string): Promise<Conversation[]> {
  const data = await getData();
  return Object.values(data.conversations).filter(
    (c) => c.participants.includes(userId) && c.status === 'request' && c.requestFrom !== userId
  );
}

export async function toggleMessageIndex(
  conversationId: string,
  messageId: string,
  userId: string
): Promise<{ indexed: boolean }> {
  const data = await getData();
  if (!data.messageIndex) data.messageIndex = {};
  if (!data.messageIndex[userId]) data.messageIndex[userId] = {};
  if (!data.messageIndex[userId][conversationId]) data.messageIndex[userId][conversationId] = [];

  const arr = data.messageIndex[userId][conversationId];
  const pos = arr.indexOf(messageId);
  if (pos === -1) {
    arr.push(messageId);
    await saveData(data);
    return { indexed: true };
  } else {
    arr.splice(pos, 1);
    await saveData(data);
    return { indexed: false };
  }
}

export async function getMessageIndex(
  conversationId: string,
  userId: string
): Promise<string[]> {
  const data = await getData();
  return data.messageIndex?.[userId]?.[conversationId] ?? [];
}

export async function getChatMeta(
  conversationId: string,
  userId: string
): Promise<ChatMeta> {
  const data = await getData();
  return data.chatMeta?.[userId]?.[conversationId] ?? {};
}

export async function setChatMeta(
  conversationId: string,
  userId: string,
  patch: Partial<ChatMeta>
): Promise<ChatMeta> {
  const data = await getData();
  if (!data.chatMeta) data.chatMeta = {};
  if (!data.chatMeta[userId]) data.chatMeta[userId] = {};
  const existing = data.chatMeta[userId][conversationId] ?? {};
  // Allow clearing fields by passing null/empty string explicitly
  const updated: ChatMeta = { ...existing, ...patch };
  data.chatMeta[userId][conversationId] = updated;
  await saveData(data);
  return updated;
}

export async function getAllChatMeta(
  userId: string
): Promise<Record<string, ChatMeta>> {
  const data = await getData();
  return data.chatMeta?.[userId] ?? {};
}

/* ── Auto-reply ─────────────────────────────────────────── */

const DEFAULT_AUTO_REPLY: AutoReplySettings = {
  enabled: false,
  message: "Thanks for your message! I'm currently unavailable but will get back to you as soon as possible.",
  cooldownMinutes: 30,
  lastSentAt: {},
};

export async function getAutoReply(userId: string): Promise<AutoReplySettings> {
  const data = await getData();
  return data.autoReply?.[userId] ?? { ...DEFAULT_AUTO_REPLY };
}

export async function setAutoReply(
  userId: string,
  patch: Partial<Omit<AutoReplySettings, 'lastSentAt'>>
): Promise<AutoReplySettings> {
  const data = await getData();
  if (!data.autoReply) data.autoReply = {};
  const existing = data.autoReply[userId] ?? { ...DEFAULT_AUTO_REPLY };
  const updated: AutoReplySettings = { ...existing, ...patch };
  data.autoReply[userId] = updated;
  await saveData(data);
  return updated;
}

// Called server-side after a message is received — fires auto-reply if configured
export async function triggerAutoReply(
  conversationId: string,
  recipientId: string,      // the user who has auto-reply
  triggeredByUserId: string // the person who sent the message
): Promise<void> {
  const data = await getData();
  const settings = data.autoReply?.[recipientId];
  if (!settings?.enabled || !settings.message?.trim()) return;

  // Respect cooldown
  const lastSent = settings.lastSentAt?.[conversationId];
  if (lastSent) {
    const elapsed = (Date.now() - new Date(lastSent).getTime()) / 60000;
    if (elapsed < (settings.cooldownMinutes ?? 30)) return;
  }

  // Don't auto-reply to yourself
  if (recipientId === triggeredByUserId) return;

  // Verify conversation exists and is active
  const conv = data.conversations[conversationId];
  if (!conv || conv.status !== 'active') return;

  // Send the auto-reply as the recipient
  const id = `msg_${crypto.randomBytes(8).toString('hex')}`;
  const now = new Date().toISOString();
  const autoMsg: Message = {
    id,
    conversationId,
    senderId: recipientId,
    content: settings.message,
    type: 'text',
    sentAt: now,
    seenBy: [recipientId],
  };

  if (!data.messages[conversationId]) data.messages[conversationId] = [];
  data.messages[conversationId].push(autoMsg);
  data.conversations[conversationId].lastMessage = { content: settings.message, senderId: recipientId, sentAt: now, type: 'text' };
  data.conversations[conversationId].updatedAt = now;

  // Increment unread for the trigger user
  data.conversations[conversationId].unreadCount[triggeredByUserId] =
    (data.conversations[conversationId].unreadCount[triggeredByUserId] ?? 0) + 1;

  // Record when we last auto-replied to this conversation
  if (!data.autoReply[recipientId].lastSentAt) data.autoReply[recipientId].lastSentAt = {};
  data.autoReply[recipientId].lastSentAt[conversationId] = now;

  await saveData(data);
}

/* ── Quick Replies ──────────────────────────────────────── */

export async function getQuickReplies(userId: string): Promise<QuickReply[]> {
  const data = await getData();
  return data.quickReplies?.[userId] ?? [];
}

export async function addQuickReply(
  userId: string,
  title: string,
  content: string
): Promise<QuickReply> {
  const data = await getData();
  if (!data.quickReplies) data.quickReplies = {};
  if (!data.quickReplies[userId]) data.quickReplies[userId] = [];
  const qr: QuickReply = { id: `qr_${crypto.randomBytes(6).toString('hex')}`, title: title.trim(), content: content.trim() };
  data.quickReplies[userId].push(qr);
  await saveData(data);
  return qr;
}

export async function deleteQuickReply(userId: string, id: string): Promise<void> {
  const data = await getData();
  if (!data.quickReplies?.[userId]) return;
  data.quickReplies[userId] = data.quickReplies[userId].filter(q => q.id !== id);
  await saveData(data);
}

export async function updateQuickReply(
  userId: string,
  id: string,
  title: string,
  content: string
): Promise<void> {
  const data = await getData();
  if (!data.quickReplies?.[userId]) return;
  const qr = data.quickReplies[userId].find(q => q.id === id);
  if (qr) { qr.title = title.trim(); qr.content = content.trim(); }
  await saveData(data);
}

/* ── Business Profile ───────────────────────────────────── */

const EMPTY_PROFILE: BusinessProfile = { catalogues: [], meetings: [], payments: [], contacts: [] };

export async function getBusinessProfile(userId: string): Promise<BusinessProfile> {
  const data = await getData();
  return data.businessProfiles?.[userId] ?? { ...EMPTY_PROFILE, catalogues: [], meetings: [], payments: [], contacts: [] };
}

export async function setBusinessProfile(userId: string, profile: BusinessProfile): Promise<BusinessProfile> {
  const data = await getData();
  if (!data.businessProfiles) data.businessProfiles = {};
  data.businessProfiles[userId] = profile;
  await saveData(data);
  return profile;
}

export async function deleteMessage(
  conversationId: string,
  messageId: string,
  userId: string
): Promise<void> {
  const data = await getData();
  const msgs = data.messages[conversationId];
  if (!msgs) throw new Error('Conversation not found');
  const msg = msgs.find((m) => m.id === messageId);
  if (!msg) throw new Error('Message not found');
  if (msg.senderId !== userId) throw new Error('Not your message');
  msg.deleted = true;
  msg.deletedAt = new Date().toISOString();
  await saveData(data);
}
