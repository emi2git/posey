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
- Knee not < 100° → **"Go lower"**
- Back lean > 45° → **"Chest up"**
- Both ok → **"Good rep!"**

## Notes
- You pick exercise. App not guess.
- Stand side-on, whole body in view.
- Numbers = coach rules of thumb. Tune later.
- New exercise = new small rule file. Same AI model.
- Stick-man shows correct move, loops. Each exercise has own keyframes. Voice says fix ("Go lower", "Chest up") at once, praise on good rep ("Nice one"…). Local voice, no network. Mute button.
