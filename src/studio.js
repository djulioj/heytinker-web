// 3D studio: live, rotatable previews for name pieces, logo keychains and photo lithophanes.
// Customer images are decoded and processed locally in the browser and never uploaded.
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, InstancedMesh, Object3D, Color,
  MeshStandardMaterial, MeshBasicMaterial, BoxGeometry, CylinderGeometry, TorusGeometry,
  ExtrudeGeometry, BufferGeometry, Float32BufferAttribute, Shape, Path,
  HemisphereLight, DirectionalLight, AmbientLight, PointLight, Box3, Vector3, SRGBColorSpace,
  ACESFilmicToneMapping, CircleGeometry
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Font } from "three/examples/jsm/loaders/FontLoader.js";

const cfg = window.TINKER;
const $ = (id) => document.getElementById(id);
const money = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

// ---------- Small helpers ----------

function cleanText(value, max) {
  return String(value || "")
    .replace(/[\u0000-\u001F\u007F-\u009F<>]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^\s+/, "")
    .slice(0, max);
}

const clampQty = (v) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 500) : 1;
};

const colorById = (id) => cfg.colors.find((c) => c.id === id) || cfg.colors[0];
const productById = (id) => cfg.configurable.find((p) => p.id === id) || cfg.configurable[0];

function unitPrice(p, qty) {
  let unit = p.tiers[0].unit;
  for (const t of p.tiers) if (qty >= t.min) unit = t.unit;
  return unit;
}

const waNumber = /^\d{10,15}$/.test(cfg.whatsapp) ? cfg.whatsapp : null;
const waUrl = (msg) => (waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}` : "#");

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function nearestFilament(rgb) {
  let best = cfg.colors[0], bestD = Infinity;
  for (const c of cfg.colors) {
    const [r, g, b] = hexToRgb(c.hex);
    // Weighted RGB distance approximates perceived difference well enough for 9 swatches.
    const d = 2 * (r - rgb[0]) ** 2 + 4 * (g - rgb[1]) ** 2 + 3 * (b - rgb[2]) ** 2;
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}

// ---------- State ----------

const state = {
  product: cfg.configurable[0].id,
  text: "",
  subline: "",
  base: "negro",
  ink: "naranja",
  qty: 1,
  k: 3,
  light: false,
  image: null,       // ImageBitmap of the customer's file (kept in memory only)
  logo: null,        // { w, h, labels, palette } after processing
  litho: null        // { w, h, lum } after processing
};

// ---------- Three.js scene ----------

const stage = $("stage");
const stageMsg = $("stage-msg");
let renderer, scene, camera, controls, piece, font, keyLight, fillLight, glow;
let needsRender = true, visible = true, userTouched = false;

function supportsWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch (e) { return false; }
}

function initScene() {
  renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.domElement.setAttribute("aria-hidden", "true");
  stage.prepend(renderer.domElement);

  scene = new Scene();
  camera = new PerspectiveCamera(32, 1, 1, 2000);
  camera.position.set(0, -40, 190);

  scene.add(new HemisphereLight(0xffffff, 0x202024, 1.2));
  keyLight = new DirectionalLight(0xffffff, 2.2);
  keyLight.position.set(60, 90, 120);
  scene.add(keyLight);
  fillLight = new DirectionalLight(0xffe2cc, 0.6);
  fillLight.position.set(-90, -30, 60);
  scene.add(fillLight);
  scene.add(new AmbientLight(0xffffff, 0.15));
  glow = new PointLight(0xffd6a8, 0, 260, 1.4);
  scene.add(glow);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 80;
  controls.maxDistance = 420;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.2;
  controls.addEventListener("start", () => { userTouched = true; controls.autoRotate = false; });
  controls.addEventListener("change", () => { needsRender = true; });

  const ro = new ResizeObserver(resize);
  ro.observe(stage);
  resize();

  // Pause rendering when the studio is off screen or the tab is hidden, to save battery.
  new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; }, { threshold: 0.05 }).observe(stage);
  document.addEventListener("visibilitychange", () => { visible = !document.hidden; });

  renderer.setAnimationLoop(() => {
    if (!visible) return;
    const moved = controls.update();
    if (moved || needsRender || controls.autoRotate) {
      renderer.render(scene, camera);
      needsRender = false;
    }
  });
}

function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  needsRender = true;
}

function disposeGroup(group) {
  group.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
  });
}

function frame(group, distanceScale = 1) {
  // Center the piece and fit the camera to it.
  const box = new Box3().setFromObject(group);
  const center = box.getCenter(new Vector3());
  group.position.sub(center);
  const size = box.getSize(new Vector3());
  const radius = Math.max(size.x, size.y, size.z) * 0.5;
  const dist = (radius / Math.sin((camera.fov * Math.PI) / 360)) * 1.15 * distanceScale;
  if (!userTouched) {
    camera.position.set(0, -dist * 0.22, dist);
    controls.target.set(0, 0, 0);
  }
  controls.minDistance = dist * 0.45;
  controls.maxDistance = dist * 2.4;
  needsRender = true;
}

function setPiece(group, distanceScale) {
  if (piece) { scene.remove(piece); disposeGroup(piece); }
  piece = group;
  scene.add(piece);
  frame(piece, distanceScale);
}

// Plastic-looking material for PLA.
const pla = (hex) => new MeshStandardMaterial({ color: new Color(hex), roughness: 0.55, metalness: 0.0 });
const metal = () => new MeshStandardMaterial({ color: 0xc9c9cf, roughness: 0.25, metalness: 1.0 });

// ---------- Text pieces ----------

function textGeometry(text, size, depth) {
  const shapes = font.generateShapes(text, size);
  const geo = new ExtrudeGeometry(shapes, { depth, curveSegments: 5, bevelEnabled: false });
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  geo.translate(-(bb.min.x + bb.max.x) / 2, -(bb.min.y + bb.max.y) / 2, 0);
  geo.computeBoundingBox();
  return geo;
}

function fittedText(text, maxW, size, depth) {
  let geo = textGeometry(text, size, depth);
  const w = geo.boundingBox.max.x - geo.boundingBox.min.x;
  if (w > maxW) { geo.dispose(); geo = textGeometry(text, size * (maxW / w), depth); }
  return geo;
}

function roundedRect(w, h, r) {
  const s = new Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function buildTextPiece(p) {
  const base = colorById(state.base).hex, ink = colorById(state.ink).hex;
  const label = state.text.trim() || p.placeholder;
  const g = new Group();

  if (p.shape === "keychain") {
    const text = fittedText(label, 62, 12, 1.4);
    const tw = text.boundingBox.max.x - text.boundingBox.min.x;
    const th = text.boundingBox.max.y - text.boundingBox.min.y;
    const h = Math.max(th + 9, 20), w = tw + h + 8;
    const shape = roundedRect(w, h, h / 2);
    const hole = new Path(); hole.absarc(-w / 2 + h / 2, 0, 2.6, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    const plate = new Mesh(new ExtrudeGeometry(shape, { depth: 3, bevelEnabled: true, bevelThickness: 0.4, bevelSize: 0.4, bevelSegments: 2, curveSegments: 24 }), pla(base));
    const t = new Mesh(text, pla(ink));
    t.position.set(h / 2 - 2, 0, 3.2);
    const ring = new Mesh(new TorusGeometry(9, 0.9, 12, 48), metal());
    ring.position.set(-w / 2 + h / 2 - 7, 0, 1.5);
    ring.rotation.y = Math.PI / 2.4;
    g.add(plate, t, ring);
  } else if (p.shape === "ornament") {
    const r = 34;
    const disc = new Shape(); disc.absarc(0, 0, r, 0, Math.PI * 2, false);
    const plate = new Mesh(new ExtrudeGeometry(disc, { depth: 3, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.5, bevelSegments: 2, curveSegments: 64 }), pla(base));
    const text = fittedText(label, 52, 11, 1.4);
    const t = new Mesh(text, pla(ink)); t.position.z = 3.3;
    const cap = new Mesh(new BoxGeometry(14, 7, 5), pla(colorById("dorado").hex)); cap.position.set(0, r + 2, 1.5);
    const loop = new Mesh(new TorusGeometry(3.6, 0.8, 10, 32), metal()); loop.position.set(0, r + 8.5, 1.5);
    g.add(plate, t, cap, loop);
  } else if (p.shape === "sign") {
    const sub = state.subline.trim() || (p.subline && p.subline.placeholder) || "";
    const plateW = 120, plateH = 42;
    const face = new Group();
    const plate = new Mesh(new ExtrudeGeometry(roundedRect(plateW, plateH, 4), { depth: 4, bevelEnabled: true, bevelThickness: 0.4, bevelSize: 0.4, bevelSegments: 2 }), pla(base));
    const name = new Mesh(fittedText(label, 104, 11, 1.4), pla(ink)); name.position.set(0, sub ? 6 : 0, 4.2);
    face.add(plate, name);
    if (sub) {
      const s = new Mesh(fittedText(sub, 100, 5.2, 1.0), pla(ink)); s.position.set(0, -10, 4.2);
      face.add(s);
    }
    face.rotation.x = -0.32;
    const stand = new Mesh(new BoxGeometry(plateW, 6, 22), pla(base));
    stand.position.set(0, -plateH / 2 - 1, -6);
    g.add(face, stand);
    g.rotation.x = 0.25;
  } else {
    const text = fittedText(label, 110, 20, 3);
    const t = new Mesh(text, pla(ink));
    const tw = text.boundingBox.max.x - text.boundingBox.min.x;
    const th = text.boundingBox.max.y - text.boundingBox.min.y;
    const backing = new Mesh(new BoxGeometry(tw + 6, 4, 3), pla(ink));
    backing.position.set(0, -th / 2 + 1, 1.5);
    const stickGeo = new CylinderGeometry(1.4, 1.4, 55, 16);
    const s1 = new Mesh(stickGeo, pla(base)); s1.position.set(-tw * 0.25, -th / 2 - 27, 1.5);
    const s2 = new Mesh(stickGeo.clone(), pla(base)); s2.position.set(tw * 0.25, -th / 2 - 27, 1.5);
    g.add(t, backing, s1, s2);
  }
  return g;
}

// ---------- Image processing (local only) ----------

function readPixels(bitmap, maxSide) {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0, w, h);
  return { w, h, data: ctx.getImageData(0, 0, w, h).data };
}

function processLogo(bitmap, k) {
  const { w, h, data } = readPixels(bitmap, 120);
  const n = w * h;
  const fg = new Uint8Array(n);

  // Background: transparent pixels, or pixels close to the dominant border color.
  let hasAlpha = false;
  for (let i = 0; i < n; i++) if (data[i * 4 + 3] < 200) { hasAlpha = true; break; }
  let bg = null;
  if (!hasAlpha) {
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
    bg = [((bestKey >> 8) & 15) * 16 + 8, ((bestKey >> 4) & 15) * 16 + 8, (bestKey & 15) * 16 + 8];
  }
  const pts = [];
  for (let i = 0; i < n; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2], a = data[i * 4 + 3];
    const isBg = hasAlpha ? a < 128 : (r - bg[0]) ** 2 + (g - bg[1]) ** 2 + (b - bg[2]) ** 2 < 2200;
    if (!isBg) { fg[i] = 1; pts.push(i); }
  }
  if (pts.length < 20) return null;

  // k-means on foreground colors, seeded with spread-out samples.
  const centers = [];
  for (let c = 0; c < k; c++) {
    const i = pts[Math.floor(((c + 0.5) / k) * pts.length)] * 4;
    centers.push([data[i], data[i + 1], data[i + 2]]);
  }
  const labels = new Int8Array(n).fill(-1);
  for (let iter = 0; iter < 10; iter++) {
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
  // Snap each cluster to the closest real filament we stock.
  const palette = centers.map((c) => nearestFilament(c));
  return { w, h, fg, labels, palette };
}

function processLitho(bitmap) {
  const { w, h, data } = readPixels(bitmap, 180);
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    lum[i] = (0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2]) / 255;
  }
  return { w, h, lum };
}

// ---------- Logo keychain ----------

function buildLogoPiece() {
  const g = new Group();
  const L = state.logo;
  const base = colorById(state.base).hex;
  if (!L) return placeholderPiece("Sube tu logo");

  const px = 48 / Math.max(L.w, L.h); // final piece about 48 mm on its longest side
  const dummy = new Object3D();

  // Base silhouette: foreground dilated by two pixels so the logo sits on a border.
  const dil = new Uint8Array(L.w * L.h);
  for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
    if (!L.fg[y * L.w + x]) continue;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < L.w && ny < L.h && dx * dx + dy * dy <= 5) dil[ny * L.w + nx] = 1;
    }
  }
  const baseCount = dil.reduce((a, v) => a + v, 0);
  const fgCount = L.fg.reduce((a, v) => a + v, 0);
  const cell = new BoxGeometry(px * 1.02, px * 1.02, 1);
  const baseMesh = new InstancedMesh(cell, pla(base), baseCount);
  const topMesh = new InstancedMesh(cell.clone(), new MeshStandardMaterial({ roughness: 0.55 }), fgCount);
  let bi = 0, ti = 0;
  const col = new Color();
  for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
    const i = y * L.w + x;
    const cx = (x - L.w / 2) * px, cy = (L.h / 2 - y) * px;
    if (dil[i]) {
      dummy.position.set(cx, cy, 1.25); dummy.scale.set(1, 1, 2.5); dummy.updateMatrix();
      baseMesh.setMatrixAt(bi++, dummy.matrix);
    }
    if (L.fg[i]) {
      dummy.position.set(cx, cy, 3.0); dummy.scale.set(1, 1, 1.0); dummy.updateMatrix();
      topMesh.setMatrixAt(ti, dummy.matrix);
      topMesh.setColorAt(ti++, col.set(L.palette[L.labels[i]].hex));
    }
  }
  g.add(baseMesh, topMesh);

  // Ring tab at the top center.
  let topY = 0;
  for (let y = 0; y < L.h && !topY; y++) for (let x = 0; x < L.w; x++) if (dil[y * L.w + x]) { topY = (L.h / 2 - y) * px; break; }
  const tabShape = new Shape(); tabShape.absarc(0, 0, 5, 0, Math.PI * 2, false);
  const tabHole = new Path(); tabHole.absarc(0, 0, 2.2, 0, Math.PI * 2, true); tabShape.holes.push(tabHole);
  const tab = new Mesh(new ExtrudeGeometry(tabShape, { depth: 2.5, bevelEnabled: false, curveSegments: 32 }), pla(base));
  tab.position.set(0, topY + 2.5, 0);
  const ring = new Mesh(new TorusGeometry(8, 0.9, 12, 48), metal());
  ring.position.set(0, topY + 9.5, 1.25); ring.rotation.x = Math.PI / 2.3;
  g.add(tab, ring);
  return g;
}

// ---------- Lithophane ----------

function buildLithoPiece() {
  const g = new Group();
  const D = state.litho;
  const frameHex = colorById(state.base).hex;
  if (!D) return placeholderPiece("Sube tu foto");

  const W = 100, H = W * (D.h / D.w);
  const minT = 0.8, maxT = 3.0;
  const cols = D.w, rows = D.h;
  const pos = [], colors = [], idx = [];
  // Front surface: darker pixels are thicker, exactly like the printed piece.
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const l = D.lum[y * cols + x];
    const t = minT + (1 - l) * (maxT - minT);
    pos.push((x / (cols - 1) - 0.5) * W, (0.5 - y / (rows - 1)) * H, t);
    // Light passing through: thinner means brighter, warm LED tint.
    const tr = Math.exp(-1.25 * (t - minT));
    colors.push(1.0 * tr, 0.86 * tr, 0.66 * tr);
  }
  for (let y = 0; y < rows - 1; y++) for (let x = 0; x < cols - 1; x++) {
    const a = y * cols + x, b = a + 1, c = a + cols, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(pos, 3));
  geo.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();

  const mat = state.light
    ? new MeshBasicMaterial({ vertexColors: true })
    : new MeshStandardMaterial({ color: 0xf1f0ea, roughness: 0.7 });
  const surface = new Mesh(geo, mat);
  const back = new Mesh(new BoxGeometry(W, H, minT), state.light ? new MeshBasicMaterial({ color: 0x2a2118 }) : pla("#ECEBE5"));
  back.position.z = minT / 2 - 0.01;

  // Frame and LED base in the chosen color.
  const border = 4;
  const fShape = roundedRect(W + border * 2, H + border * 2, 3);
  const fHole = new Path();
  fHole.moveTo(-W / 2, -H / 2); fHole.lineTo(W / 2, -H / 2); fHole.lineTo(W / 2, H / 2); fHole.lineTo(-W / 2, H / 2); fHole.lineTo(-W / 2, -H / 2);
  fShape.holes.push(fHole);
  const frameMesh = new Mesh(new ExtrudeGeometry(fShape, { depth: 5, bevelEnabled: false }), pla(frameHex));
  frameMesh.position.z = -1;
  const baseBox = new Mesh(new BoxGeometry(W + 16, 14, 26), pla(frameHex));
  baseBox.position.set(0, -H / 2 - border - 7, 1);
  const led = new Mesh(new BoxGeometry(W * 0.8, 1.2, 4), new MeshBasicMaterial({ color: state.light ? 0xffd9a8 : 0x3a3a40 }));
  led.position.set(0, -H / 2 - border + 0.4, 1.5);
  g.add(back, surface, frameMesh, baseBox, led);
  return g;
}

function placeholderPiece(label) {
  const g = new Group();
  const plate = new Mesh(new ExtrudeGeometry(roundedRect(90, 60, 8), { depth: 2, bevelEnabled: false }), new MeshStandardMaterial({ color: 0x2a2a2f, roughness: 0.8 }));
  const t = new Mesh(fittedText(label, 70, 7, 1), new MeshStandardMaterial({ color: 0x8e8e95 }));
  t.position.z = 2.1;
  g.add(plate, t);
  return g;
}

// ---------- Rebuild + UI ----------

function rebuild() {
  if (!renderer || !font) return;
  const p = productById(state.product);
  let group;
  if (p.mode === "logo") group = buildLogoPiece();
  else if (p.mode === "litho") group = buildLithoPiece();
  else group = buildTextPiece(p);
  setPiece(group, p.mode === "litho" ? 0.9 : p.shape === "topper" ? 1.4 : 1);

  // Lighting mood for the lithophane "on" state.
  const lit = p.mode === "litho" && state.light && state.litho;
  stage.classList.toggle("is-lit", !!lit);
  glow.intensity = lit ? 30 : 0;
  glow.position.set(0, 0, 40);
  keyLight.intensity = lit ? 0.4 : 2.2;
}

function render() {
  const p = productById(state.product);
  const qty = state.qty;
  const unit = unitPrice(p, qty);
  const total = unit * qty;
  const mode = p.mode;

  document.querySelectorAll("#product-chips button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.id === state.product)));
  document.querySelectorAll("#base-swatches .swatch").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.id === state.base)));
  document.querySelectorAll("#text-swatches .swatch").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.id === state.ink)));
  document.querySelectorAll("#logo-k button").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.k) === state.k)));

  $("text-field").hidden = mode !== "text";
  $("subline-field").hidden = !(mode === "text" && p.subline);
  $("upload-field").hidden = mode === "text";
  $("logo-colors-field").hidden = mode !== "logo";
  $("ink-field").hidden = mode !== "text";
  $("light-toggle").hidden = mode !== "litho";
  $("light-toggle").setAttribute("aria-pressed", String(state.light));
  $("light-label").textContent = state.light ? "Apagar luz" : "Encender luz";
  $("base-title").textContent = mode === "litho" ? "Marco y base" : "Base";
  $("upload-title").textContent = mode === "litho" ? "Tu foto" : "Tu logo o dibujo";

  $("base-name").textContent = colorById(state.base).name;
  $("text-name").textContent = colorById(state.ink).name;
  $("contrast-warn").hidden = !(mode === "text" && state.base === state.ink);
  if (mode === "text") $("cfg-count").textContent = `(${state.text.length}/${p.maxChars})`;
  if (mode === "logo" && state.logo) {
    $("logo-palette").textContent = "Filamentos: " + [...new Set(state.logo.palette.map((c) => c.name))].join(", ");
  } else {
    $("logo-palette").textContent = "";
  }

  $("cfg-total").textContent = money.format(total);
  $("cfg-unit").textContent = qty > 1 ? `${money.format(unit)} c/u` : "";
  $("cfg-note").textContent = p.note || "";
  $("cfg-qty").value = qty;
  $("send-hint").textContent = mode === "text"
    ? "El envío se cotiza aparte según tu ciudad."
    : "Al abrir WhatsApp, adjunta tu imagen en el chat. El envío se cotiza aparte.";

  const lines = [`Hola Tinker, quiero hacer este pedido:`, `- Producto: ${p.name}`];
  if (mode === "text") {
    lines.push(`- Texto: ${state.text.trim() || "(por definir)"}`);
    if (p.subline) lines.push(`- Segunda línea: ${state.subline.trim() || "(por definir)"}`);
    lines.push(`- Colores: base ${colorById(state.base).name}, texto ${colorById(state.ink).name}`);
  } else if (mode === "logo") {
    lines.push(`- Base: ${colorById(state.base).name}`);
    if (state.logo) lines.push(`- Colores del logo: ${[...new Set(state.logo.palette.map((c) => c.name))].join(", ")}`);
    lines.push(`- Te adjunto el logo en este chat.`);
  } else {
    lines.push(`- Marco y base: ${colorById(state.base).name}`, `- Te adjunto la foto en este chat.`);
  }
  lines.push(`- Cantidad: ${qty}`, `- Total estimado: ${money.format(total)}`, "", "Mi ciudad para el envío es: ");
  $("cfg-send").setAttribute("href", waUrl(lines.join("\n")));
}

function update(rebuild3d = true) {
  render();
  if (rebuild3d) rebuild();
}

function selectProduct(id) {
  const p = productById(id);
  state.product = p.id;
  state.light = false;
  if (p.mode === "text") {
    const input = $("cfg-text");
    input.maxLength = p.maxChars;
    input.placeholder = p.placeholder;
    state.text = cleanText(state.text, p.maxChars);
    input.value = state.text;
    if (p.subline) { $("cfg-sub").maxLength = p.subline.maxChars; $("cfg-sub").placeholder = p.subline.placeholder; }
  }
  if (p.mode === "litho" && state.base === "negro" && !state.litho) state.base = "blanco";
  reprocessImage();
  update();
}

function reprocessImage() {
  const p = productById(state.product);
  if (!state.image) return;
  if (p.mode === "logo") state.logo = processLogo(state.image, state.k);
  if (p.mode === "litho") state.litho = processLitho(state.image);
}

async function handleFile(file) {
  const err = $("upload-error");
  err.hidden = true;
  if (!file) return;
  if (!ALLOWED_TYPES.includes(file.type)) { err.textContent = "Usa una imagen PNG, JPG o WEBP."; err.hidden = false; return; }
  if (file.size > MAX_FILE_BYTES) { err.textContent = "La imagen pesa más de 15 MB. Prueba con una más liviana."; err.hidden = false; return; }
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    if (state.image && state.image.close) state.image.close();
    state.image = bmp;
    state.logo = null; state.litho = null;
    reprocessImage();
    const p = productById(state.product);
    if (p.mode === "logo" && !state.logo) { err.textContent = "No encontramos un dibujo claro. Prueba con un logo sobre fondo liso o transparente."; err.hidden = false; }
    $("upload-text").textContent = "Imagen lista · toca para cambiarla";
    update();
  } catch (e) {
    err.textContent = "No pudimos leer esa imagen. Prueba con otra.";
    err.hidden = false;
  }
}

function buildControls() {
  const chips = $("product-chips");
  for (const p of cfg.configurable) {
    const b = document.createElement("button");
    b.type = "button"; b.dataset.id = p.id; b.textContent = p.short;
    b.setAttribute("aria-pressed", "false");
    b.addEventListener("click", () => selectProduct(p.id));
    chips.appendChild(b);
  }
  const swatches = (containerId, key) => {
    const wrap = $(containerId);
    for (const c of cfg.colors) {
      const b = document.createElement("button");
      b.type = "button"; b.className = "swatch"; b.dataset.id = c.id; b.title = c.name;
      b.setAttribute("aria-label", c.name); b.setAttribute("aria-pressed", "false");
      b.style.background = c.hex;
      b.addEventListener("click", () => { state[key] = c.id; update(); });
      wrap.appendChild(b);
    }
  };
  swatches("base-swatches", "base");
  swatches("text-swatches", "ink");

  $("cfg-text").addEventListener("input", (e) => {
    state.text = cleanText(e.target.value, productById(state.product).maxChars);
    if (e.target.value !== state.text) e.target.value = state.text;
    update();
  });
  $("cfg-sub").addEventListener("input", (e) => {
    const p = productById(state.product);
    state.subline = cleanText(e.target.value, p.subline ? p.subline.maxChars : 24);
    update();
  });
  $("cfg-qty").addEventListener("change", (e) => { state.qty = clampQty(e.target.value); update(false); });
  $("qty-minus").addEventListener("click", () => { state.qty = clampQty(state.qty - 1); update(false); });
  $("qty-plus").addEventListener("click", () => { state.qty = clampQty(state.qty + 1); update(false); });
  $("cfg-file").addEventListener("change", (e) => handleFile(e.target.files && e.target.files[0]));
  document.querySelectorAll("#logo-k button").forEach((b) => b.addEventListener("click", () => {
    state.k = Number(b.dataset.k); reprocessImage(); update();
  }));
  $("light-toggle").addEventListener("click", () => { state.light = !state.light; update(); });
  $("view-reset").addEventListener("click", () => { userTouched = false; controls.autoRotate = true; if (piece) frame(piece); });
  $("config-form").addEventListener("submit", (e) => e.preventDefault());
  window.addEventListener("tinker:select", (e) => selectProduct(e.detail));
}

// ---------- Boot ----------

async function boot() {
  buildControls();
  if (!supportsWebGL()) {
    stageMsg.textContent = "Tu navegador no muestra 3D, pero igual puedes armar tu pedido.";
    selectProduct(window.TINKER_PENDING || state.product);
    return;
  }
  try {
    const res = await fetch("/assets/fonts/space-mono-bold.typeface.json", { credentials: "same-origin" });
    font = new Font(await res.json());
    initScene();
    stageMsg.hidden = true;
  } catch (e) {
    stageMsg.textContent = "No pudimos cargar la vista 3D. Igual puedes armar tu pedido.";
  }
  selectProduct(window.TINKER_PENDING || state.product);
}

boot();
