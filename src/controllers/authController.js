const userService = require('../services/userService');
const asyncHandler = require('../utils/asyncHandler');

// Called once after Clerk sign-in/sign-up so the mobile app can
// confirm the MongoDB user record exists and fetch its profile.
// requireAuth middleware already did the find-or-create.
const sync = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

// PATCH /api/auth/profile
const updateProfile = asyncHandler(async (req, res) => {
  const { name, profileImageUrl } = req.body;
  const user = await userService.updateProfile(req.user.id, {
    name,
    profileImageUrl,
  });
  res.json({ user });
});

// DELETE /api/auth/account
const deleteAccount = asyncHandler(async (req, res) => {
  await userService.deleteUserAccount(req.user.id, req.clerkId);
  res.json({ message: 'Account and all associated data permanently deleted' });
});

module.exports = { sync, updateProfile, deleteAccount };
