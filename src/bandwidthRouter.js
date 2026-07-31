/*
  Bandwidth Router
  ----------------
  Owns: 3 connection slots, drag state, per-slot delivery rate

  Per the GDD, slots[3] can be changed by:
    - player drag-drop input (bind)
    - Request Queue (unbind on complete/miss)
    - Heat Manager (force-clear all slots on lockout)

  Sends to:   Request Queue (bandwidth-delivered increments),
              Heat Manager (heat generation rate — see getHeatGenerationRate)
  Receives from: Request Queue (open request positions, bandwidthNeeded per
                 request for heat-rate weighting),
                 Heat Manager (throttle/lockout status)

  DEVIATION FROM ORIGINAL GDD/ARCHITECTURE: the GDD originally specified
  Heat Manager reading a flat "active connection count" from this module,
  with every connection generating heat equally. After playtesting feedback,
  heat generation was changed to depend on which requests are connected —
  low-bandwidth-need requests (emergency) generate heat faster per second
  than high-bandwidth-need ones (research), on the design rationale that a
  fast, small burst strains the hardware harder than a big steady transfer.
  This meant Bandwidth Router had to start computing a weighted rate instead
  of Heat Manager just counting slots itself, since Heat Manager has no
  visibility into individual requests' bandwidthNeeded.
*/

window.SignalRelay = window.SignalRelay || {};

window.SignalRelay.bandwidthRouter = (function () {

  const CONNECTION_SLOTS = 3; // fixed, mirrors the project's own scope ceiling
  const BANDWIDTH_DELIVERY_RATE = 10;   // units/sec, normal [TUNABLE]
  const THROTTLED_DELIVERY_RATE = 5;    // units/sec, heat > 80 [TUNABLE]

  // A connection's heat contribution scales inversely with the request's
  // bandwidthNeeded: a request needing less bandwidth generates MORE heat
  // per second than one needing more, at this reference/base rate.
  //   research  (needs 40): 4 * 40/40 = 4.0 heat/sec
  //   comms     (needs 30): 4 * 40/30 = 5.3 heat/sec
  //   emergency (needs 20): 4 * 40/20 = 8.0 heat/sec
  const HEAT_RATE_REFERENCE_BANDWIDTH = 40; // [TUNABLE] matches research, the largest request
  const HEAT_RATE_BASE = 4;                 // heat/sec at the reference bandwidth [TUNABLE]

  const router = {
    slots: [null, null, null], // each slot holds a requestId or null
    dragState: {
      active: false,
      originX: 0,
      originY: 0,
      currentX: 0,
      currentY: 0,
    },
  };

  function reset() {
    router.slots = [null, null, null];
    router.dragState = { active: false, originX: 0, originY: 0, currentX: 0, currentY: 0 };
  }

  function getActiveConnectionCount() {
    return router.slots.filter((s) => s !== null).length;
  }

  function getHeatGenerationRate() {
    const requests = window.SignalRelay.requestQueue.queueState.requests;
    let totalRate = 0;

    router.slots.forEach((requestId) => {
      if (requestId === null) return;
      const request = requests.find((r) => r.id === requestId);
      if (!request) return; // defensive: slot pointed at a request that's already gone

      totalRate += HEAT_RATE_BASE * (HEAT_RATE_REFERENCE_BANDWIDTH / request.bandwidthNeeded);
    });

    return totalRate;
  }

  function startDrag(x, y) {
    if (window.SignalRelay.heatManager.isLockedOut()) return; // no new connections during lockout

    const dish = window.SignalRelay.render.getDishCenter();
    const dx = x - dish.x;
    const dy = y - dish.y;
    if (Math.sqrt(dx * dx + dy * dy) <= dish.radius) {
      router.dragState.active = true;
      router.dragState.originX = dish.x;
      router.dragState.originY = dish.y;
      router.dragState.currentX = x;
      router.dragState.currentY = y;
    }
  }

  function updateDrag(x, y) {
    if (!router.dragState.active) return;
    router.dragState.currentX = x;
    router.dragState.currentY = y;
  }

  function endDrag(x, y) {
    if (!router.dragState.active) return;
    tryBindSlot(x, y);
    router.dragState.active = false;
  }

  function tryBindSlot(releaseX, releaseY) {
    const freeSlotIndex = router.slots.findIndex((s) => s === null);
    if (freeSlotIndex === -1) return false; // all 3 slots already in use

    // NOTE: GDD 3.1 specified a 36px radius around a circular request node.
    // The actual UI (commit 4) renders requests as rectangular list cards,
    // so this hit-tests against the card's bounding box instead — a direct
    // adaptation of the same intent to the shipped layout.
    const rects = window.SignalRelay.render.getRequestCardRects();
    const hit = rects.find(
      (r) => releaseX >= r.x && releaseX <= r.x + r.width &&
             releaseY >= r.y && releaseY <= r.y + r.height
    );
    if (!hit) return false;
    if (router.slots.includes(hit.id)) return false; // already connected

    router.slots[freeSlotIndex] = hit.id;
    const request = window.SignalRelay.requestQueue.queueState.requests.find((r) => r.id === hit.id);
    if (request) request.connectedSlot = freeSlotIndex;
    return true;
  }

  function releaseSlot(requestId) {
    const slotIndex = router.slots.indexOf(requestId);
    if (slotIndex !== -1) router.slots[slotIndex] = null;
  }

  function forceClearAllSlots() {
    for (let i = 0; i < router.slots.length; i++) {
      const requestId = router.slots[i];
      if (requestId !== null) {
        const request = window.SignalRelay.requestQueue.queueState.requests.find((r) => r.id === requestId);
        if (request) request.connectedSlot = null;
      }
      router.slots[i] = null;
    }
  }

  function updateDelivery(deltaTime, isThrottled) {
    const rate = isThrottled ? THROTTLED_DELIVERY_RATE : BANDWIDTH_DELIVERY_RATE;
    const requests = window.SignalRelay.requestQueue.queueState.requests;

    router.slots.forEach((requestId) => {
      if (requestId === null) return;
      const request = requests.find((r) => r.id === requestId);
      if (!request) return; // defensive: slot pointed at a request that's already gone

      request.bandwidthDelivered = Math.min(
        request.bandwidthNeeded,
        request.bandwidthDelivered + rate * deltaTime
      );
    });
  }

  return {
    router,
    CONNECTION_SLOTS,
    BANDWIDTH_DELIVERY_RATE,
    THROTTLED_DELIVERY_RATE,
    HEAT_RATE_REFERENCE_BANDWIDTH,
    HEAT_RATE_BASE,
    reset,
    getActiveConnectionCount,
    getHeatGenerationRate,
    startDrag,
    updateDrag,
    endDrag,
    releaseSlot,
    forceClearAllSlots,
    updateDelivery,
  };

})();