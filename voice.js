// Spoken feedback via the Web Speech API.
// Corrections cancel anything stale and speak at once. Good reps are counted out loud ("One", "Two"…);
// praise is added only every 5th rep or, rarely, at random (never the same phrase twice in a row).
const PRAISE = ["Good job", "Keep it up", "Nice one", "Great form", "Looking strong", "That's it"];
const WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve",
  "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen", "Twenty"];
const PRAISE_EVERY = 5, RANDOM_PRAISE = 0.1, MIN_PRAISE_GAP = 3;
const REPEAT_MS = 2000;
const KEY_MUTED = "efc-muted", KEY_VOICE = "posey-voice";

// Voice ranking: premium/neural voices, then Google English, then known good macOS voices; English only.
const GOOD = ["Samantha", "Ava", "Zoe", "Allison", "Evan", "Tom", "Susan", "Karen", "Daniel", "Serena", "Moira", "Tessa", "Kate", "Oliver", "Nathan", "Joelle", "Noelle"];
const NOVELTY = /^(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Deranged|Good News|Hysterical|Jester|Junior|Organ|Pipe Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Fred|Ralph|Kathy|Princess|Grandma|Grandpa|Eddy|Flo|Reed|Rocko|Sandy|Shelley)\b/i;
function score(v) {
  const n = v.name;
  let s = 0;
  if (/premium|enhanced|natural|neural/i.test(n)) s += 100;
  if (/^Google/i.test(n)) s += 60;
  if (GOOD.some((g) => n.startsWith(g))) s += 40;
  if (NOVELTY.test(n)) s -= 80;
  if (/^en[-_]US/i.test(v.lang)) s += 3;
  else if (/^en[-_](GB|AU|IE|CA)/i.test(v.lang)) s += 2;
  if (v.default) s += 1;
  return s;
}

const synth = window.speechSynthesis;
let muted = false, unlocked = false, current = null, last = { text: "", at: 0 }, lastPraise = "", lastPraiseRep = -99;
let voices = [], chosenURI = "", listeners = [];
try { muted = localStorage.getItem(KEY_MUTED) === "1"; chosenURI = localStorage.getItem(KEY_VOICE) || ""; } catch {}

function loadVoices() {
  if (!synth) return;
  const all = synth.getVoices();
  const en = all.filter((v) => /^en/i.test(v.lang));
  voices = (en.length ? en : all).slice().sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name));
  listeners.forEach((f) => f());
}
if (synth) {
  loadVoices();
  synth.addEventListener?.("voiceschanged", loadVoices); // Chrome/Safari load voices asynchronously
}
const pickVoice = () => voices.find((v) => v.voiceURI === chosenURI) || voices[0] || null;

function speak(text, kind) {
  if (!synth || muted || !unlocked) return false;
  const now = performance.now();
  if (text === last.text && now - last.at < REPEAT_MS) return false;
  synth.cancel(); // drop stale speech so feedback stays immediate
  const u = new SpeechSynthesisUtterance(text);
  const v = pickVoice();
  if (v) { u.voice = v; u.lang = v.lang; } else u.lang = "en-US";
  u.rate = 1.02;
  u.pitch = 1;
  u.onend = () => (current = null);
  current = kind;
  last = { text, at: now };
  synth.speak(u);
  return true;
}

export const voice = {
  get muted() { return muted; },
  setMuted(m) {
    muted = m;
    if (m && synth) synth.cancel();
    try { localStorage.setItem(KEY_MUTED, m ? "1" : "0"); } catch {}
  },
  // Voice picker support: ranked list (best first), current choice ("" = auto/best), change listener.
  get voices() { return voices; },
  get chosen() { return chosenURI; },
  get active() { return pickVoice(); },
  choose(uri) {
    chosenURI = uri || "";
    try { chosenURI ? localStorage.setItem(KEY_VOICE, chosenURI) : localStorage.removeItem(KEY_VOICE); } catch {}
  },
  onVoices(f) { listeners.push(f); f(); },
  // Must run inside a user gesture: browsers block speech until then.
  unlock() {
    if (unlocked || !synth) return;
    unlocked = true;
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    synth.speak(u);
  },
  correct(cue) { return speak(cue.replace(/[!.]$/, ""), "fix"); },
  // Say the rep number; add praise every 5th rep or, rarely, at random.
  count(n) {
    let text = WORDS[n] || String(n);
    const due = n % PRAISE_EVERY === 0 || (n - lastPraiseRep >= MIN_PRAISE_GAP && Math.random() < RANDOM_PRAISE);
    let praise = "";
    if (due) {
      const pool = PRAISE.filter((p) => p !== lastPraise);
      praise = pool[Math.floor(Math.random() * pool.length)];
      text += `. ${praise}`;
    }
    if (speak(text, "count") && praise) { lastPraise = praise; lastPraiseRep = n; }
  },
  reset() { lastPraiseRep = -99; },
};
