// Image processing for the studio. Everything runs locally on a canvas; nothing is uploaded.

function readPixels(source, maxSide) {
  const sw = source.width, sh = source.height;
  const scale = Math.min(1, maxSide / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * scale));
  const h = Math.max(1, Math.round(sh * scale));
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, w, h);
  return { w, h, data: ctx.getImageData(0, 0, w, h).data };
}

// Separable box blur on a Float32 field, repeated to approximate a gaussian.
function blur(src, w, h, radius, passes = 2) {
  let a = src, b = new Float32Array(w * h);
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let s = 0, n = 0;
      for (let d = -radius; d <= radius; d++) { const xx = x + d; if (xx >= 0 && xx < w) { s += a[y * w + xx]; n++; } }
      b[y * w + x] = s / n;
    }
    const c = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let s = 0, n = 0;
      for (let d = -radius; d <= radius; d++) { const yy = y + d; if (yy >= 0 && yy < h) { s += b[yy * w + x]; n++; } }
      c[y * w + x] = s / n;
    }
    a = c;
  }
  return a;
}

// Luminance with automatic levels: stretches the 2nd to 98th percentile so flat photos keep contrast.
function luminance(data, n) {
  const lum = new Float32Array(n);
  const hist = new Uint32Array(256);
  for (let i = 0; i < n; i++) {
    const v = 0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2];
    lum[i] = v / 255;
    hist[Math.min(255, v | 0)]++;
  }
  let lo = 0, hi = 255, acc = 0;
  for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc >= n * 0.02) { lo = i; break; } }
  acc = 0;
  for (let i = 255; i >= 0; i--) { acc += hist[i]; if (acc >= n * 0.02) { hi = i; break; } }
  const a = lo / 255, span = Math.max(0.12, (hi - lo) / 255);
  for (let i = 0; i < n; i++) lum[i] = Math.min(1, Math.max(0, (lum[i] - a) / span));
  return lum;
}

export function processLitho(bitmap) {
  const { w, h, data } = readPixels(bitmap, 240);
  return { w, h, lum: luminance(data, w * h) };
}

// Relief: a smoothed version of the photo so the surface reads as sculpted volume, not noise.
export function processRelief(bitmap) {
  const { w, h, data } = readPixels(bitmap, 200);
  const lum = luminance(data, w * h);
  const soft = blur(lum, w, h, 1, 2);
  const out = new Float32Array(w * h);
  // Keep some fine detail on top of the smooth volume.
  for (let i = 0; i < w * h; i++) out[i] = Math.min(1, Math.max(0, soft[i] * 0.7 + lum[i] * 0.3));
  return { w, h, lum: out };
}

export function processLogo(bitmap, k, nearestFilament) {
  const { w, h, data } = readPixels(bitmap, 168);
  const n = w * h;
  const fg = new Uint8Array(n);

  let hasAlpha = false;
  for (let i = 0; i < n; i++) if (data[i * 4 + 3] < 200) { hasAlpha = true; break; }

  if (hasAlpha) {
    for (let i = 0; i < n; i++) fg[i] = data[i * 4 + 3] >= 128 ? 1 : 0;
  } else {
    // Background = the dominant border color, removed by flood fill from the edges.
    // Areas of that same color enclosed by the drawing (a white eye, a letter counter) are kept.
    const counts = new Map();
    const add = (x, y) => {
      const i = (y * w + x) * 4;
      const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
      counts.set(key, (counts.get(key) || 0) + 1);
    };
    for (let x = 0; x < w; x++) { add(x, 0); add(x, h - 1); }
    for (let y = 0; y < h; y++) { add(0, y); add(w - 1, y); }
    let bestKey = 0, best = -1;
    counts.forEach((v, key) => { if (v > best) { best = v; bestKey = key; } });
    const bg = [((bestKey >> 8) & 15) * 16 + 8, ((bestKey >> 4) & 15) * 16 + 8, (bestKey & 15) * 16 + 8];
    const isBg = (i) => (data[i * 4] - bg[0]) ** 2 + (data[i * 4 + 1] - bg[1]) ** 2 + (data[i * 4 + 2] - bg[2]) ** 2 < 2600;
    const seen = new Uint8Array(n);
    const stack = [];
    const push = (x, y) => { const i = y * w + x; if (!seen[i] && isBg(i)) { seen[i] = 1; stack.push(i); } };
    for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
    for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
    while (stack.length) {
      const i = stack.pop(), x = i % w, y = (i / w) | 0;
      if (x > 0) push(x - 1, y);
      if (x < w - 1) push(x + 1, y);
      if (y > 0) push(x, y - 1);
      if (y < h - 1) push(x, y + 1);
    }
    for (let i = 0; i < n; i++) fg[i] = seen[i] ? 0 : 1;
  }

  const pts = [];
  for (let i = 0; i < n; i++) if (fg[i]) pts.push(i);
  if (pts.length < 40 || pts.length > n * 0.985) return null;

  // k-means on foreground colors, seeded with spread-out samples.
  const centers = [];
  for (let c = 0; c < k; c++) {
    const i = pts[Math.floor(((c + 0.5) / k) * pts.length)] * 4;
    centers.push([data[i], data[i + 1], data[i + 2]]);
  }
  const labels = new Int8Array(n).fill(-1);
  for (let iter = 0; iter < 12; iter++) {
    const sum = centers.map(() => [0, 0, 0, 0]);
    for (const p of pts) {
      const i = p * 4;
      let best = 0, bestD = Infinity;
      for (let c = 0; c < k; c++) {
        const d = (data[i] - centers[c][0]) ** 2 + (data[i + 1] - centers[c][1]) ** 2 + (data[i + 2] - centers[c][2]) ** 2;
        if (d < bestD) { bestD = d; best = c; }
      }
      labels[p] = best;
      sum[best][0] += data[i]; sum[best][1] += data[i + 1]; sum[best][2] += data[i + 2]; sum[best][3]++;
    }
    for (let c = 0; c < k; c++) if (sum[c][3]) centers[c] = [sum[c][0] / sum[c][3], sum[c][1] / sum[c][3], sum[c][2] / sum[c][3]];
  }

  // Majority filter: removes the speckle that anti-aliased edges leave between two colors.
  const clean = new Int8Array(labels);
  const votes = new Uint8Array(k);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    if (!fg[i]) continue;
    votes.fill(0);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const l = labels[i + dy * w + dx]; if (l >= 0) votes[l]++; }
    let best = labels[i];
    for (let c = 0; c < k; c++) if (votes[c] > votes[best]) best = c;
    clean[i] = best;
  }

  // Snap each cluster to the closest filament actually in stock.
  const palette = centers.map((c) => nearestFilament(c));
  return { w, h, fg, labels: clean, palette };
}
