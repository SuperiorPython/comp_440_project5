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

  function getCanvasCoords(evt) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (evt.clientX - rect.left) * scaleX,
      y: (evt.clientY - rect.top) * scaleY,
    };
  }

  canvas.addEventListener("click", () => {
    const station = window.SignalRelay.stationCore.station;

    if (station.runState === "start") {
      window.SignalRelay.requestQueue.reset();
      window.SignalRelay.bandwidthRouter.reset();
      window.SignalRelay.stationCore.startRun();
    } else if (station.runState === "gameover" || station.runState === "daycomplete") {
      // Screen flow per GDD: GAME OVER / DAY COMPLETE -> restart input -> START.
      // A second click is needed to actually start the next run — this just
      // returns to the start screen, matching the documented flow.
      window.SignalRelay.stationCore.reset();
    }
  });

  canvas.addEventListener("mousedown", (evt) => {
    if (window.SignalRelay.stationCore.station.runState !== "playing") return;
    const { x, y } = getCanvasCoords(evt);
    window.SignalRelay.bandwidthRouter.startDrag(x, y);
  });

  canvas.addEventListener("mousemove", (evt) => {
    const { x, y } = getCanvasCoords(evt);
    window.SignalRelay.bandwidthRouter.updateDrag(x, y);
  });

  canvas.addEventListener("mouseup", (evt) => {
    const { x, y } = getCanvasCoords(evt);
    window.SignalRelay.bandwidthRouter.endDrag(x, y);
  });

  function gameLoop(timestamp) {
    const deltaTime = lastTimestamp === 0 ? 0 : (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;

    const station = window.SignalRelay.stationCore.station;

    if (station.runState === "playing") {
      window.SignalRelay.bandwidthRouter.updateDelivery(deltaTime, window.SignalRelay.heatManager.isThrottled());
      window.SignalRelay.requestQueue.tick(deltaTime, station.time);
      // TODO: once wired in, tick this here too:
      //   heatManager.tick (reads bandwidthRouter active count)
    }

    window.SignalRelay.stationCore.tick(deltaTime);
    window.SignalRelay.render.drawFrame();

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);

})();