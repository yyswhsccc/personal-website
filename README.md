# yongshanOS ♡

**A hand-built Y2K desktop operating system that happens to be a portfolio.**
Live at **[yyswhsccc.github.io/personal-website](https://yyswhsccc.github.io/personal-website/)** — by [Yongshan Yu](http://www.linkedin.com/in/yongshan-yu-b9a713227), AI/LMS Systems & Full-Stack Lead.

No frameworks. No build step. No dependencies. `view-source` **is** the documentation.

```
OS:       YongshanOS v3 (Y2K pastel edition)
Host:     hand-written HTML/CSS/JS — 0 frameworks
Kernel:   window-manager 1.0 + 8-bit synth
Shell:    slime_sh
```

## What's inside

Roughly **46,000 lines of hand-written code** (30.8k JS · 12k CSS · 1.5k HTML), shipped as three files and a worker:

| Layer | What it does |
|---|---|
| **Window manager** | 16 windowed apps — drag, resize, minimize, maximize, z-order, taskbar, START menu. Written from scratch, mouse + touch. |
| **Theme engine** | Light / dark / auto — auto is driven by the clock (21:00–08:00 is night), because an OS should know what time it is. |
| **i18n** | Full EN / FR, 274 translated nodes, live re-translation — open windows and dialogs re-render in place when you switch language, no reload. |
| **Terminal** | A bash-like shell (`help`, `neofetch`, `ask <question>`…) that drives the whole OS — windows, themes, the pet, even the fan wall. Hides 138 cheat codes and a mini-CTF. |
| **SLIME BOY 2000** | Canvas runner game with 7 interchangeable world packs, boss events, and a global leaderboard. |
| **BONUS ARCADE** | 59 playable cartridges built on 24 reusable game-mechanic templates. |
| **The dream system** | After curfew the whole OS sleepwalks into one of 7 alternate skins (BSOD, matrix, amber phosphor, gameboy, win95, SCP, geocities) — every app, dialog and game re-themes; there's a 78-card tarot deck and a dream journal. |
| **Pikdex** | 72 collectible pikmin (50 in the ring, 22 hidden) with permanent collection + per-visit roster, synced across devices. |
| **Wrist edition** | [`watch.html`](watch.html) — a standalone smartwatch companion that pairs with the main OS through the cloud worker. |
| **Cloud backend** | A 700-line Cloudflare Worker on KV: global counters, leaderboard, a multilingual signature hall (grapheme-aware via `Intl.Segmenter`), photo wall, watch pairing. |
| **slime-ssh** | A real, hardened SSH server ([`slime-ssh/`](slime-ssh/)) that serves the pet over the actual SSH protocol. Docker, rate-limited, tunnel-disabled. |

## Engineering notes

- **Zero client dependencies.** Everything — the window manager, the synth, the sprite engine, the games, the i18n runtime — is in this repo, readable, unminified.
- **KV without the bill.** Hot paths never call `list()`: all reads go through maintained index blobs, so the backend runs comfortably inside Cloudflare's free tier with edge caching in front.
- **Abuse-resistant counters.** Global stats move through capped, chained bumps with server-side clamps and cache-backflow guards — a visitor can be enthusiastic, not destructive.
- **Failure-first client.** The desktop boots clean with the backend fully unreachable; every cloud feature degrades to a local fallback and queues for later.
- **Accessible under the glitter.** Skip-link, 121 ARIA labels, keyboard-operable windows and menus, and 40 `prefers-reduced-motion` rules that calm the entire decoration layer.
- **No analytics, no trackers, no cookies.** The only thing stored is `localStorage`, and it's mostly your slime's feelings.

## Full disclosure

The chat crowd, the recruiters in the fan wall, and most of the fans are fictional characters — this is a Y2K fansite fantasy, and it says so up front. The window manager, the games, the worker, the SSH server, and the 46k lines are not.

## Run it

```bash
# it's static — any file server works
python3 -m http.server 8000
# then open http://localhost:8000
```

Deploys as-is to GitHub Pages. The backend lives in [`wall-worker/`](wall-worker/) (`npx wrangler deploy`).

---

*Best experienced with sound on, curiosity high, and at least one baguette.* 🥖
