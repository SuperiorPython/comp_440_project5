/*
  Request Queue / Deadlines
  --------------------------
  Owns: pending + active request list, spawn timer, per-request deadline timers

  Per the GDD, bandwidthDelivered (per request) may ONLY be incremented by
  Bandwidth Router while a slot is actively connected to that request.

  Spawn interval ramps linearly over the run:
    SPAWN_INTERVAL(t) = 25 - (13 * t / 360) seconds  [TUNABLE curve]

  Request types (bandwidthNeeded, deadlineWindow, value, missValue):
    research:  40, 90s, +5,  -8   [TUNABLE]
    comms:     30, 55s, +8,  -12  [TUNABLE]
    emergency: 20, 25s, +15, -22  [TUNABLE]

  Sends to:   Bandwidth Router (which requests are available to connect to),
              Station Core (reputation deltas on complete/miss)
  Receives from: Bandwidth Router (delivery amounts per connected slot),
                 Station Core (current time)

  Not wired to anything yet — this is the scaffold commit.
*/

window.SignalRelay = window.SignalRelay || {};

window.SignalRelay.requestQueue = (function () {

  const REQUEST_TYPES = {
    research:  { bandwidthNeeded: 40, deadlineWindow: 90, value: 5,  missValue: -8 },
    comms:     { bandwidthNeeded: 30, deadlineWindow: 55, value: 8,  missValue: -12 },
    emergency: { bandwidthNeeded: 20, deadlineWindow: 25, value: 15, missValue: -22 },
  };

  const queueState = {
    requests: [], // { id, type, bandwidthNeeded, bandwidthDelivered, spawnTime, deadlineWindow, value, missValue, position, connectedSlot }
    spawnTimer: 0,
    nextRequestId: 1,
  };

  function getSpawnInterval(elapsedSeconds) {
    // TODO: 25 - (13 * elapsedSeconds / 360), per GDD ramp
    return 25;
  }

  function spawnRequest(currentTime) {
    // TODO: pick random type, create request object, push to queueState.requests
  }

  function tick(deltaTime, currentTime) {
    // TODO: advance spawnTimer, spawn on threshold
    // TODO: check each request's deadline, mark missed + apply penalty if expired
  }

  function completeRequest(requestId) {
    // TODO: called when bandwidthDelivered >= bandwidthNeeded
  }

  return {
    queueState,
    REQUEST_TYPES,
    getSpawnInterval,
    spawnRequest,
    tick,
    completeRequest,
  };

})();