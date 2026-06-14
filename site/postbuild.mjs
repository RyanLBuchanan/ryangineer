#!/usr/bin/env node
// Post-build: copy root-level content that is NOT part of the Astro build
// into dist/ so existing URLs keep working after deploy — sub-projects,
// PDF reports, and the large notebook-export pages. Never overwrites a file
// the Astro build produced. Run from the site/ directory (after astro build).
import { cpSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const dist = join(import.meta.dirname, 'dist');

const files = [
  // PDF reports + resume
  'resume.pdf',
  'churn_data_cleaning.pdf',
  'classification_analysis.pdf',
  'exploratory_data_analysis.pdf',
  'logistic_regression.pdf',
  'multiple_regression.pdf',
  'predictive_analysis.pdf',
  // Large notebook-export pages (self-contained styling, not yet migrated)
  'data_cleaning.html',
  'exploratory_data_analysis.html',
  'predictive_modeling.html',
  // Legacy extras kept reachable at their old URLs
  'boilerplate.html',
  'number-guesser.html',
  'template.html',
];

const dirs = ['aitaProject', 'KittyHub', 'javajam', 'kittygpt', 'tools'];

for (const f of files) {
  const src = join(root, f);
  const dest = join(dist, f);
  if (!existsSync(src)) { console.warn(`postbuild: missing ${f}, skipped`); continue; }
  if (existsSync(dest)) { console.warn(`postbuild: ${f} already built, NOT overwritten`); continue; }
  cpSync(src, dest);
  console.log(`postbuild: copied ${f}`);
}

for (const d of dirs) {
  const src = join(root, d);
  if (!existsSync(src)) { console.warn(`postbuild: missing dir ${d}, skipped`); continue; }
  cpSync(src, join(dist, d), { recursive: true });
  console.log(`postbuild: copied ${d}/`);
}
