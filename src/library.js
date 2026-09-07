import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { partDefinitions } from './catalog.js';

export const partsAssetBase64 = '__IRONCLAD_PARTS_BASE64__';

const library = new Map();
let loadPromise = null;

function partKey(slot, kind) {
  return slot + '_' + kind;
}

function decodeAsset() {
  const encoded = partsAssetBase64;
  if (!encoded || encoded.includes('__IRONCLAD_')) throw new Error('The embedded IRONCLAD-PARTS.glb asset is missing. Run npm run build.');
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

function registerScene(scene) {
  const expected = Object.entries(partDefinitions).flatMap(([slot, definition]) => definition.options.map(option => partKey(slot, option.id)));
  scene.traverse(object => {
    const { slot, option } = object.userData;
    if (slot && option && expected.includes(partKey(slot, option))) library.set(partKey(slot, option), object);
  });
  const missing = expected.filter(key => !library.has(key));
  if (missing.length) throw new Error('The IRONCLAD-PARTS.glb asset is incomplete: ' + missing.join(', '));
  return library;
}

export async function loadPartLibrary() {
  if (!loadPromise) {
    loadPromise = new GLTFLoader().parseAsync(decodeAsset(), '').then(gltf => registerScene(gltf.scene));
  }
  return loadPromise;
}

function channelName(material) {
  return (material?.name || 'dark').split('.')[0].toLowerCase();
}

export function createLibraryPart(slot, kind, materials) {
  const source = library.get(partKey(slot, kind));
  if (!source) throw new Error('Part asset is missing: ' + partKey(slot, kind));
  const root = source.clone(true);
  root.name = slot + '_' + kind;
  root.traverse(object => {
    if (!object.isMesh) return;
    const channel = object.userData.materialChannel || channelName(object.material);
    object.material = materials[channel] || materials.dark;
    object.castShadow = true;
    object.receiveShadow = true;
    object.userData.assetSource = 'IRONCLAD-PARTS.glb / Blender MCP';
  });
  return root;
}

export function libraryReady() {
  return library.size >= 36;
}
