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

- **CSS**: All custom styles go in `assets/css/custom.css`. Note: `screen.css` `@import`s it near the **top** (3rd line, before the theme's own rules), so custom rules are inlined *before* upstream rules in the built stylesheet — they do **not** automatically win the cascade. On a specificity tie, the later (upstream) rule wins. Give custom overrides higher specificity (e.g. a compound selector like `.gh-about-secondary.gh-about-subscribe-pitch`) rather than relying on source order. Verify with `pnpm verify:css` (see Verifying CSS below).
- **JavaScript**: All custom scripts go in `assets/js/custom.js` (conditionally included by `gulpfile.js` if file exists)

Current customizations:
- Anchor links for headings with copy-to-clipboard functionality (CSS + JS)
- Reduced paragraph/heading spacing (`custom.css`)
- Show all tags in post metadata instead of just `primary_tag` (`post.hbs`)
- Homepage hero: bio shown to everyone, subscribe CTA in a gated `subscribe_pitch` custom field (`index.hbs`, `custom.css`)

### Verifying CSS changes

A custom rule can be **present in the built stylesheet yet lose the cascade** — verify the *computed result*, not just that the rule exists. Two checks (run after editing CSS):

```bash
pnpm verify:css           # authoritative: builds, then renders the hero in headless Chromium
                          # (Playwright) and asserts bio/pitch computed font-size match
pnpm verify:css:cascade   # fast (no browser): builds, then resolves which font-size rule
                          # wins by specificity + source order from assets/built/screen.css
```

Scripts live in `scripts/`. Extend them when adding hero/about customizations. `pnpm verify:css` needs Playwright's Chromium (`pnpm exec playwright install chromium`, one-time).

## Merging upstream

The fork tracks `upstream` (TryGhost/Solo). Customizations bleed into a few upstream-tracked files (`post.hbs`, `screen.css`, `gulpfile.js`); after merging, rebuild with `pnpm build` and commit the regenerated `assets/built/`.

Unlike upstream, the fork commits `pnpm-lock.yaml`, and CI installs with `--frozen-lockfile`: what goes live on evanw.com is built from exactly the versions that were tested, never whatever was published that hour. After a merge that changes `package.json`, run `pnpm install --config.minimum-release-age=10080` (no version younger than 7 days) and commit the lockfile with it.

`assets/built/*` is kept committed (aligned with upstream, whose download-zip distribution model requires it). To avoid hand-resolving conflicts in those minified files on every upstream merge, `.gitattributes` marks them `merge=ours` — git keeps our version on conflict and you regenerate them with `pnpm build` afterward. This needs a **one-time** local config:

```bash
git config merge.ours.driver true
```

## Deployment

Deployment is automated via GitHub Actions — the AWS host is no longer part of the deploy path (do **not** `git pull` into the live theme folder; that caused recurring `ghost doctor` permission/ownership errors from the in-folder `.git/` and login-user file ownership).

Workflow: merge upstream on a branch → `pnpm build` → commit → PR to `main` → merge once Test passes. Every change to `main` deploys, so the ruleset on `main` requires a PR whose "Required checks pass" check (Test) passed, and blocks force-pushes and deletion. That holds for admins too, so nothing acting as Evan (his `gh` login, a token, a Claude session) can push straight to the live site; an admin can still merge a PR over a failing check on purpose (`gh pr merge --admin`). No approval is required, so Dependabot auto-merge needs none. To roll back, re-activate the previous theme in Ghost Admin or re-run Deploy from the Actions tab; break-glass is turning the ruleset off. `.github/workflows/deploy.yml` then runs two jobs. `build` runs `gscan` and builds, with no secrets: it runs hundreds of npm packages, and code earlier in a job can tamper with the steps after it. `deploy` takes the built tree and uploads + activates it via the Ghost **Admin API** (`TryGhost/action-deploy-theme`), which extracts it as the `ghost` user so permissions are always correct. The theme is deployed under the name `solo-evanw` (the live theme), overriding the `package.json` name `solo`.

The Ghost secrets, `GHOST_ADMIN_API_URL` (base site URL) and `GHOST_ADMIN_API_KEY` (from the Ghost custom integration), live in the `production` environment, which only `main` can deploy to. Repo-level secrets would reach any workflow on a branch pushed here, including a PR carrying upstream's workflow changes, before anyone reviews it. Ghost's integration key can't be scoped to themes, so it's worth that. Trigger a manual deploy from the Actions tab via `workflow_dispatch`.

Dependabot PRs merge themselves daily (`.github/workflows/dependabot-automerge.yml`, whose header says when). That merge starts no workflow, so it deploys with the next push; the dependencies are build tools, so the live theme doesn't change until then. `.github/automerge-hold` holds `package.json` for a person: direct dependencies come from upstream merges, and a Dependabot bump there would conflict with upstream's.

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
