// Rep-counting tests with synthetic MediaPipe landmark sequences. Run: node tests/reps.test.mjs
// Each frame goes through check() and createRepCounter().update() exactly as app.js does.
import assert from "node:assert/strict";
import { squat } from "../exercises/squat.js";
import { jumpingJacks } from "../exercises/jumping-jacks.js";

const P = (x, y) => ({ x, y, z: 0, visibility: 1 });
const blank = () => Array.from({ length: 33 }, () => P(0.5, 0.5));

// Side-view squat pose: knee angle (deg) and torso lean (deg from vertical). Both sides identical.
function squatPose(knee, lean = 10) {
  const lm = blank(), r = (d) => (d * Math.PI) / 180;
  const ankle = P(0.5, 0.9), k = P(0.5, 0.7);
  const hip = P(k.x - 0.2 * Math.sin(r(knee)), k.y + 0.2 * Math.cos(r(knee)));
  const sh = P(hip.x + 0.25 * Math.sin(r(lean)), hip.y - 0.25 * Math.cos(r(lean)));
  for (const [s, h, kn, a] of [[11, 23, 25, 27], [12, 24, 26, 28]]) { lm[s] = sh; lm[h] = hip; lm[kn] = k; lm[a] = ankle; }
  return lm;
}
// Front-view jumping-jack pose: arms (0 = shoulder line, 1 = top of head), feet (ankle spread / shoulder width).
function jackPose(arms, feet) {
  const lm = blank(), sy = 0.3, unit = (sy - 0.2) * 1.75;
  lm[0] = P(0.5, 0.2);
  lm[11] = P(0.45, sy); lm[12] = P(0.55, sy); lm[23] = P(0.46, 0.55); lm[24] = P(0.54, 0.55);
  lm[15] = P(0.4, sy - arms * unit); lm[16] = P(0.6, sy - arms * unit);
  lm[27] = P(0.5 - feet * 0.05, 0.9); lm[28] = P(0.5 + feet * 0.05, 0.9);
  return lm;
}

// Linear ramp of values over n frames (excluding start), for building sequences: seq([180], ramp(180, 85, 10), hold(85, 6)…)
const ramp = (a, b, n) => Array.from({ length: n }, (_, i) => a + ((b - a) * (i + 1)) / n);
const hold = (v, n) => Array(n).fill(v);

function run(ex, poses) {
  const counter = ex.createRepCounter(), spoken = [];
  let reps = 0;
  poses.forEach((lm, i) => {
    const r = ex.check(lm, 1);
    if (!r.metrics) return;
    const rep = counter.update(r.metrics, r.ok ? [] : r.messages);
    if (!r.ok) spoken.push({ i, text: r.messages[0] });
    if (rep.event === "fault") spoken.push({ i, text: rep.fault });
    reps = rep.count;
  });
  return { reps, spoken, texts: [...new Set(spoken.map((s) => s.text))] };
}
const sq = (knees, leans) => run(squat, knees.map((k, i) => squatPose(k, leans ? leans[i] : 10)));
const jj = (arms, feet) => run(jumpingJacks, arms.map((a, i) => jackPose(a, feet[i])));

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log("ok   " + name); } catch (e) { fail++; console.log("FAIL " + name + "\n     " + e.message); }
}

// ---------- Squat ----------
test("squat: clean rep counts, no cue", () => {
  const r = sq([...hold(178, 5), ...ramp(178, 85, 12), ...hold(85, 6), ...ramp(85, 178, 12), ...hold(178, 5)]);
  assert.equal(r.reps, 1); assert.deepEqual(r.texts, []);
});
test("squat: shallow rep not counted, 'Go lower' spoken on the way up", () => {
  const down = [...hold(178, 5), ...ramp(178, 115, 12), ...hold(115, 4)];
  const r = sq([...down, ...ramp(115, 178, 12), ...hold(178, 5)]);
  assert.equal(r.reps, 0); assert.deepEqual(r.texts, ["Go lower"]);
  assert.ok(r.spoken[0].i >= down.length, `cue at frame ${r.spoken[0].i}, before the turn (${down.length})`);
});
test("squat: one noisy frame below depth not counted", () => {
  const r = sq([...hold(178, 5), ...ramp(178, 112, 12), 112, 112, 60, 112, 112, ...ramp(112, 178, 12), ...hold(178, 5)]);
  assert.equal(r.reps, 0); assert.ok(r.texts.includes("Go lower"));
});
test("squat: 'Chest up' during descent, then deep -> not counted", () => {
  const knees = [...hold(178, 5), ...ramp(178, 85, 12), ...hold(85, 6), ...ramp(85, 178, 12), ...hold(178, 5)];
  const leans = knees.map((k, i) => (i >= 8 && i <= 11 ? 60 : 15));
  const r = sq(knees, leans);
  assert.equal(r.reps, 0); assert.ok(r.texts.includes("Chest up")); assert.ok(!r.texts.includes("Go lower"));
});
test("squat: slow descent with a pause and jitter, then deep -> counted, no 'Go lower'", () => {
  const jit = (a) => a.map((v, i) => v + (i % 2 ? 3 : -3));
  const r = sq([...hold(178, 5), ...ramp(178, 125, 8), ...jit(hold(125, 8)), ...ramp(125, 85, 8), ...hold(85, 5), ...ramp(85, 178, 10), ...hold(178, 5)]);
  assert.equal(r.reps, 1); assert.deepEqual(r.texts, []);
});
test("squat: failed rep resets at the top; next clean rep counts", () => {
  const shallow = [...ramp(178, 115, 10), ...ramp(115, 178, 10), ...hold(178, 4)];
  const clean = [...ramp(178, 85, 10), ...hold(85, 5), ...ramp(85, 178, 10), ...hold(178, 4)];
  const r = sq([...hold(178, 4), ...clean, ...shallow, ...clean]);
  assert.equal(r.reps, 2); assert.deepEqual(r.texts, ["Go lower"]);
});

// ---------- Jumping jacks ----------
const CA = -1, CF = 1; // closed pose
function jack(topA, topF, n = 8, holdN = 5) {
  return [[...ramp(CA, topA, n), ...hold(topA, holdN), ...ramp(topA, CA, n), ...hold(CA, 4)],
          [...ramp(CF, topF, n), ...hold(topF, holdN), ...ramp(topF, CF, n), ...hold(CF, 4)]];
}
const cat = (...parts) => [parts.flatMap((p) => p[0]), parts.flatMap((p) => p[1])];
const still = [hold(CA, 4), hold(CF, 4)];

test("jacks: clean rep counts, no cue", () => {
  const r = jj(...cat(still, jack(1.3, 1.9)));
  assert.equal(r.reps, 1); assert.deepEqual(r.texts, []);
});
test("jacks: arms too low -> not counted, 'Arms higher' spoken on the way back", () => {
  const [a, f] = cat(still, jack(0.6, 1.9));
  const r = jj(a, f);
  assert.equal(r.reps, 0); assert.deepEqual(r.texts, ["Arms higher"]);
  assert.ok(r.spoken[0].i >= 4 + 8 + 5, `cue at frame ${r.spoken[0].i}, before the turn`);
});
test("jacks: feet too narrow -> not counted, 'Feet wider'", () => {
  const r = jj(...cat(still, jack(1.3, 1.2)));
  assert.equal(r.reps, 0); assert.deepEqual(r.texts, ["Feet wider"]);
});
test("jacks: one noisy frame at the top not counted", () => {
  const a = [...hold(CA, 4), ...ramp(CA, 0.6, 8), 0.6, 0.6, 1.8, 0.6, 0.6, ...ramp(0.6, CA, 8), ...hold(CA, 4)];
  const f = [...hold(CF, 4), ...ramp(CF, 1.2, 8), 1.2, 1.2, 2.4, 1.2, 1.2, ...ramp(1.2, CF, 8), ...hold(CF, 4)];
  const r = jj(a, f);
  assert.equal(r.reps, 0); assert.ok(r.texts.length > 0);
});
test("jacks: correction fires (turned back early), then reaches the top -> not counted", () => {
  const a = [...hold(CA, 4), ...ramp(CA, 0.5, 6), ...hold(0.5, 2), ...ramp(0.5, -0.2, 3), ...ramp(-0.2, 1.3, 6), ...hold(1.3, 5), ...ramp(1.3, CA, 8), ...hold(CA, 4)];
  const f = [...hold(CF, 4), ...ramp(CF, 1.9, 6), ...hold(1.9, 5), ...hold(1.9, 6), ...hold(1.9, 5), ...ramp(1.9, CF, 8), ...hold(CF, 4)];
  const r = jj(a, f);
  assert.equal(r.reps, 0); assert.deepEqual(r.texts, ["Arms higher"]);
});
test("jacks: external correction during a rep fails it", () => {
  const [a, f] = cat(still, jack(1.3, 1.9));
  const c = jumpingJacks.createRepCounter();
  let out;
  a.forEach((v, i) => { const m = jumpingJacks.check(jackPose(v, f[i]), 1).metrics; out = c.update(m, i === 10 ? ["Whole body in view"] : []); });
  assert.equal(out.count, 0);
});
test("jacks: failed rep resets; next clean rep counts", () => {
  const r = jj(...cat(still, jack(1.3, 1.9), jack(0.6, 1.9), jack(1.3, 1.9)));
  assert.equal(r.reps, 2); assert.deepEqual(r.texts, ["Arms higher"]);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
