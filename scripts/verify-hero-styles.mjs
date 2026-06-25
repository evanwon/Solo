// Authoritative check: render the homepage hero in a real (headless) browser
// using the BUILT stylesheet, then read computed styles. Unlike grepping the
// CSS, this resolves the full cascade, clamp()/vw units, and inheritance — the
// actual pixels the visitor sees — without deploying.
//
// Invariant: the bio paragraph and the subscribe-pitch paragraph must render at
// the same font-size (see PR #6/#7/#9 — upstream's adjacency selector only
// sizes the first .gh-about-secondary after the <h1>).
//
// Usage: node scripts/verify-hero-styles.mjs   (run after `pnpm build`)
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(root, 'assets/built/screen.css'), 'utf8');

// Minimal reproduction of the index.hbs hero markup so the browser resolves the
// real cascade against the built stylesheet.
const html = `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head>
<body class="has-side-about">
  <section class="gh-about gh-outer"><div class="gh-about-inner gh-inner">
    <div class="gh-about-content"><div class="gh-about-content-inner">
      <h1 class="gh-about-primary">Hi! I'm Evan</h1>
      <p class="gh-about-secondary" id="bio">Bio paragraph.</p>
      <p class="gh-about-secondary gh-about-subscribe-pitch" id="pitch">Subscribe pitch.</p>
    </div></div>
  </div></section>
</body></html>`;

let browser;
try {
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.setContent(html, { waitUntil: 'load' });

  const read = (sel) =>
    page.$eval(sel, (el) => {
      const cs = getComputedStyle(el);
      return { fontSize: cs.fontSize, fontWeight: cs.fontWeight, maxWidth: cs.maxWidth };
    });
  const bio = await read('#bio');
  const pitch = await read('#pitch');

  console.log('bio  :', bio);
  console.log('pitch:', pitch);

  const ok = bio.fontSize === pitch.fontSize;
  console.log(
    ok
      ? `\n✅ PASS: hero bio and subscribe pitch render at the same font-size (${bio.fontSize}).`
      : `\n❌ FAIL: bio ${bio.fontSize} vs pitch ${pitch.fontSize}.`
  );
  process.exitCode = ok ? 0 : 1;
} catch (err) {
  // Most likely first-run cause: the Chromium binary isn't installed yet.
  if (/Executable doesn't exist|playwright install/i.test(err.message)) {
    console.error("\n❌ Chromium isn't installed. Run: pnpm exec playwright install chromium");
  } else {
    console.error('\n❌ verify-hero-styles failed:', err.message);
  }
  process.exitCode = 1;
} finally {
  await browser?.close();
}
