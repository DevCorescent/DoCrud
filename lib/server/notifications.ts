import { DocumentHistory, User, WorkspaceNotification } from '@/types/document';
import { notificationStatePath, readJsonFile, writeJsonFile } from '@/lib/server/storage';
import { getVisibleInternalMailThreads } from '@/lib/server/internal-mailbox';
import { getHistoryEntries } from '@/lib/server/history';
import { buildBillingThreshold } from '@/lib/server/billing';
import { getUserUsageSummary } from '@/lib/server/saas';
import { getVisibleDealRooms } from '@/lib/server/deal-rooms';

type NotificationState = {
  readMap: Record<string, string[]>;
};

const emptyState: NotificationState = {
  readMap: {},
};

function isRead(state: NotificationState, userId: string, notificationId: string) {
  return (state.readMap[userId] || []).includes(notificationId);
}

function addNotification(list: WorkspaceNotification[], item: WorkspaceNotification) {
  if (!list.some((entry) => entry.id === item.id)) {
    list.push(item);
  }
}

function buildFeedbackNotifications(history: DocumentHistory[], user: User, state: NotificationState) {
  if (user.workspaceAccessMode === 'board_room_only') {
    return [];
  }
  const notifications: WorkspaceNotification[] = [];
  const relevant = user.role === 'admin'
    ? history
    : user.role === 'client'
      ? history.filter((entry) => entry.organizationId === user.id || entry.generatedBy?.toLowerCase() === user.email.toLowerCase())
      : user.role === 'member' && user.organizationId
        ? history.filter((entry) => entry.organizationId === user.organizationId)
        : history.filter((entry) => entry.generatedBy?.toLowerCase() === user.email.toLowerCase());

  relevant.forEach((entry) => {
    (entry.collaborationComments || []).forEach((comment) => {
      if (comment.repliedBy) return;
      const notificationId = `feedback-${comment.id}`;
      addNotification(notifications, {
        id: notificationId,
        type: 'feedback',
        title: `${comment.type === 'review' ? 'Review' : 'Comment'} on ${entry.templateName}`,
        body: `${comment.authorName} left feedback that still needs a response.`,
        href: '/workspace?tab=dashboard',
        createdAt: comment.createdAt,
        read: isRead(state, user.id, notificationId),
        tone: 'amber',
        metadata: {
          documentId: entry.id,
          status: 'needs_reply',
        },
      });
    });
  });

  return notifications;
}

async function buildMailboxNotifications(user: User, state: NotificationState) {
  const notifications: WorkspaceNotification[] = [];
  const threads = await getVisibleInternalMailThreads(user);

  threads.forEach((thread) => {
    const unreadMessages = thread.messages.filter((message) =>
      message.senderId !== user.id && !(message.readBy || []).includes(user.email.toLowerCase()),
    );

    unreadMessages.forEach((message) => {
      const notificationId = `mail-${message.id}`;
      addNotification(notifications, {
        id: notificationId,
        type: 'mail',
        title: `New internal message from ${message.senderName}`,
        body: `${thread.subject}: ${message.body.slice(0, 96)}${message.body.length > 96 ? '...' : ''}`,
        href: '/workspace?tab=internal-mailbox',
        createdAt: message.createdAt,
        read: isRead(state, user.id, notificationId),
        tone: 'sky',
        metadata: {
          threadId: thread.id,
          status: message.status || 'sent',
        },
      });
    });
  });

  return notifications;
}

async function buildBillingNotifications(user: User, state: NotificationState) {
  if (user.workspaceAccessMode === 'board_room_only') return [] as WorkspaceNotification[];
  if (user.role === 'admin') return [] as WorkspaceNotification[];

  const { usage } = await getUserUsageSummary(user);
  const threshold = buildBillingThreshold(usage.thresholdPercentUsed ?? 0, usage.remainingGenerations);
  if (threshold.state === 'healthy') return [];

  const notificationId = `billing-${threshold.state}-${usage.cycleEndAt || 'current'}`;
  return [{
    id: notificationId,
    type: 'billing',
    title: threshold.state === 'limit_reached' ? 'Plan limit reached' : 'Plan usage alert',
    body: threshold.recommendation,
    href: '/workspace?tab=billing',
    createdAt: new Date().toISOString(),
    read: isRead(state, user.id, notificationId),
    tone: threshold.state === 'limit_reached' ? 'rose' : threshold.state === 'critical' ? 'amber' : 'default',
    metadata: {
      status: threshold.state,
    },
  }];
}

async function buildBoardRoomNotifications(user: User, state: NotificationState) {
  const rooms = await getVisibleDealRooms(user);
  const notifications: WorkspaceNotification[] = [];
  const now = Date.now();

  rooms.forEach((room) => {
    const userParticipant = room.participants.find((participant) => participant.userId === user.id);
    const pendingRequest = room.accessRequests.find((request) => request.userId === user.id && request.status === 'pending');
    const approvedRequest = room.accessRequests.find((request) => request.userId === user.id && request.status === 'approved');
    const ownedPendingRequests = room.accessRequests.filter((request) => request.status === 'pending');
    const assignedTasks = room.tasks.filter((task) => task.ownerId === user.id && task.status !== 'done');
    const recentParticipantNotice = room.activity.find((activity) => activity.type === 'participant_added' && activity.createdAt >= (user.lastLogin || user.createdAt));
    const lastVisibleMessage = room.messages.find((message) => {
      if (message.authorId === user.id) {
        return false;
      }
      if (message.visibility === 'internal_only' && userParticipant?.roleType === 'external' && user.role !== 'admin' && user.role !== 'client') {
        return false;
      }
      return message.createdAt >= (user.lastLogin || user.createdAt);
    });

    if (recentParticipantNotice && userParticipant) {
      const notificationId = `board-room-member-${room.id}`;
      addNotification(notifications, {
        id: notificationId,
        type: 'system',
        title: `You were added to ${room.title}`,
        body: `Open the board room to review your access and current stage.`,
        href: `/workspace?tab=deal-room`,
        createdAt: recentParticipantNotice.createdAt,
        read: isRead(state, user.id, notificationId),
        tone: 'sky',
      });
    }

    assignedTasks.forEach((task) => {
      const notificationId = `board-room-task-${task.id}`;
      addNotification(notifications, {
        id: notificationId,
        type: 'system',
        title: `Board room task: ${task.title}`,
        body: `${room.title} has an open task assigned to you${task.dueAt ? ` before ${new Date(task.dueAt).toLocaleDateString()}` : ''}.`,
        href: `/workspace?tab=deal-room`,
        createdAt: task.updatedAt,
        read: isRead(state, user.id, notificationId),
        tone: task.status === 'blocked' ? 'rose' : 'default',
      });
    });

    if (pendingRequest) {
      const notificationId = `board-room-request-${pendingRequest.id}`;
      addNotification(notifications, {
        id: notificationId,
        type: 'system',
        title: `Board room access pending`,
        body: `Your request to join ${room.title} is waiting for approval.`,
        href: `/workspace?tab=deal-room`,
        createdAt: pendingRequest.requestedAt,
        read: isRead(state, user.id, notificationId),
        tone: 'amber',
      });
    }

    if (approvedRequest) {
      const notificationId = `board-room-approved-${approvedRequest.id}`;
      addNotification(notifications, {
        id: notificationId,
        type: 'system',
        title: `Board room access approved`,
        body: `Your request to join ${room.title} was approved. Open the board room from your workspace.`,
        href: `/workspace?tab=deal-room`,
        createdAt: approvedRequest.reviewedAt || approvedRequest.requestedAt,
        read: isRead(state, user.id, notificationId),
        tone: 'emerald',
      });
    }

    if (lastVisibleMessage) {
      const notificationId = `board-room-message-${room.id}-${lastVisibleMessage.id}`;
      addNotification(notifications, {
        id: notificationId,
        type: 'system',
        title: `${room.title} has a new message`,
        body:
          lastVisibleMessage.visibility === 'internal_only'
            ? `${lastVisibleMessage.authorName} posted a secure internal board room update.`
            : `${lastVisibleMessage.authorName} posted a new board room message.`,
        href: `/workspace?tab=deal-room`,
        createdAt: lastVisibleMessage.createdAt,
        read: isRead(state, user.id, notificationId),
        tone: 'sky',
      });
    }

    if ((user.role === 'admin' || user.role === 'client' || userParticipant?.accessLevel === 'approver') && ownedPendingRequests.length > 0) {
      const latest = ownedPendingRequests[0];
      const notificationId = `board-room-owned-request-${room.id}`;
      addNotification(notifications, {
        id: notificationId,
        type: 'system',
        title: `Approval needed in ${room.title}`,
        body: `${ownedPendingRequests.length} join request${ownedPendingRequests.length > 1 ? 's are' : ' is'} waiting for your review.`,
        href: `/workspace?tab=deal-room`,
        createdAt: latest.requestedAt,
        read: isRead(state, user.id, notificationId),
        tone: 'amber',
      });
    }

    if (room.targetCloseDate) {
      const deadlineMs = new Date(room.targetCloseDate).getTime();
      const daysLeft = Math.ceil((deadlineMs - now) / (24 * 60 * 60 * 1000));
      if (daysLeft <= 5 && room.stage !== 'signed' && room.stage !== 'closed') {
        const notificationId = `board-room-deadline-${room.id}`;
        addNotification(notifications, {
          id: notificationId,
          type: 'system',
          title: `Deadline approaching for ${room.title}`,
          body: daysLeft <= 0 ? 'The target close date is due now. Move the room forward or reset the timeline.' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left to close this board room.`,
          href: `/workspace?tab=deal-room`,
          createdAt: room.updatedAt,
          read: isRead(state, user.id, notificationId),
          tone: daysLeft <= 1 ? 'rose' : 'amber',
        });
      }
    }
  });

  return notifications;
}

export async function getNotificationState() {
  return readJsonFile<NotificationState>(notificationStatePath, emptyState);
}

export async function saveNotificationState(state: NotificationState) {
  await writeJsonFile(notificationStatePath, state);
}

export async function getWorkspaceNotifications(user: User) {
  const state = await getNotificationState();
  const [history, mailNotifications, billingNotifications, boardRoomNotifications] = await Promise.all([
    getHistoryEntries(),
    buildMailboxNotifications(user, state),
    buildBillingNotifications(user, state),
    buildBoardRoomNotifications(user, state),
  ]);

  const feedbackNotifications = buildFeedbackNotifications(history, user, state);
  const all = [...mailNotifications, ...feedbackNotifications, ...billingNotifications, ...boardRoomNotifications]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

  return {
    notifications: all,
    unreadCount: all.filter((entry) => !entry.read).length,
  };
}

export async function markWorkspaceNotificationsRead(userId: string, notificationIds: string[]) {
  const state = await getNotificationState();
  const existing = new Set(state.readMap[userId] || []);
  notificationIds.forEach((id) => existing.add(id));
  const nextState: NotificationState = {
    ...state,
    readMap: {
      ...state.readMap,
      [userId]: Array.from(existing),
    },
  };
  await saveNotificationState(nextState);
  return nextState;
}
