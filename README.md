# gregor-posadas.github.io

Personal site, served by GitHub Pages from the `main` branch root. Plain HTML, no build step.

- `index.html`, `research.html`, `publications.html`, `cv.html`, `dad.html` (`tatay.html` redirects there) — English pages
- `tl/` — the same five pages in Filipino (each page links to its counterpart in the header)
- `assets/styles.css` — one stylesheet, same signage rules as the Microbe Busters hub
- `assets/site.js` — light/dark toggle and the click sounds (synthesized with Web Audio, no audio files; off by default for visitors with reduced-motion set, remembered per visitor)
- `assets/img/` — headshot, field photos, Pinoy Scientists cards (full size and `-thumb`)
- `fonts/` — Atkinson Hyperlegible Next (SIL Open Font License, see `fonts/OFL.txt`)
- `files/Posadas_CV.pdf` — the downloadable CV

## Updating

Edit the HTML directly and push to `main`. Pages redeploys in about a minute. When you change
English text, make the same change in the matching file under `tl/`.

Accessibility checklist for new content: every image gets an `alt`; headings stay in order
(one `h1`, then `h2`); links say where they go; anything in another language gets a `lang`
attribute; keep the colours to the tokens in `styles.css` (the site is near-monochrome on purpose).
