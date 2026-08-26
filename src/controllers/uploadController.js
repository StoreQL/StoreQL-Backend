const cloudinaryService = require('../services/cloudinaryService');
const userService = require('../services/userService');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

// GET /api/uploads/signature?folder=profile
// Mobile app uses this to upload directly to Cloudinary.
const getSignature = asyncHandler(async (req, res) => {
  const folder = req.query.folder === 'space-cover' ? 'storeql/space-covers' : 'storeql/profiles';
  const signature = cloudinaryService.getUploadSignature({ folder });
  res.json(signature);
});

// POST /api/uploads/profile-image (multipart, field name: "image")
// Simpler path for small profile pictures — file never leaves the server's trust boundary.
const uploadProfileImage = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('image file is required');

  const result = await cloudinaryService.uploadImage(req.file.buffer, {
    folder: 'storeql/profiles',
    publicId: req.user.id,
  });

  const user = await userService.updateProfile(req.user.id, {
    profileImageUrl: result.secure_url,
  });

  res.json({ user });
});

module.exports = { getSignature, uploadProfileImage };
