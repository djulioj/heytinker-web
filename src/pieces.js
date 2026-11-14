// Geometry builders for the customizable pieces. Units are millimetres.
// Every piece is built facing +Z with its print thickness along Z; `userData.pose` tells the stage
// whether it lies flat on a desk ("flat") or stands on its own ("stand").
import {
  Group, Mesh, Color, MeshBasicMaterial, MeshStandardMaterial, BoxGeometry, CylinderGeometry,
  TorusGeometry, ExtrudeGeometry, BufferGeometry, BufferAttribute, Float32BufferAttribute, Shape, Path
} from "three";
import { pla, metal } from "./materials.js";

// ---------- Text and shapes ----------

export function textGeometry(font, text, size, depth) {
  const shapes = font.generateShapes(text, size);
  const geo = new ExtrudeGeometry(shapes, { depth, curveSegments: 8, bevelEnabled: false });
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  geo.translate(-(bb.min.x + bb.max.x) / 2, -(bb.min.y + bb.max.y) / 2, 0);
  geo.computeBoundingBox();
  return geo;
}

export function fittedText(font, text, maxW, size, depth) {
  let geo = textGeometry(font, text, size, depth);
  const w = geo.boundingBox.max.x - geo.boundingBox.min.x;
  if (w > maxW) { geo.dispose(); geo = textGeometry(font, text, size * (maxW / w), depth); }
  return geo;
}

export function roundedRect(w, h, r) {
  const s = new Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

const BEVEL = { bevelEnabled: true, bevelThickness: 0.45, bevelSize: 0.45, bevelSegments: 3 };
export const plate = (shape, depth, hex, extra = {}) => new Mesh(new ExtrudeGeometry(shape, { depth, curveSegments: 32, ...BEVEL, ...extra }), pla(hex));

// The "tinker_" wordmark for the gift box lid: bone letters, orange underscore.
export function lidLabel(font, width) {
  const g = new Group();
  const word = fittedText(font, "tinker", width, 12, 0.5);
  const ww = word.boundingBox.max.x - word.boundingBox.min.x;
  const wh = word.boundingBox.max.y - word.boundingBox.min.y;
  const letters = new Mesh(word, new MeshStandardMaterial({ color: 0xededE8, roughness: 0.6 }));
  const bar = new Mesh(new BoxGeometry(ww * 0.16, wh * 0.13, 0.5), new MeshStandardMaterial({ color: 0xff6a1a, roughness: 0.6 }));
  bar.position.set(ww / 2 + ww * 0.11, -wh / 2 - wh * 0.02, 0.25);
  letters.position.x = -ww * 0.09;
  bar.position.x -= ww * 0.09;
  letters.userData.noShadow = true; bar.userData.noShadow = true;
  g.add(letters, bar);
  return g;
}

// ---------- Name pieces ----------

export function buildTextPiece(font, p, o) {
  const base = o.base, ink = o.ink;
  const label = (o.text || "").trim() || p.placeholder;
  const g = new Group();
  g.userData.pose = "flat";

  if (p.shape === "keychain") {
    const text = fittedText(font, label, 62, 12, 1.4);
    const tw = text.boundingBox.max.x - text.boundingBox.min.x;
    const th = text.boundingBox.max.y - text.boundingBox.min.y;
    const h = Math.max(th + 9, 20), w = tw + h + 8;
    const shape = roundedRect(w, h, h / 2);
    const hole = new Path(); hole.absarc(-w / 2 + h / 2, 0, 2.6, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    const body = plate(shape, 3, base);
    const t = new Mesh(text, pla(ink));
    t.position.set(h / 2 - 2, 0, 3.4);
    const ring = new Mesh(new TorusGeometry(9, 0.9, 16, 64), metal());
    ring.position.set(-w / 2 + h / 2 - 7, 0, 1.5);
    ring.rotation.y = Math.PI / 2.4;
    g.add(body, t, ring);
  } else if (p.shape === "ornament") {
    const r = 34;
    const disc = new Shape(); disc.absarc(0, 0, r, 0, Math.PI * 2, false);
    const body = plate(disc, 3, base, { curveSegments: 72 });
    const t = new Mesh(fittedText(font, label, 52, 11, 1.4), pla(ink)); t.position.z = 3.4;
    // Metal cap and loop, like a real tree ornament.
    const cap = new Mesh(new BoxGeometry(14, 7, 5), metal()); cap.position.set(0, r + 2, 1.5);
    const loop = new Mesh(new TorusGeometry(3.6, 0.8, 12, 40), metal()); loop.position.set(0, r + 8.5, 1.5);
    g.add(body, t, cap, loop);
  } else if (p.shape === "sign") {
    const sub = (o.subline || "").trim() || (p.subline && p.subline.placeholder) || "";
    const plateW = 120, plateH = 42;
    const face = new Group();
    const body = plate(roundedRect(plateW, plateH, 4), 4, base);
    const name = new Mesh(fittedText(font, label, 104, 11, 1.4), pla(ink)); name.position.set(0, sub ? 6 : 0, 4.4);
    face.add(body, name);
    if (sub) {
      const s = new Mesh(fittedText(font, sub, 100, 5.2, 1.0), pla(ink)); s.position.set(0, -10, 4.4);
      face.add(s);
    }
    face.rotation.x = -0.32;
    const stand = new Mesh(new BoxGeometry(plateW, 6, 24), pla(base));
    stand.position.set(0, -plateH / 2 - 1, -6);
    g.add(face, stand);
    g.userData.pose = "stand";
  } else {
    const text = fittedText(font, label, 110, 20, 3);
    const t = new Mesh(text, pla(ink));
    const tw = text.boundingBox.max.x - text.boundingBox.min.x;
    const th = text.boundingBox.max.y - text.boundingBox.min.y;
    const backing = new Mesh(new BoxGeometry(tw + 6, 4, 3), pla(ink));
    backing.position.set(0, -th / 2 + 1, 1.5);
    const stickGeo = new CylinderGeometry(1.4, 1.4, 55, 20);
    const s1 = new Mesh(stickGeo, pla(base)); s1.position.set(-tw * 0.25, -th / 2 - 27, 1.5);
    const s2 = new Mesh(stickGeo.clone(), pla(base)); s2.position.set(tw * 0.25, -th / 2 - 27, 1.5);
    g.add(t, backing, s1, s2);
  }
  return g;
}

// ---------- Logo keychain ----------

class Buf {
  constructor() { this.a = new Float32Array(1 << 15); this.n = 0; }
  push9(x, y, z, nx, ny, nz, r, g, b) {
    if (this.n + 9 > this.a.length) { const b2 = new Float32Array(this.a.length * 2); b2.set(this.a); this.a = b2; }
    const a = this.a, n = this.n;
    a[n] = x; a[n + 1] = y; a[n + 2] = z; a[n + 3] = nx; a[n + 4] = ny; a[n + 5] = nz; a[n + 6] = r; a[n + 7] = g; a[n + 8] = b;
    this.n += 9;
  }
}

// Emits a quad as two triangles, fixing the winding so it faces along its normal.
function quad(buf, p, n, c) {
  const ux = p[3] - p[0], uy = p[4] - p[1], uz = p[5] - p[2];
  const vx = p[6] - p[0], vy = p[7] - p[1], vz = p[8] - p[2];
  const facing = (uy * vz - uz * vy) * n[0] + (uz * vx - ux * vz) * n[1] + (ux * vy - uy * vx) * n[2];
  const order = facing >= 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
  for (const i of order) buf.push9(p[i * 3], p[i * 3 + 1], p[i * 3 + 2], n[0], n[1], n[2], c[0], c[1], c[2]);
}

// Solid surface from a grid of cell heights. Rows are merged into runs, and walls are only
// emitted where the height drops, so a 168 px logo stays a single light mesh.
function gridSolid(w, h, px, heightAt, colorAt, splitZ, lowColor) {
  const buf = new Buf();
  const H = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : heightAt(y * w + x));
  const X = (x) => (x - w / 2) * px, Y = (y) => (h / 2 - y) * px;
  const wall = (pts, n, z0, z1, col) => {
    const lo = [z0, Math.min(z1, splitZ)], hi = [Math.max(z0, splitZ), z1];
    for (const [seg, c] of [[lo, lowColor], [hi, col]]) {
      if (seg[1] - seg[0] <= 1e-4) continue;
      quad(buf, [pts[0], pts[1], seg[0], pts[2], pts[3], seg[0], pts[2], pts[3], seg[1], pts[0], pts[1], seg[1]], n, c);
    }
  };
  for (let y = 0; y < h; y++) {
    let x = 0;
    while (x < w) {
      const i = y * w + x, z = heightAt(i);
      if (!z) { x++; continue; }
      const key = colorAt(i);
      let x2 = x + 1;
      while (x2 < w && heightAt(y * w + x2) === z && colorAt(y * w + x2) === key) x2++;
      const x0 = X(x), x1 = X(x2), y1 = Y(y), y0 = Y(y + 1);
      quad(buf, [x0, y0, z, x1, y0, z, x1, y1, z, x0, y1, z], [0, 0, 1], key);
      quad(buf, [x0, y0, 0, x1, y0, 0, x1, y1, 0, x0, y1, 0], [0, 0, -1], lowColor);
      x = x2;
    }
    for (let xx = 0; xx < w; xx++) {
      const z = heightAt(y * w + xx);
      if (!z) continue;
      const col = colorAt(y * w + xx), x0 = X(xx), x1 = X(xx + 1), y1 = Y(y), y0 = Y(y + 1);
      let nz;
      if ((nz = H(xx + 1, y)) < z) wall([x1, y0, x1, y1], [1, 0, 0], nz, z, col);
      if ((nz = H(xx - 1, y)) < z) wall([x0, y0, x0, y1], [-1, 0, 0], nz, z, col);
      if ((nz = H(xx, y - 1)) < z) wall([x0, y1, x1, y1], [0, 1, 0], nz, z, col);
      if ((nz = H(xx, y + 1)) < z) wall([x0, y0, x1, y0], [0, -1, 0], nz, z, col);
    }
  }
  const count = buf.n / 9;
  const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), col = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos.set(buf.a.subarray(i * 9, i * 9 + 3), i * 3);
    nor.set(buf.a.subarray(i * 9 + 3, i * 9 + 6), i * 3);
    col.set(buf.a.subarray(i * 9 + 6, i * 9 + 9), i * 3);
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(pos, 3));
  geo.setAttribute("normal", new BufferAttribute(nor, 3));
  geo.setAttribute("color", new BufferAttribute(col, 3));
  return geo;
}

export function buildLogoPiece(font, L, baseHex) {
  const g = new Group();
  g.userData.pose = "flat";
  if (!L) return placeholderPiece(font, "Sube tu logo");

  const px = 48 / Math.max(L.w, L.h); // final piece about 48 mm on its longest side
  const BASE = 2.4, TOP = 3.4;
  // Base silhouette: the drawing grown by about 1.2 mm so the logo sits on a border.
  const r = Math.max(2, Math.round(1.2 / px)), r2 = r * r + 1;
  const dil = new Uint8Array(L.w * L.h);
  for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
    if (!L.fg[y * L.w + x]) continue;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < L.w && ny < L.h && dx * dx + dy * dy <= r2) dil[ny * L.w + nx] = 1;
    }
  }
  const rgb = (hex) => { const c = new Color(hex); return [c.r, c.g, c.b]; };
  const baseC = rgb(baseHex), inks = L.palette.map((c) => rgb(c.hex));
  const geo = gridSolid(L.w, L.h, px,
    (i) => (L.fg[i] ? TOP : dil[i] ? BASE : 0),
    (i) => (L.fg[i] ? inks[L.labels[i]] : baseC),
    BASE, baseC);
  g.add(new Mesh(geo, pla("#ffffff", { vertexColors: true })));

  // Ring tab at the top center.
  let topY = 0;
  for (let y = 0; y < L.h && !topY; y++) for (let x = 0; x < L.w; x++) if (dil[y * L.w + x]) { topY = (L.h / 2 - y) * px; break; }
  const tabShape = new Shape(); tabShape.absarc(0, 0, 5, 0, Math.PI * 2, false);
  const tabHole = new Path(); tabHole.absarc(0, 0, 2.2, 0, Math.PI * 2, true); tabShape.holes.push(tabHole);
  const tab = new Mesh(new ExtrudeGeometry(tabShape, { depth: BASE, bevelEnabled: false, curveSegments: 40 }), pla(baseHex));
  tab.position.set(0, topY + 2.5, 0);
  const ring = new Mesh(new TorusGeometry(8, 0.9, 16, 64), metal());
  ring.position.set(0, topY + 9.5, 1.2); ring.rotation.x = 0.45;
  g.add(tab, ring);
  return g;
}

// ---------- Photo surfaces ----------

// Regular grid surface: z comes from the image, optional per-vertex color.
function heightfield(D, W, zOf, colorOf) {
  const cols = D.w, rows = D.h, H = W * (rows / cols);
  const pos = new Float32Array(cols * rows * 3);
  const col = colorOf ? new Float32Array(cols * rows * 3) : null;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const i = y * cols + x, l = D.lum[i];
    pos[i * 3] = (x / (cols - 1) - 0.5) * W;
    pos[i * 3 + 1] = (0.5 - y / (rows - 1)) * H;
    pos[i * 3 + 2] = zOf(l);
    if (col) { const c = colorOf(l, y / (rows - 1)); col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2]; }
  }
  const idx = new Uint32Array((cols - 1) * (rows - 1) * 6);
  let k = 0;
  for (let y = 0; y < rows - 1; y++) for (let x = 0; x < cols - 1; x++) {
    const a = y * cols + x, b = a + 1, c = a + cols, d = c + 1;
    idx[k++] = a; idx[k++] = c; idx[k++] = b; idx[k++] = b; idx[k++] = c; idx[k++] = d;
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(pos, 3));
  if (col) geo.setAttribute("color", new BufferAttribute(col, 3));
  geo.setIndex(new BufferAttribute(idx, 1));
  geo.computeVertexNormals();
  return { geo, H };
}

function frameShape(W, H, border, r) {
  const s = roundedRect(W + border * 2, H + border * 2, r);
  const hole = new Path();
  hole.moveTo(-W / 2, -H / 2); hole.lineTo(W / 2, -H / 2); hole.lineTo(W / 2, H / 2); hole.lineTo(-W / 2, H / 2); hole.lineTo(-W / 2, -H / 2);
  s.holes.push(hole);
  return s;
}

export function buildLithoPiece(font, D, frameHex, light) {
  const g = new Group();
  g.userData.pose = "stand";
  if (!D) return placeholderPiece(font, "Sube tu foto");

  const W = 100, minT = 0.8, maxT = 3.0;
  // Darker pixels are thicker, exactly like the printed piece. With the LED on, light passing
  // through thin areas is brighter and warmer, and it falls off slightly toward the top.
  const { geo, H } = heightfield(D, W,
    (l) => minT + (1 - l) * (maxT - minT),
    light ? (l, v) => {
      const t = (1 - l) * (maxT - minT);
      const tr = Math.min(1, 1.18 * Math.exp(-1.25 * t)) * (0.86 + 0.14 * v);
      return [tr, 0.86 * tr, 0.66 * tr];
    } : null);
  const mat = light ? new MeshBasicMaterial({ vertexColors: true, toneMapped: false }) : pla("#F1F0EA", { roughness: 0.62 });
  const surface = new Mesh(geo, mat);
  const back = new Mesh(new BoxGeometry(W, H, minT * 0.8), light ? new MeshBasicMaterial({ color: 0x2a2118 }) : pla("#ECEBE5"));
  back.position.z = minT * 0.4;
  if (light) { surface.userData.noShadow = true; back.userData.noShadow = true; }

  const border = 4;
  const frameMesh = new Mesh(new ExtrudeGeometry(frameShape(W, H, border, 3), { depth: 5, curveSegments: 16, ...BEVEL }), pla(frameHex));
  frameMesh.position.z = -1;
  const baseBox = new Mesh(new BoxGeometry(W + 16, 14, 28), pla(frameHex));
  baseBox.position.set(0, -H / 2 - border - 7, 1);
  const led = new Mesh(new BoxGeometry(W * 0.8, 1.2, 4), new MeshBasicMaterial({ color: light ? 0xffd9a8 : 0x3a3a40 }));
  led.position.set(0, -H / 2 - border + 0.4, 1.5);
  led.userData.noShadow = true;
  g.add(back, surface, frameMesh, baseBox, led);
  return g;
}

// Photo relief plaque: the photo becomes a sculpted surface in a single filament color.
export function buildReliefPiece(font, D, hex) {
  const g = new Group();
  g.userData.pose = "stand";
  if (!D) return placeholderPiece(font, "Sube tu foto");

  const W = 100, floorT = 1.2, depth = 3.4, border = 5;
  // Vertex color darkens the recesses a little, the way cavities read on a real single-color print.
  const tint = new Color(hex);
  const { geo, H } = heightfield(D, W, (l) => floorT + l * depth, (l) => { const k = 0.5 + 0.5 * l; return [tint.r * k, tint.g * k, tint.b * k]; });
  const face = new Group();
  const surface = new Mesh(geo, pla("#ffffff", { roughness: 0.5, vertexColors: true }));
  const back = new Mesh(new BoxGeometry(W, H, floorT * 0.8), pla(hex));
  back.position.z = floorT * 0.4;
  const frameMesh = new Mesh(new ExtrudeGeometry(frameShape(W, H, border, 4), { depth: 5.4, curveSegments: 16, ...BEVEL }), pla(hex));
  frameMesh.position.z = -0.6;
  face.add(back, surface, frameMesh);
  // Leans back on a small foot so it stands on a desk or shelf.
  face.rotation.x = -0.2;
  const foot = new Mesh(new BoxGeometry(W * 0.62, 6, 34), pla(hex));
  foot.position.set(0, -H / 2 - border + 1, -9);
  g.add(face, foot);
  return g;
}

export function placeholderPiece(font, label) {
  const g = new Group();
  g.userData.pose = "flat";
  const body = new Mesh(new ExtrudeGeometry(roundedRect(90, 60, 8), { depth: 2, bevelEnabled: false }), new MeshStandardMaterial({ color: 0x2a2a2f, roughness: 0.8 }));
  const t = new Mesh(fittedText(font, label, 70, 7, 1), new MeshStandardMaterial({ color: 0x8e8e95 }));
  t.position.z = 2.1;
  g.add(body, t);
  return g;
}
