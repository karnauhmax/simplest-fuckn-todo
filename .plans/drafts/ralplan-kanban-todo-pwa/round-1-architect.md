# Architect Review — Round 1: Kanban Todo Webapp + PWA

**Verdict: REVISION NEEDED** (minor scope — the architecture is sound; one revision round to close the planner's own open questions and pin down two persistence-correctness gaps)

## Overall Assessment

The plan is strong and well-defended. Fully-embedded board documents with array-order-as-position is the correct simplification for a single-user tool — it eliminates the entire fractional-indexing/rebalancing problem class. Vite (not Next.js), dnd-kit, Vitest/RTL, Playwright, cached MongoClient, 2-function API surface: all correct calls, all defended against alternatives. The pre-mortem correctly identifies iOS touch as the risk center. What blocks approval is that the coarse-PUT persistence model is under-specified in exactly the place where it can violate the "reload shows identical state" acceptance criterion.

## Findings

### Major

1. **In-flight write ordering is unspecified** — `round-1-planner.md` §1 (Mutation granularity), phase 4.
   "Each reducer action fires the matching API call" + full-board PUTs means two quick actions (e.g., rapid quick-adds, add-then-drag) produce concurrent PUTs that can arrive out of order; the older snapshot wins and the reload-persistence AC fails intermittently. Required amendment: a per-board client-side write serializer — a promise chain that coalesces to latest state (if a write is in flight, queue only the newest snapshot). ~15 lines in `/src/api/client.ts`; must be in the plan, not left to the executor to discover.

2. **Persist timing during drag is unspecified** — §1 + phase 5.
   dnd-kit's cross-container pattern mutates local list membership continuously in `onDragOver`. If "every reducer action fires an API call" is applied literally, one drag fires dozens of PUTs mid-gesture. The plan must state explicitly: intermediate drag reorders mutate local state only; persistence fires once, on `onDragEnd`.

### Minor

3. **API surface inconsistency** — §1 table lists `PATCH rename` on `api/boards/[id].ts`; §2 repo layout lists only GET/PUT/DELETE. Drop PATCH — PUT replacing `{name, lists}` already covers rename. One verb fewer, one test matrix row fewer.

4. **`crypto.timingSafeEqual` length trap** — `api/_lib/auth.ts`. It throws on unequal-length buffers, so a naive call leaks length via a 500 and crashes on wrong-length secrets. Amendment: hash both sides (SHA-256) then compare digests, or explicit length gate. One line in the plan avoids a real bug.

5. **`GET /api/boards` payload shape unspecified** — decide summaries (`{id, name}`) vs full documents. Either is fine for this scale; the board-switcher only needs summaries. Pick one so client and API tests agree.

### Info

6. **iOS standalone storage silo** — an Add-to-Home-Screen app has localStorage isolated from the Safari tab, so the user re-enters the secret once after install. Consistent with "once per device" in spirit; worth one line in the plan/README so it isn't mistaken for a bug during the real-iPhone smoke test.

7. **Playwright + 200ms touch activation delay** — the webkit touch spec will need manual touch-event dispatch with dwell (native `dragTo` won't satisfy the activation constraint). Plan already budgets iteration for phase 5/7; flagging so the flake risk is understood as expected cost, not a surprise.

## Decisions on the Planner's Unresolved Questions

1. **E2E harness: dev adapter — approved.** A tiny Node adapter mounting the same handler functions under the Vite proxy exercises identical code and is deterministic in CI; `vercel dev` in CI is a known flake source. Condition: add one manual smoke against a real Vercel preview deployment (phase 8) to catch routing-config drift (`[id].ts` routing, vercel.json rewrites) that the adapter cannot see.
2. **Real-iPhone verification: yes, accept manual smoke** as the closing evidence for the iOS-touch AC, recorded as an explicit checklist item in the plan (planner already leans this way — confirm it as binding).
3. **Board switcher UX: header dropdown, executor discretion.** Cosmetic; no plan change needed beyond noting the default.

## What Round 2 Must Contain

- Write-serialization policy (finding 1) and persist-on-dragEnd-only (finding 2) stated in the persistence section.
- PATCH removed (finding 3); auth compare hardening noted (finding 4); GET payload shape pinned (finding 5).
- Unresolved-questions section replaced with the three decisions above.

Everything else stands as drafted — no changes requested to stack, data model, repo layout, phases, or test plan.

## Residual Risks

- Real-device iOS drag feel cannot be verified in this environment; Playwright webkit is a proxy. Mitigated by the mandated end-of-phase-5 manual smoke, but it remains the top delivery risk.
- Two-device last-write-wins data loss is accepted by design (pre-mortem 3); the focus-refetch mitigation reduces but does not eliminate it. Acceptable per spec (single-user personal tool), with a documented escalation path.
- dnd-kit's maintenance cadence has slowed; it remains the best fit for the animated + touch + cross-container requirement set, but pin versions and avoid beta releases.
