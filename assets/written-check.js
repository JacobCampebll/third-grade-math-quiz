const SPELLING = {
  rite: "right",
  rong: "wrong",
  wrng: "wrong",
  becuz: "because",
  becouse: "because",
  becaus: "because",
  cuz: "because",
  dubled: "doubled",
  dubble: "double",
  dubbel: "double",
  dubling: "doubling",
  faktors: "factors",
  facters: "factors",
  factrs: "factors",
  anser: "answer",
  answr: "answer",
  anwer: "answer",
  devided: "divided",
  divded: "divided",
  dolar: "dollar",
  dolars: "dollars",
  doller: "dollar",
  dollers: "dollars",
  notebuk: "notebook",
  notbook: "notebook",
  notbooks: "notebooks",
  tims: "times",
  equels: "equals",
  eqals: "equals",
  equls: "equals",
  fourty: "forty",
  fortee: "forty",
  therty: "thirty",
  thrity: "thirty",
  twise: "twice",
  nubers: "numbers",
  numbrs: "numbers",
  prodct: "product",
  produkt: "product",
};

const ONES = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19,
};
const TENS = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

const MATCH_NOTE = "Automatic check: this has the math idea.";
const MISMATCH_NOTE = "Automatic check: this does not match the math idea.";
const REVIEW_NOTE = "Automatic check: not sure. Please read this sentence.";

export function checkWrittenIdea(question, raw) {
  const prepared = prepare(raw);
  if (!prepared) return review();
  if (question.id === "q10") return checkBothDoubled(prepared);
  if (question.id === "q18") return checkNotebookPrice(prepared);
  if (question.id === "q24") return checkDoubleSixteen(prepared);
  return review();
}

function review() {
  return { status: "review", note: REVIEW_NOTE };
}

function match() {
  return { status: "match", note: MATCH_NOTE };
}

function mismatch() {
  return { status: "mismatch", note: MISMATCH_NOTE };
}

function prepare(raw) {
  let text = String(raw ?? "").toLowerCase();
  text = text.replace(/[×*]/g, " x ");
  text = text.replace(/÷/g, " / ");
  text = text.replace(/\$/g, " $ ");
  text = text.replace(/=/g, " equals ");
  text = text.replace(/\//g, " divided ");
  text = text.replace(/n't/g, " not ");
  text = text.replace(/[^a-z0-9\s]/g, " ");
  text = text.replace(/\s+/g, " ").trim();
  if (!text) return null;
  let tokens = text.split(" ").map((word) => SPELLING[word] || word);
  tokens = expandContractions(tokens);
  tokens = numberTokens(tokens);
  return { text: tokens.join(" "), tokens };
}

function expandContractions(tokens) {
  const map = {
    isnt: ["is", "not"],
    dont: ["do", "not"],
    cant: ["can", "not"],
    wont: ["will", "not"],
    didnt: ["did", "not"],
    doesnt: ["does", "not"],
    wasnt: ["was", "not"],
    arent: ["are", "not"],
    thats: ["that", "is"],
    its: ["it", "is"],
  };
  return tokens.flatMap((token) => map[token] || [token]);
}

function numberTokens(tokens) {
  const out = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const word = tokens[index];
    const next = tokens[index + 1];
    if (TENS[word] != null && ONES[next] != null && ONES[next] < 10) {
      out.push(String(TENS[word] + ONES[next]));
      index += 1;
      continue;
    }
    if (TENS[word] != null) {
      out.push(String(TENS[word]));
      continue;
    }
    if (ONES[word] != null) {
      out.push(String(ONES[word]));
      continue;
    }
    out.push(word);
  }
  return out;
}

function numberNegated(tokens, index) {
  const previous = tokens.slice(Math.max(0, index - 5), index);
  const notAt = previous.lastIndexOf("not");
  if (notAt === -1) return false;
  const between = previous.slice(notAt + 1);
  if (between.some((token) => /^\d+$/.test(token))) return false;
  if (["right", "correct", "true", "wrong", "false"].includes(between[0])) return false;
  return true;
}

function affirmed(tokens, value) {
  return tokens.some((token, index) => token === String(value) && !numberNegated(tokens, index));
}

function negated(tokens, value) {
  return tokens.some((token, index) => token === String(value) && numberNegated(tokens, index));
}

function equation(tokens, left, op, right, result) {
  for (let index = 0; index < tokens.length; index += 1) {
    if (tokens[index] !== String(left)) continue;
    let cursor = index + 1;
    const operation = tokens[cursor];
    const matches = op === "x" ? operation === "x" || operation === "times" : operation === "divided";
    if (!matches) continue;
    cursor += 1;
    if (tokens[cursor] === "by") cursor += 1;
    if (tokens[cursor] !== String(right)) continue;
    cursor += 1;
    if (["is", "equals", "equal"].includes(tokens[cursor])) cursor += 1;
    if (tokens[cursor] === "to") cursor += 1;
    if (tokens[cursor] !== String(result)) continue;
    return !numberNegated(tokens, cursor);
  }
  return false;
}

function hasRejection(tokens) {
  return tokens.some((token, index) => {
    if (["wrong", "incorrect", "nope", "false"].includes(token)) return true;
    if (token === "no" && tokens[index - 1] !== "know") return true;
    return token === "not" && ["right", "correct", "true"].includes(tokens[index + 1]);
  });
}

function hasAgreement(tokens) {
  return tokens.some((token, index) => {
    if (!["yes", "right", "correct", "true"].includes(token)) return false;
    return tokens[index - 1] !== "not";
  });
}

function checkBothDoubled({ tokens }) {
  const rejectsClaim = hasRejection(tokens) || negated(tokens, 24);
  const agreesClaim = hasAgreement(tokens);
  const says48 = affirmed(tokens, 48) || equation(tokens, 6, "x", 8, 48) || equation(tokens, 12, "x", 4, 48) || equation(tokens, 4, "x", 12, 48);
  const saysFourTimes = tokens.includes("quadruple") || tokens.includes("quadrupled")
    || nearby(tokens, "times", "4", 2) || nearby(tokens, "multiply", "4", 3);
  const wrongEquation = [24, 36, 12, 16, 32, 64].some((value) => equation(tokens, 6, "x", 8, value));
  const wrongAnswer = !says48 && affirmed(tokens, 12) && nearby(tokens, "answer", "12", 3);

  if (negated(tokens, 48) && !says48) return mismatch();
  if (negated(tokens, 48) && says48) return review();
  if (wrongEquation && says48) return review();
  if (wrongEquation && !says48) return mismatch();
  if (wrongAnswer) return mismatch();
  if (agreesClaim && says48 && !rejectsClaim) return review();
  if (agreesClaim && !rejectsClaim) return mismatch();
  if (agreesClaim && rejectsClaim) return review();
  if (rejectsClaim && says48) return match();
  if (rejectsClaim || says48 || saysFourTimes) return review();
  return review();
}

function nearby(tokens, left, right, distance) {
  const lefts = [];
  const rights = [];
  tokens.forEach((token, index) => {
    if (token === left) lefts.push(index);
    if (token === right) rights.push(index);
  });
  return lefts.some((leftAt) => rights.some((rightAt) => Math.abs(leftAt - rightAt) <= distance));
}

function checkNotebookPrice({ tokens }) {
  const prices = unitPrices(tokens);
  const affirmedPrices = prices.filter((price) => !price.negated).map((price) => price.value);
  const rejectedFive = prices.some((price) => price.value === 5 && price.negated) || negated(tokens, 5);
  const hasFive = affirmedPrices.includes(5) || equation(tokens, 40, "/", 8, 5) || equation(tokens, 8, "x", 5, 40);
  const reason = tokens.some((token) => ["divided", "divide", "division", "split", "shared", "sharing"].includes(token))
    || equation(tokens, 40, "/", 8, 5)
    || equation(tokens, 8, "x", 5, 40)
    || equation(tokens, 5, "x", 8, 40);
  const wrongPrice = affirmedPrices.find((value) => value !== 5);

  if (rejectedFive && !hasFive) return mismatch();
  if (hasFive && wrongPrice != null) return review();
  if (wrongPrice != null && !hasFive) return mismatch();
  if (hasFive && reason && !rejectedFive) return match();
  return review();
}

function unitPrices(tokens) {
  const claimed = new Set();
  tokens.forEach((token, eachAt) => {
    if (token !== "each" && token !== "per") return;
    let best = null;
    let bestDist = 99;
    tokens.forEach((candidate, index) => {
      if (!/^\d+$/.test(candidate)) return;
      const distance = Math.abs(index - eachAt);
      if (distance === 0 || distance > 3) return;
      const score = index < eachAt ? distance - 0.1 : distance;
      if (score < bestDist) {
        bestDist = score;
        best = index;
      }
    });
    if (best != null) claimed.add(best);
  });
  const found = [];
  tokens.forEach((token, index) => {
    if (!/^\d+$/.test(token)) return;
    const value = Number(token);
    const around = tokens.slice(Math.max(0, index - 3), index + 4);
    const before = tokens.slice(Math.max(0, index - 3), index);
    const total = around.includes("altogether") || around.includes("total") || around.includes("all");
    if (total) return;
    const money = around.includes("dollar") || around.includes("dollars");
    const oneBefore = before.includes("1");
    if (claimed.has(index) || oneBefore || (money && value !== 8 && value !== 40)) {
      found.push({ value, negated: numberNegated(tokens, index) });
    }
  });
  return found;
}

function checkDoubleSixteen({ tokens }) {
  const says32 = affirmed(tokens, 32) || equation(tokens, 4, "x", 8, 32) || equation(tokens, 16, "x", 2, 32);
  const negates32 = negated(tokens, 32);
  const doubled16 = nearby(tokens, "double", "16", 3) || nearby(tokens, "doubled", "16", 3) || nearby(tokens, "twice", "16", 4);
  const added16 = tokens.includes("16") && (tokens.includes("added") || tokens.includes("add") || tokens.filter((token) => token === "16").length >= 2);
  const doubleTwo = (tokens.includes("double") || tokens.includes("twice") || tokens.includes("times"))
    && tokens.includes("4") && tokens.includes("2");
  const wrongEquation = [16, 24, 64, 18, 20, 8, 12].some((value) => equation(tokens, 4, "x", 8, value));
  const statedWrong = [24, 64, 18, 20, 16].some((value) => !says32 && (
    nearby(tokens, "answer", String(value), 3)
    || nearby(tokens, "get", String(value), 2)
    || nearby(tokens, "equals", String(value), 2)
    || equation(tokens, 4, "x", 8, value)
  ));

  if (negates32 && !says32) return mismatch();
  if ((wrongEquation || statedWrong) && !says32) return mismatch();
  if (!says32 && [64, 24, 18, 20].some((value) => affirmed(tokens, value))) return mismatch();
  if (says32 && negates32) return review();
  if (says32 && (doubled16 || added16 || doubleTwo)) return match();
  if (says32 || doubled16 || doubleTwo) return review();
  return review();
}
