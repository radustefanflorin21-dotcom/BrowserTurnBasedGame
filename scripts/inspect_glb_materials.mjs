import fs from "fs";

const path = process.argv[2];
if (!path) {
  console.error("usage: node inspect_glb_materials.mjs <path.glb>");
  process.exit(1);
}
const buf = fs.readFileSync(path);
const jsonLen = buf.readUInt32LE(12);
const jsonChunk = buf.subarray(20, 20 + jsonLen).toString("utf8");
const gltf = JSON.parse(jsonChunk);
const mats = gltf.materials || [];
console.log("materials:", mats.length);
mats.forEach((m, i) => {
  const pbr = m.pbrMetallicRoughness || {};
  console.log(`#${i} ${m.name || "(unnamed)"}`, {
    emissiveFactor: m.emissiveFactor,
    emissiveTexture: m.emissiveTexture != null,
    metallicFactor: pbr.metallicFactor,
    roughnessFactor: pbr.roughnessFactor,
    baseColorFactor: pbr.baseColorFactor,
    extensions: Object.keys(m.extensions || {}),
  });
});
