export const PRACTICE_DAYS_KEY = "g3-practice-days-v1";

export const MILESTONES = {
  3: "On fire!",
  5: "Five days strong!",
  7: "One whole week!",
  10: "Rocket mode!",
  14: "Two weeks!",
  30: "Legend!",
};

export function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function shiftDay(iso, delta) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + delta);
  return localDateString(date);
}

export function loadPracticeDays(storage) {
  try {
    const parsed = JSON.parse(storage.getItem(PRACTICE_DAYS_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.filter((day) => /^\d{4}-\d{2}-\d{2}$/.test(day)))].sort();
  } catch {
    return [];
  }
}

export function savePracticeDays(storage, days) {
  storage.setItem(PRACTICE_DAYS_KEY, JSON.stringify([...new Set(days)].sort()));
}

export function longestRun(days) {
  const sorted = [...new Set(days)].sort();
  if (!sorted.length) return 0;
  let best = 1;
  let run = 1;
  for (let index = 1; index < sorted.length; index += 1) {
    run = shiftDay(sorted[index - 1], 1) === sorted[index] ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}

export function describeStreak(days, today) {
  const unique = [...new Set(days)].sort();
  const best = longestRun(unique);
  const yesterday = shiftDay(today, -1);
  const practicedToday = unique.includes(today);
  const anchor = practicedToday ? today : unique.includes(yesterday) ? yesterday : null;
  if (!anchor) {
    return { current: 0, best, nudge: "Start a new streak today!", milestone: "", practicedToday: false };
  }
  let current = 0;
  let cursor = anchor;
  const has = new Set(unique);
  while (has.has(cursor)) {
    current += 1;
    cursor = shiftDay(cursor, -1);
  }
  return {
    current,
    best: Math.max(best, current),
    nudge: practicedToday ? "" : "Keep it going today!",
    milestone: practicedToday ? (MILESTONES[current] || "") : "",
    practicedToday,
  };
}

export function recordPracticeDay(days, today) {
  const already = days.includes(today);
  const next = already ? days : [...days, today];
  return { ...describeStreak(next, today), days: [...new Set(next)].sort(), added: !already };
}

export function completionDates(sets, history, loadState, toLocalDay) {
  const dates = [];
  for (const set of sets) {
    const saved = loadState(set);
    if (!saved.complete) continue;
    const events = history.filter((event) => event.setId === set.id && event.at);
    if (!events.length) continue;
    const latest = events.reduce((best, event) => (event.at > best.at ? event : best));
    dates.push(toLocalDay(latest.at));
  }
  return dates;
}

export function seedPracticeDays(storage, dates) {
  const current = loadPracticeDays(storage);
  const merged = new Set(current);
  for (const day of dates) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(day)) merged.add(day);
  }
  const next = [...merged].sort();
  if (next.length !== current.length) savePracticeDays(storage, next);
  return next;
}
