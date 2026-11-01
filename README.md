# The Sky Courier — neighborhood run

A 3D, two-and-a-half-minute hoverboard delivery game built with Three.js and Vite. All assets are local, with no accounts, tracking, external asset servers, or purchases.

## Run

Use Node.js 22.12+ and npm:

```sh
npm ci
npm run dev
```

For the production/offline version:

```sh
npm run build
npm run preview
```

Host `dist/` at a domain root. The production service worker precaches the whole game after the first online load. HTTPS or localhost is required. Development does not register a service worker.

For a public play link and automatic deployment from GitHub, see the
[Cloudflare Pages setup](docs/cloudflare-pages.md). On a tablet or Note 20,
open the deployed HTTPS link in Chrome and use **Add to Home screen / Install app**.
The repository includes prepared runtime assets; original source art stays local.

## Controls and rules

For Wi-Fi testing on the Note 20, compact Termux transfer bundles, and the Android/browser
release direction, see [mobile testing](docs/mobile-testing.md). Run `npm run package:phone`
on the PC to produce playable and editable archives without the source-art/dependency bloat.


- A/D or left/right arrows: steer, including onto the sidewalks for handoffs.
- W/up: accelerate. S/down, C, or Control: momentum slide with friction and reduced steering grip. Tapping keeps the rider low for at least .65 seconds; holding extends to 1.2 seconds, and overhead obstacles delay standing. Down never cancels an airborne jump or changes vertical speed. Holding it through landing starts a slide.
- Space: jump. After collecting a cyan glider, jump from a raised surface or ride the launch ramp, then press Space in the air to open/fold it. Ordinary street jumps cannot deploy it. Each eligible flight has 2.5 seconds of total open-glider time; folding does not refill it. Landing resets eligibility. Street jumps clear six-unit decks in a readable arc of roughly 1.05–1.15 seconds, with gentle falling gravity, .14-second jump buffering, and .1-second edge grace. Deliberate jumps use the flip animation, synchronized to the arc. Generous top-edge catches allow safe descending landings on cars, buses, and semis; rising jumps keep their full arc. Roof landings settle inside the edge and use the active kicking animation. Landing retains 95% of incoming forward speed relative to the vehicle, followed by light rolling drag. Slow or stopped roofs can be crossed quickly; edge catches, lane-change carry, and smooth cab-height drops still apply. Every third deliberate jump adds a visual board spin, without extra controls or changes to collision.
- Shift (B also works): use one orange twin-tank BOOST pack for a 1.6-second NOS burst, including during an ordinary jump. Carry up to three tanks; visible packs appear along both the road and sidewalks on every branch.
- E: hitch to nearby traffic ahead. Charge for at least half a second, then E again for a temporary slingshot. Clicking a nearby vehicle also hitches/releases.
- At forks, steer into your chosen side, press 1–4, or tap a named route button before the split. The choice locks at the fork and roads rejoin smoothly.
- Escape: pause. Switching away from the game also pauses it.
- Touch: swipe left/right to steer (including at forks), swipe up or tap empty space to jump/glide, swipe down to slide, and hold to accelerate. Tap a vehicle to hitch; tap again to release/slingshot. A large BOOST button with tank count stays available near the left thumb; movement uses gestures.

The 6.5 km course has two two-way forks and one four-way split. Six optional deliveries award 2,500 points each, with matching pickup/drop-off pairs on every fork branch (22 NPCs total). Orange minimap dots mark pickups, green dots deliveries, and red diamonds thieves; the next stop has a larger marker. Move close to a sidewalk NPC at street height to start a 0.9-second animated handoff. Alex and the NPC exchange a visible parcel, then the NPC cheers. Waiting NPCs alternate idle and waving animations. Once collected, a parcel remains assigned to its branch's recipient. Missed stops advance to the next job. Best scores are local to the device.

Cruise / throttle / brake speeds are 72 / 88 / 58 world units per second. Ordinary traffic cruises around 64–82, so throttle can pass it. Three of the fifteen drivers are aggressive, cruising around 90–92; their swerves have a horn, flashing brake lights, 1.25-second warning, a fixed target, and a 12-second cooldown. Ordinary drivers yield behind the rider and wait before merging across them. Only aggressive drivers brake-check a hitch or roof ride. Normal vehicle hits take 10 package points; aggressive hits take 15. Half-lane touch swipes allow riding between ordinary cars; larger vehicles need more clearance. Hitching and charged slingshots still provide extra speed.

Alex rides the supplied skateboard0 asset, prepared at 2.1 world units long with its original proportions preserved. Its optimized GLB and 1024px texture live in `assets/skateboards/game/`. Rebuild them with Blender using `--background --python scripts/prepare-skateboard.py`; the source FBX is preserved.

The winged stamp collectible is prepared with `scripts/prepare-stamp.py`. Ten sidewalk thieves make a single committed ambush: warning, short approach using the supplied movement clip, then `divingsave`. Dodge sideways or jump to avoid the tackle. A hit plays Alex's `caught` animation, takes 18 package-condition points, releases any hitch, and holds movement for 1.4 seconds before recovery. Thieves do not chase or retry until a new run. Build the thief animation asset with `node scripts/build-thief.mjs`; `node scripts/build-alex.mjs` includes `alex_caught.fbx` and omits only its extra finger tracks that Alex's simplified hands cannot use.

Giver/receiver Mixamo uploads are generated by `scripts/prepare-delivery-mixamo.py`. Their supplied `idle_skinned.fbx`, `wave.fbx`, `cheer.fbx`, and `give.fbx` / `take.fbx` clips are compiled by `node scripts/build-delivery-npcs.mjs`. Each NPC has its own skeleton and animation mixer while sharing geometry and textures.

Streetlight poles and tree trunks now block and damage riders. Contact uses swept movement, branch matching, and height checks; elevated riders can clear the objects. Tree canopies have wider contact bounds above trunk height. Scenery placements leave clear space around handoff points. Ten thieves are distributed across the city and every fork branch.

The menu hides the skateboard while Alex dances on the street and uses a higher render resolution. The board returns under his feet during gameplay, with anisotropic texture filtering and adaptive resolution. Streetlight0 and tree0 replace the procedural roadside props, scaled proportionally to 7 and 6 units tall and instanced along each route. Rebuild their runtime assets with Blender using `--background --python scripts/prepare-environment.py`.

Cars, buses, and semis have different dimensions. Buses and trailers accept descending roof landings and a short assisted vault while rising from a ground jump; walking into them still causes a collision. Brake lights warn before braking; a braking vehicle throws off and damages an attached rider. New vehicle contacts apply damage even during obstacle grace, while persistent contact does not inflict damage every physics substep.

## Performance and checks

Performance graphics are the default: no real-time shadow maps or multisampling, a capped internal resolution, spatially culled scenery, shared sign textures, merged vehicle meshes, and inexpensive lighting. Nearby models retain full detail; distant models use reduced meshes, and off-camera buildings are excluded from instance batches. The FPS/render-scale/draw-call counter stays visible. Sustained low FPS reduces internal resolution. Physics substeps preserve elapsed time at low rendering FPS; stalls over two seconds pause the game.

Jumps have immediate takeoff, a readable high arc, and gentle descent, forgiving input timing, and assisted bus/semi boarding. Slides use momentum and friction, a low collision profile, a turned board, and a dust trail. Divider obstacles alternate sides to prevent a clear run along either white line. Traffic uses independent slow, fast, and erratic driver profiles. It can overtake a slower rider; vehicle queues and ramp rails still constrain movement. Erratic drivers vary speed, change lanes, and brake abruptly. Angry drivers show a curse bubble and shake a fist before a committed swerve. Vehicles brake and queue at active train crossings, then accelerate after the train tail clears every lane. Traffic above the tracks uses the raised bridge. Solid fixtures and trash cans stop vehicles; barriers and cones tip toward the curb when struck by a vehicle or the rider and reset for the next run. Once settled, fallen roadwork has a low collision shape fitted to its visible position: rolling into it causes one forward trip per contact, while jumping over it clears the hazard. Each road-branch instance keeps its own collision state.

Raised roads have an entry ramp, a deck, and an exit ramp back to street level. Traffic uses these roads and pitches with the slope; jump from the deck to arm a collected glider. The train launch ramp automatically takes off at its 38-unit crest. Glider deployment no longer requires a hitch, slingshot, or minimum speed. Construction barriers have a 1.1-unit opening and 1.75-unit top with a DUCK label: standing contact damages the parcel and blocks movement; ground-level ducking passes through the opening. Bridge supports, buildings, crossing poles, bins, beams, and sidewalk planters have swept physical collision shapes independent of rendering visibility. Planters alternate sidewalk positions while leaving delivery stops clear. Thieves can reach either sidewalk edge, and birds commit to their marked target when the dive begins. See `docs/meshy-ramp-kit.md` for the proposed visual asset replacement plan.

`pnpm test` checks speed, slingshot rules, collision classifications, route continuity, frame-rate independence, and handoffs. In development only, append `?check=1` to run integration checks against the live game loop. That harness is excluded from the production build.

Alex uses the local skinned character and animation assets. The city uses the supplied Meshy buildings, sedans, taxi, school bus, semi, locomotive, and three train-car models. Character customization, unlock progression, Android packaging, and public hosting are future work.

## World assets

Original FBXs and textures stay in their source folders under `assets/`. Prepared runtime assets live in `assets/world/`: normalized GLB meshes and 1024px color textures. The game shares geometry/materials, instances nearby buildings, and keeps procedural fallbacks if an asset fails to load. All runtime files are included in the offline production cache.

To rebuild the prepared assets, run `node scripts/inspect-world.mjs`, then run Blender with `--background --python scripts/prepare-world.py` from the project directory. Blender must be installed. `assets/world/manifest.json` records the triangle counts and original proportions. The development page `/asset-review.html` previews each converted model; it is not a production entry point.

These generated vehicles have wheels fused into the body mesh. Wheels currently remain static. Real wheel rotation requires separating or replacing the wheels and setting their axle pivots; the FBX format itself is not the limitation.

After rebuilding source meshes, run Blender with `--background --python scripts/prepare-world-lod.py` to regenerate distant meshes. Development-only `?benchmark` measures three repeatable city views; add `&fullDetail` to compare with the previous scenery detail/rendering range. This measures rendering, not a complete gameplay run.


