import bpy, zipfile
from pathlib import Path
from mathutils import Vector, Matrix
root=Path(__file__).resolve().parents[1]/'assets/environment/stamp'
source_dir=root/'source'
with zipfile.ZipFile(root/'stamp.zip') as archive:
    for member in archive.infolist():
        assert (source_dir/member.filename).resolve().is_relative_to(source_dir.resolve())
    archive.extractall(source_dir)
source=next(source_dir.rglob('*.fbx'))
output=root/'game'
output.mkdir(exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=str(source))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
bpy.ops.object.select_all(action='DESELECT')
for obj in meshes:
    obj.data.transform(obj.matrix_world)
    obj.matrix_world=Matrix.Identity(4)
    obj.select_set(True)
bpy.context.view_layer.objects.active=meshes[0]
bpy.ops.object.join()
obj=bpy.context.object
vertices=[v.co for v in obj.data.vertices]
lo=Vector([min(v[i] for v in vertices) for i in range(3)])
hi=Vector([max(v[i] for v in vertices) for i in range(3)])
for v in obj.data.vertices:
    v.co=(v.co-(lo+hi)/2)*(1.3/max(hi-lo))
obj.data.materials.clear()
modifier=obj.modifiers.new('Collectible detail','DECIMATE')
modifier.ratio=min(1,1200/sum(len(p.vertices)-2 for p in obj.data.polygons))
bpy.ops.object.modifier_apply(modifier=modifier.name)
bpy.ops.export_scene.gltf(filepath=str(output/'stamp.glb'),export_format='GLB',use_selection=True,export_materials='NONE',export_animations=False)
image=bpy.data.images.load(str(source.with_suffix('.png')))
image.scale(1024,1024)
image.filepath_raw=str(output/'stamp.jpg');image.file_format='JPEG';image.save()
print('STAMP_READY',sum(len(p.vertices)-2 for p in obj.data.polygons),flush=True)
