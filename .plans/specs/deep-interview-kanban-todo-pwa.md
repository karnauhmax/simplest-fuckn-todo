# Deep Interview Spec: Personal Kanban Todo Webapp + PWA

## Metadata
- Interview ID: b7e3f2a1-4c8d-4e5f-9a2b-6d1c3e7f8a90
- Rounds: 9 (incl. Round 0 topology gate)
- Final Ambiguity Score: 17%
- Type: greenfield
- Generated: 2026-08-06
- Threshold: 0.2
- Threshold Source: default
- Initial Context Summarized: no
- Status: PASSED

## Clarity Breakdown
| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Goal Clarity | 0.86 | 0.40 | 0.34 |
| Constraint Clarity | 0.83 | 0.30 | 0.25 |
| Success Criteria | 0.79 | 0.30 | 0.24 |
| **Total Clarity** | | | **0.83** |
| **Ambiguity** | | | **0.17** |

## Topology
| Component | Status | Description | Coverage / Deferral Note |
|-----------|--------|-------------|--------------------------|
| Kanban UI | active | React boards/lists/cards, drag-and-drop, obsidian-kanban-feel animations | Covered: card model, done semantics, op checklist, animation bar |
| Backend + persistence | active | Vercel serverless functions + MongoDB Atlas free tier | Covered: stack, auth model, persistence contract |
| PWA shell | active | Installable on desktop + iPhone, online-only | Covered: offline decision, install targets |
| Test suite | active | E2E golden paths + unit/component tests | Covered: levels, what tests must prove |

## Goal
Build a single-user Kanban todo webapp, deployed free on Vercel with MongoDB Atlas persistence, installable as a PWA on desktop and iPhone. It replicates the *feel* of the obsidian-kanban plugin — smooth drag-and-drop where neighbors slide apart and cards settle animatedly into place — over the minimal domain: multiple boards, each holding ordered lists, each holding ordered plain-text cards. All mutations persist to the server immediately.

## Constraints
- **Stack:** React frontend; no standalone backend framework — Vercel serverless functions only; MongoDB Atlas free tier; everything must run on $0/month.
- **Auth:** single shared secret (password/token), entered once per device and stored locally; sent with every API request. No accounts, no user table.
- **Cards are plain text titles only.** No markdown, no descriptions, no tags, no dates, no checkboxes.
- **Online-only.** PWA means installability + app-like fullscreen, not offline editing. No local DB, no sync queue, no conflict resolution.
- **Animations:** drag must feel like the plugin — card follows pointer/finger, neighbors animate apart to make room, card animates into place on drop (dnd-kit-style animated reordering; basic HTML5 drag is insufficient).
- **Mobile:** touch drag must work on iOS Safari (iPhone); install via Share → Add to Home Screen.
- **Tests mandatory at two levels:** E2E browser tests covering the golden paths, plus unit/component tests for React components and API handlers.
- Personal tool only — never published for other users; no multi-tenancy concerns.

## Non-Goals
- Markdown files or any obsidian integration
- Offline editing / sync / conflict handling
- Archive, "completed list" styling, strikethrough done-states
- Card metadata (tags, due dates, colors, checklists)
- User accounts, OAuth, email/password auth
- Multi-user access, sharing, publishing
- Paid infrastructure of any kind

## Acceptance Criteria
- [ ] Boards: create, rename, delete, and switch between multiple boards
- [ ] Lists: create, rename, delete, and reorder by drag within a board
- [ ] Cards: quick-add via input at list bottom, edit inline, delete, drag within a list and across lists
- [ ] "Done" is an ordinary user-created list — no special semantics
- [ ] Drag interactions animate: neighbors slide apart during drag, card settles into place on drop
- [ ] Every mutation persists to the server immediately; a full page reload shows identical state
- [ ] Wrong/missing shared secret → API rejects requests; correct secret entered once per device unlocks the app persistently
- [ ] PWA installs on desktop (Chrome install prompt) and iPhone (Add to Home Screen), launching fullscreen/standalone
- [ ] Touch drag works on iOS Safari
- [ ] E2E test suite covers the golden path: create board → add lists → add cards → drag card across lists → edit → delete → reload → state intact
- [ ] Unit/component tests cover React components and API handlers
- [ ] Deploys on Vercel free tier with MongoDB Atlas free tier ($0/month)
- [ ] Existing board migrated verbatim: all six lists from `existing-tasks.md` (On Hold, TODAY, THIS WEEK, LATER, Done, Archive) appear in the deployed app with exact card text and order

## Addendum: Data Migration (post-interview)

Added after interview close. The user's current Obsidian Kanban board (`existing-tasks.md`, repo root) must be migrated verbatim into the new app as a single board:

- **Source:** Obsidian Kanban markdown — six lists (On Hold: 9 cards, TODAY: 8, THIS WEEK: 2, LATER: 1, Done: 66, Archive: 2; 88 cards total), every card a plain `- [ ]` line; the trailing `%% kanban:settings %%` block is ignored.
- **Fidelity:** exact card text and list/card order preserved. "Done" and "Archive" migrate as ordinary lists — consistent with the no-special-semantics rule; the Non-Goal excludes archive *mechanics*, not a list named Archive.
- **Mechanism (user decision):** one-time direct insert into the Atlas `boards` collection — a throwaway parse-and-insert script, not app code and not an in-app import feature. Verified by opening the deployed app.

## Assumptions Exposed & Resolved
| Assumption | Challenge | Resolution |
|------------|-----------|------------|
| "Same functionality as the plugin" implies full card features | R1: plugin cards have markdown/tags/dates — is that "simple as fuck"? | Cards are plain-text titles only |
| A public personal app can skip auth | R2: your todos at a public URL | Single shared secret, stored per device |
| "PWA" implies offline support | R3: offline editing needs local store + sync engine | Installable, online-only — no offline editing |
| "Tests mandatory" is self-explanatory | R4: what must tests prove? | Both E2E golden paths and unit/component tests |
| Needs a backend framework | R5 (Contrarian): what if no backend at all? | Vercel serverless functions + Atlas; no framework |
| "Done" needs special mechanics | R6: plugin has complete-lists + archive | Done is just a regular list |
| Feature set could silently grow | R7 (Simplifier): proposed minimal op checklist | Checklist confirmed verbatim as acceptance criteria |
| "Nice animations" is subjective | R8: what concretely must feel right? | Smooth drag + settle: neighbors slide apart, animated drop |
| "Mobile" is any phone | R9: iOS quirks differ from Android | iPhone / iOS Safari is the mobile target |

## Technical Context
Greenfield; empty working directory (`/home/agent/work/solopreneurship/todo`). Decisions made during the interview:
- **Hosting:** Vercel (static frontend + serverless API functions), free tier
- **DB:** MongoDB Atlas free tier (M0)
- **Frontend:** React; drag-and-drop library must support animated reordering and touch sensors (dnd-kit is the reference candidate)
- **Auth:** shared secret checked server-side on every API call (e.g. header token compared against an environment variable); client stores it in localStorage after first entry
- **PWA:** web app manifest + minimal service worker sufficient for installability (app shell caching only; no data caching required)
- **Tests:** E2E in a real browser (Playwright-style) against the running app; unit/component tests (Vitest/RTL-style) for components and API handlers — exact tools left to planning

## Ontology (Key Entities)
| Entity | Type | Fields | Relationships |
|--------|------|--------|---------------|
| Board | core domain | id, name, list order | has many Lists |
| List | core domain | id, name, position | belongs to Board; has many Cards |
| Card | core domain | id, title (plain text), position | belongs to List |
| Secret | supporting | token value (server env + device localStorage) | gates all API access |

## Ontology Convergence
| Round | Entity Count | New | Changed | Stable | Stability Ratio |
|-------|-------------|-----|---------|--------|----------------|
| 1 | 4 | 4 | - | - | - |
| 2 | 4 | 1 (Secret) | 0 | 3 | 75% |
| 3 | 4 | 0 | 0 | 4 | 100% |
| 4 | 4 | 0 | 0 | 4 | 100% |
| 5 | 4 | 0 | 0 | 4 | 100% |
| 6–9 | 4 | 0 | 0 | 4 | 100% |

## Interview Transcript
<details>
<summary>Full Q&A (9 rounds)</summary>

### Round 0 — Topology
**Q:** 4 top-level components: Kanban UI, Backend + persistence, PWA shell, Test suite — right?
**A:** Looks right.

### Round 1
**Q:** What is a card, content-wise — plain text, description, metadata, or full plugin parity?
**A:** Plain text title only.
**Ambiguity:** 71% (Goal: 0.35, Constraints: 0.30, Criteria: 0.20)

### Round 2
**Q:** Public URL + personal data: how is access protected?
**A:** Single shared secret, entered once per device.
**Ambiguity:** 66% (Goal: 0.42, Constraints: 0.36, Criteria: 0.22)

### Round 3
**Q:** What does PWA mean in practice — installable online-only, read-only offline, or full offline sync?
**A:** Installable, online-only.
**Ambiguity:** 60% (Goal: 0.48, Constraints: 0.42, Criteria: 0.27)

### Round 4
**Q:** What must tests give you confidence in — E2E, unit, both, API-only?
**A:** Both E2E + unit.
**Ambiguity:** 50% (Goal: 0.62, Constraints: 0.50, Criteria: 0.35)

### Round 5 — Contrarian
**Q:** What if there were no backend framework at all — serverless + Atlas, Next.js full-stack, standalone server, or different DB?
**A:** Vercel serverless + Mongo Atlas, no framework.
**Ambiguity:** 42% (Goal: 0.68, Constraints: 0.62, Criteria: 0.42)

### Round 6
**Q:** What does "moving a card to done" mean — regular list, flagged complete-list styling, or archive?
**A:** Done is just a regular list.
**Ambiguity:** 32% (Goal: 0.81, Constraints: 0.68, Criteria: 0.50)

### Round 7 — Simplifier
**Q:** Proposed minimal operation checklist (boards/lists/cards CRUD + drag + persist + touch) — cut or add anything?
**A:** That's exactly it.
**Ambiguity:** 22% (Goal: 0.86, Constraints: 0.74, Criteria: 0.70)

### Round 8
**Q:** What must the animations concretely deliver?
**A:** Smooth drag + settle — neighbors slide apart, card animates into place.
**Ambiguity:** 19% (Goal: 0.86, Constraints: 0.83, Criteria: 0.72)

### Round 9
**Q:** Which mobile OS must install + touch-drag work on?
**A:** iOS (iPhone).
**Ambiguity:** 17% (Goal: 0.86, Constraints: 0.83, Criteria: 0.79)

</details>
