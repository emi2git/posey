// Jumping Jacks (front view). Arms = lower wrist height, 0 at shoulder line, 1 at top of head.
// Feet = ankle spread / shoulder width. Rep = closed -> open (top) -> closed.
import { LM } from "./geometry.js";

const ARMS_TOP = 1.0;    // wrists above the head at the top
const FEET_TOP = 1.5;    // ankle spread >= 1.5x shoulder width at the top
const OPEN_ARMS = -0.2;  // past this (or OPEN_FEET) a rep has started
const OPEN_FEET = 1.4;
const CLOSED_ARMS = -0.5; // arms down...
const CLOSED_FEET = 1.3;  // ...and feet together = rep finished
const HEAD = 0.75;       // nose -> top of head, in nose->shoulder-line units

const CLOSED = {
  head: [50, 12], neck: [50, 22], pelvis: [50, 52],
  lShoulder: [42, 24], lElbow: [40, 38], lWrist: [39, 51], rShoulder: [58, 24], rElbow: [60, 38], rWrist: [61, 51],
  lHip: [45, 52], lKnee: [45, 72], lAnkle: [46, 91], rHip: [55, 52], rKnee: [55, 72], rAnkle: [54, 91],
};
const OPEN = {
  ...CLOSED,
  lElbow: [33, 13], lWrist: [40, 2], rElbow: [67, 13], rWrist: [60, 2],
  lKnee: [39, 72], lAnkle: [32, 91], rKnee: [61, 72], rAnkle: [68, 91],
};

const vis = (p) => p?.visibility ?? 1;
const pts = (lm, side, names) => names.map((n) => lm[LM[side][n]]);

export const jumpingJacks = {
  id: "jumping-jacks",
  name: "Jumping Jacks",
  view: "Front view",
  summary: "Full arms, full feet.",
  checks: ["Hands above head", "Feet 1.5× shoulder width", "Back to feet together, arms down"],
  instructions:
    "Face the camera, whole body in view. Feet wide, hands overhead, then back in.",

  demo: {
    duration: 1600,
    limbs: [
      ["lWrist", "lElbow", "lShoulder", "rShoulder", "rElbow", "rWrist"],
      ["neck", "pelvis"],
      ["lAnkle", "lKnee", "lHip", "rHip", "rKnee", "rAnkle"],
    ],
    keyframes: [
      { t: 0, pose: CLOSED },
      { t: 0.1, pose: CLOSED },
      { t: 0.4, pose: OPEN },
      { t: 0.55, pose: OPEN },
      { t: 0.9, pose: CLOSED },
      { t: 1, pose: CLOSED },
    ],
  },

  check(lm, aspect = 1) {
    const core = ["shoulder", "hip", "ankle"];
    const L = pts(lm, "left", [...core, "wrist"]), R = pts(lm, "right", [...core, "wrist"]);
    const nose = lm[0];
    if ([...L.slice(0, 3), ...R.slice(0, 3), nose].some((p) => vis(p) < 0.5))
      return { ok: false, messages: ["Whole body in view"], metrics: null };
    const [ls, lh, la, lw] = L, [rs, rh, ra, rw] = R;
    const shoulderW = Math.abs(ls.x - rs.x) * aspect;
    const shoulderY = (ls.y + rs.y) / 2;
    const torso = (lh.y + rh.y) / 2 - shoulderY;
    if (shoulderW < 0.3 * torso) return { ok: false, messages: ["Face the camera"], metrics: null };
    const unit = (shoulderY - nose.y) * (1 + HEAD); // shoulder line -> top of head
    const arms = (shoulderY - Math.max(lw.y, rw.y)) / (unit || 1);
    const feet = (Math.abs(la.x - ra.x) * aspect) / shoulderW;
    return { ok: true, messages: [], metrics: { arms, feet }, highlight: [[lw, ls, rs, rw], [la, lh, rh, ra]] };
  },

  describe: (m) => `arms ${m.arms.toFixed(2)} · feet ${m.feet.toFixed(1)}× shoulders`,

  createRepCounter() {
    let started = false, peakArms = -Infinity, peakFeet = 0, count = 0;
    return {
      get count() { return count; },
      // returns { count, event: null | "rep" | "fault", fault (spoken cue), cue (neutral guidance) }
      update(m) {
        if (!m) return { count, event: null, cue: null };
        let event = null, fault = null;
        if (m.arms > OPEN_ARMS || m.feet > OPEN_FEET) started = true;
        if (started) { peakArms = Math.max(peakArms, m.arms); peakFeet = Math.max(peakFeet, m.feet); }
        if (started && m.arms < CLOSED_ARMS && m.feet < CLOSED_FEET) {
          const faults = [];
          if (peakArms < ARMS_TOP) faults.push("Arms higher");
          if (peakFeet < FEET_TOP) faults.push(faults.length ? "feet wider" : "Feet wider");
          if (faults.length) { event = "fault"; fault = faults.join(", "); } else { count++; event = "rep"; }
          started = false; peakArms = -Infinity; peakFeet = 0;
        }
        return { count, event, fault, cue: started ? "Back in" : "Jump out" };
      },
    };
  },
};
