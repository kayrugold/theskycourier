"""Convert source scenery into proportion-preserving, grounded game meshes."""
import bpy, bmesh, json
from pathlib import Path
from mathutils import Vector, Matrix

root = Path(__file__).resolve().parents[1]
output = root / 'assets/environment/game'
output.mkdir(exist_ok=True)
report = []
for name, height in [('streetlight0', 7), ('tree0', 6)]:
    source = next((root / 'assets/environment' / name).rglob('*.fbx'))
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=str(source))
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for obj in meshes:
        obj.data.transform(obj.matrix_world)
        obj.matrix_world = Matrix.Identity(4)
        obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()
    obj = bpy.context.object
    vertices = [v.co for v in obj.data.vertices]
    lo = Vector([min(v[i] for v in vertices) for i in range(3)])
    hi = Vector([max(v[i] for v in vertices) for i in range(3)])
    scale = height / (hi.z - lo.z)
    # Anchor the pole/trunk at ground level, rather than the canopy's center.
    base = [v for v in vertices if v.z < lo.z + (hi.z-lo.z)*.05]
    center = Vector(((min(v.x for v in base)+max(v.x for v in base))/2,
                     (min(v.y for v in base)+max(v.y for v in base))/2, lo.z))
    for v in obj.data.vertices:
        v.co = (v.co-center)*scale
    obj.data.materials.clear()
    bm=bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.00001)
    bm.to_mesh(obj.data)
    bm.free()
    counts = {}
    for suffix, target in [('', 4000), ('-low', 800)]:
        triangles = sum(len(p.vertices)-2 for p in obj.data.polygons)
        modifier = obj.modifiers.new('Game detail', 'DECIMATE')
        modifier.ratio = min(1, target/triangles)
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        counts[suffix or 'near'] = sum(len(p.vertices)-2 for p in obj.data.polygons)
        bpy.ops.export_scene.gltf(filepath=str(output / (name+suffix+'.glb')),
            export_format='GLB', use_selection=True, export_animations=False, export_materials='NONE')
    texture = bpy.data.images.load(str(source.with_suffix('.png')), check_existing=False)
    texture.scale(1024, 1024)
    texture.filepath_raw = str(output / (name+'.jpg'))
    texture.file_format = 'JPEG'
    texture.save()
    report.append(dict(id=name, height=height, dimensions=list((hi-lo)*scale), triangles=counts))
(output / 'manifest.json').write_text(json.dumps(report, indent=2))
print(json.dumps(report), flush=True)
