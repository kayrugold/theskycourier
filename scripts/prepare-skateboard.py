"""Prepare skateboard0 for the game; preserve the original FBX and proportions."""
import bpy, json, math
from pathlib import Path
from mathutils import Vector, Matrix

root = Path(__file__).resolve().parents[1]
source = next((root / 'assets/skateboards/skateboard0').rglob('*.fbx'))
output = root / 'assets/skateboards/game'
output.mkdir(exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=str(source))
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
for obj in meshes:
    obj.data.transform(obj.matrix_world)
    obj.matrix_world = Matrix.Identity(4)
vertices = [v.co for o in meshes for v in o.data.vertices]
lo = Vector([min(v[i] for v in vertices) for i in range(3)])
hi = Vector([max(v[i] for v in vertices) for i in range(3)])
extent = hi - lo
print('SOURCE_DIMENSIONS', list(extent), flush=True)
# Blender Z is up. Align the longer horizontal axis with the game's travel axis.
rotation = Matrix.Rotation(math.pi / 2 if extent.x > extent.y else 0, 4, 'Z')
scale = 2.1 / max(extent.x, extent.y)
center = (lo + hi) / 2
original = sum(len(o.data.polygons) for o in meshes)
for obj in meshes:
    for v in obj.data.vertices:
        v.co = rotation @ ((v.co - Vector((center.x, center.y, lo.z))) * scale)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    if len(obj.data.polygons) > 8000:
        modifier = obj.modifiers.new('Game mesh reduction', 'DECIMATE')
        modifier.ratio = 8000 / len(obj.data.polygons)
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    obj.data.materials.clear()
bpy.ops.export_scene.gltf(filepath=str(output / 'skateboard0.glb'), export_format='GLB',
    use_selection=True, export_animations=False, export_materials='NONE', export_yup=True)
texture = bpy.data.images.load(str(source.with_suffix('.png')), check_existing=False)
texture.scale(1024, 1024)
texture.filepath_raw = str(output / 'skateboard0.jpg')
texture.file_format = 'JPEG'
texture.save()
report = dict(source=str(source.relative_to(root)), original_faces=original,
    faces=sum(len(o.data.polygons) for o in meshes), length=2.1,
    width=min(extent.x, extent.y)*scale, height=extent.z*scale, scale=scale)
(output / 'manifest.json').write_text(json.dumps(report, indent=2))
print('PREPARED_SKATEBOARD', json.dumps(report), flush=True)
