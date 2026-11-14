#!/usr/bin/env python3
"""Renders the catalog and marketing images with the studio's own renderer.

Usage (from the repo root):
    npm run render                 # every image
    npm run render -- llavero     # only the named items

Needs: pip install playwright pillow && playwright install chromium
"""
import asyncio, base64, functools, http.server, io, json, pathlib, re, sys, threading
from PIL import Image
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "catalog"

# Per-item framing. Anything not listed uses the defaults: lying or standing on a table, 800 x 600.
OPTIONS = {
    "topper": {"mode": "studio"},
    "litofania": {"elevation": 0.2, "azimuth": -0.5},
    "cubo-litofanias": {"elevation": 0.36, "azimuth": -0.62},
    "placa": {"elevation": 0.26, "azimuth": -0.5},
    "letrero": {"elevation": 0.3, "azimuth": -0.45},
    "florero": {"elevation": 0.3},
    "trofeo": {"elevation": 0.26, "azimuth": -0.3},
    "arbol-navidad": {"elevation": 0.26},
    "soporte-audifonos": {"elevation": 0.22, "azimuth": -0.5},
    "serpiente": {"elevation": 0.7, "azimuth": -0.3},
    "joyero-corazon": {"elevation": 0.75, "azimuth": -0.3},
    "pesebre": {"elevation": 0.24, "azimuth": -0.3},
    "placa-qr": {"elevation": 0.22, "azimuth": -0.45},
}

# Marketing images: (file name, item, width, height, options)
EXTRAS = [
    ("hero", "llavero", 1400, 1050, {"mode": "box", "fit": 0.8}),
    ("hero-720", "llavero", 720, 540, {"mode": "box", "fit": 0.8}),
    ("story-pieza", "llavero", 1000, 750, {"elevation": 0.95, "azimuth": -0.28}),
]


def catalog_ids():
    text = (ROOT / "js" / "config.js").read_text(encoding="utf-8")
    block = text[text.index("catalog: ["):]
    return re.findall(r'\{ id: "([a-z0-9-]+)"', block)


def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args):
            pass
    handler = functools.partial(Quiet, directory=str(ROOT))
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


async def main(only):
    OUT.mkdir(parents=True, exist_ok=True)
    srv = serve()
    jobs = [(i, i, 800, 600, OPTIONS.get(i, {})) for i in catalog_ids()] + EXTRAS
    if only:
        jobs = [j for j in jobs if j[0] in only]
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
        page = await browser.new_page(viewport={"width": 1500, "height": 1200})
        page.on("console", lambda m: print("  [browser]", m.text) if m.type in ("error", "warning") else None)
        page.on("pageerror", lambda e: print("  [pageerror]", e))
        await page.goto(f"http://127.0.0.1:{srv.server_port}/tools/render.html")
        await page.wait_for_function("() => !!window.TINKER_RENDER")
        last = None
        for name, item, w, h, opts in jobs:
            if (w, h) != last:
                # The stage is created once per size; reload when the size changes.
                await page.reload()
                await page.wait_for_function("() => !!window.TINKER_RENDER")
                last = (w, h)
            try:
                url = await page.evaluate("([i, w, h, o]) => window.TINKER_RENDER(i, w, h, o)", [item, w, h, opts])
            except Exception as e:
                print("FAILED", name, str(e).splitlines()[0])
                continue
            img = Image.open(io.BytesIO(base64.b64decode(url.split(",", 1)[1])))
            img.save(OUT / f"{name}.webp", "WEBP", quality=84, method=6)
            print("ok", name, (OUT / f"{name}.webp").stat().st_size // 1024, "KB")
            if name == "hero":
                # Social preview (1200 x 630): the hero render on the brand background.
                og = Image.new("RGB", (1200, 630), (11, 11, 12))
                piece = img.convert("RGBA")
                piece.thumbnail((840, 630))
                og.paste(piece, ((1200 - piece.width) // 2, (630 - piece.height) // 2), piece)
                og.save(ROOT / "assets" / "og.jpg", "JPEG", quality=86, optimize=True)
        await browser.close()
    srv.shutdown()


if __name__ == "__main__":
    asyncio.run(main(set(sys.argv[1:])))
