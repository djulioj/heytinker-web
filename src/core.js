// Stage: renderer, lighting, camera and the three presentation scenes (studio, desk, gift box).
// Shared by the live studio and by the build-time catalog renderer.
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, Color, Fog,
  BoxGeometry, PlaneGeometry, CircleGeometry, ShadowMaterial,
  HemisphereLight, DirectionalLight, PointLight, Box3, Vector3, Spherical,
  SRGBColorSpace, NeutralToneMapping, PCFShadowMap, PMREMGenerator
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { matte } from "./materials.js";

const easeOut = (t) => 1 - Math.pow(1 - t, 3);

export function supportsWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!c.getContext("webgl2");
  } catch (e) { return false; }
}

export function disposeGroup(group) {
  group.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
  });
}

// Open-top box made of a floor and four walls, centered on x/z with its floor at y = 0.
export function openBox(w, d, h, t, material, floorMaterial) {
  const g = new Group();
  const floor = new Mesh(new BoxGeometry(w, t, d), floorMaterial || material);
  floor.position.y = t / 2;
  const mk = (bw, bd, x, z) => { const m = new Mesh(new BoxGeometry(bw, h, bd), material); m.position.set(x, h / 2, z); return m; };
  g.add(floor, mk(w, t, 0, d / 2 - t / 2), mk(w, t, 0, -d / 2 + t / 2), mk(t, d, w / 2 - t / 2, 0), mk(t, d, -w / 2 + t / 2, 0));
  return g;
}

export function createStage(container, opts = {}) {
  const interactive = opts.interactive !== false;
  const reduceMotion = !!opts.reduceMotion;
  // Phones get a lower pixel-ratio cap: the extra pixels cost more than they show.
  const coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  const maxDpr = opts.maxDpr || (coarse ? 1.5 : 2);

  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "default" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
  renderer.outputColorSpace = SRGBColorSpace;
  // Neutral tone mapping keeps filament colors close to their swatches (ACES desaturates the orange).
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 0.86;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.domElement.setAttribute("aria-hidden", "true");
  container.prepend(renderer.domElement);

  const scene = new Scene();
  const camera = new PerspectiveCamera(30, 1, 1, 8000);

  // Image-based lighting generated in the browser: soft studio reflections without any HDR download.
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  scene.environment = pmrem.fromScene(room, 0.04).texture;
  scene.environmentIntensity = 0.8;
  room.dispose();
  pmrem.dispose();

  const hemi = new HemisphereLight(0xffffff, 0x1c1c1f, 0.3);
  const key = new DirectionalLight(0xffffff, 1.25);
  key.castShadow = true;
  key.shadow.mapSize.set(coarse ? 512 : 1024, coarse ? 512 : 1024);
  key.shadow.radius = 5;
  key.shadow.bias = -0.0008;
  key.shadow.normalBias = 0.6;
  const rim = new DirectionalLight(0xffe2cc, 0.5);
  const glow = new PointLight(0xffd6a8, 0, 320, 1.4);
  scene.add(hemi, key, key.target, rim, glow);

  const root = new Group();   // piece + props for the current scene
  scene.add(root);
  const shadowCatcher = new Mesh(new PlaneGeometry(4000, 4000), new ShadowMaterial({ opacity: 0.38 }));
  shadowCatcher.rotation.x = -Math.PI / 2;
  shadowCatcher.receiveShadow = true;
  scene.add(shadowCatcher);

  let controls = null;
  if (interactive) {
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.maxPolarAngle = Math.PI * 0.58;
    controls.autoRotate = !reduceMotion;
    controls.autoRotateSpeed = 0.7;
    controls.addEventListener("start", () => { state.touched = true; controls.autoRotate = false; state.anim = null; });
    controls.addEventListener("change", () => { state.dirty = true; });
    // Vertical swipes keep scrolling the page on touch screens; horizontal drags rotate the piece.
    if (coarse) renderer.domElement.style.touchAction = "pan-y";
  }

  const state = { piece: null, props: null, mode: "studio", fit: 1, lit: false, touched: false, dirty: true, visible: true, anim: null, font: opts.font || null, target: new Vector3(), view: null };

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (state.view && !state.touched) placeCamera(state.view, false);
    state.dirty = true;
  }

  function markShadows(group) {
    group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  }

  // Gift box sized to the piece, with the lid resting behind it.
  function buildGiftBox(w, d, thickness) {
    const g = new Group();
    const card = matte("#161618", 0.7);
    const inner = matte("#222226", 0.95);
    const bw = Math.max(w + 22, 80), bd = Math.max(d + 22, 70), bh = Math.max(thickness + 12, 24);
    g.add(openBox(bw, bd, bh, 2.2, card, inner));
    const lid = new Group();
    const top = new Mesh(new BoxGeometry(bw + 5, bd + 5, 2.2), card);
    const rimDepth = 14;
    const mkRim = (rw, rh, x, y) => { const m = new Mesh(new BoxGeometry(rw, rh, rimDepth), card); m.position.set(x, y, -rimDepth / 2); return m; };
    lid.add(top, mkRim(bw + 5, 2.2, 0, (bd + 5) / 2 - 1.1), mkRim(bw + 5, 2.2, 0, -(bd + 5) / 2 + 1.1), mkRim(2.2, bd + 5, (bw + 5) / 2 - 1.1, 0), mkRim(2.2, bd + 5, -(bw + 5) / 2 + 1.1, 0));
    if (opts.lidLabel) { const label = opts.lidLabel(bw * 0.5); label.position.z = 1.15; lid.add(label); }
    // Lean the lid against the back wall of the box.
    lid.rotation.x = -0.36;
    lid.position.set(0, (bd + 5) / 2 * Math.cos(0.36) + rimDepth * Math.sin(0.36), -bd / 2 - 9 - (bd + 5) / 2 * Math.sin(0.36));
    g.add(lid);
    g.userData.floorY = 2.2;
    return g;
  }

  function layout(animate) {
    const piece = state.piece;
    if (!piece) return;
    if (state.props) { root.remove(state.props); disposeGroup(state.props); state.props = null; }
    scene.fog = null;
    shadowCatcher.visible = true;
    piece.position.set(0, 0, 0);
    piece.rotation.set(0, 0, 0);
    piece.updateMatrixWorld(true);

    const stands = piece.userData.pose === "stand";
    const onTable = state.mode === "desk" || state.mode === "table";
    const flat = state.mode === "box" || (onTable && !stands);
    if (flat) piece.rotation.x = -Math.PI / 2;
    piece.updateMatrixWorld(true);
    let box = new Box3().setFromObject(piece);
    const c = box.getCenter(new Vector3());
    let floorY = 0;
    // Studio: flat pieces hover a little above the floor so their shadow reads as depth.
    const size0 = box.getSize(new Vector3());
    const hover = state.mode === "studio" && !stands ? Math.max(size0.x, size0.y) * 0.07 : 0;

    if (state.mode === "box") {
      state.props = buildGiftBox(size0.x, size0.z, size0.y);
      floorY = state.props.userData.floorY;
    } else if (state.mode === "desk") {
      const desk = new Mesh(new CircleGeometry(3000, 48), matte("#19191C", 0.62));
      desk.rotation.x = -Math.PI / 2;
      desk.receiveShadow = true;
      state.props = new Group();
      state.props.add(desk);
      shadowCatcher.visible = false;
    }
    piece.position.set(-c.x, floorY + hover - box.min.y, -c.z);
    if (state.props) { markShadows(state.props); root.add(state.props); }
    piece.updateMatrixWorld(true);

    box = new Box3().setFromObject(piece);
    if (state.mode === "box") box.union(new Box3().setFromObject(state.props));
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const radius = size.length() * 0.5;
    state.target.copy(center);
    if (state.mode !== "box") state.target.y = (box.min.y + box.max.y) / 2 - hover * 0.5;

    // Key light and its shadow frustum follow the piece.
    key.position.set(center.x + radius * 0.9, center.y + radius * 2.6, center.z + radius * 1.5);
    key.target.position.copy(center);
    const sc = key.shadow.camera;
    sc.left = -radius * 1.7; sc.right = radius * 1.7; sc.top = radius * 1.7; sc.bottom = -radius * 1.7;
    sc.near = 1; sc.far = radius * 8;
    sc.updateProjectionMatrix();
    rim.position.set(center.x - radius * 2, center.y + radius * 0.6, center.z - radius * 1.2);
    glow.position.set(center.x, center.y, center.z + radius * 0.5);

    const elevation = state.mode === "studio" ? (stands ? 0.24 : 0.2) : onTable ? (stands ? 0.34 : 1.0) : 0.98;
    const azimuth = state.mode === "studio" ? -0.38 : -0.42;
    state.view = { radius, elevation, azimuth };
    if (state.mode === "desk") scene.fog = new Fog(new Color("#0C0C0E"), radius * 7, radius * 22);
    placeCamera(state.view, animate);
    state.dirty = true;
  }

  function cameraDistance(radius) {
    const v = (camera.fov * Math.PI) / 360;
    const h = Math.atan(Math.tan(v) * camera.aspect);
    // A bounding sphere overestimates flat pieces seen from the front, so the studio view sits closer.
    const k = state.mode === "studio" ? 0.9 : state.mode === "box" ? 1.08 : 1.0;
    return (radius / Math.sin(Math.min(v, h))) * k * state.fit;
  }

  function placeCamera(view, animate) {
    const dist = cameraDistance(view.radius);
    const to = new Spherical(dist, Math.PI / 2 - view.elevation, view.azimuth);
    if (controls) {
      controls.target.copy(state.target);
      controls.minDistance = dist * 0.4;
      controls.maxDistance = dist * 2.2;
    }
    if (animate && !reduceMotion && interactive) {
      // Camera intro: swing in from farther away and to the side, then settle.
      const from = new Spherical(dist * 1.35, to.phi - 0.12, to.theta + 0.9);
      state.anim = { from, to, t0: performance.now(), dur: 1100 };
      applySpherical(from);
    } else {
      state.anim = null;
      applySpherical(to);
    }
  }

  function applySpherical(s) {
    camera.position.setFromSpherical(s).add(state.target);
    camera.lookAt(state.target);
  }

  function setPiece(group, o = {}) {
    if (state.piece) { root.remove(state.piece); disposeGroup(state.piece); }
    state.piece = group;
    state.fit = o.fit || 1;
    state.lit = !!o.lit;
    markShadows(group);
    group.traverse((m) => { if (m.userData.noShadow) { m.castShadow = false; m.receiveShadow = false; } });
    root.add(group);
    // Lithophane "on": dim the room so the light behind the photo does the work.
    key.intensity = state.lit ? 0.25 : 1.25;
    rim.intensity = state.lit ? 0.1 : 0.5;
    hemi.intensity = state.lit ? 0.08 : 0.3;
    scene.environmentIntensity = state.lit ? 0.14 : 0.8;
    glow.intensity = state.lit ? 40 : 0;
    const keepView = state.touched && o.keepView;
    if (keepView) {
      const cam = camera.position.clone(), tgt = controls.target.clone();
      layout(false);
      camera.position.copy(cam); controls.target.copy(tgt); state.anim = null;
    } else {
      layout(!!o.intro);
    }
  }

  function setMode(mode) {
    state.mode = mode;
    state.touched = false;
    if (controls) controls.autoRotate = !reduceMotion && mode === "studio";
    layout(true);
  }

  function resetView() {
    state.touched = false;
    if (controls) controls.autoRotate = !reduceMotion && state.mode === "studio";
    layout(true);
  }

  function frame() {
    if (!state.visible) return;
    let moving = false;
    if (state.anim) {
      const t = Math.min(1, (performance.now() - state.anim.t0) / state.anim.dur), k = easeOut(t);
      const a = state.anim.from, b = state.anim.to;
      applySpherical(new Spherical(a.radius + (b.radius - a.radius) * k, a.phi + (b.phi - a.phi) * k, a.theta + (b.theta - a.theta) * k));
      if (t >= 1) state.anim = null;
      moving = true;
    } else if (controls) {
      moving = controls.update() || controls.autoRotate;
    }
    if (moving || state.dirty) {
      renderer.render(scene, camera);
      state.dirty = false;
    }
  }

  // Renders the current view at a fixed size onto a 2D canvas (transparent background).
  function snapshot(w, h) {
    const prevRatio = renderer.getPixelRatio();
    const prevW = container.clientWidth, prevH = container.clientHeight;
    const prevPos = camera.position.clone();
    renderer.setPixelRatio(1);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // Re-fit the distance for the new aspect ratio, keeping the viewing direction.
    const dir = camera.position.clone().sub(state.target).normalize();
    camera.position.copy(state.target).addScaledVector(dir, cameraDistance(state.view.radius));
    camera.lookAt(state.target);
    renderer.render(scene, camera);
    const out = document.createElement("canvas");
    out.width = w; out.height = h;
    out.getContext("2d").drawImage(renderer.domElement, 0, 0);
    renderer.setPixelRatio(prevRatio);
    if (prevW && prevH) { renderer.setSize(prevW, prevH, false); camera.aspect = prevW / prevH; }
    camera.updateProjectionMatrix();
    camera.position.copy(prevPos);
    camera.lookAt(state.target);
    state.dirty = true;
    return out;
  }

  if (interactive) {
    new ResizeObserver(resize).observe(container);
    // Stop rendering when the studio is off screen or the tab is hidden, to save battery.
    let onScreen = true;
    const sync = () => { state.visible = onScreen && !document.hidden; };
    new IntersectionObserver((entries) => { onScreen = entries[0].isIntersecting; sync(); }, { threshold: 0.02 }).observe(container);
    document.addEventListener("visibilitychange", sync);
    renderer.setAnimationLoop(frame);
  }
  resize();

  return {
    renderer, scene, camera, controls,
    setPiece, setMode, resetView, snapshot, resize,
    setFont: (f) => { state.font = f; },
    setView: (elevation, azimuth) => { state.view.elevation = elevation; state.view.azimuth = azimuth; placeCamera(state.view, false); },
    get mode() { return state.mode; },
    requestRender: () => { state.dirty = true; }
  };
}
