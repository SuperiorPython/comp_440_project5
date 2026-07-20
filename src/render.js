/*
  Render
  ------
  Owns: canvas draw calls, drag-line rendering, HUD layout

  This is a pure leaf node: reads from Station Core, Bandwidth Router,
  Heat Manager, and Request Queue every frame. Writes to none of them.

  Not wired to anything yet — this is the scaffold commit. Real drawing
  (dish, slots, request cards, HUD) gets built in the "canvas boilerplate
  and static HUD layout" commit.
*/

window.SignalRelay = window.SignalRelay || {};

window.SignalRelay.render = (function () {

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  function drawFrame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // TODO: draw dish + slots
    // TODO: draw request cards with deadline rings
    // TODO: draw HUD (clock, reputation meter, heat gauge)
    // TODO: draw active drag line if bandwidthRouter.router.dragState.active
    // TODO: draw lockout banner if heatManager.isLockedOut()
  }

  return {
    drawFrame,
  };

})();