import bpy, json
from pathlib import Path
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
root=Path(__file__).resolve().parents[1]
out=root/'assets/flight/game'
out.mkdir(parents=True,exist_ok=True)
report=[]
for name,folder in [('raisedramp','world/ramps/raisedramp'),('launchramp','world/ramps/launchramp'),('glider0','gliders/glider0'),('angrybird','characters/angrybird/angrybird')]:
 bpy.ops.wm.read_factory_settings(use_empty=True)
 source=next((root/'assets'/folder).rglob('*.fbx'))
 bpy.ops.import_scene.fbx(filepath=str(source))
 meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
 bpy.ops.object.select_all(action='DESELECT')
 for o in meshes:
  o.data.transform(o.matrix_world);o.matrix_world=Matrix.Identity(4);o.select_set(True)
 bpy.context.view_layer.objects.active=meshes[0];bpy.ops.object.join();o=bpy.context.object
 vs=[v.co for v in o.data.vertices]
 lo=Vector([min(v[i] for v in vs) for i in range(3)]);hi=Vector([max(v[i] for v in vs) for i in range(3)])
 size=hi-lo
 # Normalize longest dimension; preserve proportions for inspection.
 for v in o.data.vertices:v.co=(v.co-Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z)))/max(size)
 item=dict(id=name,dimensions=list(size),bones=sum(len(a.data.bones) for a in bpy.context.scene.objects if a.type=='ARMATURE'))
 if 'ramp' in name:
  tree=BVHTree.FromPolygons([v.co for v in o.data.vertices],[list(p.vertices) for p in o.data.polygons])
  axis=0 if size.x>size.y else 1
  samples=[]
  for i in range(21):
   p=Vector((0,0,2));p[axis]=-.49+i*.049
   hit=tree.ray_cast(p,Vector((0,0,-1)))[0]
   samples.append(list(hit) if hit else None)
  item['centerline']=samples
 o.data.materials.clear()
 mod=o.modifiers.new('Game detail','DECIMATE');mod.ratio=min(1,12000/len(o.data.polygons));bpy.ops.object.modifier_apply(modifier=mod.name)
 bpy.ops.export_scene.gltf(filepath=str(out/(name+'.glb')),export_format='GLB',use_selection=True,export_animations=False,export_materials='NONE')
 tex=bpy.data.images.load(str(source.with_suffix('.png')),check_existing=False);tex.scale(2048,2048);tex.filepath_raw=str(out/(name+'.jpg'));tex.file_format='JPEG';tex.save()
 report.append(item)
(out/'inspection.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report),flush=True)
