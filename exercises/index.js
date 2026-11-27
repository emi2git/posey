// Exercise registry. To add one: create exercises/<name>.js exporting an object with
// { id, name, view, instructions, check(landmarks, aspect) -> {ok, messages, metrics, highlight?},
//   createRepCounter() -> { update(metrics) -> {count, event, cue} },
//   demo: { duration, keyframes: [{ t, pose: { joint: [x, y] } }] } } and list it here (see demo.js).
import { squat } from "./squat.js";

export const exercises = [squat];
export const byId = Object.fromEntries(exercises.map((e) => [e.id, e]));
