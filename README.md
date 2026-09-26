# 🐾 Desktop Buddy Kimi

A tiny desktop pet overlay app — pixel-art buddies that live on your screen.
Windows-first, cross-platform (Electron + TypeScript).

## The roster

| Pet | Species | Vibe |
|-----|---------|------|
| **Biscuit** | Corgi | Loafs. Waddles. Loves treats. |
| **Mochi** | Slime | Squishy mint blob. Maximum bounce. |
| **Nova** | Dragon | Smol purple dragon. Wing flaps, tail swishes. |
| **Pixel** | Tuxedo cat | Judgmental blinks. Chaotic zoomies. |

## Features

- 🪟 Frameless, transparent, always-on-top overlay window (click-through optional)
- 🔀 Hot-swap pets from the tray or command palette
- 🚶 Roam modes: stay put · always wander · wander only when you're idle (returns home when you're back)
- 🍬 Click your buddy or give it a treat — it animates
- 🔎 Command palette (`Ctrl+K`) fuzzy-searches every setting and action
- 📏 Resize from smol (1×) to chonky (4×)
- ⚙️ Settings window: dark, crisp, modern

## Quickstart

```bash
npm install
npm start          # run the app
npm run typecheck  # strict TS check
npm test           # unit tests
```

## Repo conventions

See [AGENTS.md](AGENTS.md) — Hermes orchestrates, OpenCode implements, `gh` manages branches/PRs.
