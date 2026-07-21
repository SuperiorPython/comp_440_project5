/*
  Bandwidth Router
  ----------------
  Owns: 3 connection slots, drag state, per-slot delivery rate

  Per the GDD, slots[3] can be changed by:
    - player drag-drop input (bind)
    - Request Queue (unbind on complete/miss)
    - Heat Manager (force-clear all slots on lockout)

  Sends to:   Request Queue (bandwidth-delivered increments),
              Heat Manager (active connection count)
  Receives from: Request Queue (open request positions),
                 Heat Manager (throttle/lockout status)

  Not wired to anything yet — this is the scaffold commit.
*/

window.SignalRelay = window.SignalRelay || {};

window.SignalRelay.bandwidthRouter = (function () {

  const CONNECTION_SLOTS = 3; // fixed, mirrors the project's own scope ceiling
  const BANDWIDTH_DELIVERY_RATE = 10;   // units/sec, normal [TUNABLE]
  const THROTTLED_DELIVERY_RATE = 5;    // units/sec, heat > 80 [TUNABLE]

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

  function startDrag(x, y) {
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
    reset,
    getActiveConnectionCount,
    startDrag,
    updateDrag,
    endDrag,
    releaseSlot,
    forceClearAllSlots,
    updateDelivery,
  };

})();