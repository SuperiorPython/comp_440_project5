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

  function reset() {
    heatState.heat = 0;
    heatState.throttled = false;
    heatState.lockout = false;
    heatState.lockoutTimer = 0;
  }

  function tick(deltaTime, activeConnectionCount) {
    if (heatState.lockout) {
      // Heat is frozen during lockout — it does not continue to decay or
      // gain. It resets to a fixed recovery value (not just "wherever decay
      // left it") when the lockout timer runs out, per GDD 3.2.
      heatState.lockoutTimer -= deltaTime;
      if (heatState.lockoutTimer <= 0) {
        heatState.lockout = false;
        heatState.lockoutTimer = 0;
        heatState.heat = LOCKOUT_RESET_HEAT;
        heatState.throttled = heatState.heat > HEAT_THROTTLE_THRESHOLD;
      }
      return;
    }

    const dHeat = (HEAT_GAIN_PER_ACTIVE_CONNECTION * activeConnectionCount - HEAT_PASSIVE_DECAY) * deltaTime;
    heatState.heat = Math.max(0, Math.min(HEAT_MAX, heatState.heat + dHeat));
    heatState.throttled = heatState.heat > HEAT_THROTTLE_THRESHOLD;

    if (heatState.heat >= HEAT_MAX) {
      // Per the GDD state ownership table, Heat Manager is the one system
      // allowed to force-clear Bandwidth Router's slots.
      heatState.lockout = true;
      heatState.lockoutTimer = LOCKOUT_DURATION;
      window.SignalRelay.bandwidthRouter.forceClearAllSlots();
    }
  }

  function isThrottled() {
    return heatState.throttled;
  }

  function isLockedOut() {
    return heatState.lockout;
  }

  return {
    heatState,
    reset,
    tick,
    isThrottled,
    isLockedOut,
    HEAT_MAX,
    HEAT_THROTTLE_THRESHOLD,
  };

})();