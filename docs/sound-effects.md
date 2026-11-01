# Supplied effects and boosters

Source files in `assets/sounds` remain unchanged. At load, effects are decoded once, leading silence is removed, levels are balanced, and edges are faded to prevent abrupt clicks. These are maximum playable lengths after the detected onset:

| File | Use | Seconds |
| --- | --- | --- |
| angrybirdcaw.mp3 | Bird attack / higher-pitched contact | .9 / .4 |
| skateboardjump.mp3 | Normal jump | .4 |
| cartoonjump.mp3 | Launch ramp takeoff | .55 |
| collectstamp.mp3 | Updated stamp pickup; maximum two simultaneous voices | .24 |
| hey.mp3 | Thief warning, replacing the generated voice | 1.4 |
| hurry.mp3 | Approaching an active pickup stop, once per stop | 1 |
| thanks.mp3 | Completed delivery | 1.5 |
| hitconstruction.mp3 | Construction impact / barrier | .65 / .5 |
| hitlightpole.mp3 | Streetlight impact | .65 |
| hoverboardbooster.mp3 | Booster exhaust loop while active | 1.5 per loop |
| oomph.mp3 | Player impact/tackle reaction | .65 |
| runsintometal.mp3 | Car/tram/train collision | .75 |
| skateboardland.mp3 | Ground or vehicle landing | .3 |
| skateboardwheels0.mp3 | Grounded rolling; speed-dependent, stops while stationary | 2 per loop |
| tirescreech.mp3 | Car impact, layered with metal and player reaction | .6 |
| woodenthud.mp3 | Tree impact / tackle body thump | .4 / .3 |

Existing synthesized effects remain for events without supplied recordings (buttons, engines, horns, glider, delivery chimes, finish). Threat/impact cues duck music. Stamp cues have a 65 ms retrigger limit rather than playing overlapping six-second clips. Original sound files are preserved.

The loading screen awaits all model groups, Alex's animations (including the new `alex/alex_runningslide.fbx`), decoded effects, fully downloaded and prebuffered music, texture upload, and shader preparation. Entry remains disabled on failure and offers a reload. Clicking **Enter the City** resumes audio, starts Arcade Breeze, and reveals the title world. **Let's Ride** then starts gameplay with Neon Dodger.

Orange **BOOST · B** tanks appear throughout the course and on every fork route. Carry up to three; a full inventory leaves the pickup in place. Press **B** or the touch **BOOST** button on clear ground to spend one tank for 1.6 seconds of propulsion, with a cap of 118 game speed units and a short wind-down. A 48-point additive exhaust effect follows the rear of the board; its animation pauses with the game.

Boost cannot start during a handoff, tackle, recovery, flight, vehicle ride, hitch, or active slingshot. Braking, collisions, handoffs, glider deployment, hitching and vehicle landings cancel propulsion without refunding the tank. Unused tanks survive ordinary hits and reset on a new run. Sound follows the actual boost state and pauses with gameplay.
