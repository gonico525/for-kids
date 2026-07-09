# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"こどもひろば" (Kodomo Hiroba) — a collection of games and learning apps for children aged 4–6, in Japanese. It is a zero-dependency static PWA: no build system, no package manager, no framework. Each app is a single self-contained HTML file (CSS, markup, and JavaScript in one file); shared logic lives in `shared/`.

## Development commands

There is no build step. To run locally, serve the directory over HTTP (the service worker requires it):

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Checks (run before pushing):

```bash
python3 tools/check_sw.py   # sw.js の ASSETS と実体の整合性
node tools/smoke.mjs        # 全ページを開いて JS エラーがないか(要ローカルサーバー)
```

Deployment is automatic: pushes to `main` trigger `.github/workflows/deploy-pages.yml` (runs `check_sw.py`, then publishes to GitHub Pages).

## Architecture

- **`index.html`** — the hub: category sections (🎈 あそび / ✏️ べんきょう) with app tiles, plus the parental-gate overlay (multiplication quiz, `6–9 × 6–9`) where the daily ticket limit is configured.
- **`games/*/index.html`** — play apps ("あそび"), limited by the shared daily 🎈 tickets: each round must be gated on `KidsTickets.useOne()`. Currently: `pyoko` (ぴょこっとタッチ, whack-a-mole), `daruma` (だるまさんがころんだ, freeze-dance), `pitatto` (ぴたっとストップ, timing).
- **`study/*/index.html`** — learning apps ("べんきょう"), **unlimited** — they never consume tickets. Currently: `numakasten` (ヌマーカステン, counting frame), `tsuginani` (つぎはな〜に？, patterns), `yajirushi` (やじるしめいろ, arrow-programming maze). Level-based study apps persist the level and auto-level-up after a 5-⭐ streak via `shared/progress.js`.
- **`shared/`** — common modules exposed as globals: `tickets.js` (`KidsTickets`), `sound.js` (`KidsSound`, WebAudio-synthesized), `app-boot.js` (`KidsApp.init()`: SW registration + 🔊/🔇 button wiring), `progress.js` (`KidsProgress`). **API reference: `docs/reference/shared-modules.md`.**
- **`sw.js`** — service worker, stale-while-revalidate cache. **When cached assets change, update `ASSETS` and bump `CACHE_NAME`**; `tools/check_sw.py` verifies the list (CI runs it before deploy).
- **`templates/app.html`** + **`tools/new_app.py`** — scaffold for new apps (see below).
- **`manifest.webmanifest`** / **`icons/`** — PWA install metadata; `start_url` is the hub.

### Adding a new app

Use the `new-app` skill (`.claude/skills/new-app/SKILL.md`). In short: `python3 tools/new_app.py --type games|study --id <name> --name <アプリ名> --emoji <絵文字> --desc <説明> --color "#RRGGBB"` generates the app from `templates/app.html` and registers it in the hub and `sw.js` in one shot; then implement the app at the `TODO` markers.

### Pyoko game logic (games/pyoko/index.html)

- **Screens**: four `<section class="screen">` elements (`start`, `game`, `result`, `oyasumi`), toggled by `show(name)`; only one has `.active` at a time.
- **`LEVELS`**: the single tuning table for the three difficulty levels (character sets, spawn timing, visible duration, concurrent max, bad-character ratio, round duration, medal thresholds). Difficulty changes go here.
- **Round flow**: `tryStart` (consumes a shared ticket) → `startRound` → 3-2-1 countdown (`runCountdown`) → `spawn` loop on jittered `setTimeout` + `tickTime` on `requestAnimationFrame` for the time bar → `endRound` computes the medal and shows results.
- **Deck system**: `buildDeck` pre-shuffles the good/bad sequence for a whole round so score ceilings aren't luck-dependent — don't replace it with pure per-spawn randomness.

## Conventions

- UI text, code comments, and commit messages are in Japanese; keep that style.
- Target audience can't read: communicate through emoji, color, and sound rather than text wherever possible.
- Prefer old-generation emoji (Unicode 6 era). Newer emoji (Unicode 9+) render as tofu (×) on devices with old emoji fonts (e.g. Fire HD 10); if one is needed, declare a fallback via `KidsEmoji.fix()` (`shared/emoji.js`, see `docs/reference/shared-modules.md`).
- No external dependencies (no CDN fonts/scripts) — everything must work offline once cached.
- `localStorage` keys follow `kids-*` (shared) / `<app-id>-<用途>` (per app); **register every new key in `docs/reference/storage-keys.md`.**
- Sound is synthesized via `KidsSound.tone()` (no audio assets); the AudioContext must be created/resumed from a user gesture.
- Layout targets phones portrait-first (`max-width: 430px`), with media queries for tablets (`min-width: 600px`), landscape two-column (`orientation: landscape and min-width: 640px`), and short landscape phones (`max-height: 500px`). New UI needs to be checked against all four.
- Animations have `prefers-reduced-motion: reduce` fallbacks; keep new animations consistent with that.

## Reference docs

- `docs/concept.md` — product concept & design principles (the WHY behind these conventions); consult before adding or changing features.
- `docs/reference/shared-modules.md` — API of every `shared/` module.
- `docs/reference/storage-keys.md` — localStorage key registry (update when adding keys).
- `docs/refactoring-plan.md` — the refactoring plan behind this structure.
- `.claude/skills/new-app/SKILL.md` — full checklist for adding an app.
