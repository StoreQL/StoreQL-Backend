const prisma = require('../config/prismaClient');

async function findOrCreateByFirebaseUid({ firebaseUid, email, name }) {
  const fallbackEmail = email || `${firebaseUid}@unknown.storeql`;

  try {
    return await prisma.user.upsert({
      where: { firebaseUid },
      update: {
        ...(email && { email }),
        ...(name && { name }),
      },
      create: {
        firebaseUid,
        email: fallbackEmail,
        name: name || null,
      },
    });
  } catch (err) {
    if (err.code === 'P2002') {
      const existing = await prisma.user.findUnique({ where: { firebaseUid } });
      if (existing) return existing;
    }
    throw err;
  }
}

async function updateProfile(userId, { name, profileImageUrl }) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      ...(name !== undefined && { name }),
      ...(profileImageUrl !== undefined && { profileImageUrl }),
    },
  });
}

module.exports = { findOrCreateByFirebaseUid, updateProfile };
