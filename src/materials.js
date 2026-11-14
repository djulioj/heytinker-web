// Materials: PLA with faint printed-layer detail, and a polished metal for rings.
import { MeshStandardMaterial, Color, Vector3 } from "three";

const AXES = {
  z: { axis: new Vector3(0, 0, 1), diag: new Vector3(0.7071, 0.7071, 0) },
  y: { axis: new Vector3(0, 1, 0), diag: new Vector3(0.7071, 0, 0.7071) }
};

// Adds two normal perturbations in object space (millimetres):
// walls get 0.2 mm stacked layers along the print axis, top faces get 0.45 mm extrusion lines.
// Both fade out before they reach pixel size, so they never shimmer when the piece is far away.
function addLayerLines(material, axisName) {
  const a = AXES[axisName] || AXES.z;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uAxis = { value: a.axis };
    shader.uniforms.uDiag = { value: a.diag };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform vec3 uAxis;\nuniform vec3 uDiag;\nvarying vec3 vObjPos;\nvarying vec3 vObjN;\nvarying vec3 vAxisV;\nvarying vec3 vDiagV;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvObjPos = position;\nvObjN = normal;\nvAxisV = normalMatrix * uAxis;\nvDiagV = normalMatrix * uDiag;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 uAxis;\nuniform vec3 uDiag;\nvarying vec3 vObjPos;\nvarying vec3 vObjN;\nvarying vec3 vAxisV;\nvarying vec3 vDiagV;")
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
      {
        vec3 on = normalize(vObjN);
        float wall = 1.0 - abs(dot(on, uAxis));
        float pz = dot(vObjPos, uAxis) / 0.2;
        float fz = 1.0 - smoothstep(0.22, 0.5, fwidth(pz));
        float pt = dot(vObjPos, uDiag) / 0.45;
        float ft = 1.0 - smoothstep(0.22, 0.5, fwidth(pt));
        vec3 bump = vAxisV * (cos(pz * 6.2831853) * wall * fz * 0.16)
                  + vDiagV * (cos(pt * 6.2831853) * (1.0 - wall) * ft * 0.09);
        normal = normalize(normal + bump);
      }`);
  };
  material.customProgramCacheKey = () => "pla-lines";
}

export function pla(hex, opts = {}) {
  const m = new MeshStandardMaterial({
    color: new Color(hex),
    roughness: opts.roughness ?? 0.4,
    metalness: 0,
    vertexColors: !!opts.vertexColors
  });
  addLayerLines(m, opts.axis || "z");
  return m;
}

export const metal = () => new MeshStandardMaterial({ color: 0xc9c9cf, roughness: 0.22, metalness: 1.0 });

// Matte, non-printed surfaces (gift box, desk, phone glass).
export const matte = (hex, roughness = 0.85) => new MeshStandardMaterial({ color: new Color(hex), roughness, metalness: 0 });
