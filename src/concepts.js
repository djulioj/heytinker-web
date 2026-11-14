// Concept models for the catalog renders. Build-time only: this file is not part of the site bundle.
// Each one is an original Tinker design sketched from simple solids, sized to print on a 256 mm bed.
import {
  Group, Mesh, MeshBasicMaterial, BoxGeometry, CylinderGeometry, ConeGeometry, SphereGeometry, TorusGeometry,
  LatheGeometry, ExtrudeGeometry, BufferGeometry, BufferAttribute, InstancedMesh, Object3D, Shape, Path, Vector2, DoubleSide
} from "three";
import { pla, metal, matte } from "./materials.js";
import { fittedText, roundedRect, plate, buildLithoPiece } from "./pieces.js";
import { openBox } from "./core.js";

export function buildConcept(id, font, C, samples) {
  const PY = (hex, o = {}) => pla(hex, { axis: "y", ...o });
  const box = (w, h, d, hex, x = 0, y = 0, z = 0) => { const m = new Mesh(new BoxGeometry(w, h, d), PY(hex)); m.position.set(x, y, z); return m; };
  const cyl = (r, h, hex, x = 0, y = 0, z = 0, seg = 56, rTop = r) => { const m = new Mesh(new CylinderGeometry(rTop, r, h, seg), PY(hex)); m.position.set(x, y, z); return m; };
  const txt = (label, maxW, size, depth, hex) => new Mesh(fittedText(font, label, maxW, size, depth), pla(hex));
  const lying = (mesh, x, y, z) => { mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, y, z); return mesh; };
  const lathe = (pts, hex, seg = 72) => new Mesh(new LatheGeometry(pts.map((p) => new Vector2(p[0], p[1])), seg), PY(hex, {}));
  const star = (R, r, n = 5) => { const s = new Shape(); for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2 + Math.PI / 2, q = i % 2 ? r : R; (i ? s.lineTo : s.moveTo).call(s, Math.cos(a) * q, Math.sin(a) * q); } s.closePath(); return s; };
  const ringTab = (hex, x, y, depth) => {
    const s = new Shape(); s.absarc(0, 0, 5, 0, Math.PI * 2, false);
    const h = new Path(); h.absarc(0, 0, 2.2, 0, Math.PI * 2, true); s.holes.push(h);
    const tab = new Mesh(new ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 40 }), pla(hex)); tab.position.set(x, y, 0);
    const ring = new Mesh(new TorusGeometry(8, 0.9, 16, 64), metal()); ring.position.set(x, y + 7, depth / 2); ring.rotation.x = 0.45;
    return [tab, ring];
  };
  const g = new Group();
  g.userData.pose = "stand";
  const flat = () => { g.userData.pose = "flat"; };

  switch (id) {
    case "marcapaginas": {
      flat();
      const mk = (hex, ink, label, x, y, rot, z) => {
        const b = new Group();
        const s = roundedRect(34, 122, 7);
        const hole = new Path(); hole.absarc(0, 50, 3, 0, Math.PI * 2, true); s.holes.push(hole);
        b.add(plate(s, 1.2, hex, { bevelThickness: 0.2, bevelSize: 0.2 }));
        const t = txt(label, 84, 15, 0.8, ink); t.rotation.z = Math.PI / 2; t.position.set(0, -6, 1.4); b.add(t);
        b.position.set(x, y, z); b.rotation.z = rot; return b;
      };
      g.add(mk(C.morado, C.blanco, "Mateo", -24, 4, 0.16, 0), mk(C.crema, C.azul, "Lucía", 18, -4, -0.1, 1.6));
      break;
    }
    case "placa-mascota": {
      flat();
      const hex = C.rojo;
      const body = new Mesh(new ExtrudeGeometry(roundedRect(40, 20, 5), { depth: 3, bevelEnabled: false }), pla(hex));
      g.add(body);
      for (const [x, y] of [[-20, 8], [-20, -8], [20, 8], [20, -8]]) {
        const s = new Shape(); s.absarc(x, y, 9.5, 0, Math.PI * 2, false);
        g.add(new Mesh(new ExtrudeGeometry(s, { depth: 3, bevelEnabled: false, curveSegments: 48 }), pla(hex)));
      }
      const t = txt("Max", 36, 13, 1.2, C.blanco); t.position.z = 3.3; g.add(t);
      g.add(...ringTab(hex, 0, 14, 3));
      break;
    }
    case "adorno-navidad": {
      flat();
      g.add(plate(star(44, 24), 3, C["verde-navidad"]));
      const t = txt("Emma", 34, 10, 1.3, C.blanco); t.position.set(0, 3, 3.4);
      const y = txt("2026", 20, 5.5, 1.3, C.crema); y.position.set(0, -9, 3.4);
      g.add(t, y, ...ringTab(C["verde-navidad"], 0, 44, 3));
      break;
    }
    case "serpiente": {
      const n = 17;
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1), x = -78 + u * 150, z = 16 * Math.sin(u * 7.2);
        const dz = 16 * 7.2 * Math.cos(u * 7.2) / 150;
        const r = 4 + 4.2 * Math.sin(Math.min(1, u * 1.5 + 0.12) * Math.PI * 0.62);
        const seg = new Mesh(new CylinderGeometry(r, r, 7.6, 28), pla(i % 2 ? C.verde : C["verde-navidad"]));
        seg.rotation.z = Math.PI / 2; seg.rotation.y = -Math.atan(dz); seg.position.set(x, r, z);
        const wrap = new Group(); wrap.add(seg); g.add(wrap);
      }
      const hx = 80, hz = 16 * Math.sin(7.2) + 4;
      const head = new Mesh(new SphereGeometry(10, 40, 28), pla(C.verde)); head.scale.set(1.35, 0.8, 1); head.position.set(hx, 8, hz);
      const eye = (z) => { const e = new Mesh(new SphereGeometry(1.9, 16, 12), matte("#0b0b0c", 0.3)); e.position.set(hx + 6, 12.6, hz + z); return e; };
      const tongue = box(9, 1, 2.4, C.rojo, hx + 16, 6, hz);
      g.add(head, eye(5), eye(-5), tongue);
      break;
    }
    case "imanes": {
      flat();
      const tiles = [["A", C.rojo, -18, 18], ["M", C.azul, 18, 18], ["O", C.morado, -18, -18], ["R", C.naranja, 18, -18]];
      for (const [l, hex, x, y] of tiles) {
        const b = plate(roundedRect(32, 32, 7), 3, hex); b.position.set(x, y, 0);
        const t = txt(l, 20, 17, 1.2, C.blanco); t.position.set(x, y, 3.4);
        g.add(b, t);
      }
      break;
    }
    case "porta-tarjetas": {
      g.add(box(104, 8, 46, C.negro, 0, 4, 0));
      const back = box(104, 40, 5, C.negro, 0, 26, -17); back.rotation.x = -0.14; g.add(back);
      g.add(box(104, 15, 5, C.negro, 0, 14, 18));
      const cards = new Mesh(new BoxGeometry(90, 54, 9), matte("#EFEFEA", 0.7)); cards.rotation.x = -0.14; cards.position.set(0, 35, -6); g.add(cards);
      const t = txt("TU LOGO", 70, 7, 1, C.naranja); t.position.set(0, 14, 20.7); g.add(t);
      break;
    }
    case "maceta": {
      g.add(lathe([[0, 0], [24, 0], [26, 2], [32, 50], [33, 52], [30, 52], [29, 48], [0, 46]], C.crema));
      g.add(cyl(28.5, 2, C.cafe, 0, 47, 0));
      // A leaf is a cone tilted outward, then swung around the pot's axis.
      const leaf = (r, tilt, a, h, hex) => {
        const m = new Mesh(new ConeGeometry(4.2, h, 14), PY(hex)); m.position.y = h / 2;
        const w = new Group(); w.add(m);
        w.rotation.order = "YXZ"; w.rotation.y = a; w.rotation.z = -tilt;
        w.position.set(Math.cos(a) * r, 48, -Math.sin(a) * r);
        return w;
      };
      for (let i = 0; i < 9; i++) g.add(leaf(9, 0.75, (i / 9) * Math.PI * 2, 20, C.verde));
      for (let i = 0; i < 6; i++) g.add(leaf(4, 0.4, (i / 6) * Math.PI * 2 + 0.4, 22, C["verde-navidad"]));
      g.add(cyl(3.5, 22, C.verde, 0, 58, 0, 14, 0.4));
      const plq = box(34, 13, 4, C.crema, 0, 24, 28.6); plq.rotation.x = -0.12; g.add(plq);
      const t = txt("Mamá", 28, 8, 1, C.cafe); t.rotation.x = -0.12; t.position.set(0, 24, 30.9); g.add(t);
      break;
    }
    case "florero": {
      const rows = 110, cols = 140, Hh = 150;
      const pos = new Float32Array((rows + 1) * (cols + 1) * 3), idx = [];
      for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
        const t = j / rows, a = (i / cols) * Math.PI * 2;
        const r = 20 + 20 * Math.sin(Math.min(1, t * 1.25) * Math.PI) * (1 - t * 0.2) + 16 * Math.pow(t, 5) + 2.4 * Math.sin(12 * a + t * 5.5);
        const k = (j * (cols + 1) + i) * 3;
        pos[k] = Math.cos(a) * r; pos[k + 1] = t * Hh; pos[k + 2] = Math.sin(a) * r;
        if (j < rows && i < cols) { const p = j * (cols + 1) + i, q = p + cols + 1; idx.push(p, q, p + 1, p + 1, q, q + 1); }
      }
      const geo = new BufferGeometry(); geo.setAttribute("position", new BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
      const m = pla(C.morado, { axis: "y" }); m.side = DoubleSide;
      g.add(new Mesh(geo, m), cyl(20, 1.6, C.morado, 0, 0.8, 0));
      break;
    }
    case "trofeo": {
      g.add(box(46, 16, 46, C.negro, 0, 8, 0));
      g.add(lathe([[0, 16], [13, 16], [11, 20], [4.5, 28], [4.5, 44], [9, 50], [21, 58], [27, 76], [29, 96], [27, 96], [25, 78], [19, 63], [0, 58]], C.naranja));
      for (const s of [-1, 1]) { const h = new Mesh(new TorusGeometry(11, 2.4, 14, 40, Math.PI), pla(C.naranja)); h.rotation.z = -s * Math.PI / 2; h.position.set(s * 27, 78, 0); g.add(h); }
      const st = plate(star(9, 4.2), 1.4, C.negro, { bevelThickness: 0.2, bevelSize: 0.2 }); st.position.set(0, 80, 27.5); st.rotation.x = -0.08; g.add(st);
      const t = txt("Mejor mamá", 40, 5.2, 1, C.crema); t.position.set(0, 8, 23.2); g.add(t);
      break;
    }
    case "joyero-corazon": {
      const heart = () => { const s = new Shape(); s.moveTo(25, 25); s.bezierCurveTo(25, 25, 20, 0, 0, 0); s.bezierCurveTo(-30, 0, -30, 35, -30, 35); s.bezierCurveTo(-30, 55, -10, 77, 25, 95); s.bezierCurveTo(60, 77, 80, 55, 80, 35); s.bezierCurveTo(80, 35, 80, 0, 50, 0); s.bezierCurveTo(35, 0, 25, 25, 25, 25); return s; };
      const mk = (depth, hex, y, sc) => { const geo = new ExtrudeGeometry(heart(), { depth, curveSegments: 40, bevelEnabled: true, bevelThickness: 1, bevelSize: 1, bevelSegments: 4 }); geo.translate(-25, -47, 0); const m = new Mesh(geo, pla(hex)); m.rotation.x = Math.PI / 2; m.scale.set(0.8 * sc, 0.8 * sc, 1); m.position.y = y; return m; };
      g.add(mk(24, C.rojo, 25, 1), mk(7, C.rojo, 34, 1.03));
      const t = lying(txt("Laura", 44, 11, 1.2, C.blanco), 0, 35.2, -8); g.add(t);
      break;
    }
    case "nombre-bebe": {
      flat();
      g.add(plate(roundedRect(170, 64, 32), 3, C.crema));
      const t = txt("Luna", 118, 34, 3, C.morado); t.position.set(-4, 0, 3.4); g.add(t);
      for (const [x, y, r] of [[66, 14, 8], [72, -10, 5], [-70, 16, 5]]) { const s = plate(star(r, r * 0.46), 2, C.azul, { bevelThickness: 0.2, bevelSize: 0.2 }); s.position.set(x, y, 3.4); g.add(s); }
      break;
    }
    case "kit-escritorio": {
      const cup = lathe([[0, 0], [25, 0], [25, 74], [22, 74], [22, 4], [0, 4]], C.negro); cup.position.set(-52, 0, -8); g.add(cup);
      [[C.naranja, -0.14, 0.1, -6], [C.crema, 0.16, -0.12, 4], [C.azul, 0.02, 0.2, 0]].forEach(([hex, rz, rx, dx]) => { const p = cyl(3, 96, hex, -52 + dx, 52, -8, 20); p.rotation.set(rx, 0, rz); g.add(p); });
      g.add(box(64, 6, 74, C.negro, 26, 3, -8));
      const rest = box(64, 86, 6, C.negro, 26, 46, -26); rest.rotation.x = -0.32; g.add(rest);
      g.add(box(64, 13, 6, C.negro, 26, 12, 26));
      const t = txt("TU LOGO", 46, 5.6, 1, C.naranja); t.position.set(26, 12, 29.5); g.add(t);
      g.add(cyl(40, 4, C.negro, -30, 2, 62, 72));
      const ring = new Mesh(new TorusGeometry(33, 0.9, 10, 72), pla(C.naranja)); lying(ring, -30, 4.1, 62); g.add(ring);
      g.add(lying(txt("TU LOGO", 44, 6, 0.9, C.naranja), -30, 4.1, 62));
      break;
    }
    case "cubo-litofanias": {
      const S = 76, hex = C.negro;
      g.add(box(S + 14, 12, S + 14, hex, 0, 6, 0), box(S + 6, 5, S + 6, hex, 0, 12 + S + 2.5, 0));
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(box(6, S, 6, hex, x * S / 2, 12 + S / 2, z * S / 2));
      const D = samples.photo;
      const face = (ry, d) => {
        const p = buildLithoPiece(font, d, hex, true);
        const surf = p.children[1]; surf.geometry.scale(0.7, 0.7, 1);
        const w = new Group(); w.add(surf); surf.position.set(0, 0, S / 2 - 3); w.rotation.y = ry; w.position.y = 12 + S / 2; return w;
      };
      g.add(face(0, D), face(Math.PI / 2, samples.photo2 || D), face(-Math.PI / 2, D), face(Math.PI, D));
      const core = new Mesh(new BoxGeometry(S - 8, S - 2, S - 8), new MeshBasicMaterial({ color: 0x3a2a18 })); core.position.y = 12 + S / 2; core.userData.noShadow = true; g.add(core);
      break;
    }
    case "soporte-celular": {
      g.add(box(72, 6, 84, C.negro, 0, 3, 0));
      const rest = box(72, 100, 6, C.negro, 0, 52, -24); rest.rotation.x = -0.34; g.add(rest);
      g.add(box(72, 14, 6, C.negro, 0, 13, 34));
      const phone = new Mesh(new ExtrudeGeometry(roundedRect(70, 146, 10), { depth: 8, bevelEnabled: true, bevelThickness: 0.8, bevelSize: 0.8, bevelSegments: 3 }), matte("#1E1E22", 0.35));
      phone.rotation.x = -0.34; phone.position.set(0, 80, -2); g.add(phone);
      const screen = new Mesh(new ExtrudeGeometry(roundedRect(64, 140, 8), { depth: 0.3, bevelEnabled: false }), matte("#08080A", 0.12));
      screen.rotation.x = -0.34; screen.position.set(0, 80 + 8.9 * Math.sin(0.34), -2 + 8.9 * Math.cos(0.34)); g.add(screen);
      const t = txt("Dani", 50, 7.5, 1, C.naranja); t.position.set(0, 13, 37.5); g.add(t);
      break;
    }
    case "placa-qr": {
      const face = new Group();
      face.add(plate(roundedRect(84, 108, 7), 4, C.blanco));
      const N = 21, cell = 2.7, off = -((N - 1) * cell) / 2;
      let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const on = [];
      const finder = (cx, cy) => { for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) if (x === 0 || y === 0 || x === 6 || y === 6 || (x > 1 && x < 5 && y > 1 && y < 5)) on.push([cx + x, cy + y]); };
      finder(0, 0); finder(14, 0); finder(0, 14);
      const inFinder = (x, y) => (x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!inFinder(x, y) && rnd() > 0.52) on.push([x, y]);
      const im = new InstancedMesh(new BoxGeometry(cell, cell, 1), pla(C.negro), on.length), d = new Object3D();
      on.forEach(([x, y], i) => { d.position.set(off + x * cell, 12 - off - y * cell, 4.6); d.updateMatrix(); im.setMatrixAt(i, d.matrix); });
      face.add(im);
      const t = txt("Nuestra canción", 64, 5, 1, C.negro); t.position.set(0, -30, 4.5); face.add(t);
      const hs = new Shape(); hs.moveTo(0, -4); hs.bezierCurveTo(-8, 2, -4, 7, 0, 3); hs.bezierCurveTo(4, 7, 8, 2, 0, -4);
      const h = new Mesh(new ExtrudeGeometry(hs, { depth: 1, bevelEnabled: false, curveSegments: 24 }), pla(C.rojo)); h.position.set(0, -42, 4.5); face.add(h);
      face.rotation.x = -0.16; face.position.y = 58;
      g.add(face, box(60, 6, 32, C.blanco, 0, 3, -6));
      break;
    }
    case "arbol-navidad": {
      g.add(cyl(26, 4, C.cafe, 0, 2, 0, 48), cyl(5, 18, C.cafe, 0, 13, 0, 12));
      [[40, 46, 20], [32, 42, 46], [24, 38, 70], [16, 34, 92]].forEach(([r, h, y]) => { const c = new Mesh(new ConeGeometry(r, h, 7), PY(C["verde-navidad"])); c.position.y = y + h / 2; g.add(c); });
      const st = plate(star(10, 4.6), 3, C.naranja, { bevelThickness: 0.3, bevelSize: 0.3 }); st.position.set(0, 132, -1.5); g.add(st);
      break;
    }
    case "pesebre": {
      g.add(box(140, 5, 56, C.cafe, 0, 2.5, 0));
      const s = new Shape(); s.moveTo(-48, 0); s.lineTo(48, 0); s.lineTo(48, 52); s.lineTo(0, 92); s.lineTo(-48, 52); s.closePath();
      const hole = new Path(); hole.moveTo(-42, 6); hole.lineTo(-42, 49); hole.lineTo(0, 84); hole.lineTo(42, 49); hole.lineTo(42, 6); hole.closePath(); s.holes.push(hole);
      const house = new Mesh(new ExtrudeGeometry(s, { depth: 30, bevelEnabled: false }), pla(C.crema)); house.position.set(0, 5, -18); g.add(house);
      const fig = (x, r, h, hex, z = 2) => { const b = new Mesh(new ConeGeometry(r, h, 40), PY(hex)); b.position.set(x, 5 + h / 2, z); const hd = new Mesh(new SphereGeometry(r * 0.62, 28, 20), PY(C.crema)); hd.position.set(x, 5 + h + r * 0.3, z); g.add(b, hd); };
      fig(-22, 10, 34, C.azul); fig(22, 11, 40, C.cafe);
      g.add(box(18, 7, 12, C.cafe, 0, 8.5, 8));
      const baby = new Mesh(new SphereGeometry(5, 24, 16), PY(C.blanco)); baby.scale.set(1.5, 0.8, 0.9); baby.position.set(0, 15, 8); g.add(baby);
      const st = plate(star(9, 4), 3, C.naranja, { bevelThickness: 0.3, bevelSize: 0.3 }); st.position.set(0, 106, -5); g.add(st);
      break;
    }
    case "soporte-control": {
      g.add(box(120, 8, 76, C.negro, 0, 4, 0));
      for (const x of [-42, 42]) { const u = box(12, 52, 56, C.negro, x, 30, -4); u.rotation.x = -0.45; g.add(u); }
      const pad = new Group();
      pad.add(new Mesh(new ExtrudeGeometry(roundedRect(150, 62, 28), { depth: 26, bevelEnabled: true, bevelThickness: 3, bevelSize: 3, bevelSegments: 5 }), matte("#EDEDE8", 0.5)));
      for (const x of [-52, 52]) { const grip = new Mesh(new CylinderGeometry(15, 12, 46, 32), matte("#EDEDE8", 0.5)); grip.position.set(x, -34, 13); pad.add(grip); }
      for (const x of [-26, 26]) { const st = new Mesh(new CylinderGeometry(8, 8, 8, 28), matte("#151518", 0.5)); st.rotation.x = Math.PI / 2; st.position.set(x, -4, 31); pad.add(st); }
      for (const [x, y] of [[52, 16], [44, 8], [60, 8], [52, 0]]) { const b = new Mesh(new CylinderGeometry(3.4, 3.4, 4, 20), matte("#151518", 0.5)); b.rotation.x = Math.PI / 2; b.position.set(x, y + 4, 30); pad.add(b); }
      pad.rotation.x = -0.45 - Math.PI / 2 + 1.1; pad.position.set(0, 72, -6); g.add(pad);
      const t = txt("Santi", 56, 8, 1, C.naranja); t.position.set(0, 4, 38.6); g.add(t);
      break;
    }
    case "posavasos": {
      flat();
      [["J", -48, 48], ["M", 48, 48], ["A", -48, -48], ["L", 48, -48]].forEach(([l, x, y]) => {
        const d = new Shape(); d.absarc(0, 0, 44, 0, Math.PI * 2, false);
        const b = plate(d, 4, C.negro, { curveSegments: 72 }); b.position.set(x, y, 0);
        const r = new Shape(); r.absarc(0, 0, 38, 0, Math.PI * 2, false); const rh = new Path(); rh.absarc(0, 0, 35.5, 0, Math.PI * 2, true); r.holes.push(rh);
        const ring = new Mesh(new ExtrudeGeometry(r, { depth: 1, bevelEnabled: false, curveSegments: 72 }), pla(C.crema)); ring.position.set(x, y, 4.4);
        const t = txt(l, 30, 26, 1, C.crema); t.position.set(x, y, 4.4);
        g.add(b, ring, t);
      });
      break;
    }
    case "organizador": {
      g.add(box(160, 5, 90, C.negro, 0, 2.5, 0));
      const ob = (w, d, h, x, z) => { const o = openBox(w, d, h, 3, PY(C.negro)); o.position.set(x, 5, z); g.add(o); };
      ob(44, 44, 92, -54, -20); ob(56, 44, 62, 0, -20); ob(48, 44, 38, 54, -20); ob(156, 38, 20, 0, 24);
      [[C.naranja, -0.1, -60], [C.crema, 0.08, -50], [C.azul, 0.14, -56]].forEach(([hex, rz, x], i) => { const p = cyl(3.2, 120, hex, x, 70, -20 + (i - 1) * 6, 20); p.rotation.z = rz; g.add(p); });
      const t = txt("Valen", 70, 9, 1, C.crema); t.position.set(0, 15, 43.4); g.add(t);
      break;
    }
    case "soporte-audifonos": {
      g.add(cyl(52, 8, C.negro, 0, 4, 0, 72), box(18, 176, 18, C.negro, 0, 96, -8));
      const saddle = new Mesh(new TorusGeometry(26, 10, 20, 48, Math.PI), pla(C.negro)); saddle.position.set(0, 176, -8); g.add(saddle);
      const band = new Mesh(new TorusGeometry(64, 5, 16, 72, Math.PI * 1.08), matte("#EDEDE8", 0.45)); band.rotation.z = -Math.PI * 0.04; band.position.set(0, 148, -8); g.add(band);
      for (const s of [-1, 1]) { const cupm = new Mesh(new CylinderGeometry(30, 30, 24, 48), matte("#EDEDE8", 0.45)); cupm.rotation.z = Math.PI / 2; cupm.position.set(s * 66, 138, -8); const padm = new Mesh(new CylinderGeometry(27, 27, 8, 48), matte("#151518", 0.7)); padm.rotation.z = Math.PI / 2; padm.position.set(s * 52, 138, -8); g.add(cupm, padm); }
      g.add(lying(txt("Leo", 40, 12, 1, C.naranja), 0, 8.1, 28));
      break;
    }
    default:
      return null;
  }
  return g;
}
