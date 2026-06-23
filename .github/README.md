# Solo — evanw.com fork

A personal fork of the [TryGhost/Solo](https://github.com/TryGhost/Solo) Ghost theme, running on [evanw.com](https://evanw.com). It tracks upstream and layers a few additive customizations on top while staying mergeable.

> The original theme's README is preserved unmodified at [`/README.md`](../README.md). This file only documents what's different in this fork.

## What's customized

- **Heading anchor links** with copy-to-clipboard (`assets/css/custom.css` + `assets/js/custom.js`)
- **Tighter paragraph/heading spacing** (`assets/css/custom.css`)
- **All tags shown** in post metadata instead of just the primary tag (`post.hbs`)

Customizations are deliberately isolated to `assets/css/custom.css` and `assets/js/custom.js` (plus a couple of upstream-tracked templates) to keep upstream merges clean.

## How it's deployed

Pushing to `main` triggers a GitHub Action ([`.github/workflows/deploy.yml`](workflows/deploy.yml)) that builds the theme and uploads it to Ghost via the Admin API — Ghost installs it as the `solo-evanw` theme. Each deploy is stamped with a traceable version like `1.0.20260623+a1b2c3d` (`<upstream major.minor>.<UTC date>+<commit>`), visible in Ghost Admin.

## Contributing & issues

This is a personal fork — I'm not taking feature requests here. For the original theme, see [TryGhost/Solo](https://github.com/TryGhost/Solo) and the canonical [TryGhost/Themes](https://github.com/TryGhost/Themes) monorepo. Fork maintenance notes (deploy, upstream-merge workflow) live in [`CLAUDE.md`](../CLAUDE.md).
