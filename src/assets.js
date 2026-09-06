import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const geometryCache = new Map();
export const vector = (values) => new THREE.Vector3(...values);

export function seededRandom(seed = 417) {
  let current = seed;
  return () => {
    current = (Math.imul(current, 1664525) + 1013904223) >>> 0;
    return current / 4294967296;
  };
}

export function surfaceTextures() {
  const random = seededRandom();
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const context = canvas.getContext('2d');
  context.fillStyle = '#bfc1be';
  context.fillRect(0, 0, 512, 512);
  for (let index = 0; index < 45; index += 1) {
    const centerX = random() * 512;
    const centerY = random() * 512;
    const radius = 8 + random() * 55;
    const stain = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    stain.addColorStop(0, 'rgba(32,39,36,0.045)');
    stain.addColorStop(1, 'rgba(32,39,36,0)');
    context.fillStyle = stain;
    context.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
  }
  for (let index = 0; index < 15000; index += 1) {
    const value = Math.floor(165 + random() * 80);
    context.fillStyle = 'rgba(' + value + ',' + value + ',' + value + ',0.22)';
    context.fillRect(random() * 512, random() * 512, 1 + random() * 3, 1);
  }
  for (let index = 0; index < 130; index += 1) {
    const startX = random() * 512;
    const startY = random() * 512;
    context.strokeStyle = random() > 0.5 ? '#969696' : '#eeeeee';
    context.lineWidth = 0.4;
    context.beginPath();
    context.moveTo(startX, startY);
    context.lineTo(startX + random() * 25, startY - random() * 6);
    context.stroke();
  }
  const color = new THREE.CanvasTexture(canvas);
  color.colorSpace = THREE.SRGBColorSpace;
  color.wrapS = color.wrapT = THREE.RepeatWrapping;
  color.anisotropy = 8;
  const roughness = color.clone();
  roughness.colorSpace = THREE.NoColorSpace;
  roughness.needsUpdate = true;
  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = normalCanvas.height = 512;
  const normalContext = normalCanvas.getContext('2d');
  const pixels = normalContext.createImageData(512, 512);
  for (let offset = 0; offset < pixels.data.length; offset += 4) {
    pixels.data[offset] = 124 + random() * 8;
    pixels.data[offset + 1] = 124 + random() * 8;
    pixels.data[offset + 2] = 255;
    pixels.data[offset + 3] = 255;
  }
  normalContext.putImageData(pixels, 0, 0);
  const normal = new THREE.CanvasTexture(normalCanvas);
  normal.wrapS = normal.wrapT = THREE.RepeatWrapping;
  return { color, roughness, normal };
}

export function makeMaterials() {
  const textures = surfaceTextures();
  const metal = (color, metalness, roughness) => new THREE.MeshStandardMaterial({
    color, metalness, roughness, map: textures.color,
    roughnessMap: textures.roughness, normalMap: textures.normal,
    normalScale: new THREE.Vector2(0.18, 0.18)
  });
  const materials = {
    ivory: metal('#9ea8a5', 0.72, 0.57),
    paint: metal('#25505a', 0.65, 0.39),
    dark: metal('#171d24', 0.78, 0.48),
    steel: metal('#68777f', 0.92, 0.28),
    rubber: metal('#080c10', 0.12, 0.94),
    bronze: metal('#977955', 0.8, 0.41),
    floor: metal('#394144', 0.73, 0.57),
    wall: metal('#303839', 0.64, 0.65),
    caution: metal('#b78b32', 0.45, 0.6),
    black: new THREE.MeshStandardMaterial({ color: '#03070b', roughness: 0.44, metalness: 0.35 }),
    cyan: new THREE.MeshStandardMaterial({ color: '#71e9ef', emissive: '#2fa9c7', emissiveIntensity: 2.2, metalness: 0.2, roughness: 0.2 }),
    amber: new THREE.MeshStandardMaterial({ color: '#ffe2a0', emissive: '#ffbd56', emissiveIntensity: 2.6 }),
    white: new THREE.MeshStandardMaterial({ color: '#fff7e6', emissive: '#d8eaff', emissiveIntensity: 3 }),
    red: new THREE.MeshStandardMaterial({ color: '#ef644d', emissive: '#de3519', emissiveIntensity: 2.5 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#092a39', metalness: 0.83, roughness: 0.13, clearcoat: 1 })
  };
  Object.entries(materials).forEach(([name, material]) => { material.name = name; });
  return materials;
}

export function forkMaterials(materials, palette = {}) {
  const scoped = { ...materials };
  const cloneNames = ['paint', 'ivory', 'cyan', 'amber', 'glass'];
  cloneNames.forEach(name => {
    if (!materials[name]?.clone) return;
    scoped[name] = materials[name].clone();
    scoped[name].userData.disposeOnModel = true;
  });
  applyMaterialColors(scoped, palette);
  return scoped;
}

export function applyMaterialColors(materials, palette = {}) {
  if (palette.base) materials.paint.color.set(palette.base);
  if (palette.secondary) materials.ivory.color.set(palette.secondary);
  if (palette.accent) {
    materials.cyan.color.set(palette.accent);
    materials.cyan.emissive.set(palette.accent).multiplyScalar(0.68);
    materials.amber.color.set(palette.accent);
    materials.amber.emissive.set(palette.accent).multiplyScalar(0.55);
    materials.glass.color.set(palette.accent).multiplyScalar(0.18);
  }
}

function geometry(key, factory) {
  if (!geometryCache.has(key)) geometryCache.set(key, factory());
  return geometryCache.get(key);
}

export function mesh(parent, shape, material, position = [0, 0, 0], rotation = [0, 0, 0]) {
  const object = new THREE.Mesh(shape, material);
  object.position.set(...position);
  object.rotation.set(...rotation);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}

export function box(parent, size, position, material, radius = 0.03, rotation) {
  const safeRadius = Math.min(radius, ...size.map(value => value / 3));
  const key = 'box:' + size.join(',') + ':' + safeRadius;
  return mesh(parent, geometry(key, () => safeRadius ? new RoundedBoxGeometry(...size, 1, safeRadius) : new THREE.BoxGeometry(...size)), material, position, rotation);
}

export function plate(parent, size, position, material, corner = 0.12, rotation) {
  const [width, height, depth] = size;
  const inset = Math.min(width / 3, height / 3, corner);
  const key = 'plate:' + size.join(',') + ':' + inset;
  return mesh(parent, geometry(key, () => {
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2 + inset, -height / 2);
    shape.lineTo(width / 2 - inset, -height / 2);
    shape.lineTo(width / 2, -height / 2 + inset);
    shape.lineTo(width / 2, height / 2 - inset);
    shape.lineTo(width / 2 - inset, height / 2);
    shape.lineTo(-width / 2 + inset, height / 2);
    shape.lineTo(-width / 2, height / 2 - inset);
    shape.lineTo(-width / 2, -height / 2 + inset);
    shape.closePath();
    const result = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 1, steps: 1, curveSegments: 1 });
    result.translate(0, 0, -depth / 2);
    return result;
  }), material, position, rotation);
}

export function fin(parent, points, depth, position, material, rotation = [0, 0, 0]) {
  const key = 'fin:' + JSON.stringify(points) + ':' + depth;
  const shape = geometry(key, () => {
    const outline = new THREE.Shape();
    outline.moveTo(...points[0]);
    points.slice(1).forEach(point => outline.lineTo(...point));
    outline.closePath();
    const result = new THREE.ExtrudeGeometry(outline, { depth, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 1, steps: 1, curveSegments: 1 });
    result.translate(0, 0, -depth / 2);
    return result;
  });
  return mesh(parent, shape, material, position, rotation);
}

export function cylinder(parent, radius, length, position, material, rotation = [0, 0, 0], segments = 20, topRadius = radius) {
  return mesh(parent, geometry('cylinder:' + [radius, length, segments, topRadius].join(','), () => new THREE.CylinderGeometry(topRadius, radius, length, segments)), material, position, rotation);
}

export function ring(parent, radius, tube, position, material, rotation = [0, 0, 0], arc = Math.PI * 2) {
  return mesh(parent, geometry('ring:' + [radius, tube, arc].join(','), () => new THREE.TorusGeometry(radius, tube, 8, 64, arc)), material, position, rotation);
}

export function barBetween(parent, start, end, radius, material) {
  const from = vector(start);
  const to = vector(end);
  const direction = to.clone().sub(from);
  const object = cylinder(parent, radius, direction.length(), from.clone().add(to).multiplyScalar(0.5).toArray(), material, [0, 0, 0], 10);
  object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return object;
}

export function cable(parent, points, radius, material) {
  const curve = new THREE.CatmullRomCurve3(points.map(vector));
  return mesh(parent, new THREE.TubeGeometry(curve, 20, radius, 6, false), material);
}

export function bolt(parent, position, material, radius = 0.034) {
  return cylinder(parent, radius, 0.023, position, material, [Math.PI / 2, 0, 0], 6);
}

export function label(parent, text, size, position, color = '#a6c7ce', rotation = [0, 0, 0]) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  context.fillStyle = color;
  context.font = 'bold 150px Consolas, monospace';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, 512, 135, 1000);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: true, polygonOffset: true, polygonOffsetFactor: -1 });
  const object = mesh(parent, new THREE.PlaneGeometry(size, size / 4), material, position, rotation);
  object.castShadow = false;
  return object;
}

export function bake(group) {
  group.updateMatrixWorld(true);
  const inverse = group.matrixWorld.clone().invert();
  const batches = new Map();
  const originals = [];
  group.traverse(object => {
    if (!object.isMesh || Array.isArray(object.material) || object.material.transparent) return;
    const key = object.material.uuid;
    if (!batches.has(key)) batches.set(key, { material: object.material, geometries: [] });
    const transformed = object.geometry.clone().applyMatrix4(inverse.clone().multiply(object.matrixWorld));
    const nonIndexed = transformed.index ? transformed.toNonIndexed() : transformed;
    nonIndexed.deleteAttribute('uv1');
    batches.get(key).geometries.push(nonIndexed);
    originals.push(object);
    if (nonIndexed !== transformed) transformed.dispose();
  });
  originals.forEach(object => object.removeFromParent());
  for (const { material, geometries } of batches.values()) {
    const merged = mergeGeometries(geometries, false);
    geometries.forEach(shape => shape.dispose());
    if (merged) {
      const object = mesh(group, merged, material);
      object.name = group.name + '_' + material.name;
      object.userData.ownedGeometry = true;
    }
  }
  return group;
}

export function disposeModel(root) {
  const ownedMaterials = new Set();
  root.traverse(object => {
    if (object.userData.ownedGeometry) object.geometry.dispose();
    if (!object.isMesh) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach(material => {
      if (material.userData.disposeOnModel) ownedMaterials.add(material);
      if (material.transparent) {
        object.geometry.dispose();
        material.map?.dispose();
        material.dispose();
      }
    });
  });
  ownedMaterials.forEach(material => material.dispose());
  root.removeFromParent();
}
