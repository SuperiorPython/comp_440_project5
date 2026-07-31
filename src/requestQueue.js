/*
  Request Queue / Deadlines
  --------------------------
  Owns: pending + active request list, spawn timer, per-request deadline timers

  Per the GDD, bandwidthDelivered (per request) may ONLY be incremented by
  Bandwidth Router while a slot is actively connected to that request.

  Spawn interval ramps linearly over the run, then gets an additional boost
  from reputation:
    baseInterval(t) = 8 - (5.5 * t / 360) seconds  [TUNABLE curve]
    interval = max(1.5, baseInterval - 0.015 * max(0, reputation - 50))

  This was added after playtesting feedback: the time-only ramp still felt
  too slow even after the earlier retune. Tying spawn rate to reputation
  as well means doing well raises the stakes instead of difficulty being
  purely a clock — succeeding at routing/triage now directly increases the
  pressure on you, rather than being purely rewarded with a static
  challenge curve. Floored at 1.5s so it can never become unplayable
  regardless of how high reputation climbs.

  Influence constant was tuned via simulation, not guessed: 0.03 let even
  the safest possible strategy (1 connection at a time, maximally cautious)
  lose outright in testing, which defeats the point of a safe fallback
  strategy existing. 0.015 keeps the escalation real — reputation outcomes
  still spread meaningfully across strategies — without breaking the
  guarantee that careful play can always finish the day.

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

  // Reputation-based spawn pressure: doing well raises the stakes instead of
  // difficulty being purely time-gated. Every reputation point above the
  // starting value (50) shaves a little more off the spawn interval, on top
  // of the existing time ramp — floored so it can never become unplayable.
  const REPUTATION_BASELINE = 50;          // matches stationCore's REPUTATION_START
  const REPUTATION_SPAWN_INFLUENCE = 0.015; // seconds shaved off per point above baseline [TUNABLE] — 0.03 let even the safest (1-slot) strategy lose outright; 0.015 keeps escalation felt without breaking the safe floor
  const MIN_SPAWN_INTERVAL = 1.5;          // seconds, absolute floor [TUNABLE]

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

  function getSpawnInterval(elapsedSeconds, reputation) {
    const t = Math.min(elapsedSeconds, RUN_DURATION);
    const baseInterval = SPAWN_INTERVAL_START - (SPAWN_INTERVAL_START - SPAWN_INTERVAL_END) * (t / RUN_DURATION);

    const reputationBonus = Math.max(0, reputation - REPUTATION_BASELINE) * REPUTATION_SPAWN_INFLUENCE;
    return Math.max(MIN_SPAWN_INTERVAL, baseInterval - reputationBonus);
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

  function tick(deltaTime, currentTime, reputation) {
    // Spawn scheduling
    queueState.spawnTimer += deltaTime;
    const interval = getSpawnInterval(currentTime, reputation);
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