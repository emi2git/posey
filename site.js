// Site chrome (all pages): mobile nav toggle, plus exercise cards / stick-man previews built from the registry.
import { exercises } from "./exercises/index.js";
import { mountDemo } from "./demo.js";

// ---------- Mobile nav ----------
const toggle = document.querySelector(".nav-toggle");
const menu = document.getElementById("nav-menu");
if (toggle && menu) {
  const set = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    menu.classList.toggle("open", open);
  };
  toggle.addEventListener("click", () => set(toggle.getAttribute("aria-expanded") !== "true"));
  menu.addEventListener("click", (e) => { if (e.target.closest("a")) set(false); });
  addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menu.classList.contains("open")) { set(false); toggle.focus(); }
  });
  matchMedia("(min-width: 821px)").addEventListener("change", (e) => e.matches && set(false));
  document.addEventListener("click", (e) => {
    if (menu.classList.contains("open") && !e.target.closest(".site-header")) set(false);
  });
}

// ---------- Exercise cards ----------
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const startHref = (ex) => `/workout?exercise=${encodeURIComponent(ex.id)}`;
const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

function card(ex, full) {
  return `<article class="ex-card" id="${esc(ex.id)}">
  <figure class="ex-preview"><svg class="stick" role="img" aria-label="${esc(ex.name)}: animation of correct form"></svg></figure>
  <div class="ex-body">
    <div class="ex-title"><h3>${esc(ex.name)}</h3><span class="tag">${esc(ex.view)}</span></div>
    <p class="ex-summary">${esc(ex.summary || "")}</p>
    ${full && ex.checks?.length ? `<ul class="ex-checks" aria-label="What Posey checks">${ex.checks.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>` : ""}
    ${full ? `<p class="ex-setup"><strong>Setup:</strong> ${esc(ex.instructions)}</p>` : ""}
    <a class="btn ${full ? "btn-primary" : "btn-ghost"}" href="${startHref(ex)}">Start ${esc(ex.name)} ${ARROW}</a>
  </div>
</article>`;
}

for (const grid of document.querySelectorAll("[data-exercise-grid]")) {
  const full = grid.dataset.exerciseGrid === "full";
  grid.innerHTML = exercises.map((ex) => card(ex, full)).join("");
  grid.querySelectorAll("svg.stick").forEach((svg, i) => mountDemo(svg).set(exercises[i].demo));
}

// Rules summary (How it works page).
for (const box of document.querySelectorAll("[data-exercise-rules]")) {
  box.innerHTML = exercises.map((ex) => `<div class="rule">
    <h3>${esc(ex.name)} <span class="tag">${esc(ex.view)}</span></h3>
    <ul class="ex-checks">${(ex.checks || []).map((c) => `<li>${esc(c)}</li>`).join("")}</ul>
  </div>`).join("");
}

// Exercise count wherever it is shown.
document.querySelectorAll("[data-exercise-count]").forEach((el) => (el.textContent = exercises.length));

// ---------- Hero stick-man: cycles through the exercises, counting loops as "reps" ----------
const hero = document.querySelector("[data-hero-demo]");
if (hero) {
  const svg = hero.querySelector("svg.stick");
  const label = hero.querySelector("[data-hero-label]");
  const count = hero.querySelector("[data-hero-count]");
  const demo = mountDemo(svg);
  const LOOPS = 3; // reps per exercise before switching
  let i = 0, reps = 0, prev = 0;
  const show = () => {
    const ex = exercises[i % exercises.length];
    demo.set(ex.demo);
    label.textContent = ex.name;
    svg.setAttribute("aria-label", `Stick figure demonstrating ${ex.name.toLowerCase()}`);
    count.textContent = reps = 0;
  };
  // Count a rep as the figure finishes its loop (phase crosses 0.9), in step with demo.js's clock.
  const tick = (now) => {
    requestAnimationFrame(tick);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const d = exercises[i % exercises.length].demo.duration, phase = (now % d) / d;
    if (reps < LOOPS && prev < 0.9 && phase >= 0.9) {
      count.textContent = ++reps;
      if (reps >= LOOPS) setTimeout(() => { i++; show(); }, 400);
    }
    prev = phase;
  };
  show();
  requestAnimationFrame(tick);
}

// Generic static stick figure (e.g. 404 page): data-stick="<exercise id>".
document.querySelectorAll("svg.stick[data-stick]").forEach((svg) => {
  const ex = exercises.find((e) => e.id === svg.dataset.stick) || exercises[0];
  mountDemo(svg).set(ex.demo);
});
