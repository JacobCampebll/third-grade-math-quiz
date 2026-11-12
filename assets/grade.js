export const ROUND_LABEL = "Round 2";
export const STORAGE_KEY = "g3-math-quiz-r2";
export const PREVIOUS_STORAGE_KEY = "g3-math-quiz-v1";

export function blankState() {
  return { answers: {}, drafts: {} };
}

export function canonical(question, raw) {
  if (!question) return null;
  if (question.kind === "numeric") {
    const text = String(raw ?? "").trim();
    if (!/^(0|[1-9]\d{0,2})$/.test(text)) return null;
    return text;
  }
  if (question.kind === "true_false") {
    const text = String(raw ?? "").trim().toLowerCase();
    return text === "true" || text === "false" ? text : null;
  }
  if (question.kind === "choice") {
    return question.choices.some((choice) => choice.id === raw) ? raw : null;
  }
  if (question.kind === "written") return canonicalWritten(raw);
  if (question.kind === "words") return canonicalWords(raw);
  return null;
}

export function canonicalWords(raw) {
  const parts = String(raw ?? "").split("|").map((part) => part.trim().toLowerCase()).filter(Boolean);
  const unique = [...new Set(parts)];
  if (unique.length !== 2) return null;
  unique.sort();
  return unique.join("|");
}

export function canonicalWritten(raw) {
  const text = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (text.length < 12 || text.length > 400) return null;
  if (!/[A-Za-z]/.test(text)) return null;
  if (text.split(" ").filter(Boolean).length < 2) return null;
  return text;
}

export function applyDigit(current, digit) {
  if (!/^\d$/.test(digit)) return current;
  const next = `${current}${digit}`.replace(/^0+(?=\d)/, "");
  return next.slice(0, 3);
}

export function backspaceDigit(current) {
  return String(current).slice(0, -1);
}

export function recordFirstAnswer(state, question, raw) {
  const existing = state.answers[question.id];
  if (existing) {
    return { ok: true, duplicate: true, state, value: existing.value };
  }
  const value = canonical(question, raw);
  if (value == null) return { ok: false, reason: "invalid", state };
  return {
    ok: true,
    duplicate: false,
    value,
    state: {
      answers: { ...state.answers, [question.id]: { value } },
      drafts: clearDraft(state.drafts, question.id),
    },
  };
}

export function setDraft(state, question, raw) {
  if (state.answers[question.id]) return state;
  const drafts = { ...state.drafts };
  let text = String(raw ?? "");
  if (question.kind === "numeric") text = text.slice(0, 3);
  if (question.kind === "written") text = text.slice(0, 400);
  if (!text) delete drafts[question.id];
  else drafts[question.id] = text;
  return { answers: state.answers, drafts };
}

function clearDraft(drafts, questionId) {
  if (!drafts[questionId]) return drafts;
  const next = { ...drafts };
  delete next[questionId];
  return next;
}

export function isComplete(state, questions) {
  return questions.every((question) => state.answers[question.id]);
}

export function nextIndex(state, questions) {
  const index = questions.findIndex((question) => !state.answers[question.id]);
  return index === -1 ? questions.length : index;
}

export function isScored(question) {
  return question.kind !== "written";
}

export function scoreState(state, questions) {
  const scored = questions.filter(isScored);
  let correct = 0;
  let answered = 0;
  for (const question of scored) {
    const row = state.answers[question.id];
    if (!row) continue;
    answered += 1;
    if (row.value === question.answer) correct += 1;
  }
  const written = questions.filter((question) => question.kind === "written");
  return {
    correct,
    answered,
    total: scored.length,
    writtenAnswered: written.filter((question) => state.answers[question.id]).length,
    writtenTotal: written.length,
    quizAnswered: questions.filter((question) => state.answers[question.id]).length,
    quizTotal: questions.length,
  };
}

export function missedQuestions(state, questions) {
  return questions.filter((question) => {
    if (!isScored(question)) return false;
    const row = state.answers[question.id];
    return row && row.value !== question.answer;
  });
}

export function answerLabel(question, value) {
  if (!question || value == null) return "";
  if (question.kind === "words") return value.split("|").join(" and ");
  if (question.kind === "choice") {
    return question.choices.find((choice) => choice.id === value)?.label ?? value;
  }
  if (question.kind === "true_false") return value === "true" ? "True" : "False";
  return value;
}

export function checkPractice(question, raw) {
  const value = canonical(question, raw);
  if (value == null) return { ok: false, reason: "invalid" };
  if (question.kind === "written") {
    return { ok: true, value, written: true, explanation: question.example };
  }
  return {
    ok: true,
    value,
    correct: value === question.answer,
    explanation: question.explanation,
  };
}

export function loadQuizState(storage, questions, key = STORAGE_KEY) {
  try {
    return sanitize(JSON.parse(storage.getItem(key) || "null"), questions);
  } catch {
    return blankState();
  }
}

export function saveQuizState(storage, state, key = STORAGE_KEY) {
  storage.setItem(key, JSON.stringify({ answers: state.answers, drafts: state.drafts }));
}

export function sanitize(raw, questions) {
  const state = blankState();
  if (!raw || typeof raw !== "object") return state;
  for (const question of questions) {
    const row = raw.answers?.[question.id];
    if (row && typeof row.value === "string") {
      const value = canonical(question, row.value);
      if (value != null) state.answers[question.id] = { value };
    }
    if (!state.answers[question.id] && typeof raw.drafts?.[question.id] === "string") {
      const rawDraft = raw.drafts[question.id];
      if (question.kind === "written") {
        if (rawDraft.length > 0 && rawDraft.length <= 400) state.drafts[question.id] = rawDraft;
      } else if (question.kind === "words") {
        const parts = rawDraft.split("|").filter(Boolean);
        if (parts.length >= 1 && parts.length <= 2) state.drafts[question.id] = parts.join("|");
      } else if (question.kind === "numeric") {
        const draft = rawDraft.slice(0, 3);
        if (draft) state.drafts[question.id] = draft;
      } else if (canonical(question, rawDraft)) {
        state.drafts[question.id] = rawDraft;
      }
    }
  }
  return state;
}
