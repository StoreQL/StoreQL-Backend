const prisma = require('../config/prismaClient');
const ApiError = require('../utils/ApiError');

async function listTags(userId) {
  const tags = await prisma.tag.findMany({ where: { userId }, orderBy: { name: 'asc' } });
  return Promise.all(
    tags.map(async (tag) => {
      try {
        const linkCount = await prisma.link.count({
          where: {
            userId,
            tagIds: { has: tag.id },
          },
        });
        return { ...tag, linkCount };
      } catch {
        return { ...tag, linkCount: 0 };
      }
    })
  );
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

async function renameTag(userId, tagId, newName) {
  const tag = await prisma.tag.findUnique({ where: { id: tagId } });
  if (!tag || tag.userId !== userId) throw ApiError.notFound('Tag not found');

  const trimmed = newName.trim();
  if (!trimmed) throw ApiError.badRequest('name is required');

  // Check uniqueness
  const conflict = await prisma.tag.findUnique({
    where: { userId_name: { userId, name: trimmed } },
  });
  if (conflict && conflict.id !== tagId) {
    throw ApiError.conflict(`Tag "${trimmed}" already exists`);
  }

  return prisma.tag.update({ where: { id: tagId }, data: { name: trimmed } });
}

async function deleteTag(userId, tagId) {
  const tag = await prisma.tag.findUnique({ where: { id: tagId } });
  if (!tag || tag.userId !== userId) throw ApiError.notFound('Tag not found');

  // Remove this tag from all links that reference it (MongoDB m:n via embedded arrays)
  if (tag.linkIds && tag.linkIds.length > 0) {
    await Promise.all(
      tag.linkIds.map((linkId) =>
        prisma.link.update({
          where: { id: linkId },
          data: { tagIds: { set: [] } }, // will be re-set below per link
        }).catch(() => {}) // ignore if link already deleted
      )
    );

    // Proper approach: pull tagId from each link's tagIds array
    const links = await prisma.link.findMany({
      where: { tagIds: { has: tagId } },
      select: { id: true, tagIds: true },
    });

    await Promise.all(
      links.map((link) =>
        prisma.link.update({
          where: { id: link.id },
          data: { tagIds: link.tagIds.filter((id) => id !== tagId) },
        })
      )
    );
  }

  await prisma.tag.delete({ where: { id: tagId } });
}

module.exports = { listTags, findOrCreateMany, renameTag, deleteTag };
