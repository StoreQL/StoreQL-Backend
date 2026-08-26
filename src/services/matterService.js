const prisma = require('../config/prismaClient');
const ApiError = require('../utils/ApiError');

const VALID_TYPES = ['note', 'idea', 'reference', 'reminder', 'question', 'todo'];

async function getMatterById(userId, matterId) {
  const matter = await prisma.matter.findUnique({ where: { id: matterId } });
  if (!matter || matter.userId !== userId) {
    throw ApiError.notFound('Matter not found');
  }
  return matter;
}

async function listMatters(userId, { spaceId, linkId, limit = 20, cursor } = {}) {
  const take = Math.min(Number(limit) || 20, 50);
  const where = {
    userId,
    ...(spaceId && { spaceId }),
    ...(linkId && { linkId }),
  };

  const matters = await prisma.matter.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: take + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
  });

  const hasMore = matters.length > take;
  const page = hasMore ? matters.slice(0, take) : matters;
  return { items: page, nextCursor: hasMore ? page[page.length - 1].id : null };
}

async function createMatter(userId, data) {
  if (!data.content || !data.content.trim()) {
    throw ApiError.badRequest('content is required');
  }
  if (!data.linkId) {
    throw ApiError.badRequest('linkId is required');
  }

  const link = await prisma.link.findUnique({ where: { id: data.linkId } });
  if (!link || link.userId !== userId) {
    throw ApiError.notFound('Link not found');
  }

  const type = VALID_TYPES.includes(data.type) ? data.type : 'note';

  return prisma.matter.create({
    data: {
      userId,
      linkId: data.linkId,
      spaceId: data.spaceId || link.spaceId || null,
      content: data.content.trim(),
      type,
    },
  });
}

async function updateMatter(userId, matterId, data) {
  await getMatterById(userId, matterId);
  return prisma.matter.update({
    where: { id: matterId },
    data: {
      ...(data.content !== undefined && { content: data.content.trim() }),
      ...(data.type !== undefined && VALID_TYPES.includes(data.type) && { type: data.type }),
      ...(data.spaceId !== undefined && { spaceId: data.spaceId }),
    },
  });
}

async function deleteMatter(userId, matterId) {
  await getMatterById(userId, matterId);
  await prisma.matter.delete({ where: { id: matterId } });
}

module.exports = { getMatterById, listMatters, createMatter, updateMatter, deleteMatter, VALID_TYPES };
