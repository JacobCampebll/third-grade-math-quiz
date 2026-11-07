import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { QUESTIONS } from "../assets/questions.js";
import {
  applyDigit,
  backspaceDigit,
  blankState,
  canonical,
  checkPractice,
  isComplete,
  missedQuestions,
  recordFirstAnswer,
  sanitize,
  scoreState,
  setDraft,
} from "../assets/grade.js";

const expected = {
  q1: "q1-multiply",
  q2: String(18 + 6),
  q3: String(7 * 6),
  q4: String(8 * 6),
  q5: "true",
  q6: "false",
  q7: "true",
  q8: "7",
  q9: String((2 * 10) / 4),
  q10: String(3 * 6),
  q11: String(5 * 10),
  q12: String(16 / 2),
  q13: String(12 / 2),
  q14: String(3 * 2 * 4),
  q15: String(5 * 2),
  q16: "q16-multiply",
  q17: String(12 / 4),
  q18: "q18-divide",
  q19: String(6 * 4),
  q20: String(5 * 3),
  q21: "q21-32",
  q22: String(5 * 3),
  q23: "q23-double-28",
  q24: String(3 * 4),
};

test("bank has 24 original questions with checked answers", () => {
  assert.equal(QUESTIONS.length, 24);
  assert.deepEqual(QUESTIONS.map((question) => question.id), Object.keys(expected));
  for (const question of QUESTIONS) {
    assert.equal(question.answer, expected[question.id]);
    assert.ok(question.explanation.length > 20);
    assert.equal(canonical(question, question.answer), question.answer);
  }
  assert.equal(9 - 4 === 4 - 9, false);
  assert.equal(4 * 3, 3 * 4);
  assert.equal(2 * 8, 4 * 4);
  assert.equal(8 * 4, 32);
  assert.equal(8 * 2, 16);
  assert.equal(14 * 2, 28);
  assert.doesNotMatch(QUESTIONS.find((question) => question.id === "q6").explanation, /negative/i);
});

test("choice distractors are not the correct value", () => {
  const q1 = { "q1-multiply": 8 * 4, "q1-add": 8 + 4, "q1-subtract": 8 - 4, "q1-divide": 8 / 4 };
  assert.equal(q1["q1-multiply"], 32);
  for (const [id, value] of Object.entries(q1)) {
    if (id !== "q1-multiply") assert.notEqual(value, 32);
  }
  const stories = {
    "q16-multiply": 5 * 2,
    "q16-add": 5 + 2,
    "q16-subtract": 5 - 2,
    "q16-other": 10 * 5,
  };
  assert.equal(stories["q16-multiply"], 10);
  for (const [id, value] of Object.entries(stories)) {
    if (id !== "q16-multiply") assert.notEqual(value, 10);
  }
  for (const question of QUESTIONS.filter((item) => item.kind === "choice")) {
    assert.equal(question.choices.filter((choice) => choice.id === question.answer).length, 1);
    assert.ok(question.choices.length >= 3);
  }
  const doubling = QUESTIONS.find((question) => question.id === "q21");
  assert.equal(doubling.choices.filter((choice) => choice.label.includes("32")).length, 1);
  assert.equal(doubling.choices.find((choice) => choice.label.startsWith("Yes")).id === doubling.answer, false);
});

test("first submitted answer is kept and a later one does not count", () => {
  const question = QUESTIONS.find((item) => item.id === "q2");
  const first = recordFirstAnswer(blankState(), question, "20");
  assert.equal(first.ok, true);
  assert.equal(first.duplicate, false);
  const second = recordFirstAnswer(first.state, question, "24");
  assert.equal(second.duplicate, true);
  assert.equal(second.state.answers.q2.value, "20");
  assert.equal(scoreState(second.state, QUESTIONS).correct, 0);
  assert.equal(missedQuestions(second.state, QUESTIONS).map((item) => item.id).includes("q2"), true);
});

test("a full correct pass scores 24 and practice does not change it", () => {
  let state = blankState();
  for (const question of QUESTIONS) {
    const result = recordFirstAnswer(state, question, question.answer);
    assert.equal(result.duplicate, false);
    state = result.state;
  }
  assert.equal(isComplete(state, QUESTIONS), true);
  assert.deepEqual(scoreState(state, QUESTIONS), { correct: 24, answered: 24, total: 24 });
  const snapshot = JSON.stringify(state);
  const practice = checkPractice(QUESTIONS[1], "1");
  assert.equal(practice.correct, false);
  assert.match(practice.explanation, /24/);
  assert.equal(JSON.stringify(state), snapshot);
  const right = checkPractice(QUESTIONS[0], "q1-add");
  assert.equal(right.correct, false);
  assert.equal(checkPractice(QUESTIONS[0], "q1-multiply").correct, true);
});

test("choice drafts keep the whole answer id", () => {
  const question = QUESTIONS.find((item) => item.id === "q1");
  const drafted = setDraft(blankState(), question, "q1-multiply");
  const saved = recordFirstAnswer(drafted, question, drafted.drafts.q1);
  assert.equal(saved.ok, true);
  assert.equal(saved.state.answers.q1.value, "q1-multiply");
  const restored = sanitize({ answers: {}, drafts: { q1: "q1-multiply", q5: "true" } }, QUESTIONS);
  assert.equal(restored.drafts.q1, "q1-multiply");
  assert.equal(restored.drafts.q5, "true");
});

test("keypad entry and invalid answers", () => {
  assert.equal(applyDigit("", "0"), "0");
  assert.equal(applyDigit("0", "8"), "8");
  assert.equal(applyDigit("12", "9"), "129");
  assert.equal(applyDigit("129", "4"), "129");
  assert.equal(backspaceDigit("24"), "2");
  const numeric = QUESTIONS.find((question) => question.id === "q3");
  assert.equal(canonical(numeric, "08"), null);
  assert.equal(canonical(numeric, "42"), "42");
  assert.equal(recordFirstAnswer(blankState(), numeric, "nope").ok, false);
});

test("saved quiz restores scored answers and drops junk", () => {
  const restored = sanitize({
    answers: { q3: { value: "42", correct: false }, q4: { value: "no" }, other: { value: "1" } },
    drafts: { q2: "18", q3: "7" },
  }, QUESTIONS);
  assert.equal(restored.answers.q3.value, "42");
  assert.equal(restored.answers.q4, undefined);
  assert.equal(restored.answers.other, undefined);
  assert.equal(restored.drafts.q2, "18");
  assert.equal(restored.drafts.q3, undefined);
  assert.equal(scoreState(restored, QUESTIONS).correct, 1);
});

test("site files stay static and local", () => {
  const files = ["../index.html", "../assets/quiz.js", "../assets/grade.js", "../assets/questions.js", "../assets/styles.css"];
  const blob = files.map((file) => readFileSync(new URL(file, import.meta.url), "utf8")).join("\n");
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /href="assets\/styles\.css"/);
  assert.match(html, /src="assets\/quiz\.js"/);
  assert.doesNotMatch(html, /https?:\/\//);
  assert.doesNotMatch(blob, /supabase|jcampbell|service_role|gtag|google-analytics/i);
  assert.doesNotMatch(blob, /Bridges|Mia\b|Nathan/i);
});
