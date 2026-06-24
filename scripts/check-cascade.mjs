// Lightweight, no-browser CSS cascade check for the homepage hero.
//
// Why this exists: a custom rule can be PRESENT in the built stylesheet yet
// LOSE the cascade (custom.css is inlined before the theme's own rules, so a
// single-class tie loses on source order). "Rule present" != "rule wins".
// This resolves, from the built CSS alone, which font-size declaration each
// hero paragraph actually gets — by specificity then source order.
//
// This is a focused heuristic (it understands only the hero's selectors).
// The authoritative check is scripts/verify-hero-styles.mjs (real browser).
//
// Usage: node scripts/check-cascade.mjs [path-to-built-screen.css]
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cssPath = process.argv[2] || join(root, 'assets/built/screen.css');
const css = readFileSync(cssPath, 'utf8');

// Specificity (a,b,c): ids, classes/attrs/pseudo-classes, elements.
function specificity(sel) {
  const ids = (sel.match(/#[\w-]+/g) || []).length;
  const classes = (sel.match(/\.[\w-]+|\[[^\]]+\]|:[\w-]+(?![\w-]*\()/g) || []).length;
  const els = (sel.match(/(^|[\s>+~])[a-zA-Z][\w-]*/g) || []).length;
  return [ids, classes, els];
}
const cmp = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

// Every rule in the built CSS that sets font-size on a .gh-about-secondary.
const rules = [];
const re = /([^{}]+)\{([^}]*font-size:[^;}]+;?[^}]*)\}/g;
let m;
while ((m = re.exec(css))) {
  const fs = (m[2].match(/font-size:\s*([^;}]+)/) || [])[1];
  if (!fs) continue;
  for (const sel of m[1].split(',').map((s) => s.trim())) {
    if (!/gh-about-secondary/.test(sel)) continue;
    rules.push({ sel, fontSize: fs.trim(), order: m.index, spec: specificity(sel) });
  }
}

// The two real hero elements (see index.hbs):
//   bio   = <p class="gh-about-secondary"> directly after <h1 class="gh-about-primary">
//   pitch = <p class="gh-about-secondary gh-about-subscribe-pitch"> (NOT adjacent to the h1)
function matches(sel, el) {
  if (sel.includes('.has-')) return false; // font-family variants, not size
  if (sel.includes('+')) return el.adjacentToH1; // adjacency only matches the bio
  const needed = (sel.match(/\.[\w-]+/g) || []).map((s) => s.slice(1));
  return needed.every((c) => el.classes.includes(c));
}
const bio = { name: 'bio', classes: ['gh-about-secondary'], adjacentToH1: true };
const pitch = { name: 'pitch', classes: ['gh-about-secondary', 'gh-about-subscribe-pitch'], adjacentToH1: false };

for (const el of [bio, pitch]) {
  const matched = rules.filter((r) => matches(r.sel, el)).sort((a, b) => cmp(a.spec, b.spec) || a.order - b.order);
  el.win = matched.at(-1);
  console.log(`\n[${el.name}] matching font-size rules (low -> high priority):`);
  for (const r of matched) console.log(`   spec ${r.spec.join(',')} @${r.order}  ${r.sel}  ->  ${r.fontSize}`);
  console.log(`   WINNER -> ${el.win?.fontSize}`);
}

const ok = bio.win && pitch.win && bio.win.fontSize === pitch.win.fontSize;
console.log(
  ok
    ? `\n✅ PASS: pitch resolves to the SAME font-size as the bio (${bio.win.fontSize}).`
    : `\n❌ FAIL: bio ${bio.win?.fontSize} vs pitch ${pitch.win?.fontSize}.`
);
process.exit(ok ? 0 : 1);
