import assert from "node:assert/strict";
import test from "node:test";
import { QUESTIONS as ROUND1 } from "../assets/questions-r1.js";
import { QUESTIONS as ROUND2 } from "../assets/questions.js";
import { QUESTIONS as ROUND3 } from "../assets/questions-r3.js";
import { PASSAGE, QUESTIONS as READING } from "../assets/reading.js";
import { QUESTIONS as VOCAB } from "../assets/vocabulary.js";
import { checkWrittenIdea } from "../assets/written-check.js";
import {
  canonical,
  isComplete,
  loadQuizState,
  recordFirstAnswer,
  saveQuizState,
  scoreState,
} from "../assets/grade.js";

const round3 = {
  r3q1: String(42 / 6),
  r3q2: String(36 / 4),
  r3q3: String(7 * 5),
  r3q4: String(17 - 9),
  r3q5: String(15 - 6),
  r3q6: String(7 + 8),
  r3q7: String(36 / 4),
  r3q8: String(6 * 7),
  r3q9: String(40 / 5),
  r3q10: String(14 - 5),
  r3q11: String(16 - 7),
  r3q12: String(11 - 5),
  r3q13: String(9 * 2),
  r3q14: String(56 / 8),
  r3q15: String(18 / 6),
  r3q16: "true",
  r3q17: "false",
  r3q18: "false",
  r3q19: String(4 * 8),
  r3q20: String(24 / 8),
};

test("a previously saved round 2 payload still loads", () => {
  const payload = JSON.stringify({
    answers: {
      q1: { value: "q1-multiply" },
      q2: { value: "36" },
      q10: { value: "No, 6 times 8 is 48 because both factors doubled so the product is 4 times as big." },
    },
    drafts: { q3: "5" },
  });
  const storage = {
    data: { "g3-math-quiz-r2": payload },
    getItem(key) { return this.data[key] ?? null; },
    setItem() { throw new Error("loading a saved quiz must not write"); },
  };
  const state = loadQuizState(storage, ROUND2, "g3-math-quiz-r2");
  assert.equal(state.answers.q1.value, "q1-multiply");
  assert.equal(state.answers.q2.value, "36");
  assert.equal(state.answers.q10.value.includes("6 times 8 is 48"), true);
  assert.equal(state.drafts.q3, "5");
  assert.deepEqual(
    { correct: scoreState(state, ROUND2).correct, total: scoreState(state, ROUND2).total },
    { correct: 2, total: 21 },
  );
  assert.equal(storage.getItem("g3-math-quiz-r2"), payload);
});

test("math round 3 answers and keeps old rounds separate", () => {
  assert.equal(7 + 8, 9 + 6);
  assert.notEqual(12 - 4, 13 - 6);
  assert.notEqual(6 * 5, 8 * 4);
  const scored = ROUND3.filter((question) => question.kind !== "written");
  assert.equal(scored.length, 20);
  assert.equal(ROUND3.filter((question) => question.kind === "written").length, 3);
  for (const question of scored) assert.equal(question.answer, round3[question.id]);
  const round2 = JSON.stringify({ answers: { q1: { value: "q1-multiply" } }, drafts: {} });
  const storage = {
    data: { "g3-math-quiz-r2": round2, "g3-math-quiz-v1": "{\"answers\":{\"q1\":{\"value\":\"q1-multiply\"}}}" },
    getItem(key) { return this.data[key] ?? null; },
    setItem(key, value) { this.data[key] = value; },
  };
  let state = loadQuizState(storage, ROUND3, "g3-math-quiz-r3");
  assert.equal(scoreState(state, ROUND3).quizAnswered, 0);
  state = recordFirstAnswer(state, ROUND3[0], ROUND3[0].answer).state;
  saveQuizState(storage, state, "g3-math-quiz-r3");
  assert.equal(storage.getItem("g3-math-quiz-r2"), round2);
  assert.equal(storage.getItem("g3-math-quiz-v1").includes("q1-multiply"), true);
  assert.equal(checkWrittenIdea(ROUND3.find((question) => question.id === "r3w3"), "6 times 5 is 30 and 8 times 4 is 32.").status, "review");
});

test("reading and vocabulary keys and the two-word answer", () => {
  assert.ok(PASSAGE.length > 800);
  assert.equal(PASSAGE.includes("sunscreen before a long game"), true);
  assert.equal(READING.filter((question) => question.kind !== "written").length, 16);
  assert.equal(READING.filter((question) => question.kind === "written").length, 3);
  assert.equal(READING.find((question) => question.id === "rd4").answer, "rd4-inform");
  assert.equal(READING.find((question) => question.id === "rd3").answer, "rd3-water");
  assert.equal(READING.find((question) => question.id === "rd6").answer, "harmful|unsafe");
  const words = READING.find((question) => question.id === "rd6");
  assert.equal(canonical(words, "unsafe|harmful"), "harmful|unsafe");
  assert.equal(canonical(words, "harmful"), null);
  assert.equal(VOCAB.filter((question) => question.kind !== "written").length, 16);
  assert.equal(VOCAB.filter((question) => question.kind === "written").length, 3);
  assert.equal(VOCAB.find((question) => question.id === "vc1").answer, "vc1-fix");
  assert.equal(VOCAB.find((question) => question.id === "vc4").answer, "vc4-shorten");
  assert.equal(VOCAB.find((question) => question.id === "vc8").answer, "vc8-exhausted");
  assert.equal(ROUND1.length, 24);
  assert.equal(ROUND2.length, 24);
  let reading = { answers: {}, drafts: {} };
  for (const question of READING) {
    const raw = question.kind === "written" ? "People use sunscreen before they play." : question.answer;
    reading = recordFirstAnswer(reading, question, raw).state;
  }
  assert.equal(isComplete(reading, READING), true);
  assert.equal(scoreState(reading, READING).correct, 16);
  assert.equal(scoreState(reading, READING).total, 16);
});
