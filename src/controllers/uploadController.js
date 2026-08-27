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
const uploadProfileImage = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('image file is required');

  const userFolder = cloudinaryService.getUserFolder(req.user);

  // If there was an existing image with a different public ID, remove it
  const oldPublicId = cloudinaryService.extractPublicIdFromUrl(req.user.profileImageUrl);
  if (oldPublicId && oldPublicId !== `${userFolder}/profile_picture`) {
    await cloudinaryService.destroyImage(oldPublicId);
  }

  const result = await cloudinaryService.uploadImage(req.file.buffer, {
    folder: userFolder,
    publicId: 'profile_picture',
  });

  const user = await userService.updateProfile(req.user.id, {
    profileImageUrl: result.secure_url,
  });

  res.json({ user, profileImageUrl: result.secure_url });
});

// DELETE /api/uploads/profile-image
const deleteProfileImage = asyncHandler(async (req, res) => {
  const userFolder = cloudinaryService.getUserFolder(req.user);
  const oldPublicId = cloudinaryService.extractPublicIdFromUrl(req.user.profileImageUrl);

  if (oldPublicId) {
    await cloudinaryService.destroyImage(oldPublicId);
  } else {
    await cloudinaryService.destroyImage(`${userFolder}/profile_picture`);
  }

  const user = await userService.updateProfile(req.user.id, {
    profileImageUrl: null,
  });

  res.json({ user, message: 'Profile picture removed successfully' });
});

module.exports = { getSignature, uploadProfileImage, deleteProfileImage };


