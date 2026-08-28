const prisma = require('../config/prismaClient');

/**
 * Fast multi-faceted backend search with server-side pagination, sorting, and relevance scoring.
 * Architecture:
 *  - Parallel queries across Links, Spaces, Tags, and Matters via Promise.all
 *  - Supports server-side pagination (page, limit, skip, hasMore, total)
 *  - Server-side sorting: 'relevance' | 'date_desc' | 'date_asc' | 'title_asc' | 'domain_asc'
 *  - Scoring: title match=4, domain match=3, tag match=2, description/matter=1
 *  - Debounce on frontend (250ms) with race-condition guard
 */
async function search(
  userId,
  query,
  { page = 1, limit = 20, sortBy = 'relevance', type, spaceId, tag, domain } = {}
) {
  if (!query || !query.trim()) {
    return {
      results: [],
      links: [],
      spaces: [],
      tags: [],
      pagination: { page: 1, limit, total: 0, hasMore: false },
    };
  }

  const q = query.trim();
  // Strip leading '#' for tag search
  const qClean = q.startsWith('#') ? q.slice(1) : q;
  const contains = { contains: qClean, mode: 'insensitive' };

  const normType =
    !type || type === 'undefined' || type === 'null' || type === 'all' || type === ''
      ? 'all'
      : type;

  const runLinks = normType === 'all' || normType === 'link';
  const runSpaces = (normType === 'all' || normType === 'space') && page === 1; // Only load spaces on page 1
  const runTags = (normType === 'all' || normType === 'tag') && page === 1;     // Only load tags on page 1

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const skipNum = (pageNum - 1) * limitNum;

  // Build link where clause
  const linkWhere = {
    userId,
    OR: [
      { title: contains },
      { url: contains },
      { domain: contains },
      { description: contains },
      { tags: { some: { name: contains } } },
    ],
    ...(spaceId && { spaceId }),
    ...(domain && { domain: { contains: domain, mode: 'insensitive' } }),
    ...(tag && { tags: { some: { name: { contains: tag, mode: 'insensitive' } } } }),
  };

  // Determine database orderBy for non-relevance sorting
  let prismaOrderBy = { createdAt: 'desc' };
  if (sortBy === 'date_asc') {
    prismaOrderBy = { createdAt: 'asc' };
  } else if (sortBy === 'title_asc') {
    prismaOrderBy = { title: 'asc' };
  } else if (sortBy === 'domain_asc') {
    prismaOrderBy = { domain: 'asc' };
  }

  const [rawLinks, rawSpaces, rawMatters, rawTags, totalLinksCount] = await Promise.all([
    runLinks
      ? prisma.link.findMany({
          where: linkWhere,
          skip: sortBy === 'relevance' ? 0 : skipNum,
          take: sortBy === 'relevance' ? Math.min(100, pageNum * limitNum + 20) : limitNum,
          orderBy: prismaOrderBy,
          include: {
            tags: true,
            space: { select: { id: true, name: true, icon: true, color: true } },
            matters: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        })
      : [],
    runSpaces
      ? prisma.space.findMany({
          where: {
            userId,
            OR: [{ name: contains }, { description: contains }, { category: contains }],
          },
          take: 6,
        })
      : [],
    // Search matter content to surface links when searching relevance or page 1
    runLinks && (sortBy === 'relevance' || pageNum === 1)
      ? prisma.matter.findMany({
          where: { userId, content: contains },
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            link: {
              include: {
                tags: true,
                space: { select: { id: true, name: true, icon: true, color: true } },
                matters: { orderBy: { createdAt: 'desc' }, take: 1 },
              },
            },
          },
        })
      : [],
    runTags
      ? prisma.tag.findMany({
          where: { userId, name: contains },
          take: 10,
        })
      : [],
    runLinks ? prisma.link.count({ where: linkWhere }) : 0,
  ]);

  let pagedLinks = [];

  if (sortBy === 'relevance') {
    // Score & deduplicate links (merging direct matches + matter matches)
    const linkMap = new Map();

    for (const link of rawLinks) {
      const score = scoreLink(link, qClean);
      if (!linkMap.has(link.id) || linkMap.get(link.id).score < score) {
        linkMap.set(link.id, { ...link, score, matchedVia: 'link', type: 'link' });
      }
    }

    for (const matter of rawMatters) {
      if (!matter.link) continue;
      const link = matter.link;
      const score = 1; // matter content match
      if (!linkMap.has(link.id)) {
        linkMap.set(link.id, {
          ...link,
          score,
          matchedVia: 'matter',
          matchedContent: matter.content.slice(0, 120),
          type: 'link',
        });
      }
    }

    const scoredAll = [...linkMap.values()].sort((a, b) => b.score - a.score);
    pagedLinks = scoredAll.slice(skipNum, skipNum + limitNum);
  } else {
    pagedLinks = rawLinks.map((l) => ({ ...l, type: 'link' }));
  }

  const scoredSpaces = await Promise.all(
    rawSpaces.map(async (s) => {
      const linkCount = await prisma.link.count({ where: { spaceId: s.id } });
      return { ...s, linkCount, type: 'space', score: 1 };
    })
  );
  const scoredTags = rawTags.map((t) => ({ ...t, type: 'tag', score: 1 }));

  const hasMore = skipNum + pagedLinks.length < totalLinksCount;

  return {
    results: [...pagedLinks, ...scoredSpaces, ...scoredTags],
    links: pagedLinks,
    spaces: scoredSpaces,
    tags: scoredTags,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: totalLinksCount,
      hasMore,
    },
  };
}

function scoreLink(link, q) {
  const ql = q.toLowerCase();
  let score = 0;
  if (link.title && link.title.toLowerCase().includes(ql)) score += 4;
  if (link.domain && link.domain.toLowerCase().includes(ql)) score += 3;
  if (link.tags && link.tags.some((t) => t.name.toLowerCase().includes(ql))) score += 2;
  if (link.description && link.description.toLowerCase().includes(ql)) score += 1;
  if (link.url && link.url.toLowerCase().includes(ql)) score += 1;
  return Math.max(score, 1);
}

module.exports = { search };
