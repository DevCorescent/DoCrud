import { runPublicSearch, type PublicSearchResult } from '@/lib/public-search';
import { getHistoryEntries } from '@/lib/server/history';
import { getCustomTemplatesFromRepository } from '@/lib/server/repositories';
import { getFileTransfers } from '@/lib/server/file-transfers';
import { listKnowledgeBaseEntries } from '@/lib/server/knowledge-base';
import { searchWebSources } from '@/lib/server/web-sources';

export type GlobalSearchResult = PublicSearchResult & {
  scope?: 'public' | 'workspace';
  source?: 'public' | 'history' | 'templates' | 'transfers' | 'knowledge' | 'web_sources';
};

type SearchUser = {
  id: string;
  email?: string | null;
  role?: string | null;
  permissions?: string[] | null;
};

type GlobalSearchFilters = {
  scopes?: Array<'public' | 'workspace'>;
  sources?: Array<NonNullable<GlobalSearchResult['source']>>;
  types?: Array<PublicSearchResult['type']>;
  badges?: string[];
};

function normalize(value?: string) {
  return (value || '').trim().toLowerCase();
}

function tokenize(query: string) {
  return normalize(query).split(/\s+/).map((t) => t.trim()).filter(Boolean).slice(0, 8);
}

function scoreMatch(haystack: string, query: string) {
  const q = normalize(query);
  if (!q) return 0;
  const text = normalize(haystack);
  if (!text) return 0;

  let score = 0;
  if (text.includes(q)) score += 18;
  const tokens = tokenize(q);
  for (const token of tokens) {
    if (!token) continue;
    if (text.includes(token)) score += token.length >= 4 ? 6 : 4;
  }
  return score;
}

function recencyBoost(iso?: string) {
  if (!iso) return 0;
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return 0;
  const days = Math.max(0, (Date.now() - ts) / (1000 * 60 * 60 * 24));
  if (days <= 1) return 8;
  if (days <= 7) return 5;
  if (days <= 30) return 2;
  return 0;
}

function canSeeWorkspaceWide(user?: SearchUser | null) {
  if (!user) return false;
  return Boolean(user.permissions?.includes('all') || user.role === 'admin' || user.role === 'super_admin');
}

function dedupe(results: GlobalSearchResult[]) {
  const seen = new Set<string>();
  const output: GlobalSearchResult[] = [];
  for (const item of results) {
    const key = `${item.href}|${item.title}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }
  return output;
}

function sanitizeCsv(value?: string | null) {
  if (!value) return [];
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeSource(value: string): NonNullable<GlobalSearchResult['source']> | null {
  const token = normalize(value).replace(/[\s_-]+/g, '');
  if (token === 'public') return 'public';
  if (token === 'history' || token === 'docs' || token === 'documents') return 'history';
  if (token === 'templates' || token === 'template') return 'templates';
  if (token === 'transfers' || token === 'filetransfers' || token === 'filetransfer') return 'transfers';
  if (token === 'knowledge' || token === 'kb' || token === 'knowledgebase') return 'knowledge';
  if (token === 'web' || token === 'websources' || token === 'sources') return 'web_sources';
  if (token === 'workspace') {
    // Workspace is an alias; handled via scope filter, not source.
    return null;
  }
  return null;
}

function normalizeScope(value: string): 'public' | 'workspace' | null {
  const token = normalize(value).replace(/[\s_-]+/g, '');
  if (token === 'public') return 'public';
  if (token === 'workspace') return 'workspace';
  return null;
}

function normalizeType(value: string): PublicSearchResult['type'] | null {
  const token = normalize(value).replace(/[\s_-]+/g, '');
  if (token === 'feature') return 'feature';
  if (token === 'page' || token === 'pages') return 'page';
  if (token === 'file' || token === 'files') return 'file';
  if (token === 'article' || token === 'blog' || token === 'post') return 'article';
  return null;
}

function normalizeBadge(value: string) {
  const token = normalize(value).replace(/[\s_-]+/g, '');
  if (!token) return null;
  if (token === 'gig' || token === 'gigs') return 'GIG';
  if (token === 'resume' || token === 'resumes' || token === 'talent') return 'RESUME';
  if (token === 'blog') return 'BLOG';
  if (token === 'kb' || token === 'knowledge') return 'KB';
  return value.trim().toUpperCase();
}

function parseQueryOperators(rawQuery: string) {
  const tokens = rawQuery.trim().split(/\s+/).filter(Boolean);
  const filters: GlobalSearchFilters = {};
  const kept: string[] = [];

  for (const token of tokens) {
    const match = token.match(/^([a-zA-Z_]+):(.*)$/);
    if (!match) {
      kept.push(token);
      continue;
    }

    const key = normalize(match[1]);
    const value = match[2] || '';
    if (!value) continue;

    if (key === 'in' || key === 'source' || key === 'from') {
      const sources = sanitizeCsv(value).map(normalizeSource).filter(Boolean) as Array<NonNullable<GlobalSearchResult['source']>>;
      if (sources.length) {
        filters.sources = Array.from(new Set([...(filters.sources || []), ...sources]));
        continue;
      }
      const scope = normalizeScope(value);
      if (scope) {
        filters.scopes = Array.from(new Set([...(filters.scopes || []), scope]));
        continue;
      }
    }

    if (key === 'scope') {
      const scope = normalizeScope(value);
      if (scope) {
        filters.scopes = Array.from(new Set([...(filters.scopes || []), scope]));
        continue;
      }
    }

    if (key === 'type') {
      const types = sanitizeCsv(value).map(normalizeType).filter(Boolean) as Array<PublicSearchResult['type']>;
      if (types.length) {
        filters.types = Array.from(new Set([...(filters.types || []), ...types]));
        continue;
      }
    }

    if (key === 'badge') {
      const badges = sanitizeCsv(value).map(normalizeBadge).filter(Boolean) as string[];
      if (badges.length) {
        filters.badges = Array.from(new Set([...(filters.badges || []), ...badges]));
        continue;
      }
    }

    // Unknown operator: keep it as part of the search text.
    kept.push(token);
  }

  return { query: kept.join(' ').trim(), filters };
}

function mergeFilters(left?: GlobalSearchFilters, right?: GlobalSearchFilters): GlobalSearchFilters | undefined {
  if (!left && !right) return undefined;
  const merged: GlobalSearchFilters = {};
  const scopes = [...(left?.scopes || []), ...(right?.scopes || [])];
  const sources = [...(left?.sources || []), ...(right?.sources || [])];
  const types = [...(left?.types || []), ...(right?.types || [])];
  const badges = [...(left?.badges || []), ...(right?.badges || [])];
  if (scopes.length) merged.scopes = Array.from(new Set(scopes));
  if (sources.length) merged.sources = Array.from(new Set(sources));
  if (types.length) merged.types = Array.from(new Set(types));
  if (badges.length) merged.badges = Array.from(new Set(badges));
  return merged;
}

function matchesFilters(entry: GlobalSearchResult, filters?: GlobalSearchFilters) {
  if (!filters) return true;
  if (filters.scopes?.length && (!entry.scope || !filters.scopes.includes(entry.scope))) return false;
  if (filters.sources?.length && (!entry.source || !filters.sources.includes(entry.source))) return false;
  if (filters.types?.length && !filters.types.includes(entry.type)) return false;
  if (filters.badges?.length && (!entry.badge || !filters.badges.includes(entry.badge))) return false;
  return true;
}

export async function runGlobalSearch(params: {
  query: string;
  user?: SearchUser | null;
  limit?: number;
  filters?: GlobalSearchFilters;
}) {
  const { query: operatorStrippedQuery, filters: operatorFilters } = parseQueryOperators(params.query);
  const query = operatorStrippedQuery.trim();
  const limit = Math.min(30, Math.max(6, params.limit ?? 16));
  if (!query) return [];
  const filters = mergeFilters(operatorFilters, params.filters);

  const publicResults = await runPublicSearch(query);
  const user = params.user;
  if (!user) {
    const filtered = publicResults
      .map((entry) => ({ ...entry, scope: 'public' as const, source: 'public' as const } satisfies GlobalSearchResult))
      .filter((entry) => matchesFilters(entry, filters));
    return filtered.slice(0, limit);
  }

  const workspaceWide = canSeeWorkspaceWide(user);

  const [history, templates, transfers, kb, webSources] = await Promise.all([
    getHistoryEntries(),
    getCustomTemplatesFromRepository(),
    getFileTransfers(),
    listKnowledgeBaseEntries({ q: query, limit: 6, offset: 0 }).catch(() => ({ entries: [], total: 0, categories: [] })),
    searchWebSources({ ownerUserId: user.id, query, limit: 6 }).catch(() => []),
  ]);

  const historyMatches: Array<{ entry: GlobalSearchResult; score: number }> = history
    .filter((entry) => {
      if (workspaceWide) return true;
      const byEmail = normalize(entry.generatedBy) === normalize(user.email || '');
      return byEmail;
    })
    .map((entry) => {
      const title = entry.editorState?.title || entry.templateName || 'Untitled document';
      const descriptionBits = [
        entry.referenceNumber ? `Ref ${entry.referenceNumber}` : '',
        entry.category || '',
        entry.clientName || entry.employeeName || '',
      ].filter(Boolean);
      const description = descriptionBits.join(' · ') || 'Workspace document';

      const hay = [
        title,
        entry.templateName,
        entry.referenceNumber,
        entry.category,
        entry.clientName,
        entry.clientEmail,
        entry.employeeName,
        entry.employeeEmail,
        entry.organizationName,
        entry.uploadedPdfFileName,
        entry.signedPdfFileName,
        entry.editorState?.internalSummary,
        ...(entry.editorState?.tags || []),
      ].filter(Boolean).join(' ');

      const score = scoreMatch(hay, query) + recencyBoost(entry.generatedAt) + (entry.signatureSignedAt ? 1 : 0);
      return {
        entry: {
          id: `history-${entry.id}`,
          title,
          description,
          href: `/workspace?historyId=${encodeURIComponent(entry.id)}`,
          type: 'page',
          category: 'Workspace',
          badge: entry.signatureSignedAt ? 'SIGNED' : 'DOC',
          scope: 'workspace',
          source: 'history',
        } satisfies GlobalSearchResult,
        score,
      };
    })
    .filter((row) => row.score > 0)
    .slice(0, 8);

  const templateMatches: Array<{ entry: GlobalSearchResult; score: number }> = templates
    .filter((tpl) => {
      if (workspaceWide) return true;
      if (tpl.createdBy && normalize(tpl.createdBy) !== normalize(user.email || '')) return false;
      return true;
    })
    .map((tpl) => {
      const hay = [tpl.name, tpl.description, tpl.category].filter(Boolean).join(' ');
      const score = scoreMatch(hay, query) + recencyBoost(tpl.updatedAt);
      return {
        entry: {
          id: `template-${tpl.id}`,
          title: tpl.name || 'Template',
          description: tpl.description || `${tpl.category || 'General'} template`,
          href: `/workspace?tab=generate&templateId=${encodeURIComponent(tpl.id)}`,
          type: 'page',
          category: 'Templates',
          badge: 'TPL',
          scope: 'workspace',
          source: 'templates',
        } satisfies GlobalSearchResult,
        score,
      };
    })
    .filter((row) => row.score > 0)
    .slice(0, 6);

  const transferMatches: Array<{ entry: GlobalSearchResult; score: number }> = transfers
    .filter((transfer) => {
      if (transfer.revokedAt) return false;
      if (workspaceWide) return true;
      const byUserId = transfer.uploadedByUserId ? String(transfer.uploadedByUserId) === String(user.id) : false;
      const byEmail = normalize(transfer.uploadedBy) === normalize(user.email || '');
      return byUserId || byEmail;
    })
    .map((transfer) => {
      const title = transfer.title || transfer.fileName || 'File transfer';
      const hay = [
        title,
        transfer.fileName,
        transfer.notes,
        transfer.folderName,
        transfer.lockerName,
        transfer.directoryCategory,
        ...(transfer.directoryTags || []),
      ].filter(Boolean).join(' ');
      const score = scoreMatch(hay, query) + recencyBoost(transfer.updatedAt || transfer.createdAt);
      return {
        entry: {
          id: `transfer-${transfer.id}`,
          title,
          description: transfer.notes || `${transfer.fileName}${transfer.directoryCategory ? ` · ${transfer.directoryCategory}` : ''}`,
          href: transfer.shareUrl || `/transfer/${encodeURIComponent(transfer.shareId)}`,
          type: 'file',
          category: 'File transfers',
          badge: transfer.directoryVisibility === 'public' ? 'PUBLIC' : 'PRIVATE',
          scope: 'workspace',
          source: 'transfers',
        } satisfies GlobalSearchResult,
        score,
      };
    })
    .filter((row) => row.score > 0)
    .slice(0, 8);

  const kbMatches: Array<{ entry: GlobalSearchResult; score: number }> = (kb.entries || [])
    .map((entry) => {
      const hay = [entry.title, entry.query, entry.summary, entry.category, ...(entry.tags || [])].filter(Boolean).join(' ');
      const score = scoreMatch(hay, query) + recencyBoost(entry.updatedAt || entry.createdAt);
      return {
        entry: {
          id: `knowledge-${entry.id}`,
          title: entry.title,
          description: entry.summary || `Knowledge base · ${entry.category}`,
          href: `/knowledge?q=${encodeURIComponent(query)}`,
          type: 'article',
          category: 'Knowledge',
          badge: 'KB',
          scope: 'public',
          source: 'knowledge',
        } satisfies GlobalSearchResult,
        score,
      };
    })
    .filter((row) => row.score > 0)
    .slice(0, 4);

  const webMatches: Array<{ entry: GlobalSearchResult; score: number }> = (webSources || [])
    .map((source) => {
      const hay = [source.title, source.snippet, source.category, ...(source.tags || [])].filter(Boolean).join(' ');
      const score = scoreMatch(hay, query);
      return {
        entry: {
          id: `web-${source.url}`,
          title: source.title,
          description: source.snippet || source.url,
          href: source.url,
          type: 'page',
          category: source.category || 'Web sources',
          badge: 'SOURCE',
          scope: 'workspace',
          source: 'web_sources',
        } satisfies GlobalSearchResult,
        score,
      };
    })
    .filter((row) => row.score > 0)
    .slice(0, 6);

  const scoredPublic: Array<{ entry: GlobalSearchResult; score: number }> = publicResults
    .map((entry) => {
      const hay = [entry.title, entry.description, entry.category, entry.badge, entry.type].filter(Boolean).join(' ');
      const base = scoreMatch(hay, query);
      const boost = entry.type === 'file' ? 2 : entry.badge === 'RESUME' || entry.badge === 'GIG' ? 3 : 0;
      return {
        entry: { ...entry, scope: 'public' as const, source: 'public' as const } satisfies GlobalSearchResult,
        score: base + boost,
      };
    })
    .filter((row) => row.score > 0);

  const allCandidates = [
    ...historyMatches,
    ...templateMatches,
    ...transferMatches,
    ...webMatches,
    ...kbMatches,
    ...scoredPublic,
  ];

  const filteredCandidates = filters
    ? allCandidates.filter((row) => matchesFilters(row.entry, filters))
    : allCandidates;

  const scoreMap = new Map<string, { entry: GlobalSearchResult; score: number }>();
  for (const item of filteredCandidates) {
    const key = `${item.entry.href}|${item.entry.title}`.toLowerCase();
    const existing = scoreMap.get(key);
    if (!existing || item.score > existing.score) {
      scoreMap.set(key, item);
    }
  }

  const sorted = Array.from(scoreMap.values()).sort((a, b) => b.score - a.score);
  let picked = sorted.slice(0, limit).map((row) => row.entry);

  // Ensure logged-in searches still surface public modules (gigs/talent/blog/public files) when relevant.
  const minPublic = 3;
  const publicPool = sorted.filter((row) => row.entry.scope === 'public').map((row) => row.entry);
  const currentPublicCount = picked.filter((row) => row.scope === 'public').length;
  if (publicPool.length && currentPublicCount < Math.min(minPublic, publicPool.length)) {
    const needed = Math.min(minPublic, publicPool.length) - currentPublicCount;
    const add = publicPool.filter((row) => !picked.some((p) => p.href === row.href && p.title === row.title)).slice(0, needed);
    if (add.length) {
      const workspaceOnly = picked.filter((row) => row.scope !== 'public');
      picked = [...picked.filter((row) => row.scope === 'public'), ...workspaceOnly].slice(0, limit);
      // Replace the lowest scoring workspace slots with public entries.
      picked = picked.slice(0, Math.max(0, limit - add.length)).concat(add).slice(0, limit);
    }
  }

  return dedupe(picked).slice(0, limit);
}
