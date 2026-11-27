// Spoken feedback via the Web Speech API (local, no network).
// Corrections cancel anything stale and speak at once; praise never interrupts a correction.
const PRAISE = ["Good job", "Keep it up", "Nice one", "Perfect form", "Good rep"];
const REPEAT_MS = 2000;

const synth = window.speechSynthesis;
let muted = false, unlocked = false, current = null, last = { text: "", at: 0 }, lastPraise = "";
try { muted = localStorage.getItem("efc-muted") === "1"; } catch {}

function speak(text, kind) {
  if (!synth || muted || !unlocked) return false;
  const now = performance.now();
  if (text === last.text && now - last.at < REPEAT_MS) return false;
  if (kind === "praise" && synth.speaking && current === "fix") return false;
  synth.cancel(); // drop stale speech so feedback stays immediate
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.1;
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
    try { localStorage.setItem("efc-muted", m ? "1" : "0"); } catch {}
  },
  // Must run inside a user gesture: browsers block speech until then.
  unlock() {
    if (unlocked || !synth) return;
    unlocked = true;
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    synth.speak(u);
  },
  correct(cue) { return speak(cue.replace(/[!.]$/, ""), "fix"); },
  praise() {
    const pool = PRAISE.filter((p) => p !== lastPraise);
    const text = pool[Math.floor(Math.random() * pool.length)];
    if (speak(text, "praise")) lastPraise = text;
  },
};
