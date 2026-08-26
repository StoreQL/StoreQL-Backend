const cloudinary = require('../config/cloudinary');

/**
 * Generates a short-lived signature so the mobile app can upload
 * directly to Cloudinary without ever holding the API secret.
 * Frontend flow: request this, then POST the file + these params
 * straight to Cloudinary's upload endpoint.
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
 * Alternative path: upload a base64/buffer directly from the server
 * (simpler for small profile pictures, avoids exposing any Cloudinary
 * config to the client at all).
 */
async function uploadImage(fileBuffer, { folder, publicId } = {}) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, public_id: publicId, resource_type: 'image', overwrite: true },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(fileBuffer);
  });
}

module.exports = { getUploadSignature, uploadImage };
