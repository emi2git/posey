// Squat (side view). Knee angle = hip-knee-ankle; torso lean = shoulder-hip vs vertical.
import { angle, leanFromVertical, pickSide } from "./geometry.js";

const DOWN = 100;     // knee angle below this = deep enough
const UP = 160;       // knee angle above this = standing
const DESCENT = 140;  // below this we consider a rep "started"
const MAX_LEAN = 45;  // torso lean warning, degrees from vertical

const STAND = { head: [48, 12], shoulder: [48, 24], elbow: [60, 26], wrist: [72, 26], hip: [48, 52], knee: [49, 72], ankle: [48, 91], toe: [58, 91] };
const BOTTOM = { head: [62, 45], shoulder: [56, 56], elbow: [70, 57], wrist: [82, 56], hip: [40, 79], knee: [60, 76], ankle: [48, 91], toe: [58, 91] };

export const squat = {
  id: "squat",
  name: "Squat",
  view: "Side view",
  summary: "The classic lower-body move. Posey watches your depth and your back.",
  checks: ["Depth: knee angle below 100° (thighs about parallel)", "Chest up: torso leans less than 45°", "Full reps: stand tall (knee above 160°) to finish"],
  instructions:
    "Stand side-on to the camera, full body in frame. Squat until your thighs are about parallel, keep your chest up, then stand tall.",

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

  createRepCounter() {
    let phase = "up";      // up | down
    let started = false;   // went below DESCENT this rep
    let deep = false;      // reached DOWN this rep
    let count = 0;
    return {
      get count() { return count; },
      // returns { count, event: null | "rep" | "fault", fault (spoken cue), cue (neutral guidance), phase }
      // Form errors come from check() messages and the "fault" event (shallow rep -> "Go lower").
      update(m) {
        if (!m) return { count, event: null, cue: null };
        let event = null, fault = null, cue = null;
        if (m.knee < DESCENT) started = true;
        if (m.knee < DOWN) { deep = true; phase = "down"; }
        if (m.knee > UP && started) {
          if (deep) { count++; event = "rep"; } else { event = "fault"; fault = "Go lower"; }
          started = deep = false; phase = "up";
        }
        cue = deep ? "Now drive up" : started ? "Keep going" : "Squat down";
        return { count, event, fault, cue, phase };
      },
    };
  },
};
