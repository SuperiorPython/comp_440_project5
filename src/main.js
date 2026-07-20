/*
  Main
  ----
  Wires the five systems together and runs the game loop via
  requestAnimationFrame with a real deltaTime, per the GDD's technical
  spec (frame-rate independent updates).

  Not wired to anything yet — this is the scaffold commit. Loads last so
  every other module on window.SignalRelay is guaranteed to exist first.
*/

(function () {

  let lastTimestamp = 0;

  function gameLoop(timestamp) {
    const deltaTime = lastTimestamp === 0 ? 0 : (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;

    // TODO: if station.runState === "playing", tick all systems in order:
    //   1. requestQueue.tick (spawns, deadline misses)
    //   2. bandwidthRouter.updateDelivery (feeds requestQueue)
    //   3. heatManager.tick (reads bandwidthRouter active count)
    //   4. stationCore.tick (advances time, checks win/lose)
    // TODO: render.drawFrame() always, regardless of runState

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);

})();