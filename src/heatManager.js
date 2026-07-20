/*
  Heat Manager
  ------------
  Owns: heat value, throttle flag, lockout timer

  Per the GDD, heat may ONLY be changed by this module's own per-frame
  integration, driven by the active-connection count it reads from
  Bandwidth Router. Bandwidth Router must not set heat directly.

  dHeat = (5 * activeConnections - 3) * deltaTime, clamped [0, 100]

  Sends to:   Bandwidth Router (throttle + lockout status),
              Station Core (lockout state for run-state checks)
  Receives from: Bandwidth Router (active connection count, each frame)

  Not wired to anything yet — this is the scaffold commit.
*/

window.SignalRelay = window.SignalRelay || {};

window.SignalRelay.heatManager = (function () {

  const HEAT_GAIN_PER_ACTIVE_CONNECTION = 5; // heat/sec [TUNABLE]
  const HEAT_PASSIVE_DECAY = 3;              // heat/sec, always applies [TUNABLE]
  const HEAT_MAX = 100;
  const HEAT_THROTTLE_THRESHOLD = 80;        // [TUNABLE]
  const LOCKOUT_DURATION = 8;                // seconds [TUNABLE]
  const LOCKOUT_RESET_HEAT = 40;             // [TUNABLE]

  const heatState = {
    heat: 0,
    throttled: false,
    lockout: false,
    lockoutTimer: 0,
  };

  function tick(deltaTime, activeConnectionCount) {
    // TODO: integrate heat per the formula above, clamp to [0, HEAT_MAX]
    // TODO: set throttled = heat > HEAT_THROTTLE_THRESHOLD
    // TODO: if heat reaches HEAT_MAX, trigger lockout
    // TODO: if lockout active, count down lockoutTimer, clear at 0
  }

  function isThrottled() {
    return heatState.throttled;
  }

  function isLockedOut() {
    return heatState.lockout;
  }

  return {
    heatState,
    tick,
    isThrottled,
    isLockedOut,
    HEAT_MAX,
    HEAT_THROTTLE_THRESHOLD,
  };

})();