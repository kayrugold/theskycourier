"""Build distant meshes from prepared GLBs; originals and near meshes stay intact."""
import bpy, bmesh, json
from pathlib import Path
root = Path(__file__).resolve().parents[1] / 'assets/world'
for asset in json.loads((root / 'manifest.json').read_text()):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(root / (asset['id'] + '.glb')))
    for obj in list(bpy.context.scene.objects):
        if obj.type != 'MESH':
            continue
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        before = [(min(v.co[i] for v in obj.data.vertices), max(v.co[i] for v in obj.data.vertices)) for i in range(3)]
        triangles = sum(len(p.vertices)-2 for p in obj.data.polygons)
        target = 1400 if asset['category'] == 'buildings' else 1800
        modifier = obj.modifiers.new('Distance detail', 'DECIMATE')
        modifier.ratio = min(1, target / triangles)
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
        bm.to_mesh(obj.data)
        bm.free()
        after = [(min(v.co[i] for v in obj.data.vertices), max(v.co[i] for v in obj.data.vertices)) for i in range(3)]
        # Tiny rooftop details can disappear; retain the same silhouette bounds
        # and ground contact when the distance level changes.
        for v in obj.data.vertices:
            for i in range(3):
                lo, hi = before[i]
                a, b = after[i]
                if b > a:
                    v.co[i] = lo + (v.co[i]-a) * (hi-lo)/(b-a)
        obj.data.validate()
    bpy.ops.export_scene.gltf(filepath=str(root / (asset['id'] + '-low.glb')),
        export_format='GLB', export_animations=False, export_materials='NONE')
    print('LOD READY', asset['id'], flush=True)
