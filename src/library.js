import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { partDefinitions } from './catalog.js';

export const partsAssetBase64 = '__IRONCLAD_PARTS_BASE64__';
export const locomotionAssetBase64 = '__IRONCLAD_LOCOMOTION_BASE64__';

const library = new Map();
const expectedParts = Object.entries(partDefinitions).flatMap(([slot, definition]) => definition.options.map(option => partKey(slot, option.id)));
const expectedLegs = partDefinitions.legs.options.map(option => partKey('legs', option.id));
const diagnostics = { locomotionReady: false, locomotionSource: null, locomotionReason: 'not-loaded' };
let loadPromise = null;

function partKey(slot, kind) {
  return slot + '_' + kind;
}

function assetPresent(encoded) {
  return Boolean(encoded && !encoded.includes('__IRONCLAD_'));
}

function decodeAsset(encoded, filename) {
  if (!assetPresent(encoded)) throw new Error('The embedded ' + filename + ' asset is missing. Run npm run build.');
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

function collectScene(scene, expected, filename) {
  const parts = new Map();
  scene.updateMatrixWorld(true);
  scene.traverse(object => {
    const { slot, option } = object.userData;
    const key = partKey(slot, option);
    if (!expected.includes(key)) return;
    if (parts.has(key)) throw new Error('Duplicate part in ' + filename + ': ' + key);
    object.userData.assetFile = filename;
    parts.set(key, object);
  });
  const missing = expected.filter(key => !parts.has(key));
  if (missing.length) throw new Error('The ' + filename + ' asset is incomplete: ' + missing.join(', '));
  return parts;
}

function validateLocomotion(parts) {
  for (const [key, root] of parts) {
    const roles = {};
    root.traverse(object => {
      const role = object.userData.locomotionJoint;
      if (!role) return;
      (roles[role] ||= []).push(object);
      if (!object.userData.pivot || ![-1, 1].includes(object.userData.legSide)) throw new Error('Invalid locomotion pivot: ' + object.name);
      if (role === 'knee' && object.parent?.userData.locomotionJoint !== 'hip') throw new Error('Knee is missing its hip parent: ' + object.name);
      if (role === 'foot' && object.parent?.userData.locomotionJoint !== 'knee') throw new Error('Foot is missing its knee parent: ' + object.name);
    });
    const option = root.userData.option;
    const expected = option === 'hover' ? { pod: 4 } : option === 'treads' ? { wheel: 10, tread: 88 } : { hip: option === 'tetrapod' ? 4 : 2, knee: option === 'tetrapod' ? 4 : 2, foot: option === 'tetrapod' ? 4 : 2 };
    if (root.userData.locomotionRigVersion !== 1 || Object.entries(expected).some(([role, count]) => roles[role]?.length !== count)) {
      throw new Error('Incomplete locomotion rig: ' + key);
    }
    if (option === 'tetrapod' && Object.values(roles).flat().some(object => ![-1, 1].includes(object.userData.legFront))) {
      throw new Error('Tetrapod legFront metadata is missing');
    }
  }
}

function useOriginalLegs(reason) {
  Object.assign(diagnostics, { locomotionReady: false, locomotionSource: 'IRONCLAD-PARTS.glb', locomotionReason: reason });
  for (const key of expectedLegs) {
    Object.assign(library.get(key).userData, { locomotionReady: false, locomotionFallbackReason: reason });
  }
}

export async function loadPartLibrary() {
  if (!loadPromise) {
    loadPromise = (async () => {
      const loader = new GLTFLoader();
      const original = await loader.parseAsync(decodeAsset(partsAssetBase64, 'IRONCLAD-PARTS.glb'), '');
      const baseParts = collectScene(original.scene, expectedParts, 'IRONCLAD-PARTS.glb');
      for (const [key, source] of baseParts) library.set(key, source);
      if (!assetPresent(locomotionAssetBase64)) {
        useOriginalLegs('optional-asset-missing');
        return library;
      }
      try {
        const gltf = await loader.parseAsync(decodeAsset(locomotionAssetBase64, 'IRONCLAD-LOCOMOTION.glb'), '');
        const legs = collectScene(gltf.scene, expectedLegs, 'IRONCLAD-LOCOMOTION.glb');
        validateLocomotion(legs);
        // Validate the complete replacement first; never leave a mixed partial rig.
        for (const [key, source] of legs) {
          source.userData.locomotionReady = true;
          library.set(key, source);
        }
        Object.assign(diagnostics, { locomotionReady: true, locomotionSource: 'IRONCLAD-LOCOMOTION.glb', locomotionReason: null });
      } catch (error) {
        const reason = 'optional-asset-invalid: ' + (error?.message || String(error));
        useOriginalLegs(reason);
        console.warn('[IRONCLAD] Locomotion asset unavailable; using original legs.', error);
      }
      return library;
    })();
  }
  return loadPromise;
}

export function libraryDiagnostics() {
  return { ...diagnostics, readyCount: library.size, expectedCount: expectedParts.length };
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
    object.userData.assetSource = (source.userData.assetFile || 'IRONCLAD-PARTS.glb') + ' / Blender generator';
  });
  return root;
}

export function libraryReady() {
  return library.size === expectedParts.length && loadPromise !== null;
}
