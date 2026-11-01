# Flight assets and animation placement

The raised and launch ramp art comes from `assets/world/ramps`. Original ZIPs and extracted FBXs are preserved. `scripts/inspect-flight-assets.py` prepares compact GLBs and color maps in `assets/flight/game`. It also measures the ramp centerline. `src/flight-art.js` fits those meshes to the existing 35/38-unit riding slopes, with 6/6.8-unit rises. The top of the procedural road is at the same height as the collision surface; short routed panels connect through bends. Roads remain procedural.

The glider uses `glider0`, turned and scaled to Alex. The existing flying animation drives his body, with two-bone arm adjustments to reach the control bar. The board is hidden during gliding. The existing pickup requirement and 2.5-second flight limit are unchanged.

## Alex clips

The two new files may stay in `assets/characters/alex/`:

- `reachingfortoes.fbx`: approximately 0.033 seconds, effectively a single pose rather than a movement cycle.
- `honkinghorn.fbx`: approximately 3.33 seconds.

`node scripts/build-alex.mjs` includes both in the 21-clip runtime GLB. Unmatched extra finger tracks are omitted because Alex's hands have fewer bones. Both body rigs match. These clips are available for preview but are not assigned to gameplay actions. Existing legacy clips remain named `assets/characters/alex_<animation>.fbx`.

Open `/glider-review.html` to compare all three poses and orbit around the fitted glider.

## Bird

The source bird is an unrigged mesh. `scripts/rig-angrybird.py` creates a lightweight body + two-wing skeleton, blended shoulder weights, and a looping flap. The editable textured file is `assets/characters/angrybird/angrybird-rig.blend`; the runtime export is `assets/flight/game/angrybird-rig.glb`. This is a starter wing rig, not a full anatomical bird rig: head, tail, talons and individual feathers have no independent controls.

Preview the flap at `/flight-review.html?asset=angrybird`. Forty-six birds now cover 24 encounter points on the main road and every fork branch, starting early in the run. Each new run varies approach side, altitude, trigger distance, curved dive path, and warning duration (0.5 to 0.75 seconds). Birds track during that warning, then commit to a 0.55-second dive. Prediction follows road curvature and integrates jump/glide gravity, terminal descent and remaining glide time. An orange target marks the strike position. Birds correct their target through the first 0.15 seconds of the dive; the remaining 0.4 seconds are committed. Late steering, ground jumps and ducking can evade it. See balance-pass.md for the current camera, traffic, delivery and timer tuning. Each strike costs 8 condition points. Only one attack runs at a time, with 2.2 seconds between attack starts. Birds disengage during parcel handoffs, tackles and other impacts, and attack once per run. Before complex dives or landings, refine shoulder weights and add tail/leg controls in the saved Blender rig.

Rebuild the base exports with Blender's `--background --factory-startup --python scripts/inspect-flight-assets.py`, then run `scripts/rig-angrybird.py` the same way. Original sources are never overwritten.



