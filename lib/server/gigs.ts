import type { GigBid, GigConnectionRequest, GigListing, User } from '@/types/document';
import { gigBidsPath, gigConnectionsPath, gigsPath, readJsonFile, writeJsonFile } from '@/lib/server/storage';
import { getRazorpayConfig, verifyRazorpayPaymentSignature } from '@/lib/server/billing';

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

const defaultGigs: GigListing[] = [
  {
    id: 'gig-brand-system-refresh',
    slug: 'brand-system-refresh-for-saas-launch',
    ownerUserId: '1',
    ownerName: 'Northstar Ops',
    ownerEmail: 'admin@company.com',
    organizationName: 'Northstar Ops',
    title: 'Brand system refresh for a SaaS launch',
    summary: 'Need a product-minded designer to tighten brand basics, landing-page sections, and a cleaner rollout pack for launch month.',
    category: 'Design',
    interests: ['saas', 'brand design', 'launch'],
    skills: ['Figma', 'Brand systems', 'Landing pages'],
    deliverables: ['Brand direction board', 'Homepage refresh', 'Social launch kit'],
    budgetLabel: '₹35k - ₹60k',
    timelineLabel: '2 to 3 weeks',
    engagementType: 'one_time',
    locationPreference: 'remote',
    contactPreference: 'chat',
    visibility: 'public',
    status: 'published',
    featuredUntil: '2026-05-02T00:00:00.000Z',
    connectCount: 6,
    createdAt: '2026-04-18T08:00:00.000Z',
    updatedAt: '2026-04-18T08:00:00.000Z',
  },
  {
    id: 'gig-doc-automation-pipeline',
    slug: 'document-automation-pipeline-for-client-ops',
    ownerUserId: '1',
    ownerName: 'Docrud Team',
    ownerEmail: 'admin@company.com',
    organizationName: 'Docrud Team',
    title: 'Document automation pipeline for client ops',
    summary: 'Looking for a workflow builder who can structure approval logic, email triggers, and delivery states across recurring client documents.',
    category: 'Automation',
    interests: ['operations', 'automation', 'documents'],
    skills: ['Automation design', 'API thinking', 'Client ops'],
    deliverables: ['Flow map', 'Approval states', 'Delivery rules'],
    budgetLabel: '₹70k - ₹1.2L',
    timelineLabel: '4 weeks',
    engagementType: 'ongoing',
    locationPreference: 'remote',
    contactPreference: 'email',
    visibility: 'public',
    status: 'published',
    bidMode: 'bidding',
    bidRules: {
      currency: 'INR',
      minBidInRupees: 55000,
      allowCounterOffer: true,
      bidDeadlineAt: '2026-05-05T00:00:00.000Z',
    },
    connectCount: 11,
    createdAt: '2026-04-18T11:30:00.000Z',
    updatedAt: '2026-04-18T11:30:00.000Z',
  },
  {
    id: 'gig-meeting-recap-engine',
    slug: 'ai-meeting-recap-and-action-engine',
    ownerUserId: '1',
    ownerName: 'Docrud Labs',
    ownerEmail: 'admin@company.com',
    organizationName: 'Docrud Labs',
    title: 'AI meeting recap and action engine',
    summary: 'Need a sharp product engineer to help shape transcript cleanup, action extraction, and post-meeting workflow handoff inside docrud.',
    category: 'Engineering',
    interests: ['ai', 'meetings', 'product engineering'],
    skills: ['React', 'Product engineering', 'AI workflows'],
    deliverables: ['Recap pipeline', 'Action extraction pass', 'QA notes'],
    budgetLabel: '₹1.5L / month',
    timelineLabel: 'Retainer',
    engagementType: 'retainer',
    locationPreference: 'hybrid',
    contactPreference: 'chat',
    visibility: 'public',
    status: 'published',
    connectCount: 9,
    createdAt: '2026-04-19T07:20:00.000Z',
    updatedAt: '2026-04-19T07:20:00.000Z',
  },
  {
    id: 'gig-security-copy-refresh',
    slug: 'security-copy-refresh-for-client-facing-docs',
    ownerUserId: '1',
    ownerName: 'Trust Layer Studio',
    ownerEmail: 'admin@company.com',
    organizationName: 'Trust Layer Studio',
    title: 'Security copy refresh for client-facing docs',
    summary: 'Need a writer who can turn dense product security language into calmer client-ready explanations across landing pages and shared documents.',
    category: 'Content',
    interests: ['security', 'ux writing', 'b2b saas'],
    skills: ['UX writing', 'Security copy', 'Content strategy'],
    deliverables: ['Copy rewrite', 'FAQ cleanup', 'Trust section pack'],
    budgetLabel: '₹25k - ₹45k',
    timelineLabel: '10 days',
    engagementType: 'one_time',
    locationPreference: 'remote',
    contactPreference: 'email',
    visibility: 'public',
    status: 'published',
    connectCount: 4,
    createdAt: '2026-04-19T10:15:00.000Z',
    updatedAt: '2026-04-19T10:15:00.000Z',
  },
];

function gigOwnerId(user: User) {
  if (user.role === 'client') return user.id;
  if (user.role === 'member' && user.organizationId) return user.organizationId;
  return user.id;
}

function gigOwnerName(user: User) {
  return user.organizationName || user.name || 'Docrud Workspace';
}

export async function getGigListings() {
  const stored = await readJsonFile<GigListing[]>(gigsPath, []);
  const storedIds = new Set(stored.map((entry) => entry.id));
  return [...stored, ...defaultGigs.filter((entry) => !storedIds.has(entry.id))];
}

export async function saveGigListings(gigs: GigListing[]) {
  await writeJsonFile(gigsPath, gigs);
}

export async function getGigConnections() {
  return readJsonFile<GigConnectionRequest[]>(gigConnectionsPath, []);
}

export async function saveGigConnections(connections: GigConnectionRequest[]) {
  await writeJsonFile(gigConnectionsPath, connections);
}

export async function getGigBids() {
  return readJsonFile<GigBid[]>(gigBidsPath, []);
}

export async function saveGigBids(bids: GigBid[]) {
  await writeJsonFile(gigBidsPath, bids);
}

export async function getPublicGigListings() {
  const gigs = await getGigListings();
  return gigs
    .filter((gig) => gig.status === 'published' && gig.visibility === 'public')
    .sort((left, right) => +new Date(right.updatedAt) - +new Date(left.updatedAt));
}

export async function getGigListingBySlug(slug: string) {
  const gigs = await getGigListings();
  return gigs.find((gig) => gig.slug === slug) || null;
}

export async function getPublicGigBySlug(slug: string) {
  const gig = await getGigListingBySlug(slug);
  if (!gig || gig.status !== 'published' || gig.visibility !== 'public') {
    return null;
  }
  return gig;
}

export async function getGigCategories() {
  const gigs = await getGigListings();
  return Array.from(new Set(gigs.map((gig) => gig.category).filter(Boolean))).sort((left, right) => left.localeCompare(right));
}

export async function getGigInterests() {
  const gigs = await getGigListings();
  return Array.from(new Set(gigs.flatMap((gig) => gig.interests || []).filter(Boolean))).sort((left, right) => left.localeCompare(right));
}

export async function getVisibleGigListingsForUser(user: User) {
  const gigs = await getGigListings();
  const ownerId = gigOwnerId(user);
  return gigs.filter((gig) => gig.visibility === 'public' || gig.ownerUserId === user.id || gig.organizationId === ownerId);
}

export async function getGigWorkspaceData(user: User) {
  const [gigs, connections, bids] = await Promise.all([getVisibleGigListingsForUser(user), getGigConnections(), getGigBids()]);
  const ownListings = gigs.filter((gig) => gig.ownerUserId === user.id || gig.organizationId === gigOwnerId(user));
  const discoverListings = gigs
    .filter((gig) => gig.status === 'published' && (gig.visibility === 'public' || gig.ownerUserId === user.id || gig.organizationId === gigOwnerId(user)))
    .sort((left, right) => +new Date(right.updatedAt) - +new Date(left.updatedAt));
  const incomingConnections = connections.filter((entry) => entry.ownerUserId === user.id || ownListings.some((gig) => gig.id === entry.gigId));
  const outgoingConnections = connections.filter((entry) => entry.requesterUserId === user.id);
  const incomingBids = bids.filter((entry) => entry.ownerUserId === user.id || ownListings.some((gig) => gig.id === entry.gigId));
  const outgoingBids = bids.filter((entry) => entry.bidderUserId === user.id);

  return {
    ownListings: ownListings.sort((left, right) => +new Date(right.updatedAt) - +new Date(left.updatedAt)),
    discoverListings,
    incomingConnections: incomingConnections.sort((left, right) => +new Date(right.createdAt) - +new Date(left.createdAt)),
    outgoingConnections: outgoingConnections.sort((left, right) => +new Date(right.createdAt) - +new Date(left.createdAt)),
    incomingBids: incomingBids.sort((left, right) => +new Date(right.createdAt) - +new Date(left.createdAt)),
    outgoingBids: outgoingBids.sort((left, right) => +new Date(right.createdAt) - +new Date(left.createdAt)),
  };
}

export async function upsertGigListing(
  actor: User,
  payload: Partial<GigListing> & { title: string; summary: string; category: string },
) {
  const gigs = await getGigListings();
  const now = new Date().toISOString();
  const nextSlug = payload.slug?.trim() || slugify(payload.title);
  const existing = payload.id ? gigs.find((gig) => gig.id === payload.id) : null;
  const ownerId = gigOwnerId(actor);
  const gigId = payload.id || `gig-${Date.now()}`;

  const normalizedSlug = (() => {
    const base = nextSlug || `gig-${Date.now()}`;
    const collision = gigs.find((gig) => gig.slug === base && gig.id !== gigId);
    return collision ? `${base}-${Date.now().toString().slice(-4)}` : base;
  })();

  const nextGig: GigListing = {
    id: gigId,
    slug: normalizedSlug,
    ownerUserId: existing?.ownerUserId || actor.id,
    ownerName: existing?.ownerName || actor.name || gigOwnerName(actor),
    ownerEmail: existing?.ownerEmail || actor.email || 'owner@docrud.local',
    organizationId: actor.organizationId || ownerId,
    organizationName: actor.organizationName || gigOwnerName(actor),
    title: payload.title.trim(),
    summary: payload.summary.trim(),
    category: payload.category.trim() || 'General',
    interests: Array.isArray(payload.interests) ? payload.interests.map((item) => item.trim()).filter(Boolean) : [],
    skills: Array.isArray(payload.skills) ? payload.skills.map((item) => item.trim()).filter(Boolean) : [],
    deliverables: Array.isArray(payload.deliverables) ? payload.deliverables.map((item) => item.trim()).filter(Boolean) : [],
    budgetLabel: payload.budgetLabel?.trim() || 'Discuss budget',
    timelineLabel: payload.timelineLabel?.trim() || undefined,
    engagementType: payload.engagementType || 'one_time',
    locationPreference: payload.locationPreference || 'remote',
    contactPreference: payload.contactPreference || 'chat',
    visibility: payload.visibility || 'public',
    status: payload.status || 'draft',
    featured: payload.featured ?? existing?.featured ?? false,
    // Featuring is purchase-gated for non-admins. Admins can still set it manually.
    featuredUntil: actor.role === 'admin'
      ? (payload.featuredUntil || existing?.featuredUntil)
      : existing?.featuredUntil,
    featuredPayment: existing?.featuredPayment,
    bidMode: payload.bidMode || existing?.bidMode || 'fixed',
    bidRules: payload.bidRules || existing?.bidRules || { currency: 'INR' },
    connectCount: existing?.connectCount || 0,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  const nextGigs = existing
    ? gigs.map((gig) => (gig.id === existing.id ? nextGig : gig))
    : [nextGig, ...gigs];

  await saveGigListings(nextGigs);
  return nextGig;
}

export async function deleteGigListing(id: string, actor: User) {
  const gigs = await getGigListings();
  const target = gigs.find((gig) => gig.id === id);
  if (!target) {
    return false;
  }

  const actorOwnsGig = target.ownerUserId === actor.id || target.organizationId === gigOwnerId(actor) || actor.role === 'admin';
  if (!actorOwnsGig) {
    throw new Error('You are not allowed to delete this gig.');
  }

  const nextGigs = gigs.filter((gig) => gig.id !== id);
  await saveGigListings(nextGigs);

  const connections = await getGigConnections();
  const nextConnections = connections.filter((entry) => entry.gigId !== id);
  await saveGigConnections(nextConnections);
  return true;
}

export async function createGigConnectionRequest(
  actor: User,
  payload: {
    gigId: string;
    note: string;
    interestArea?: string;
    portfolioUrl?: string;
  },
) {
  const gigs = await getGigListings();
  const gig = gigs.find((entry) => entry.id === payload.gigId);
  if (!gig || gig.status !== 'published') {
    throw new Error('This gig is not open right now.');
  }
  if (gig.ownerUserId === actor.id) {
    throw new Error('You already own this gig.');
  }

  const connections = await getGigConnections();
  const existing = connections.find((entry) => entry.gigId === gig.id && entry.requesterUserId === actor.id && entry.status !== 'closed');
  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();
  const nextRequest: GigConnectionRequest = {
    id: `gig-connect-${Date.now()}`,
    gigId: gig.id,
    gigSlug: gig.slug,
    gigTitle: gig.title,
    ownerUserId: gig.ownerUserId,
    requesterUserId: actor.id,
    requesterName: actor.name || 'Docrud user',
    requesterEmail: actor.email || 'member@docrud.local',
    requesterOrganization: actor.organizationName,
    requesterHeadline: actor.roleProfileName || actor.organizationName,
    interestArea: payload.interestArea?.trim() || undefined,
    portfolioUrl: payload.portfolioUrl?.trim() || undefined,
    note: payload.note.trim(),
    status: 'new',
    createdAt: now,
    updatedAt: now,
  };

  await saveGigConnections([nextRequest, ...connections]);
  await saveGigListings(gigs.map((entry) => entry.id === gig.id ? { ...entry, connectCount: entry.connectCount + 1, updatedAt: now } : entry));
  return nextRequest;
}

export async function updateGigConnectionStatus(id: string, actor: User, status: GigConnectionRequest['status']) {
  const connections = await getGigConnections();
  const target = connections.find((entry) => entry.id === id);
  if (!target) {
    return null;
  }
  if (target.ownerUserId !== actor.id && actor.role !== 'admin') {
    throw new Error('Not permitted to update this request.');
  }

  const now = new Date().toISOString();
  const nextConnections = connections.map((entry) => entry.id === id ? { ...entry, status, updatedAt: now } : entry);
  await saveGigConnections(nextConnections);
  return nextConnections.find((entry) => entry.id === id) || null;
}

export function getGigFeaturedStatus(gig: GigListing) {
  if (!gig.featuredUntil) return false;
  const until = new Date(gig.featuredUntil);
  return Number.isFinite(until.getTime()) && until.getTime() > Date.now();
}

export function calculateGigFeaturePriceInPaise(durationDays: number) {
  const safeDays = Math.max(1, Math.min(90, Math.round(durationDays || 0)));
  if (safeDays <= 3) return 9900;
  if (safeDays <= 7) return 19900;
  if (safeDays <= 14) return 34900;
  if (safeDays <= 30) return 59900;
  return 59900 + Math.round((safeDays - 30) * 1200);
}

export async function createGigFeatureOrder(actor: User, gigId: string, durationDays: number) {
  const gigs = await getGigListings();
  const target = gigs.find((gig) => gig.id === gigId);
  if (!target) throw new Error('Gig not found.');

  const actorOwnsGig = target.ownerUserId === actor.id || target.organizationId === gigOwnerId(actor) || actor.role === 'admin';
  if (!actorOwnsGig) throw new Error('Not permitted to feature this gig.');
  if (target.status !== 'published') throw new Error('Publish the gig before featuring it.');

  const razorpayConfig = getRazorpayConfig();
  if (!razorpayConfig.serverConfigured) {
    throw new Error('Razorpay payment gateway is not configured.');
  }

  const safeDays = Math.max(1, Math.min(90, Math.round(durationDays || 0)));
  const amountInPaise = calculateGigFeaturePriceInPaise(safeDays);
  const receipt = `gig_${actor.id.slice(0, 8)}_${Date.now().toString(36).slice(-8)}`;

  const auth = Buffer.from(`${razorpayConfig.keyId}:${razorpayConfig.keySecret}`).toString('base64');
  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      authorization: `Basic ${auth}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      amount: amountInPaise,
      currency: 'INR',
      receipt,
      notes: {
        product: 'gigs_feature',
        gigId: target.id,
        gigSlug: target.slug,
        ownerUserId: actor.id,
        durationDays: String(safeDays),
      },
    }),
  });

  const payload = await response.json().catch(() => null) as any;
  if (!response.ok || !payload?.id) {
    throw new Error(payload?.error?.description || 'Unable to create Razorpay order.');
  }

  return {
    order: payload,
    amountInPaise,
    durationDays: safeDays,
    keyId: razorpayConfig.keyId,
    isTestMode: razorpayConfig.isTestMode,
  };
}

export async function verifyGigFeaturePayment(actor: User, params: {
  gigId: string;
  durationDays: number;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) {
  const gigs = await getGigListings();
  const target = gigs.find((gig) => gig.id === params.gigId);
  if (!target) throw new Error('Gig not found.');

  const actorOwnsGig = target.ownerUserId === actor.id || target.organizationId === gigOwnerId(actor) || actor.role === 'admin';
  if (!actorOwnsGig) throw new Error('Not permitted to feature this gig.');

  const isValid = verifyRazorpayPaymentSignature(params.razorpay_order_id, params.razorpay_payment_id, params.razorpay_signature);
  if (!isValid) {
    throw new Error('Razorpay payment signature verification failed.');
  }

  const now = new Date();
  const durationDays = Math.max(1, Math.min(90, Math.round(params.durationDays || 0)));
  const baseline = target.featuredUntil && new Date(target.featuredUntil).getTime() > now.getTime()
    ? new Date(target.featuredUntil)
    : now;
  const featuredUntil = new Date(baseline.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();
  const amountInPaise = calculateGigFeaturePriceInPaise(durationDays);

  const nextGig: GigListing = {
    ...target,
    featuredUntil,
    featuredPayment: {
      provider: 'razorpay',
      orderId: params.razorpay_order_id,
      paymentId: params.razorpay_payment_id,
      signature: params.razorpay_signature,
      amountInPaise,
      currency: 'INR',
      purchasedAt: now.toISOString(),
      durationDays,
    },
    updatedAt: now.toISOString(),
  };

  await saveGigListings(gigs.map((gig) => gig.id === nextGig.id ? nextGig : gig));
  return nextGig;
}

export async function createGigBid(actor: User, payload: {
  gigId: string;
  amountInRupees: number;
  timelineLabel?: string;
  note: string;
}) {
  const gigs = await getGigListings();
  const gig = gigs.find((entry) => entry.id === payload.gigId);
  if (!gig || gig.status !== 'published') {
    throw new Error('This gig is not open right now.');
  }
  if ((gig.bidMode || 'fixed') !== 'bidding') {
    throw new Error('This gig is not accepting bids.');
  }
  if (gig.ownerUserId === actor.id) {
    throw new Error('You cannot bid on your own gig.');
  }
  if (gig.bidRules?.bidDeadlineAt) {
    const deadline = new Date(gig.bidRules.bidDeadlineAt);
    if (Number.isFinite(deadline.getTime()) && Date.now() > deadline.getTime()) {
      throw new Error('Bidding is closed for this gig.');
    }
  }

  const amount = Math.max(0, Math.round(Number(payload.amountInRupees) || 0));
  const minBid = Math.max(0, Math.round(Number(gig.bidRules?.minBidInRupees || 0)));
  if (minBid && amount < minBid) {
    throw new Error(`Minimum bid is ₹${minBid}.`);
  }
  if (!payload.note.trim()) {
    throw new Error('Add a short note with your bid.');
  }

  const bids = await getGigBids();
  const existing = bids.find((entry) => entry.gigId === gig.id && entry.bidderUserId === actor.id && entry.status !== 'withdrawn');
  if (existing) {
    throw new Error('You have already submitted a bid for this gig.');
  }

  const now = new Date().toISOString();
  const bid: GigBid = {
    id: `gig-bid-${Date.now()}`,
    gigId: gig.id,
    gigSlug: gig.slug,
    gigTitle: gig.title,
    ownerUserId: gig.ownerUserId,
    bidderUserId: actor.id,
    bidderName: actor.name || 'Docrud user',
    bidderEmail: actor.email || 'bidder@docrud.local',
    bidderOrganization: actor.organizationName,
    amountInRupees: amount,
    currency: 'INR',
    timelineLabel: payload.timelineLabel?.trim() || undefined,
    note: payload.note.trim(),
    status: 'submitted',
    createdAt: now,
    updatedAt: now,
  };

  await saveGigBids([bid, ...bids]);
  return bid;
}

export async function updateGigBidStatus(actor: User, id: string, status: GigBid['status']) {
  const bids = await getGigBids();
  const target = bids.find((entry) => entry.id === id);
  if (!target) return null;
  if (target.ownerUserId !== actor.id && actor.role !== 'admin') {
    throw new Error('Not permitted to update this bid.');
  }
  const now = new Date().toISOString();
  const next = bids.map((entry) => entry.id === id ? { ...entry, status, updatedAt: now } : entry);
  await saveGigBids(next);
  return next.find((entry) => entry.id === id) || null;
}
