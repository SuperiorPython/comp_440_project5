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

  const TYPE_COLORS = {
    research: "#58a6ff",
    comms: "#a371f7",
    emergency: "#f85149",
  };
  const TYPE_LABELS = {
    research: "RESEARCH",
    comms: "COMMS",
    emergency: "EMERGENCY",
  };

  function drawRequestQueue() {
    const requests = window.SignalRelay.requestQueue.queueState.requests;
    const currentTime = window.SignalRelay.stationCore.station.time;

    ctx.fillStyle = "#8b98a5";
    ctx.font = "16px Arial";
    ctx.textAlign = "left";
    ctx.fillText("Incoming Requests", QUEUE_X, QUEUE_TOP - 14);

    if (requests.length === 0) {
      ctx.fillStyle = "#4b5560";
      ctx.font = "14px Arial";
      ctx.fillText("(waiting for the first request to spawn...)", QUEUE_X, QUEUE_TOP + 20);
      return;
    }

    requests.forEach((req, i) => {
      const cardY = QUEUE_TOP + i * (QUEUE_CARD_HEIGHT + QUEUE_CARD_GAP);
      if (cardY + QUEUE_CARD_HEIGHT > canvas.height) return; // off-screen, skip

      const color = TYPE_COLORS[req.type] || "#8b98a5";
      const deadlineAt = req.spawnTime + req.deadlineWindow;
      const remaining = Math.max(0, deadlineAt - currentTime);
      const urgent = remaining < req.deadlineWindow * 0.25;

      // Card border, colored by type, brighter/red-tinted when urgent
      ctx.strokeStyle = urgent ? "#f85149" : color;
      ctx.lineWidth = urgent ? 2 : 1;
      ctx.strokeRect(QUEUE_X, cardY, QUEUE_CARD_WIDTH, QUEUE_CARD_HEIGHT);
      ctx.lineWidth = 1;

      // Type label
      ctx.fillStyle = color;
      ctx.font = "13px Arial";
      ctx.textAlign = "left";
      ctx.fillText(TYPE_LABELS[req.type] || req.type.toUpperCase(), QUEUE_X + 12, cardY + 20);

      // Bandwidth progress
      ctx.fillStyle = "#8b98a5";
      ctx.font = "12px Arial";
      ctx.fillText(
        `${Math.floor(req.bandwidthDelivered)} / ${req.bandwidthNeeded} bandwidth`,
        QUEUE_X + 12,
        cardY + 40
      );

      const barX = QUEUE_X + 12;
      const barY = cardY + 48;
      const barW = QUEUE_CARD_WIDTH - 24;
      const barH = 8;
      ctx.strokeStyle = "#2d3742";
      ctx.strokeRect(barX, barY, barW, barH);
      ctx.fillStyle = color;
      ctx.fillRect(barX, barY, barW * (req.bandwidthDelivered / req.bandwidthNeeded), barH);

      // Deadline countdown
      ctx.fillStyle = urgent ? "#f85149" : "#8b98a5";
      ctx.font = "12px Arial";
      ctx.textAlign = "right";
      ctx.fillText(`${remaining.toFixed(1)}s left`, QUEUE_X + QUEUE_CARD_WIDTH - 12, cardY + 20);
      ctx.textAlign = "left";
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

  function drawStateOverlay() {
    const station = window.SignalRelay.stationCore.station;
    if (station.runState === "playing") return;

    ctx.fillStyle = "rgba(14, 20, 27, 0.88)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = "center";

    if (station.runState === "start") {
      ctx.fillStyle = "#e6edf3";
      ctx.font = "28px Arial";
      ctx.fillText("Signal Relay", canvas.width / 2, canvas.height / 2 - 20);
      ctx.fillStyle = "#8b98a5";
      ctx.font = "16px Arial";
      ctx.fillText("Click anywhere to start your shift", canvas.width / 2, canvas.height / 2 + 16);
    } else if (station.runState === "gameover") {
      ctx.fillStyle = "#f85149";
      ctx.font = "26px Arial";
      ctx.fillText("SYSTEM FAILURE", canvas.width / 2, canvas.height / 2 - 30);
      ctx.fillStyle = "#8b98a5";
      ctx.font = "16px Arial";
      ctx.fillText("Reputation depleted", canvas.width / 2, canvas.height / 2 + 4);
      ctx.fillText(
        `Completed: ${station.stats.completed}   Missed: ${station.stats.missed}`,
        canvas.width / 2, canvas.height / 2 + 28
      );
      ctx.fillStyle = "#4b5560";
      ctx.font = "13px Arial";
      ctx.fillText("Click to return to start", canvas.width / 2, canvas.height / 2 + 54);
    } else if (station.runState === "daycomplete") {
      ctx.fillStyle = "#3fb950";
      ctx.font = "26px Arial";
      ctx.fillText("DAY COMPLETE", canvas.width / 2, canvas.height / 2 - 30);
      ctx.fillStyle = "#8b98a5";
      ctx.font = "16px Arial";
      ctx.fillText(`Final reputation: ${Math.round(station.reputation)}`, canvas.width / 2, canvas.height / 2 + 4);
      ctx.fillText(
        `Completed: ${station.stats.completed}   Missed: ${station.stats.missed}`,
        canvas.width / 2, canvas.height / 2 + 28
      );
      ctx.fillStyle = "#4b5560";
      ctx.font = "13px Arial";
      ctx.fillText("Click to return to start", canvas.width / 2, canvas.height / 2 + 54);
    }
  }

  function drawFrame() {
    drawBackground();
    drawDish();
    drawRequestQueue();
    drawHUD();
    drawDragLine();
    drawLockoutBanner();
    drawStateOverlay();
  }

  function getDishCenter() {
    return { x: DISH_X, y: DISH_Y, radius: DISH_RADIUS };
  }

  function getRequestCardRects() {
    const requests = window.SignalRelay.requestQueue.queueState.requests;
    const rects = [];
    requests.forEach((req, i) => {
      const cardY = QUEUE_TOP + i * (QUEUE_CARD_HEIGHT + QUEUE_CARD_GAP);
      if (cardY + QUEUE_CARD_HEIGHT > canvas.height) return; // off-screen, matches drawRequestQueue
      rects.push({ id: req.id, x: QUEUE_X, y: cardY, width: QUEUE_CARD_WIDTH, height: QUEUE_CARD_HEIGHT });
    });
    return rects;
  }

  return {
    drawFrame,
    getDishCenter,
    getRequestCardRects,
  };

})();