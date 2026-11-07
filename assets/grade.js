export const STORAGE_KEY = "g3-math-quiz-v1";

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
  return null;
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

export function scoreState(state, questions) {
  let correct = 0;
  let answered = 0;
  for (const question of questions) {
    const row = state.answers[question.id];
    if (!row) continue;
    answered += 1;
    if (row.value === question.answer) correct += 1;
  }
  return { correct, answered, total: questions.length };
}

export function missedQuestions(state, questions) {
  return questions.filter((question) => {
    const row = state.answers[question.id];
    return row && row.value !== question.answer;
  });
}

export function answerLabel(question, value) {
  if (!question || value == null) return "";
  if (question.kind === "choice") {
    return question.choices.find((choice) => choice.id === value)?.label ?? value;
  }
  if (question.kind === "true_false") return value === "true" ? "True" : "False";
  return value;
}

export function checkPractice(question, raw) {
  const value = canonical(question, raw);
  if (value == null) return { ok: false, reason: "invalid" };
  return {
    ok: true,
    value,
    correct: value === question.answer,
    explanation: question.explanation,
  };
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
      const draft = question.kind === "numeric" ? raw.drafts[question.id].slice(0, 3) : raw.drafts[question.id];
      if (draft && (question.kind === "numeric" || canonical(question, draft))) state.drafts[question.id] = draft;
    }
  }
  return state;
}
