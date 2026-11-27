import { exercises, byId } from "./exercises/index.js";
import { voice } from "./voice.js";
import { mountDemo } from "./demo.js";

const TASKS = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
const MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

const $ = (id) => document.getElementById(id);
const video = $("video"), canvas = $("overlay"), ctx = canvas.getContext("2d");
const ui = { status: $("status"), statusText: $("status-text"), cue: $("cue"), reps: $("reps"), metrics: $("metrics"), flash: $("flash") };

// Exposed for automated testing / debugging.
const state = (window.posey = { ready: false, frames: 0, detected: 0, reps: 0, cue: "", status: "idle", cues: new Set(), statuses: new Set() });

// Chosen exercise comes from the link: /workout?exercise=<id> (falls back to the first one).
const fromUrl = new URLSearchParams(location.search).get("exercise");
let exercise = (Object.hasOwn(byId, fromUrl ?? "") && byId[fromUrl]) || exercises[0];
let counter = exercise.createRepCounter();
let landmarker, vision, smooth = null, hold = null;

const demo = mountDemo($("demo"));

// Voice: unlock on the first user gesture; mute toggle.
const SPEAKER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/>';
const muteBtn = $("mute");
function paintMute() {
  muteBtn.innerHTML = SPEAKER + (voice.muted ? '<path d="m22 9-6 6M16 9l6 6"/></svg>' : '<path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>');
  muteBtn.setAttribute("aria-pressed", voice.muted);
}
muteBtn.onclick = () => { voice.setMuted(!voice.muted); paintMute(); };
paintMute();
addEventListener("pointerdown", () => voice.unlock(), { once: true });

// Voice picker: "Auto" = best-ranked voice; choice remembered in localStorage.
const voicePick = $("voice");
voice.onVoices(() => {
  const list = voice.voices;
  voicePick.hidden = !list.length;
  const auto = list[0] ? `Auto (${list[0].name})` : "Auto";
  voicePick.innerHTML = `<option value="">${esc(auto)}</option>` +
    list.map((v) => `<option value="${esc(v.voiceURI)}">${esc(v.name)} · ${esc(v.lang)}</option>`).join("");
  voicePick.value = list.some((v) => v.voiceURI === voice.chosen) ? voice.chosen : "";
});
voicePick.onchange = () => {
  voice.choose(voicePick.value);
  voice.unlock();
  voice.correct(`Hi, I'm ${voice.active?.name.replace(/\s*\(.*\)$/, "") || "your coach"}`);
};
function esc(t) { return String(t).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`); }

// Picker
const pick = $("exercise");
pick.innerHTML = exercises.map((e) => `<option value="${e.id}">${e.name} · ${e.view}</option>`).join("");
pick.onchange = () => {
  selectExercise(pick.value);
  history.replaceState(null, "", `?exercise=${encodeURIComponent(exercise.id)}`);
};
function selectExercise(id) {
  exercise = byId[id];
  counter = exercise.createRepCounter();
  $("ex-name").textContent = exercise.name;
  $("ex-help").textContent = exercise.instructions;
  pick.value = exercise.id;
  document.title = `${exercise.name} workout · Posey`;
  ui.reps.textContent = "0";
  smooth = null; hold = null;
  voice.reset();
  demo.set(exercise.demo || null);
}
selectExercise(exercise.id);

async function loadModel() {
  const { FilesetResolver, PoseLandmarker, DrawingUtils } = await import(`${TASKS}/vision_bundle.mjs`);
  vision = { PoseLandmarker, DrawingUtils };
  const files = await FilesetResolver.forVisionTasks(`${TASKS}/wasm`);
  const opts = (delegate) => ({
    baseOptions: { modelAssetPath: MODEL, delegate },
    runningMode: "VIDEO",
    numPoses: 1,
  });
  try {
    landmarker = await PoseLandmarker.createFromOptions(files, opts("GPU"));
  } catch {
    landmarker = await PoseLandmarker.createFromOptions(files, opts("CPU"));
  }
}

$("go").onclick = async () => {
  voice.unlock();
  const btn = $("go"), load = $("load");
  btn.disabled = true;
  try {
    load.textContent = "Starting camera…";
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    video.srcObject = stream;
    await video.play();
    fitStage();
    load.textContent = "Loading pose model…";
    await loadModel();
    state.ready = true;
    $("start").classList.add("hidden");
    requestAnimationFrame(loop);
  } catch (err) {
    console.error(err);
    load.textContent = `Could not start: ${err.message || err}`;
    btn.disabled = false;
  }
};

let lastTime = -1;
function loop() {
  requestAnimationFrame(loop);
  if (video.readyState < 2 || video.currentTime === lastTime) return;
  lastTime = video.currentTime;
  if (canvas.width !== video.videoWidth) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  }
  const res = landmarker.detectForVideo(video, performance.now());
  state.frames++;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const lm = res.landmarks?.[0];
  if (!lm) return render(null);
  state.detected++;
  draw(lm);
  render(lm);
}

function draw(lm) {
  const du = new vision.DrawingUtils(ctx);
  const w = canvas.width;
  du.drawConnectors(lm, vision.PoseLandmarker.POSE_CONNECTIONS, { color: "rgba(255,255,255,0.75)", lineWidth: Math.max(2, w / 320) });
  du.drawLandmarks(lm, { color: "#7c9cff", fillColor: "#0b0d12", lineWidth: 2, radius: Math.max(3, w / 260) });
}

let misses = 0;
function render(lm) {
  const aspect = canvas.width / canvas.height;
  const r = lm ? exercise.check(lm, aspect) : null;
  if (!r?.metrics) {
    // Ride out brief dropouts so the status doesn't flicker.
    if (++misses > 8) show("idle", lm ? "Not visible" : "No one in view", r?.messages[0] || "Step into frame", "");
    return;
  }
  misses = 0;

  // Light smoothing on metrics to keep the rep logic steady.
  smooth = smooth ? Object.fromEntries(Object.entries(r.metrics).map(([k, v]) => [k, typeof v === "number" ? smooth[k] * 0.5 + v * 0.5 : v])) : r.metrics;
  const rep = counter.update(smooth);
  const now = performance.now();

  if (rep.event === "rep") {
    hold = null;
    ui.flash.textContent = rep.count;
    for (const el of [ui.reps.parentElement, ui.flash]) {
      el.classList.remove("bump");
      void el.offsetWidth;
      el.classList.add("bump");
    }
  } else if (rep.event === "fault") {
    hold = { until: now + 1500, cue: rep.fault, ok: false };
  }
  ui.reps.textContent = rep.count;
  state.reps = rep.count;

  let cue, ok;
  if (!r.ok) { cue = r.messages[0]; ok = false; }
  else if (hold && now < hold.until) { cue = hold.cue; ok = hold.ok; }
  else { cue = ""; ok = true; } // no on-screen chatter while form is fine; the count speaks for itself

  if (r.highlight) highlight(r.highlight, ok);

  // Speak: corrections first (immediately), otherwise count each clean rep.
  if (!ok) voice.correct(cue);
  else if (rep.event === "rep") voice.count(rep.count);

  show(ok ? "good" : "bad", ok ? "Tracking" : "Fix form", cue, exercise.describe ? exercise.describe(smooth) : "");
}

function highlight(pts, ok) {
  const w = canvas.width, h = canvas.height;
  ctx.strokeStyle = ok ? "#22c55e" : "#ef4444";
  ctx.lineWidth = Math.max(4, w / 160);
  ctx.lineCap = "round";
  for (const line of Array.isArray(pts[0]) ? pts : [pts]) {
    ctx.beginPath();
    line.forEach((p, i) => (i ? ctx.lineTo(p.x * w, p.y * h) : ctx.moveTo(p.x * w, p.y * h)));
    ctx.stroke();
  }
}

function show(kind, label, cue, metrics) {
  ui.status.className = `status ${kind}`;
  ui.statusText.textContent = label;
  ui.cue.textContent = cue;
  ui.cue.hidden = !cue;
  ui.metrics.textContent = metrics;
  state.status = kind; state.cue = cue;
  state.cues.add(cue); state.statuses.add(kind);
}

// Size the stage to the camera's aspect ratio so nothing is cropped.
const stage = document.querySelector(".stage");
function fitStage() {
  if (!video.videoWidth) return;
  const ratio = video.videoWidth / video.videoHeight;
  const box = stage.parentElement.getBoundingClientRect();
  const cs = getComputedStyle(stage.parentElement);
  const aw = box.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const ah = box.height - parseFloat(cs.paddingBottom);
  const w = Math.min(aw, ah * ratio);
  Object.assign(stage.style, { width: `${w}px`, height: `${w / ratio}px`, aspectRatio: "auto", minHeight: "0", maxWidth: "none" });
}
addEventListener("resize", fitStage);
video.addEventListener("resize", fitStage);
