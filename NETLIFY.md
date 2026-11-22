# Aishwary Farms on Netlify

Connect the repository to Netlify. The included `netlify.toml` builds with `npm run build`, publishes `dist`, and deploys the JavaScript function in `netlify/functions`. Deploy from the repository or through the Netlify CLI so the function is included.

In the Netlify site’s environment variables, configure these values for Functions. Keep secrets in Netlify’s environment settings.

| Variable | Value |
| --- | --- |
| `ADMIN_ORIGIN` | Production origin, such as `https://your-site.netlify.app`, with no path |
| `ADMIN_SESSION_SECRET` | Random secret of at least 43 characters |
| `NETLIFY_API_TOKEN` | Server-side Netlify token with access to this site |
| `NETLIFY_SITE_ID` | Optional override of Netlify’s `SITE_ID` |

Generate a session secret locally:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Redeploy after configuring the variables. Open `/login` and use the owner credentials. The server function stores only one-way email and salted password verifiers; the plain password is not included in the React bundle or source. The dashboard renews its short-lived access token every 60 seconds while open. The refresh session ends after eight hours. Changing the signing secret invalidates existing sessions.

The Netlify activity tab refreshes every 30 seconds while visible. It shows recent builds and deploys, published file count and total size where Netlify supplies sizes, and the current browser’s homepage response time. Bandwidth, quota consumption and account-wide activity are outside this view.

Content edits keep the existing browser and file workflow. Save or download `content.json`, place it in `public/`, and deploy again to publish changes across devices.

## Family tree

### Development and verification

Run `npm install`, then `npm run dev -- --host 127.0.0.1 --port 5173`.
Run `npm run test:family` for API and relationship validation, `npx playwright test` for desktop/mobile acceptance checks (Microsoft Edge must be installed), and `npm run build` for production. Browser checks start their own loopback server on port 5187 with temporary family data and isolated test credentials. They do not modify the real family store.

The existing database is a versioned JSON family document, not a relational SQL database. First access performs the version-1 import from the legacy Marathi family data; subsequent reads preserve saved members and ID-based links. No SQL migration command is needed. Keep `.netlify/family-*.json` when restarting local development. Local data does not automatically transfer to the Netlify store.

For configurable hashed credentials, Functions also accept `ADMIN_EMAIL_HASH` (SHA-256 of the lowercase email), `ADMIN_PASSWORD_SALT` (hex), and `ADMIN_PASSWORD_HASH` (PBKDF2 SHA-256, 310000 iterations, 32 bytes). Configure all three together. The owner account is the only authorized identity; this release does not provision additional family accounts.

Add Child preselects the clicked member in the mother field for recorded female members, otherwise the father field. The form makes this editable and leaves the other field blank. Linking a duplicate preserves existing parent links unless a replacement is selected. Parent corrections, including removing a parent, are available in Member Details.

The authenticated Family Tree and Members pages store people and parent/spouse links by member ID. Production uses the site-wide `@netlify/blobs` store, scoped to the signed-in administrator. Netlify supplies the Blobs context to deployed Functions; the function detects production Lambda environments even if `NETLIFY` or `CONTEXT` is absent, and never uses local `.netlify/` files there. On first authenticated access, it seeds an empty store from the existing family data in `src/data.js` without replacing a populated store; no manual database migration is needed and the public family section remains available. Uploaded member photos and private details are returned only by the authenticated API.

The dashboard supports adding sons and daughters, adding a parent or spouse, linking existing parents and spouses, multiple spouse links, and deleting members. Deletion removes the member’s parent/spouse references from other records and clears its request history; children remain in the family with the deleted parent link unset. Newly created records include a server-generated creation date for dashboard summaries; imported legacy records keep their existing data and have no inferred creation date.

For local Vite development, family edits are persisted under `.netlify/` and are excluded from Git. To deploy, commit the Function changes and deploy the repository through Netlify with the included `netlify/functions` directory and installed `@netlify/blobs` dependency. Netlify provides the production Blobs context automatically; no local `.netlify/` directory or manual store initialization is needed. After deployment, sign in and verify the Family Dashboard and a family edit. The existing sign-in does not include password recovery, so no reset-password screen is provided.
