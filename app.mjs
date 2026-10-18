// The form. One question per screen, answers kept on her phone, and Send as an
// email from her own phone. Nothing is requested from anywhere while she fills
// it in.

import { SCREENS, SUGGESTED_AREAS, STRETCH_CHOICES, ceilingFor, IMPORTANCE_LABELS,
  MATTERS, PLACE_CHOICES, WALK_CHOICES } from "./questions.mjs";
import { toAnswers, encodeSubmission, areaFrom, CATEGORY_LABELS, MAX_GROUPS } from "./mapping.mjs";
import { flatten } from "./dom.mjs";
import { makeStore, browserStorage } from "./store.mjs";
import { SEND_TO, SUBJECT } from "./settings.mjs";

const store = makeStore(browserStorage());
const DEFAULTS = { areas: [], radius: 0.5, stretch: 10, minBeds: 2, prefBeds: 2, types: [],
  garden: "nice", importance: {}, places: [], emailMode: "weekly", _screen: 0 };
let state = { ...DEFAULTS, ...store.load() };
let error = "";

const $app = document.getElementById("app");

function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, "");
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  for (const kid of flatten(kids)) el.append(kid.nodeType ? kid : String(kid));
  return el;
}

function set(patch) {
  state = { ...state, ...patch };
  store.save(state);
}
const money = n => "£" + Number(n).toLocaleString("en-GB");
const screenIndex = id => SCREENS.findIndex(s => s.id === id);

function go(i) {
  error = "";
  set({ _screen: Math.max(0, Math.min(SCREENS.length - 1, i)) });
  render();
  $app.focus({ preventScroll: true });
  window.scrollTo({ top: 0 });
}

// --- checks ------------------------------------------------------------------
function problem(screen) {
  switch (screen.id) {
    case "areas": return state.areas.length ? "" : "Add at least one area.";
    case "budget": return Number(state.maxPrice) >= 50000 ? "" : "Enter the most you would spend, such as 600000.";
    case "types": return state.types.length ? "" : "Pick at least one kind of home.";
    case "places":
      if (!state.places.length) return "Pick at least one place to be close to. A station is a good start.";
      if (state.places.some(p => p.category === "other" && !(p.name || "").trim()))
        return "Name the place you added, or remove it.";
      return "";
    case "alerts":
      if (state.emailMode !== "none" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(state.email || ""))
        return "Add your email address, or choose no emails.";
      return "";
    default: return "";
  }
}

// --- screens -----------------------------------------------------------------
const seg = (labels, current, onPick) =>
  h("div", { class: "seg", role: "group" },
    labels.map((label, i) => h("button", { type: "button", "aria-pressed": String(current === i),
      onclick: () => onPick(i) }, label)));

function optionButtons(options, current, onPick) {
  return options.map(o => h("button", { type: "button", class: "opt", "aria-pressed": String(current === o.value),
    onclick: () => onPick(o.value) }, h("span", {}, o.label, o.note ? h("small", {}, o.note) : null)));
}

function otherPlaces() {
  const others = state.places.filter(p => p.category === "other");
  const update = (item, patch) => { set({ places: state.places.map(p => p === item ? { ...p, ...patch } : p) }); render(); };
  const blocks = others.map((item, n) => h("div", { class: "place on" },
    h("label", { for: `other-${n}` }, "Something else you'd like to be close to"),
    h("input", { id: `other-${n}`, type: "text", value: item.name || "", autocomplete: "off",
      placeholder: "The name of the place, such as a market or a theatre",
      oninput: e => { item.name = e.target.value; set({ places: state.places }); } }),
    h("label", {}, "A walk of this long is fine"),
    seg(WALK_CHOICES.map(m => `${m} min`), WALK_CHOICES.indexOf(item.walk), i => update(item, { walk: WALK_CHOICES[i] })),
    h("label", {}, "How much it matters"),
    seg(["A little", "A lot", "Essential"], (item.importance ?? 2) - 1, i => update(item, { importance: i + 1 })),
    h("button", { type: "button", class: "btn", onclick: () => { set({ places: state.places.filter(p => p !== item) }); render(); } }, "Remove")));
  const full = state.places.length >= MAX_GROUPS;
  blocks.push(h("button", { type: "button", class: "opt add", disabled: full,
    onclick: () => { set({ places: [...state.places, { category: "other", name: "", walk: 10, importance: 2 }] }); render(); } },
    h("span", {}, "Something else", h("small", {}, full ? "You've chosen the most we can use" : "Name any other place you'd like to be near"))));
  return blocks;
}

function body(screen) {
  switch (screen.kind) {
    case "intro":
      return [h("p", { class: "lead" }, screen.lead),
        h("div", { class: "note" }, h("b", {}, "How this works"), screen.body,
          h("span", { class: "plain" }, " Your answers stay on this phone until the very last screen."))];

    case "text":
      return [h("label", { for: "f" }, "First name"),
        h("input", { id: "f", type: "text", autocomplete: "given-name", value: state[screen.field] || "",
          oninput: e => set({ [screen.field]: e.target.value }) })];

    case "areas": {
      const input = h("input", { id: "area", type: "text", placeholder: "For example, Lewisham", autocomplete: "off" });
      const add = (text) => {
        const name = areaFrom(text).name;
        if (!name || state.areas.some(a => areaFrom(a).name === name)) return;
        set({ areas: [...state.areas, name] });
        render();
      };
      return [
        h("div", { class: "chips" }, SUGGESTED_AREAS.filter(a => !state.areas.includes(a)).map(a =>
          h("button", { type: "button", class: "chip", onclick: () => add(a) }, `+ ${a}`))),
        h("div", { class: "row" }, input,
          h("button", { type: "button", class: "btn", onclick: () => { add(input.value); } }, "Add")),
        h("div", { class: "chips" }, state.areas.map(a =>
          h("button", { type: "button", class: "chip", "aria-pressed": "true",
            "aria-label": `Remove ${a}`, onclick: () => { set({ areas: state.areas.filter(x => x !== a) }); render(); } }, `${a}  ×`))),
      ];
    }

    case "choice":
      return optionButtons(screen.options, state[screen.field], v => { set({ [screen.field]: v }); render(); });

    case "amount":
      return [h("label", { for: "amt" }, "Most you'd spend (£)"),
        h("input", { id: "amt", type: "number", inputmode: "numeric", step: "5000", min: "0",
          value: state.maxPrice || "", placeholder: "600000",
          oninput: e => { set({ maxPrice: e.target.value }); } }),
        h("p", { class: "help", id: "amt-read" }, state.maxPrice ? money(state.maxPrice) : "")];

    case "stretch":
      return STRETCH_CHOICES.map(pct => h("button", { type: "button", class: "opt",
        "aria-pressed": String(state.stretch === pct), onclick: () => { set({ stretch: pct }); render(); } },
        h("span", {}, pct === 0 ? "No, that's my limit" : `Up to ${pct}% over`,
          h("small", {}, pct === 0 ? `Only homes at ${money(state.maxPrice || 0)} or less`
                                   : `Homes up to ${ceilingFor(Number(state.maxPrice) || 0, pct)}`))));

    case "beds":
      return [h("label", { for: "min" }, "The fewest bedrooms you'd consider"),
        select("min", [1, 2, 3, 4], state.minBeds, v => set({ minBeds: v })),
        h("label", { for: "pref" }, "The number you'd really like"),
        select("pref", [1, 2, 3, 4, 5], state.prefBeds, v => set({ prefBeds: v }))];

    case "multi":
      return h("div", { class: "chips" }, screen.options.map(o => h("button", { type: "button", class: "chip",
        "aria-pressed": String(state[screen.field].includes(o.value)),
        onclick: () => { const has = state[screen.field].includes(o.value);
          set({ [screen.field]: has ? state[screen.field].filter(x => x !== o.value) : [...state[screen.field], o.value] }); render(); } }, o.label)));

    case "matters":
      return MATTERS.map(m => h("div", { class: "item" },
        h("b", {}, m.title), m.help ? h("p", { class: "help" }, m.help) : null,
        seg(IMPORTANCE_LABELS, state.importance[m.key] ?? 2, i => { set({ importance: { ...state.importance, [m.key]: i } }); render(); })));

    case "places":
      const known = PLACE_CHOICES.map(choice => {
        const chosen = state.places.find(p => p.category === choice.category);
        const toggle = h("button", { type: "button", class: "opt", "aria-pressed": String(Boolean(chosen)),
          onclick: () => {
            if (chosen) set({ places: state.places.filter(p => p !== chosen) });
            else if (state.places.length < MAX_GROUPS) set({ places: [...state.places, { category: choice.category, walk: 10, importance: 2 }] });
            render();
          } }, h("span", {}, choice.label, choice.example ? h("small", {}, choice.example) : null));
        if (!chosen) return toggle;
        const update = patch => { set({ places: state.places.map(p => p === chosen ? { ...p, ...patch } : p) }); render(); };
        return h("div", { class: "place on" }, toggle,
          h("label", {}, "A walk of this long is fine"),
          seg(WALK_CHOICES.map(m => `${m} min`), WALK_CHOICES.indexOf(chosen.walk), i => update({ walk: WALK_CHOICES[i] })),
          h("label", {}, "How much it matters"),
          seg(["A little", "A lot", "Essential"], (chosen.importance ?? 2) - 1, i => update({ importance: i + 1 })),
          h("label", { for: `n-${choice.category}` }, "A particular one? (optional)"),
          h("input", { id: `n-${choice.category}`, type: "text", value: chosen.name || "", autocomplete: "off",
            placeholder: "Its name", oninput: e => { chosen.name = e.target.value; set({ places: state.places }); } }));
      });
      return [known, otherPlaces()];

    case "alerts":
      return [optionButtons(screen.options, state.emailMode, v => { set({ emailMode: v }); render(); }),
        state.emailMode !== "none" ? [h("label", { for: "em" }, "Your email address"),
          h("input", { id: "em", type: "email", autocomplete: "email", value: state.email || "",
            oninput: e => set({ email: e.target.value }) })] : null];

    case "review":
      return review();
    default: return [];
  }
}

function select(id, values, current, onChange) {
  return h("select", { id, onchange: e => onChange(Number(e.target.value)) },
    values.map(v => h("option", { value: v, selected: v === current }, v)));
}

function summaryLines() {
  const types = state.types.join(", ");
  const places = state.places.map(p => {
    const what = p.category === "other" ? p.name : (CATEGORY_LABELS[p.category] || "").replace(/^an? /, "");
    const particular = p.category !== "other" && (p.name || "").trim() ? ` (${p.name.trim()})` : "";
    return `${what}${particular} within ${p.walk} min`;
  }).join("; ");
  return [
    ["Where", `${state.areas.join(", ")}, ${{ 0.25: "just those areas", 0.5: "a short walk around", 1: "about a mile around" }[state.radius] || ""}`, "areas"],
    ["Budget", `${money(state.maxPrice || 0)}${state.stretch ? `, looking up to ${ceilingFor(Number(state.maxPrice) || 0, state.stretch)}` : ", no higher"}`, "budget"],
    ["Home", `${state.minBeds}+ bedrooms (ideally ${Math.max(state.prefBeds, state.minBeds)}), ${types}`, "beds"],
    ["Outdoor space", { must: "A must", nice: "Nice to have", dont: "Don't mind" }[state.garden], "garden"],
    ["Close to", places, "places"],
    ["Emails", state.emailMode === "none" ? "None" : `${state.emailMode === "weekly" ? "Weekly" : "Weekly, plus special finds"} to ${state.email}`, "alerts"],
  ];
}

function review() {
  const lines = summaryLines();
  const out = [h("dl", { class: "review" }, lines.map(([k, v, id]) => h("div", {},
    h("dt", {}, k), h("dd", {}, v, " ", h("button", { type: "button", onclick: () => go(screenIndex(id)) }, "Change")))))];

  if (!SEND_TO) out.push(h("p", { class: "error" }, "This form isn't connected to an email address yet, so Send won't work. Please tell whoever gave you this link."));
  const answers = toAnswers(state);
  const block = encodeSubmission(answers);
  const text = ["My answers for the home search:", "", ...lines.map(([k, v]) => `${k}: ${v}`), "",
    "Please don't edit the code below.", block].join("\n");
  const mailto = `mailto:${SEND_TO}?subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(text)}`;
  out.push(h("p", { class: "plain" }, "Pressing Send opens your email app with a message already written. Read it, then send it from there. Nothing leaves this phone until you do."));
  out.push(h("a", { class: "btn primary", href: SEND_TO ? mailto : "#", role: "button" }, "Send my answers"));
  out.push(h("details", { class: "how" }, h("summary", {}, "My email app didn't open"),
    h("p", { class: "plain" }, "Copy everything in this box and email it to the person who gave you this link."),
    h("textarea", { readonly: true, onfocus: e => e.target.select() }, text)));
  return out;
}

// --- the page ----------------------------------------------------------------
function render() {
  const i = Math.min(state._screen, SCREENS.length - 1);
  const screen = SCREENS[i];
  const last = i === SCREENS.length - 1;
  document.getElementById("progress-text").textContent =
    i === 0 ? "" : `${i} of ${SCREENS.length - 1}`;
  document.querySelectorAll(".terrace .win[data-n]").forEach(w =>
    w.classList.toggle("lit", Number(w.dataset.n) <= i));
  document.getElementById("ai-statement").textContent = SCREENS[0].body;

  const frame = h("div", {},
    h("h2", { class: screen.kind === "intro" ? "big" : "" }, screen.title),
    screen.help ? h("p", { class: "help" }, screen.help) : null,
    store.ok ? null : h("p", { class: "note" }, "Your answers aren't being saved on this phone, so finish in one go."),
    body(screen),
    error ? h("p", { class: "error", role: "alert" }, error) : null);

  if (!last) {
    frame.append(h("div", { class: "nav" },
      i > 0 ? h("button", { type: "button", class: "btn quiet", onclick: () => go(i - 1) }, "Back") : null,
      h("button", { type: "button", class: "btn primary", onclick: () => {
        const message = problem(screen);
        if (message) { error = message; render(); return; }
        go(i + 1);
      } }, i === 0 ? "I understand, let's start" : "Next")));
  } else {
    frame.append(h("div", { class: "nav" }, h("button", { type: "button", class: "btn quiet", onclick: () => go(i - 1) }, "Back"),
      h("button", { type: "button", class: "btn quiet", onclick: () => { set({ ...DEFAULTS, _screen: 0 }); render(); } }, "Start again")));
  }

  $app.replaceChildren(frame);
}

render();
