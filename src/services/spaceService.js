const prisma = require('../config/prismaClient');
const ApiError = require('../utils/ApiError');

async function listSpaces(userId) {
  const spaces = await prisma.space.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  });

  // Attach lightweight counts (link/matter totals) for the Spaces grid.
  const withCounts = await Promise.all(
    spaces.map(async (space) => {
      const [linkCount, matterCount] = await Promise.all([
        prisma.link.count({ where: { spaceId: space.id } }),
        prisma.matter.count({ where: { spaceId: space.id } }),
      ]);
      return { ...space, linkCount, matterCount };
    })
  );

  return withCounts;
}

async function getSpaceById(userId, spaceId) {
  const space = await prisma.space.findUnique({ where: { id: spaceId } });
  if (!space || space.userId !== userId) {
    throw ApiError.notFound('Space not found');
  }
  return space;
}

async function createSpace(userId, data) {
  const count = await prisma.space.count({ where: { userId } });
  return prisma.space.create({
    data: {
      userId,
      name: data.name,
      description: data.description || null,
      icon: data.icon || null,
      coverImageUrl: data.coverImageUrl || null,
      color: data.color || null,
      category: data.category || 'General',
      order: count,
    },
  });
}

async function updateSpace(userId, spaceId, data) {
  await getSpaceById(userId, spaceId); // throws if not found/owned
  return prisma.space.update({
    where: { id: spaceId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.icon !== undefined && { icon: data.icon }),
      ...(data.coverImageUrl !== undefined && { coverImageUrl: data.coverImageUrl }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.order !== undefined && { order: data.order }),
    },
  });
}

async function deleteSpace(userId, spaceId) {
  await getSpaceById(userId, spaceId);
  // Unlink rather than cascade-delete links/matters — capture data
  // is more valuable than tidy foreign keys.
  await prisma.link.updateMany({ where: { spaceId }, data: { spaceId: null } });
  await prisma.matter.updateMany({ where: { spaceId }, data: { spaceId: null } });
  await prisma.space.delete({ where: { id: spaceId } });
}

module.exports = { listSpaces, getSpaceById, createSpace, updateSpace, deleteSpace };
