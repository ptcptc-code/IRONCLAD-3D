import bpy
import bmesh
import json
import math
from pathlib import Path
from mathutils import Vector, Matrix, Euler

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'assets'
CONVERT = Matrix(((1, 0, 0), (0, 0, -1), (0, 1, 0)))
PALETTE = {
    'paint': ('315562', 0.65, 0.34), 'ivory': ('b7c3c0', 0.62, 0.42),
    'dark': ('17232b', 0.75, 0.44), 'steel': ('70828c', 0.86, 0.26),
    'rubber': ('090f14', 0.12, 0.8), 'bronze': ('b18f56', 0.8, 0.33),
    'black': ('03080c', 0.35, 0.3), 'cyan': ('65dce9', 0.25, 0.23),
    'caution': ('dfa34e', 0.45, 0.4), 'glass': ('124550', 0.6, 0.18),
    'amber': ('ffd28a', 0.25, 0.25), 'white': ('e4faff', 0.1, 0.2)
}
OPTIONS = {
    'chassis': ['bulwark', 'raptor', 'specter', 'aerocore', 'reactor', 'paladin'],
    'head': ['visor', 'horned', 'sensor', 'wedge', 'monoeye', 'vcrest'],
    'arms': ['gauntlet', 'lancer', 'talon', 'aerofins', 'siege', 'pauldrons'],
    'legs': ['strider', 'anchor', 'hover', 'reverse', 'tetrapod', 'treads'],
    'weapon': ['railgun', 'arc', 'monoblade', 'gatling', 'missiles', 'beamblade'],
    'backpack': ['compact', 'wings', 'missilepack', 'funnels', 'reactorpack', 'booster']
}


def material(name):
    existing = bpy.data.materials.get(name)
    if existing:
        return existing
    color, metallic, roughness = PALETTE[name]
    rgb = [int(color[offset:offset + 2], 16) / 255 for offset in (0, 2, 4)]
    linear = [channel / 12.92 if channel <= 0.04045 else ((channel + 0.055) / 1.055) ** 2.4 for channel in rgb]
    result = bpy.data.materials.new(name)
    result.use_nodes = True
    shader = result.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*linear, 1)
    shader.inputs['Metallic'].default_value = metallic
    shader.inputs['Roughness'].default_value = roughness
    if name in ('cyan', 'amber', 'white'):
        shader.inputs['Emission Color'].default_value = (*linear, 1)
        shader.inputs['Emission Strength'].default_value = 2.2
    result.diffuse_color = (*linear, 1)
    return result


def group(name, position=(0, 0, 0), parent=None):
    result = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(result)
    result.parent = parent
    result.location = CONVERT @ Vector(position)
    return result


def geometry(parent, name, vertices, faces, color, position=(0, 0, 0), rotation=(0, 0, 0), bevel=0):
    shape = bpy.data.meshes.new(name)
    shape.from_pydata([CONVERT @ Vector(vertex) for vertex in vertices], [], faces)
    shape.update()
    builder = bmesh.new()
    builder.from_mesh(shape)
    bmesh.ops.recalc_face_normals(builder, faces=list(builder.faces))
    if bevel:
        bmesh.ops.bevel(builder, geom=list(builder.edges), offset=bevel, segments=2, affect='EDGES', clamp_overlap=True)
        bmesh.ops.recalc_face_normals(builder, faces=list(builder.faces))
    builder.to_mesh(shape)
    builder.free()
    result = bpy.data.objects.new(name, shape)
    bpy.context.scene.collection.objects.link(result)
    result.parent = parent
    result.location = CONVERT @ Vector(position)
    result.rotation_euler = (CONVERT @ Euler(rotation).to_matrix() @ CONVERT.transposed()).to_euler()
    shape.materials.append(material(color))
    return result


def panel(parent, size, position, color='paint', rotation=(0, 0, 0), cut=0.18, bevel=0.014):
    width, height, depth = size
    inset = min(width, height) * cut
    points = [(-width / 2 + inset, -height / 2), (width / 2 - inset, -height / 2), (width / 2, -height / 2 + inset), (width / 2, height / 2 - inset), (width / 2 - inset, height / 2), (-width / 2 + inset, height / 2), (-width / 2, height / 2 - inset), (-width / 2, -height / 2 + inset)]
    return plate(parent, points, depth, position, color, rotation, bevel)


def plate(parent, points, depth, position, color='paint', rotation=(0, 0, 0), bevel=0.012):
    count = len(points)
    vertices = [(horizontal, vertical, level) for level in (-depth / 2, depth / 2) for horizontal, vertical in points]
    faces = [tuple(range(count - 1, -1, -1)), tuple(range(count, count * 2))]
    faces += [(index, (index + 1) % count, (index + 1) % count + count, index + count) for index in range(count)]
    return geometry(parent, 'Armor_' + color, vertices, faces, color, position, rotation, bevel)


def tube(parent, radius, length, position, color='steel', axis=(0, 1, 0), top=None, segments=16):
    top = radius if top is None else top
    rotation = Vector((0, 1, 0)).rotation_difference(Vector(axis).normalized()).to_matrix()
    vertices = [rotation @ Vector((math.cos(index / segments * math.tau) * breadth, level, math.sin(index / segments * math.tau) * breadth)) for level, breadth in ((-length / 2, radius), (length / 2, top)) for index in range(segments)]
    faces = [tuple(range(segments - 1, -1, -1)), tuple(range(segments, segments * 2))]
    faces += [(index, (index + 1) % segments, (index + 1) % segments + segments, index + segments) for index in range(segments)]
    return geometry(parent, 'Machined_' + color, vertices, faces, color, position, bevel=min(0.008, radius * 0.08))


def ring(parent, radius, thickness, position, color='steel', axis=(0, 0, 1), segments=24):
    rotation = Vector((0, 0, 1)).rotation_difference(Vector(axis).normalized()).to_matrix()
    vertices = []
    for index in range(segments):
        angle = index * math.tau / segments
        for cross in range(6):
            around = cross * math.tau / 6
            breadth = radius + thickness * math.cos(around)
            vertices.append(rotation @ Vector((math.cos(angle) * breadth, math.sin(angle) * breadth, thickness * math.sin(around))))
    faces = [(index * 6 + cross, ((index + 1) % segments) * 6 + cross, ((index + 1) % segments) * 6 + (cross + 1) % 6, index * 6 + (cross + 1) % 6) for index in range(segments) for cross in range(6)]
    return geometry(parent, 'Seal_' + color, vertices, faces, color, position)


def strut(parent, start, finish, radius=0.045, color='steel'):
    start, finish = Vector(start), Vector(finish)
    return tube(parent, radius, (finish - start).length, (start + finish) / 2, color, finish - start, segments=10)


def piston(parent, start, finish, radius=0.045):
    start, finish = Vector(start), Vector(finish)
    strut(parent, start, finish, radius)
    strut(parent, start, start.lerp(finish, 0.54), radius * 1.9, 'dark')
    strut(parent, start.lerp(finish, 0.5), start.lerp(finish, 0.62), radius * 2.0, 'bronze')


def hose(parent, points, radius=0.035):
    for start, finish in zip(points, points[1:]):
        strut(parent, start, finish, radius, 'rubber')
    for position in points:
        tube(parent, radius * 1.35, radius * 0.8, position, 'steel', segments=8)


def bolts(parent, position, width, height):
    for side in (-1, 1):
        for level in (-1, 1):
            tube(parent, 0.026, 0.023, (position[0] + side * width / 2, position[1] + level * height / 2, position[2]), 'steel', (0, 0, 1), segments=6)


def vent(parent, position, width=0.35, height=0.28, rotation=(0, 0, 0)):
    mount = group('Recessed_vent', position, parent)
    mount.rotation_euler = (CONVERT @ Euler(rotation).to_matrix() @ CONVERT.transposed()).to_euler()
    panel(mount, (width + 0.07, height + 0.07, 0.035), (0, 0, 0), 'steel', bevel=0.006)
    panel(mount, (width, height, 0.025), (0, 0, 0.026), 'black', bevel=0.003)
    count = max(3, round(height / 0.06))
    for index in range(count):
        panel(mount, (width * 0.85, 0.022, 0.03), (0, -height * 0.38 + index * height * 0.76 / (count - 1), 0.05), 'dark', cut=0, bevel=0)


def joint(parent, position, radius=0.22, width=0.54):
    tube(parent, radius, width, position, 'dark', (1, 0, 0))
    for side in (-1, 1):
        center = (position[0] + side * (width / 2 + 0.015), position[1], position[2])
        tube(parent, radius * 0.8, 0.04, center, 'steel', (1, 0, 0))
        ring(parent, radius * 0.56, 0.018, (center[0] + side * 0.025, center[1], center[2]), 'bronze', (1, 0, 0), 16)


def nozzle(parent, position, radius=0.22, axis=(0, -1, 0)):
    axis = Vector(axis).normalized()
    center = Vector(position)
    tube(parent, radius * 0.7, radius * 1.4, center, 'dark', axis, top=radius)
    mouth = center + axis * radius * 0.72
    ring(parent, radius * 0.87, radius * 0.1, mouth, 'steel', axis)
    tube(parent, radius * 0.77, 0.03, mouth, 'black', axis)
    ring(parent, radius * 0.57, radius * 0.08, mouth + axis * 0.023, 'cyan', axis)
    tube(parent, radius * 0.29, 0.04, mouth + axis * 0.02, 'cyan', axis)


def root_part(slot, kind):
    name = slot + '_' + kind
    old = bpy.data.objects.get(name)
    if old:
        for child in list(old.children_recursive):
            bpy.data.objects.remove(child, do_unlink=True)
        bpy.data.objects.remove(old, do_unlink=True)
    result = group(name)
    result['slot'] = slot
    result['option'] = kind
    result['assetSource'] = 'Blender MCP / Mivo concept reference'
    result['assetRevision'] = 1
    return result


def finish_part(root):
    pivots = [root] + [child for child in root.children_recursive if child.get('pivot')]
    bpy.context.view_layer.update()
    for pivot in pivots:
        buckets = {}
        for child in list(pivot.children_recursive):
            if child.type != 'MESH':
                continue
            nearest = child.parent
            while nearest != root and not nearest.get('pivot'):
                nearest = nearest.parent
            if nearest == pivot:
                buckets.setdefault(child.data.materials[0].name, []).append(child)
        for color, children in buckets.items():
            vertices, faces = [], []
            inverse = pivot.matrix_world.inverted()
            for child in children:
                transform = inverse @ child.matrix_world
                offset = len(vertices)
                vertices.extend(transform @ vertex.co for vertex in child.data.vertices)
                faces.extend(tuple(index + offset for index in polygon.vertices) for polygon in child.data.polygons)
                bpy.data.objects.remove(child, do_unlink=True)
            shape = bpy.data.meshes.new(pivot.name + '_' + color)
            shape.from_pydata(vertices, [], faces)
            shape.materials.append(material(color))
            shape.update()
            result = bpy.data.objects.new(shape.name, shape)
            bpy.context.scene.collection.objects.link(result)
            result.parent = pivot
            result['materialChannel'] = color
    for child in list(root.children_recursive):
        if child.type == 'EMPTY' and not child.children and not child.get('pivot') and not child.get('socket'):
            bpy.data.objects.remove(child, do_unlink=True)
    root['buildComplete'] = True
    print('BUILT', root.name)


def build_chassis(kind):
    root = root_part('chassis', kind)
    heavy = kind in ('bulwark', 'reactor')
    width = 2.05 if heavy else 1.65 if kind == 'paladin' else 1.48
    tube(root, 0.38, 0.63, (0, 3.23, 0), 'dark')
    for level in range(4):
        ring(root, 0.4, 0.033, (0, 3.0 + level * 0.14, 0), 'steel', (0, 1, 0))
    panel(root, (1.3, 0.4, 0.7), (0, 2.96, 0), 'dark')
    for side in (-1, 1):
        plate(root, [(-0.27, 0.3), (0.27, 0.3), (0.34, -0.2), (0.1, -0.43), (-0.24, -0.32)], 0.16, (side * 0.43, 2.88, 0.49), 'paint', (0, side * 0.2, side * -0.12))
        piston(root, (side * 0.55, 3.07, -0.15), (side * 0.7, 3.77, -0.31))
    if kind == 'specter':
        panel(root, (0.47, 1.35, 0.62), (0, 4.09, -0.22), 'dark')
        for level in range(4):
            for side in (-1, 1):
                plate(root, [(0, 0.09), (side * (0.72 - level * 0.05), 0.2), (side * 0.51, -0.06), (side * 0.08, -0.1)], 0.3, (0, 3.59 + level * 0.3, 0.19), 'paint' if level % 2 else 'ivory')
        for side in (-1, 1):
            hose(root, [(side * 0.27, 4.51, 0.42), (side * 0.54, 4.08, 0.53), (side * 0.36, 3.43, 0.38)])
        panel(root, (0.13, 0.72, 0.08), (0, 4.12, 0.64), 'cyan')
    elif kind == 'reactor':
        panel(root, (2.03, 1.27, 0.97), (0, 4.1, 0), 'dark')
        for side in (-1, 1):
            panel(root, (0.64, 1.27, 0.63), (side * 0.83, 4.18, 0.33), 'paint')
            panel(root, (0.58, 0.26, 0.1), (side * 0.83, 4.66, 0.69), 'ivory')
            vent(root, (side * 0.85, 4.0, 0.67), 0.38, 0.54)
            hose(root, [(side * 0.39, 3.72, 0.66), (side * 0.51, 3.39, 0.76), (side * 0.74, 3.51, 0.75)], 0.06)
        tube(root, 0.48, 0.33, (0, 4.18, 0.69), 'steel', (0, 0, 1), segments=24)
        tube(root, 0.39, 0.05, (0, 4.18, 0.88), 'black', (0, 0, 1))
        ring(root, 0.32, 0.034, (0, 4.18, 0.92), 'cyan')
        for index in range(10):
            angle = index * math.tau / 10
            panel(root, (0.1, 0.22, 0.05), (math.sin(angle) * 0.27, 4.18 + math.cos(angle) * 0.27, 0.94), 'bronze', (0, 0, -angle + 0.4))
        tube(root, 0.11, 0.04, (0, 4.18, 0.99), 'cyan', (0, 0, 1))
    else:
        plate(root, [(-width * 0.32, -0.6), (width * 0.32, -0.6), (width / 2, 0.33), (width * 0.31, 0.68), (-width * 0.31, 0.68), (-width / 2, 0.33)], 0.88, (0, 4.07, 0), 'dark')
        for side in (-1, 1):
            spread = 1.12 if heavy else 0.98 if kind == 'paladin' else 0.86
            points = [(side * 0.13, 0.52), (side * spread, 0.39), (side * (spread - 0.08), -0.17), (side * 0.37, -0.54), (side * 0.18, -0.22)]
            if kind == 'raptor':
                points = [(side * 0.1, 0.66), (side * 0.86, 0.2), (side * 0.63, -0.14), (side * 0.12, -0.76)]
            if kind == 'aerocore':
                points = [(side * 0.12, 0.43), (side * 1.07, 0.7), (side * 0.74, -0.25), (side * 0.18, -0.78)]
            plate(root, points, 0.23, (0, 4.17, 0.51), 'paint', (0.06, side * 0.12, 0))
            plate(root, [(side * 0.17, 0.41), (side * (spread - 0.1), 0.3), (side * (spread - 0.21), 0.12), (side * 0.23, 0.19)], 0.07, (0, 4.27, 0.69), 'ivory')
            vent(root, (side * 0.62, 3.94, 0.72), 0.25, 0.21)
            bolts(root, (side * 0.61, 4.28, 0.72), 0.41, 0.42)
            panel(root, (0.28, 0.04, 0.03), (side * 0.59, 4.45, 0.75), 'caution', cut=0)
        if kind == 'bulwark':
            panel(root, (0.35, 0.73, 0.15), (0, 4.16, 0.73), 'steel')
            panel(root, (0.21, 0.55, 0.06), (0, 4.16, 0.83), 'black')
            panel(root, (0.075, 0.42, 0.04), (0, 4.16, 0.88), 'cyan')
        elif kind == 'paladin':
            plate(root, [(-0.27, 0.13), (0.27, 0.13), (0, -0.28)], 0.1, (0, 4.32, 0.86), 'bronze')
            plate(root, [(-0.13, 0.05), (0.13, 0.05), (0, -0.14)], 0.03, (0, 4.32, 0.93), 'cyan')
        else:
            plate(root, [(-0.17, 0.5), (0.17, 0.5), (0.26, 0.04), (0, -0.64), (-0.26, 0.04)], 0.17, (0, 4.16, 0.7), 'ivory')
            panel(root, (0.08, 0.39, 0.04), (0, 4.18, 0.81), 'cyan')
    tube(root, 0.22, 0.2, (0, 4.84, 0), 'steel')
    for side in (-1, 1):
        panel(root, (0.17, 0.41, 0.51), (side * 0.38, 4.7, -0.02), 'ivory', (0, 0, side * -0.23))
        hose(root, [(side * 0.25, 4.86, -0.25), (side * 0.63, 4.7, -0.57), (side * 0.6, 3.73, -0.53)])
    finish_part(root)
    return root


def build_head(kind):
    root = root_part('head', kind)
    root.location = CONVERT @ Vector((0, 4.85, 0.04))
    tube(root, 0.18, 0.25, (0, 0.04, 0), 'steel')
    if kind in ('sensor', 'monoeye'):
        roundness = 0.36 if kind == 'sensor' else 0.16
        panel(root, (0.88, 0.76, 0.66), (0, 0.52, 0), 'paint', cut=roundness, bevel=0.028)
        if kind == 'monoeye':
            panel(root, (1.05, 0.2, 0.72), (0, 0.8, 0.03), 'ivory')
            panel(root, (0.95, 0.22, 0.07), (0, 0.52, 0.37), 'black')
        tube(root, 0.23 if kind == 'sensor' else 0.14, 0.12, (0, 0.53, 0.43), 'steel', (0, 0, 1), segments=24)
        tube(root, 0.17 if kind == 'sensor' else 0.09, 0.03, (0, 0.53, 0.51), 'glass', (0, 0, 1))
        ring(root, 0.12 if kind == 'sensor' else 0.065, 0.014, (0, 0.53, 0.535), 'cyan')
        tube(root, 0.045, 0.024, (0, 0.53, 0.547), 'cyan', (0, 0, 1), segments=12)
        for side in (-1, 1):
            joint(root, (side * 0.39, 0.53, -0.03), 0.18, 0.14)
            hose(root, [(side * 0.4, 0.46, 0.19), (side * 0.45, 0.18, 0.32), (side * 0.2, 0.13, 0.38)], 0.037)
        if kind == 'sensor':
            for level in (0.36, 0.65):
                tube(root, 0.065, 0.1, (0.48, level, 0.32), 'cyan', (0, 0, 1), segments=12)
        strut(root, (-0.32, 0.83, -0.15), (-0.37, 1.36, -0.16), 0.012)
    else:
        points = [(-0.37, -0.23), (0, -0.44), (0.37, -0.23), (0.47, 0.21), (0.24, 0.46), (-0.24, 0.46), (-0.47, 0.21)]
        if kind == 'visor':
            panel(root, (0.97, 0.65, 0.7), (0, 0.48, 0), 'dark', bevel=0.026)
            panel(root, (1.06, 0.26, 0.79), (0, 0.78, 0.09), 'ivory', (0.12, 0, 0))
        else:
            plate(root, points, 0.66, (0, 0.53, 0), 'ivory', (-0.13 if kind == 'wedge' else 0, 0, 0), 0.02)
            plate(root, [(-0.22, 0.32), (0.22, 0.32), (0.11, -0.11), (0, -0.29), (-0.11, -0.11)], 0.07, (0, 0.73, 0.38), 'paint')
        panel(root, (0.8, 0.17, 0.04), (0, 0.55, 0.397), 'black')
        for side in (-1, 1):
            panel(root, (0.3, 0.046, 0.03), (side * 0.19, 0.55, 0.435), 'cyan', (0, 0, side * 0.12))
            plate(root, [(-0.1, 0.25), (0.1, 0.2), (0.07, -0.28), (-0.08, -0.18)], 0.19, (side * 0.4, 0.39, 0.18), 'paint', (0, side * 0.35, side * -0.15))
            joint(root, (side * 0.42, 0.6, -0.16), 0.16, 0.12)
            bolts(root, (side * 0.25, 0.84, 0.37), 0.09, 0.045)
        plate(root, [(-0.16, 0.14), (0.16, 0.14), (0, -0.2)], 0.12, (0, 0.31, 0.39), 'dark')
        vent(root, (0, 0.3, 0.47), 0.18, 0.13)
        if kind in ('horned', 'vcrest'):
            for side in (-1, 1):
                points = [(0, 0), (side * 0.14, 0.13), (side * 0.5, 1.0), (side * 0.16, 0.71)] if kind == 'horned' else [(0, 0), (side * 0.73, 0.61), (side * 0.44, 0.08), (side * 0.09, -0.12)]
                plate(root, points, 0.065, (side * 0.14, 0.8, 0.18 if kind == 'horned' else 0.43), 'bronze' if kind == 'vcrest' else 'paint')
        elif kind == 'wedge':
            for side in (-1, 1):
                plate(root, [(0, -0.15), (side * 0.48, 0.44), (side * 0.21, 0.04)], 0.13, (side * 0.38, 0.57, -0.28), 'paint')
    finish_part(root)
    return root


def build_arms(kind):
    root = root_part('arms', kind)
    for side in (-1, 1):
        arm = group('arm_left' if side < 0 else 'arm_right', (side * 1.14, 4.48, 0), root)
        arm['pivot'] = True
        arm['armSide'] = side
        heavy = kind in ('gauntlet', 'siege')
        joint(arm, (side * 0.14, 0, 0), 0.29, 0.64)
        joint(arm, (side * 0.31, -0.94, 0.03), 0.2, 0.51)
        panel(arm, (0.4, 0.67, 0.41), (side * 0.29, -0.48, 0), 'dark')
        piston(arm, (side * 0.55, -0.17, -0.07), (side * 0.57, -0.94, -0.05))
        if heavy:
            panel(arm, (1.13, 0.69, 0.9), (side * 0.35, 0.25, 0), 'paint', (0, 0, side * -0.08))
            panel(arm, (0.91, 0.18, 0.94), (side * 0.35, 0.65, 0.01), 'ivory')
            vent(arm, (side * 0.35, 0.27, 0.49), 0.58, 0.29)
            bolts(arm, (side * 0.35, 0.35, 0.49), 0.82, 0.41)
        elif kind in ('aerofins', 'pauldrons'):
            for layer in range(3 if kind == 'pauldrons' else 2):
                plate(arm, [(0, 0.15), (side * (0.98 - layer * 0.13), 0.63 - layer * 0.13), (side * 0.81, -0.23), (side * 0.22, -0.3)], 0.18, (side * 0.05, 0.17 - layer * 0.2, -layer * 0.1), 'ivory' if layer % 2 == 0 else 'paint')
        else:
            panel(arm, (0.65, 0.59, 0.63), (side * 0.23, 0.23, 0), 'ivory')
            panel(arm, (0.39, 0.1, 0.08), (side * 0.23, 0.38, 0.38), 'cyan')
        breadth = 0.72 if heavy else 0.45
        panel(arm, (breadth, 0.91, 0.6), (side * 0.36, -1.52, 0.14), 'dark')
        plate(arm, [(-breadth * 0.48, 0.43), (breadth * 0.48, 0.43), (breadth * 0.55, -0.27), (0, -0.5), (-breadth * 0.45, -0.32)], 0.14, (side * 0.36, -1.51, 0.47), 'paint')
        panel(arm, (breadth * 0.68, 0.21, 0.06), (side * 0.36, -1.28, 0.57), 'ivory')
        panel(arm, (0.055, 0.37, 0.03), (side * 0.36, -1.6, 0.57), 'cyan')
        bolts(arm, (side * 0.36, -1.56, 0.56), breadth * 0.66, 0.5)
        if kind == 'siege' and side < 0:
            panel(arm, (0.92, 1.62, 0.19), (-0.76, -1.29, 0.32), 'paint', (0, -0.24, -0.11))
            panel(arm, (0.19, 1.36, 0.06), (-0.77, -1.29, 0.45), 'ivory')
            vent(arm, (-0.77, -1.29, 0.49), 0.16, 0.42)
        elif kind == 'lancer':
            tube(arm, 0.13, 1.35, (side * 0.65, -1.08, 0.17), 'steel')
            panel(arm, (0.21, 0.81, 0.26), (side * 0.69, -1.52, 0.2), 'ivory')
        elif kind in ('talon', 'aerofins'):
            plate(arm, [(0, 0.54), (side * 0.33, 0.16), (side * 0.17, -0.94), (0, -0.48)], 0.08, (side * 0.61, -1.47, 0.21), 'steel')
        panel(arm, (0.4, 0.22, 0.35), (side * 0.36, -2.05, 0.21), 'dark')
        for finger in range(4):
            horizontal = side * 0.36 - 0.15 + finger * 0.1
            for segment in range(2):
                panel(arm, (0.077, 0.15, 0.13), (horizontal, -2.2 - segment * 0.13, 0.28 + segment * 0.04), 'steel', bevel=0.007)
            if kind == 'talon':
                plate(arm, [(-0.035, 0.04), (0.035, 0.04), (0.01, -0.41), (-0.02, -0.22)], 0.05, (horizontal, -2.38, 0.32), 'steel')
        hose(arm, [(side * 0.3, 0.07, -0.36), (side * 0.54, -0.55, -0.41), (side * 0.35, -1.6, -0.22)], 0.04)
    finish_part(root)
    return root


def build_legs(kind):
    root = root_part('legs', kind)
    root['upperOffset'] = {'hover': -0.38, 'tetrapod': -0.43, 'treads': -1.27}.get(kind, 0)
    if kind == 'treads':
        panel(root, (2.55, 0.5, 2.44), (0, 1.26, 0), 'dark')
        tube(root, 0.77, 0.36, (0, 1.58, 0), 'steel', segments=24)
        ring(root, 0.78, 0.035, (0, 1.76, 0), 'bronze', (0, 1, 0))
        for side in (-1, 1):
            for index in range(5):
                joint(root, (side * 1.17, 0.64, -0.98 + index * 0.49), 0.36, 0.95)
            for level in (0.18, 1.1):
                for index in range(13):
                    panel(root, (1.02, 0.1, 0.17), (side * 1.17, level, -1.08 + index * 0.18), 'rubber', cut=0.05, bevel=0.008)
            for front in (-1, 1):
                for index in range(9):
                    angle = -math.pi / 2 + index * math.pi / 8
                    panel(root, (1.02, 0.1, 0.19), (side * 1.17, 0.64 + math.sin(angle) * 0.46, front * (1.08 + math.cos(angle) * 0.46)), 'rubber', (front * -angle + math.pi / 2, 0, 0), cut=0.04, bevel=0.006)
            for index in range(3):
                panel(root, (1.07, 0.27, 0.84), (side * 1.17, 1.34, -0.92 + index * 0.92), 'paint')
                panel(root, (0.57, 0.05, 0.61), (side * 1.17, 1.5, -0.92 + index * 0.92), 'ivory')
            panel(root, (0.34, 0.08, 0.07), (side * 1.17, 1.3, 1.42), 'cyan')
        panel(root, (1.14, 0.47, 0.18), (0, 1.12, 1.29), 'ivory', (0.2, 0, 0))
        bolts(root, (0, 1.15, 1.42), 0.88, 0.26)
    elif kind == 'hover':
        tube(root, 0.48, 0.42, (0, 2.55, 0), 'steel')
        panel(root, (1.62, 0.38, 1.18), (0, 2.24, 0), 'dark')
        for side in (-1, 1):
            for front in (-1, 1):
                center = (side * 0.9, 1.19, front * 0.55)
                piston(root, (side * 0.48, 2.12, front * 0.34), center, 0.065)
                plate(root, [(-0.28, 0.54), (0.23, 0.54), (0.41, -0.15), (0.09, -0.61), (-0.34, -0.3)], 0.52, center, 'paint', (0, side * 0.2, side * -0.13))
                panel(root, (0.36, 0.64, 0.08), (center[0], center[1], center[2] + 0.31), 'ivory')
                nozzle(root, (center[0], 0.6, center[2]), 0.28)
                panel(root, (0.07, 0.4, 0.05), (center[0], 1.21, center[2] + 0.37), 'cyan')
    elif kind == 'tetrapod':
        panel(root, (1.65, 0.42, 1.56), (0, 2.2, 0), 'dark')
        tube(root, 0.51, 0.39, (0, 2.55, 0), 'steel')
        for side in (-1, 1):
            for front in (-1, 1):
                hip = (side * 0.61, 2.25, front * 0.42)
                knee = (side * 1.46, 1.75, front * 1.02)
                ankle = (side * 1.82, 0.37, front * 1.59)
                for center in (hip, knee, ankle):
                    joint(root, center, 0.22, 0.47)
                strut(root, hip, knee, 0.17, 'dark')
                strut(root, knee, ankle, 0.15, 'dark')
                panel(root, (0.48, 0.88, 0.37), (side * 1.64, 1.07, front * 1.32), 'ivory', (front * 0.4, 0, side * -0.23))
                panel(root, (0.64, 0.42, 0.68), knee, 'paint')
                piston(root, (side * 1.21, 1.91, front * 1.18), (side * 1.56, 0.54, front * 1.83), 0.055)
                panel(root, (0.76, 0.22, 0.81), (side * 1.83, 0.17, front * 1.75), 'dark')
                panel(root, (0.51, 0.13, 0.35), (side * 1.83, 0.33, front * 1.95), 'paint')
                panel(root, (0.28, 0.055, 0.04), (side * 1.46, 1.78, front * 1.38), 'cyan')
    else:
        for side in (-1, 1):
            heavy = kind == 'anchor'
            reverse = kind == 'reverse'
            hip = (side * (0.67 if heavy else 0.54), 2.87, 0)
            knee = (side * (0.76 if heavy else 0.68), 1.65 if not reverse else 2.08, 0.53 if reverse else 0.08)
            ankle = (side * (0.84 if reverse else 0.76), 0.44, -0.28 if reverse else 0.03)
            joint(root, hip, 0.28 if heavy else 0.23, 0.66 if heavy else 0.48)
            joint(root, knee, 0.25 if heavy else 0.22, 0.73 if heavy else 0.54)
            joint(root, ankle, 0.19, 0.51)
            strut(root, hip, knee, 0.25 if heavy else 0.17, 'dark')
            strut(root, knee, ankle, 0.27 if heavy else 0.16, 'dark')
            breadth = 0.88 if heavy else 0.51
            panel(root, (breadth, 0.84, 0.25), (hip[0] + side * 0.04, 2.35, 0.3), 'paint', (-0.27 if reverse else -0.08, 0, 0))
            panel(root, (breadth * 0.72, 0.25, 0.1), (hip[0] + side * 0.04, 2.58, 0.48), 'ivory')
            plate(root, [(-breadth / 2, 0.18), (breadth / 2, 0.18), (breadth * 0.6, -0.09), (0, -0.32), (-breadth * 0.6, -0.09)], 0.26, (knee[0], knee[1], knee[2] + 0.28), 'ivory')
            panel(root, (0.28, 0.046, 0.04), (knee[0], knee[1] + 0.03, knee[2] + 0.43), 'cyan')
            shin = Vector(knee).lerp(Vector(ankle), 0.54)
            panel(root, (breadth + 0.09, 0.91, 0.26), (shin.x, shin.y, shin.z + 0.25), 'ivory', (-0.4 if reverse else -0.05, 0, 0))
            panel(root, (breadth * 0.32, 0.59, 0.065), (shin.x, shin.y + 0.02, shin.z + 0.43), 'paint')
            for offset in (-1, 1):
                piston(root, (knee[0] + offset * breadth * 0.58, knee[1] - 0.13, knee[2] - 0.1), (ankle[0] + offset * breadth * 0.54, 0.52, ankle[2] - 0.15), 0.048 if heavy else 0.035)
            foot_width = 1.12 if heavy else 0.72
            panel(root, (foot_width, 0.25, 1.12), (ankle[0], 0.2, 0.27), 'dark')
            for toe in (-1, 1):
                panel(root, (foot_width * 0.4, 0.22, 0.66), (ankle[0] + toe * foot_width * 0.24, 0.34, 0.63), 'paint')
                if reverse:
                    plate(root, [(-0.12, 0.09), (0.12, 0.09), (0, -0.23)], 0.51, (ankle[0] + toe * 0.2, 0.2, 1.02), 'steel', (-0.18, 0, 0))
            if heavy:
                for index in range(5):
                    panel(root, (1.13, 0.08, 0.1), (ankle[0], 0.07, -0.15 + index * 0.22), 'rubber', cut=0, bevel=0.004)
                vent(root, (shin.x, shin.y - 0.15, shin.z + 0.44), 0.36, 0.21)
            else:
                nozzle(root, (shin.x, shin.y + 0.08, shin.z - 0.3), 0.13, (0, 0, -1))
    finish_part(root)
    return root


def muzzle_socket(root, position):
    socket = group('socket_muzzle', position, root)
    socket['socket'] = 'muzzle'
    socket['socketKind'] = 'weapon'
    return socket


def build_weapon(kind):
    root = root_part('weapon', kind)
    melee = kind in ('monoblade', 'beamblade')
    root.location = CONVERT @ Vector((1.5, 2.28 if melee else 2.58, 0.34))
    if not melee:
        panel(root, (0.17, 0.53, 0.2), (0, -0.3, 0), 'rubber')
    if kind == 'railgun':
        panel(root, (0.78, 0.61, 1.08), (0, 0.02, 0.3), 'dark')
        for side in (-1, 1):
            panel(root, (0.08, 0.17, 2.16), (side * 0.25, 0.08, 1.35), 'steel', bevel=0.011)
            panel(root, (0.035, 0.06, 1.9), (side * 0.3, 0.08, 1.35), 'cyan', bevel=0.004)
            plate(root, [(-0.17, -0.22), (0.17, -0.22), (0.22, 0.25), (0, 0.42), (-0.22, 0.25)], 0.08, (side * 0.33, 0.23, 0.42), 'paint', (0, side * 0.2, 0))
        panel(root, (0.78, 0.22, 0.57), (0, 0.45, -0.27), 'ivory')
        tube(root, 0.28, 0.18, (0, 0.1, 2.45), 'dark', (0, 0, 1), segments=20)
        ring(root, 0.2, 0.04, (0, 0.1, 2.55), 'cyan', (0, 0, 1))
        muzzle_socket(root, (0, 0.1, 2.65))
    elif kind == 'arc':
        for side in (-1, 1):
            panel(root, (0.3, 1.27, 0.69), (side * 0.39, 0.0, 0.52), 'dark')
            plate(root, [(0, -0.36), (side * 0.25, 0.3), (side * 0.62, 0.61), (side * 0.4, -0.28)], 0.12, (side * 0.13, 0.11, 0.56), 'ivory', (0, side * 0.25, 0))
        ring(root, 0.53, 0.085, (0, 0.04, 0.55), 'steel', (0, 0, 1))
        ring(root, 0.42, 0.06, (0, 0.04, 0.56), 'cyan', (0, 0, 1))
        tube(root, 0.19, 0.34, (0, 0.04, 0.56), 'glass', (0, 0, 1))
        for index in range(6):
            ring(root, 0.47, 0.02, (0, 0.04, 0.08 + index * 0.19), 'bronze', (0, 0, 1), 20)
        muzzle_socket(root, (0, 0.04, 1.75))
    elif kind == 'monoblade':
        panel(root, (0.18, 0.73, 0.18), (0, -0.06, 0), 'rubber')
        panel(root, (0.8, 0.16, 0.31), (0, 0.35, 0), 'steel')
        plate(root, [(-0.42, -0.04), (0.42, -0.04), (0.3, 2.02), (0, 2.45), (-0.3, 2.02)], 0.12, (0, 0.48, 0), 'steel', (0, 0, -0.08))
        plate(root, [(-0.06, 0), (0.06, 0), (0.045, 2.06), (0, 2.31), (-0.045, 2.06)], 0.035, (0.27, 0.52, 0.08), 'cyan', (0, 0, -0.08))
        panel(root, (0.24, 1.58, 0.05), (0.07, 1.57, 0.1), 'paint', (0, 0, -0.08))
        panel(root, (0.29, 0.42, 0.19), (0, 0.62, 0), 'ivory')
        muzzle_socket(root, (0, 3.12, 0.05))
    elif kind == 'gatling':
        panel(root, (0.91, 0.82, 0.91), (0, 0.09, 0), 'dark')
        panel(root, (0.96, 0.26, 0.92), (0, 0.52, 0.03), 'paint')
        joint(root, (0.56, -0.05, -0.13), 0.28, 0.45)
        rotor = group('rotor', (0, 0, 0), root)
        rotor['socket'] = 'rotor'
        rotor['pivot'] = True
        for index in range(6):
            angle = index * math.tau / 6
            tube(rotor, 0.083, 1.65, (math.cos(angle) * 0.27, math.sin(angle) * 0.27, 1.34), 'steel', (0, 0, 1), segments=10)
        ring(root, 0.4, 0.07, (0, 0, 1.14), 'bronze', (0, 0, 1))
        panel(root, (0.34, 0.1, 0.04), (0, 0.47, 0.51), 'caution', cut=0)
        muzzle_socket(root, (0, 0, 2.22))
    elif kind == 'missiles':
        panel(root, (0.94, 0.5, 0.76), (0, 0.2, 0), 'dark')
        panel(root, (0.78, 0.18, 0.58), (0, 0.48, 0.4), 'ivory')
        for row in range(2):
            for column in range(3):
                center = (-0.3 + column * 0.3, 0.42 + row * 0.31, 0.71)
                tube(root, 0.13, 0.08, center, 'steel', (0, 0, 1), segments=14)
                tube(root, 0.08, 0.1, (center[0], center[1], center[2] + 0.06), 'black', (0, 0, 1), segments=12)
                ring(root, 0.05, 0.014, (center[0], center[1], center[2] + 0.12), 'amber', (0, 0, 1), 12)
        panel(root, (0.23, 0.68, 0.27), (0, -0.35, 0), 'paint')
        muzzle_socket(root, (0, 0.12, 1.02))
    else:
        panel(root, (0.18, 0.7, 0.22), (0, -0.02, 0), 'rubber')
        panel(root, (0.58, 0.18, 0.26), (0, 0.34, 0), 'steel')
        plate(root, [(-0.48, 0.02), (0.48, 0.02), (0.28, 2.45), (0, 2.84), (-0.28, 2.45)], 0.07, (0, 0.46, 0.02), 'cyan')
        plate(root, [(-0.17, 0.05), (0.17, 0.05), (0.14, 2.22), (0, 2.52), (-0.14, 2.22)], 0.15, (0, 0.49, 0.08), 'white')
        panel(root, (0.4, 0.45, 0.2), (0, 0.67, 0), 'ivory')
        muzzle_socket(root, (0, 3.2, 0.08))
    finish_part(root)
    return root


def build_backpack(kind):
    root = root_part('backpack', kind)
    root.location = CONVERT @ Vector((0, 4.2, -0.83))
    panel(root, (0.95, 1.1, 0.49), (0, 0, 0), 'dark')
    if kind == 'compact':
        for side in (-1, 1):
            tube(root, 0.24, 1.15, (side * 0.57, -0.08, 0.08), 'paint')
            nozzle(root, (side * 0.57, -0.72, 0.08), 0.26)
            ring(root, 0.25, 0.04, (side * 0.57, 0.22, 0.08), 'steel', (0, 1, 0))
            hose(root, [(side * 0.42, 0.46, 0), (side * 0.94, 0.19, -0.06), (side * 0.82, -0.5, 0.23)], 0.05)
    elif kind == 'wings':
        for side in (-1, 1):
            wing = group('wing', (side * 0.5, 0.05, -0.21), root)
            plate(wing, [(0, -0.4), (side * 0.35, 0.75), (side * 2.4, 2.02), (side * 1.48, -0.34), (side * 0.7, -0.8)], 0.15, (0, 0, 0), 'ivory')
            plate(wing, [(side * 0.2, -0.22), (side * 0.47, 0.6), (side * 2.2, 1.85), (side * 1.26, 0.03), (side * 0.7, -0.45)], 0.045, (0, 0, 0.1), 'paint')
            for index in range(3):
                strut(wing, (side * (0.64 + index * 0.37), 0.32 + index * 0.28, 0.16), (side * (0.72 + index * 0.37), -0.16 + index * 0.28, 0.16), 0.024)
            nozzle(wing, (side * 1.39, -0.37, -0.18), 0.17, (0, 0, -1))
    elif kind == 'missilepack':
        for side in (-1, 1):
            panel(root, (0.84, 1.75, 0.83), (side * 0.82, 0.35, -0.18), 'dark')
            panel(root, (0.88, 1.67, 0.17), (side * 0.82, 0.35, -0.64), 'paint')
            panel(root, (0.88, 0.23, 0.91), (side * 0.82, 1.25, -0.15), 'ivory')
            for row in range(3):
                for column in range(2):
                    center = (side * 0.82 - 0.2 + column * 0.4, 0.41 + row * 0.28, 0.3)
                    tube(root, 0.12, 0.09, center, 'steel', (0, 0, 1), segments=12)
                    tube(root, 0.075, 0.1, (center[0], center[1], center[2] + 0.06), 'black', (0, 0, 1), segments=10)
            nozzle(root, (side * 0.81, -0.72, -0.26), 0.25)
    elif kind == 'funnels':
        for side in (-1, 1):
            for index in range(3):
                module = group('funnel', (side * (0.85 + index * 0.4), 0.43 + index * 0.2, -0.22 - index * 0.16), root)
                module.rotation_euler = (CONVERT @ Euler((0, 0, side * (-0.17 - index * 0.18))).to_matrix() @ CONVERT.transposed()).to_euler()
                plate(module, [(-0.12, -0.85), (0.12, -0.85), (0.18, 0.53), (0, 1.16), (-0.18, 0.53)], 0.17, (0, 0, 0), 'ivory')
                plate(module, [(-0.08, -0.55), (0.08, -0.55), (0.09, 0.4), (0, 0.66), (-0.09, 0.4)], 0.045, (0, 0, 0.13), 'paint')
                panel(module, (0.045, 0.52, 0.04), (0, 0.13, 0.17), 'cyan')
                nozzle(module, (0, -0.84, -0.02), 0.09)
            strut(root, (side * 0.2, 0.1, -0.02), (side * 1.5, 0.8, -0.4), 0.13)
    elif kind == 'reactorpack':
        tube(root, 0.57, 0.55, (0, 0, -0.35), 'steel', (0, 0, 1))
        ring(root, 1.24, 0.13, (0, 0, -0.4), 'dark', (0, 0, 1))
        ring(root, 1.23, 0.043, (0, 0, -0.57), 'cyan', (0, 0, 1))
        for index in range(12):
            angle = index * math.tau / 12
            strut(root, (math.cos(angle) * 0.51, math.sin(angle) * 0.51, -0.4), (math.cos(angle) * 1.13, math.sin(angle) * 1.13, -0.4), 0.09)
            panel(root, (0.18, 0.53, 0.23), (math.sin(angle) * 1.25, math.cos(angle) * 1.25, -0.4), 'ivory' if index % 3 else 'paint', (0, 0, -angle))
    else:
        for side in (-1, 1):
            panel(root, (0.55, 0.86, 1.42), (side * 0.7, -0.06, -0.2), 'paint', (0.13, side * -0.15, 0))
            nozzle(root, (side * 0.75, -0.2, -1.07), 0.45)
            for level in (-1, 1):
                panel(root, (0.37, 0.08, 0.64), (side * 0.73, level * 0.34, -0.5), 'ivory')
            joint(root, (side * 0.47, 0.08, 0.03), 0.24)
        panel(root, (0.52, 1.35, 0.47), (0, -0.13, -0.13), 'ivory')
    finish_part(root)
    return root


def add_uvs():
    for shape in bpy.data.meshes:
        if not shape.polygons:
            continue
        if not shape.uv_layers:
            layer = shape.uv_layers.new(name='UVMap')
        else:
            layer = shape.uv_layers.active
        for polygon in shape.polygons:
            normal = polygon.normal
            axis = max(range(3), key=lambda index: abs(normal[index]))
            axes = [index for index in range(3) if index != axis]
            for loop_index in polygon.loop_indices:
                vertex = shape.vertices[shape.loops[loop_index].vertex_index].co
                layer.data[loop_index].uv = (vertex[axes[0]] * 0.7, vertex[axes[1]] * 0.7)


def select_roots(roots):
    bpy.ops.object.select_all(action='DESELECT')
    for root in roots:
        root.hide_set(False)
        root.select_set(True)
        for child in root.children_recursive:
            child.hide_set(False)
            child.select_set(True)
    bpy.context.view_layer.objects.active = roots[0]


def export_library(roots):
    for shape in list(bpy.data.meshes):
        if shape.users == 0:
            bpy.data.meshes.remove(shape)
    add_uvs()
    select_roots(roots)
    output = OUTPUT / 'IRONCLAD-PARTS.glb'
    bpy.ops.export_scene.gltf(filepath=str(output), export_format='GLB', use_selection=True, export_extras=True, export_normals=True, export_materials='EXPORT', export_animations=False, export_yup=True)
    print('EXPORTED', output, output.stat().st_size)


def main():
    stage = globals().get('BUILD_STAGE', 'all')
    stages = list(OPTIONS) if stage in ('all', 'resume') else [] if stage == 'export' else [stage]
    for stage in stages:
        for kind in OPTIONS[stage]:
            existing = bpy.data.objects.get(stage + '_' + kind)
            if globals().get('BUILD_STAGE') == 'resume' and existing and existing.get('buildComplete'):
                continue
            builder = globals()['build_' + stage]
            builder(kind)
    roots = [bpy.data.objects.get(slot + '_' + kind) for slot, kinds in OPTIONS.items() for kind in kinds]
    roots = [root for root in roots if root and root.get('buildComplete')]
    if len(roots) != 36:
        print('BUILD_PROGRESS', len(roots), '/ 36')
        return
    export_library(roots)
    defaults = ['bulwark', 'visor', 'gauntlet', 'strider', 'railgun', 'compact']
    for root in roots:
        visible = root['option'] in defaults
        for child in [root, *root.children_recursive]:
            child.hide_set(not visible)
            child.hide_render = not visible
    for name in ('Cube', 'Light', 'Camera'):
        starter = bpy.data.objects.get(name)
        if starter and not starter.get('slot'):
            starter.hide_set(True)
            starter.hide_render = True
    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT / 'IRONCLAD-PARTS.blend'))
    print('LIBRARY_ROOTS', len(roots))


main()
