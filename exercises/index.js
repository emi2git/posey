// Exercise registry. To add one: create exercises/<name>.js exporting an object with
// { id, name, view, summary, checks: [string], instructions, check(landmarks, aspect) -> {ok, messages, metrics, highlight?},
//   describe(metrics) -> string, createRepCounter() -> { update(metrics) -> {count, event, fault, cue} },
//   demo: { duration, limbs?, keyframes: [{ t, pose: { joint: [x, y] } }] } } and list it here (see demo.js).
import { squat } from "./squat.js";
import { jumpingJacks } from "./jumping-jacks.js";

export const exercises = [squat, jumpingJacks];
export const byId = Object.fromEntries(exercises.map((e) => [e.id, e]));
