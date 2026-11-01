# Demo tuning

The graphics selector offers Min, Low, Med, and Max and remembers the choice locally. Low is the default for the Pentium N5030 / UHD 605 test machine; try Min if Low is not smooth. Frame rate still needs to be assessed during actual play on that machine.

| Preset | Pixel ceiling | Detailed scenery within | Scenery range |
| --- | --- | --- | --- |
| Min | 640 × 360 | distant meshes throughout | 135 m |
| Low | 768 × 432 | 15 m | 140 m |
| Med | 1280 × 720 | 50 m | 165 m |
| Max | 1920 × 1080 | 80 m | 185 m |

The pixel ceiling is a total budget; aspect ratio is preserved. Low and Min reduce resolution further below 55 FPS, down to a 40% rendering scale. Hidden character roots skip skeleton transform traversal until visible again. Vehicles, enemies, pickups, and collisions are identical across presets. Building, vehicle, train, and environment mesh detail follows the preset.

The loading screen preloads the game and enables **Enter the City** only when ready. Clicking it starts Arcade Breeze on the title screen; Ride switches to Neon Dodger. Returning home restores Arcade Breeze. Pausing stops music. Sound controls beside Graphics independently adjust music and effects, with zero muting that channel; settings persist. Files in `assets/music` form the gameplay playlist on the next build, excluding the title track and preferring Ogg when multiple formats share a song name.

The supplied recordings now replace the synthesized movement, bird and collision cues. The thief uses `hey.mp3`, pickup NPCs use `hurry.mp3`, and receivers use `thanks.mp3`. Tire screeches accompany car impacts. See [sound-effects.md](sound-effects.md) for the current mapping and duration limits. Threat/impact effects duck music to 25%. Four ambient loops and a maximum of sixteen transient voices bound audio overhead; ambient parameters update at 20 Hz. Nearby horns have a global 9–19 second cooldown after the first eight seconds.

Birds track for the first 0.32 seconds of a 0.55-second dive, then commit. Their warnings vary, and their contact width is increased. Late steering, jumping, or grounded ducking remain viable; tests cover ground and glider interception. Visible birds flap even when the game is paused.

Traffic begins staggered at 18-metre intervals across three lanes. Vehicles plan around ramps, have a final footprint guard, and leave seven metres behind a stopped queue. Recovery and handoff protection remains enabled.

Handoffs take 1.6 seconds, with both animations and the parcel transfer using that duration. A dedicated camera centers the rider and NPC, with more distance in narrow viewports. Rings and translucent ground halos mark every stop; the current stop pulses and has a beacon.

Building spacing is approximately 22 metres, with occasional larger gaps. Buildings extend through junctions except where their footprint would occupy a neighboring road. Geometry remains instanced.

Validation: `node --test tests/*.test.js`; with the dev server running, `node scripts/check-demo.mjs` checks browser gameplay, graphics budgets, live traffic ramp exclusion, animated birds, and handoff framing at desktop and narrow widths.
