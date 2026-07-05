# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"こどもひろば" (Kodomo Hiroba) — a collection of games and learning apps for children aged 4–6, in Japanese. It is a zero-dependency static PWA: no build system, no package manager, no framework, no tests. Each app is a single self-contained HTML file (CSS, markup, and JavaScript in one file); shared logic lives in `shared/`.

## Development commands

There is no build or test step. To run locally, serve the directory over HTTP (the service worker requires it; opening the file directly won't register it):

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Deployment is automatic: pushes to `main` trigger `.github/workflows/deploy-pages.yml`, which publishes the repository root to GitHub Pages.

## Architecture

- **`index.html`** — the hub: category sections (🎈 あそび / ✏️ べんきょう) with app tiles, plus the parental-gate overlay where the daily ticket limit is configured.
- **`games/*/index.html`** — play apps ("あそび"), limited by the shared daily 🎈 tickets. Currently: `games/pyoko/` (ぴょこっとタッチ, a whack-a-mole reaction/judgment game).
- **`study/*/index.html`** — learning apps ("べんきょう"), **unlimited** — they never consume tickets. Currently: `study/numakasten/` (ヌマーカステン, a two-chamber counting-frame for number sense: free play + quiz mode with 4 levels).
- **`shared/tickets.js`** — the shared 🎈 ticket store (`window.KidsTickets`): daily play-count limit pooled across ALL games (1–5 per day, default 3). Reads/writes `localStorage` on every call so state stays consistent across pages; migrates the legacy `pyoko-tickets` key on first read. Game pages call `useOne()` to consume; the hub's parental gate calls `setLimit()`/`resetToday()`.
- **`shared/sound.js`** — the shared sound utility (`window.KidsSound`): WebAudio-synthesized `tone(freq, dur, vol, type, when)` plus a mute setting persisted in `localStorage` (`kids-sound`) and shared across all apps. `tone()`/`ensure()` also resume a suspended AudioContext, so they must be triggered from a user gesture. Apps with sound show a 🔊/🔇 button that calls `setEnabled()` and re-render it on `pageshow`.
- **`sw.js`** — service worker with a stale-while-revalidate cache, registered at root scope from every page (`../../sw.js` from app pages). **When adding an app or changing cached assets, add the paths to `ASSETS` (both `dir/` and `dir/index.html`) and bump `CACHE_NAME`** (e.g. `kids-v3` → `kids-v4`); old caches are deleted on activate.
- **`manifest.webmanifest`** / **`icons/`** — PWA install metadata; `start_url` is the hub.

### Adding a new app

1. Create `games/<name>/index.html` (ticket-limited) or `study/<name>/index.html` (unlimited) as a self-contained file; relative paths to root assets are `../../`.
2. Add a tile to the matching category section in the hub `index.html`, and a 🏠/⬅️ link in the app back to `../../`.
3. A game (not study) must gate each round on `KidsTickets.useOne()` (load `../../shared/tickets.js`) and show an おやすみ/end state when it returns `false`.
4. Register the service worker (`../../sw.js`), add both URL forms to `ASSETS` in `sw.js`, bump `CACHE_NAME`.

### Pyoko game logic (games/pyoko/index.html)

- **Screens**: four `<section class="screen">` elements (`start`, `game`, `result`, `oyasumi`), toggled by `show(name)`; only one has `.active` at a time.
- **`LEVELS`**: the single tuning table for the three difficulty levels (character sets, spawn timing, visible duration, concurrent max, bad-character ratio, round duration, medal thresholds). Difficulty changes go here.
- **Round flow**: `tryStart` (consumes a shared ticket) → `startRound` → 3-2-1 countdown (`runCountdown`) → `spawn` loop on jittered `setTimeout` + `tickTime` on `requestAnimationFrame` for the time bar → `endRound` computes the medal and shows results.
- **Deck system**: `buildDeck` pre-shuffles the good/bad sequence for a whole round so score ceilings aren't luck-dependent — don't replace it with pure per-spawn randomness.
- **Persistence**: `localStorage` only. Keys: `pyoko-bests` (high scores per level) and `kids-tickets` (via `shared/tickets.js`).

### Shared patterns

- **Parental gate** (hub only): settings sit behind a multiplication-quiz gate (`6–9 × 6–9`); a wrong answer shakes the card and regenerates the question.
- **Sound**: use `shared/sound.js` (`KidsSound.tone()`), no audio assets. The AudioContext is created/resumed inside `tone()`/`ensure()`, which must be reached from a user gesture.

## Conventions

- UI text, code comments, and commit messages are in Japanese; keep that style.
- Target audience can't read: communicate through emoji, color, and sound rather than text wherever possible.
- No external dependencies (no CDN fonts/scripts) — everything must work offline once cached.
- Layout targets phones portrait-first (`max-width: 430px`), with media queries for tablets (`min-width: 600px`), landscape two-column (`orientation: landscape and min-width: 640px`), and short landscape phones (`max-height: 500px`). New UI needs to be checked against all four.
- Animations have `prefers-reduced-motion: reduce` fallbacks; keep new animations consistent with that.
