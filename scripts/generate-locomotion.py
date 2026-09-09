"""Build only the six optional locomotion parts in an independent Blender process.

blender --background --factory-startup --python scripts/generate-locomotion.py
Pass -- --overwrite-generated to replace only this script's own two outputs.
The original IRONCLAD-PARTS assets are never loaded or written.
"""

import argparse
import json
import math
from pathlib import Path
import runpy
import sys

import bpy

ROOT = Path(__file__).resolve().parents[1]
OUTPUTS = (ROOT / 'assets/IRONCLAD-LOCOMOTION.glb', ROOT / 'assets/IRONCLAD-LOCOMOTION.blend')


def numbers(values):
    return [round(float(value), 9) for value in values]


def descendants(root):
    result = []
    stack = list(root.children)
    while stack:
        child = stack.pop()
        result.append(child)
        stack.extend(child.children)
    return result


def model_vertices(objects, inverse_root, convert_inverse):
    for obj in objects:
        if obj.type == 'MESH':
            transform = inverse_root @ obj.matrix_world
            for vertex in obj.data.vertices:
                yield convert_inverse @ (transform @ vertex.co)


def annotate(roots, convert):
    inverse = convert.transposed()
    basis = convert.to_4x4()
    basis_inverse = basis.inverted()
    bpy.context.view_layer.update()
    for root in roots:
        inverse_root = root.matrix_world.inverted()
        vertices = list(model_vertices(descendants(root), inverse_root, inverse))
        if not vertices:
            raise RuntimeError('Empty locomotion part: ' + root.name)
        root['restBoundsMin'] = numbers(min(vertex[axis] for vertex in vertices) for axis in range(3))
        root['restBoundsMax'] = numbers(max(vertex[axis] for vertex in vertices) for axis in range(3))
        root['restGroundY'] = root['restBoundsMin'][1]
        root['locomotionFrame'] = 'Y-up/+Z-forward'
        pivots = [obj for obj in descendants(root) if obj.get('locomotionJoint')]
        root['locomotionJointCount'] = len(pivots)
        for pivot in pivots:
            local = basis_inverse @ pivot.matrix_local @ basis
            model = basis_inverse @ inverse_root @ pivot.matrix_world @ basis
            translation, rotation, scale = local.decompose()
            pivot['restPosition'] = numbers(translation)
            pivot['restQuaternion'] = numbers((rotation.x, rotation.y, rotation.z, rotation.w))
            pivot['restScale'] = numbers(scale)
            pivot['restModelPosition'] = numbers(model.translation)
            pivot['jointAxis'] = [1.0, 0.0, 0.0]
            role = pivot['locomotionJoint']
            if role == 'foot':
                vertices = list(model_vertices(descendants(pivot), inverse_root, inverse))
                sole_y = min(vertex.y for vertex in vertices)
                pivot['footSoleOffset'] = round(model.translation.y - sole_y, 9)
                pivot['restSoleY'] = round(sole_y, 9)
            elif role == 'wheel':
                pivot['wheelAxis'] = [1.0, 0.0, 0.0]
            elif role == 'tread':
                pivot['restPhase'] = float(pivot['treadRestPhase'])
                pivot['trackPhase'] = float(pivot['treadRestPhase'])
                for suffix in ('HalfLength', 'Radius', 'CenterY', 'LoopLength'):
                    value = root['tread' + suffix]
                    pivot['track' + suffix] = value
                    pivot['tread' + suffix] = value
                pivot['trackCenterX'] = pivot['treadCenterX'] = pivot['legSide'] * 1.17
                pivot['trackCenterZ'] = pivot['treadCenterZ'] = 0.0
            elif role == 'pod':
                pivot['thrustAxis'] = [0.0, -1.0, 0.0]
        if root['option'] == 'treads':
            for suffix in ('HalfLength', 'Radius', 'CenterY', 'LoopLength'):
                root['track' + suffix] = root['tread' + suffix]
            root['treadPhaseConvention'] = 'rear-bottom/+Z-bottom/front-up/-Z-top/rear-down'


def validate(roots):
    expected = {
        'strider': {'hip': 2, 'knee': 2, 'foot': 2},
        'anchor': {'hip': 2, 'knee': 2, 'foot': 2},
        'reverse': {'hip': 2, 'knee': 2, 'foot': 2},
        'tetrapod': {'hip': 4, 'knee': 4, 'foot': 4},
        'hover': {'pod': 4},
        'treads': {'wheel': 10, 'tread': 88},
    }
    if {root.get('option') for root in roots} != set(expected) or len(roots) != 6:
        raise RuntimeError('Expected exactly the six leg roots')
    summary = {}
    for root in roots:
        counts = {}
        for obj in descendants(root):
            role = obj.get('locomotionJoint')
            if role:
                counts[role] = counts.get(role, 0) + 1
                assert obj.get('pivot') and obj['legSide'] in (-1, 1), obj.name
                assert obj.type == 'EMPTY', obj.name
                assert obj.children, obj.name + ' has no geometry'
                if root['option'] == 'tetrapod':
                    assert obj.get('legFront') in (-1, 1), obj.name
                if role in ('hip', 'wheel', 'pod', 'tread'):
                    assert obj.parent == root, obj.name + ' is not directly under its root'
                if role == 'knee':
                    assert obj.parent.get('locomotionJoint') == 'hip', obj.name
                if role == 'foot':
                    assert obj.parent.get('locomotionJoint') == 'knee', obj.name
                    assert obj['footSoleOffset'] > 0, obj.name
                for key in ('restPosition', 'restModelPosition', 'restQuaternion', 'restScale'):
                    assert all(math.isfinite(value) for value in obj[key]), obj.name + '/' + key
        if counts != expected[root['option']]:
            raise RuntimeError(root.name + ' joint mismatch: ' + repr(counts))
        summary[root.name] = {'joints': counts, 'min': list(root['restBoundsMin']), 'max': list(root['restBoundsMax'])}
    return summary


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--overwrite-generated', action='store_true')
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
    if not bpy.app.background:
        raise RuntimeError('Run this generator in a separate --background Blender process')
    for output in OUTPUTS:
        if output.exists() and not args.overwrite_generated:
            raise FileExistsError(str(output) + ' already exists; use --overwrite-generated explicitly')
    bpy.ops.wm.read_factory_settings(use_empty=True)
    parts = runpy.run_path(str(ROOT / 'scripts/model-parts.py'), run_name='ironclad_parts')
    roots = [parts['build_legs'](kind) for kind in parts['OPTIONS']['legs']]
    # Discard any leftover temporary frames after nearest-pivot mesh merging.
    for root in roots:
        for obj in reversed(list(descendants(root))):
            if obj.type == 'EMPTY' and not obj.children and not obj.get('pivot'):
                bpy.data.objects.remove(obj, do_unlink=True)
    annotate(roots, parts['CONVERT'])
    summary = validate(roots)
    OUTPUTS[0].parent.mkdir(parents=True, exist_ok=True)
    parts['export_library'](roots, OUTPUTS[0].name)
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUTS[1]), check_existing=False, compress=True)
    print('LOCOMOTION_VALIDATION', json.dumps(summary, sort_keys=True))
    print('LOCOMOTION_OUTPUTS', json.dumps({str(output): output.stat().st_size for output in OUTPUTS}))


if __name__ == '__main__':
    main()
