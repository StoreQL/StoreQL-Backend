const cloudinary = require('../config/cloudinary');

/**
 * Returns a standardized folder path for the user in Cloudinary based on their username/email.
 * Example: "storeql/users/johndoe_60d5ec49f1b2c800155b4b1a"
 */
function getUserFolder(user) {
  const rawName = user.name || (user.email ? user.email.split('@')[0] : 'user');
  const sanitized = rawName.toLowerCase().replace(/[^a-z0-9_-]/g, '_').slice(0, 30);
  return `storeql/users/${sanitized}_${user.id}`;
}

/**
 * Extracts Cloudinary public_id from a full Cloudinary secure URL.
 */
function extractPublicIdFromUrl(url) {
  if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) return null;
  try {
    const parts = url.split('/upload/');
    if (parts.length < 2) return null;
    let path = parts[1];
    // Strip version prefix e.g. v1724698123/
    path = path.replace(/^v\d+\//, '');
    // Strip file extension e.g. .jpg, .png, .webp
    path = path.replace(/\.[^/.]+$/, '');
    return decodeURIComponent(path);
  } catch {
    return null;
  }
}

/**
 * Destroys a single image by publicId in Cloudinary.
 */
async function destroyImage(publicId) {
  if (!publicId) return null;
  try {
    return await cloudinary.uploader.destroy(publicId, { invalidate: true });
  } catch (err) {
    console.warn('[cloudinaryService] destroyImage note:', err.message);
    return null;
  }
}

/**
 * Deletes all resources within a folder and removes the folder in Cloudinary.
 */
async function deleteUserFolder(folderPath) {
  if (!folderPath) return null;
  try {
    await cloudinary.api.delete_resources_by_prefix(folderPath);
    await cloudinary.api.delete_folder(folderPath);
    return true;
  } catch (err) {
    console.warn('[cloudinaryService] deleteUserFolder note:', err.message);
    return false;
  }
}

/**
 * Generates a short-lived signature so the mobile app can upload
 * directly to Cloudinary without ever holding the API secret.
 */
function getUploadSignature({ folder }) {
  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign = { timestamp, folder };

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET
  );

  return {
    timestamp,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    folder,
  };
}

/**
 * Upload an image buffer directly from the server to Cloudinary.
 * Always overwrites and invalidates CDN cache so subsequent updates replace cleanly.
 */
async function uploadImage(fileBuffer, { folder, publicId } = {}) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: 'image',
        overwrite: true,
        invalidate: true,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(fileBuffer);
  });
}

module.exports = {
  getUserFolder,
  extractPublicIdFromUrl,
  destroyImage,
  deleteUserFolder,
  getUploadSignature,
  uploadImage,
};

