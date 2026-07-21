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
  const DRAG_RELEASE_HIT_RADIUS = 36;   // px [TUNABLE]

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

  function getActiveConnectionCount() {
    // TODO: count non-null slots
    return 0;
  }

  function tryBindSlot(requestId, releaseX, releaseY) {
    // TODO: hit-test releaseX/Y against request node, bind first free slot
  }

  function releaseSlot(requestId) {
    // TODO: called by Request Queue on complete/miss
  }

  function forceClearAllSlots() {
    // TODO: called by Heat Manager on lockout
  }

  function updateDelivery(deltaTime, isThrottled) {
    // TODO: for each bound slot, increment that request's bandwidthDelivered
  }

  return {
    router,
    CONNECTION_SLOTS,
    getActiveConnectionCount,
    tryBindSlot,
    releaseSlot,
    forceClearAllSlots,
    updateDelivery,
  };

})();