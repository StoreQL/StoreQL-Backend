const asyncHandler = require('../utils/asyncHandler');

// Called once after Firebase sign-in/sign-up so the mobile app can
// confirm the MongoDB user record exists and fetch its profile.
// requireAuth middleware already did the find-or-create.
const sync = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

module.exports = { sync };
