import bpy, json, zipfile
from pathlib import Path
from mathutils import Vector

root=Path(__file__).resolve().parents[1]/'assets'/'characters'/'alex'
source=root/'Meshy_AI_lowpoly_game_characte_1008102845_image-to-3d-texture.fbx'
output=root/'mixamo-upload'
output.mkdir(exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=str(source))
meshes=[obj for obj in bpy.context.scene.objects if obj.type=='MESH']
assert len(meshes)==1 and not any(obj.type=='ARMATURE' for obj in bpy.context.scene.objects)
obj=meshes[0]
obj.name='Alex'
corners=[obj.matrix_world@Vector(corner) for corner in obj.bound_box]
obj.location.z-=min(v.z for v in corners)
texture=bpy.data.images.load(str(source.with_suffix('.png')),check_existing=False)
texture.scale(2048,2048)
texture.filepath_raw=str(output/'alex_basecolor.jpg')
texture.file_format='JPEG'
texture.save()
material=bpy.data.materials.new('Alex_Color')
material.use_nodes=True
bsdf=material.node_tree.nodes.get('Principled BSDF')
bsdf.inputs['Roughness'].default_value=.8
image_node=material.node_tree.nodes.new('ShaderNodeTexImage')
image_node.image=texture
material.node_tree.links.new(image_node.outputs['Color'],bsdf.inputs['Base Color'])
obj.data.materials.clear()
obj.data.materials.append(material)
bpy.ops.object.select_all(action='DESELECT')
obj.select_set(True)
bpy.context.view_layer.objects.active=obj
bpy.ops.wm.obj_export(filepath=str(output/'alex_mixamo.obj'),export_selected_objects=True,export_materials=True,path_mode='STRIP',forward_axis='NEGATIVE_Z',up_axis='Y',global_scale=100)
original_counts=(len(obj.data.vertices),len(obj.data.polygons))
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.wm.obj_import(filepath=str(output/'alex_mixamo.obj'),forward_axis='NEGATIVE_Z',up_axis='Y')
imported=[o for o in bpy.context.scene.objects if o.type=='MESH']
assert len(imported)==1
assert len(imported[0].data.polygons)==original_counts[1]
assert len(imported[0].data.uv_layers)==1
assert not any(o.type=='ARMATURE' for o in bpy.context.scene.objects)
assert 'alex_basecolor.jpg' in (output/'alex_mixamo.mtl').read_text()
with zipfile.ZipFile(root/'alex_mixamo_upload.zip','w',zipfile.ZIP_DEFLATED) as archive:
    for name in ['alex_mixamo.obj','alex_mixamo.mtl','alex_basecolor.jpg']:
        archive.write(output/name,name)
report={'source':source.name,'upload':'alex_mixamo_upload.zip','faces':original_counts[1],'uv_layers':1,'bones':0,'base_color':[2048,2048],'round_trip_import':'passed','mixamo_acceptance':'not yet tested'}
(output/'verification.json').write_text(json.dumps(report,indent=2))
print('PREPARED',json.dumps(report))
