// 3D studio: live, rotatable previews for name pieces, logo keychains, photo lithophanes and relief plaques.
// Customer images are decoded and processed locally in the browser and never uploaded.
import { Font } from "three/examples/jsm/loaders/FontLoader.js";
import { createStage, supportsWebGL } from "./core.js";
import { buildTextPiece, buildLogoPiece, buildLithoPiece, buildReliefPiece, lidLabel } from "./pieces.js";
import { processLogo, processLitho, processRelief } from "./imaging.js";

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
    // Weighted RGB distance approximates perceived difference well enough for a small filament palette.
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
  scene: "studio",
  image: null,       // ImageBitmap of the customer's file (kept in memory only)
  logo: null,        // { w, h, fg, labels, palette } after processing
  litho: null,       // { w, h, lum } after processing
  relief: null       // { w, h, lum } after processing
};

const stageEl = $("stage");
const stageMsg = $("stage-msg");
const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let stage = null, font = null, firstBuild = true, lastProduct = null;

// ---------- Rebuild + UI ----------

function rebuild() {
  if (!stage || !font) return;
  const p = productById(state.product);
  const base = colorById(state.base).hex;
  let group;
  if (p.mode === "logo") group = buildLogoPiece(font, state.logo, base);
  else if (p.mode === "litho") group = buildLithoPiece(font, state.litho, base, state.light);
  else if (p.mode === "relief") group = buildReliefPiece(font, state.relief, base);
  else group = buildTextPiece(font, p, { text: state.text, subline: state.subline, base, ink: colorById(state.ink).hex });

  const lit = p.mode === "litho" && state.light && !!state.litho;
  stageEl.classList.toggle("is-lit", lit);
  // The camera swings in on first load and when the product changes; edits keep the current angle.
  const intro = firstBuild || lastProduct !== p.id;
  stage.setPiece(group, { lit, intro, keepView: !intro });
  firstBuild = false;
  lastProduct = p.id;
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

  document.querySelectorAll("#scene-modes button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.scene === state.scene)));
  const photo = mode === "litho" || mode === "relief";

  $("text-field").hidden = mode !== "text";
  $("subline-field").hidden = !(mode === "text" && p.subline);
  $("upload-field").hidden = mode === "text";
  $("logo-colors-field").hidden = mode !== "logo";
  $("ink-field").hidden = mode !== "text";
  $("light-toggle").hidden = mode !== "litho";
  $("light-toggle").setAttribute("aria-pressed", String(state.light));
  $("light-label").textContent = state.light ? "Apagar luz" : "Encender luz";
  $("base-title").textContent = mode === "litho" ? "Marco y base" : mode === "relief" ? "Color" : "Base";
  $("upload-title").textContent = photo ? "Tu foto" : "Tu logo o dibujo";

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
  } else if (mode === "relief") {
    lines.push(`- Color: ${colorById(state.base).name}`, `- Te adjunto la foto en este chat.`);
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
  if (p.mode === "relief" && state.base === "negro" && !state.relief) state.base = "crema";
  reprocessImage();
  update();
}

function reprocessImage() {
  const p = productById(state.product);
  if (!state.image) return;
  if (p.mode === "logo") state.logo = processLogo(state.image, state.k, nearestFilament);
  if (p.mode === "litho") state.litho = processLitho(state.image);
  if (p.mode === "relief") state.relief = processRelief(state.image);
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
    state.logo = null; state.litho = null; state.relief = null;
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
  $("view-reset").addEventListener("click", () => { if (stage) stage.resetView(); });
  document.querySelectorAll("#scene-modes button").forEach((b) => b.addEventListener("click", () => {
    state.scene = b.dataset.scene;
    if (stage) stage.setMode(state.scene);
    render();
  }));
  $("save-image").addEventListener("click", saveImage);
  $("config-form").addEventListener("submit", (e) => e.preventDefault());
  window.addEventListener("tinker:select", (e) => selectProduct(e.detail));
}

// ---------- Share image ----------

// Composes a 1080 x 1350 PNG (Instagram portrait) from the current view. It is built on a local
// canvas and handed to the share sheet or saved as a download; it never leaves the device otherwise.
async function saveImage() {
  if (!stage) return;
  const btn = $("save-image");
  btn.disabled = true;
  try {
    const W = 1080, H = 1350;
    const shot = stage.snapshot(W, H);
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const ctx = c.getContext("2d");
    const lit = stageEl.classList.contains("is-lit");
    const bg = ctx.createRadialGradient(W / 2, H * 0.3, 0, W / 2, H * 0.45, H * 0.85);
    bg.addColorStop(0, lit ? "#2a2016" : "#26262A");
    bg.addColorStop(0.6, lit ? "#0d0b09" : "#121214");
    bg.addColorStop(1, lit ? "#050505" : "#0B0B0C");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(shot, 0, 0);

    const logo = new Image();
    logo.src = "/assets/logo.svg";
    await logo.decode();
    const lw = 190, lh = lw * (logo.naturalHeight / logo.naturalWidth || 0.27);
    ctx.drawImage(logo, 64, H - 64 - lh, lw, lh);
    try { await document.fonts.load('400 24px "Space Mono"'); } catch (e) { /* falls back to a system monospace */ }
    ctx.font = '400 24px "Space Mono", monospace';
    ctx.fillStyle = "#8E8E95";
    ctx.textAlign = "right";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("Vista previa · heytinker.co", W - 64, H - 70);

    const blob = await new Promise((res) => c.toBlob(res, "image/png"));
    if (!blob) return;
    const name = `tinker-${state.product}.png`;
    const file = new File([blob], name, { type: "image/png" });
    const coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    if (coarse && navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: "Mi diseño Tinker" }); return; } catch (e) { if (e && e.name === "AbortError") return; }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  } finally {
    btn.disabled = false;
  }
}

// ---------- Boot ----------

async function boot() {
  buildControls();
  const tools = [$("scene-modes"), $("save-image")];
  if (!supportsWebGL()) {
    stageMsg.textContent = "Tu navegador no muestra 3D, pero igual puedes armar tu pedido.";
    tools.forEach((t) => { t.hidden = true; });
    selectProduct(window.TINKER_PENDING || state.product);
    return;
  }
  try {
    const res = await fetch("/assets/fonts/space-mono-bold.typeface.json", { credentials: "same-origin" });
    font = new Font(await res.json());
    stage = createStage(stageEl, { reduceMotion, lidLabel: (w) => lidLabel(font, w) });
    stageMsg.hidden = true;
  } catch (e) {
    stage = null;
    stageMsg.textContent = "No pudimos cargar la vista 3D. Igual puedes armar tu pedido.";
    tools.forEach((t) => { t.hidden = true; });
  }
  selectProduct(window.TINKER_PENDING || state.product);
}

boot();
