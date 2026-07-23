/*
  Station Core
  ------------
  Owns: time, reputation, run state (start / playing / gameover / daycomplete)

  Per the GDD state ownership table, reputation may ONLY be changed via
  applyReputationDelta(), called by Request Queue on request complete/miss.
  No other module should write station.reputation directly.

  Sends to:   UI/Render (state to display), Request Queue (current time)
  Receives from: Heat Manager (lockout transitions), Request Queue (reputation deltas)

  Not wired to anything yet — this is the scaffold commit.
*/

window.SignalRelay = window.SignalRelay || {};

window.SignalRelay.stationCore = (function () {

  const RUN_DURATION_SECONDS = 360; // one full in-game day/night cycle
  const REPUTATION_START = 50;      // [TUNABLE] see GDD 3.3

  const station = {
    time: 0,
    reputation: REPUTATION_START,
    runState: "start", // "start" | "playing" | "gameover" | "daycomplete"
    stats: { completed: 0, missed: 0 },
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function reset() {
    station.time = 0;
    station.reputation = REPUTATION_START;
    station.runState = "start";
    station.stats = { completed: 0, missed: 0 };
  }

  function startRun() {
    if (station.runState === "start") {
      station.runState = "playing";
    }
  }

  function tick(deltaTime) {
    if (station.runState !== "playing") return;

    station.time += deltaTime;

    if (station.time >= RUN_DURATION_SECONDS) {
      station.time = RUN_DURATION_SECONDS;
      station.runState = "daycomplete";
    }
  }

  function applyReputationDelta(amount) {
    // Sole entry point for changing reputation, per the GDD state
    // ownership table — Request Queue is the only caller of this.
    station.reputation = clamp(station.reputation + amount, 0, 100);

    if (station.reputation <= 0 && station.runState === "playing") {
      station.runState = "gameover";
    }
  }

  function recordCompletion() {
    station.stats.completed += 1;
  }

  function recordMiss() {
    station.stats.missed += 1;
  }

  return {
    station,
    reset,
    startRun,
    tick,
    applyReputationDelta,
    recordCompletion,
    recordMiss,
    RUN_DURATION_SECONDS,
  };

})();