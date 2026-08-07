# Simplest Fuckn Todo

A single-user kanban board. React + Vite on the front, two Vercel serverless
functions on the back, one MongoDB Atlas collection underneath, gated by a shared
secret and installable as an online-only PWA.

## Running it locally

```bash
npm install
npm run dev:api    # serverless handlers over an ephemeral in-memory Mongo
npm run dev        # Vite on http://localhost:5173, proxying /api to the adapter
```

`npm run dev:api` defaults `APP_SECRET` to `dev-secret` and prints it. Enter that
on the unlock screen.

It keeps its database in `.dev-mongo/` (gitignored), so boards survive a restart.
Delete that directory to start clean, or set `DEV_MONGO_EPHEMERAL=1` for
throwaway storage — which is what the E2E suite runs with.

| Command | What it does |
| --- | --- |
| `npm run dev` / `npm run dev:api` | the two halves of local development |
| `npm test` | unit, component and API suites |
| `npm run e2e` | Playwright end-to-end suites |
| `npm run build` | typecheck, then production build into `dist/` |
| `npm run preview` | serve the production build (the only way to exercise the service worker) |
| `node scripts/make-icons.mjs` | regenerate the PWA icons from one SVG |
| `npx tsx scripts/migrate-obsidian.ts` | import an Obsidian Kanban board (see below) |

## Environment

| Variable | Used by | Notes |
| --- | --- | --- |
| `MONGODB_URI` | API | Atlas connection string. Locally the dev adapter supplies its own. |
| `MONGODB_DB` | API | Optional, defaults to `todo`. |
| `APP_SECRET` | API | The shared secret. Required in production. |

Authentication is a single shared secret, hashed on both sides and compared in
constant time. There are no accounts. Atlas may therefore allow connections from
anywhere — the network is not the boundary, the secret is.

## Installing on an iPhone

1. Open the deployed URL in **Safari** (not Chrome — only Safari can install).
2. Tap the Share button, then **Add to Home Screen**, then **Add**.
3. Launch it from the home screen. It opens standalone, without Safari chrome.
4. **You will be asked for the secret again.** An installed iOS web app gets its
   own storage silo: its `localStorage` is separate from Safari's, so the secret
   you entered in the browser is not visible to the installed app. Enter it once
   more and the installed app stays unlocked on its own.

Note that clearing Safari's website data, or iOS evicting storage after long
disuse, will also clear the secret and you will re-enter it.

## Installing on desktop Chrome

Open the URL, then use the install affordance in the address bar. The installed
window runs standalone.

## Offline behaviour

Deliberately none. The service worker precaches the app shell only; every `/api`
request goes to the network. A cached board would be a stale board, and a cached
`401` would look like a lockout. Offline, the shell loads and the board reports
that it could not reach the server.

## Importing an Obsidian Kanban board

`scripts/migrate-obsidian.ts` reads Obsidian Kanban markdown — `##` headings
become lists, `- [ ]` lines become cards, the trailing `%% kanban:settings %%`
block is ignored — and inserts one board straight into the collection.

```bash
npx tsx scripts/migrate-obsidian.ts --dry-run           # parse and print the counts
MONGODB_URI="$(cat .dev-mongo-uri)" \
  npx tsx scripts/migrate-obsidian.ts --name "Personal" # into the local dev database
MONGODB_URI="mongodb+srv://..." \
  npx tsx scripts/migrate-obsidian.ts --name "Personal" # into Atlas
```

It defaults to `existing-tasks.md`; pass a path to use another file. Running it
twice creates two boards — it is an import, not a sync.

## Deploying

1. **Atlas**: create a free M0 cluster on **AWS `eu-central-1` (Frankfurt)** and a
   database user. Allow access from anywhere (`0.0.0.0/0`) — the shared secret is
   the boundary, not the network, and Vercel's functions have no fixed egress IP
   on Hobby.
2. **Vercel**: import the repo. The framework preset is Vite; `vercel.json`
   already routes `/api/*` to the functions, sends everything else to the SPA,
   and pins the functions to `fra1` — the same Frankfurt datacentre as the
   cluster, so each API call is one short hop rather than a transatlantic one.
   Moving the cluster elsewhere means changing `regions` to match.
3. Set `MONGODB_URI` and `APP_SECRET` in the project's environment variables for
   both Production and Preview. Add `MONGOMS_DISABLE_POSTINSTALL=1` too: the
   local dev adapter's `mongodb-memory-server` would otherwise download a Mongo
   binary during every build.

   The database name is not read from the URI — it is `todo`, overridable with
   `MONGODB_DB`.
4. Deploy, then walk the checklists in [`docs/smoke.md`](docs/smoke.md).

## Manual checks

Some things only a real device or a real deployment can prove. Those checklists,
and their current status, live in [`docs/smoke.md`](docs/smoke.md).
