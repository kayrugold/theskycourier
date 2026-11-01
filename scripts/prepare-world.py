"""Blender background asset preparation. Source FBXs are never modified."""
import bpy, json, math
from pathlib import Path
from mathutils import Vector, Matrix

root = Path(__file__).resolve().parents[1]
output = root / 'assets' / 'world'
output.mkdir(exist_ok=True)
report = []
for asset in json.loads((root / 'assets/world-inspection.json').read_text()):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    source = root / asset['path'].replace('\\', '/')
    bpy.ops.import_scene.fbx(filepath=str(source))
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    original = sum(len(o.data.polygons) for o in meshes)
    for obj in meshes:
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        obj.data.transform(obj.matrix_world)
        obj.matrix_world = Matrix.Identity(4)
        if asset['category'] != 'buildings':
            obj.data.transform(Matrix.Rotation(math.pi / 2, 4, 'Z'))
        target = 6500 if asset['category'] == 'vehicles' else 5500
        if len(obj.data.polygons) > target:
            modifier = obj.modifiers.new('Game mesh reduction', 'DECIMATE')
            modifier.ratio = target / len(obj.data.polygons)
            bpy.ops.object.modifier_apply(modifier=modifier.name)
        obj.data.materials.clear()
        material = bpy.data.materials.new(asset['id'])
        obj.data.materials.append(material)
    vertices = [v.co for o in meshes for v in o.data.vertices]
    lo = Vector([min(v[i] for v in vertices) for i in range(3)])
    hi = Vector([max(v[i] for v in vertices) for i in range(3)])
    extent = hi - lo
    center = (lo + hi) / 2
    for obj in meshes:
        # Normalized dimensions: X width, Y length, Z height. glTF becomes Y-up.
        for v in obj.data.vertices:
            v.co = Vector(((v.co.x-center.x)/extent.x, (v.co.y-center.y)/extent.y, (v.co.z-lo.z)/extent.z))
        obj.data.update()
    bpy.ops.export_scene.gltf(filepath=str(output / (asset['id']+'.glb')),
        export_format='GLB', use_selection=True, export_animations=False,
        export_materials='NONE', export_yup=True)
    texture = bpy.data.images.load(str(source.with_suffix('.png')), check_existing=False)
    texture.scale(1024,1024)
    texture.filepath_raw = str(output / (asset['id']+'.jpg'))
    texture.file_format = 'JPEG'
    texture.save()
    final = sum(len(o.data.polygons) for o in meshes)
    item = dict(id=asset['id'], category=asset['category'], original_triangles=original,
        triangles=final, texture_size=1024, wheels='integrated mesh',
        proportions=[extent.x,extent.z,extent.y])
    report.append(item)
    print('PREPARED_WORLD', json.dumps(item), flush=True)
(output / 'manifest.json').write_text(json.dumps(report,indent=2))
