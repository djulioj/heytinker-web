# heytinker-web

Website for **Tinker**, a custom 3D printing studio in Barranquilla, Colombia.

A static, dependency-free site: plain HTML, CSS and JavaScript. No build step, no tracking, no third-party requests.

## Features

- **Live configurator**: customers type a name, pick filament colors and quantity, see an SVG preview and send a pre-filled order via WhatsApp.
- **Catalog** rendered from a single data file.
- **Liquid-glass UI** in the brand palette (matte black, bone, one orange accent), responsive and mobile-first.

## Project structure

```
index.html        Page markup
css/styles.css    Styles and self-hosted @font-face rules
js/config.js      Business data: WhatsApp number, colors, products, prices
js/app.js         Configurator, catalog rendering, WhatsApp links
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
