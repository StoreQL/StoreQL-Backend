const { getAuth } = require('@clerk/express');
const { clerkClient } = require('../config/clerk');
const userService = require('../services/userService');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Verifies the Clerk session/token on every protected request, then
 * attaches the corresponding MongoDB user to req.user.
 *
 * The frontend NEVER sends a user id — ownership is always derived
 * from this verified token, never from the request body.
 */
const requireAuth = asyncHandler(async (req, res, next) => {
  const auth = getAuth(req);
  const userId = auth?.userId || req.auth?.userId;

  if (!userId) {
    throw ApiError.unauthorized('Invalid or expired session. Please sign in again.');
  }

  let email = null;
  let name = null;
  let profileImageUrl = null;

  try {
    const clerkUser = await clerkClient.users.getUser(userId);
    if (clerkUser) {
      email =
        clerkUser.emailAddresses?.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ||
        clerkUser.emailAddresses?.[0]?.emailAddress ||
        null;
      name =
        [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') ||
        clerkUser.username ||
        null;
      profileImageUrl = clerkUser.imageUrl || null;
    }
  } catch (userFetchErr) {
    console.warn('[requireAuth] Clerk getUser note:', userFetchErr.message);
  }

  const user = await userService.findOrCreateByClerkId({
    clerkId: userId,
    email,
    name,
    profileImageUrl,
  });

  req.user = user;
  req.clerkId = userId;
  next();
});

module.exports = { requireAuth };
