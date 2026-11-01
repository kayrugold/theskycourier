"""A lightweight editable wing rig for the bird (no humanoid retargeting)."""
import bpy, math
from pathlib import Path
from mathutils import Vector, Quaternion
root=Path(__file__).resolve().parents[1]
folder=root/'assets/flight/game'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(folder/'angrybird.glb'))
mesh=next(o for o in bpy.context.scene.objects if o.type=='MESH')
arm=bpy.data.armatures.new('BirdRig');rig=bpy.data.objects.new('BirdRig',arm);bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
body=arm.edit_bones.new('body');body.head=(0,0,.2);body.tail=(0,0,.4)
for side in [-1,1]:
 bone=arm.edit_bones.new('wing_left' if side<0 else 'wing_right');bone.head=(side*.12,0,.32);bone.tail=(side*.44,.08,.6);bone.parent=body
bpy.ops.object.mode_set(mode='OBJECT')
groups={name:mesh.vertex_groups.new(name=name) for name in ['body','wing_left','wing_right']}
for v in mesh.data.vertices:
 p=mesh.matrix_world@v.co
 # Feathered wings are above and outside the shoulders. Keep face/talons rigid.
 w=max(0,min(1,(abs(p.x)-.12)/.13))*max(0,min(1,(p.z-.27)/.10))*max(0,min(1,(p.y+.16)/.12))
 groups['body'].add([v.index],1-w,'REPLACE')
 if w:groups['wing_left' if p.x<0 else 'wing_right'].add([v.index],w,'REPLACE')
modifier=mesh.modifiers.new('Bird wings','ARMATURE');modifier.object=rig;mesh.parent=rig
material=bpy.data.materials.new('Bird color');material.use_nodes=True
tex=material.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(folder/'angrybird.jpg'));tex.image.pack()
material.node_tree.links.new(tex.outputs['Color'],material.node_tree.nodes.get('Principled BSDF').inputs['Base Color']);mesh.data.materials.clear();mesh.data.materials.append(material)
for frame in range(1,26):
 phase=(frame-1)/24*math.tau
 for side,name in [(-1,'wing_left'),(1,'wing_right')]:
  bone=rig.pose.bones[name];bone.rotation_mode='QUATERNION'
  axis=bone.bone.matrix_local.to_quaternion().inverted() @ Vector((0,1,0))
  bone.rotation_quaternion=Quaternion(axis,side*(.15+.8*math.sin(phase)));bone.keyframe_insert('rotation_quaternion',frame=frame)
rig.animation_data.action.name='flap'
bpy.context.scene.render.fps=30;bpy.context.scene.frame_end=25;bpy.context.scene.frame_set(1)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.wm.save_as_mainfile(filepath=str(root/'assets/characters/angrybird/angrybird-rig.blend'))
bpy.ops.export_scene.gltf(filepath=str(folder/'angrybird-rig.glb'),export_format='GLB',use_selection=True,export_materials='NONE',export_animations=True)
print('Bird rig and flap exported',flush=True)

