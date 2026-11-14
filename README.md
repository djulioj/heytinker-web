# heytinker-web

Website for **Tinker**, a custom 3D printing studio in Barranquilla, Colombia.

A static site: plain HTML, CSS and JavaScript, no tracking and no third-party requests. The only build step bundles the 3D studio (three.js) into `js/studio.min.js`, which is committed, so hosting needs no build.

## Features

- **3D studio** (three.js, lazy-loaded): rotatable previews for name keychains, Christmas ornaments, desk signs and cake toppers; logo keychains (image background removal, k-means color reduction snapped to stocked filaments, multicolor relief); and photo lithophanes with a light on/off simulation. Images are processed in the browser and never uploaded.
- **Pre-filled WhatsApp orders** with product, text, colors, quantity and estimated total.
- **Seasonal mode** (`season` in `js/config.js`): Christmas adds a Santa hat to the logo and an edition badge. Styles live in `css/season.css`.
- **Subtle scroll reveals** that respect `prefers-reduced-motion`.
- **Catalog** rendered from a single data file.
- **Liquid-glass UI** in the brand palette (matte black, bone, one orange accent), responsive and mobile-first.

## Project structure

```
index.html        Page markup
css/styles.css    Styles and self-hosted @font-face rules
js/config.js      Business data: WhatsApp number, colors, products, prices
js/app.js         Catalog, WhatsApp links, season, scroll reveals, lazy studio loader
src/studio.js     3D studio source (bundled to js/studio.min.js)
css/season.css    Seasonal decorations
assets/           Logo, icons, fonts (SIL OFL licenses included)
_headers          Security headers for Cloudflare Pages / Netlify
vercel.json       Security headers for Vercel
```

## Editing content

Everything business-related lives in `js/config.js`:

- `whatsapp`: international format, digits only (e.g. `573001234567`). WhatsApp buttons stay inactive until this is set.
- `colors`: filament colors offered in the configurator.
- `configurable`: products with live preview, max characters and price tiers by quantity.
- `catalog`: product cards (name, starting price, optional tag, optional `configId` to open the configurator).

## Rebuilding the 3D studio

After editing `src/studio.js`:

```bash
npm install
npm run bundle
```

`assets/fonts/space-mono-bold.typeface.json` is Space Mono Bold (SIL OFL) converted to the three.js typeface format.

## Running locally

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

## Deploying

Connect the repository to **Vercel** or **Cloudflare Pages** (framework preset: none, output directory: `/`). Then add the custom domain `heytinker.co` in the provider's dashboard and point the DNS records it shows at your registrar.

## Security

- Strict Content-Security-Policy: only same-origin scripts, styles, fonts and images; no inline scripts or styles.
- HSTS, `nosniff`, `X-Frame-Options: DENY`, restrictive `Permissions-Policy`, `Cross-Origin-Opener-Policy`.
- User input is never injected as HTML: it is sanitized, length-limited, written via `textContent`/SVG nodes and URL-encoded for WhatsApp links.
- Fonts are self-hosted, so no visitor data is sent to third parties.
- No forms post anywhere and no personal data is stored.
