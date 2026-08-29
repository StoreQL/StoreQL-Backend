const prisma = require('../config/prismaClient');
const admin = require('../config/firebaseAdmin');
const cloudinaryService = require('./cloudinaryService');

async function findOrCreateByFirebaseUid({ firebaseUid, email, name, profileImageUrl }) {
  const normalizedEmail = email ? email.trim().toLowerCase() : null;
  const fallbackEmail = normalizedEmail || `${firebaseUid}@unknown.storeql`;

  try {
    // 1. Search by firebaseUid
    let existing = await prisma.user.findUnique({ where: { firebaseUid } });

    // 2. If not found by firebaseUid, search by email (case-insensitive)
    if (!existing && normalizedEmail) {
      existing = await prisma.user.findFirst({
        where: {
          email: { equals: normalizedEmail, mode: 'insensitive' },
        },
      });

      if (existing) {
        existing = await prisma.user.update({
          where: { id: existing.id },
          data: {
            firebaseUid,
            ...(name && (!existing.name || existing.name === 'StoreQL User') ? { name } : {}),
            ...(profileImageUrl && !existing.profileImageUrl ? { profileImageUrl } : {}),
          },
        });
        return existing;
      }
    }

    if (existing) {
      const shouldSetPhoto = !existing.profileImageUrl && profileImageUrl;
      const shouldSetName = (!existing.name || existing.name === 'StoreQL User') && name;

      if (shouldSetPhoto || shouldSetName || (normalizedEmail && existing.email !== normalizedEmail)) {
        return await prisma.user.update({
          where: { id: existing.id },
          data: {
            ...(normalizedEmail && { email: normalizedEmail }),
            ...(shouldSetName && { name }),
            ...(shouldSetPhoto && { profileImageUrl }),
          },
        });
      }
      return existing;
    }

    // 3. User does not exist, create
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
      const existingByUid = await prisma.user.findUnique({ where: { firebaseUid } });
      if (existingByUid) return existingByUid;

      if (normalizedEmail) {
        const existingByEmail = await prisma.user.findFirst({
          where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
        });
        if (existingByEmail) {
          return await prisma.user.update({
            where: { id: existingByEmail.id },
            data: { firebaseUid },
          });
        }
      }
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
