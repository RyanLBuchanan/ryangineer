#!/usr/bin/env node
// One-time migration: extracts each legacy page's body content VERBATIM
// (between the copy-pasted nav and footer), removes only the boilerplate
// now provided by the shared Astro shell (hero, quote banner), converts the
// invalid <h7> tags to <p class="note">, and emits a content partial plus an
// .astro page for each. Run from repo root: node site/migrate.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const pages = [
  { file: 'precalculus.html',     name: 'precalculus',     title: 'Precalculus — Ryangineer',        desc: 'A precalculus curriculum outline: functions, trigonometry, vectors, complex numbers, and an introduction to limits.' },
  { file: 'mathematicians.html',  name: 'mathematicians',  title: 'Mathematicians — Ryangineer',     desc: 'Profiles of great mathematicians and their contributions.' },
  { file: 'machine_learning.html',name: 'machine_learning',title: 'Machine Learning — Ryangineer',   desc: 'Machine learning notes: algorithms, terminology, and the mathematics behind them.' },
  { file: 'data_science.html',    name: 'data_science',    title: 'Data Science Diction — Ryangineer', desc: 'A data science glossary: terminology and concepts.' },
  { file: 'ai_finance.html',      name: 'ai_finance',      title: 'AI Finance — Ryangineer',         desc: 'Artificial intelligence in finance: notes and resources.' },
  { file: 'about.html',           name: 'about',           title: 'About — Ryangineer',              desc: 'About Ryan L. Buchanan — data analyst, ML engineer, and educator.' },
  { file: 'dtech.html',           name: 'dtech',           title: 'DavisTech — Ryangineer',          desc: 'DavisTech coursework and projects.' },
  { file: 'otech.html',           name: 'otech',           title: 'OTech — Ryangineer',              desc: 'Ogden-Weber Technical College coursework and projects.' },
  { file: 'virtual_reality.html', name: 'virtual_reality', title: 'VR Dev Kids — Ryangineer',        desc: 'Virtual reality courses conducted while creating VR Dev Kids LLC.' },
  { file: 'wsu.html',             name: 'wsu',             title: 'WSU — Ryangineer',                desc: 'Weber State University coursework.' },
  { file: 'data_dashboard.html',  name: 'data_dashboard',  title: 'Data Dashboard — Ryangineer',     desc: 'Interactive Plotly data dashboard.' },
];

const esc = (s) => s.replace(/`/g, '\\`');

for (const page of pages) {
  let html = readFileSync(page.file, 'utf8');

  // Slice between the end of the nav and the start of the footer (or </body> when no footer)
  const navEnd = html.indexOf('</nav>');
  if (navEnd === -1) { console.error(`SKIP ${page.file}: no </nav>`); continue; }
  let end = html.indexOf('<footer');
  if (end === -1) end = html.indexOf('</body>');
  let body = html.slice(navEnd + '</nav>'.length, end);

  // Remove hero boilerplate now rendered by SiteHeader
  const before = body.length;
  body = body.replace(/<div id="bio_image"[\s\S]*?<\/div>/, '');
  body = body.replace(/<div id="img_pythagoras"[\s\S]*?<\/div>/, '');
  body = body.replace(/<div>\s*<h1 id="ryangineer"[\s\S]*?<\/div>/, '');

  // Capture and remove the quotation banner (re-rendered as a styled <blockquote>)
  let quote = null;
  const qm = body.match(/<div id="\w*[Qq]uotation" class="container">\s*<div class="jumbotron">\s*<p[^>]*>([\s\S]*?)<\/p>\s*<\/div>\s*<\/div>/);
  if (qm) {
    const inner = qm[1].replace(/<b>|<\/b>/g, '').trim();
    const parts = inner.split(/<br\s*\/?>/);
    quote = { text: parts[0].trim(), author: (parts[1] || '').trim() };
    body = body.replace(qm[0], '');
  }

  // Invalid <h7> tags -> styled notes (same transform as index)
  body = body.replace(/<h7>/g, '<p class="note">').replace(/<\/h7>/g, '</p>');

  // Drop legacy script includes the new shell replaces (jQuery, script.js, Bootstrap bundle).
  body = body.replace(/\s*<script src="scripts\/(jquery|script|interaction)\.js"><\/script>/g, '');
  body = body.replace(/\s*<script src="https:\/\/code\.jquery\.com[^"]*"[^>]*><\/script>/g, '');
  body = body.replace(/\s*<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/bootstrap[^"]*"[^>]*><\/script>/g, '');
  body = body.replace(/\s*<\/?body>/g, '');

  // Dashboard: Plotly must load before plot1.js/plot2.js (was in the old <head>)
  if (page.name === 'data_dashboard') {
    body = '<script src="https://cdn.plot.ly/plotly-latest.min.js"></script>\n' + body;
  }

  writeFileSync(`site/src/content/${page.name}-body.html`, body);

  const quoteBlock = quote
    ? `\n  <blockquote class="quote">\n    ${quote.text}\n    <cite>— ${quote.author}</cite>\n  </blockquote>\n`
    : '\n';

  const astro = `---
import BaseLayout from '../layouts/BaseLayout.astro';
import SiteHeader from '../components/SiteHeader.astro';

// Content preserved verbatim from the original ${page.file} (see site/migrate.mjs)
import body from '../content/${page.name}-body.html?raw';
---
<BaseLayout title="${page.title}" current="/${page.name}.html" description="${page.desc}">
  <SiteHeader slot="hero" />
${quoteBlock}  <Fragment set:html={body} />
</BaseLayout>
`;
  writeFileSync(`site/src/pages/${page.name}.astro`, astro);
  console.log(`${page.file}: body ${before} -> ${body.length} chars, quote: ${quote ? 'yes' : 'no'}`);
}
