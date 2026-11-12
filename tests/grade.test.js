import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { QUESTIONS } from "../assets/questions.js";
import {
  PREVIOUS_STORAGE_KEY,
  STORAGE_KEY,
  applyDigit,
  backspaceDigit,
  blankState,
  canonical,
  canonicalWritten,
  checkPractice,
  isComplete,
  loadQuizState,
  missedQuestions,
  recordFirstAnswer,
  sanitize,
  saveQuizState,
  scoreState,
  setDraft,
} from "../assets/grade.js";

const expected = {
  q1: "q1-multiply",
  q2: String(27 + 9),
  q3: String(9 * 6),
  q4: String(7 * 8),
  q5: "true",
  q6: "false",
  q7: "true",
  q8: "3",
  q9: String((5 * 6) / 10),
  q11: String(9 * 7),
  q12: String(8 * 10),
  q13: String(48 / 6),
  q14: String(54 / 9),
  q15: String(4 * 3 * 5),
  q16: String(6 * 4),
  q17: "q17-multiply",
  q19: String(5 * 5),
  q20: String(6 * 4),
  q21: "q21-divide",
  q22: String(7 * 4),
  q23: String(6 * 8),
};

const writtenIds = ["q10", "q18", "q24"];

const round1Prompts = [
  "A crayon is 8 centimeters long. A pencil is 4 times as long as the crayon. Which equation gives the pencil's length, p, in centimeters?",
  "Count by sixes. What number is missing? 6, 12, 18, ____, 30",
  "What is 7 × 6?",
  "What is 8 × 6?",
  "True or false? 4 × 3 = 3 × 4",
  "True or false? 9 − 4 = 4 − 9",
  "True or false? 2 × 8 = 4 × 4",
  "3 × 7 = ____ × 3. What number goes in the blank?",
  "2 × 10 = 4 × ____. What number goes in the blank?",
  "What is 3 × 6?",
  "What is 5 × 10?",
  "2 × ____ = 16. What number goes in the blank?",
  "12 = ____ × 2. What number goes in the blank?",
  "Each sticker costs 4¢. How many cents do all of these stickers cost?",
  "There are 5 bags of treats. Each bag costs $2. How many dollars do they cost altogether?",
  "There are 5 bags of treats. Each bag costs $2. Which equation matches the story?",
  "4 toys cost $12 altogether. Each toy costs the same amount. How many dollars does 1 toy cost?",
  "4 toys cost $12 altogether. Each toy costs the same amount. Which equation shows the price of 1 toy?",
  "How many tiles are in this whole grid?",
  "A small leaf is 5 centimeters long. A large leaf is 3 times as long. How many centimeters long is the large leaf?",
  "A student says, “I know 2 × 4 = 8, so 4 × 8 = 16.” The student doubled both factors and then doubled the product. Is that right?",
  "A tricycle has 3 wheels. How many wheels are on 5 tricycles?",
  "You know 2 × 7 = 14. Which choice uses that fact to find 4 × 7?",
  "Each car has 4 tires. How many tires are on 3 cars?",
];

test("round 2 has 21 scored answers and 3 written questions", () => {
  assert.equal(QUESTIONS.length, 24);
  assert.deepEqual(QUESTIONS.map((question) => question.id), [...Object.keys(expected).slice(0, 9), ...writtenIds.slice(0, 1), ...Object.keys(expected).slice(9, 16), writtenIds[1], ...Object.keys(expected).slice(16), writtenIds[2]]);
  assert.deepEqual(QUESTIONS.filter((question) => question.kind === "written").map((question) => question.id), writtenIds);
  assert.equal(QUESTIONS.filter((question) => question.kind !== "written").length, 21);
  for (const question of QUESTIONS) {
    if (question.kind === "written") {
      assert.equal(question.answer, undefined);
      assert.ok(question.example.length > 20);
    } else {
      assert.equal(question.answer, expected[question.id]);
      assert.ok(question.explanation.length > 20);
      assert.equal(canonical(question, question.answer), question.answer);
    }
  }
  assert.equal(12 - 5 === 5 - 12, false);
  assert.equal(6 * 9, 9 * 6);
  assert.equal(4 * 9, 6 * 6);
  assert.equal(3 * 4 * 4, 48);
  assert.equal(6 * 8, 48);
  assert.equal(16 * 2, 32);
  assert.doesNotMatch(QUESTIONS.find((question) => question.id === "q6").explanation, /negative/i);
  for (const prompt of QUESTIONS.map((question) => question.prompt)) {
    assert.equal(round1Prompts.includes(prompt), false);
  }
});

test("choice distractors are not the correct value", () => {
  const q1 = { "q1-multiply": 7 * 6, "q1-add": 7 + 6, "q1-subtract": 7 - 6, "q1-divide": 7 / 6 };
  assert.equal(q1["q1-multiply"], 42);
  for (const [id, value] of Object.entries(q1)) {
    if (id !== "q1-multiply") assert.notEqual(value, 42);
  }
  const packs = { "q17-multiply": 7 * 3, "q17-add": 7 + 3, "q17-subtract": 7 - 3, "q17-other": 21 * 7 };
  assert.equal(packs["q17-multiply"], 21);
  for (const [id, value] of Object.entries(packs)) {
    if (id !== "q17-multiply") assert.notEqual(value, 21);
  }
  const shirts = { "q21-divide": 18 / 6, "q21-multiply": 18 * 6, "q21-add": 18 + 6, "q21-subtract": 18 - 6 };
  assert.equal(shirts["q21-divide"], 3);
  for (const [id, value] of Object.entries(shirts)) {
    if (id !== "q21-divide") assert.notEqual(value, 3);
  }
});

test("written sentences are kept but not scored or phrase-matched", () => {
  const written = QUESTIONS.find((question) => question.id === "q10");
  assert.equal(canonicalWritten("36"), null);
  assert.equal(canonicalWritten("yes"), null);
  assert.equal(canonicalWritten("   "), null);
  const sentence = "I think the product should be 48.";
  assert.equal(canonicalWritten(`${sentence}`), sentence);
  assert.equal(canonicalWritten("I doubled it"), "I doubled it");
  const first = recordFirstAnswer(blankState(), written, `  ${sentence}  `);
  assert.equal(first.ok, true);
  assert.equal(first.state.answers.q10.value, sentence);
  const second = recordFirstAnswer(first.state, written, "A completely different sentence here.");
  assert.equal(second.duplicate, true);
  assert.equal(second.state.answers.q10.value, sentence);
  const score = scoreState(second.state, QUESTIONS);
  assert.equal(score.correct, 0);
  assert.equal(score.total, 21);
  assert.equal(score.writtenAnswered, 1);
  assert.equal(score.writtenTotal, 3);
  assert.equal(missedQuestions(second.state, QUESTIONS).some((question) => question.kind === "written"), false);
  const practice = checkPractice(written, written.example);
  assert.equal(practice.written, true);
  assert.equal(practice.correct, undefined);
  assert.equal(practice.explanation, written.example);
  assert.equal(second.state.answers.q10.value, sentence);
});

test("a mixed quiz scores 21 and keeps written answers out of the misses", () => {
  let state = blankState();
  for (const question of QUESTIONS) {
    const raw = question.kind === "written" ? "I explained my thinking here." : question.answer;
    const result = recordFirstAnswer(state, question, raw);
    assert.equal(result.duplicate, false, question.id);
    state = result.state;
  }
  assert.equal(isComplete(state, QUESTIONS), true);
  assert.deepEqual(scoreState(state, QUESTIONS), {
    correct: 21,
    answered: 21,
    total: 21,
    writtenAnswered: 3,
    writtenTotal: 3,
    quizAnswered: 24,
    quizTotal: 24,
  });
  const wrong = recordFirstAnswer(blankState(), QUESTIONS[1], "30");
  const withWritten = recordFirstAnswer(wrong.state, QUESTIONS[9], "Not the example sentence.");
  assert.deepEqual(missedQuestions(withWritten.state, QUESTIONS).map((question) => question.id), ["q2"]);
  assert.equal(scoreState(withWritten.state, QUESTIONS).correct, 0);
  assert.equal(scoreState(withWritten.state, QUESTIONS).total, 21);
});

test("first scored answer stays locked", () => {
  const question = QUESTIONS.find((item) => item.id === "q2");
  const first = recordFirstAnswer(blankState(), question, "30");
  const second = recordFirstAnswer(first.state, question, "36");
  assert.equal(second.duplicate, true);
  assert.equal(second.state.answers.q2.value, "30");
});

test("choice drafts keep the whole answer id", () => {
  const question = QUESTIONS.find((item) => item.id === "q1");
  const drafted = setDraft(blankState(), question, "q1-multiply");
  const saved = recordFirstAnswer(drafted, question, drafted.drafts.q1);
  assert.equal(saved.state.answers.q1.value, "q1-multiply");
});

test("keypad entry and invalid answers", () => {
  assert.equal(applyDigit("0", "8"), "8");
  assert.equal(applyDigit("129", "4"), "129");
  assert.equal(backspaceDigit("36"), "3");
  const numeric = QUESTIONS.find((question) => question.id === "q3");
  assert.equal(canonical(numeric, "08"), null);
  assert.equal(recordFirstAnswer(blankState(), numeric, "nope").ok, false);
});

test("round 2 ignores a finished round 1 save", () => {
  const round1 = JSON.stringify({
    answers: Object.fromEntries(Array.from({ length: 24 }, (_, index) => [`q${index + 1}`, { value: "1" }])),
    drafts: {},
  });
  const storage = {
    data: { [PREVIOUS_STORAGE_KEY]: round1 },
    getItem(key) { return Object.prototype.hasOwnProperty.call(this.data, key) ? this.data[key] : null; },
    setItem(key, value) { this.data[key] = value; },
  };
  const loaded = loadQuizState(storage, QUESTIONS);
  assert.equal(scoreState(loaded, QUESTIONS).quizAnswered, 0);
  assert.equal(isComplete(loaded, QUESTIONS), false);
  const saved = recordFirstAnswer(loaded, QUESTIONS[0], QUESTIONS[0].answer);
  saveQuizState(storage, saved.state);
  assert.equal(storage.getItem(PREVIOUS_STORAGE_KEY), round1);
  assert.equal(storage.data[STORAGE_KEY].includes("q1-multiply"), true);
  const again = loadQuizState(storage, QUESTIONS);
  assert.equal(again.answers.q1.value, "q1-multiply");
  assert.equal(scoreState(again, QUESTIONS).correct, 1);
  assert.equal(scoreState(again, QUESTIONS).total, 21);
  const draft = sanitize({
    answers: {},
    drafts: { q10: "I am still writing", q2: "18" },
  }, QUESTIONS);
  assert.equal(draft.drafts.q10, "I am still writing");
  assert.equal(draft.drafts.q2, "18");
});

test("site files stay static and label round 2", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const quiz = readFileSync(new URL("../assets/quiz.js", import.meta.url), "utf8");
  const grade = readFileSync(new URL("../assets/grade.js", import.meta.url), "utf8");
  assert.match(html, /Grade 3 study/);
  assert.match(html, /href="assets\/styles\.css\?v=study1"/);
  assert.match(html, /src="assets\/quiz\.js\?v=study1"/);
  assert.match(quiz, /questions\.js\?v=study1/);
  assert.match(quiz, /g3-math-quiz-v1/);
  assert.match(quiz, /g3-math-quiz-r3/);
  assert.match(quiz, /Automatic check/);
  assert.match(grade, /g3-math-quiz-r2/);
  assert.doesNotMatch(quiz, /removeItem/);
  assert.doesNotMatch(html, /https?:\/\//);
  const blob = [html, quiz, grade, readFileSync(new URL("../assets/questions.js", import.meta.url), "utf8")].join("\n");
  assert.doesNotMatch(blob, /supabase|jcampbell|service_role|gtag|google-analytics/i);
  assert.doesNotMatch(blob, /Bridges|Mia\b|Nathan/i);
});
