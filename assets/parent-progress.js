import { loadQuizState, scoreState } from "./grade.js";
import { checkWrittenIdea } from "./written-check.js";

export const HISTORY_KEY = "g3-study-history-v1";
export const PIN_KEY = "g3-parent-pin";
export const DEFAULT_PIN_HASH = "8e9b669109df89620b94f2387dc53206a82ddc71d658f8f7a2b3a9b417370d3e";

export async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(String(text));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function storedPinHash(storage) {
  return storage.getItem(PIN_KEY) || DEFAULT_PIN_HASH;
}

export async function pinMatches(pin, storage) {
  return (await sha256Hex(pin)) === storedPinHash(storage);
}

export async function savePinHash(pin, storage) {
  storage.setItem(PIN_KEY, await sha256Hex(pin));
}

export function validatePinChange({ currentOk, next, confirm }) {
  if (!currentOk) return { ok: false, reason: "current" };
  if (!/^\d{4,8}$/.test(next)) return { ok: false, reason: "length" };
  if (next !== confirm) return { ok: false, reason: "mismatch" };
  return { ok: true };
}

export function nextPinFailure(fails, now) {
  const count = fails + 1;
  if (count >= 4) return { fails: 0, waitUntil: now + 15000 };
  return { fails: count, waitUntil: 0 };
}

export function weekStartMonday(iso) {
  const parsed = new Date(iso);
  const day = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  const weekday = day.getDay();
  const delta = weekday === 0 ? -6 : 1 - weekday;
  day.setDate(day.getDate() + delta);
  const month = String(day.getMonth() + 1).padStart(2, "0");
  const date = String(day.getDate()).padStart(2, "0");
  return `${day.getFullYear()}-${month}-${date}`;
}

export function writtenAwaiting(state, questions) {
  return questions.filter((question) => question.kind === "written" && state.answers[question.id]).filter((question) => {
    return checkWrittenIdea(question, state.answers[question.id].value).status !== "match";
  }).length;
}

export function snapshotFromState(set, state, at) {
  const score = scoreState(state, set.questions);
  return {
    setId: set.id,
    subject: set.subject,
    label: set.eyebrow,
    at,
    correct: score.correct,
    total: score.total,
    writtenAwaiting: writtenAwaiting(state, set.questions),
  };
}

export function loadHistory(storage) {
  try {
    const parsed = JSON.parse(storage.getItem(HISTORY_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((event) => event && event.setId && event.subject && event.at);
  } catch {
    return [];
  }
}

export function rememberSnapshot(storage, snap) {
  const history = loadHistory(storage);
  const day = snap.at.slice(0, 10);
  const index = history.findIndex((event) => event.setId === snap.setId && event.at.slice(0, 10) === day);
  if (index >= 0) {
    const previous = history[index];
    if (previous.correct === snap.correct && previous.total === snap.total && previous.writtenAwaiting === snap.writtenAwaiting) {
      return history;
    }
    const next = history.slice();
    next[index] = snap;
    storage.setItem(HISTORY_KEY, JSON.stringify(next));
    return next;
  }
  const next = history.concat(snap);
  storage.setItem(HISTORY_KEY, JSON.stringify(next));
  return next;
}

export function observeSavedSets(storage, sets, at) {
  let history = loadHistory(storage);
  let changed = false;
  for (const set of sets) {
    const saved = loadQuizState(storage, set.questions, set.storageKey);
    if (!scoreState(saved, set.questions).quizAnswered) continue;
    if (history.some((event) => event.setId === set.id)) continue;
    history = history.concat(snapshotFromState(set, saved, at));
    changed = true;
  }
  if (changed) storage.setItem(HISTORY_KEY, JSON.stringify(history));
  return history;
}

export function progressReport(events) {
  const rows = events.map((event) => ({
    ...event,
    week: weekStartMonday(event.at),
    percent: event.total ? Math.round((event.correct / event.total) * 100) : 0,
  })).sort((a, b) => (a.at < b.at ? 1 : -1));
  const latest = new Map();
  for (const row of [...rows].sort((a, b) => (a.at < b.at ? -1 : 1))) {
    latest.set(`${row.setId}|${row.week}`, row);
  }
  const weeks = [...new Set([...latest.values()].map((row) => row.week))].sort();
  const subjects = ["Math", "Reading", "Vocabulary"];
  const series = {};
  for (const subject of subjects) {
    series[subject] = weeks.map((week) => {
      const points = [...latest.values()].filter((row) => row.subject === subject && row.week === week);
      if (!points.length) return { week, percent: null };
      const percent = Math.round(points.reduce((sum, point) => sum + point.percent, 0) / points.length);
      return { week, percent };
    });
  }
  return { rows, weeks, series };
}

export function reportToCsv(rows) {
  const header = ["week", "date", "subject", "set", "correct", "total", "percent", "written_awaiting_review"];
  const lines = [header.join(",")];
  for (const row of [...rows].sort((a, b) => (a.at < b.at ? -1 : 1))) {
    lines.push([
      row.week,
      row.at,
      row.subject,
      row.label,
      row.correct,
      row.total,
      row.percent,
      row.writtenAwaiting,
    ].join(","));
  }
  return lines.join("\n");
}
