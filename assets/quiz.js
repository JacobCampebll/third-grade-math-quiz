import { QUESTIONS as ROUND2 } from "./questions.js?v=study3";
import { QUESTIONS as ROUND1 } from "./questions-r1.js?v=study3";
import { QUESTIONS as ROUND3 } from "./questions-r3.js?v=study3";
import { PASSAGE, PASSAGE_TITLE, QUESTIONS as READING } from "./reading.js?v=study3";
import { QUESTIONS as VOCAB } from "./vocabulary.js?v=study3";
import { checkWrittenIdea } from "./written-check.js?v=study3";
import {
  observeSavedSets,
  pinMatches,
  progressReport,
  rememberSnapshot,
  reportToCsv,
  savePinHash,
  snapshotFromState,
  validatePinChange,
  nextPinFailure,
} from "./parent-progress.js?v=study3";
import {
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
} from "./grade.js?v=study3";

const SETS = {
  r1: { id: "r1", subject: "Math", title: "Math quiz", eyebrow: "Round 1", storageKey: "g3-math-quiz-v1", questions: ROUND1, intro: "24 questions about multiplication. No timer. One question at a time.", passage: "" },
  r2: { id: "r2", subject: "Math", title: "Math quiz", eyebrow: "Round 2", storageKey: "g3-math-quiz-r2", questions: ROUND2, intro: "24 questions. 21 are scored, and 3 ask for a sentence. No timer.", passage: "" },
  r3: { id: "r3", subject: "Math", title: "Math quiz", eyebrow: "Round 3", storageKey: "g3-math-quiz-r3", questions: ROUND3, intro: "Mixed practice with missing numbers, true or false, and two stories. 20 are scored, and 3 ask for a sentence.", passage: "" },
  reading: { id: "reading", subject: "Reading", title: "Reading", eyebrow: "Reading", storageKey: "g3-reading-hw9", questions: READING, intro: "Read the passage, then answer. 16 are scored, and 3 ask for a sentence.", passage: PASSAGE, passageTitle: PASSAGE_TITLE },
  vocab: { id: "vocab", subject: "Vocabulary", title: "Vocabulary", eyebrow: "Vocabulary", storageKey: "g3-vocab-hw9", questions: VOCAB, intro: "Context clues, word parts, and strong words. 16 are scored, and 3 ask for a sentence.", passage: "" },
};

const app = document.querySelector("#app");
let QUESTIONS = ROUND2;
let storageKey = SETS.r2.storageKey;
let roundLabel = SETS.r2.eyebrow;
let setTitle = SETS.r2.title;
let setIntro = SETS.r2.intro;
let passageText = "";
let passageTitle = "";
let setId = "";
let state = blankState();
let screen = "home";
let index = 0;
let practice = null;
let confirmErase = false;
let returnScreen = "home";
let parentUnlocked = false;
let pinBuffer = "";
let pinMessage = "";
let pinFails = 0;
let pinWaitUntil = 0;
let pinMode = "unlock";
let pinDraft = { currentOk: false, next: "" };

function renderHome() {
  return el("section", { class: "card", "data-screen": "home" }, [
    el("p", { class: "eyebrow" }, "Grade 3"),
    el("h1", {}, "Study"),
    el("p", { class: "lede" }, "Pick a subject. Each one saves on its own on this iPad."),
    el("div", { class: "cards" }, [
      el("button", { type: "button", class: "subject", "data-subject": "math", onClick: () => { screen = "math"; render(); } }, [
        el("span", { class: "subject-name" }, "Math"),
        el("span", { class: "subject-note" }, "Rounds 1, 2, and 3"),
      ]),
      el("button", { type: "button", class: "subject", "data-subject": "reading", onClick: () => openSet(SETS.reading) }, [
        el("span", { class: "subject-name" }, "Reading"),
        el("span", { class: "subject-note" }, peek(SETS.reading)),
      ]),
      el("button", { type: "button", class: "subject", "data-subject": "vocab", onClick: () => openSet(SETS.vocab) }, [
        el("span", { class: "subject-name" }, "Vocabulary"),
        el("span", { class: "subject-note" }, peek(SETS.vocab)),
      ]),
    ]),
  ]);
}

function renderMath() {
  return el("section", { class: "card", "data-screen": "math" }, [
    el("p", { class: "eyebrow" }, "Math"),
    el("h1", {}, "Choose a round"),
    el("p", {}, "Older rounds stay saved. Starting Round 3 does not erase them."),
    el("div", { class: "cards" }, [SETS.r1, SETS.r2, SETS.r3].map((set) => el("button", {
      type: "button",
      class: "subject",
      "data-round-id": set.id,
      onClick: () => openSet(set),
    }, [
      el("span", { class: "subject-name" }, set.eyebrow),
      el("span", { class: "subject-note" }, peek(set)),
    ]))),
    el("div", { class: "stack" }, [
      el("button", { type: "button", class: "secondary", onClick: goHome }, "All subjects"),
    ]),
  ]);
}

function peek(set) {
  const saved = loadQuizState(localStorage, set.questions, set.storageKey);
  const score = scoreState(saved, set.questions);
  if (!score.quizAnswered) return "Not started";
  if (isComplete(saved, set.questions)) return `Saved · ${score.correct} of ${score.total} scored`;
  return `${score.quizAnswered} of ${score.quizTotal} answered`;
}

function passageBox() {
  if (!passageText) return "";
  const box = el("details", { class: "passage", open: "true" });
  box.append(el("summary", {}, passageTitle || "Passage"));
  box.append(el("p", {}, passageText));
  return box;
}

function wordPicker(question, selected, locked, practiceMode) {
  const chosen = String(selected || "").split("|").filter(Boolean);
  const line = el("div", { class: "sentence-words", role: "group", "aria-label": "Words" });
  for (const token of question.tokens) {
    const bare = token.replace(/[^A-Za-z]/g, "");
    const tappable = bare && question.picks.some((pick) => pick.toLowerCase() === bare.toLowerCase());
    if (!tappable) {
      line.append(el("span", { class: "glue" }, token));
      continue;
    }
    const id = bare.toLowerCase();
    const on = chosen.includes(id);
    line.append(el("button", {
      type: "button",
      class: `word${on ? " selected" : ""}`,
      "aria-pressed": on ? "true" : "false",
      disabled: locked ? "true" : null,
      onClick: () => {
        if (locked) return;
        let next = chosen.filter((item) => item !== id);
        if (!on) {
          if (next.length >= 2) next = next.slice(1);
          next.push(id);
        }
        const value = next.join("|");
        if (practiceMode) practice.picked = value;
        else {
          state = setDraft(state, question, value);
          saveState();
        }
        render();
      },
    }, bare));
  }
  return el("div", {}, [
    el("p", { class: "hint" }, "Tap two words."),
    line,
  ]);
}

function stateHasProgress(value) {
  return Object.keys(value.answers).length > 0 || Object.keys(value.drafts).length > 0;
}

function saveState() {
  if (!setId) return;
  saveQuizState(localStorage, state, storageKey);
  const set = SETS[setId];
  if (set) rememberSnapshot(localStorage, snapshotFromState(set, state, new Date().toISOString()));
}

function openSet(set) {
  QUESTIONS = set.questions;
  storageKey = set.storageKey;
  roundLabel = set.eyebrow;
  setTitle = set.title;
  setIntro = set.intro;
  passageText = set.passage || "";
  passageTitle = set.passageTitle || "";
  setId = set.id;
  state = loadQuizState(localStorage, QUESTIONS, storageKey);
  index = Math.min(nextIndex(state, QUESTIONS), Math.max(QUESTIONS.length - 1, 0));
  screen = isComplete(state, QUESTIONS) ? "results" : stateHasProgress(state) ? "question" : "start";
  practice = null;
  confirmErase = false;
  render();
}

function goHome() {
  screen = "home";
  practice = null;
  confirmErase = false;
  parentUnlocked = false;
  render();
}

function lockButton() {
  return el("button", {
    type: "button",
    class: "parent-lock",
    "aria-label": "Parent view",
    "data-parent-lock": "true",
    onClick: onLock,
  }, "🔒");
}

function onLock() {
  pinBuffer = "";
  pinMessage = "";
  pinMode = "unlock";
  parentUnlocked = false;
  if (screen === "pin" || screen === "parent") {
    screen = returnScreen || "home";
    render();
    return;
  }
  returnScreen = screen;
  screen = "pin";
  render();
}

function renderPin() {
  const waiting = Date.now() < pinWaitUntil;
  const titles = {
    unlock: "Parent PIN",
    current: "Current PIN",
    next: "New PIN",
    confirm: "New PIN again",
  };
  return el("section", { class: "card", "data-screen": "pin" }, [
    el("p", { class: "eyebrow" }, "Parents"),
    el("h1", {}, titles[pinMode] || "Parent PIN"),
    el("p", { class: "digits", "aria-live": "polite" }, pinBuffer.replace(/./g, "•") || " "),
    pinMessage ? el("p", { class: "hint", "data-pin-message": "true" }, pinMessage) : "",
    el("div", { class: "keypad" }, ["1", "2", "3", "4", "5", "6", "7", "8", "9", "spacer", "0", "delete"].map((key) => {
      if (key === "spacer") return el("span", { "aria-hidden": "true" });
      if (key === "delete") {
        return el("button", { type: "button", class: "key ghost", disabled: waiting ? "true" : null, onClick: () => { pinBuffer = pinBuffer.slice(0, -1); render(); } }, "Delete");
      }
      return el("button", {
        type: "button",
        class: "key",
        disabled: waiting ? "true" : null,
        onClick: () => { if (!waiting && pinBuffer.length < 8) { pinBuffer += key; render(); } },
      }, key);
    })),
    el("div", { class: "stack" }, [
      el("button", { type: "button", class: "primary", "data-pin-submit": "true", disabled: waiting || pinBuffer.length < 4 ? "true" : null, onClick: submitPin }, waiting ? "Please wait" : "Continue"),
      el("button", { type: "button", class: "secondary", onClick: onLock }, "Close"),
    ]),
  ]);
}

async function submitPin() {
  if (Date.now() < pinWaitUntil) return;
  if (pinMode === "unlock" || pinMode === "current") {
    const ok = await pinMatches(pinBuffer, localStorage);
    if (!ok) {
      const next = nextPinFailure(pinFails, Date.now());
      pinFails = next.fails;
      pinWaitUntil = next.waitUntil;
      pinBuffer = "";
      pinMessage = pinWaitUntil ? "Too many tries. Wait 15 seconds." : "That PIN is not right.";
      render();
      if (pinWaitUntil) setTimeout(() => { if (Date.now() >= pinWaitUntil) { pinMessage = ""; render(); } }, pinWaitUntil - Date.now() + 30);
      return;
    }
    pinFails = 0;
    if (pinMode === "current") {
      pinDraft.currentOk = true;
      pinMode = "next";
      pinBuffer = "";
      pinMessage = "";
      render();
      return;
    }
    parentUnlocked = true;
    screen = "parent";
    pinBuffer = "";
    pinMessage = "";
    observeSavedSets(localStorage, Object.values(SETS), new Date().toISOString());
    render();
    return;
  }
  if (pinMode === "next") {
    pinDraft.next = pinBuffer;
    pinMode = "confirm";
    pinBuffer = "";
    pinMessage = "";
    render();
    return;
  }
  const result = validatePinChange({ currentOk: pinDraft.currentOk, next: pinDraft.next, confirm: pinBuffer });
  if (!result.ok) {
    pinMessage = result.reason === "mismatch" ? "Those new PINs do not match." : "Use 4 to 8 digits.";
    pinMode = "next";
    pinBuffer = "";
    render();
    return;
  }
  await savePinHash(pinDraft.next, localStorage);
  pinDraft = { currentOk: false, next: "" };
  pinMode = "unlock";
  pinBuffer = "";
  pinMessage = "PIN saved.";
  parentUnlocked = true;
  screen = "parent";
  render();
}

function renderParent() {
  if (!parentUnlocked) {
    screen = "pin";
    return renderPin();
  }
  const report = progressReport(observeSavedSets(localStorage, Object.values(SETS), new Date().toISOString()));
  return el("section", { class: "card", "data-screen": "parent" }, [
    el("p", { class: "eyebrow" }, "Parents"),
    el("h1", {}, "Progress"),
    el("p", {}, "Read only. Scores cannot be changed here."),
    report.weeks.length ? trendChart(report) : el("p", {}, "No saved scores yet."),
    el("div", { class: "table-wrap" }, [progressTable(report.rows)]),
    el("div", { class: "stack" }, [
      el("button", { type: "button", class: "secondary", onClick: () => downloadCsv(report.rows) }, "Export CSV"),
      el("button", { type: "button", class: "secondary", "data-change-pin": "true", onClick: () => { pinMode = "current"; pinBuffer = ""; pinMessage = ""; screen = "pin"; render(); } }, "Change PIN"),
      el("button", { type: "button", class: "primary", onClick: onLock }, "Close"),
    ]),
  ]);
}

function trendChart(report) {
  const colors = { Math: "#1c8f72", Reading: "#3c7fd6", Vocabulary: "#e08a22" };
  const subjects = ["Math", "Reading", "Vocabulary"];
  const width = 640;
  const height = 230;
  const pad = 28;
  const group = (width - pad * 2) / Math.max(report.weeks.length, 1);
  const bar = Math.min(26, Math.max(10, (group - 16) / 3));
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("class", "trend");
  svg.setAttribute("role", "img");
  svg.setAttribute("data-trend", "true");
  svg.setAttribute("aria-label", "Percent correct by week");
  report.weeks.forEach((week, weekIndex) => {
    subjects.forEach((subject, subjectIndex) => {
      const point = report.series[subject][weekIndex];
      if (!point || point.percent == null) return;
      const barHeight = Math.max(4, (point.percent / 100) * (height - 58));
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", String(pad + weekIndex * group + subjectIndex * (bar + 4)));
      rect.setAttribute("y", String(height - 32 - barHeight));
      rect.setAttribute("width", String(bar));
      rect.setAttribute("height", String(barHeight));
      rect.setAttribute("rx", "6");
      rect.setAttribute("fill", colors[subject]);
      svg.append(rect);
    });
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", String(pad + weekIndex * group));
    label.setAttribute("y", String(height - 10));
    label.setAttribute("fill", "#243044");
    label.setAttribute("font-size", "14");
    label.textContent = week.slice(5);
    svg.append(label);
  });
  return el("div", {}, [
    svg,
    el("p", { class: "hint" }, "Green is Math, blue is Reading, orange is Vocabulary. Bar height is percent correct."),
  ]);
}

function progressTable(rows) {
  const table = el("table", { class: "cars progress-table" }, [
    el("thead", {}, [el("tr", {}, ["Week", "Date", "Subject", "Set", "Auto score", "Written to review"].map((label) => el("th", {}, label)))]),
    el("tbody", {}, rows.map((row) => el("tr", {}, [
      el("td", {}, row.week),
      el("td", {}, row.at.slice(0, 10)),
      el("td", {}, row.subject),
      el("td", {}, row.label),
      el("td", {}, `${row.correct} of ${row.total}`),
      el("td", {}, String(row.writtenAwaiting)),
    ]))),
  ]);
  return table;
}

function downloadCsv(rows) {
  const blob = new Blob([reportToCsv(rows)], { type: "text/csv" });
  const link = el("a", { href: URL.createObjectURL(blob), download: "study-progress.csv" });
  link.click();
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
  document.title = screen === "home" || screen === "math" ? "Grade 3 study" : `${setTitle} · ${roundLabel}`;
  document.body.dataset.round = setId || "home";
  app.replaceChildren();
  const shell = el("main", { class: "shell" });
  if (screen === "home") shell.append(renderHome());
  else if (screen === "math") shell.append(renderMath());
  else if (screen === "pin") shell.append(renderPin());
  else if (screen === "parent") shell.append(renderParent());
  else if (screen === "start") shell.append(renderStart());
  else if (screen === "results") shell.append(renderResults());
  else if (screen === "practice") shell.append(renderPractice());
  else shell.append(renderQuestion());
  app.append(shell);
  app.append(lockButton());
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
    actions.push(el("button", { class: answered ? "secondary" : "primary", type: "button", onClick: startFresh }, answered ? `Start ${roundLabel} over` : `Start ${roundLabel}`));
  }
  actions.push(el("button", { class: "secondary", type: "button", onClick: goHome }, "All subjects"));
  return el("section", { class: "card", "data-screen": "start", "data-set": setId }, [
    el("p", { class: "eyebrow" }, roundLabel),
    el("h1", {}, setTitle),
    el("p", { class: "lede" }, setIntro),
    el("p", {}, "Your first answer to each question is the one that counts. This set is saved on its own on this iPad."),
    answered && !finished ? el("p", { class: "status", "data-connection": "saved" }, `${answered} of 24 answered`) : "",
    el("div", { class: "stack" }, actions),
  ]);
}

function startFresh() {
  if (Object.keys(state.answers).length > 0) {
    const ok = window.confirm(`Start ${roundLabel} over? This erases only this set on this iPad.`);
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
  return el("section", { class: "card", "data-screen": "question", "data-set": setId, "data-question-id": question.id, "data-kind": question.kind }, [
    header(),
    passageBox(),
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
      el("p", { class: "eyebrow" }, roundLabel),
      el("button", { type: "button", class: "text-button", onClick: goHome }, "All subjects"),
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
  if (question.kind === "words") return wordPicker(question, selected, locked, false);
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
    el("p", { class: "eyebrow" }, `${roundLabel} finished`),
    el("h1", {}, `${score.correct} of ${score.total}`),
    el("p", { class: "lede", "data-score": `${score.correct}/${score.total}` }, score.writtenTotal ? `Scored answers, out of ${score.total}. Written sentences do not change this number.` : `Scored answers, out of ${score.total}.`),
    el("div", { class: "stack" }, [
      el("button", { class: "primary", type: "button", onClick: startPractice }, "Practice these questions"),
      el("button", { class: "secondary", type: "button", onClick: () => { confirmErase = !confirmErase; render(); } }, "Erase saved score and start over"),
      el("button", { class: "secondary", type: "button", onClick: goHome }, "All subjects"),
    ]),
    confirmErase ? el("div", { class: "confirm" }, [
      el("p", {}, `Erase the saved ${roundLabel} answers on this iPad?`),
      el("div", { class: "row" }, [
        el("button", { class: "secondary", type: "button", onClick: () => { confirmErase = false; render(); } }, "Keep score"),
        el("button", { class: "primary", type: "button", onClick: () => { confirmErase = false; state = blankState(); saveState(); index = 0; screen = "start"; render(); } }, "Erase score"),
      ]),
    ]) : "",
    el("h2", {}, missed.length ? "Missed scored questions" : "Every scored answer was correct"),
    list,
    written.length ? el("h2", {}, "Written responses") : "",
    written.length ? writtenSummary(written) : "",
    written.length ? el("p", {}, "The automatic check looks for a math idea only on the sentences it knows. It does not understand every sentence. If it is not sure, it does not mark the sentence wrong. Other sentences are left for review.") : "",
    written.length ? el("ol", { class: "missed", "data-written-review": "true" }, written.map((question) => {
      const sentence = state.answers[question.id]?.value || "";
      const checked = checkWrittenIdea(question, sentence);
      return el("li", { "data-written-id": question.id }, [
        el("p", { class: "miss-prompt" }, question.prompt),
        el("p", {}, `Your sentence: ${sentence}`),
        el("p", { class: `check check-${checked.status}`, "data-check-status": checked.status }, checked.note),
        el("p", { class: "explain" }, `Example: ${question.example}`),
      ]);
    })) : "",
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
  if (question.kind === "words") return wordPicker(question, picked, locked, true);
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
