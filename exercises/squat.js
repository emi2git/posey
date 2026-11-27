// Squat (side view). Knee angle = hip-knee-ankle; torso lean = shoulder-hip vs vertical.
import { angle, leanFromVertical, pickSide, movingAverage, HOLD_FRAMES } from "./geometry.js";

const DOWN = 100;     // knee angle below this = deep enough
const UP = 160;       // knee angle above this = standing
const DESCENT = 140;  // below this we consider a rep "started"
const MAX_LEAN = 45;  // torso lean warning, degrees from vertical
const TURN = 15;      // knee opens this far past its lowest point = turned back up

const STAND = { head: [48, 12], shoulder: [48, 24], elbow: [60, 26], wrist: [72, 26], hip: [48, 52], knee: [49, 72], ankle: [48, 91], toe: [58, 91] };
const BOTTOM = { head: [62, 45], shoulder: [56, 56], elbow: [70, 57], wrist: [82, 56], hip: [40, 79], knee: [60, 76], ankle: [48, 91], toe: [58, 91] };

export const squat = {
  id: "squat",
  name: "Squat",
  view: "Side view",
  summary: "Depth and back.",
  checks: ["Knee below 100° (thighs parallel)", "Torso lean under 45°", "Stand tall to finish"],
  instructions:
    "Side-on, full body in frame. Thighs parallel, chest up, stand tall.",

  // Looping stick-man of a correct rep (0..100 box, side view, facing right, floor at y=92).
  demo: {
    duration: 2800,
    keyframes: [
      { t: 0, pose: STAND },
      { t: 0.15, pose: STAND },
      { t: 0.5, pose: BOTTOM },
      { t: 0.62, pose: BOTTOM },
      { t: 0.95, pose: STAND },
      { t: 1, pose: STAND },
    ],
  },

  // landmarks: normalized MediaPipe pose landmarks; aspect = width / height
  check(lm, aspect = 1) {
    const s = pickSide(lm, ["shoulder", "hip", "knee", "ankle"]);
    if (!s) return { ok: false, messages: ["Step into frame"], metrics: null };
    const knee = angle(s.hip, s.knee, s.ankle, aspect);
    const lean = leanFromVertical(s.shoulder, s.hip, aspect);
    const messages = [];
    if (lean > MAX_LEAN) messages.push("Chest up");
    return {
      ok: messages.length === 0,
      messages,
      metrics: { knee, lean, side: s.name },
      highlight: [s.shoulder, s.hip, s.knee, s.ankle],
    };
  },

  describe: (m) => `${m.side} side · knee ${m.knee.toFixed(0)}° · lean ${m.lean.toFixed(0)}°`,

  // Rep rules: knee (5-frame trimmed average) must stay below DOWN for HOLD_FRAMES frames, and no correction may fire
  // during the rep. Turning back up before depth -> "Go lower" right away; the rep is failed and not counted.
  // Any check() message during the rep (e.g. "Chest up") also fails it. Everything resets when standing (> UP).
  createRepCounter() {
    const avg = movingAverage(5);
    let started = false, deep = false, failed = false, low = 0, minKnee = Infinity, count = 0;
    return {
      get count() { return count; },
      // update(metrics, corrections?) -> { count, event: null | "rep" | "fault" | "failed", fault (spoken cue), cue, phase }
      // corrections = check() messages shown this frame. "failed" = a failed rep finished (no new cue).
      update(raw, corrections = []) {
        if (!raw) return { count, event: null, cue: null };
        const m = avg.push(raw);
        let event = null, fault = null;
        if (!started && m.knee < DESCENT) { started = true; deep = failed = false; low = 0; minKnee = Infinity; }
        if (started) {
          if (corrections.length) failed = true;
          minKnee = Math.min(minKnee, m.knee);
          low = m.knee < DOWN ? low + 1 : 0;
          if (low >= HOLD_FRAMES) deep = true;
          if (!deep && !failed && m.knee > minKnee + TURN) { failed = true; event = "fault"; fault = "Go lower"; }
          if (m.knee > UP) {
            if (deep && !failed) { count++; event = "rep"; }
            else if (!failed) { event = "fault"; fault = "Go lower"; }
            else if (!event) event = "failed";
            started = false;
          }
        }
        const cue = deep ? "Now drive up" : started ? "Keep going" : "Squat down";
        return { count, event, fault, cue, phase: started ? "down" : "up" };
      },
    };
  },
};
