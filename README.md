# gregor-posadas.github.io

Personal site, served by GitHub Pages from the `main` branch root.

- `index.html`, `research.html`, `publications.html`, `cv.html` — the pages (plain HTML, no build step)
- `assets/styles.css` — one stylesheet, same signage rules as the Microbe Busters hub
- `assets/site.js` — the light/dark toggle
- `fonts/` — Atkinson Hyperlegible Next (SIL Open Font License, see `fonts/OFL.txt`)
- `files/Posadas_CV.pdf` — the downloadable CV

## Updating

Edit the HTML directly and push to `main`. Pages redeploys in about a minute.

To add a headshot: save it as `assets/headshot.jpg`, then in `index.html` add
`has-photo` to the `<section class="intro">` and insert
`<figure><img class="photo" src="assets/headshot.jpg" alt="Gregor Posadas" width="280" height="350"></figure>`
after the `intro__text` div.

To refresh the CV PDF, replace `files/Posadas_CV.pdf`.
