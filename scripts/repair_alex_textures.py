"""Prepare a conservative OBJ material package, preserving the accepted geometry."""
import bpy
import json
import shutil
import zipfile
from pathlib import Path
from mathutils import Vector

root = Path(__file__).resolve().parents[1] / 'assets' / 'characters' / 'alex'
output = root / 'mixamo-textured'
output.mkdir(exist_ok=True)
shutil.copyfile(root / 'mixamo-upload' / 'alex_mixamo.obj', output / 'alex_mixamo.obj')
shutil.copyfile(root / 'mixamo-upload' / 'alex_basecolor.jpg', output / 'alex_basecolor.jpg')
(output / 'alex_mixamo.mtl').write_text('''newmtl Alex_Color
Ka 0.200000 0.200000 0.200000
Kd 1.000000 1.000000 1.000000
Ks 0.000000 0.000000 0.000000
Ns 0.000000
d 1.000000
illum 1
map_Kd alex_basecolor.jpg
''', encoding='ascii')
archive_path = root / 'alex_mixamo_textured.zip'
with zipfile.ZipFile(archive_path, 'w', zipfile.ZIP_DEFLATED) as archive:
    for name in ['alex_mixamo.obj', 'alex_mixamo.mtl', 'alex_basecolor.jpg']:
        archive.write(output / name, name)
# Import an extracted copy to verify the archive is self-contained.
extracted = output / 'verified-extraction'
with zipfile.ZipFile(archive_path) as archive:
    archive.extractall(extracted)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.obj_import(filepath=str(extracted / 'alex_mixamo.obj'), forward_axis='NEGATIVE_Z', up_axis='Y')
obj = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
assert len(obj.data.polygons) == 14486
assert len(obj.data.uv_layers) == 1
mat = obj.data.materials[0]
shader = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
assert shader.inputs['Base Color'].is_linked
image_node = shader.inputs['Base Color'].links[0].from_node
assert image_node.type == 'TEX_IMAGE' and image_node.image.has_data
assert tuple(image_node.image.size) == (2048, 2048)
# Unlit preview shows the imported color/UV mapping without lighting ambiguity.
nodes = mat.node_tree.nodes
emission = nodes.new('ShaderNodeEmission')
mat.node_tree.links.new(image_node.outputs['Color'], emission.inputs['Color'])
out = next(n for n in nodes if n.type == 'OUTPUT_MATERIAL')
mat.node_tree.links.new(emission.outputs[0], out.inputs['Surface'])
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 1
scene.cycles.device = 'CPU'
scene.render.resolution_x = 640
scene.render.resolution_y = 640
scene.render.resolution_percentage = 100
scene.view_settings.view_transform = 'Standard'
scene.world = bpy.data.worlds.new('Preview World')
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.12,.12,.12,1)
corners = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
center = sum(corners, Vector()) / 8
bpy.ops.object.camera_add(location=center + Vector((0, -400, 0)))
camera = bpy.context.object
camera.rotation_euler = (center - camera.location).to_track_quat('-Z', 'Y').to_euler()
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 220
scene.camera = camera
scene.render.filepath = str(output / 'alex-texture-preview.png')
bpy.ops.render.render(write_still=True)
(output / 'verification.json').write_text(json.dumps({
    'faces': len(obj.data.polygons), 'uv_layers': 1,
    'base_color_linked_after_zip_extraction': True,
    'texture_size': list(image_node.image.size),
    'mixamo_acceptance': 'Requires upload verification',
}, indent=2))
print('TEXTURED_PACKAGE_VERIFIED', archive_path)
