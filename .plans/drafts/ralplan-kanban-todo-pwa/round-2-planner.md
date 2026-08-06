# RALPLAN Round 2 — Kanban Todo Webapp + PWA (Planner Draft, Revised)

Spec: `.plans/specs/deep-interview-kanban-todo-pwa.md` (status: PASSED, ambiguity 17%)
Mode: DELIBERATE. Greenfield; empty repo.
Prior: `round-1-planner.md`; Architect review: `round-1-architect.md` (REVISION NEEDED).

## Changes in This Round

All seven Architect findings addressed; none rejected.

1. **(Major — fixed) Per-board write serializer specified.** §1 (Mutation granularity) and §2 now specify a coalesce-to-latest promise chain in `/src/api/client.ts`: at most one PUT in flight per board; while one is in flight, only the *newest* snapshot is queued (intermediate snapshots are dropped). Unit test added to the test plan.
2. **(Major — fixed) Persist-on-dragEnd-only stated explicitly.** §1 and phase 5 now state: during a drag gesture, `onDragOver` reorders mutate local state only; exactly one persistence call fires on `onDragEnd` (none on cancelled drags).
3. **(Minor — fixed) PATCH rename dropped.** API surface is GET/POST on `index.ts`, GET/PUT/DELETE on `[id].ts`. Rename = PUT replacing `{name, lists}`. Test matrix row removed.
4. **(Minor — fixed) Auth compare hardened.** `requireAuth` SHA-256-hashes both the presented secret and `APP_SECRET` before `crypto.timingSafeEqual` — equal-length digests, so no unequal-length throw, no length leak via 500. Unit test for wrong-length secret added.
5. **(Minor — fixed) `GET /api/boards` payload pinned to summaries** `{id, name}[]` (Mongo projection). Board switcher needs nothing more; API tests assert the shape.
6. **(Info — incorporated) iOS standalone localStorage silo** noted in §1 (Auth) and phase 6/8: the A2HS app has its own localStorage, so the secret is re-entered once after install — expected behavior, flagged in README and the real-iPhone smoke checklist so it isn't mistaken for a bug.
7. **(Info — incorporated) Playwright webkit touch spec** noted in §1 (E2E) and the test plan: manual touch-event dispatch with a >200ms dwell is required to satisfy the activation constraint (`dragTo` won't); flake iteration is budgeted cost.

**Unresolved questions replaced with Architect decisions** (see §5): dev adapter for E2E (plus one manual smoke against a Vercel preview deploy), real-iPhone manual smoke is *binding* closing evidence for the iOS-touch AC, board switcher defaults to a header dropdown.

Everything else stands as drafted in round 1 — no changes to stack, data model, repo layout, phases, or test structure.

## 1. Technology Decisions (concrete + defended)

| Area | Choice | Why (and why not the alternative) |
|------|--------|-----------------------------------|
| Language | TypeScript everywhere (frontend + `api/`) | Shared `Board/List/Card` types between client and serverless handlers; catches drag-reorder index bugs at compile time. JS saves nothing here. |
| Build tool | **Vite** + React 18 + `@vitejs/plugin-react` | Spec forbids a backend framework, so Next.js is out. Vite is the default for SPA React, first-class Vercel static build, and `vite-plugin-pwa` gives manifest + SW generation for free. CRA is dead; Parcel has no PWA plugin ecosystem worth the switch. |
| DnD library | **dnd-kit** (`@dnd-kit/core` + `@dnd-kit/sortable`), versions pinned, no beta releases | Named as the reference candidate in the spec. It is the only mainstream option that delivers all three hard requirements at once: (a) animated neighbor displacement + settle-on-drop via `SortableContext` transforms, (b) `TouchSensor`/`PointerSensor` with activation constraints for iOS Safari, (c) cross-container card moves. `@hello-pangea/dnd` animates beautifully but its touch handling and multi-axis nesting (sortable lists containing sortable cards) are weaker; HTML5 DnD is explicitly ruled out by the spec. |
| State | Plain React state: one `useReducer` board store + thin `api.ts` fetch wrapper | Single user, one screen, ~4 entity types. dnd-kit already forces local optimistic state during drag; a reducer with actions (`moveCard`, `renameList`, …) doubles as the pure logic layer we unit-test. TanStack Query / zustand add dependency weight without solving a problem we have. Persistence: each *committed* reducer action triggers a persist through the write serializer (below); on failure, toast + refetch board. |
| Backend | Vercel serverless functions in `/api` (Node runtime), **2 function files** | `api/boards/index.ts` (GET list → summaries, POST create) and `api/boards/[id].ts` (GET, PUT replace `{name, lists}`, DELETE). No PATCH — PUT covers rename. Method-switch inside the file keeps us far under Hobby-tier function limits and minimizes cold-start surface. |
| API payload shapes | `GET /api/boards` returns **summaries `{id, name}[]`** (Mongo projection); `GET /api/boards/:id` returns the full document | Board switcher needs only summaries; pinning the shape keeps client and API tests in agreement and avoids shipping every card on app load. |
| DB | MongoDB Atlas M0, **one `boards` collection, fully embedded documents** | `Board { _id, name, lists: [{ id, name, cards: [{ id, title }] }] }`. Order = array order, so **no position/rank fields, no fractional indexing, no rebalancing** — the classic Kanban-ordering complexity disappears. A personal board will never approach the 16MB doc limit. Separate collections + position floats would only pay off with concurrency or huge boards; we have neither. Client generates `id`s (`crypto.randomUUID()`) for lists/cards so optimistic UI never waits on the server. |
| Mutation granularity | Coarse writes: `PUT /api/boards/:id` replaces `{ name, lists }`, **serialized per board, coalesced to latest** | With embedded docs, every list/card mutation is a write to the same document anyway. One idempotent PUT per committed action is trivially correct (reload = identical state, per acceptance criteria) and shrinks the API to 5 verbs total. **Write serialization (Architect finding 1):** `/src/api/client.ts` maintains a per-board promise chain — at most one PUT in flight; if a mutation lands while a PUT is outstanding, the client stores only the *newest* board snapshot as pending and sends it when the in-flight request settles (intermediate snapshots dropped — last state wins, which is correct because each PUT carries the full board). This makes rapid quick-adds or add-then-drag sequences immune to out-of-order arrival. ~15 lines; unit-tested. **Drag persist timing (finding 2):** during a drag gesture, `onDragOver` container/order changes mutate local state only; **exactly one** persist fires on `onDragEnd` (and none if the drag is cancelled). Lost-update risk across two simultaneously-open devices remains and is accepted for a personal tool — mitigation in Pre-Mortem #3. |
| Auth | `Authorization: Bearer <secret>` header vs `process.env.APP_SECRET`; shared `requireAuth()` helper in every handler → 401. **Compare = SHA-256 both sides, then `crypto.timingSafeEqual` on the digests** (finding 4): equal-length inputs by construction, so no throw on wrong-length secrets and no length oracle. | Matches spec exactly. Client keeps secret in `localStorage`; any 401 flips the app to the unlock screen. No cookies, no sessions, no user table. **Note (finding 6):** an iOS Add-to-Home-Screen app runs in a separate storage silo from the Safari tab — the secret is entered once more after install. Consistent with "once per device" in spirit; documented in README + smoke checklist so it isn't misread as a bug. |
| Mongo connection | Module-scoped cached `MongoClient` (global promise pattern) | M0 caps connections at 500; naive per-invocation clients exhaust it under Vercel's lambda reuse patterns. This is the documented Vercel+Atlas pattern. |
| PWA | `vite-plugin-pwa` (generateSW): precache app shell only; `NetworkOnly` (or simply unhandled) for `/api/*`; manifest `display: standalone`; icons 192/512 + maskable + `apple-touch-icon`; iOS meta tags | Spec: installability + fullscreen, explicitly online-only. No data caching, no background sync. iOS ignores the install prompt — Add to Home Screen reads the manifest + apple meta tags, which is all we need. |
| Unit/component tests | **Vitest + React Testing Library** (jsdom) | Native to Vite (same config/transform pipeline), fast, RTL is the standard for component behavior. Jest would need a parallel babel config for zero gain. |
| API tests | Vitest + **mongodb-memory-server**, invoking handler functions directly with stubbed req/res | Real Mongo semantics (array updates, `_id` handling) without Atlas or Docker in CI. Mocking the driver would test the mock. |
| E2E | **Playwright**, projects: `chromium` (desktop) + `webkit` with iPhone 14 device profile (`hasTouch: true`) | Golden path in a real browser per spec. WebKit + touch emulation is the closest CI proxy for iOS Safari drag (see Pre-Mortem #1 for the real-device gap). `webServer` boots the **dev adapter** (Architect decision, §5.1): a tiny Node server mounting the real handler functions under the Vite proxy, against a throwaway mongodb-memory-server instance. **Touch spec caveat (finding 7):** the 200ms `TouchSensor` activation constraint means the webkit spec must dispatch touch events manually with a >200ms dwell before movement — Playwright's `dragTo` won't trigger activation. Budgeted as expected iteration cost in phases 5/7, not a surprise. |
| Deploy | Vercel Hobby; env vars `MONGODB_URI`, `APP_SECRET` | $0/month as required. |

## 2. Repo Layout

```
/api/boards/index.ts        # GET (list → {id,name} summaries), POST (create)
/api/boards/[id].ts         # GET, PUT (replace lists+name), DELETE
/api/_lib/db.ts             # cached MongoClient
/api/_lib/auth.ts           # requireAuth (SHA-256 both sides → timingSafeEqual)
/shared/types.ts            # Board/List/Card types (imported by api + src)
/src/main.tsx, App.tsx
/src/state/boardReducer.ts  # pure mutation logic (unit-test target)
/src/api/client.ts          # fetch wrapper, auth header, 401 handling,
                            #   per-board write serializer (coalesce-to-latest)
/src/components/            # BoardSwitcher, Board, List, Card, QuickAdd, InlineEdit, UnlockScreen
/src/pwa/                   # manifest config, icons
/tests/unit/                # reducer + component + serializer tests (Vitest/RTL)
/tests/api/                 # handler tests (mongodb-memory-server)
/e2e/                       # Playwright specs + dev adapter harness
vite.config.ts, playwright.config.ts, vercel.json
```

## 3. Work Breakdown (phases)

1. **Scaffold** — Vite+TS+React, shared types, vercel.json, lint/format, Vitest wiring.
2. **Backend** — db client, auth helper (hashed timing-safe compare), boards endpoints (summaries on GET list); API tests green.
3. **App shell + auth flow** — unlock screen, localStorage secret, api client **including the per-board write serializer**, board list/switcher (header dropdown default), board CRUD.
4. **Kanban core** — reducer, lists/cards CRUD (quick-add at list bottom, inline edit, delete), persist-per-committed-action through the serializer.
5. **Drag-and-drop** — dnd-kit: sortable lists (horizontal), sortable cards (vertical, cross-list via `onDragOver` container transfer — **local state only during the gesture**), `DragOverlay` for pointer-following card, drop-settle animation, **single persist on `onDragEnd`**; touch sensor tuning (activation delay ≈200ms + tolerance, `touch-action: manipulation`, disable iOS callout/selection during drag). Ends with the **binding real-iPhone manual smoke** for touch drag (§5.2).
6. **PWA** — vite-plugin-pwa, manifest, icons, iOS meta; verify install on desktop Chrome + document iPhone A2HS steps, including the standalone-storage secret re-entry note.
7. **E2E + hardening** — dev adapter harness, Playwright golden path, auth-rejection spec, reload-persistence spec, webkit touch project (manual touch dispatch with dwell).
8. **Deploy** — Atlas M0 + Vercel setup, env vars, **manual smoke against the Vercel preview deployment** (routing/rewrites drift the adapter can't see), real-iPhone install + touch smoke recorded against the checklist.

Each phase lands with its tests; phase 5 is the risk center and gets the most iteration budget.

## 4. RALPLAN-DR Summary

### Pre-Mortem (3 scenarios)

1. **"Drag works everywhere except the actual iPhone."** iOS Safari's scroll/gesture arbitration eats the touch drag, or drag fights page scroll, or the drop animation stutters. *Mitigations:* dnd-kit `TouchSensor` with delay+tolerance activation constraint so scrolling stays natural; `touch-action` CSS on sortable items; `-webkit-user-select: none` + `-webkit-touch-callout: none` during drag; keep card DOM light (no heavy shadows during transform); **real-iPhone smoke test at the end of phase 5 is binding evidence, not optional** — Playwright webkit emulation is a proxy, not proof. *Early warning:* webkit E2E touch spec flaking is a signal, not noise.
2. **"Free tier bites back."** M0 connection exhaustion from lambda churn, Vercel Hobby function limits, or cold starts making every first mutation feel broken. *Mitigations:* cached global MongoClient (single client, `maxPoolSize` small); only 2 function files; optimistic UI means cold-start latency hides behind local state; Atlas M0 network access allowlist set to 0.0.0.0/0 (Vercel egress IPs aren't stable) — acceptable because auth is app-layer. *Early warning:* Atlas metrics connection count during E2E runs.
3. **"Two open devices silently eat each other's writes."** Coarse full-board PUTs mean phone and desktop both open → last write wins, cards vanish confusingly. (The §1 write serializer eliminates the *same-device* race — out-of-order PUTs from one client can no longer clobber newer state; this scenario is now strictly cross-device.) *Mitigations (accepted-risk tier):* refetch board on `visibilitychange`/window focus so a stale tab self-heals before the user mutates; document the limitation. *Escalation path if it hurts in practice:* add `version` field + conditional update (409 → refetch and replay) — the reducer-action design makes replay feasible later without an API redesign. Not built in v1; spec is single-user personal.

### Expanded Test Plan

**Unit (Vitest)** — `boardReducer`: move card within list, across lists (incl. into empty list), reorder lists, rename/delete cascades, quick-add appends at bottom; id generation stability. **Write serializer:** burst of N snapshots while a PUT is in flight → exactly the latest snapshot is sent next, intermediates dropped, order preserved; failure path rejects/toasts and doesn't wedge the chain. `auth.ts`: correct secret accepted, wrong secret rejected, **wrong-length secret rejected without throwing** (hashed-compare guarantee).
**Component (Vitest + RTL)** — QuickAdd (submit on Enter, clears, appends), InlineEdit (edit/commit/escape-cancel), Card render, UnlockScreen (stores secret, retries), 401-triggered lock behavior.
**API (Vitest + mongodb-memory-server)** — for each endpoint: happy path, missing/wrong bearer → 401, unknown board id → 404, **GET list returns `{id, name}` summaries only (no lists/cards)**, PUT round-trips full nested lists/cards intact (rename included — no PATCH), DELETE removes; malformed body → 400.
**E2E (Playwright, dev adapter harness)** —
- *Golden path (chromium):* unlock → create board → add 2 lists → add cards → drag card across lists → drag to reorder within list → edit card → delete card → **reload → assert identical state** (mirrors the spec's acceptance bullet verbatim).
- *Rapid-mutation spec (chromium):* burst quick-adds then immediate reload → all cards present (exercises the serializer end-to-end).
- *Auth spec:* no secret → app locked, API returns 401; wrong secret → stays locked; correct secret → unlocked and persists across reload.
- *Touch spec (webkit, iPhone profile, hasTouch):* touch-drag a card across lists via **manually dispatched touch events with >200ms dwell** to satisfy the activation constraint; assert final order.
- *List reorder spec:* drag a list, reload, order intact.
- *PWA smoke:* manifest served with `display: standalone` + icons; SW registers. (Animation *feel* and real-device install are manual checklist items — E2E asserts outcomes, not aesthetics.)
**Manual (binding):** real-iPhone touch-drag + A2HS install smoke (phases 5/8); Vercel preview deployment smoke (phase 8).
**Commands:** `npm run test` (unit+component+api), `npm run e2e` (Playwright boots dev adapter + ephemeral Mongo). Both wired into CI-able scripts.

## 5. Decisions (formerly Unresolved Questions — resolved by Architect)

1. **E2E server harness: dev adapter — decided.** A tiny Node adapter mounts the same handler functions under the Vite proxy; identical code exercised, deterministic in CI (`vercel dev` is a known CI flake source). **Condition:** phase 8 includes one manual smoke against a real Vercel preview deployment to catch routing-config drift (`[id].ts` routing, vercel.json rewrites) invisible to the adapter.
2. **Real-iPhone verification — decided.** The manual smoke test on a physical iPhone is the **binding closing evidence** for the "touch drag works on iOS Safari" acceptance criterion, recorded as an explicit checklist item (end of phase 5, re-confirmed at phase 8 deploy).
3. **Board switcher UX — decided.** Header dropdown is the default; cosmetic details at executor discretion.

No unresolved questions remain.
