# Slices: Personal Kanban Todo Webapp + PWA

- Source: .plans/plans/ralplan-kanban-todo-pwa.md — authoritative on scope
- Generated: 2026-08-06

## 1. Walking skeleton: board names from DB to browser

Vite+TS+React scaffold with `/shared/types.ts`, `vercel.json`, Vitest wiring; cached MongoClient (`/api/_lib/db.ts`); `GET /api/boards` returning `{id, name}[]` summaries via projection; minimal app shell rendering the fetched board names. No auth, no mutations — the thinnest path through frontend, API, and Mongo.

**Done when** a board document inserted directly into the database appears by name in the browser, served through the real API function, and the summaries payload contains no lists or cards.

Depends on: none

## 2. Shared-secret auth end-to-end

`requireAuth` in `/api/_lib/auth.ts` (SHA-256 both sides, then `timingSafeEqual`) applied to the boards endpoint; API client sends `Authorization: Bearer` from localStorage; UnlockScreen; any 401 flips the app to locked. API tests: correct secret accepted, wrong secret 401, wrong-length secret rejected without throwing. Component tests: UnlockScreen stores secret and retries; 401 locks.

**Done when** with a wrong or missing secret the app stays locked and the API returns 401; the correct secret entered once unlocks the app and still unlocks it after a full reload.

Depends on: 1

## 3. Board CRUD and switching

`POST` on `api/boards/index.ts`; `GET/PUT/DELETE` on `api/boards/[id].ts` (rename via PUT replacing `{name, lists}` — no PATCH); header-dropdown BoardSwitcher; create/rename/delete boards from the UI. API tests: happy paths, 404 unknown id, 400 malformed body, PUT round-trips nested lists/cards intact.

**Done when** a board can be created, renamed, deleted, and switched to from the header dropdown, and a full reload shows the identical set of boards.

Depends on: 2

## 4. Lists on a board, persisted through the write serializer

`boardReducer` with list actions (create, rename, delete); List components with inline edit; per-board coalesce-to-latest write serializer in `/src/api/client.ts` (max one PUT in flight, only the newest snapshot queued, failure toasts + refetch without wedging the chain); every committed action persists via full-board PUT. Unit tests: reducer list actions; serializer burst sends only the latest snapshot and drops intermediates.

**Done when** lists created, renamed, and deleted survive a full reload, and a rapid burst of list mutations ends with the final state intact after reload — no lost updates.

Depends on: 3

## 5. Cards: quick-add, inline edit, delete

Card actions in the reducer (quick-add appends at list bottom, edit, delete; client-generated `crypto.randomUUID()` ids); QuickAdd, InlineEdit, Card components persisting through the serializer. Unit tests: reducer card actions incl. quick-add appends at bottom; RTL tests: QuickAdd submits on Enter and clears, InlineEdit commits and escape-cancels.

**Done when** cards can be quick-added at the bottom of a list, edited inline, and deleted, and a full reload shows the identical cards in the identical order.

Depends on: 4

## 6. Card drag-and-drop with animation

dnd-kit sortable cards: vertical within a list, cross-list transfer via `onDragOver` (local state only during the gesture), `DragOverlay` pointer-following card, settle-on-drop animation; exactly one persist on `onDragEnd`, none on cancel (restore the `onDragStart` snapshot). Reducer move-card tests: within list, across lists, into an empty list.

**Done when** a card dragged within and across lists makes neighbors slide apart and settles animatedly on drop, a cancelled drag restores the pre-drag arrangement, and a full reload shows the dropped arrangement.

Depends on: 5

## 7. List reordering and iOS touch drag

dnd-kit horizontal sortable lists; TouchSensor with ≈200ms delay + tolerance activation, `touch-action: manipulation`, `-webkit-user-select: none` and `-webkit-touch-callout: none` during drag; reducer reorder-lists tests. Ends with the plan's binding real-iPhone smoke for touch drag.

**Done when** lists reorder by drag and survive reload, and on a physical iPhone in Safari a card can be touch-dragged across lists without fighting page scroll — recorded against the smoke checklist.

Depends on: 6

## 8. PWA installability

`vite-plugin-pwa` (generateSW): app-shell precache only, `/api/*` uncached; manifest with `display: standalone`, 192/512 + maskable icons, `apple-touch-icon` and iOS meta tags; README notes the iOS A2HS storage silo (secret re-entered once after install — expected).

**Done when** desktop Chrome offers the install prompt and the installed app launches standalone, the manifest and icons are served, and the iPhone Add-to-Home-Screen steps (with the secret re-entry note) are documented.

Depends on: 3

## 9. E2E harness and golden path

Dev adapter: a small Node server mounting the real handler functions under the Vite proxy against an ephemeral mongodb-memory-server; Playwright `chromium` project booted via `webServer`; golden-path spec: unlock → create board → add 2 lists → add cards → drag a card across lists → reorder within a list → edit → delete → reload → identical state.

**Done when** the golden-path spec passes in chromium against the dev adapter, ending with the reload asserting identical state.

Depends on: 7

## 10. E2E hardening: auth, races, touch, PWA smoke

Remaining Playwright specs on the slice-9 harness: auth (no/wrong/correct secret, unlock persists across reload); rapid-mutation burst then reload (serializer end-to-end); list reorder + reload; `webkit` project with iPhone 14 profile (`hasTouch`) touch-dragging via manually dispatched touch events with >200ms dwell; PWA smoke asserting standalone manifest + SW registration (with `devOptions.enabled` or against `vite preview`).

**Done when** all five specs pass, including the webkit touch spec moving a card across lists and the PWA smoke observing a registered service worker.

Depends on: 8, 9

## 11. Deploy at $0 and close out

MongoDB Atlas M0 (network allowlist 0.0.0.0/0 — auth is app-layer) and Vercel Hobby with `MONGODB_URI` + `APP_SECRET`; manual smoke against the Vercel preview deployment (routing/rewrites the dev adapter cannot see); real-iPhone install + touch smoke re-confirmed against the checklist.

**Done when** the app is live on Vercel Hobby with Atlas M0 at $0/month, the preview-deployment smoke passes, and the installed iPhone app performs a touch drag that persists — checklist recorded.

Depends on: 10

## 12. Migrate the existing Obsidian board verbatim

Throwaway script `/scripts/migrate-obsidian.ts` (not app code): parse `existing-tasks.md` — `##` headings become lists, `- [ ]` lines become card titles, the `%% kanban:settings %%` block is ignored — and insert one board document directly into the Atlas `boards` collection (direct Mongo insert per user decision), using `/shared/types.ts` shapes and `crypto.randomUUID()` ids.

**Done when** the deployed app shows the migrated board with all six lists (On Hold, TODAY, THIS WEEK, LATER, Done, Archive) and all 88 cards in exact source text and order, and dragging or editing a migrated card persists normally.

Depends on: 11
