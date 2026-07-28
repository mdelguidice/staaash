# Handoff — keychain dialog fix (visual diff harness)

**Date:** 2026-07-28 · **Repo:** `/Users/mike/staaash` · **Branch:** `design-tweaks` (local only, never pushed)
**Commit:** `61fcb2b` — *Stop the harness popping a macOS keychain dialog on every launch*

Context for an agent picking this up cold. For the harness as a whole, read
[`tools/visual-diff/README.md`](../tools/visual-diff/README.md); for the full
project history, [`tools/visual-diff/HANDOFF.md`](../tools/visual-diff/HANDOFF.md).

---

## What was completed

A user-visible bug and a long-standing measurement defect, which turned out to
be the same thing.

**The bug.** Every launch of the app under the visual diff harness put a macOS
modal on screen:

> **Keychain Not Found** — A keychain cannot be found to store "staaash Key."

**The cause.** The harness passed a redirected `HOME` to the Electron process.
macOS resolves the login keychain through the home directory, so Chromium's
profile encryption — OSCrypt, initialised by *every* Electron app whether or not
it calls `safeStorage` — looked for `~/Library/Keychains` inside the fixture
directory, found nothing, and raised the dialog. The staaash app itself never
calls `safeStorage`; this was entirely harness-induced.

**The fix.** `HOME` is no longer passed. `app.env.HOME` in
`visual-diff.config.mjs` is now a naming convention only: `resolveAppEnv()`
resolves it to the `appData` path handed to the Electron shim, then strips it
from the launch environment. The shim's `app.getPath('appData')` patch was
always the actual redirect mechanism — `HOME` never moved the database, because
Electron derives `appData` from `NSHomeDirectory()`, which ignores `$HOME`.

**The bonus.** This also closed the calibration residual that had been open
since the harness was written. The dialog stole window focus at a
nondeterministic moment and persisted until dismissed, which accounts for every
symptom previously recorded and unexplained:

| Symptom | Explained by |
|---|---|
| Bistable (exactly 0 or one fixed pixel count), never noisy | Captured before vs after the dialog took focus |
| Immune to longer settle times | Both states are stable; waiting cannot resolve it |
| Identical within one process, divergent across processes | Dialog appears once and stays until dismissed |

`--calibrate` now passes **16/16 consecutive**, against ~4/5 before. At the old
failure rate that streak has probability ≈ 0.003.

---

## Steps taken

1. **Established the app was not at fault.** `grep -rn safeStorage desktop/src`
   → no hits. The keychain item name `<app name> Key` is Chromium's OSCrypt
   convention, and `app.setName('staaash')` supplies the name. So the keychain
   access is unconditional Electron behaviour, not app code.

2. **Worked out why `HOME` was being redirected at all.** It was to stop the
   one-time legacy migration finding `~/staaash/.cache/data.json` (which really
   does exist, 1.2 MB) and importing the real library into the fixture.

3. **Verified the redirect was unnecessary rather than assuming it.**
   - `migrate.js:23` returns early when `migrated_v1` is set, *before* it reads
     `process.env.HOME`.
   - `sqlite3 -readonly <fixture.db> "SELECT key FROM settings"` → `migrated_v1`
     present.
   - The seeder never calls `runMigrationIfNeeded`; it sets `migrated_v1`
     directly after `openDb()`.
   → The guard fires regardless of `HOME`.

4. **Made the change.** `delete env.HOME` in `resolveAppEnv()`; dropped
   `HOME: fixtureHome` from the seeder's `runElectron()`.

5. **Added `assertFixtureSafe()`** so the precondition is enforced, not trusted.
   It reads `migrated_v1` via the `sqlite3` CLI and refuses to launch a fixture
   without it — because a fixture missing that flag *would* import the real
   library. Fails open (skips) if `sqlite3` is unavailable.

6. **Verified isolation held after the change.** Fixture still used; 238 rows
   (235 active + 3 archived, exactly as seeded — a migration would have made it
   288+); real library mtime unchanged from before fixtures existed.

7. **Tested the reproducibility hypothesis.** 8 calibrations, then 8 more —
   16/16 clean. Two batches deliberately, because a 6/6 streak earlier in the
   project had regressed afterwards.

8. **Re-measured what the fix invalidated.** With noise now zero, re-ran the
   sub-pixel geometry sweep; the previously reported detection floors were
   artifacts of the noise.

9. **Corrected the docs and committed.** Three previously reported numbers were
   wrong and are now fixed in both `README.md` and `HANDOFF.md`.

---

## Numbers that changed

| | Was reported | Now | Why it moved |
|---|---|---|---|
| Everything delta | 2.10% | **2.24%** (102,112 px) | Both were real captures — the two focus states. 2.24% is the reproducible one. |
| Calibration | ~4/5 clean, 0.08% residual | **16/16 clean, 0.00%** | Dialog removed |
| Run-to-run noise floor | 0.079% whole / 0.117% gallery | **0.000%** | Dialog removed |
| Geometric detection floor | "~0.5px reliably; 1px unambiguous" | **0.1px → 124 px changed** | The old floor was the noise, not the harness |

Unchanged: the **27/255 colour cliff**. That comes from pixelmatch's per-pixel
YIQ threshold (`0.5053·Δ² > 35215·threshold²` → Δ > 26.4 at `threshold: 0.1`),
not from run-to-run variance, so it survives the fix. A flat colour can still
drift ~10% of the 0–255 range and score exactly 0.000%.

---

## Do not re-derive these

- **Never pass a redirected `HOME` to an Electron app on macOS.** It breaks the
  login-keychain lookup and pops a modal on every launch. If you need to
  redirect app data, patch `app.getPath('appData')` in a launcher shim instead.
- **A focus-stealing modal is a plausible cause for any bistable screenshot
  diff.** It presents as "two stable states" rather than noise, and is immune to
  longer waits — which is exactly what makes it look like a rendering problem.
- **Fractional column width is UNTESTED, not disproven.** The ten-calibrations-
  per-width sweep (14/20 integral vs 13/20 fractional) was confounded by the
  dialog — it measured focus-change variance, not column geometry, so it is not
  evidence either way. Re-run it against the now-clean baseline if it matters.

---

## Suggested next steps

1. **Confirm the dialog is actually gone on your screen.** 16 clean runs plus
   the mechanism is strong evidence, but only Mike can see the desktop. If it
   still appears — especially from the *real* staaash app rather than a harness
   run — that is a different problem and worth reporting.
2. **Use `--calibrate` as a CI gate.** It exits non-zero and names the offending
   elements. Any non-zero result is now a genuine regression, not noise.
3. **Decide on the colour blind spot.** Lower `defaults.threshold` if colour
   fidelity matters, accepting more text-antialiasing noise — 0.1 was chosen to
   suppress exactly that. Worth an explicit decision rather than a default.
4. **Map more screens.** Only `everything` is mapped. Each needs a Figma node id
   and a route recipe; `visual-diff.config.mjs` has a commented template.
5. **Resolve the two real app/design divergences** the harness surfaced (both
   still unfixed, both product calls): the collections list shows 6 + "More"
   where the design shows 5 + "More" (`Sidebar.jsx:24`), and the status pill
   reads 238 where the design reads 235 because `savedCount` counts archived
   (`App.jsx:158`).

---

## Anything missed / deliberately not done

- **No app code was changed.** `git status --porcelain desktop/` is empty. The
  two divergences above and the missing sort tiebreaker (`db.js:158`) are all
  still present in the app.
- **The +2px and +3px sensitivity figures were not re-measured** after the fix,
  so they still carry ~0.08% of noise. They are flagged with an asterisk in the
  README. The conclusion is unaffected — both are unambiguously detected.
- **`assertFixtureSafe()` fails open** when `sqlite3` is missing. That is a
  deliberate trade (do not block a run over a missing dev tool), but it means
  the guard is not absolute on a machine without it.
- **The `FIGMA_TOKEN` REST path remains unverified** — no token was available.
  The cached reference came from the Figma MCP server.
- **Fixture timestamps are still relative to seed time**, so `2 days ago` labels
  drift once the fixture ages past a boundary. `fixture_seeded_at` is recorded
  in the DB and could drive a staleness warning; none is implemented.
- **Not committed to any remote.** All work is local on `design-tweaks`.
