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
  };

  function reset() {
    station.time = 0;
    station.reputation = REPUTATION_START;
    station.runState = "start";
  }

  function startRun() {
    // TODO: transition start -> playing
  }

  function tick(deltaTime) {
    // TODO: advance station.time, check win/lose conditions
  }

  function applyReputationDelta(amount) {
    // TODO: only entry point allowed to modify reputation
    // TODO: trigger gameover runState if reputation <= 0
  }

  return {
    station,
    reset,
    startRun,
    tick,
    applyReputationDelta,
    RUN_DURATION_SECONDS,
  };

})();