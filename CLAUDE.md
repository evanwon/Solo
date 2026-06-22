# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Upstream ships an `AGENTS.md` describing the canonical (pnpm-based) workflow. This file is the fork-specific companion and takes precedence for fork concerns.

## Project Overview

This is a personal fork of the [TryGhost/Solo](https://github.com/TryGhost/Solo) Ghost theme, used for evanw.com. The fork is maintained as a long-running branch with additive customizations while staying mergeable with upstream.

## Committing

Don't wait to be asked to commit. When the work reaches a logical checkpoint, point it out and recommend committing — but always ask for confirmation before actually running the commit.

## Commands

Upstream uses **pnpm** (pinned via `packageManager` in `package.json`). Activate it once with `corepack enable pnpm`.

```bash
pnpm install      # Install dependencies
pnpm dev          # Build and watch for changes (Gulp with livereload)
pnpm test         # Run gscan theme validator
pnpm zip          # Package theme to dist/solo.zip for upload
```

## Customization Strategy

**Keep customizations isolated to minimize merge conflicts with upstream:**

- **CSS**: All custom styles go in `assets/css/custom.css` (imported last in `screen.css` so they win the cascade)
- **JavaScript**: All custom scripts go in `assets/js/custom.js` (conditionally included by `gulpfile.js` if file exists)

Current customizations:
- Anchor links for headings with copy-to-clipboard functionality (CSS + JS)
- Reduced paragraph/heading spacing (`custom.css`)
- Show all tags in post metadata instead of just `primary_tag` (`post.hbs`)

## Merging upstream

The fork tracks `upstream` (TryGhost/Solo). Customizations bleed into a few upstream-tracked files (`post.hbs`, `screen.css`, `gulpfile.js`); after merging, rebuild with `pnpm build` and commit the regenerated `assets/built/`.

`assets/built/*` is kept committed (aligned with upstream, whose download-zip distribution model requires it). To avoid hand-resolving conflicts in those minified files on every upstream merge, `.gitattributes` marks them `merge=ours` — git keeps our version on conflict and you regenerate them with `pnpm build` afterward. This needs a **one-time** local config:

```bash
git config merge.ours.driver true
```

## Deployment

Deployment is automated via GitHub Actions — the AWS host is no longer part of the deploy path (do **not** `git pull` into the live theme folder; that caused recurring `ghost doctor` permission/ownership errors from the in-folder `.git/` and login-user file ownership).

Workflow: merge upstream locally → `pnpm build` → commit → merge/push to `main`. `.github/workflows/deploy.yml` then runs `gscan`, builds, and uploads + activates the theme via the Ghost **Admin API** (`TryGhost/action-deploy-theme`), which extracts it as the `ghost` user so permissions are always correct. The theme is deployed under the name `solo-evanw` (the live theme), overriding the `package.json` name `solo`.

Requires two GitHub repo secrets: `GHOST_ADMIN_API_URL` (base site URL) and `GHOST_ADMIN_API_KEY` (from the Ghost custom integration). Trigger a manual deploy from the Actions tab via `workflow_dispatch`.

## Architecture

### Template System (Handlebars)
- `default.hbs` - Master layout (header, nav, footer)
- Page templates extend default: `index.hbs`, `post.hbs`, `page.hbs`, `author.hbs`, `tag.hbs`
- `partials/` - Reusable components (`loop.hbs` for post cards, `icons/` for SVGs)

### Build Pipeline (Gulp)
- CSS: `assets/css/screen.css` → PostCSS (easyimport, autoprefixer, cssnano) → `assets/built/screen.css`
- JS: Ghost shared assets → local libs → `main.js` → `custom.js` → concatenate/uglify → `assets/built/main.min.js`
- Locales: `locales-local/` overrides merged into `locales/` via `@tryghost/theme-translations`

### Theme Customization Options (package.json config)
Body classes drive layout variations:
- `navigation_layout`: Logo position (left/middle/stacked)
- `typography`: Font family (sans-serif/serif/mono)
- `header_section_layout`: Homepage hero style
- `post_feed_layout`: Post card style (Classic/Typographic/Parallax)
