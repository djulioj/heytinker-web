// Build-time renderer for catalog and marketing images. Runs in headless Chrome via tools/render_catalog.py.
import { Font } from "three/examples/jsm/loaders/FontLoader.js";
import { createStage } from "../src/core.js";
import { buildTextPiece, buildLogoPiece, buildLithoPiece, buildReliefPiece, lidLabel } from "../src/pieces.js";
import { processLogo, processLitho, processRelief } from "../src/imaging.js";
import { buildConcept } from "../src/concepts.js";

const cfg = window.TINKER;
const C = Object.fromEntries(cfg.colors.map((c) => [c.id, c.hex]));
const product = (id) => cfg.configurable.find((p) => p.id === id);

// Sample artwork drawn here, so no third-party image is ever used in a render.
function samplePhoto(variant) {
  const c = document.createElement("canvas"); c.width = 480; c.height = 360;
  const x = c.getContext("2d");
  const sky = x.createLinearGradient(0, 0, 0, 240); sky.addColorStop(0, variant ? "#8ea3c8" : "#9db2d6"); sky.addColorStop(1, "#fff0d2");
  x.fillStyle = sky; x.fillRect(0, 0, 480, 360);
  const sun = x.createRadialGradient(variant ? 150 : 330, 150, 4, variant ? 150 : 330, 150, 90); sun.addColorStop(0, "#ffffff"); sun.addColorStop(0.35, "#ffe9c4"); sun.addColorStop(1, "rgba(255,233,196,0)");
  x.fillStyle = sun; x.fillRect(0, 0, 480, 360);
  const ridge = (y, amp, f, col, ph) => { x.fillStyle = col; x.beginPath(); x.moveTo(0, 360); for (let i = 0; i <= 480; i += 4) x.lineTo(i, y - amp * Math.abs(Math.sin(i * f + ph)) - amp * 0.35 * Math.sin(i * f * 2.7 + ph)); x.lineTo(480, 360); x.fill(); };
  ridge(215, 70, 0.011, "#b9b2c4", variant ? 2 : 0.4); ridge(250, 55, 0.017, "#7d7690", 1.7); ridge(292, 40, 0.024, "#3b3648", 0.3);
  x.fillStyle = "#1c1a24"; x.fillRect(0, 300, 480, 60);
  for (const [px, h] of [[70, 80], [96, 60], [400, 90], [428, 64]]) { x.beginPath(); x.moveTo(px, 305); x.lineTo(px - 16, 305); x.lineTo(px - 8, 305 - h); x.fill(); x.beginPath(); x.moveTo(px - 22, 305); x.lineTo(px + 6, 305); x.lineTo(px - 8, 305 - h * 0.7); x.fill(); }
  return c;
}
function sampleLogo() {
  const c = document.createElement("canvas"); c.width = 400; c.height = 400;
  const x = c.getContext("2d");
  x.fillStyle = "#ffffff"; x.fillRect(0, 0, 400, 400);
  x.fillStyle = C.azul; x.beginPath(); x.arc(200, 200, 170, 0, Math.PI * 2); x.fill();
  x.fillStyle = C.naranja; x.beginPath(); x.arc(250, 150, 46, 0, Math.PI * 2); x.fill();
  x.fillStyle = C.blanco; x.beginPath(); x.moveTo(60, 290); x.lineTo(160, 130); x.lineTo(215, 215); x.lineTo(250, 170); x.lineTo(340, 290); x.closePath(); x.fill();
  x.fillStyle = C.azul; x.beginPath(); x.moveTo(132, 175); x.lineTo(160, 130); x.lineTo(188, 175); x.lineTo(170, 165); x.lineTo(158, 180); x.lineTo(146, 166); x.closePath(); x.fill();
  return c;
}

let stage, font, samples;
async function init(w, h) {
  if (stage) return;
  font = new Font(await (await fetch("/assets/fonts/space-mono-bold.typeface.json")).json());
  const el = document.getElementById("stage");
  el.style.width = w + "px"; el.style.height = h + "px";
  stage = createStage(el, { interactive: false, maxDpr: 1, lidLabel: (lw) => lidLabel(font, lw) });
  const p1 = samplePhoto(0), p2 = samplePhoto(1);
  samples = { photo: processLitho(p1), photo2: processLitho(p2), relief: processRelief(p1), logo: processLogo(sampleLogo(), 3, nearest) };
}
function nearest(rgb) {
  let best = cfg.colors[0], bd = Infinity;
  for (const c of cfg.colors) { const n = parseInt(c.hex.slice(1), 16); const d = 2 * ((n >> 16) - rgb[0]) ** 2 + 4 * (((n >> 8) & 255) - rgb[1]) ** 2 + 3 * ((n & 255) - rgb[2]) ** 2; if (d < bd) { bd = d; best = c; } }
  return best;
}

function build(id, o) {
  switch (id) {
    case "llavero": return buildTextPiece(font, product("llavero"), { text: o.text || "Sofía", base: C[o.base || "negro"], ink: C[o.ink || "naranja"] });
    case "bola": return buildTextPiece(font, product("bola"), { text: "Mateo", base: C.rojo, ink: C.blanco });
    case "letrero": return buildTextPiece(font, product("letrero"), { text: "Ana Torres", subline: "Gerente de Diseño", base: C.negro, ink: C.naranja });
    case "topper": return buildTextPiece(font, product("topper"), { text: "Feliz 30", base: C.crema, ink: C.morado });
    case "logo": return buildLogoPiece(font, samples.logo, C.negro);
    case "litofania": return buildLithoPiece(font, samples.photo, C.negro, true);
    case "placa": return buildReliefPiece(font, samples.relief, C.crema);
    default: return buildConcept(id, font, C, samples);
  }
}

window.TINKER_RENDER = async (id, w, h, o = {}) => {
  await init(w, h);
  const piece = build(o.piece || id, o);
  if (!piece) throw new Error("unknown item " + id);
  const lit = (o.piece || id) === "litofania" || id === "cubo-litofanias";
  stage.setMode(o.mode || "table");
  stage.setPiece(piece, { fit: o.fit || 1, lit: lit && !o.unlit });
  if (o.elevation != null) stage.setView(o.elevation, o.azimuth ?? -0.42);
  return stage.snapshot(w, h).toDataURL("image/png");
};
