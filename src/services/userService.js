const prisma = require('../config/prismaClient');
const { clerkClient } = require('../config/clerk');
const cloudinaryService = require('./cloudinaryService');

async function findOrCreateByClerkId({ clerkId, email, name, profileImageUrl }) {
  const fallbackEmail = email || `${clerkId}@unknown.storeql`;

  try {
    // 1. Check if user exists by clerkId
    let existing = await prisma.user.findUnique({ where: { clerkId } });

    // 2. If not found by clerkId, check if existing user has this email (migrating from previous auth)
    if (!existing && email) {
      existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        // Link existing user record to new clerkId
        existing = await prisma.user.update({
          where: { id: existing.id },
          data: {
            clerkId,
            ...(name && (!existing.name || existing.name === 'StoreQL User') ? { name } : {}),
            ...(profileImageUrl && !existing.profileImageUrl ? { profileImageUrl } : {}),
          },
        });
        return existing;
      }
    }

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
        clerkId,
        email: fallbackEmail,
        name: name || null,
        profileImageUrl: profileImageUrl || null,
      },
    });
  } catch (err) {
    if (err.code === 'P2002') {
      const existingByClerk = await prisma.user.findUnique({ where: { clerkId } });
      if (existingByClerk) return existingByClerk;

      if (email) {
        const existingByEmail = await prisma.user.findUnique({ where: { email } });
        if (existingByEmail) {
          return await prisma.user.update({
            where: { id: existingByEmail.id },
            data: { clerkId },
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

async function deleteUserAccount(userId, clerkId) {
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

  // 2. Delete user from Clerk Auth if clerkId provided
  if (clerkId) {
    try {
      await clerkClient.users.deleteUser(clerkId);
    } catch (clerkErr) {
      console.warn('[deleteUserAccount] Clerk deleteUser note:', clerkErr.message);
    }
  }

  return { success: true };
}

module.exports = { findOrCreateByClerkId, updateProfile, deleteUserAccount };
