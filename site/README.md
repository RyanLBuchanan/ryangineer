# Ryangineer — modernized site (Astro)

This is the modernized version of ryangineer.com. It is an [Astro](https://astro.build)
static site: you write the navigation and layout **once**, each page keeps its
own content, and the build emits plain static HTML that deploys exactly like the
old site.

## Why

The original site had some real problems this rewrite fixes:

- **Security:** removed the `polyfill.io` script (that domain was sold and began
  serving malware) from the page `<head>`.
- **Performance:** removed duplicate jQuery, the React dev/prod/profiling bundles,
  Babel-standalone, and the duplicated MathJax v2 + v3 includes. Now: a single
  modern MathJax v3.
- **Maintainability:** the navigation was copy-pasted into ~25 pages with
  hardcoded `https://www.ryangineer.com/` URLs and `target="_blank"` on internal
  links. It now lives once in `src/data/nav.js` and renders via `Nav.astro`.
- **Design:** one modern stylesheet with design tokens, responsive layout, a
  sticky nav, and a light/dark mode toggle (`src/styles/global.css`), replacing
  the scattered ID rules and `text-shadow`-heavy look.

## Content is preserved

All mathematics content is kept verbatim. `index.html` (the big ML / linear
algebra / statistics / calculus / number-theory page) is imported as raw HTML
(`src/content/index-body.html`) so **not one character of the math is lost** —
only the shell around it is modernized. The legacy summation/limit/integral CSS
notation is carried over in `src/styles/legacy.css`.

## Develop

```sh
cd site
npm install
npm run dev      # local dev server
npm run build    # outputs static HTML to ./dist
npm run preview  # preview the production build
```

## Migration status (proof-of-concept)

Done:
- `index.html` — full mathematics page, content preserved, modern shell.
- `algebra.html` — rebuilt as cards with **real LaTeX** (the target pattern for
  converting the legacy CSS notation hacks on other pages).

Remaining pages to migrate the same way (`precalculus`, `mathematicians`,
`machine_learning`, `data_science`, `about`, etc.). The large notebook-export
pages (`exploratory_data_analysis.html`, `data_cleaning.html`,
`predictive_modeling.html`) should be linked or embedded with isolated styling.
