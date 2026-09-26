# AGENTS.md — Desktop Buddy Kimi

Conventions for any agent (human or AI) working in this repo. Keep it pragmatic.

## What this is

A cross-platform, Windows-first desktop pet overlay. Pixel-art buddies rendered in a
frameless transparent always-on-top window. Hot-swappable pets, small animations,
roaming behavior, treats, settings + command palette.

## Stack

- **Electron + TypeScript (strict)**. No UI framework — vanilla DOM + canvas.
- **Build**: `tsc` for main/preload, `esbuild` for renderer bundles. No other bundler.
- **Sprites are code**: pets are string pixel-maps + palette + frame lists in `src/pets/`.
  No binary image assets — adding a pet = adding one `.ts` file.
- **Dependencies**: dev-only (`electron`, `typescript`, `esbuild`, `@types/node`).
  Zero runtime deps. Justify any new one in the PR description.

## Harness conventions (Hermes ↔ OpenCode)

- **Hermes orchestrates**: plans waves, owns all git operations (branches, commits, PRs via `gh`), verifies builds/tests itself.
- **OpenCode CLI implements**: bounded one-shot tasks via `opencode run`, model pinned in `opencode.json`, executed with `--variant max` (ultracode effort).
- **Subagents** live in `.opencode/agent/`:
  - `pixel-wrangler` — authors/reviews pet sprites + animations
  - `pragmatic-reviewer` — reviews diffs against these conventions
- **Branches**: `feat/*`, `fix/*` off `main`. PRs squash-merged.
- **Commits**: Conventional Commits (`feat:`, `fix:`, `chore:` …), imperative, ≤72 chars.
- Never commit `node_modules/`, `dist/`, `smoke/*.png`, or secrets.

## Quality gates (must pass before every commit)

```bash
npm run typecheck   # tsc --noEmit, strict
npm run build       # full compile
npm test            # node --test (native TS type-stripping, erasable syntax only)
```

## Code style

- Readable > clever. Small modules, single responsibility, explicit types at boundaries.
- The simplest thing that works well. No speculative abstraction, no overengineering.
- TS is **erasable-syntax-only** (no enums, no namespaces, no parameter properties) so
  Node's native type stripping can run tests directly. Use `const` objects + unions.
- Comments only where intent isn't obvious. No doc-noise.

## Adding a pet

One file in `src/pets/`, registered in `src/pets/index.ts`. Needs: pixel maps per
animation frame, palette, meta (name, personality blurb). Ask the `pixel-wrangler`
subagent. Keep silhouettes distinct and readable at 1×.

## Windows-first notes

- Pet window: `transparent`, `frameless`, `alwaysOnTop`, `skipTaskbar`; click-through
  via `setIgnoreMouseEvents` toggle.
- Idle detection: `powerMonitor.getSystemIdleTime()`.
- Launch on login: `app.setLoginItemSettings`.
- Behaviors must degrade gracefully on macOS/Linux (no crashing on platform APIs).
