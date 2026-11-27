# Posey — how it works

## Tech
- **AI model:** MediaPipe Pose Landmarker (Google, BlazePose). Small neural net, ~5 MB. Finds 33 body points / frame.
- **Runs:** in browser, on your device. ~30 fps. Video never leaves device.
- **App:** plain HTML + JavaScript. No server logic, no build.
- **Posture check:** simple math (angles), not AI.

## Flow

```
 📷 Camera
    │  video frames (~30/sec)
    ▼
 🧠 AI model (in browser)
    │  33 body points: shoulder, hip, knee, ankle…
    ▼
 📐 Angle math
    │  knee angle, back lean
    ▼
 ✅ Rules for chosen exercise
    │  deep enough? back too bent?
    ▼
 🖥️ Screen
    green/red · cue ("Go lower") · rep count
```

## Squat rules
```
   stand           down            up again
    O               O                O
   /|\             /|\              /|\
    |              _/               |
   / \            /  \             / \
 knee ~180°     knee <100°      knee >160°  → +1 rep
```
- Turns back up before knee < 100° → **"Go lower"** (said right away)
- Back lean > 45° → **"Chest up"**
- Counts only if knee < 100° held 3 frames and no fix was called during the rep.

## Jumping Jacks rules
```
  closed           open (top)        closed
    O              \ O /               O
   /|\               |               /|\
    |                |                |
   | |             /   \             | |
 arms down     wrists > head      back in   → +1 rep
 feet together  feet > 1.5× shoulders
```
- Wrists not above head at top → **"Arms higher"**
- Feet < ~1.5× shoulder width at top → **"Feet wider"**
- Said as soon as you come back in early.
- Counts only if top held 3 frames and no fix was called. Bad rep = not counted.
- Angles are smoothed over 5 frames, so one noisy frame can't count a rep.
- Face camera, whole body in view.

## Voice
- Good rep → says count: "One", "Two"…
- Praise only every 5th rep (+ rare random). No same praise twice in row.
- Fix → said at once, beats count.
- Screen: big count, no "Good rep" chatter. Cue box only for fixes.
- Picks best voice (Premium/Enhanced/Neural → Google → Samantha, Ava…). Dropdown to switch, remembered.
- Better voices (Mac): System Settings → Accessibility → Spoken Content → System Voice → Manage Voices.

## Notes
- You pick exercise. App not guess.
- Squat: stand side-on, whole body in view. Jumping Jacks: face camera.
- Numbers = coach rules of thumb. Tune later.
- New exercise = new small rule file. Same AI model.
- Stick-man shows correct move, loops. Each exercise has own keyframes. Voice says fix ("Go lower", "Chest up") at once, counts good reps. Mute button.
