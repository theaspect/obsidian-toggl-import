# Phase 11: Release - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-16
**Phase:** 11-release
**Areas discussed:** Version for submission, README screenshots/media, Author/profile links, README installation depth

---

## Version for submission

| Option | Description | Selected |
|--------|-------------|----------|
| Submit as 1.1.0 | Bump manifest + versions.json before submitting; reflects real v1.1 features | ✓ |
| Submit as 1.0.0 | Submit with current manifest version; no bump step | |

**User's choice:** Submit as 1.1.0
**Notes:** Phases 07-10 added real features (SecretStorage, sort order, filename prefix, template format). Submitting as 1.1.0 is more accurate.

---

## README screenshots/media

| Option | Description | Selected |
|--------|-------------|----------|
| Skip media for now | Text-only README; screenshots can be added later | |
| Include a static screenshot | One screenshot showing plugin output in daily note | ✓ |
| Include a GIF demo | Animated GIF showing full command run | |

**User's choice:** Include a static screenshot

| Option | Description | Selected |
|--------|-------------|----------|
| assets/ folder in repo root | Standard convention; version-controlled | ✓ |
| Inline GitHub URL | Upload to GitHub issue/PR for CDN URL | |

**User's choice:** assets/ folder in repo root

---

## Author/profile links

**User provided directly:** `https://github.com/theaspect` for `authorUrl`

| Option | Description | Selected |
|--------|-------------|----------|
| Constantine | Matches Git user name | ✓ |
| You decide | Claude picks default | |

**User's choice:** Constantine for author name

---

## README installation depth

| Option | Description | Selected |
|--------|-------------|----------|
| Step-by-step with exact file paths | Full walkthrough with folder paths and file names | ✓ |
| Brief summary with link to Obsidian docs | One paragraph, assumes baseline familiarity | |

**User's choice:** Step-by-step with exact file paths

| Option | Description | Selected |
|--------|-------------|----------|
| Brief steps + link to BRAT plugin page | Install BRAT, add beta plugin, paste repo URL | ✓ |
| Full step-by-step with screenshots | Exhaustive walkthrough for new BRAT users | |

**User's choice:** Brief steps + link to BRAT plugin page

---

## Claude's Discretion

- Exact README wording and formatting
- MIT license template text
- Specific screenshot filename within assets/
