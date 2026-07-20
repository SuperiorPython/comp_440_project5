# Signal Relay

COMP 440 | Project 5 — Build Exactly Yours

## Elevator Pitch

You are the sole operator of a satellite ground station for one twenty-four
hour shift. Requests for bandwidth arrive faster than you can serve them; you
route your three dishes' connections by hand, watch the hardware heat up
under load, and decide in real time whose deadline matters more than whose.

## Running the game

Open `index.html` in a browser. No build step, no dependencies.

## Project structure

```
index.html            Canvas + HUD markup
style.css              All visual styling
src/
  stationCore.js       Owns: time, reputation, run state
  bandwidthRouter.js    Owns: connection slots, drag state, delivery
  heatManager.js        Owns: heat value, throttle flag, lockout timer
  requestQueue.js       Owns: pending/active requests, spawn + deadline timers
  render.js             Reads all systems, draws canvas + HUD each frame
  main.js               Game loop; wires the above systems together
assets/icons/           Request-type icons
```

See the GDD (Signal_Relay_GDD.docx) for full mechanics specs, parameters,
and the systems architecture / state ownership tables this file structure
is built from.

## Status

Scaffold only — modules are stubbed with their responsibilities documented
but no logic wired in yet. See commit history for build order.