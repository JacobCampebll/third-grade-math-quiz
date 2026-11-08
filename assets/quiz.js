import { QUESTIONS } from "./questions.js?v=r2b";
import { checkWrittenIdea } from "./written-check.js?v=r2b";
import {
  ROUND_LABEL,
  answerLabel,
  applyDigit,
  backspaceDigit,
  blankState,
  canonical,
  checkPractice,
  isComplete,
  loadQuizState,
  missedQuestions,
  nextIndex,
  recordFirstAnswer,
  saveQuizState,
  scoreState,
  setDraft,
} from "./grade.js?v=r2b";

const app = document.querySelector("#app");
let state = loadQuizState(localStorage, QUESTIONS);
let screen = isComplete(state, QUESTIONS) ? "results" : stateHasProgress(state) ? "question" : "start";
let index = Math.min(nextIndex(state, QUESTIONS), QUESTIONS.length - 1);
let practice = null;
let confirmErase = false;

function stateHasProgress(value) {
  return Object.keys(value.answers).length > 0 || Object.keys(value.drafts).length > 0;
}

function saveState() {
  saveQuizState(localStorage, state);
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
  document.title = `Math quiz · ${ROUND_LABEL}`;
  document.body.dataset.round = "2";
  app.replaceChildren();
  const shell = el("main", { class: "shell" });
  if (screen === "start") shell.append(renderStart());
  else if (screen === "results") shell.append(renderResults());
  else if (screen === "practice") shell.append(renderPractice());
  else shell.append(renderQuestion());
  app.append(shell);
}

function renderStart() {
  const progress = scoreState(state, QUESTIONS);
  const answered = progress.quizAnswered;
  const finished = isComplete(state, QUESTIONS);
  const actions = [];
  if (answered > 0 && !finished) {
    actions.push(el("button", { class: "primary", type: "button", onClick: continueQuiz }, "Continue quiz"));
  }
  if (finished) {
    actions.push(el("button", { class: "primary", type: "button", onClick: () => { screen = "results"; render(); } }, "See the saved score"));
  }
  if (!finished) {
    actions.push(el("button", { class: answered ? "secondary" : "primary", type: "button", onClick: startFresh }, answered ? "Start Round 2 over" : "Start Round 2"));
  }
  return el("section", { class: "card", "data-screen": "start", "data-round": "2" }, [
    el("p", { class: "eyebrow" }, ROUND_LABEL),
    el("h1", {}, "Math quiz"),
    el("p", { class: "lede" }, "24 new questions. 21 are scored, and 3 ask for a sentence. No timer."),
    el("p", {}, "Your first answer to each question is the one that counts. Round 2 is saved on its own on this iPad."),
    answered && !finished ? el("p", { class: "status", "data-connection": "saved" }, `${answered} of 24 answered`) : "",
    el("div", { class: "stack" }, actions),
  ]);
}

function startFresh() {
  if (Object.keys(state.answers).length > 0) {
    const ok = window.confirm("Start Round 2 over? This erases the Round 2 score and sentences on this iPad.");
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
  return el("section", { class: "card", "data-screen": "question", "data-round": "2", "data-question-id": question.id, "data-kind": question.kind }, [
    header(),
    el("p", { class: "prompt" }, question.prompt),
    figureFor(question),
    saved ? el("p", { class: "status", "data-connection": "saved" }, "Saved") : "",
    answerControls(question, selected, Boolean(saved)),
    el("div", { class: "row" }, [
      el("button", { class: "secondary", type: "button", disabled: index === 0 ? "true" : null, onClick: () => { index -= 1; render(); } }, "Back"),
      saved
        ? el("button", { class: "primary", type: "button", onClick: goForward }, index === QUESTIONS.length - 1 ? "See score" : "Next")
        : el("button", {
          class: "primary",
          type: "button",
          "data-submit": "true",
          disabled: canonical(question, selected) ? null : "true",
          onClick: () => submitGraded(question, liveAnswer(question, selected)),
        }, "Submit answer"),
    ]),
  ]);
}

function header() {
  const progress = scoreState(state, QUESTIONS);
  return el("div", {}, [
    el("div", { class: "top" }, [
      el("p", { class: "eyebrow" }, ROUND_LABEL),
      el("p", { class: "count" }, `Question ${index + 1} of ${QUESTIONS.length}`),
    ]),
    el("div", {
      class: "track",
      role: "progressbar",
      "aria-valuemin": "0",
      "aria-valuemax": String(progress.quizTotal),
      "aria-valuenow": String(progress.quizAnswered),
      "aria-label": "Questions answered",
    }, [el("span", { style: `width:${(progress.quizAnswered / progress.quizTotal) * 100}%` })]),
  ]);
}

function answerControls(question, selected, locked) {
  if (question.kind === "written") return writtenBox(question, selected, locked, false);
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

function liveAnswer(question, selected) {
  if (question.kind !== "written") return selected;
  return document.querySelector("textarea.sentence")?.value ?? selected;
}

function writtenBox(question, selected, locked, practiceMode) {
  const box = el("textarea", {
    class: "sentence",
    rows: "4",
    maxlength: "400",
    "aria-label": "Your sentence",
    placeholder: "Write one or two sentences.",
  });
  box.value = selected || "";
  if (locked) box.readOnly = true;
  else {
    box.addEventListener("input", () => {
      if (practiceMode) {
        practice.picked = box.value;
        const submit = document.querySelector("[data-submit]");
        if (submit) submit.disabled = canonical(question, box.value) == null;
        return;
      }
      state = setDraft(state, question, box.value);
      saveState();
      const submit = document.querySelector("[data-submit]");
      if (submit) submit.disabled = canonical(question, box.value) == null;
    });
  }
  return el("div", {}, [
    el("p", { class: "hint" }, locked ? "Saved sentence" : "Write a sentence. It is saved for review and is not scored."),
    box,
  ]);
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
    : el("p", {}, "There are no missed scored answers.");
  const written = QUESTIONS.filter((question) => question.kind === "written");
  return el("section", { class: "card", "data-screen": "results", "data-round": "2" }, [
    el("p", { class: "eyebrow" }, `${ROUND_LABEL} finished`),
    el("h1", {}, `${score.correct} of ${score.total}`),
    el("p", { class: "lede", "data-score": `${score.correct}/${score.total}` }, "Scored answers, out of 21. Written sentences do not change this number."),
    el("div", { class: "stack" }, [
      el("button", { class: "primary", type: "button", onClick: startPractice }, "Practice these questions"),
      el("button", { class: "secondary", type: "button", onClick: () => { confirmErase = !confirmErase; render(); } }, "Erase saved score and start over"),
    ]),
    confirmErase ? el("div", { class: "confirm" }, [
      el("p", {}, "Erase the Round 2 score and sentences on this iPad?"),
      el("div", { class: "row" }, [
        el("button", { class: "secondary", type: "button", onClick: () => { confirmErase = false; render(); } }, "Keep score"),
        el("button", { class: "primary", type: "button", onClick: () => { confirmErase = false; state = blankState(); saveState(); index = 0; screen = "start"; render(); } }, "Erase score"),
      ]),
    ]) : "",
    el("h2", {}, missed.length ? "Missed scored questions" : "Every scored answer was correct"),
    list,
    el("h2", {}, "Written responses"),
    writtenSummary(written),
    el("p", {}, "The automatic check looks for the math idea in these three sentences only. It does not understand every sentence. If it is not sure, it does not mark the sentence wrong."),
    el("ol", { class: "missed", "data-written-review": "true" }, written.map((question) => {
      const sentence = state.answers[question.id]?.value || "";
      const checked = checkWrittenIdea(question, sentence);
      return el("li", { "data-written-id": question.id }, [
        el("p", { class: "miss-prompt" }, question.prompt),
        el("p", {}, `Your sentence: ${sentence}`),
        el("p", { class: `check check-${checked.status}`, "data-check-status": checked.status }, checked.note),
        el("p", { class: "explain" }, `Example: ${question.example}`),
      ]);
    })),
  ]);
}

function writtenSummary(written) {
  const counts = { match: 0, review: 0, mismatch: 0 };
  for (const question of written) counts[checkWrittenIdea(question, state.answers[question.id]?.value || "").status] += 1;
  return el("p", { "data-written-summary": `${counts.match}/${counts.review}/${counts.mismatch}` }, `Automatic check: ${counts.match} matched, ${counts.review} to read, ${counts.mismatch} not matching.`);
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
  return el("section", { class: "card", "data-screen": "practice", "data-round": "2", "data-question-id": question.id, "data-kind": question.kind }, [
    el("p", { class: "status", "data-connection": "saved" }, `Practice only. Scored result stays ${score.correct} of ${score.total}.`),
    el("p", { class: "count" }, `Practice ${practice.index + 1} of ${QUESTIONS.length}`),
    el("p", { class: "prompt" }, question.prompt),
    figureFor(question),
    practiceControls(question, picked, Boolean(feedback)),
    feedback ? el("div", { class: "explain", "data-practice-result": feedback.written ? "example" : feedback.correct ? "right" : "wrong" }, practiceFeedback(question, feedback)) : "",
    el("div", { class: "row" }, [
      el("button", { class: "secondary", type: "button", onClick: () => { screen = "results"; render(); } }, "Back to score"),
      feedback
        ? el("button", { class: "primary", type: "button", onClick: nextPractice }, practice.index === QUESTIONS.length - 1 ? "Done" : "Next")
        : el("button", { class: "primary", type: "button", "data-submit": "true", disabled: canonical(question, picked) ? null : "true", onClick: () => gradePractice(question) }, "Check practice"),
    ]),
  ]);
}

function practiceFeedback(question, feedback) {
  if (!feedback.written) {
    return [
      el("p", {}, feedback.correct ? "That's right." : `The answer is ${answerLabel(question, question.answer)}.`),
      el("p", {}, feedback.explanation),
    ];
  }
  const checked = checkWrittenIdea(question, feedback.value);
  return [
    el("p", { class: `check check-${checked.status}`, "data-check-status": checked.status }, checked.note),
    el("p", {}, "Example sentence. Practice does not change the saved sentence."),
    el("p", {}, feedback.explanation),
  ];
}

function practiceControls(question, picked, locked) {
  if (question.kind === "written") return writtenBox(question, picked, locked, true);
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
  const raw = question.kind === "written" ? document.querySelector("textarea.sentence")?.value : practice.picked;
  const result = checkPractice(question, raw);
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
  if (kind === "stamps") return stamps();
  if (kind === "tiles5") return tiles5();
  if (kind === "fish") return fish();
  return baskets();
}

function stamps() {
  const svg = svgEl("svg", { viewBox: "0 0 300 230", role: "img", class: "drawing" });
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      svg.append(svgEl("rect", {
        x: 24 + col * 70,
        y: 16 + row * 70,
        width: 52,
        height: 52,
        rx: 8,
        fill: "#fff7ea",
        stroke: "#0f6e56",
        "stroke-width": 3,
      }));
    }
  }
  return svg;
}

function tiles5() {
  const svg = svgEl("svg", { viewBox: "0 0 250 250", role: "img", class: "drawing" });
  const size = 34;
  const step = 42;
  const origin = 16;
  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      if (col > 0 && col < 4 && row > 0 && row < 4) continue;
      svg.append(svgEl("rect", {
        x: origin + col * step,
        y: origin + row * step,
        width: size,
        height: size,
        rx: 6,
        fill: "#fff7ea",
        stroke: "#1e2430",
        "stroke-width": 2,
      }));
    }
  }
  svg.append(svgEl("rect", {
    x: origin + step - 6,
    y: origin + step - 6,
    width: step * 3 + 4,
    height: step * 3 + 4,
    rx: 12,
    fill: "#f4e2c4",
    stroke: "#c4a574",
    "stroke-width": 2,
  }));
  return svg;
}

function fish() {
  const svg = svgEl("svg", { viewBox: "0 0 320 150", role: "img", class: "drawing" });
  svg.append(svgEl("ellipse", { cx: 70, cy: 70, rx: 28, ry: 14, fill: "#d7ebf5", stroke: "#1e2430", "stroke-width": 3 }));
  svg.append(svgEl("ellipse", { cx: 210, cy: 68, rx: 70, ry: 28, fill: "#d7ebf5", stroke: "#1e2430", "stroke-width": 3 }));
  const small = svgEl("text", { x: 70, y: 130, "text-anchor": "middle", "font-size": 16, fill: "#1e2430" });
  small.textContent = "6 cm";
  const large = svgEl("text", { x: 210, y: 130, "text-anchor": "middle", "font-size": 16, fill: "#1e2430" });
  large.textContent = "4 times as long";
  svg.append(small, large);
  return svg;
}

function baskets() {
  return el("table", { class: "cars" }, [
    el("caption", { class: "visually-hidden" }, "Baskets and apples"),
    el("thead", {}, [el("tr", {}, [el("th", {}, "Baskets"), el("th", {}, "Apples")])]),
    el("tbody", {}, [
      el("tr", {}, [el("td", {}, "1"), el("td", {}, "8")]),
      el("tr", {}, [el("td", {}, "2"), el("td", {}, "16")]),
      el("tr", {}, [el("td", {}, "6"), el("td", {}, "?")]),
    ]),
  ]);
}

render();
