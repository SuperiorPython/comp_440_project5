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

  // Layout constants. Dish sits center-left; requests queue down the right
  // side per the GDD's onboarding description ("dish rendered center-screen").
  const DISH_X = 260;
  const DISH_Y = 320;
  const DISH_RADIUS = 70;

  const SLOT_RADIUS = 22;
  const SLOT_DISTANCE = 130; // from dish center
  // Three slots arranged in an arc facing the request queue (to the right).
  const SLOT_ANGLES = [-40, 0, 40].map((deg) => (deg * Math.PI) / 180);

  const QUEUE_X = 620;
  const QUEUE_TOP = 90;
  const QUEUE_CARD_HEIGHT = 84;
  const QUEUE_CARD_WIDTH = 300;
  const QUEUE_CARD_GAP = 14;

  function drawBackground() {
    ctx.fillStyle = "#0e141b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function drawHUD() {
    const station = window.SignalRelay.stationCore.station;
    const heat = window.SignalRelay.heatManager.heatState;
    const HEAT_MAX = window.SignalRelay.heatManager.HEAT_MAX;
    const THROTTLE = window.SignalRelay.heatManager.HEAT_THROTTLE_THRESHOLD;

    // Clock, top-left
    ctx.fillStyle = "#8b98a5";
    ctx.font = "16px Arial";
    ctx.textAlign = "left";
    const hour = Math.floor((station.time / window.SignalRelay.stationCore.RUN_DURATION_SECONDS) * 24);
    ctx.fillText(`Hour ${hour} / 24`, 24, 30);

    // Reputation meter, top-right
    const repBarX = canvas.width - 224;
    const repBarY = 18;
    const repBarW = 200;
    const repBarH = 16;

    ctx.fillStyle = "#8b98a5";
    ctx.textAlign = "left";
    ctx.fillText("Reputation", repBarX, repBarY - 4);

    ctx.strokeStyle = "#2d3742";
    ctx.strokeRect(repBarX, repBarY, repBarW, repBarH);
    ctx.fillStyle = "#3fb950";
    ctx.fillRect(repBarX, repBarY, repBarW * (station.reputation / 100), repBarH);

    // Heat gauge, below dish
    const heatBarX = DISH_X - 100;
    const heatBarY = DISH_Y + DISH_RADIUS + 40;
    const heatBarW = 200;
    const heatBarH = 16;
    const throttleLineX = heatBarX + heatBarW * (THROTTLE / HEAT_MAX);

    ctx.fillStyle = "#8b98a5";
    ctx.fillText("Heat", heatBarX, heatBarY - 6);

    ctx.strokeStyle = "#2d3742";
    ctx.strokeRect(heatBarX, heatBarY, heatBarW, heatBarH);

    let heatColor = "#3fb950";
    if (heat.heat > THROTTLE) heatColor = "#d29922";
    if (heat.heat >= HEAT_MAX - 1) heatColor = "#f85149";
    ctx.fillStyle = heatColor;
    ctx.fillRect(heatBarX, heatBarY, heatBarW * (heat.heat / HEAT_MAX), heatBarH);

    // Throttle threshold marker line
    ctx.strokeStyle = "#d29922";
    ctx.beginPath();
    ctx.moveTo(throttleLineX, heatBarY - 3);
    ctx.lineTo(throttleLineX, heatBarY + heatBarH + 3);
    ctx.stroke();
  }

  function drawDish() {
    const router = window.SignalRelay.bandwidthRouter.router;

    // Dish body
    ctx.beginPath();
    ctx.arc(DISH_X, DISH_Y, DISH_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = "#1c2430";
    ctx.fill();
    ctx.strokeStyle = "#3d4c5c";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#e6edf3";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.fillText("DISH", DISH_X, DISH_Y + 5);

    // Slot sockets
    SLOT_ANGLES.forEach((angle, i) => {
      const sx = DISH_X + Math.cos(angle) * SLOT_DISTANCE;
      const sy = DISH_Y + Math.sin(angle) * SLOT_DISTANCE;
      const occupied = router.slots[i] !== null;

      ctx.beginPath();
      ctx.arc(sx, sy, SLOT_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = occupied ? "#1f6feb" : "#161b22";
      ctx.fill();
      ctx.strokeStyle = "#3d4c5c";
      ctx.stroke();
    });
  }

  function drawRequestQueue() {
    const requests = window.SignalRelay.requestQueue.queueState.requests;

    ctx.fillStyle = "#8b98a5";
    ctx.font = "16px Arial";
    ctx.textAlign = "left";
    ctx.fillText("Incoming Requests", QUEUE_X, QUEUE_TOP - 14);

    if (requests.length === 0) {
      ctx.fillStyle = "#4b5560";
      ctx.font = "14px Arial";
      ctx.fillText("(none yet — queue is static until spawning is wired in)", QUEUE_X, QUEUE_TOP + 20);
      return;
    }

    requests.forEach((req, i) => {
      const cardY = QUEUE_TOP + i * (QUEUE_CARD_HEIGHT + QUEUE_CARD_GAP);
      ctx.strokeStyle = "#2d3742";
      ctx.strokeRect(QUEUE_X, cardY, QUEUE_CARD_WIDTH, QUEUE_CARD_HEIGHT);
      // TODO: type icon, bandwidth bar, deadline ring — wired in with Request Queue logic
    });
  }

  function drawDragLine() {
    const dragState = window.SignalRelay.bandwidthRouter.router.dragState;
    if (!dragState.active) return;

    ctx.strokeStyle = "#58a6ff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(dragState.originX, dragState.originY);
    ctx.lineTo(dragState.currentX, dragState.currentY);
    ctx.stroke();
  }

  function drawLockoutBanner() {
    if (!window.SignalRelay.heatManager.isLockedOut()) return;

    ctx.fillStyle = "rgba(248, 81, 73, 0.85)";
    ctx.fillRect(DISH_X - DISH_RADIUS, DISH_Y - 12, DISH_RADIUS * 2, 24);
    ctx.fillStyle = "#0e141b";
    ctx.font = "13px Arial";
    ctx.textAlign = "center";
    ctx.fillText("LOCKOUT", DISH_X, DISH_Y + 5);
  }

  function drawFrame() {
    drawBackground();
    drawDish();
    drawRequestQueue();
    drawHUD();
    drawDragLine();
    drawLockoutBanner();
  }

  return {
    drawFrame,
  };

})();