# Manual smoke checklists

Automated tests cover everything a headless browser can see. These are the checks
that need a real device or a real deployment. Record a dated pass or fail entry
under each; a failure is a finding, not a formality.

## Real-iPhone touch drag (gates part 7)

Run against the dev server over your LAN (`npm run dev -- --host`, then the
printed network URL) or against a deployed preview.

1. Unlock with the shared secret.
2. Scroll the board with a finger starting **on a card** — the page must scroll,
   nothing must pick up.
3. Press and hold a card for ~a second — it must lift (overlay follows the finger).
4. Drag it to another list and release — neighbours slide apart, the card settles
   where it was dropped, and the page does not scroll under the drag.
5. Drag a list by its header to a new position.
6. Reload the page — both the card and the list must still be where you put them.
7. Double-check no text got selected and no iOS callout menu appeared mid-drag.

- **Status:** OUTSTANDING — not yet run on a physical iPhone.
  Emulated equivalents pass: Chromium iPhone-13 profile with CDP touch events
  performs a cross-list drag after a >200ms hold, a sub-delay swipe scrolls
  instead of dragging, and both produce the expected single write.

## Preview-deployment smoke (gates part 11)

1. Production URL loads over HTTPS and prompts for the secret.
2. Unlock, add a card, reload — the card is still there.
3. Vercel dashboard shows the Hobby plan; Atlas shows an M0 cluster.

- **Status:** OUTSTANDING — not deployed yet.

## Installed-iPhone smoke (gates part 11)

1. Add to Home Screen from Safari; launch from the home screen.
2. Re-enter the secret (the installed app has its own storage silo).
3. Perform a touch drag; reload/relaunch and confirm it persisted.

- **Status:** OUTSTANDING — not deployed yet.
