# AGENTS.md

## Scope
This file applies to the whole repository.

## Last updated
- Timestamp (UTC): 2026-03-01T00:21:40Z

## Project snapshot (current)
- Repo type: GitHub Pages front-end dashboard for `NTUT-NPC/tattoo` pull request monitoring.
- Stack: Vue 3 + Vite + TypeScript.
- Runtime model: **pure front-end only** (no server, no edge runtime).
- UI style direction: dense dashboard cards + fullscreen status presentation + lightweight controls.

## Architecture conventions
- Use Composition API with `<script setup lang="ts">` for Vue SFC updates.
- Keep UI components in `src/components` and page orchestration/state in `src/views`.
- Keep GitHub API/data mapping logic in `src/services`.
- Keep parser/helper utilities in `src/utils`.
- Keep global visual theme and shared motion styles in `src/styles.css` or component-scoped CSS where appropriate.

## Feature map (as-implemented)
- `src/views/DashboardView.vue`
  - PR polling loop, refresh countdown ring, token/settings modal, fullscreen detail card control.
  - Local storage settings keys include refresh interval, activity display mode, date display mode, and status animation close delay.
- `src/components/PrCard.vue`
  - Compact card + expanded detail representation.
  - Activity display mode support (`separate` / `latest`), smart/full date mode, review + CI status presentation.
  - Includes fullscreen animation/confetti-related behavior.
- `src/components/CiStatusBadges.vue`
  - Workflow status badge rendering.
- `src/services/githubApi.ts`
  - Pulls GitHub data from pulls/commits/comments/reviews/check-runs.
  - Filters/normalizes CI states and review status.
  - Token storage key: `github_api_token`.
- `src/utils/parsers.ts`
  - Build number parsing + linked issue parsing + truncate helper.

## GitHub Pages / Vite base path requirements
Must preserve compatibility for both:
- default Pages URL: `/<repo>/`
- custom domain root: `/` via `VITE_BASE_PATH=/`

`vite.config.ts` currently normalizes `base` and auto-derives repo name from `GITHUB_REPOSITORY` fallback logic. Do not regress this behavior.

## Workflow consistency requirements
- Workflow file: `.github/workflows/deploy-pages.yml`
- Expected npm scripts in `package.json`:
  - `dev`
  - `build`
  - `preview`
- Build path must remain `dist` for pages artifact upload.

## Validation checklist before commit
1. Run `npm run build` and ensure success.
2. Verify `.github/workflows/deploy-pages.yml` remains consistent with npm scripts and build output path.
3. If UI/visual behavior changes, capture a screenshot artifact via browser tool when available.

## Documentation expectations
When README/AGENTS are updated again:
- Reflect current merged-PR-era functionality (fullscreen card behavior, settings modal, animation and display modes).
- Keep README explicit that this is a **vibe coding project**.
- Keep a complete GitHub token application tutorial in README (including fine-grained + classic fallback + validation steps).
- Keep this file’s `Last updated` timestamp refreshed.

## Merged PR history awareness
The repository has accumulated many merged PRs (notably #3 ~ #46 with missing numbers). Major themes:
- initial dashboard scaffolding and API integration,
- token + refresh/settings controls,
- CI/review status refinements,
- fullscreen/animation UX iterations,
- responsive/meta/header/card polish.

When making changes, check existing behavior first before introducing new patterns.
