import { QUESTIONS } from "./questions.js";
import {
  STORAGE_KEY,
  answerLabel,
  applyDigit,
  backspaceDigit,
  blankState,
  checkPractice,
  isComplete,
  missedQuestions,
  nextIndex,
  recordFirstAnswer,
  sanitize,
  scoreState,
  setDraft,
} from "./grade.js";

const app = document.querySelector("#app");
let state = loadState();
let screen = isComplete(state, QUESTIONS) ? "results" : stateHasProgress(state) ? "question" : "start";
let index = Math.min(nextIndex(state, QUESTIONS), QUESTIONS.length - 1);
let practice = null;
let confirmErase = false;

function stateHasProgress(value) {
  return Object.keys(value.answers).length > 0 || Object.keys(value.drafts).length > 0;
}

function loadState() {
  try {
    return sanitize(JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"), QUESTIONS);
  } catch {
    return blankState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "class") node.className = value;
    else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value != null) node.setAttribute(key, String(value));
  }
  for (const child of children) node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  return node;
}

function render() {
  app.replaceChildren();
  const shell = el("main", { class: "shell" });
  if (screen === "start") shell.append(renderStart());
  else if (screen === "results") shell.append(renderResults());
  else if (screen === "practice") shell.append(renderPractice());
  else shell.append(renderQuestion());
  app.append(shell);
}

function renderStart() {
  const answered = scoreState(state, QUESTIONS).answered;
  const finished = isComplete(state, QUESTIONS);
  const actions = [];
  if (answered > 0 && !finished) {
    actions.push(el("button", { class: "primary", type: "button", onClick: continueQuiz }, "Continue quiz"));
  }
  if (finished) {
    actions.push(el("button", { class: "primary", type: "button", onClick: () => { screen = "results"; render(); } }, "See the saved score"));
  }
  if (!finished) {
    actions.push(el("button", { class: answered ? "secondary" : "primary", type: "button", onClick: startFresh }, answered ? "Start a new quiz" : "Start quiz"));
  }
  return el("section", { class: "card", "data-screen": "start" }, [
    el("p", { class: "eyebrow" }, "Grade 3"),
    el("h1", {}, "Math quiz"),
    el("p", { class: "lede" }, "24 questions about multiplication. No timer. One question at a time."),
    el("p", {}, "Your first answer to each question is the one that counts. It is saved on this iPad."),
    answered && !finished ? el("p", { class: "status", "data-connection": "saved" }, `${answered} of 24 answered`) : "",
    el("div", { class: "stack" }, actions),
  ]);
}

function startFresh() {
  if (Object.keys(state.answers).length > 0) {
    const ok = window.confirm("Start a new quiz? This erases the saved score on this iPad.");
    if (!ok) return;
  }
  state = blankState();
  saveState();
  index = 0;
  practice = null;
  screen = "question";
  render();
}

function continueQuiz() {
  index = Math.min(nextIndex(state, QUESTIONS), QUESTIONS.length - 1);
  screen = "question";
  render();
}

function renderQuestion() {
  const question = QUESTIONS[index];
  const saved = state.answers[question.id];
  const draft = state.drafts[question.id] || "";
  const selected = saved?.value || draft;
  return el("section", { class: "card", "data-screen": "question", "data-question-id": question.id }, [
    header(),
    el("p", { class: "prompt" }, question.prompt),
    figureFor(question),
    saved ? el("p", { class: "status", "data-connection": "saved" }, "Saved") : "",
    answerControls(question, selected, Boolean(saved)),
    el("div", { class: "row" }, [
      el("button", { class: "secondary", type: "button", disabled: index === 0 ? "true" : null, onClick: () => { index -= 1; render(); } }, "Back"),
      saved
        ? el("button", { class: "primary", type: "button", onClick: goForward }, index === QUESTIONS.length - 1 ? "See score" : "Next")
        : el("button", { class: "primary", type: "button", disabled: selected ? null : "true", onClick: () => submitGraded(question, selected) }, "Submit answer"),
    ]),
  ]);
}

function header() {
  const answered = scoreState(state, QUESTIONS).answered;
  return el("div", {}, [
    el("div", { class: "top" }, [
      el("p", { class: "eyebrow" }, "Math quiz"),
      el("p", { class: "count" }, `Question ${index + 1} of ${QUESTIONS.length}`),
    ]),
    el("div", {
      class: "track",
      role: "progressbar",
      "aria-valuemin": "0",
      "aria-valuemax": String(QUESTIONS.length),
      "aria-valuenow": String(answered),
      "aria-label": "Questions answered",
    }, [el("span", { style: `width:${(answered / QUESTIONS.length) * 100}%` })]),
  ]);
}

function answerControls(question, selected, locked) {
  if (question.kind === "numeric") {
    return el("div", {}, [
      el("div", { class: "digits", "aria-live": "polite" }, selected || " "),
      locked ? "" : keypad(selected),
    ]);
  }
  const choices = question.kind === "true_false"
    ? [{ id: "true", label: "True" }, { id: "false", label: "False" }]
    : question.choices;
  return el("div", { class: "choices", role: "group", "aria-label": "Answers" }, choices.map((choice) => {
    const pressed = selected === choice.id;
    return el("button", {
      type: "button",
      class: `choice${pressed ? " selected" : ""}`,
      "aria-pressed": pressed ? "true" : "false",
      disabled: locked ? "true" : null,
      onClick: () => {
        if (locked) return;
        state = setDraft(state, question, choice.id);
        saveState();
        render();
      },
    }, choice.label);
  }));
}

function keypad(selected) {
  return el("div", { class: "keypad" }, numberKeys((key) => {
    if (key === "delete") return el("button", { type: "button", class: "key ghost", onClick: () => typeDigit("delete"), "aria-label": "Delete" }, "Delete");
    return el("button", { type: "button", class: "key", onClick: () => typeDigit(key) }, key);
  }));
}

function numberKeys(draw) {
  return ["1", "2", "3", "4", "5", "6", "7", "8", "9", "spacer", "0", "delete"].map((key) => (
    key === "spacer" ? el("span", { "aria-hidden": "true" }) : draw(key)
  ));
}

function typeDigit(key) {
  const question = QUESTIONS[index];
  if (state.answers[question.id] || question.kind !== "numeric") return;
  const current = state.drafts[question.id] || "";
  const next = key === "delete" ? backspaceDigit(current) : applyDigit(current, key);
  state = setDraft(state, question, next);
  saveState();
  render();
  const keypadButton = document.querySelector(`[data-question-id="${question.id}"]`);
  keypadButton?.querySelector(".digits")?.focus?.();
}

function submitGraded(question, raw) {
  const result = recordFirstAnswer(state, question, raw);
  if (!result.ok) return;
  state = result.state;
  saveState();
  if (!result.duplicate && isComplete(state, QUESTIONS)) {
    screen = "results";
    render();
    return;
  }
  if (!result.duplicate) {
    index = Math.min(index + 1, QUESTIONS.length - 1);
    if (isComplete(state, QUESTIONS)) screen = "results";
  }
  render();
}

function goForward() {
  if (index >= QUESTIONS.length - 1) {
    if (isComplete(state, QUESTIONS)) screen = "results";
    render();
    return;
  }
  index += 1;
  render();
}

function renderResults() {
  const score = scoreState(state, QUESTIONS);
  const missed = missedQuestions(state, QUESTIONS);
  const list = missed.length
    ? el("ol", { class: "missed" }, missed.map((question) => {
      const yours = answerLabel(question, state.answers[question.id].value);
      return el("li", {}, [
        el("p", { class: "miss-prompt" }, question.prompt),
        el("p", {}, `Your answer: ${yours}`),
        el("p", {}, `Correct answer: ${answerLabel(question, question.answer)}`),
        el("p", { class: "explain" }, question.explanation),
      ]);
    }))
    : el("p", {}, "Every answer was correct.");
  return el("section", { class: "card", "data-screen": "results" }, [
    el("p", { class: "eyebrow" }, "Finished"),
    el("h1", {}, `${score.correct} of ${score.total}`),
    el("p", { class: "lede", "data-score": `${score.correct}/${score.total}` }, "This score stays saved on this iPad."),
    el("div", { class: "stack" }, [
      el("button", { class: "primary", type: "button", onClick: startPractice }, "Practice these questions"),
      el("button", { class: "secondary", type: "button", onClick: () => { confirmErase = !confirmErase; render(); } }, "Erase saved score and start over"),
    ]),
    confirmErase ? el("div", { class: "confirm" }, [
      el("p", {}, "Erase the saved score on this iPad?"),
      el("div", { class: "row" }, [
        el("button", { class: "secondary", type: "button", onClick: () => { confirmErase = false; render(); } }, "Keep score"),
        el("button", { class: "primary", type: "button", onClick: () => { confirmErase = false; state = blankState(); saveState(); index = 0; screen = "start"; render(); } }, "Erase score"),
      ]),
    ]) : "",
    el("h2", {}, missed.length ? "Missed questions" : "Nice work"),
    list,
  ]);
}

function startPractice() {
  practice = { index: 0, picked: "", feedback: null };
  screen = "practice";
  confirmErase = false;
  render();
}

function renderPractice() {
  const question = QUESTIONS[practice.index];
  const score = scoreState(state, QUESTIONS);
  const picked = practice.picked;
  const feedback = practice.feedback;
  return el("section", { class: "card", "data-screen": "practice", "data-question-id": question.id }, [
    el("p", { class: "status", "data-connection": "saved" }, `Practice only. Quiz score stays ${score.correct} of ${score.total}.`),
    el("p", { class: "count" }, `Practice ${practice.index + 1} of ${QUESTIONS.length}`),
    el("p", { class: "prompt" }, question.prompt),
    figureFor(question),
    practiceControls(question, picked, Boolean(feedback)),
    feedback ? el("div", { class: "explain", "data-practice-result": feedback.correct ? "right" : "wrong" }, [
      el("p", {}, feedback.correct ? "That's right." : `The answer is ${answerLabel(question, question.answer)}.`),
      el("p", {}, feedback.explanation),
    ]) : "",
    el("div", { class: "row" }, [
      el("button", { class: "secondary", type: "button", onClick: () => { screen = "results"; render(); } }, "Back to score"),
      feedback
        ? el("button", { class: "primary", type: "button", onClick: nextPractice }, practice.index === QUESTIONS.length - 1 ? "Done" : "Next")
        : el("button", { class: "primary", type: "button", disabled: picked ? null : "true", onClick: () => gradePractice(question) }, "Check practice"),
    ]),
  ]);
}

function practiceControls(question, picked, locked) {
  if (question.kind === "numeric") {
    return el("div", {}, [
      el("div", { class: "digits", "aria-live": "polite" }, picked || " "),
      locked ? "" : practiceKeypad(),
    ]);
  }
  const choices = question.kind === "true_false"
    ? [{ id: "true", label: "True" }, { id: "false", label: "False" }]
    : question.choices;
  return el("div", { class: "choices" }, choices.map((choice) => el("button", {
    type: "button",
    class: `choice${picked === choice.id ? " selected" : ""}`,
    disabled: locked ? "true" : null,
    onClick: () => { practice.picked = choice.id; render(); },
  }, choice.label)));
}

function practiceKeypad() {
  return el("div", { class: "keypad" }, numberKeys((key) => el("button", {
    type: "button",
    class: key === "delete" ? "key ghost" : "key",
    "aria-label": key === "delete" ? "Delete" : null,
    onClick: () => {
      practice.picked = key === "delete" ? backspaceDigit(practice.picked) : applyDigit(practice.picked, key);
      render();
    },
  }, key === "delete" ? "Delete" : key)));
}

function gradePractice(question) {
  const result = checkPractice(question, practice.picked);
  if (!result.ok) return;
  practice.feedback = result;
  render();
}

function nextPractice() {
  if (practice.index >= QUESTIONS.length - 1) {
    screen = "results";
    render();
    return;
  }
  practice = { index: practice.index + 1, picked: "", feedback: null };
  render();
}

function figureFor(question) {
  if (!question.figure) return "";
  const wrap = el("figure", { class: "figure" });
  wrap.append(drawFigure(question.figure));
  if (question.figureAlt) wrap.append(el("figcaption", { class: "visually-hidden" }, question.figureAlt));
  return wrap;
}

const svgNs = "http://www.w3.org/2000/svg";

function svgEl(name, attrs = {}) {
  const node = document.createElementNS(svgNs, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
}

function drawFigure(kind) {
  if (kind === "stickers") return stickers();
  if (kind === "tiles") return tiles();
  if (kind === "leaves") return leaves();
  return cars();
}

function stickers() {
  const svg = svgEl("svg", { viewBox: "0 0 280 180", role: "img", class: "drawing" });
  for (let row = 0; row < 2; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      const cx = 50 + col * 70;
      const cy = 48 + row * 70;
      svg.append(svgEl("circle", { cx, cy, r: 24, fill: "#fff7ea", stroke: "#0f6e56", "stroke-width": 3 }));
      svg.append(svgEl("circle", { cx, cy, r: 8, fill: "#e07a3d" }));
    }
  }
  return svg;
}

function tiles() {
  const svg = svgEl("svg", { viewBox: "0 0 300 210", role: "img", class: "drawing" });
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 6; col += 1) {
      const hidden = col > 0 && col < 5 && row > 0 && row < 3;
      if (hidden) continue;
      svg.append(svgEl("rect", {
        x: 12 + col * 46,
        y: 12 + row * 46,
        width: 38,
        height: 38,
        rx: 6,
        fill: "#fff7ea",
        stroke: "#1e2430",
        "stroke-width": 2,
      }));
    }
  }
  svg.append(svgEl("rect", { x: 52, y: 52, width: 184, height: 92, rx: 12, fill: "#f4e2c4", stroke: "#c4a574", "stroke-width": 2 }));
  return svg;
}

function leaves() {
  const svg = svgEl("svg", { viewBox: "0 0 300 150", role: "img", class: "drawing" });
  svg.append(svgEl("ellipse", { cx: 70, cy: 80, rx: 28, ry: 16, fill: "#d9ead3", stroke: "#0f6e56", "stroke-width": 3 }));
  svg.append(svgEl("ellipse", { cx: 200, cy: 78, rx: 70, ry: 36, fill: "#d9ead3", stroke: "#0f6e56", "stroke-width": 3 }));
  const small = svgEl("text", { x: 70, y: 130, "text-anchor": "middle", "font-size": 16, fill: "#1e2430" });
  small.textContent = "5 cm";
  const large = svgEl("text", { x: 200, y: 130, "text-anchor": "middle", "font-size": 16, fill: "#1e2430" });
  large.textContent = "3 times as long";
  svg.append(small, large);
  return svg;
}

function cars() {
  const table = el("table", { class: "cars" }, [
    el("caption", { class: "visually-hidden" }, "Cars and tires"),
    el("thead", {}, [el("tr", {}, [el("th", {}, "Cars"), el("th", {}, "Tires")])]),
    el("tbody", {}, [
      el("tr", {}, [el("td", {}, "1"), el("td", {}, "4")]),
      el("tr", {}, [el("td", {}, "2"), el("td", {}, "8")]),
      el("tr", {}, [el("td", {}, "3"), el("td", {}, "?")]),
    ]),
  ]);
  return table;
}

render();
