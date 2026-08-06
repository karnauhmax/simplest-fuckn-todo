# Architect Review — Round 2: Kanban Todo Webapp + PWA

**Verdict: APPROVE**

## Round-1 Finding Verification

| # | Finding (R1) | Severity | Status in Round 2 | Evidence |
|---|---|---|---|---|
| 1 | In-flight write ordering unspecified | Major | **Resolved** | §1 (Mutation granularity) specifies per-board promise chain in `/src/api/client.ts`: max one PUT in flight, coalesce-to-latest, intermediates dropped. Serializer unit test (burst → only latest sent, failure doesn't wedge chain) and a chromium rapid-mutation E2E spec added. Repo layout (§2) reflects it. |
| 2 | Persist timing during drag unspecified | Major | **Resolved** | §1 + phase 5 state explicitly: `onDragOver` mutates local state only; exactly one persist on `onDragEnd`, none on cancelled drags. |
| 3 | PATCH rename inconsistency | Minor | **Resolved** | API surface now uniformly GET/POST + GET/PUT/DELETE; rename via PUT; test matrix row removed; §1 and §2 agree. |
| 4 | `timingSafeEqual` length trap | Minor | **Resolved** | SHA-256 both sides before `timingSafeEqual` — equal-length by construction. Wrong-length-secret unit test added. |
| 5 | GET list payload shape unpinned | Minor | **Resolved** | Pinned to `{id, name}[]` summaries via Mongo projection; API test asserts no lists/cards leak. |
| 6 | iOS standalone storage silo | Info | **Incorporated** | Noted in §1 (Auth), phases 6/8, README, and smoke checklist. |
| 7 | Playwright touch activation dwell | Info | **Incorporated** | §1 (E2E) + test plan: manual touch dispatch with >200ms dwell; flake budgeted in phases 5/7. |
| — | Replace unresolved questions with decisions | — | **Resolved** | §5 records all three decisions verbatim, including the binding real-iPhone smoke and the Vercel-preview manual smoke condition. No open questions remain. |

Nothing was rejected, watered down, or silently dropped. The change log at the top matches the body — I verified each claimed edit exists in the corresponding section.

## Whole-Draft Review

- **Spec coverage:** every acceptance criterion maps to a phase and at least one test. The golden-path E2E mirrors the spec's AC bullet verbatim; the reload-persistence AC now has three layers of defense (idempotent full-board PUT, serializer, rapid-mutation E2E). PWA, auth, touch, and $0-tier criteria all covered.
- **Round-2 additions are net positive:** the rapid-mutation E2E spec is a good end-to-end exercise of the serializer, and the pre-mortem #3 update correctly narrows the lost-update risk to strictly cross-device.
- **Internal consistency:** §1 table, §2 layout, §3 phases, and §4 test plan agree with each other after the edits (this was where round 1's PATCH inconsistency lived — clean now).

### Info (non-blocking, for the executor)

1. **Cancelled-drag local-state revert** — §1/phase 5 say no persist fires on a cancelled drag, but since `onDragOver` has already mutated local list membership mid-gesture, `onDragCancel` must restore the pre-drag snapshot (standard dnd-kit pattern: capture state on `onDragStart`). Otherwise local state diverges from the server until the next mutation. This is the idiomatic dnd-kit implementation and doesn't need a plan revision — just don't skip it.
2. **Serializer failure semantics** — the test plan says the chain "rejects/toasts and doesn't wedge"; whether a pending snapshot still sends after a failed in-flight PUT is executor discretion. Either choice is defensible given the toast + refetch-on-failure policy in §1.

## Residual Risks (unchanged from round 1, correctly carried)

- Real-device iOS drag feel is unverifiable in CI; mitigated by the now-binding end-of-phase-5 iPhone smoke. Remains the top delivery risk.
- Cross-device last-write-wins is accepted by design with a documented escalation path (version + conditional update). Appropriate for the single-user spec.
- dnd-kit maintenance cadence — plan pins versions and excludes betas, which is the right hedge.

The plan is ready for execution.
