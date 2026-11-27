# Posey

Tiny proof-of-concept: reads the webcam and checks exercise form in real time with
MediaPipe PoseLandmarker (runs in the browser, loaded from a CDN). Plain HTML/JS, no build.

## Run

```sh
./serve.sh            # then open http://localhost:8000
```

The camera only works on `localhost` or HTTPS. On a phone, open it through an HTTPS
tunnel (e.g. `cloudflared tunnel --url http://localhost:8000`).

## Squat (sample exercise)

Stand side-on, full body in frame. Uses the more visible side.

- Depth: knee angle (hip-knee-ankle). A rep counts when you go below 100° and stand back above 160°.
- Shallow rep (below 140° but never 100°): "Go lower".
- Torso lean (shoulder-hip vs. vertical) above 45°: "Chest up".

## Demo and voice

- A looping stick-man (bottom right) shows the correct movement; each exercise defines its own `demo` keyframes.
- Voice (Web Speech API, local): corrections are spoken immediately and cancel stale speech; a clean rep gets
  random praise ("Good job", "Nice one"…, never the same twice in a row). Same phrase is not repeated within 2 s.
  Unlocked on the first click; speaker button mutes.

## Add an exercise

Create `exercises/<name>.js` exporting `{ id, name, view, instructions, check(landmarks, aspect), createRepCounter(), demo }`
(see `exercises/squat.js`; helpers in `exercises/geometry.js`) and add it to `exercises/index.js`.
