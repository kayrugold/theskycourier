# Meshy ramp kit for The Sky Courier

Update: the supplied `raisedramp` and `launchramp` models are now installed. Roads stay procedural, as requested; no additional road kit is needed. See `flight-assets.md` for the implemented fitting pipeline. The generation brief below is retained for future replacement ramp designs.

Keep the game's continuous riding surfaces and launch triggers as the physics layer. Replace their visible meshes with fitted art. The player should follow a smooth, predictable surface even where visual modules join. Do not use raw generated triangles as the riding collider.

## Generate these pieces separately

| Piece | Game dimensions / role |
| --- | --- |
| Raised-road entrance | 6 wide, 35 long, rises 6 units; straight, smooth slope |
| Raised deck | 6 wide; repeatable straight sections, e.g. 12 units long; driving surface at height 6 |
| Supports and side trim | Match deck height; preserve an open tunnel and entrances |
| Launch ramp | 6 wide, 38 long, rises 6.8 units; a distinct orange launch lip and arrows |

These are stylized game units, not required real-world dimensions. Meshy output can be scaled and fitted in Blender. The current elevated decks vary in length, so one complete long roadway model would be difficult to reuse. Use repeatable deck sections with matching open ends; fit the final section to each route's remaining length.

## Suggested visual brief

“Stylized low-poly urban skate courier game, modular raised-road ramp, warm painted concrete, teal metal trim, lightly weathered surfaces, crisp edges, readable silhouette. Straight unobstructed skating surface, no crossbars or props blocking the entrance. Separate freestanding asset, no ground plane, no surrounding city, no characters, no baked dramatic shadows.”

For the launcher, substitute “orange industrial skate launch ramp, clearly marked takeoff edge, broad smooth incline.” Add arrows and readable signs in the game rather than relying on generated lettering.

## Integration workflow

1. Generate the entrance and launcher first; check their silhouette in the game before completing the kit.
2. In Blender, align width to X and travel to Y (glTF export turns travel into Z), ground the entrance, apply transforms, and fit the surface to the dimensions above. Preserve UVs and repair seams.
3. Fit the visible surface to the existing linear slope. If a curved launch lip materially changes the surface, update the visual profile and physics height function together.
4. Export optimized GLBs and color textures, with reduced distant meshes for repeated sections. Share meshes/materials across placements.
5. Place segments from the same route definitions as the physics. Keep a continuous top surface through bends; segment or bend the decorative structures around it rather than stretching one model across a fork.
6. Hide the old procedural art only after the replacement aligns. Test transitions, tunnel clearance, landing, steering at seams, and launching at ordinary speed.

Birds can be a later aerial hazard pass: visible flocks with gaps and warning time along launch corridors. They should add steering choices, not be required to compensate for unlimited gliding. The current 2.5-second allowance already limits flight range.
