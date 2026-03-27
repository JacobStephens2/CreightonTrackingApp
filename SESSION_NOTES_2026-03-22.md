# Session Notes — March 22, 2026

## Creighton Cycle Tracker — Privacy Feature Improvements

Implemented three privacy/security improvements based on a review of the codebase, plus fixed an existing bug. Commit: `e6d6899`

### 1. End-to-End Encryption (E2E)

**Problem:** AES-256-GCM encryption was server-side only — the server held the key and could read all synced health data.

**Solution:** Client-side key derivation so the server operator cannot decrypt user data.

- New `src/services/crypto-service.ts` — Web Crypto API with PBKDF2 (600,000 iterations, SHA-256) to derive an AES-256-GCM key from the user's password + a random salt
- Extracted server crypto to `server/src/utils/crypto.ts` (shared by sync and share routes)
- Key is derived at login/register, stored in localStorage, cleared on logout
- **Upload flow:** client encrypts full data → server adds a second encryption layer (defense in depth)
- **Download flow:** server removes its layer → returns client-encrypted blob → client decrypts
- **Share data:** client sends a pre-filtered copy (no intercourse/notes) alongside the encrypted blob, stored in new `share_data` column so the server can serve share views without decrypting user data
- **Backward compatible:** existing users get legacy sync until re-login, when a salt is lazily generated and E2E kicks in
- **Password reset:** generates new salt, user re-syncs from local device with new key

**Schema changes:**
- `users.encryption_salt` TEXT — base64-encoded PBKDF2 salt
- `sync_snapshots.share_data` TEXT — server-encrypted filtered data for share views
- `sync_snapshots.e2e` INTEGER — flag distinguishing E2E vs legacy format

### 2. Share Link Expiration

**Problem:** Share links never expired — once generated, they were valid indefinitely.

**Solution:**
- Share tokens now expire after 90 days
- `share_tokens.expires_at` column added
- Expiration checked on both status requests and view access
- Expired links return HTTP 410 Gone
- Expiration date displayed in Settings UI when a share link is active

### 3. JWT Session Invalidation

**Problem:** Password reset did not invalidate existing sessions — old JWTs remained valid for up to 30 days.

**Solution:**
- `users.token_version` INTEGER column (default 0)
- `tokenVersion` included in JWT payload
- `requireAuth` middleware checks token version against DB on every request
- Password reset increments `token_version`, immediately invalidating all sessions across all devices
- Pre-migration tokens (without `tokenVersion`) allowed through for backward compatibility

### 4. Bug Fix — Share View Decrypt

**Problem:** `server/src/routes/share.ts` called `JSON.parse(syncRow.data)` directly without decrypting — would fail for any encrypted sync data (introduced when encryption was added to sync but not accounted for in the share handler).

**Fix:** Share view now uses `share_data` column when available (E2E users), and falls back to `decrypt()` → `JSON.parse()` for legacy data.

### Files Changed

| File | Change |
|------|--------|
| `server/src/utils/crypto.ts` | **New** — extracted encrypt/decrypt + generateSalt |
| `src/services/crypto-service.ts` | **New** — client-side PBKDF2 + AES-256-GCM |
| `server/src/db/schema.ts` | Migrations for 5 new columns |
| `server/src/middleware/auth.ts` | Token version validation in requireAuth |
| `server/src/routes/auth.ts` | Salt generation/return, token_version on reset |
| `server/src/routes/sync.ts` | E2E upload/download format, uses shared crypto |
| `server/src/routes/share.ts` | Expiration, share_data support, decrypt fix |
| `src/services/auth-service.ts` | Key derivation on login/register/reset, clear on logout |
| `src/services/sync-service.ts` | Client-side encrypt before upload, decrypt after download |
| `src/services/share-service.ts` | Updated types for expiresAt |
| `src/components/settings-view.ts` | Show share link expiration date |
| `src/components/privacy-policy-view.ts` | Updated to describe E2E encryption |

### Deployment Notes

After deploying, the server needs to be restarted (`systemctl restart creighton-api`) to pick up:
- New schema migrations (runs on startup via `initSchema()`)
- Updated encryption flow in sync/share/auth routes

Existing users will transparently migrate to E2E on their next login — no action needed from them.
