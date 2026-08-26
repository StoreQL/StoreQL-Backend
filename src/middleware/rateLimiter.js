const rateLimit = require('express-rate-limit');

// General API limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many requests. Please slow down.' } },
});

// Tighter limiter for metadata/preview fetching (outbound requests
// to arbitrary URLs are the most abusable endpoint).
const previewLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many preview requests. Please wait a moment.' } },
});

module.exports = { apiLimiter, previewLimiter };
