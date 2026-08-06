# Plan: Personal Kanban Todo Webapp + PWA

**Status:** pending approval
**Spec:** .plans/specs/deep-interview-kanban-todo-pwa.md
**Consensus:** round 2 of 5 — Planner / Architect / Critic
**Mode:** DELIBERATE

## Architecture Decision Record

- **Decision:** Build a Vite+TypeScript React SPA with dnd-kit drag-and-drop, backed by two Vercel serverless function files over a single fully-embedded MongoDB Atlas `boards` collection, with shared-secret bearer auth, coarse serialized full-board PUTs, vite-plugin-pwa installability, and a Vitest/RTL + mongodb-memory-server + Playwright test stack.
- **Drivers:**
  1. *Spec-locked constraints* — no backend framework, $0 infra, online-only PWA: rules out Next.js, standalone servers, and offline/sync machinery.
  2. *Animated + touch + cross-container drag on iOS Safari* — dnd-kit is the only mainstream library delivering all three (SortableContext transforms, TouchSensor activation constraints, cross-container moves).
  3. *Single-user simplicity* — embedded documents with array-order-as-position eliminate the entire fractional-indexing/position-rebalancing problem class; coarse idempotent PUTs make "reload shows identical state" trivially correct.
- **Alternatives Considered:**
  - *Next.js full-stack* — rejected: spec forbids a backend framework; Vite + `/api` functions is lighter.
  - *@hello-pangea/dnd* — rejected: weaker touch handling and nested sortable (lists containing cards); HTML5 DnD ruled out by the animation requirement.
  - *Separate lists/cards collections + position fields* — rejected: pays off only with concurrency or huge boards; neither exists here.
  - *TanStack Query / zustand* — rejected: one screen, four entity types; `useReducer` doubles as the unit-testable pure logic layer.
  - *Jest, `vercel dev` in CI* — rejected: Vitest shares the Vite pipeline; `vercel dev` is a known CI flake source (dev adapter mounts the same handlers deterministically).
- **Why Chosen:** every choice is the lightest option that satisfies a locked spec constraint; complexity budget is spent on the one hard problem (animated touch drag on iOS), not on infrastructure.
- **Consequences:**
  - *Positive:* 5 API verbs total, no ordering math, no sessions/user table, optimistic UI hides serverless cold starts, whole test pyramid runs without Docker or Atlas.
  - *Negative:* cross-device last-write-wins remains (accepted for a single-user tool, focus-refetch mitigates); real-device iOS drag feel is unverifiable in CI (binding manual smoke instead); dev adapter can't see Vercel routing config (preview-deploy smoke instead).
- **Follow-ups:** if cross-device lost updates hurt in practice, add `version` + conditional update (409 → refetch/replay) — reducer-action design supports this without an API redesign. Pin dnd-kit versions; no betas.

## Task Breakdown

1. **Scaffold** — Vite+TS+React app, `/shared/types.ts` (Board/List/Card), `vercel.json`, lint/format, Vitest wiring.
   *Files:* `vite.config.ts`, `tsconfig.json`, `vercel.json`, `/shared/types.ts`, `/src/main.tsx`, `/src/App.tsx`.
   *Accept:* `npm run dev` serves the app; `npm run test` runs an empty-but-wired Vitest suite; types importable from both `/src` and `/api`.
2. **Backend** — cached MongoClient, auth helper, board endpoints.
   *Files:* `/api/_lib/db.ts` (module-scoped cached client, small `maxPoolSize`), `/api/_lib/auth.ts` (`requireAuth`: SHA-256 both sides → `crypto.timingSafeEqual`), `/api/boards/index.ts` (GET → `{id,name}[]` summaries via projection; POST create), `/api/boards/[id].ts` (GET full doc; PUT replace `{name, lists}`; DELETE), `/tests/api/*`.
   *Accept:* API tests green against mongodb-memory-server: happy paths; 401 on missing/wrong bearer; wrong-length secret rejected without throwing; 404 unknown id; 400 malformed body; GET list leaks no lists/cards; PUT round-trips nested lists/cards (rename via PUT — no PATCH).
3. **App shell + auth flow** — unlock screen, localStorage secret, API client with per-board write serializer, board switcher + board CRUD.
   *Files:* `/src/api/client.ts` (auth header, 401 → lock, per-board coalesce-to-latest promise chain: max one PUT in flight, only newest snapshot queued), `/src/components/UnlockScreen.tsx`, `/src/components/BoardSwitcher.tsx` (header dropdown), `/tests/unit/*`.
   *Accept:* serializer unit tests green (burst → only latest sent, intermediates dropped, failure doesn't wedge chain); UnlockScreen/401-lock component tests green; boards can be created/renamed/deleted/switched against the running API.
4. **Kanban core** — reducer + lists/cards CRUD, persistence per committed action.
   *Files:* `/src/state/boardReducer.ts`, `/src/components/{Board,List,Card,QuickAdd,InlineEdit}.tsx`, `/tests/unit/*`.
   *Accept:* reducer unit tests green (move within/across lists incl. empty list, reorder lists, rename/delete cascades, quick-add appends at bottom); QuickAdd/InlineEdit/Card RTL tests green; every committed action persists through the serializer; client-generated `crypto.randomUUID()` ids.
5. **Drag-and-drop** (risk center — largest iteration budget) — dnd-kit sortable lists (horizontal) + cards (vertical, cross-list via `onDragOver` container transfer), `DragOverlay` pointer-following card, settle-on-drop animation.
   *Rules:* during a gesture, `onDragOver` mutates local state only; exactly one persist on `onDragEnd`; none on cancel (restore `onDragStart` snapshot — Architect info note). Touch tuning: TouchSensor delay ≈200ms + tolerance, `touch-action: manipulation`, `-webkit-user-select: none`, `-webkit-touch-callout: none` during drag.
   *Files:* `/src/components/{Board,List,Card}.tsx` (sensors/contexts), drag styles.
   *Accept:* neighbors slide apart during drag and card settles on drop; **binding real-iPhone manual smoke: touch drag works in mobile Safari**.
6. **PWA** — vite-plugin-pwa (generateSW), app-shell precache only, `/api/*` NetworkOnly/unhandled, manifest `display: standalone`, icons 192/512 + maskable + apple-touch-icon, iOS meta tags.
   *Files:* `vite.config.ts` (pwa plugin), `/src/pwa/*`, README note: iOS A2HS runs in a separate storage silo — secret re-entered once after install (expected, not a bug).
   *Accept:* desktop Chrome shows install prompt and app launches standalone; manifest + icons served; iPhone A2HS steps documented.
7. **E2E + hardening** — dev adapter harness (Node server mounting the real handler functions under the Vite proxy, ephemeral mongodb-memory-server) + Playwright projects `chromium` and `webkit` (iPhone 14 profile, `hasTouch`).
   *Files:* `/e2e/*` (adapter + specs), `playwright.config.ts`.
   *Specs:* golden path (unlock → create board → 2 lists → cards → drag across lists → reorder → edit → delete → reload → identical state); rapid-mutation burst then reload (serializer end-to-end); auth spec (no/wrong/correct secret, persists across reload); list-reorder + reload; webkit touch drag via manually dispatched touch events with >200ms dwell; PWA smoke (manifest standalone, SW registers — enable `devOptions` or run against `vite preview` per Critic note).
   *Accept:* `npm run e2e` green locally with both projects.
8. **Deploy** — Atlas M0 (network allowlist 0.0.0.0/0 — auth is app-layer), Vercel Hobby, env `MONGODB_URI` + `APP_SECRET`.
   *Accept:* manual smoke against the Vercel preview deployment (routing/rewrites drift invisible to the adapter); real-iPhone install + touch smoke re-confirmed against the checklist; $0/month verified.
9. **Data migration** — throwaway script (`/scripts/migrate-obsidian.ts`, not app code) parses `existing-tasks.md` (Obsidian Kanban markdown: `##` headings → lists, `- [ ]` lines → card titles, `%% kanban:settings %%` block ignored) and inserts one board document directly into the Atlas `boards` collection using `/shared/types.ts` shapes and `crypto.randomUUID()` ids. Direct Mongo insert per user decision — bypasses the API by design.
   *Files:* `/scripts/migrate-obsidian.ts`.
   *Accept:* the deployed app shows the migrated board with all six lists (On Hold, TODAY, THIS WEEK, LATER, Done, Archive) and all 88 cards in exact source text and order; drag/edit on migrated cards persists normally (document shape indistinguishable from app-created boards).

## Dependency Graph

```
1 Scaffold ─→ 2 Backend ─→ 3 Shell/Auth ─→ 4 Kanban core ─→ 5 DnD ─→ 7 E2E ─→ 8 Deploy ─→ 9 Migration
                                                        └──→ 6 PWA ──────────┘
```

Sequential spine 1→2→3→4→5; 6 (PWA) can run parallel to 5/7 once 3 exists; 7 needs 5; 8 needs 6+7; 9 needs 8 (live Atlas + deployed app to verify against). Each phase lands with its tests.

## Acceptance Criteria

Traceable 1:1 to the spec's Acceptance Criteria section:

- [ ] Boards: create, rename (via PUT), delete, switch (header dropdown) — phases 2–3
- [ ] Lists: create, rename, delete, drag-reorder within a board — phases 4–5
- [ ] Cards: quick-add at list bottom, inline edit, delete, drag within and across lists — phases 4–5
- [ ] "Done" is an ordinary list — no special semantics anywhere (verified by absence)
- [ ] Drag animates: neighbors slide apart, card settles on drop (dnd-kit transforms + DragOverlay) — phase 5
- [ ] Every mutation persists immediately; reload shows identical state (idempotent PUT + serializer + reload E2E) — phases 3–4, 7
- [ ] Wrong/missing secret → 401 + locked app; correct secret unlocks persistently per device — phases 2–3, 7
- [ ] PWA installs on desktop Chrome and iPhone A2HS, launches standalone — phase 6
- [ ] Touch drag works on iOS Safari — phase 5 (binding real-iPhone smoke) + webkit E2E proxy
- [ ] E2E golden path green: create board → lists → cards → drag → edit → delete → reload intact — phase 7
- [ ] Unit/component tests cover reducer, serializer, auth helper, components, API handlers — phases 2–4
- [ ] Runs on Vercel Hobby + Atlas M0 at $0/month — phase 8
- [ ] Existing board from `existing-tasks.md` migrated verbatim — six lists, 88 cards, exact text and order — phase 9

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| iOS Safari touch drag broken/janky on real device | Medium | High (core UX) | TouchSensor delay+tolerance, touch-action CSS, light drag DOM; webkit E2E as early warning; **binding real-iPhone smoke ends phase 5** |
| Same-device out-of-order PUTs corrupt state | Low (designed out) | High | Per-board coalesce-to-latest write serializer; unit + rapid-mutation E2E |
| Cross-device last-write-wins data loss | Low (single user) | Medium | Refetch on focus/visibilitychange; documented; escalation path: version + conditional update |
| Atlas M0 connection exhaustion via lambda churn | Low | Medium | Cached global MongoClient, small pool, 2 function files; watch Atlas metrics |
| Dev adapter ≠ Vercel routing config | Low | Medium | Phase-8 manual smoke against real preview deployment |
| dnd-kit maintenance cadence | Low | Low | Pin versions, no betas |
| Playwright webkit touch spec flake | Medium | Low | Manual touch dispatch with >200ms dwell; flake iteration budgeted, treated as signal for risk #1 |
| Migration script inserts a shape the app mishandles (bypasses API validation) | Low | Medium | Script imports `/shared/types.ts`; acceptance requires drag/edit on migrated cards to persist normally |

## Review Trail

**Round 1** — Planner drafted (Vite+TS, dnd-kit, embedded single-collection model, 2 serverless files, coarse PUTs, Vitest/RTL + mongodb-memory-server + Playwright; DELIBERATE pre-mortem + expanded test plan; 3 open questions).
**Round 1 Architect: REVISION NEEDED** — Major: (1) in-flight write ordering unspecified → require per-board coalesce-to-latest serializer; (2) drag persist timing unspecified → persist only on `onDragEnd`. Minor: drop PATCH; SHA-256-before-`timingSafeEqual` to avoid length trap; pin GET list payload to summaries. Info: iOS standalone storage silo; webkit touch activation dwell. Resolved the 3 open questions (dev adapter + preview smoke; binding iPhone smoke; header dropdown).
**Round 2** — Planner fixed all 7 findings (none rejected), threading the two majors through architecture, repo layout, phases, and test plan; replaced open questions with the Architect's decisions.
**Round 2 Architect: APPROVE** — verified each finding resolved in place; added 2 non-blocking executor notes (cancelled-drag snapshot restore; serializer failure semantics discretionary).
**Round 2 Critic: APPROVE** — independently spot-checked finding closure; verified all 12 spec ACs map to phases + verification; internal consistency across sections; 1 info note (SW registration needs `devOptions.enabled` or `vite preview` in the E2E PWA smoke). Consensus.
**Post-consensus scope addition (2026-08-06)** — user added verbatim migration of the existing Obsidian Kanban board (`existing-tasks.md`, six lists / 88 cards). User decisions: direct Mongo insert via throwaway script (not app code, not an import feature); all six lists including Done and Archive. Added as phase 9, spec addendum, and slice 12 — no change to the consensus architecture.
