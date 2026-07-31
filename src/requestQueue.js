/*
  Request Queue / Deadlines
  --------------------------
  Owns: pending + active request list, spawn timer, per-request deadline timers

  Per the GDD, bandwidthDelivered (per request) may ONLY be incremented by
  Bandwidth Router while a slot is actively connected to that request.

  Spawn interval ramps linearly over the run:
    SPAWN_INTERVAL(t) = 8 - (5.5 * t / 360) seconds  [TUNABLE curve]

  Retuned from the original GDD draft (25s -> 12s) after self-playtesting,
  in two steps:
  1. First pass (25->12s to 10->4s) fixed how few requests ever spawned,
     but a headless simulation of a greedy player still showed connections
     never overlapped — service time per request (2-4s at the normal
     delivery rate) was shorter than the gap between spawns, so a player
     always cleared one request before the next arrived.
  2. Second pass (10->4s to 8->2.5s) targets that directly: the spawn
     interval now drops below typical service time by the run's back half,
     which is what actually forces 2-3 simultaneous connections and
     exercises heat/throttle/lockout as intended by GDD 3.2. Confirmed via
     simulation: a greedy player hits throttle and 2 real lockouts over a
     full run; a player who self-limits to 2 slots avoids lockouts entirely
     and still keeps up (0 misses) — both are the dynamics GDD section 4
     predicted, not something forced after the fact.

  Request types (bandwidthNeeded, deadlineWindow, value, missValue):
    research:  40, 90s, +5,  -8   [TUNABLE]
    comms:     30, 55s, +8,  -12  [TUNABLE]
    emergency: 20, 25s, +15, -22  [TUNABLE]

  Sends to:   Bandwidth Router (which requests are available to connect to),
              Station Core (reputation deltas on complete/miss)
  Receives from: Bandwidth Router (delivery amounts per connected slot),
                 Station Core (current time)
*/

window.SignalRelay = window.SignalRelay || {};

window.SignalRelay.requestQueue = (function () {

  const REQUEST_TYPES = {
    research:  { bandwidthNeeded: 40, deadlineWindow: 90, value: 5,  missValue: -8 },
    comms:     { bandwidthNeeded: 30, deadlineWindow: 55, value: 8,  missValue: -12 },
    emergency: { bandwidthNeeded: 20, deadlineWindow: 25, value: 15, missValue: -22 },
  };
  const TYPE_KEYS = Object.keys(REQUEST_TYPES);

  const SPAWN_INTERVAL_START = 8;   // seconds [TUNABLE]
  const SPAWN_INTERVAL_END = 2.5;   // seconds [TUNABLE]
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
    window.SignalRelay.stationCore.recordCompletion();
    window.SignalRelay.bandwidthRouter.releaseSlot(request.id);
    queueState.requests.splice(index, 1);
  }

  function missRequest(requestId) {
    const index = queueState.requests.findIndex((r) => r.id === requestId);
    if (index === -1) return;

    const request = queueState.requests[index];
    window.SignalRelay.stationCore.applyReputationDelta(request.missValue);
    window.SignalRelay.stationCore.recordMiss();
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