const prisma = require('../config/prismaClient');
const ApiError = require('../utils/ApiError');
const { fetchMetadata } = require('./metadataService');
const tagService = require('./tagService');

function extractDomain(rawUrl) {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

async function getLinkById(userId, linkId) {
  const link = await prisma.link.findUnique({
    where: { id: linkId },
    include: { tags: true, matters: true },
  });
  if (!link || link.userId !== userId) {
    throw ApiError.notFound('Link not found');
  }
  return link;
}

async function listLinks(userId, { spaceId, tag, source, cursor, limit = 20 } = {}) {
  const take = Math.min(Number(limit) || 20, 50);

  const where = {
    userId,
    ...(spaceId && { spaceId }),
    ...(source && { source }),
    ...(tag && { tags: { some: { name: tag } } }),
  };

  const links = await prisma.link.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: take + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    include: { tags: true, matters: { orderBy: { createdAt: 'desc' }, take: 1 } },
  });

  const hasMore = links.length > take;
  const page = hasMore ? links.slice(0, take) : links;

  return {
    items: page,
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
}

/**
 * Creates a link immediately (URL is what matters), optionally with
 * an inline Matter and tags, then kicks off metadata fetching in the
 * background so the save never waits on an external website.
 */
async function createLink(userId, data) {
  if (!data.url) throw ApiError.badRequest('url is required');

  const domain = extractDomain(data.url);
  if (!domain) throw ApiError.badRequest('Invalid URL');

  let tagIds = [];
  if (Array.isArray(data.tags) && data.tags.length > 0) {
    const tags = await tagService.findOrCreateMany(userId, data.tags);
    tagIds = tags.map((t) => t.id);
  }

  const link = await prisma.link.create({
    data: {
      userId,
      spaceId: data.spaceId || null,
      url: data.url,
      title: data.title || null,
      description: data.description || null,
      domain,
      faviconUrl: data.faviconUrl || null,
      thumbnailUrl: data.thumbnailUrl || null,
      source: data.source || 'manual',
      metadataStatus: data.title ? 'success' : 'pending', // client already had preview data
      tagIds,
    },
  });

  if (data.matter && data.matter.trim().length > 0) {
    await prisma.matter.create({
      data: {
        userId,
        linkId: link.id,
        spaceId: data.spaceId || null,
        content: data.matter.trim(),
        type: data.matterType || 'note',
      },
    });
  }

  // Fire-and-forget: don't block the save on external metadata fetch.
  if (link.metadataStatus === 'pending') {
    fetchAndAttachMetadata(link.id, link.url).catch((err) => {
      console.error(`[metadata] background fetch failed for link ${link.id}:`, err.message);
    });
  }

  return getLinkById(userId, link.id);
}

async function fetchAndAttachMetadata(linkId, url) {
  try {
    const meta = await fetchMetadata(url);

    // If OG/twitter gave us no image, use Microlink's free screenshot API as thumbnail.
    // This works for Google Docs, YouTube, auth-restricted pages, etc.
    // Format: https://api.microlink.io/?url=<encodedUrl>&screenshot=true&meta=false&embed=screenshot.url
    const thumbnailUrl =
      meta.image ||
      `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url`;

    await prisma.link.update({
      where: { id: linkId },
      data: {
        title: meta.title,
        description: meta.description,
        faviconUrl: meta.favicon,
        thumbnailUrl,
        metadataStatus: meta.title ? 'success' : 'partial',
      },
    });
  } catch {
    await prisma.link.update({
      where: { id: linkId },
      data: { metadataStatus: 'failed' },
    });
  }
}

async function updateLink(userId, linkId, data) {
  await getLinkById(userId, linkId);

  let tagIds;
  if (Array.isArray(data.tags)) {
    const tags = await tagService.findOrCreateMany(userId, data.tags);
    tagIds = tags.map((t) => t.id);
  }

  return prisma.link.update({
    where: { id: linkId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.spaceId !== undefined && { spaceId: data.spaceId }),
      ...(data.thumbnailUrl !== undefined && { thumbnailUrl: data.thumbnailUrl }),
      ...(tagIds !== undefined && { tagIds }),
    },
  });
}

async function deleteLink(userId, linkId) {
  await getLinkById(userId, linkId);
  await prisma.matter.deleteMany({ where: { linkId } });
  await prisma.link.delete({ where: { id: linkId } });
}

async function triggerMetadataRefresh(linkId, url) {
  return fetchAndAttachMetadata(linkId, url).catch((err) => {
    console.error(`[metadata] refresh failed for link ${linkId}:`, err.message);
  });
}

module.exports = {
  getLinkById,
  listLinks,
  createLink,
  updateLink,
  deleteLink,
  fetchAndAttachMetadata,
  triggerMetadataRefresh,
  extractDomain,
};
