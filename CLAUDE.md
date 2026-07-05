# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"ぴょこっとタッチ" (Pyokotto Touch) — a whack-a-mole-style reaction/judgment game for children aged 4–6, in Japanese. It is a zero-dependency static PWA: no build system, no package manager, no framework, no tests. The entire game (CSS, markup, and JavaScript) lives in `index.html`.

## Development commands

There is no build or test step. To run locally, serve the directory over HTTP (the service worker requires it; opening the file directly won't register it):

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Deployment is automatic: pushes to `main` trigger `.github/workflows/deploy-pages.yml`, which publishes the repository root to GitHub Pages.

## Architecture

- **`index.html`** — everything: styles, the four screens, the parental-gate overlay, and one IIFE containing all game logic.
- **`sw.js`** — service worker with a stale-while-revalidate cache. **When changing cached assets or when a change must reach installed clients promptly, bump `CACHE_NAME`** (e.g. `pyoko-v2` → `pyoko-v3`); old caches are deleted on activate.
- **`manifest.webmanifest`** / **`icons/`** — PWA install metadata.

### Game logic structure (inside the IIFE in index.html)

- **Screens**: four `<section class="screen">` elements (`start`, `game`, `result`, `oyasumi`), toggled by `show(name)`; only one has `.active` at a time. The parental gate is a separate fixed overlay (`#gate`), not a screen.
- **`LEVELS`**: the single tuning table for the three difficulty levels (character sets, spawn timing, visible duration, concurrent max, bad-character ratio, round duration, medal thresholds). Difficulty changes go here.
- **Round flow**: `tryStart` (checks daily tickets) → `startRound` → 3-2-1 countdown (`runCountdown`) → `spawn` loop on jittered `setTimeout` + `tickTime` on `requestAnimationFrame` for the time bar → `endRound` computes the medal and shows results.
- **Deck system**: `buildDeck` pre-shuffles the good/bad sequence for a whole round so score ceilings aren't luck-dependent — don't replace it with pure per-spawn randomness.
- **Persistence**: `localStorage` only. Keys: `pyoko-bests` (high scores per level) and `pyoko-tickets` (daily play-count limit; `date` field resets `used` when the day changes).
- **Ticket / parental gate**: plays per day are limited by 🎈 tickets (1–5, default 3). Settings sit behind a multiplication-quiz gate (`6–9 × 6–9`); a wrong answer shakes the card and regenerates the question.
- **Sound**: synthesized with WebAudio oscillators (`tone()`), no audio assets. `ensureAudio()` must be called from a user gesture before playing.

## Conventions

- UI text, code comments, and commit messages are in Japanese; keep that style.
- Target audience can't read: communicate through emoji, color, and sound rather than text wherever possible.
- No external dependencies — everything must work offline once cached.
- Layout targets phones portrait-first (`max-width: 430px`), with media queries for tablets (`min-width: 600px`), landscape two-column (`orientation: landscape and min-width: 640px`), and short landscape phones (`max-height: 500px`). New UI needs to be checked against all four.
- Animations have `prefers-reduced-motion: reduce` fallbacks; keep new animations consistent with that.
