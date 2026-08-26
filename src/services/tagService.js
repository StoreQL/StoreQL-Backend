const prisma = require('../config/prismaClient');

async function listTags(userId) {
  return prisma.tag.findMany({ where: { userId }, orderBy: { name: 'asc' } });
}

async function findOrCreateMany(userId, names) {
  const cleanNames = [...new Set(names.map((n) => n.trim()).filter(Boolean))];

  const tags = await Promise.all(
    cleanNames.map(async (name) => {
      const existing = await prisma.tag.findUnique({
        where: { userId_name: { userId, name } },
      });
      if (existing) return existing;
      return prisma.tag.create({ data: { userId, name, linkIds: [] } });
    })
  );

  return tags;
}

module.exports = { listTags, findOrCreateMany };
