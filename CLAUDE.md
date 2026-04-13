<!-- GSD:project-start source:PROJECT.md -->
## Project

**Obsidian Toggl Import Plugin**

An Obsidian plugin that imports Toggl Track time entries into daily notes with a single command. The active note's filename (yyyy-mm-dd) determines the date, entries are fetched from Toggl's API, and the formatted output is inserted at the cursor. Format is fully configurable — markdown table or delimited plain text, both with the same selectable columns.

**Core Value:** One command pulls the day's Toggl entries into your daily note, formatted exactly how you want them — no manual copying.

### Constraints

- **Tech Stack**: TypeScript + Obsidian Plugin API — standard for all Obsidian plugins
- **Auth**: Toggl API token via HTTP Basic Auth — no OAuth required
- **Scope**: Single workspace (default), no multi-user support
- **Compatibility**: Must work on Obsidian desktop (Windows, Mac, Linux); mobile is out of scope
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Technologies
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| TypeScript | ~5.3 | Plugin language | Required by Obsidian plugin ecosystem; the official sample plugin and all docs assume TypeScript. Strict mode catches API misuse early. [MEDIUM confidence — verify current 5.x minor on npm] |
| obsidian (npm type package) | ~1.5.x | Obsidian API types + base classes | The `obsidian` npm package provides Plugin, PluginSettingTab, Editor, TFile, Notice, and all other API surfaces. It is the only supported way to build against the Obsidian API. [HIGH confidence] |
| esbuild | ~0.20.x | Bundler | The official `obsidian-sample-plugin` ships an `esbuild.config.mjs` using esbuild. It produces a single `main.js` CJS bundle that Obsidian loads. esbuild is ~10–100x faster than webpack/rollup for this use case. [HIGH confidence] |
| Node.js | >=18.x | Build runtime | Required by esbuild and the npm ecosystem; 18 is LTS and widely available. [HIGH confidence] |
### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| builtin `fetch` (Node 18+) | native | HTTP requests to Toggl API | Node 18+ ships native fetch matching the browser API. Use this rather than adding axios or node-fetch — zero dependencies, no bundle bloat, and Obsidian's desktop renderer (Electron) also has native fetch. [HIGH confidence] |
| `@types/node` | ~18.x | Node type stubs for build scripts | Only needed for the esbuild config file (a Node script). Do NOT include Node types in the main plugin tsconfig — that would leak Node globals into plugin code that runs in Electron. [MEDIUM confidence] |
### Development Tools
| Tool | Purpose | Notes |
|------|---------|-------|
| esbuild (build script) | Bundle TypeScript → `main.js` | Use the pattern from `obsidian-sample-plugin`: `esbuild.config.mjs` with a `--watch` flag for dev and a production build that sets `minify: true, sourcemap: false`. Output goes to the vault's `.obsidian/plugins/<id>/` during development. |
| npm scripts | Build orchestration | `"dev": "node esbuild.config.mjs"` and `"build": "tsc --noEmit && node esbuild.config.mjs production"`. The `tsc --noEmit` gate before the production bundle catches type errors without emitting redundant JS. |
| TypeScript compiler (tsc) | Type checking only | `"noEmit": true` in tsconfig. esbuild handles the actual transpile; tsc is only used as a type checker in CI/pre-commit. |
| Hot-reload (obsidian-plugin-reload or manual) | Dev loop | The community `Hot-Reload` plugin (by pjeby) watches for `main.js` changes and reloads the plugin in place. This is the standard dev workflow and avoids manual Obsidian restarts. |
## Manifest Requirements
### manifest.json (required fields)
- `id` must be unique across the community plugin registry (kebab-case).
- `minAppVersion` gates compatibility. Use `"1.0.0"` unless you need a later API feature.
- `isDesktopOnly: true` is correct here — mobile is out of scope and network API calls from Obsidian Mobile have additional restrictions.
- Version must follow semver exactly.
### versions.json (required for submission)
## TypeScript Configuration
- `"module": "ESNext"` + `"moduleResolution": "bundler"` — works with esbuild's bundler resolution without needing explicit `.js` extensions.
- `"lib": ["ES2018", "DOM"]` — DOM gives you `fetch`, `Headers`, `btoa` (needed for Basic Auth encoding). Do NOT add `"node"` to `lib`.
- `"target": "ES2018"` — safe baseline for Electron (Obsidian's runtime). Async/await works natively; no down-level transform needed.
- `"strictNullChecks": true` catches the common mistake of reading `app.workspace.getActiveFile()` without null-checking (it returns `null` when no file is open).
## Toggl Track API v9
### Authentication
- Method: HTTP Basic Auth
- Username: `<api_token>` (the user's Toggl API token from their profile)
- Password: literal string `"api_token"`
- Header: `Authorization: Basic <base64(token:api_token)>`
- `btoa()` is available in both Electron (desktop Obsidian) and browser environments — no external library needed.
### Base URL
### Key Endpoints
| Endpoint | Method | Purpose | Notes |
|----------|--------|---------|-------|
| `/me` | GET | Get current user info (including `default_workspace_id`) | Use this at plugin load or first import to cache the workspace ID. |
| `/me/time_entries` | GET | Fetch time entries | Query params: `start_date` and `end_date` in RFC 3339 format (e.g., `2024-01-15T00:00:00+00:00`). Returns array of time entry objects. |
| `/workspaces/{workspace_id}/time_entries` | GET | Workspace-scoped time entries | Alternative to `/me/time_entries`; same shape, scoped to workspace. |
### Time Entry Response Shape (partial)
### Fetching Entries for a Date
- `start_date`: `{date}T00:00:00+00:00`
- `end_date`: `{date}T23:59:59+00:00`
## Project File Structure
## Installation
# Core (Obsidian types + esbuild)
# No runtime dependencies needed — native fetch + btoa cover all API needs
## Alternatives Considered
| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| native `fetch` | axios | Only if targeting environments without native fetch (Node <18, very old Electron). Not applicable here. |
| native `fetch` | `node-fetch` | Same — Node 18+ makes this redundant. Adds bundle weight with no benefit. |
| esbuild | rollup | Some older Obsidian plugin tutorials use rollup. esbuild is strictly faster and the current official sample uses it. Rollup only makes sense if you need complex plugin transformations not supported by esbuild. |
| esbuild | webpack | webpack is significantly more complex for this use case. No benefit for a single-output Obsidian plugin. |
| TypeScript strict mode | loose tsconfig | Loose config hides null dereference bugs at the Obsidian API boundary (e.g., no active file, no active editor). Strict mode is worth the upfront annotation cost. |
## What NOT to Use
| Avoid | Why | Use Instead |
|-------|-----|-------------|
| React / Svelte / Vue | Obsidian's settings UI and notices are built with the Obsidian API's native DOM helpers (`new Setting(containerEl)`, `this.addCommand()`). Adding a UI framework adds bundle size and fights the Obsidian API's own lifecycle management. | Obsidian API's `Setting`, `Modal`, and direct DOM manipulation via `createEl` |
| OAuth2 flow for Toggl | Toggl API supports API token Basic Auth natively; OAuth2 requires redirect URIs which are complex in a desktop plugin context (custom URI scheme handling). Project explicitly scoped to API token. | HTTP Basic Auth with `btoa()` |
| axios / got / node-fetch | External HTTP clients add bundle weight. Native fetch is available in both Node 18+ (build) and Electron (runtime). | `globalThis.fetch` / native `fetch` |
| `moment.js` | Heavy (67KB min+gz), deprecated in favor of Luxon/day.js. Obsidian itself ships moment internally, but accessing it via `(window as any).moment` is fragile. | `new Date()` + `toLocaleTimeString()` — sufficient for this plugin's UTC→local display need |
| `luxon` or `day.js` | Unnecessary for the date manipulation needed here (parse a yyyy-mm-dd string, format start/stop times to local). Avoid adding dependencies that don't earn their weight. | Native `Date` + `Intl.DateTimeFormat` |
| Jest (for basic unit tests) | vitest is the modern standard and runs natively with ESM modules. If tests are added later, prefer vitest. Jest requires CJS transform config to work with ESM-first TypeScript. | vitest (if/when tests are added) |
## Version Compatibility
| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `obsidian@1.5.x` | TypeScript 5.x | The obsidian package ships its own types; no `@types/obsidian` needed. |
| `esbuild@0.20.x` | Node 18+ | esbuild requires Node 12.17+ minimum; 18 LTS is safe. |
| TypeScript 5.3 | `moduleResolution: "bundler"` | `"bundler"` mode was introduced in TS 5.0. Do not use with TS 4.x. |
| Toggl API v9 | — | v9 has been stable since ~2021. No deprecation notice as of Aug 2025. The `/me/time_entries` endpoint and Basic Auth are the stable recommended approach per Toggl engineering docs. |
## Sources
- Training data (Obsidian Plugin API, `obsidian-sample-plugin` repo patterns) — HIGH confidence for API structure, MEDIUM confidence for exact versions
- Training data (Toggl Track API v9 engineering docs, `engineering.toggl.com/docs`) — HIGH confidence for auth method and endpoint shape; MEDIUM confidence for exact endpoint paths
- Obsidian developer docs (`docs.obsidian.md`) — not verified in this session (WebFetch blocked), but content reflects stable docs as of Aug 2025
- `@types/node` separation guidance — standard TypeScript practice, HIGH confidence
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
