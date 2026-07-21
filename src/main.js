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
  const canvas = document.getElementById("gameCanvas");

  canvas.addEventListener("click", () => {
    const station = window.SignalRelay.stationCore.station;

    if (station.runState === "start") {
      window.SignalRelay.stationCore.startRun();
    } else if (station.runState === "gameover" || station.runState === "daycomplete") {
      // Screen flow per GDD: GAME OVER / DAY COMPLETE -> restart input -> START.
      // A second click is needed to actually start the next run — this just
      // returns to the start screen, matching the documented flow.
      window.SignalRelay.stationCore.reset();
    }
  });

  function gameLoop(timestamp) {
    const deltaTime = lastTimestamp === 0 ? 0 : (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;

    window.SignalRelay.stationCore.tick(deltaTime);

    // TODO: once other systems are wired in, tick them here too, in order:
    //   1. requestQueue.tick (spawns, deadline misses)
    //   2. bandwidthRouter.updateDelivery (feeds requestQueue)
    //   3. heatManager.tick (reads bandwidthRouter active count)

    window.SignalRelay.render.drawFrame();

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);

})();