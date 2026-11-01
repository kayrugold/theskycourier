import bpy, json
from pathlib import Path
root = Path(__file__).resolve().parents[1] / 'assets' / 'characters' / 'alex'
source = next(root.glob('*.fbx'))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=str(source))
report = {'source':source.name,'objects':[],'images':[]}
for obj in bpy.data.objects:
    entry={'name':obj.name,'type':obj.type,'scale':list(obj.scale),'dimensions':list(obj.dimensions)}
    if obj.type=='MESH':
        entry.update(vertices=len(obj.data.vertices),faces=len(obj.data.polygons),uv_layers=len(obj.data.uv_layers),vertex_groups=len(obj.vertex_groups),modifiers=[m.type for m in obj.modifiers],materials=[m.name if m else None for m in obj.data.materials])
    if obj.type=='ARMATURE': entry['bones']=[b.name for b in obj.data.bones]
    report['objects'].append(entry)
for img in bpy.data.images:
    report['images'].append({'name':img.name,'path':img.filepath,'size':list(img.size),'packed':bool(img.packed_file)})
(root/'alex-inspection.json').write_text(json.dumps(report,indent=2))
print('ALEX_INSPECTION',json.dumps(report))
