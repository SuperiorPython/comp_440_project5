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
  const TYPE_KEYS = Object.keys(REQUEST_TYPES);

  const SPAWN_INTERVAL_START = 25; // seconds [TUNABLE]
  const SPAWN_INTERVAL_END = 12;   // seconds [TUNABLE]
  const RUN_DURATION = window.SignalRelay.stationCore
    ? window.SignalRelay.stationCore.RUN_DURATION_SECONDS
    : 360;

  const queueState = {
    requests: [],
    spawnTimer: 0,
    nextRequestId: 1,
  };

  function reset() {
    queueState.requests = [];
    queueState.spawnTimer = 0;
    queueState.nextRequestId = 1;
  }

  function getSpawnInterval(elapsedSeconds) {
    const t = Math.min(elapsedSeconds, RUN_DURATION);
    return SPAWN_INTERVAL_START - (SPAWN_INTERVAL_START - SPAWN_INTERVAL_END) * (t / RUN_DURATION);
  }

  function spawnRequest(currentTime) {
    const typeKey = TYPE_KEYS[Math.floor(Math.random() * TYPE_KEYS.length)];
    const typeDef = REQUEST_TYPES[typeKey];

    queueState.requests.push({
      id: queueState.nextRequestId++,
      type: typeKey,
      bandwidthNeeded: typeDef.bandwidthNeeded,
      bandwidthDelivered: 0,
      spawnTime: currentTime,
      deadlineWindow: typeDef.deadlineWindow,
      value: typeDef.value,
      missValue: typeDef.missValue,
      connectedSlot: null,
    });
  }

  function completeRequest(requestId) {
    const index = queueState.requests.findIndex((r) => r.id === requestId);
    if (index === -1) return;

    const request = queueState.requests[index];
    window.SignalRelay.stationCore.applyReputationDelta(request.value);
    window.SignalRelay.bandwidthRouter.releaseSlot(request.id);
    queueState.requests.splice(index, 1);
  }

  function missRequest(requestId) {
    const index = queueState.requests.findIndex((r) => r.id === requestId);
    if (index === -1) return;

    const request = queueState.requests[index];
    window.SignalRelay.stationCore.applyReputationDelta(request.missValue);
    window.SignalRelay.bandwidthRouter.releaseSlot(request.id);
    queueState.requests.splice(index, 1);
  }

  function tick(deltaTime, currentTime) {
    // Spawn scheduling
    queueState.spawnTimer += deltaTime;
    const interval = getSpawnInterval(currentTime);
    if (queueState.spawnTimer >= interval) {
      queueState.spawnTimer -= interval;
      spawnRequest(currentTime);
    }

    // Deadline checks — iterate a copy since missRequest mutates the array
    queueState.requests.slice().forEach((request) => {
      const deadlineAt = request.spawnTime + request.deadlineWindow;
      if (currentTime >= deadlineAt && request.bandwidthDelivered < request.bandwidthNeeded) {
        missRequest(request.id);
      } else if (request.bandwidthDelivered >= request.bandwidthNeeded) {
        completeRequest(request.id);
      }
    });
  }

  return {
    queueState,
    REQUEST_TYPES,
    reset,
    getSpawnInterval,
    spawnRequest,
    tick,
    completeRequest,
    missRequest,
  };

})();