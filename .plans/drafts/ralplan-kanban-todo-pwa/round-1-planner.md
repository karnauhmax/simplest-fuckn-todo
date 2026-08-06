# RALPLAN Round 1 — Kanban Todo Webapp + PWA (Planner Draft)

Spec: `.plans/specs/deep-interview-kanban-todo-pwa.md` (status: PASSED, ambiguity 17%)
Mode: DELIBERATE. Greenfield; empty repo.

## 1. Technology Decisions (concrete + defended)

| Area | Choice | Why (and why not the alternative) |
|------|--------|-----------------------------------|
| Language | TypeScript everywhere (frontend + `api/`) | Shared `Board/List/Card` types between client and serverless handlers; catches drag-reorder index bugs at compile time. JS saves nothing here. |
| Build tool | **Vite** + React 18 + `@vitejs/plugin-react` | Spec forbids a backend framework, so Next.js is out. Vite is the default for SPA React, first-class Vercel static build, and `vite-plugin-pwa` gives manifest + SW generation for free. CRA is dead; Parcel has no PWA plugin ecosystem worth the switch. |
| DnD library | **dnd-kit** (`@dnd-kit/core` + `@dnd-kit/sortable`) | Named as the reference candidate in the spec. It is the only mainstream option that delivers all three hard requirements at once: (a) animated neighbor displacement + settle-on-drop via `SortableContext` transforms, (b) `TouchSensor`/`PointerSensor` with activation constraints for iOS Safari, (c) cross-container card moves. `@hello-pangea/dnd` animates beautifully but its touch handling and multi-axis nesting (sortable lists containing sortable cards) are weaker; HTML5 DnD is explicitly ruled out by the spec. |
| State | Plain React state: one `useReducer` board store + thin `api.ts` fetch wrapper | Single user, one screen, ~4 entity types. dnd-kit already forces local optimistic state during drag; a reducer with actions (`moveCard`, `renameList`, …) doubles as the pure logic layer we unit-test. TanStack Query / zustand add dependency weight without solving a problem we have. Persistence: each reducer action fires the matching API call; on failure, toast + refetch board. |
| Backend | Vercel serverless functions in `/api` (Node runtime), **2 function files** | `api/boards/index.ts` (GET list, POST create) and `api/boards/[id].ts` (GET, PUT, PATCH rename, DELETE). Method-switch inside the file keeps us far under Hobby-tier function limits and minimizes cold-start surface. |
| DB | MongoDB Atlas M0, **one `boards` collection, fully embedded documents** | `Board { _id, name, lists: [{ id, name, cards: [{ id, title }] }] }`. Order = array order, so **no position/rank fields, no fractional indexing, no rebalancing** — the classic Kanban-ordering complexity disappears. A personal board will never approach the 16MB doc limit. Separate collections + position floats would only pay off with concurrency or huge boards; we have neither. Client generates `id`s (`crypto.randomUUID()`) for lists/cards so optimistic UI never waits on the server. |
| Mutation granularity | Coarse writes: `PUT /api/boards/:id` replaces `{ name, lists }` | With embedded docs, every list/card mutation is a write to the same document anyway. One idempotent PUT after each reducer action is trivially correct (reload = identical state, per acceptance criteria) and shrinks the API to 5 verbs total. Lost-update risk across two simultaneously-open devices is real but accepted for a personal tool — mitigation in Pre-Mortem #3. |
| Auth | `Authorization: Bearer <secret>` header vs `process.env.APP_SECRET`, timing-safe compare (`crypto.timingSafeEqual`); shared `requireAuth()` helper in every handler → 401 | Matches spec exactly. Client keeps secret in `localStorage`; any 401 flips the app to the unlock screen. No cookies, no sessions, no user table. |
| Mongo connection | Module-scoped cached `MongoClient` (global promise pattern) | M0 caps connections at 500; naive per-invocation clients exhaust it under Vercel's lambda reuse patterns. This is the documented Vercel+Atlas pattern. |
| PWA | `vite-plugin-pwa` (generateSW): precache app shell only; `NetworkOnly` (or simply unhandled) for `/api/*`; manifest `display: standalone`; icons 192/512 + maskable + `apple-touch-icon`; iOS meta tags | Spec: installability + fullscreen, explicitly online-only. No data caching, no background sync. iOS ignores the install prompt — Add to Home Screen reads the manifest + apple meta tags, which is all we need. |
| Unit/component tests | **Vitest + React Testing Library** (jsdom) | Native to Vite (same config/transform pipeline), fast, RTL is the standard for component behavior. Jest would need a parallel babel config for zero gain. |
| API tests | Vitest + **mongodb-memory-server**, invoking handler functions directly with stubbed req/res | Real Mongo semantics (array updates, `_id` handling) without Atlas or Docker in CI. Mocking the driver would test the mock. |
| E2E | **Playwright**, projects: `chromium` (desktop) + `webkit` with iPhone 14 device profile (`hasTouch: true`) | Golden path in a real browser per spec. WebKit + touch emulation is the closest CI proxy for iOS Safari drag (see Pre-Mortem #1 for the real-device gap). `webServer` config boots `vercel dev` (or `vite preview` + local API adapter) against a throwaway mongodb-memory-server instance. |
| Deploy | Vercel Hobby; env vars `MONGODB_URI`, `APP_SECRET` | $0/month as required. |

## 2. Repo Layout

```
/api/boards/index.ts        # GET (list), POST (create)
/api/boards/[id].ts         # GET, PUT (replace lists+name), DELETE
/api/_lib/db.ts             # cached MongoClient
/api/_lib/auth.ts           # requireAuth (timing-safe)
/shared/types.ts            # Board/List/Card types (imported by api + src)
/src/main.tsx, App.tsx
/src/state/boardReducer.ts  # pure mutation logic (unit-test target)
/src/api/client.ts          # fetch wrapper, auth header, 401 handling
/src/components/            # BoardSwitcher, Board, List, Card, QuickAdd, InlineEdit, UnlockScreen
/src/pwa/                   # manifest config, icons
/tests/unit/                # reducer + component tests (Vitest/RTL)
/tests/api/                 # handler tests (mongodb-memory-server)
/e2e/                       # Playwright specs
vite.config.ts, playwright.config.ts, vercel.json
```

## 3. Work Breakdown (phases)

1. **Scaffold** — Vite+TS+React, shared types, vercel.json, lint/format, Vitest wiring.
2. **Backend** — db client, auth helper, boards endpoints; API tests green.
3. **App shell + auth flow** — unlock screen, localStorage secret, api client, board list/switcher, board CRUD.
4. **Kanban core** — reducer, lists/cards CRUD (quick-add at list bottom, inline edit, delete), coarse persist-on-action.
5. **Drag-and-drop** — dnd-kit: sortable lists (horizontal), sortable cards (vertical, cross-list via `onDragOver` container transfer), `DragOverlay` for pointer-following card, drop-settle animation; touch sensor tuning (activation delay ≈200ms + tolerance, `touch-action: manipulation`, disable iOS callout/selection during drag).
6. **PWA** — vite-plugin-pwa, manifest, icons, iOS meta; verify install on desktop Chrome + document iPhone A2HS steps.
7. **E2E + hardening** — Playwright golden path, auth-rejection spec, reload-persistence spec, webkit touch project.
8. **Deploy** — Atlas M0 + Vercel setup, env vars, smoke test on real iPhone.

Each phase lands with its tests; phase 5 is the risk center and gets the most iteration budget.

## 4. RALPLAN-DR Summary

### Pre-Mortem (3 scenarios)

1. **"Drag works everywhere except the actual iPhone."** iOS Safari's scroll/gesture arbitration eats the touch drag, or drag fights page scroll, or the drop animation stutters. *Mitigations:* dnd-kit `TouchSensor` with delay+tolerance activation constraint so scrolling stays natural; `touch-action` CSS on sortable items; `-webkit-user-select: none` + `-webkit-touch-callout: none` during drag; keep card DOM light (no heavy shadows during transform); **schedule a real-iPhone smoke test at the end of phase 5, not at deploy time** — Playwright webkit emulation is a proxy, not proof. *Early warning:* webkit E2E touch spec flaking is a signal, not noise.
2. **"Free tier bites back."** M0 connection exhaustion from lambda churn, Vercel Hobby function limits, or cold starts making every first mutation feel broken. *Mitigations:* cached global MongoClient (single client, `maxPoolSize` small); only 2 function files; optimistic UI means cold-start latency hides behind local state; Atlas M0 network access allowlist set to 0.0.0.0/0 (Vercel egress IPs aren't stable) — acceptable because auth is app-layer. *Early warning:* Atlas metrics connection count during E2E runs.
3. **"Two open devices silently eat each other's writes."** Coarse full-board PUTs mean phone and desktop both open → last write wins, cards vanish confusingly. *Mitigations (accepted-risk tier):* refetch board on `visibilitychange`/window focus so a stale tab self-heals before the user mutates; document the limitation. *Escalation path if it hurts in practice:* add `version` field + conditional update (409 → refetch and replay) — the reducer-action design makes replay feasible later without an API redesign. Not built in v1; spec is single-user personal.

### Expanded Test Plan

**Unit (Vitest)** — `boardReducer`: move card within list, across lists (incl. into empty list), reorder lists, rename/delete cascades, quick-add appends at bottom; id generation stability; `auth.ts` timing-safe compare accepts/rejects.
**Component (Vitest + RTL)** — QuickAdd (submit on Enter, clears, appends), InlineEdit (edit/commit/escape-cancel), Card render, UnlockScreen (stores secret, retries), 401-triggered lock behavior.
**API (Vitest + mongodb-memory-server)** — for each endpoint: happy path, missing/wrong bearer → 401, unknown board id → 404, PUT round-trips full nested lists/cards intact, DELETE removes; malformed body → 400.
**E2E (Playwright)** —
- *Golden path (chromium):* unlock → create board → add 2 lists → add cards → drag card across lists → drag to reorder within list → edit card → delete card → **reload → assert identical state** (mirrors the spec's acceptance bullet verbatim).
- *Auth spec:* no secret → app locked, API returns 401; wrong secret → stays locked; correct secret → unlocked and persists across reload.
- *Touch spec (webkit, iPhone profile, hasTouch):* touch-drag a card across lists; assert final order.
- *List reorder spec:* drag a list, reload, order intact.
- *PWA smoke:* manifest served with `display: standalone` + icons; SW registers. (Animation *feel* and real-device install are manual checklist items — E2E asserts outcomes, not aesthetics.)
**Commands:** `npm run test` (unit+component+api), `npm run e2e` (Playwright boots server + ephemeral Mongo). Both wired into CI-able scripts.

### Unresolved Questions
1. E2E server harness: `vercel dev` (faithful but slow/flaky in CI) vs a tiny dev-only Node adapter mounting the same handler functions under Vite proxy. Planner leans **adapter** — same handler code exercised, faster and deterministic. Needs a decision.
2. Real-iPhone verification can't run in this environment — accept manual smoke test as the closing step for AC "touch drag works on iOS Safari"?
3. Board switching UX: dropdown in header vs boards home screen. Planner leans header dropdown (fewest screens). Cosmetic; executor may decide.
