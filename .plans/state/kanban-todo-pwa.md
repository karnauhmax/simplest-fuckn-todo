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
- **2026-08-06 — the part-9 dev adapter was built (minimally) in part 1, not part 9.** Part 1's check requires curling the real handler, which needs something to serve it; `vercel dev` was the alternative and was rejected (auth + known CI flake, already ruled out in the plan's ADR). `dev/api-server.ts` + `dev/router.ts` mount the real handler files over an ephemeral mongodb-memory-server, writing the URI to `.dev-mongo-uri`; `/api/boards/[id]` is imported through a runtime-variable specifier so the router works before that file exists. Part 9 extends this instead of starting it.
- **2026-08-06 — `playwright` (the library, not `@playwright/test`) installed in part 1 to verify "visible in the browser".** Browsers were already cached in the image. Asserting DOM text through a real Chromium was preferred over an RTL/jsdom stand-in, which would not have exercised the Vite proxy → handler → Mongo path. Part 9 adds `@playwright/test` on top.
- **2026-08-06 — board id is stored as Mongo `_id` (string), not a separate `id` field.** `toBoard()` in `api/_lib/db.ts` maps `_id → id` at the boundary. Keeping both was the alternative; one source of identity avoids the two drifting.
- **2026-08-06 — part 12 (Obsidian migration) was missing from this file and has been added.** It exists in the plan (phase 9) and slices (slice 12); the state plan stopped at 11. Added verbatim from the slice so "every part done" means the whole scope.
- **2026-08-06 — visual design is its own part (7b), between 7 and 8, in minimal monochrome.** The plan never named styling as a deliverable; parts 1–7 carry only the layout drag needs. User chose a dedicated pass over folding styling into parts 4–7 (keeps those parts lean) and over polishing after deploy. Consequence, accepted: the binding real-iPhone smoke at the end of part 7 happens on a plain board, so drag *feel* is re-confirmed at part 11 on the styled one. Direction: near-black on near-white, one accent, typography and whitespace over chrome — not a Trello clone.
- **2026-08-06 — the dev adapter defaults `APP_SECRET` to `dev-secret` when the env var is unset (part 2).** The serverless handlers refuse to serve without it, so local dev would otherwise 500 on every request. A `.env` file or a required env var were the alternatives; a default keeps `npm run dev:api` a single command with no setup, and production sets the variable explicitly in Vercel.
- **2026-08-06 — unlocking is verified by a probe `GET /api/boards` with the typed secret before it is written to localStorage.** The alternative — store optimistically and let the ordinary 401-lock path bounce it back — would flash the board and leave a bad secret on disk. Consequence: the unlock button performs a network round-trip, so it disables itself while in flight.
- **2026-08-06 — component tests get jsdom through a per-file `// @vitest-environment jsdom` docblock, not a vitest projects/workspace split.** The suite stays one `npm run test` with one config; API tests keep the faster node environment. `tests/setup.ts` loads `@testing-library/jest-dom/vitest` globally (harmless in node-environment files).
- **2026-08-06 — no lock/sign-out affordance was built.** The spec asks only that the correct secret unlock the device persistently; a Lock button was written during part 2 and removed as unrequested scope. If re-locking is ever wanted, it is a button calling the existing `clearSecret()` path.
- **2026-08-06 — board ids are generated server-side (`randomUUID()` in the POST handler); card and list ids stay client-side per the plan.** A board id must exist before the client has anything to persist into, and letting the client pick the primary key invites collisions from a stale tab. Consequence: `createBoard()` uses the returned board rather than an optimistic local one.
- **2026-08-06 — `DELETE /api/boards/[id]` answers `200 {id}`, not `204`.** `apiFetch` parses JSON on every response; a 204 with an empty body would need a special case in the one function all calls go through. The cost is a technically redundant body.
- **2026-08-06 — board names are validated as trimmed, non-empty, ≤200 characters, at the API boundary (`api/_lib/validate.ts`).** PUT additionally deep-checks lists and cards and rejects a malformed body with 400, leaving the stored document untouched — a truncated or half-migrated write is the failure this guards against.
- **2026-08-06 — create/rename use an inline form in the header; delete uses `window.confirm`.** `window.prompt` for naming was rejected as unstyleable and awkward on iOS; a bespoke confirm dialog for delete was rejected as more component than the risk warrants. Consequence: the delete confirmation is the one piece of native browser chrome in the app, and part 7b may want to replace it.
- **2026-08-06 — the active board is not remembered across reloads; the app selects the first board by name.** Persisting the last-active id in localStorage is one line and was deliberately left out as unrequested scope. If switching-back-and-forth becomes annoying in real use, that is the fix. *(Superseded after part 5 — see below.)*
- **2026-08-06 — the write serializer lives in its own module, `src/api/writeQueue.ts`, not inside `src/api/client.ts` where the plan filed it.** `client.ts` stays a thin transport (auth header, 401 → `UnauthorizedError`); the queue is the only stateful piece and is unit-testable with an injected `put`. Same behaviour, one import away from where the plan says to look.
- **2026-08-06 — board state is `useState` + a `boardRef` mirror, not `useReducer`.** `boardReducer` stays a pure exported function called explicitly by `commit()`, which needs the *next* snapshot in hand to hand it to the write queue — something `dispatch` cannot return. The ref makes a same-tick burst build on the previous snapshot instead of the last rendered one.
- **2026-08-06 — a reducer action that changes nothing returns the identical board object, and `commit()` skips the write on identity.** Renaming a list to its current name, or deleting a list that is already gone, must not cost a PUT. Consequence: every reducer branch has to preserve identity deliberately — the first implementation did not, and the test caught it.
- **2026-08-06 — a failed write reports through a path that deliberately bypasses `guard()`.** `guard()` clears the error banner whenever its work succeeds, so routing the post-failure refetch through it wiped the very message it was meant to leave on screen — found in the browser, not in the unit tests. The rollback refetch now handles its own errors.
- **2026-08-06 — the failure "toast" is the existing `role="alert"` paragraph, not a toast component.** Part 7b owns visual design; a dismissable stack of notifications is more machinery than one message needs. The behaviour the plan asks for — tell the user, refetch, don't wedge — is fully present.
- **2026-08-06 — `InlineEdit` was built in part 4 rather than part 5.** Part 4 asks for "List components with inline edit", which is the same component cards need; part 5 reuses it instead of introducing a second one.
- **2026-08-06 — the design is "paper": warm off-white ground, Instrument Serif for names, IBM Plex Mono for everything else, one vermilion accent, hairlines instead of shadows.** Chosen over a Trello-like card-and-shadow look, which the plan explicitly rules out. The serif carries board and list names, mono carries card text and chrome, so the two never compete. The only element allowed to lift off the plane is the drag overlay — that is what makes a drag legible. Fonts come from Google Fonts over the network, which is consistent with an online-only app but means they are not precached by the service worker.
- **2026-08-06 — the first styling attempt shipped a full-width ruled-paper background and was thrown away.** Every automated check passed while the page rendered stray rules across dead space below the columns. Screenshots are the check for this part; the suite cannot see layout.
- **2026-08-06 — the dev adapter now persists to `.dev-mongo/` by default; `DEV_MONGO_EPHEMERAL=1` restores throwaway storage and the Playwright harness sets it.** With ephemeral storage the user could not keep a migrated board across a restart, which makes local testing of a 88-card import pointless. Consequence: `.dev-mongo/` is gitignored and stale local boards persist until deleted.
- **2026-08-06 — part 12's script was written and verified locally, ahead of the deploy it depends on.** The plan orders it after part 11, but the parser and its 88-card output can be proven against the local database, and the user asked to test locally first. Only the "against the deployed app" half of its Done-when is outstanding. The script is an import, not a sync: running it twice creates two boards.
- **2026-08-06 — the migration imports `- [x]` lines as ordinary cards.** This app has no card state, and dropping checked items would silently lose the 66-card Done column. Cards before any heading are dropped rather than invented into a list.
- **2026-08-06 — WebKit was installed with its system dependencies (`sudo npx playwright install-deps webkit`, ~25 apt packages).** Running the touch spec on Chromium's iPhone profile instead was the alternative and was rejected: Safari's engine *is* the delivery risk, and Chromium touch emulation already disagreed with it once — `new Touch()` works in Chromium and throws `Illegal constructor` in WebKit. The touch shim now picks whichever constructor pair the engine offers.
- **2026-08-06 — the PWA specs run against `vite preview` as their own Playwright project, not against the dev server with `devOptions.enabled`.** A service worker only exists in a real build, and enabling a dev-mode worker would have put caching in the path of every other spec. Cost: `npm run e2e` now builds the app first, adding a few seconds, and `vite.config.ts` needs a `preview.proxy` mirroring `server.proxy`.
- **2026-08-06 — `persisted(page, contains)` waits for a specific write, not "the next PUT".** Writes are serialised per board, so waiting for the next one routinely settled on an earlier queued write and left the interesting one in flight — which showed up as a cancelled-drag spec counting one write it had not caused.
- **2026-08-06 — every E2E locator naming a card must be `exact`.** dnd-kit gives each sortable `li` `role="button"` with an accessible name concatenating the card title and its delete label, so `getByRole('button', { name: title })` matches three elements. `card()` and `deleteCardButton()` in `e2e/helpers.ts` exist so this is decided once.
- **2026-08-06 — `dragTo` waits for the drag overlay to unmount, not for a timeout.** dnd-kit swallows the click that lands during its drop animation, so a test that clicks straight after a drop silently does nothing and fails later somewhere unrelated — which is exactly how it presented. Waiting on our own `.overlay-list`/`.overlay-card` disappearing is a deterministic end-of-gesture signal.
- **2026-08-06 — E2E runs single-worker against one shared database.** Two Playwright webServers (the dev adapter and Vite) with one ephemeral Mongo behind them; parallel specs would race on the same boards collection. Specs create their own board and assert only within it.
- **2026-08-06 — `runtimeCaching: []` — the service worker precaches the shell and caches nothing at runtime.** A cached board would be a stale board, and a cached 401 would look like a lockout; the spec already says online-only. `navigateFallbackDenylist: [/^\/api\//]` keeps the SPA fallback from swallowing API routes.
- **2026-08-06 — icons are generated from one SVG by `scripts/make-icons.mjs` (committed, not a build step).** Three kanban columns in the app's own ink and vermilion on paper. Regenerating is a deliberate act, so the icons cannot silently drift; `sharp` is the only reason it is a dev dependency. This replaces the earlier "placeholder icons" note — they now match the design.
- **2026-08-06 — dark mode is a token inversion, not a second design.** `prefers-color-scheme: dark` swaps six CSS variables and nothing else, so there is one layout to maintain.
- **2026-08-06 — deleting a card does not ask for confirmation; deleting a list or board still does.** A card is one line of text that costs seconds to retype, and cards are deleted constantly — a prompt on every one is noise. Lists and boards hide their contents behind a single click, which is what the prompt is for.
- **2026-08-06 — card actions address a card by `listId` + `cardId` rather than searching the board for the id.** The UI always knows which list it is acting in, and part 6 moves cards between lists, where both ends are named explicitly anyway.
- **2026-08-06 — the active board IS remembered after all; supersedes the part-3 decision above.** It cost verification an extra step in parts 4 and 5 — both reload checks silently landed on the alphabetically-first board — and would cost the user the same on every launch. User chose to fix it immediately rather than defer it to 7b. The stored id deliberately survives a lock and a board deletion: membership is re-checked on load and falls back to the first board, so a stale id is harmless, and an unlock returns you where you were.
- **2026-08-06 — `QuickAdd` keeps focus after a submit so cards can be typed in a run.** Entering a backlog is a burst activity; having to re-click the field between cards would make the migrated 88-card board painful to extend.
- **2026-08-06 — the whole card is the drag handle; there is no separate grip.** `PointerSensor` with `activationConstraint: { distance: 5 }` keeps taps and inline edits working, and dragging the card body is what the iPhone gesture needs. Cost: dnd-kit's listeners sit on the same element as the edit field — see the next entry.
- **2026-08-06 — `InlineEdit` stops keyboard and pointer propagation while editing.** dnd-kit claims Space as its keyboard drag activator, so spaces never reached the field and "ship it today" was typed as "shipittoday" — caught by a component test, not the browser. Any future control nested inside a draggable needs the same treatment.
- **2026-08-06 — mid-drag state is a `preview` board owned by `BoardView`; `App` is untouched until the drop.** Cross-list moves are applied to the preview in `onDragOver` so the card visibly joins the other list, and exactly one `move-card` action is committed in `onDragEnd`. Cancelling is therefore just dropping the preview — no snapshot to restore, because the committed board never changed. The alternative, lifting drag state into `App`, would have made every hover a candidate for persistence.
- **2026-08-06 — mouse and touch get separate dnd-kit sensors (`MouseSensor` + `TouchSensor`), not one `PointerSensor`.** With `PointerSensor`, an emulated iPhone touch produced `pointerdown` then `pointercancel` the instant the finger moved — the browser claimed the gesture for panning and dnd-kit aborted the drag, so no card ever moved. Separate sensors let touch go through the delay-based path that preventDefaults once it activates. This is exactly the iOS-drag risk the plan named, and it would not have shown up in any headless-desktop test.
- **2026-08-06 — `touch-action: manipulation` is kept (per the plan) rather than `touch-action: none`.** `none` would make drags trivially reliable but would kill scrolling anywhere on a card, and a phone board is mostly cards. The 200ms `TouchSensor` delay is what separates "scroll" from "grab"; a sub-delay swipe scrolls, verified in the emulator.
- **2026-08-06 — a list is dragged by its header, cards by their whole body.** Making the entire list column draggable would swallow every gesture aimed at the cards inside it.
- **2026-08-06 — `vite.config.ts` pins `resolve.dedupe` and `optimizeDeps.include` for React.** With dnd-kit installed, the app died at startup with "invalid hook call" — one React on disk, but Vite resolved it twice through the symlinked package store. Do not remove these two lines; the unit suite stays green either way, so only the browser catches a regression here.
- **2026-08-06 — iPhone smokes are pause-and-hand-off.** *(Superseded 2026-08-06 — see below.)*
- **2026-08-07 — collapsing a list is a per-device preference in localStorage (`simplest-fuckn-todo:collapsed:<boardId>`), not a field on the board document.** User choice. Putting `collapsed` on `List` would have synced desktop and phone and cost a schema change in `shared/types.ts` + `api/_lib/validate.ts` and one PUT per toggle. Consequences, accepted: a list collapsed on the laptop is still open on the phone (arguably right — width is the reason to collapse), clearing browser data forgets it, and the iOS PWA storage silo keeps its own set. Nothing about collapse touches the API.
- **2026-08-07 — a collapsed list is a ~2.75rem vertical strip, and its cards and quick-add unmount rather than hide.** Unmounting means the `cards:<id>` droppable is not registered, so `data-over` on a collapsed column comes from the sortable's own `isOver`. A card can still be dropped onto a collapsed list (it resolves through the `list:<id>` sortable and appends at the end) — the count is the feedback. The list itself stays draggable, so a collapsed column reorders like any other.
- **2026-08-07 — the collapse toggle stops keydown propagation, for the same reason `InlineEdit` does.** dnd-kit's KeyboardSensor claims Space and Enter on the list header, which is the toggle's parent, so without it the keyboard started a list drag instead of expanding. E2E covers the Enter case; nothing else would have caught it.
- **2026-08-07 — `BoardView` is keyed by `board.id`.** The collapsed set is read once in a `useState` initialiser, so switching boards had to remount the view or it would have shown the previous board's collapsed lists. Side effect, wanted: the new-list draft also resets on a board switch.
- **2026-08-07 — the touch spec's post-reload assertion now waits for a card before reading the DOM.** It read `boardState` immediately after `page.reload()` and passed only because the app rendered fast enough; with a reused dev server accumulating boards from earlier runs, `/api/boards` got slow enough to make it fail. The race was pre-existing, not caused by collapse.
- **2026-08-06 — the iPhone smokes no longer pause the run.** User instruction: proceed through the remaining parts without check-in questions and report once at the end for local testing. Parts 7 and 11 therefore complete their automated checks and record the physical-device smoke as outstanding rather than blocking on it. The risk the original decision guarded — real-iPhone drag feel — is unchanged and still has to be confirmed by hand before the app is trusted. At the end of parts 7 and 11 the session stops, hands the user a URL + checklist, and the part stays `doing` until the user reports pass/fail. "Mark blocked and continue" and "trust webkit until deploy" were rejected — the plan names real-iPhone drag feel the top delivery risk, so it gates progression.

## Parts

Status is `todo`, `doing`, `done`, or `blocked`.

### 1. Walking skeleton: board names from DB to browser — `done`

Vite+TS+React scaffold, `/shared/types.ts`, `vercel.json`, Vitest wiring; cached MongoClient; `GET /api/boards` returning `{id, name}[]` summaries; minimal shell rendering the fetched names. No auth, no mutations. Also: `git init` with remote `https://github.com/karnauhmax/simplest-fuckn-todo.git`, `.gitignore` (node_modules, dist, .env*, .pi-subagents), initial commit including `.plans/` (per Decisions 2026-08-06).

**Done when** a board document inserted directly into the database appears by name in the browser, served through the real API function, and the summaries payload contains no lists or cards.

- Check: `npm run test` passes (suite may be near-empty but wired); `npx tsc -b --noEmit` is clean; with `npm run dev:api` (ephemeral Mongo) + `npm run dev` running, `curl` on `/api/boards` prints a JSON array of `{id, name}` objects and `grep -E '"(lists|cards)"'` on the response exits 1; a board inserted directly into Mongo is visible in a real browser at `http://localhost:5173/`.
- Last run: 2026-08-06 — `npm run test` → `Test Files 1 passed (1) / Tests 1 passed (1)`; `npx tsc -b --noEmit` → `tsc exit=0`; seed script → `inserted`; `curl -s http://localhost:3001/api/boards` → `[{"id":"seed-board","name":"Seeded From Mongo"}]`; leak grep → `grep exit=1 (1 = clean)`; `curl -s http://localhost:5173/api/boards` (through the Vite proxy) → same JSON; headless Chromium on `http://localhost:5173/` → `BODY TEXT: Simplest Fuckn TodoSeeded From Mongo`.
- Depends on: none

### 2. Shared-secret auth end-to-end — `done`

`requireAuth` (SHA-256 both sides → `timingSafeEqual`) on all endpoints; client sends `Authorization: Bearer` from localStorage; UnlockScreen; 401 flips to locked. API tests for correct/wrong/wrong-length secrets; component tests for UnlockScreen and 401-lock.

**Done when** with a wrong or missing secret the app stays locked and the API returns 401; the correct secret entered once unlocks the app and still unlocks it after a full reload.

- Check: `npm run test` passes including the auth API tests (401 on missing/wrong bearer, wrong-length secret rejected without a 500) and UnlockScreen component tests; manual: `curl` without bearer prints 401, with `APP_SECRET` prints 200; in the browser, unlock then reload stays unlocked.
- Last run: 2026-08-06 — part 1's check re-run first and reproduced (`Test Files 1 passed`, `tsc exit=0`, `curl` on `/api/boards` → `[{"id":"seed-board","name":"Seeded From Mongo"}]`, leak grep exit=1, Chromium body text `Simplest Fuckn TodoSeeded From Mongo`). Then: `npm run test` → `Test Files 4 passed (4) / Tests 12 passed (12)`; `npx tsc -b --noEmit` → `tsc exit=0`; `curl` with no bearer → `401`, `Bearer wrong` → `{"error":"Unauthorized"} status=401`, `Bearer dev-secret` → `[{"id":"seed-board",...}] status=200`, same through the Vite proxy on 5173. Headless Chromium: `1. initial: Simplest Fuckn TodoSecretUnlock`; `2. wrong secret: Wrong secret. | stored: null`; `3. unlocked: Simplest Fuckn TodoSeeded From Mongo`; `4. after reload: ... | unlock form present: false`; `5. stale secret → 401 relocks: Simplest Fuckn TodoSecretUnlock | stored: null`.
- Depends on: 1

### 3. Board CRUD and switching — `done`

`POST` create; `GET/PUT/DELETE` on `[id]` (rename via PUT, no PATCH); header-dropdown BoardSwitcher; create/rename/delete from the UI. API tests: happy paths, 404, 400, PUT round-trip of nested lists/cards.

**Done when** a board can be created, renamed, deleted, and switched to from the header dropdown, and a full reload shows the identical set of boards.

- Check: `npm run test` passes including the boards API tests (404 unknown id, 400 malformed body, PUT round-trip intact); manual: in the browser create → rename → switch → delete a board, reload, the remaining set matches exactly.
- Last run: 2026-08-06 — part 2's check re-run first and reproduced (`Test Files 4 passed / Tests 12 passed`, `tsc exit=0`, `curl` no bearer → `401`, correct bearer → `[] status=200`). Then: `npm run test` → `Test Files 5 passed (5) / Tests 39 passed (39)`; `npx tsc -b --noEmit` → `tsc exit=0`. Headless Chromium against the dev adapter: `1. start: [ 'No boards yet' ]`; `2. after create x2: [ 'Personal', 'Work' ] | active: Work | heading: Work`; `3. after rename: [ 'Personal', 'Work renamed' ] | heading: Work renamed`; `4. after switch: | active: Personal | heading: Personal`; `5. after reload: [ 'Personal', 'Work renamed' ] | active: Personal | heading: Personal`; `6. after delete: [ 'Personal' ] | heading: Personal`; `7. after reload: [ 'Personal' ] | heading: Personal`.
- Depends on: 2

### 4. Lists on a board, persisted through the write serializer — `done`

`boardReducer` list actions; List components with inline edit; per-board coalesce-to-latest write serializer in `/src/api/client.ts` (one PUT in flight, newest snapshot queued, failure toasts + refetch, chain never wedges); every committed action persists via full-board PUT.

**Done when** lists created, renamed, and deleted survive a full reload, and a rapid burst of list mutations ends with the final state intact after reload — no lost updates.

- Check: `npm run test` passes including reducer list-action tests and serializer tests (burst → only latest snapshot sent, intermediates dropped, failed PUT doesn't wedge); manual: perform ~5 list mutations in quick succession, reload, final state matches what was on screen. A burst only coalesces if the writes actually overlap — delay PUTs (~700ms) in the browser, or every mutation completes before the next begins and nothing is proved.
- Last run: 2026-08-06 — part 3's check re-run first and reproduced (`Test Files 5 passed / Tests 39 passed`, `tsc exit=0`, browser: `after create+rename+reload: [ 'Personal', 'Work renamed' ]`, `after delete+reload: [ 'Personal' ]`). Then: `npm run test` → `Test Files 8 passed (8) / Tests 62 passed (62)`; `npx tsc -b --noEmit` → `tsc exit=0`. Browser burst with PUTs delayed 700ms: `on screen after 5 rapid adds: [ 'A', 'B', 'C', 'D', 'E' ]`; `PUT bodies actually sent: [["A"],["A","B","C","D","E"]]`; `after reload: [ 'A', 'B', 'C', 'D', 'E' ]` — 5 mutations, 2 writes, intermediates dropped, nothing lost. Undelayed run: 5 mutations → 5 PUTs, `after reload: [ 'TODAY', 'THIS WEEK', 'LATER' ]`, `after rename+reload: [ 'DOING', 'THIS WEEK', 'LATER' ]`. Failure path with PUTs forced to 500: `1. toast + rollback: Could not save: HTTP 500 | [ 'KEPT' ]` (optimistic list rolled back by refetch), then with writes restored `2. same board after reload: [ 'KEPT', 'AFTER' ]` — chain not wedged.
- Depends on: 3

### 5. Cards: quick-add, inline edit, delete — `done`

Card reducer actions (quick-add appends at bottom, edit, delete; `crypto.randomUUID()` ids); QuickAdd, InlineEdit, Card components persisting through the serializer.

**Done when** cards can be quick-added at the bottom of a list, edited inline, and deleted, and a full reload shows the identical cards in the identical order.

- Check: `npm run test` passes including card reducer tests (quick-add appends at bottom) and RTL tests (QuickAdd submits on Enter and clears; InlineEdit commits and escape-cancels); manual: add/edit/delete cards, reload, order and content identical.
- Last run: 2026-08-06 — part 4's check re-run first and reproduced (`Test Files 8 passed / Tests 62 passed`, `tsc exit=0`, delayed-PUT burst → `PUTs sent: [["A"],["A","B","C","D","E"]]`, `after reload: [ 'A', 'B', 'C', 'D', 'E' ]`). Then: `npm run test` → `Test Files 9 passed (9) / Tests 77 passed (77)`; `npx tsc -b --noEmit` → `tsc exit=0`. Browser: `1. after quick-add: [{"list":"TODAY","cards":["first","second","third"]},{"list":"LATER","cards":["someday"]}]` (three cards typed with Enter alone, each appended at the bottom); `2. after inline edit: [... "second edited" ...]`; `3. after delete: [{"list":"TODAY","cards":["second edited","third"]},...]`; `4. same board after reload: [{"list":"TODAY","cards":["second edited","third"]},{"list":"LATER","cards":["someday"]}]` — order and content identical. Follow-up after making the active board sticky: `before reload: {"active":"Cards",...}` / `after reload: {"active":"Cards","lists":["TODAY","LATER"]}`; suite re-run → `Test Files 9 passed (9) / Tests 79 passed (79)`, `tsc exit=0`.
- Depends on: 4

### 6. Card drag-and-drop with animation — `done`

dnd-kit sortable cards vertical + cross-list via `onDragOver` (local state only mid-gesture), `DragOverlay`, settle-on-drop; exactly one persist on `onDragEnd`, none on cancel (restore `onDragStart` snapshot).

**Done when** a card dragged within and across lists makes neighbors slide apart and settles animatedly on drop, a cancelled drag restores the pre-drag arrangement, and a full reload shows the dropped arrangement.

- Check: `npm run test` passes including reducer move-card tests (within list, across lists, into empty list); manual with devtools Network open: one drag produces exactly one PUT, fired at drop; Esc mid-drag restores the previous arrangement and produces zero PUTs; reload shows the dropped arrangement. The unit suite cannot see a duplicate-React failure — always load the app in a real browser after touching dnd-kit or Vite config.
- Last run: 2026-08-06 — part 5's check re-run first and reproduced (`Test Files 9 passed / Tests 79 passed`, `tsc exit=0`). Then: `npm run test` → `Test Files 9 passed (9) / Tests 89 passed (89)`; `npx tsc -b --noEmit` → `tsc exit=0`. Headless Chromium, counting PUT requests: `0. start: TODAY[one,two,three] LATER[] EMPTY[]`; `1. reorder within list: TODAY[two,three,one] | PUTs: 1`; `2. across to LATER: TODAY[three,one] LATER[two] | PUTs: 1`; `3. into empty list: TODAY[one] LATER[two] EMPTY[three] | PUTs: 1`; `4. cancelled drag restored: true | PUTs: 0`; `5. after reload: TODAY[one] LATER[two] EMPTY[three]`.
- Depends on: 5

### 7. List reordering and iOS touch drag — `doing`

Automated and emulated checks pass; the binding real-iPhone smoke in `docs/smoke.md` is still OUTSTANDING and is the user's to run.

Horizontal sortable lists; TouchSensor ≈200ms delay + tolerance; `touch-action: manipulation`, `-webkit-user-select: none`, `-webkit-touch-callout: none` during drag. Ends with the plan's **binding** real-iPhone smoke.

**Done when** lists reorder by drag and survive reload, and on a physical iPhone in Safari a card can be touch-dragged across lists without fighting page scroll — recorded against the smoke checklist.

- Check: `npm run test` passes including reorder-lists reducer tests; manual: drag a list, reload, order intact; the smoke checklist (README or `docs/smoke.md`) contains a dated pass entry for real-iPhone touch drag — `grep` for that entry succeeds. Emulated touch (Chromium iPhone profile + CDP `Input.dispatchTouchEvent`, hold >200ms before moving) is a useful proxy but is explicitly not the binding check.
- Last run: 2026-08-06 — `npm run test` → `Test Files 9 passed (9) / Tests 93 passed (93)`; `npx tsc -b --noEmit` → `tsc exit=0`. Desktop mouse: `2. mouse card drag: [EMPTY:three|one] | PUTs: 1`; `3. mouse list drag: [EMPTY, LATER, TODAY] | PUTs: 1`; `4. after reload:` identical; `5. inline edit through drag listeners: one edited with spaces` (spaces survive the drag listeners). Emulated iPhone 13 + CDP touch: `2. drag active mid-gesture: true | after: LATER[two,one], TODAY[] | PUTs: 1`; `3. after reload:` identical; `4. quick swipe did not drag: ... | PUTs: 0`. Real-iPhone smoke: OUTSTANDING — `docs/smoke.md` records the checklist and the emulated results.
- Depends on: 6

### 7b. Visual design pass — minimal monochrome — `done`

One pass over the whole surface: type scale, spacing, near-black/near-white palette with a single accent, board/list/card surfaces, quick-add and inline-edit affordances, drag and drag-overlay states, focus-visible rings, responsive down to an iPhone viewport. No new behaviour, no new components — styling and markup-for-styling only.

**Done when** the board reads as a deliberately designed tool at both desktop and iPhone widths, drag and drag-overlay states are visually distinct, and every existing test still passes unchanged in behaviour.

- Check: `npm run test` passes; `npx tsc -b --noEmit` clean; screenshots at 1280px and 390px widths show the styled board, a drag-in-progress state, and an inline edit; keyboard focus is visible on every interactive element. Look at the screenshots — the first pass passed every automated check while rendering a full-width band of stray rules and columns floating in dead space.
- Last run: 2026-08-06 — `npm run test` → `Test Files 9 passed (9) / Tests 93 passed (93)`; `npx tsc -b --noEmit` → `tsc exit=0`. Screenshots taken at 1280×860 and on an iPhone 13 profile: unlock screen, full board, drag-in-progress (faded origin card + tilted elevated overlay + neighbours parted), inline edit, and a focus ring. Drag re-verified after restyling: `after card drag: EMPTY[one edited with spaces], TODAY[three] | PUTs: 1`, identical after reload.
- Depends on: 7

### 8. PWA installability — `done`

`vite-plugin-pwa` (generateSW): app-shell precache only, `/api/*` uncached; manifest `display: standalone`, 192/512 + maskable icons, apple-touch-icon + iOS meta; README documents A2HS steps and the iOS storage-silo secret re-entry.

**Done when** desktop Chrome offers the install prompt and the installed app launches standalone, the manifest and icons are served, and the iPhone Add-to-Home-Screen steps (with the secret re-entry note) are documented.

- Check: after `npm run build` and serving the preview build, the manifest URL returns JSON containing `"display": "standalone"` and both icon URLs return 200; Chrome shows the install affordance and the installed window is standalone; `grep -i "add to home screen"` and `grep -i "silo\|re-enter"` in README both match. The install affordance itself cannot be observed headlessly — confirm it in a real Chrome window.
- Last run: 2026-08-06 — `npm run build` → `precache 16 entries (279.29 KiB)`, `dist/sw.js` generated. Against `vite preview` on :4173: manifest returns `"display":"standalone"` with all three icons; `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`, `sw.js` all `200`. In Chromium: `service worker: {"registered":true,"scope":"http://localhost:4173/","active":true}`; `precached entries: 10`; `any /api cached: 0`; `shell present: true | css: true | icons: 5`; deep link `/some/deep/link` → `200` and renders. `grep -ci "add to home screen" README.md` → 1; `grep -ci silo README.md` → 1. Install affordance in a real Chrome window: not verified here.
- Depends on: 3

### 9. E2E harness and golden path — `done`

Dev adapter (Node server mounting the real handler functions under the Vite proxy, ephemeral mongodb-memory-server); Playwright `chromium` via `webServer`; golden-path spec: unlock → create board → 2 lists → cards → drag across lists → reorder → edit → delete → reload → identical state.

**Done when** the golden-path spec passes in chromium against the dev adapter, ending with the reload asserting identical state.

- Check: `npm run e2e` (chromium project) passes with the golden-path spec listed as passed in the Playwright report; `npm run test` still green. `reuseExistingServer` means a stale dev server from an earlier session can serve the run — if a spec fails inexplicably, kill everything on :5173/:3001 and re-run before debugging the app.
- Last run: 2026-08-06 — `npm run e2e` → `1 passed (3.9s)`, `✓ 1 [chromium] › e2e/golden-path.spec.ts:15:1 › the whole loop: unlock, build a board, rearrange it, and reload into the same state`. `npm run test` → `Tests 93 passed (93)`; `npx tsc -b --noEmit` → `tsc exit=0`.
- Depends on: 7

### 10. E2E hardening: auth, races, touch, PWA smoke — `done`

Remaining specs on the part-9 harness: auth (no/wrong/correct secret, persists across reload); rapid-mutation burst + reload; list reorder + reload; webkit iPhone-profile touch drag via manually dispatched touch events with >200ms dwell; PWA smoke (standalone manifest + SW registered, `devOptions.enabled` or `vite preview`).

**Done when** all five specs pass, including the webkit touch spec moving a card across lists and the PWA smoke observing a registered service worker.

- Check: `npm run e2e` passes with all three projects (chromium, webkit-iphone, pwa) and every spec reported passed; `npm run test` still green. Kill anything already listening on :5173, :3001 and :4173 first — `reuseExistingServer` will otherwise hand the run a stale server and the failures look like app bugs.
- Last run: 2026-08-06 — `npm run e2e` → `13 passed (20.8s)`, repeated → `13 passed (18.7s)`: 4 auth specs, golden path, burst-coalescing, list-reorder, cancelled-drag (chromium); `a finger drags a card across lists once it has dwelled` and `a flick that never dwells scrolls instead of dragging` (webkit-iphone); installability + service worker, shell-precached-never-API, and deep-link fallback (pwa). `npm run test` → `Tests 93 passed (93)`; `npx tsc -b --noEmit` → `tsc exit=0`.
- Depends on: 8, 9

### 11. Deploy at $0 and close out — `blocked`

Blocked on account access: Atlas and Vercel both need the user's own login. README has the exact steps; `docs/smoke.md` has the checklists to fill in afterwards.

Atlas M0 (allowlist 0.0.0.0/0 — auth is app-layer) + Vercel Hobby with `MONGODB_URI`, `APP_SECRET`; manual smoke against the Vercel preview deployment; real-iPhone install + touch smoke re-confirmed.

**Done when** the app is live on Vercel Hobby with Atlas M0 at $0/month, the preview-deployment smoke passes, and the installed iPhone app performs a touch drag that persists — checklist recorded.

- Check: the production URL loads over HTTPS and completes an unlock + card mutation that survives reload; Vercel dashboard shows Hobby plan and Atlas shows M0 (no paid resources); the smoke checklist contains dated pass entries for the preview-deployment smoke and the iPhone install + touch drag.
- Last run: not yet
- Depends on: 10

### 12. Migrate the existing Obsidian board verbatim — `doing`

Script written and verified against the local database; the deployed-app half of "Done when" waits on part 11.

Throwaway script `/scripts/migrate-obsidian.ts` (not app code): parse `existing-tasks.md` — `##` headings become lists, `- [ ]` lines become card titles, the `%% kanban:settings %%` block is ignored — and insert one board document directly into the Atlas `boards` collection (direct Mongo insert per user decision), using `/shared/types.ts` shapes and `crypto.randomUUID()` ids.

**Done when** the deployed app shows the migrated board with all six lists (On Hold, TODAY, THIS WEEK, LATER, Done, Archive) and all 88 cards in exact source text and order, and dragging or editing a migrated card persists normally.

- Check: against the deployed app, the migrated board's list names and card count match the source file (`grep -c '^- \[ \]' existing-tasks.md` equals the card count shown); editing and dragging a migrated card survives reload.
- Last run: 2026-08-06 — locally, not yet against a deployment. `npx tsx scripts/migrate-obsidian.ts --dry-run` → `parsed "Personal": 6 lists, 88 cards` / `On Hold: 9, TODAY: 8, THIS WEEK: 2, LATER: 1, Done: 66, Archive: 2` — matches the plan's expected counts and `grep -c '^- \[ \]' existing-tasks.md` → 88. Inserted into the local database and loaded in Chromium: all six lists with counts `9,8,2,1,66,2`, total 88, first TODAY card `сделать кастомный deep-interview более вертикальным скиллом` (Cyrillic intact). Dragging a migrated card across lists and reloading → `counts after drag + reload: [9,7,3,1,66,2] | total: 88`. Six parser unit tests cover headings, card count, exact titles and order, the ignored settings block, checked items, and cards before any heading.
- Depends on: 11

### 13. Collapsible lists — `done`

New scope, requested 2026-08-07, after part 7b's design pass. Per-device collapse of a list to a narrow vertical strip: `src/state/collapsed.ts` (localStorage per board), a toggle in the list header, `list--collapsed` styling, cards and quick-add unmounted while collapsed. No API, schema or reducer change.

**Done when** a list collapses to a strip showing its name and card count, stays collapsed across a reload without any write to the server, still reorders by drag, and expands by mouse or keyboard.

- Check: `npm run test` and `npm run e2e` pass, including `e2e/collapse.spec.ts` (collapse → reload → still collapsed, zero PUTs; collapsed list dragged to a new position; Enter on the toggle expands rather than starting a keyboard drag); screenshots at 1280px and on an iPhone profile show the strip legible and the focus ring visible on the toggle.
- Last run: 2026-08-07 — `npx tsc -b --noEmit` → `tsc exit=0`; `npm run test` → `Test Files 11 passed (11) / Tests 107 passed (107)`; `npm run e2e` → `15 passed (18.2s)`, both collapse specs included. Screenshots at 1280×860 and iPhone 13: collapsed columns measured `List ON HOLD=44, List TODAY=304, List DONE=44`, vertical title computed `white-space: nowrap, writing-mode: vertical-rl` on one line, vermilion focus ring visible on the toggle.
- Depends on: 7b

## Open questions

None open. All three initial questions (git/.plans versioning, app name/icons, iPhone smoke hand-off) were resolved 2026-08-06 — see Decisions.
