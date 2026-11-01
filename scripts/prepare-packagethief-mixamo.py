"""Make a textured, skeleton-free Mixamo upload; leave source files intact."""
import bpy, json, zipfile
from pathlib import Path
from mathutils import Vector

root = Path(__file__).resolve().parents[1] / 'assets/characters/packagethief'
source = next((root / 'packagethief').rglob('*.fbx'))
output = root / 'mixamo-upload'
output.mkdir(exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=str(source))
original = list(bpy.context.scene.objects)
report = {'source': str(source.relative_to(root)), 'objects': [dict(name=o.name, type=o.type,
    bones=len(o.data.bones) if o.type=='ARMATURE' else 0,
    vertices=len(o.data.vertices) if o.type=='MESH' else 0) for o in original]}
print('SOURCE_INSPECTION', json.dumps(report), flush=True)
# Bake the visible pose into independent meshes; OBJ cannot carry a skeleton.
depsgraph = bpy.context.evaluated_depsgraph_get()
clean = []
for obj in original:
    if obj.type != 'MESH':
        continue
    evaluated = obj.evaluated_get(depsgraph)
    mesh = bpy.data.meshes.new_from_object(evaluated, preserve_all_data_layers=True, depsgraph=depsgraph)
    mesh.transform(obj.matrix_world)
    copy = bpy.data.objects.new('PackageThief', mesh)
    bpy.context.collection.objects.link(copy)
    clean.append(copy)
for obj in original:
    bpy.data.objects.remove(obj, do_unlink=True)
assert clean, 'No character mesh found'
vertices = [v.co for o in clean for v in o.data.vertices]
lo = Vector([min(v[i] for v in vertices) for i in range(3)])
hi = Vector([max(v[i] for v in vertices) for i in range(3)])
scale = 1.8 / (hi.z-lo.z)
center = Vector(((lo.x+hi.x)/2, (lo.y+hi.y)/2, lo.z))
for obj in clean:
    for v in obj.data.vertices:
        v.co = (v.co-center)*scale
texture = bpy.data.images.load(str(source.with_suffix('.png')), check_existing=False)
texture.scale(2048,2048)
texture.filepath_raw = str(output / 'packagethief_basecolor.jpg')
texture.file_format = 'JPEG'
texture.save()
material = bpy.data.materials.new('PackageThief_Color')
material.use_nodes = True
node = material.node_tree.nodes.new('ShaderNodeTexImage')
node.image = texture
material.node_tree.links.new(node.outputs['Color'], material.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
bpy.ops.object.select_all(action='DESELECT')
for obj in clean:
    obj.data.materials.clear()
    obj.data.materials.append(material)
    for face in obj.data.polygons:
        face.material_index=0
    obj.select_set(True)
bpy.context.view_layer.objects.active=clean[0]
faces = sum(len(o.data.polygons) for o in clean)
bpy.ops.wm.obj_export(filepath=str(output/'packagethief_mixamo.obj'),export_selected_objects=True,
    export_materials=True,path_mode='STRIP',forward_axis='NEGATIVE_Z',up_axis='Y',global_scale=100)
# Use explicit legacy diffuse settings for Mixamo's OBJ material importer.
(output/'packagethief_mixamo.mtl').write_text('''newmtl PackageThief_Color
Ka 0.200000 0.200000 0.200000
Kd 1.000000 1.000000 1.000000
Ks 0.000000 0.000000 0.000000
Ns 0.000000
d 1.000000
illum 1
map_Kd packagethief_basecolor.jpg
''', encoding='ascii')
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.wm.obj_import(filepath=str(output/'packagethief_mixamo.obj'),forward_axis='NEGATIVE_Z',up_axis='Y')
imported=[o for o in bpy.context.scene.objects if o.type=='MESH']
assert sum(len(o.data.polygons) for o in imported)==faces
assert all(len(o.data.uv_layers)>0 for o in imported)
assert not any(o.type=='ARMATURE' for o in bpy.context.scene.objects)
assert 'packagethief_basecolor.jpg' in (output/'packagethief_mixamo.mtl').read_text()
names=['packagethief_mixamo.obj','packagethief_mixamo.mtl','packagethief_basecolor.jpg']
with zipfile.ZipFile(root/'packagethief_mixamo_upload.zip','w',zipfile.ZIP_DEFLATED) as archive:
    for name in names:
        archive.write(output/name,name)
report.update(output='packagethief_mixamo_upload.zip',faces=faces,output_bones=0,
    round_trip='passed; face counts and UVs preserved',mixamo_acceptance='not yet tested')
(output/'verification.json').write_text(json.dumps(report,indent=2))
print('VERIFIED',json.dumps(report),flush=True)
