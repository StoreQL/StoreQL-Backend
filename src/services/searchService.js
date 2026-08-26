const prisma = require('../config/prismaClient');

/**
 * MVP search: case-insensitive "contains" across the fields users
 * actually remember things by. Indexed on userId at minimum via the
 * Prisma schema's @@index directives. Swap for Atlas Search / a text
 * index later without changing this function's contract.
 */
async function search(userId, query, { limit = 10 } = {}) {
  if (!query || !query.trim()) {
    return { links: [], spaces: [], matters: [], tags: [] };
  }

  const q = query.trim();
  const contains = { contains: q, mode: 'insensitive' };

  const [links, spaces, matters, tags] = await Promise.all([
    prisma.link.findMany({
      where: {
        userId,
        OR: [{ title: contains }, { url: contains }, { domain: contains }, { description: contains }],
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.space.findMany({
      where: { userId, OR: [{ name: contains }, { description: contains }] },
      take: limit,
    }),
    prisma.matter.findMany({
      where: { userId, content: contains },
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.tag.findMany({
      where: { userId, name: contains },
      take: limit,
    }),
  ]);

  return { links, spaces, matters, tags };
}

module.exports = { search };
