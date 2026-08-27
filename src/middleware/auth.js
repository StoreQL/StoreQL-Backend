const admin = require('../config/firebaseAdmin');
const userService = require('../services/userService');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Verifies the Firebase ID token on every protected request, then
 * attaches the corresponding MongoDB user to req.user.
 *
 * The frontend NEVER sends a user id — ownership is always derived
 * from this verified token, never from the request body.
 */
const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw ApiError.unauthorized('Missing or malformed Authorization header');
  }

  let decoded;
  try {
    decoded = await admin.auth().verifyIdToken(token);
  } catch (err) {
    throw ApiError.unauthorized('Invalid or expired session. Please sign in again.');
  }

  const user = await userService.findOrCreateByFirebaseUid({
    firebaseUid: decoded.uid,
    email: decoded.email,
    name: decoded.name,
    profileImageUrl: decoded.picture || decoded.photoURL || null,
  });

  req.user = user;
  req.firebaseUid = decoded.uid;
  next();
});

module.exports = { requireAuth };
