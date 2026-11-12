import assert from "node:assert/strict";
import test from "node:test";
import { QUESTIONS as ROUND2 } from "../assets/questions.js";
import { QUESTIONS as READING } from "../assets/reading.js";
import {
  DEFAULT_PIN_HASH,
  HISTORY_KEY,
  PIN_KEY,
  loadHistory,
  nextPinFailure,
  observeSavedSets,
  pinMatches,
  progressReport,
  rememberSnapshot,
  savePinHash,
  sha256Hex,
  validatePinChange,
  weekStartMonday,
} from "../assets/parent-progress.js";
import { loadQuizState, scoreState } from "../assets/grade.js";

function memory(data = {}) {
  return {
    data: { ...data },
    getItem(key) { return this.data[key] ?? null; },
    setItem(key, value) { this.data[key] = value; },
  };
}

const round2Set = {
  id: "r2",
  subject: "Math",
  eyebrow: "Round 2",
  storageKey: "g3-math-quiz-r2",
  questions: ROUND2,
};

test("default PIN hash matches 1991 and rejects a wrong PIN", async () => {
  assert.equal(await sha256Hex("1991"), DEFAULT_PIN_HASH);
  const storage = memory();
  assert.equal(await pinMatches("1991", storage), true);
  assert.equal(await pinMatches("1990", storage), false);
  assert.equal(storage.getItem(PIN_KEY), null);
});

test("change PIN persists a new hash and the old PIN stops working", async () => {
  const storage = memory();
  assert.deepEqual(validatePinChange({ currentOk: false, next: "2222", confirm: "2222" }), { ok: false, reason: "current" });
  assert.deepEqual(validatePinChange({ currentOk: true, next: "2222", confirm: "3333" }), { ok: false, reason: "mismatch" });
  assert.equal(validatePinChange({ currentOk: true, next: "2222", confirm: "2222" }).ok, true);
  await savePinHash("2222", storage);
  assert.equal(await pinMatches("1991", storage), false);
  assert.equal(await pinMatches("2222", storage), true);
  assert.notEqual(storage.getItem(PIN_KEY), "2222");
});

test("wrong tries wait, then allow another try", () => {
  const first = nextPinFailure(0, 1000);
  assert.equal(first.waitUntil, 0);
  const blocked = nextPinFailure(3, 5000);
  assert.equal(blocked.fails, 0);
  assert.equal(blocked.waitUntil, 20000);
});

test("weeks start on Monday and a saved round 2 score is unchanged", () => {
  assert.equal(weekStartMonday("2026-11-12T15:00:00"), "2026-11-09");
  assert.equal(weekStartMonday("2026-11-09T08:00:00"), "2026-11-09");
  assert.equal(weekStartMonday("2026-11-08T21:00:00"), "2026-11-02");
  const payload = JSON.stringify({
    answers: { q1: { value: "q1-multiply" }, q2: { value: "36" } },
    drafts: {},
  });
  const storage = memory({ "g3-math-quiz-r2": payload });
  const before = storage.getItem("g3-math-quiz-r2");
  const history = observeSavedSets(storage, [round2Set, { id: "reading", subject: "Reading", eyebrow: "Reading", storageKey: "g3-reading-hw9", questions: READING }], "2026-11-12T15:00:00");
  assert.equal(storage.getItem("g3-math-quiz-r2"), before);
  const loaded = loadQuizState(storage, ROUND2, "g3-math-quiz-r2");
  assert.equal(scoreState(loaded, ROUND2).correct, 2);
  assert.equal(scoreState(loaded, ROUND2).total, 21);
  assert.equal(history.length, 1);
  assert.equal(history[0].correct, 2);
  assert.equal(history[0].subject, "Math");
  const report = progressReport(history);
  assert.equal(report.rows.length, 1);
  assert.equal(report.series.Math[0].percent, 10);
  assert.equal(report.series.Math[0].week, "2026-11-09");
  const again = observeSavedSets(storage, [round2Set], "2026-11-20T15:00:00");
  assert.equal(again.length, 1);
  assert.equal(loadHistory(storage).length, 1);
});

test("chart groups two weeks by subject", () => {
  const events = [
    { setId: "r2", subject: "Math", label: "Round 2", at: "2026-11-03T12:00:00", correct: 10, total: 21, writtenAwaiting: 2 },
    { setId: "r3", subject: "Math", label: "Round 3", at: "2026-11-12T12:00:00", correct: 18, total: 20, writtenAwaiting: 3 },
    { setId: "reading", subject: "Reading", label: "Reading", at: "2026-11-12T12:00:00", correct: 8, total: 16, writtenAwaiting: 1 },
  ];
  const report = progressReport(events);
  assert.deepEqual(report.weeks, ["2026-11-02", "2026-11-09"]);
  assert.equal(report.series.Math.length, 2);
  assert.equal(report.series.Reading[1].percent, 50);
  assert.equal(report.series.Vocabulary[0].percent, null);
  assert.equal(report.rows.find((row) => row.setId === "r3").writtenAwaiting, 3);
});
