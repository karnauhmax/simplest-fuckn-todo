# Personal Kanban Todo Webapp + PWA — state plan

- Source: .plans/plans/ralplan-kanban-todo-pwa.md — authoritative on scope
- Slices: .plans/slices/kanban-todo-pwa.md
- Spec (background): .plans/specs/deep-interview-kanban-todo-pwa.md

## The slice

A single-user Kanban todo SPA — React+Vite with dnd-kit drag-and-drop — persisted through two Vercel serverless functions into one embedded MongoDB Atlas collection, gated by a shared secret, installable as an online-only PWA. Done means: boards, lists, and plain-text cards fully editable with animated drag including iOS Safari touch, every mutation surviving reload, unit + E2E suites green, live on Vercel Hobby + Atlas M0 at $0/month.

## How to use it

1. Read this file, then the source plan.
2. **Re-run the previous part's check before you trust it.** What is recorded below is a claim by a session that no longer exists. If it does not reproduce, that is the work — before anything new starts.
3. Take one part: the lowest-numbered `todo` whose dependencies are all `done`.
4. Before stopping: set the part's status, record **Last run** verbatim — the date and what the check printed — and append anything you decided to **Decisions**.
5. A Check that proved inexact is refined in place; the next session inherits the better one.
6. A part that turns out wrong, or larger than it reads, is a decision to record and stop on. Changing this plan is allowed. Working around it silently is not.
7. Commit the code and this file together.
8. When every part is `done`, move this file to `.plans/archive/`.

What belongs in **Decisions** is a choice another session could reasonably make differently. The work already shows what was chosen; it cannot show what was rejected.

Every part from 1 onward, whatever else it runs: `npm run test` (wired in part 1; unit + component + API). From part 9 onward also `npm run e2e`.

## Decisions

Append. Do not rewrite an entry, and do not delete one — a decision that turned out wrong is superseded by a later entry saying so.

(Planning-time decisions live in the plan's ADR.)

- **2026-08-06 — git repo is https://github.com/karnauhmax/simplest-fuckn-todo.git; `.plans/` is versioned.** User supplied the remote and asked for git init in this directory (part 1). Versioning `.plans/` keeps the journal and decision history across machines; gitignoring it was the alternative and was not chosen.
- **2026-08-06 — app name "simplest-fuckn-todo" (manifest name "Simplest Fuckn Todo"), placeholder icons.** Name derived from the repo the user chose. Generated flat kanban-glyph icons for part 8; user-supplied artwork rejected as a blocker — can be swapped in later anytime.
- **2026-08-06 — iPhone smokes are pause-and-hand-off.** At the end of parts 7 and 11 the session stops, hands the user a URL + checklist, and the part stays `doing` until the user reports pass/fail. "Mark blocked and continue" and "trust webkit until deploy" were rejected — the plan names real-iPhone drag feel the top delivery risk, so it gates progression.

## Parts

Status is `todo`, `doing`, `done`, or `blocked`.

### 1. Walking skeleton: board names from DB to browser — `todo`

Vite+TS+React scaffold, `/shared/types.ts`, `vercel.json`, Vitest wiring; cached MongoClient; `GET /api/boards` returning `{id, name}[]` summaries; minimal shell rendering the fetched names. No auth, no mutations. Also: `git init` with remote `https://github.com/karnauhmax/simplest-fuckn-todo.git`, `.gitignore` (node_modules, dist, .env*, .pi-subagents), initial commit including `.plans/` (per Decisions 2026-08-06).

**Done when** a board document inserted directly into the database appears by name in the browser, served through the real API function, and the summaries payload contains no lists or cards.

- Check: `npm run test` passes (suite may be near-empty but wired); with the dev server + a local/ephemeral Mongo running, `curl` on `/api/boards` prints a JSON array of `{id, name}` objects and `grep`-ing the response for `"lists"` or `"cards"` returns nothing; the inserted board's name is visible in the browser page.
- Last run: not yet
- Depends on: none

### 2. Shared-secret auth end-to-end — `todo`

`requireAuth` (SHA-256 both sides → `timingSafeEqual`) on all endpoints; client sends `Authorization: Bearer` from localStorage; UnlockScreen; 401 flips to locked. API tests for correct/wrong/wrong-length secrets; component tests for UnlockScreen and 401-lock.

**Done when** with a wrong or missing secret the app stays locked and the API returns 401; the correct secret entered once unlocks the app and still unlocks it after a full reload.

- Check: `npm run test` passes including the auth API tests (401 on missing/wrong bearer, wrong-length secret rejected without a 500) and UnlockScreen component tests; manual: `curl` without bearer prints 401, with `APP_SECRET` prints 200; in the browser, unlock then reload stays unlocked.
- Last run: not yet
- Depends on: 1

### 3. Board CRUD and switching — `todo`

`POST` create; `GET/PUT/DELETE` on `[id]` (rename via PUT, no PATCH); header-dropdown BoardSwitcher; create/rename/delete from the UI. API tests: happy paths, 404, 400, PUT round-trip of nested lists/cards.

**Done when** a board can be created, renamed, deleted, and switched to from the header dropdown, and a full reload shows the identical set of boards.

- Check: `npm run test` passes including the boards API tests (404 unknown id, 400 malformed body, PUT round-trip intact); manual: in the browser create → rename → switch → delete a board, reload, the remaining set matches exactly.
- Last run: not yet
- Depends on: 2

### 4. Lists on a board, persisted through the write serializer — `todo`

`boardReducer` list actions; List components with inline edit; per-board coalesce-to-latest write serializer in `/src/api/client.ts` (one PUT in flight, newest snapshot queued, failure toasts + refetch, chain never wedges); every committed action persists via full-board PUT.

**Done when** lists created, renamed, and deleted survive a full reload, and a rapid burst of list mutations ends with the final state intact after reload — no lost updates.

- Check: `npm run test` passes including reducer list-action tests and serializer tests (burst → only latest snapshot sent, intermediates dropped, failed PUT doesn't wedge); manual: perform ~5 list mutations in quick succession, reload, final state matches what was on screen.
- Last run: not yet
- Depends on: 3

### 5. Cards: quick-add, inline edit, delete — `todo`

Card reducer actions (quick-add appends at bottom, edit, delete; `crypto.randomUUID()` ids); QuickAdd, InlineEdit, Card components persisting through the serializer.

**Done when** cards can be quick-added at the bottom of a list, edited inline, and deleted, and a full reload shows the identical cards in the identical order.

- Check: `npm run test` passes including card reducer tests (quick-add appends at bottom) and RTL tests (QuickAdd submits on Enter and clears; InlineEdit commits and escape-cancels); manual: add/edit/delete cards, reload, order and content identical.
- Last run: not yet
- Depends on: 4

### 6. Card drag-and-drop with animation — `todo`

dnd-kit sortable cards vertical + cross-list via `onDragOver` (local state only mid-gesture), `DragOverlay`, settle-on-drop; exactly one persist on `onDragEnd`, none on cancel (restore `onDragStart` snapshot).

**Done when** a card dragged within and across lists makes neighbors slide apart and settles animatedly on drop, a cancelled drag restores the pre-drag arrangement, and a full reload shows the dropped arrangement.

- Check: `npm run test` passes including reducer move-card tests (within list, across lists, into empty list); manual with devtools Network open: one drag produces exactly one PUT, fired at drop; Esc mid-drag restores the previous arrangement and produces zero PUTs; reload shows the dropped arrangement.
- Last run: not yet
- Depends on: 5

### 7. List reordering and iOS touch drag — `todo`

Horizontal sortable lists; TouchSensor ≈200ms delay + tolerance; `touch-action: manipulation`, `-webkit-user-select: none`, `-webkit-touch-callout: none` during drag. Ends with the plan's **binding** real-iPhone smoke.

**Done when** lists reorder by drag and survive reload, and on a physical iPhone in Safari a card can be touch-dragged across lists without fighting page scroll — recorded against the smoke checklist.

- Check: `npm run test` passes including reorder-lists reducer tests; manual: drag a list, reload, order intact; the smoke checklist (README or `docs/smoke.md`) contains a dated pass entry for real-iPhone touch drag — `grep` for that entry succeeds.
- Last run: not yet
- Depends on: 6

### 8. PWA installability — `todo`

`vite-plugin-pwa` (generateSW): app-shell precache only, `/api/*` uncached; manifest `display: standalone`, 192/512 + maskable icons, apple-touch-icon + iOS meta; README documents A2HS steps and the iOS storage-silo secret re-entry.

**Done when** desktop Chrome offers the install prompt and the installed app launches standalone, the manifest and icons are served, and the iPhone Add-to-Home-Screen steps (with the secret re-entry note) are documented.

- Check: after `npm run build` and serving the preview build, the manifest URL returns JSON containing `"display": "standalone"` and both icon URLs return 200; Chrome shows the install affordance and the installed window is standalone; `grep -i "add to home screen"` and `grep -i "silo\|re-enter"` in README both match.
- Last run: not yet
- Depends on: 3

### 9. E2E harness and golden path — `todo`

Dev adapter (Node server mounting the real handler functions under the Vite proxy, ephemeral mongodb-memory-server); Playwright `chromium` via `webServer`; golden-path spec: unlock → create board → 2 lists → cards → drag across lists → reorder → edit → delete → reload → identical state.

**Done when** the golden-path spec passes in chromium against the dev adapter, ending with the reload asserting identical state.

- Check: `npm run e2e` (chromium project) passes with the golden-path spec listed as passed in the Playwright report; `npm run test` still green.
- Last run: not yet
- Depends on: 7

### 10. E2E hardening: auth, races, touch, PWA smoke — `todo`

Remaining specs on the part-9 harness: auth (no/wrong/correct secret, persists across reload); rapid-mutation burst + reload; list reorder + reload; webkit iPhone-profile touch drag via manually dispatched touch events with >200ms dwell; PWA smoke (standalone manifest + SW registered, `devOptions.enabled` or `vite preview`).

**Done when** all five specs pass, including the webkit touch spec moving a card across lists and the PWA smoke observing a registered service worker.

- Check: `npm run e2e` passes with both projects (chromium + webkit) and all five specs reported passed; `npm run test` still green.
- Last run: not yet
- Depends on: 8, 9

### 11. Deploy at $0 and close out — `todo`

Atlas M0 (allowlist 0.0.0.0/0 — auth is app-layer) + Vercel Hobby with `MONGODB_URI`, `APP_SECRET`; manual smoke against the Vercel preview deployment; real-iPhone install + touch smoke re-confirmed.

**Done when** the app is live on Vercel Hobby with Atlas M0 at $0/month, the preview-deployment smoke passes, and the installed iPhone app performs a touch drag that persists — checklist recorded.

- Check: the production URL loads over HTTPS and completes an unlock + card mutation that survives reload; Vercel dashboard shows Hobby plan and Atlas shows M0 (no paid resources); the smoke checklist contains dated pass entries for the preview-deployment smoke and the iPhone install + touch drag.
- Last run: not yet
- Depends on: 10

## Open questions

None open. All three initial questions (git/.plans versioning, app name/icons, iPhone smoke hand-off) were resolved 2026-08-06 — see Decisions.
