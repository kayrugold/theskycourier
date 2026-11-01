# Readability and encounter balance

- Gameplay camera: 6.3 units behind, 3.6 above; 47-degree base field of view.
- Delivery stops: larger camera-facing signs, active light column and ring, a prominent sidewalk/distance HUD cue. The longitudinal handoff window is now 10 units wide.
- Run timer: 150 seconds to allow detours and recovery.
- Birds: full wing strokes about the shoulder instead of twisting along each wing, moving patrols, faster flapping during dives, and target correction through the first 0.15 seconds of a dive. The final 0.4 seconds remain committed and dodgeable.
- Traffic: closer initial spacing and recycling, reassignment to the current route when recycled, and lane changes beginning 100 units before ramp footprints. Vehicles return to their preferred lane after clearing a ramp. Traffic behind a player in a tackle or handoff waits, and cannot stack collision damage during those sequences.
- Ramp rails block lateral passage through their visible edge; the outer clearance pushes the rider onto the sidewalk instead of leaving a narrow road-side slit. Ordinary rail contact slows slightly rather than dealing another damage hit.

## Phone traffic playability pass

- Reduced active vehicles from 18 to 15, increased starting spacing from 18 to 24 units, and moved recycled traffic farther from the rider.
- Ordinary cruising speeds: approximately 64–82 units/second, with small variation and occasional gentle braking. Player throttle remains 88, allowing normal overtakes. Three aggressive drivers cruise around 90–92.
- Ordinary drivers leave about 12 units of following space, slow behind stopped riders, and hold a merge that would cross the rider. Only aggressive drivers can cause the existing brake-check ejection.
- Angry drivers warn with a horn, flashing lamps, and toast for 1.25 seconds, then swerve for 1.1 seconds toward the originally targeted spot. They do not track a dodge. Each attack has a 12-second cooldown and is disabled around handoffs, impacts, recovery, elevated riders, or nearby traffic. No attacks in the first eight seconds.
- Ordinary collisions take 10 package points instead of 15. Aggressive collisions remain 15; aggressive brake-checks remain 16. Cars have a slightly tighter lateral collision margin while buses and trucks keep their clearance.
- A touch swipe now moves 2.85 rather than 5.8 units, providing positions between the vehicle lanes and smaller corrections near deliveries.

This is a tuning baseline, not a claim that the whole course has its final difficulty. Bird contact tests use actual movement and gravity; the animation check samples skinned vertices, not just the presence of an animation clip. Traffic checks cover courteous following, fixed attack targets, cooldowns, protected riders, narrow gaps, live brake events, and lane splitting. Physical phone playtests are still the judge of difficulty and feel.
