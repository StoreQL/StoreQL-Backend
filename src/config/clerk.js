const { createClerkClient } = require('@clerk/express');

const clerkSecretKey = process.env.CLERK_SECRET_KEY;
const clerkPublishableKey = process.env.CLERK_PUBLISHABLE_KEY;

if (!clerkSecretKey) {
  console.warn('[Clerk] Warning: CLERK_SECRET_KEY is not set in environment variables.');
}

const clerkClient = createClerkClient({
  secretKey: clerkSecretKey,
  publishableKey: clerkPublishableKey,
});

module.exports = {
  clerkClient,
};
