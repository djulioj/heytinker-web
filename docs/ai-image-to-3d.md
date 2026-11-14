# Photo to product: what ships now, and the paid AI option

## What ships now (no AI, no cost, nothing uploaded)

The "photo to product" previews are computed in the visitor's browser:

- **Logo keychain**: background removal by flood fill from the edges, k-means color reduction, a majority
  filter for clean edges, and each color snapped to a filament in stock.
- **Lithophane**: auto-levelled luminance mapped to thickness, with a light-transmission model for the
  LED-on view.
- **Relief plaque**: the photo is smoothed and turned into a sculpted surface in one filament color.
- **Scenes and export**: studio, desk and gift-box views, plus a 1080 x 1350 PNG built on a local canvas.

This costs nothing per visitor and keeps the "your image never leaves your phone" promise, so it is the
default and the only thing enabled.

## Paid option: real image-to-3D (not built, needs approval)

Services such as Tripo and Meshy turn one photo into a full 3D mesh. That suits figurines (a pet, an
object), not flat pieces, and the result still needs a printability check before quoting.

### Cost per generation (checked 2026-11-14)

| Provider | Mesh only | With texture | Notes |
| --- | --- | --- | --- |
| Tripo API | US$0.20 | US$0.30 | Pay as you go, 1 credit = US$0.01 |
| Meshy API | 20 credits | 30 credits | About US$0.27 to 0.40 on a US$40 / 3.000-credit plan |

At 100 generations a month that is roughly US$20 to 30 with Tripo. An untextured mesh is enough for a
single-color print preview, so US$0.20 is the realistic unit cost.

### Design

```
browser ── POST /api/concept (image, max 4 MB) ──> Vercel function ──> provider API
        <── task id ── poll /api/concept?id= ──  <── GLB url (short-lived) ──
```

- **API key**: a Vercel environment variable, read only inside the function. Never in `config.js`.
- **Consent**: the image leaves the device, so the button needs its own explicit notice and must not sit
  under the current "no sale de tu celular" text.
- **Limits that keep cost predictable**:
  - 2 generations per visitor per day (per IP, counted in Vercel KV or Upstash).
  - A global daily cap (for example 20), after which the button shows "vuelve mañana".
  - With both caps the worst case is 20 x US$0.20 = US$4 a day.
  - Optionally gate it behind a code sent by WhatsApp, so only real leads can generate.
- **Input checks**: PNG, JPG or WEBP only, 4 MB maximum, decoded and re-encoded in the browser to at most
  1024 px before upload (this also strips EXIF data such as location).
- **No storage**: the function streams the image to the provider and keeps nothing. The provider's
  retention policy has to be read and linked in the consent text.
- **CSP**: unchanged. The browser only talks to `/api/concept` (same origin). The result is fetched by
  the function and returned as a blob, so `connect-src 'self'` still holds.
- **Feature flag**: off by default; turned on from `config.js` once the function exists and the key is set.

### Recommendation

Launch with the in-browser previews. Revisit this once figurine requests actually appear in WhatsApp,
and start with the per-visitor and global caps above.
