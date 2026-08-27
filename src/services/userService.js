const prisma = require('../config/prismaClient');
const admin = require('../config/firebaseAdmin');
const cloudinaryService = require('./cloudinaryService');

async function findOrCreateByFirebaseUid({ firebaseUid, email, name, profileImageUrl }) {
  const fallbackEmail = email || `${firebaseUid}@unknown.storeql`;

  try {
    const existing = await prisma.user.findUnique({ where: { firebaseUid } });

    if (existing) {
      // Only set profileImageUrl if the existing user has no photo yet and provider offers one
      const shouldSetPhoto = !existing.profileImageUrl && profileImageUrl;
      const shouldSetName = (!existing.name || existing.name === 'StoreQL User') && name;

      if (shouldSetPhoto || shouldSetName || (email && existing.email !== email)) {
        return await prisma.user.update({
          where: { id: existing.id },
          data: {
            ...(email && { email }),
            ...(shouldSetName && { name }),
            ...(shouldSetPhoto && { profileImageUrl }),
          },
        });
      }
      return existing;
    }

    return await prisma.user.create({
      data: {
        firebaseUid,
        email: fallbackEmail,
        name: name || null,
        profileImageUrl: profileImageUrl || null,
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

async function deleteUserAccount(userId, firebaseUid) {
  // 0. Clean up Cloudinary folder & images if any exist
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      const userFolder = cloudinaryService.getUserFolder(user);
      const oldPublicId = cloudinaryService.extractPublicIdFromUrl(user.profileImageUrl);
      if (oldPublicId) {
        await cloudinaryService.destroyImage(oldPublicId);
      }
      await cloudinaryService.deleteUserFolder(userFolder);
    }
  } catch (cloudErr) {
    console.warn('[deleteUserAccount] Cloudinary cleanup note:', cloudErr.message);
  }

  // 1. Delete all user data in MongoDB (cascade)
  await prisma.matter.deleteMany({ where: { userId } });
  await prisma.link.deleteMany({ where: { userId } });
  await prisma.space.deleteMany({ where: { userId } });
  await prisma.tag.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });

  // 2. Delete user from Firebase Auth if admin is configured
  if (firebaseUid && admin.apps?.length) {
    try {
      await admin.auth().deleteUser(firebaseUid);
    } catch (firebaseErr) {
      console.warn('[deleteUserAccount] Firebase deleteUser note:', firebaseErr.message);
    }
  }

  return { success: true };
}

module.exports = { findOrCreateByFirebaseUid, updateProfile, deleteUserAccount };


