---
quick_id: 260418-f2a
status: complete
date: 2026-04-18
---

# Quick Task 260418-f2a: Install eslint-plugin-obsidianmd and run checks

## What was done

Installed `eslint-plugin-obsidianmd` (official Obsidian plugin linting) and updated `eslint.config.mjs` to use it. Downgraded ESLint from v10 to v9 (required by plugin) and installed peer deps. Ran checks and fixed all violations.

## Changes

**Dependencies (package.json):**
- ESLint downgraded from `^10.2.0` → `^9.0.0` (plugin requires `>=9 <10`)
- Added: `eslint-plugin-obsidianmd`, `@eslint/js`, `@eslint/json`, `typescript-eslint`, `eslint-plugin-no-unsanitized`
- Removed: `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser` (replaced by unified `typescript-eslint`)

**eslint.config.mjs:** Rewrote to use `tseslint.config()` with:
- `obsidianmd.configs.recommended` at top level (handles own file patterns)
- `src/**/*.ts`: type-aware linting with `parserOptions.project`
- `tests/**/*.ts`: type-checking disabled (`disableTypeChecked`)
- "Toggl" as a brand name in `ui/sentence-case` rule (preserves correct capitalization)
- "Obsidian" and "Sync" as brands (for "Obsidian Sync" product name)
- Desktop-only rules disabled: `prefer-active-doc`, `prefer-active-window-timers`, `prefer-instanceof`

**src/main.ts:**
- Fixed `no-unsafe-assignment`: typed `loadData()` result as `Record<string, unknown>`
- Fixed sentence case: "Settings → Toggl Import" → "settings → Toggl import"
- Fixed sentence case: "Daily Note" → "daily note"

**src/settings.ts:**
- Fixed `no-misused-promises`: `if (testBtn)` → `testBtn?.setDisabled(...)`
- Fixed sentence case: `HH:MM` → `hh:mm` in two places
- Fixed sentence case: `e.g.` → `E.g.` in placeholder text

## Result

ESLint runs cleanly with zero errors and zero warnings.
