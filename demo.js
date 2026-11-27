// Looping stick-man demo. Each exercise supplies `demo = { duration, keyframes: [{ t, pose }] }`,
// where t is 0..1 within the loop and pose maps joint -> [x, y] in a 0..100 box (floor at y=92).
// Optional `limbs` lists the polylines to draw (default: side view, facing right). Every pose needs a `head`.
const NS = "http://www.w3.org/2000/svg";
const SIDE_LIMBS = [
  ["shoulder", "elbow", "wrist"],
  ["shoulder", "hip"],
  ["hip", "knee", "ankle", "toe"],
];

const ease = (x) => 0.5 - Math.cos(Math.PI * x) / 2;

function poseAt(demo, t) {
  const k = demo.keyframes;
  let i = k.findIndex((f) => f.t > t);
  if (i <= 0) return k[i === 0 ? 0 : k.length - 1].pose;
  const a = k[i - 1], b = k[i], f = ease((t - a.t) / (b.t - a.t));
  return Object.fromEntries(Object.keys(a.pose).map((j) => [j, [0, 1].map((n) => a.pose[j][n] + (b.pose[j][n] - a.pose[j][n]) * f)]));
}

export function mountDemo(svg) {
  svg.setAttribute("viewBox", "0 0 100 100");
  const el = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); svg.appendChild(e); return e; };
  el("line", { x1: 10, y1: 92, x2: 90, y2: 92, class: "floor" });
  const head = el("circle", { r: 6, class: "head" });
  let demo = null, limbs = [], lines = [];

  function frame(now) {
    requestAnimationFrame(frame);
    if (!demo) return;
    const p = poseAt(demo, (now % demo.duration) / demo.duration);
    limbs.forEach((names, i) => lines[i].setAttribute("points", names.map((n) => p[n].join(",")).join(" ")));
    head.setAttribute("cx", p.head[0]);
    head.setAttribute("cy", p.head[1]);
  }
  requestAnimationFrame(frame);
  return {
    set(d) {
      demo = d;
      svg.parentElement.hidden = !d;
      lines.forEach((l) => l.remove());
      limbs = d?.limbs || SIDE_LIMBS;
      lines = limbs.map(() => el("polyline", { class: "limb" }));
      svg.appendChild(head); // keep the head on top
    },
  };
}
