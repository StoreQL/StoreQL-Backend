# StoreQL Backend

Node.js + Express + Prisma (MongoDB) + Firebase Admin + Cloudinary.

## Structure
```
backend/
├── server.js              ← entry point
├── prisma/schema.prisma   ← MongoDB models: User, Space, Link, Matter, Tag
├── .env.example           ← copy to .env and fill in your keys
└── src/
    ├── app.js             ← Express app (middleware + route mounting)
    ├── config/            ← prismaClient, firebaseAdmin, cloudinary
    ├── middleware/         ← auth (Firebase token verify), errorHandler, rateLimiter
    ├── routes/             ← thin route definitions per resource
    ├── controllers/        ← request/response glue, calls services
    ├── services/           ← business logic + Prisma queries
    ├── validators/         ← zod schemas + validate() middleware
    └── utils/              ← ApiError, asyncHandler, urlSafety (SSRF guard)
```

Request flow: `Routes → Controllers → Services → Prisma → MongoDB` — no business logic in route files, per the spec.

## 1. Install dependencies
```bash
cd backend
npm install
```

## 2. Set up environment variables
```bash
cp .env.example .env
```
Then paste in:
- `MONGODB_URL` — your MongoDB Atlas (or local) connection string
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` — from your Firebase service account JSON (Project Settings → Service Accounts → Generate new private key)
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — from your Cloudinary dashboard

## 3. Push the Prisma schema to MongoDB
```bash
npx prisma generate
npx prisma db push
```

## 4. Run it
```bash
npm run dev
```
Health check: `GET http://localhost:4000/api/health`

## Authenticating requests
Every protected endpoint expects:
```
Authorization: Bearer <firebase_id_token>
```
The `requireAuth` middleware verifies this with Firebase Admin, then finds-or-creates the matching MongoDB user and attaches it as `req.user`. Ownership is always derived from the verified token — the client never sends a user id that's trusted for authorization.

## Key endpoints
```
POST   /api/auth/sync            sync/fetch the current user after login

GET    /api/spaces               list spaces (with link/matter counts)
POST   /api/spaces
PATCH  /api/spaces/:id
DELETE /api/spaces/:id

POST   /api/links/preview        { url } → metadata preview, nothing saved
GET    /api/links                paginated, filter by spaceId/tag/source
POST   /api/links                creates link + optional inline Matter/tags;
                                  fetches metadata in the background if not
                                  supplied — the save is never blocked on it
PATCH  /api/links/:id
DELETE /api/links/:id

GET    /api/matters
POST   /api/matters
PATCH  /api/matters/:id
DELETE /api/matters/:id

GET    /api/tags
POST   /api/tags

GET    /api/search?q=resume      searches links, spaces, matters, tags

GET    /api/uploads/signature    signed params for direct-to-Cloudinary upload
POST   /api/uploads/profile-image (multipart) simpler server-side upload path
```

## Security notes already built in
- **SSRF protection** (`utils/urlSafety.js`): blocks localhost, private IP ranges (10.x, 172.16–31.x, 192.168.x, 169.254.x incl. cloud metadata endpoint), and re-validates every redirect hop — not just the initial URL — before the metadata fetcher follows it.
- **Metadata fetch never blocks or fails a save**: `POST /api/links` persists the URL immediately; metadata is fetched in the background and the link's `metadataStatus` moves `pending → success/failed`.
- **Firebase token verified server-side** on every protected route; no client-supplied user id is ever trusted.
- **Cloudinary secrets stay server-side**; the app either requests a short-lived signed upload or sends the file through the backend.
- Request size caps, per-route rate limiting (tighter on `/links/preview`), and centralized error handling that never leaks internals to the client.

## Not yet wired up (intentionally, per phased plan)
- Space auto-suggestion logic (Phase 6 — AI)
- Full-text search index (current search is `contains`-based; fine at MVP scale, swap for Atlas Search later without changing the service's API)
- Offline write queue (client-side concern, backend already idempotent-friendly)
