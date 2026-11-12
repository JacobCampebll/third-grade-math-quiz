import assert from "node:assert/strict";
import test from "node:test";
import { QUESTIONS as ROUND2 } from "../assets/questions.js";
import { loadQuizState, scoreState } from "../assets/grade.js";
import {
  completionDates,
  describeStreak,
  loadPracticeDays,
  recordPracticeDay,
  seedPracticeDays,
} from "../assets/streak.js";

function memory(data = {}) {
  return {
    data: { ...data },
    getItem(key) { return this.data[key] ?? null; },
    setItem(key, value) { this.data[key] = value; },
  };
}

test("a streak counts consecutive days once and stays alive until a full day is missed", () => {
  const first = recordPracticeDay([], "2026-11-10");
  const sameDay = recordPracticeDay(first.days, "2026-11-10");
  assert.equal(sameDay.added, false);
  assert.equal(sameDay.days.length, 1);
  const second = recordPracticeDay(sameDay.days, "2026-11-11");
  const third = recordPracticeDay(second.days, "2026-11-12");
  assert.equal(describeStreak(third.days, "2026-11-12").current, 3);
  assert.equal(describeStreak(third.days, "2026-11-12").milestone, "On fire!");
  const waiting = describeStreak(third.days, "2026-11-13");
  assert.equal(waiting.current, 3);
  assert.equal(waiting.nudge, "Keep it going today!");
  const missed = describeStreak(third.days, "2026-11-14");
  assert.equal(missed.current, 0);
  assert.equal(missed.nudge, "Start a new streak today!");
  assert.equal(missed.best, 3);
});

test("best streak survives a reset", () => {
  const days = ["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-10"];
  const status = describeStreak(days, "2026-11-10");
  assert.equal(status.current, 1);
  assert.equal(status.best, 5);
  assert.equal(status.milestone, "");
});

test("seeding uses a finished round date and does not change the quiz save", () => {
  const payload = JSON.stringify({
    answers: { q1: { value: "q1-multiply" }, q2: { value: "36" } },
    drafts: {},
  });
  const storage = memory({ "g3-math-quiz-r2": payload });
  const dates = completionDates(
    [{ id: "r2", questions: ROUND2 }],
    [{ setId: "r2", at: "2026-11-12T18:00:00" }],
    () => ({ complete: false }),
    (iso) => iso.slice(0, 10),
  );
  assert.deepEqual(dates, []);
  const finished = completionDates(
    [{ id: "r2", questions: ROUND2 }],
    [{ setId: "r2", at: "2026-11-12T18:00:00" }],
    () => ({ complete: true }),
    (iso) => iso.slice(0, 10),
  );
  seedPracticeDays(storage, finished);
  assert.deepEqual(loadPracticeDays(storage), ["2026-11-12"]);
  assert.equal(storage.getItem("g3-math-quiz-r2"), payload);
  const loaded = loadQuizState(storage, ROUND2, "g3-math-quiz-r2");
  assert.equal(scoreState(loaded, ROUND2).correct, 2);
  assert.equal(scoreState(loaded, ROUND2).total, 21);
});
