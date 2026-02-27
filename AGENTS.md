# AGENTS.md

## Scope
This file applies to the whole repository.

## Project conventions
- Use Vue 3 + Vite, prefer Composition API with `<script setup lang="ts">`.
- Keep UI componentized under `src/components` and page logic under `src/views`.
- Keep GitHub API/data mapping logic in `src/services`.
- Keep parser/helper utilities in `src/utils`.
- Prefer concise card UI for dense dashboard information.

## GitHub Pages
- Must keep this as a pure front-end build (no server runtime).
- Ensure `vite.config.ts` base path works for both:
  - default Pages URL (`/<repo>/`)
  - custom domain root (`/`) via `VITE_BASE_PATH=/`.

## Validation checklist before commit
- `npm run build` must pass.
- Verify workflow file `.github/workflows/deploy-pages.yml` is consistent with npm scripts.
- If visual UI changed, take a screenshot artifact when browser tool is available.
