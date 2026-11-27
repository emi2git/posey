// Shared helpers for exercise checks. Landmarks are MediaPipe normalized {x, y, z, visibility}.
export const LM = {
  left: { shoulder: 11, elbow: 13, wrist: 15, hip: 23, knee: 25, ankle: 27 },
  right: { shoulder: 12, elbow: 14, wrist: 16, hip: 24, knee: 26, ankle: 28 },
};

const vis = (p) => (p ? p.visibility ?? 1 : 0);

// Pick the body side whose joints are most visible. Returns { name, <joint>: point } or null.
export function pickSide(lm, joints, minVis = 0.5) {
  let best = null;
  for (const name of ["left", "right"]) {
    const pts = joints.map((j) => lm[LM[name][j]]);
    const score = Math.min(...pts.map(vis));
    if (!best || score > best.score) best = { name, score, pts };
  }
  if (!best || best.score < minVis) return null;
  const out = { name: best.name };
  joints.forEach((j, i) => (out[j] = best.pts[i]));
  return out;
}

// Angle ABC in degrees, corrected for the frame aspect ratio.
export function angle(a, b, c, aspect = 1) {
  const v1 = [(a.x - b.x) * aspect, a.y - b.y];
  const v2 = [(c.x - b.x) * aspect, c.y - b.y];
  const dot = v1[0] * v2[0] + v1[1] * v2[1];
  const n = Math.hypot(...v1) * Math.hypot(...v2) || 1;
  return (Math.acos(Math.max(-1, Math.min(1, dot / n))) * 180) / Math.PI;
}

// Angle of the segment top->bottom away from vertical, in degrees.
export function leanFromVertical(top, bottom, aspect = 1) {
  const dx = (top.x - bottom.x) * aspect;
  const dy = bottom.y - top.y;
  return (Math.atan2(Math.abs(dx), dy) * 180) / Math.PI;
}
