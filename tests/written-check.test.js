import assert from "node:assert/strict";
import test from "node:test";
import { QUESTIONS } from "../assets/questions.js";
import { checkWrittenIdea } from "../assets/written-check.js";
import { blankState, recordFirstAnswer, scoreState } from "../assets/grade.js";

const q10 = QUESTIONS.find((question) => question.id === "q10");
const q18 = QUESTIONS.find((question) => question.id === "q18");
const q24 = QUESTIONS.find((question) => question.id === "q24");

function expectStatus(question, samples, status) {
  for (const sample of samples) {
    const result = checkWrittenIdea(question, sample);
    assert.equal(result.status, status, `${question.id} [${status}] ${sample} -> ${result.status}`);
  }
}

test("doubling both factors accepts paraphrases and spelling, not the wrong claim", () => {
  expectStatus(q10, [
    "No, 6 times 8 is 48 because both factors doubled so the product is 4 times as big.",
    "That is wrong. Doubling both makes it four times bigger. 12 times 4 is 48.",
    "Not right. 6 × 8 = 48, not 24.",
    "thats not rite. 6x8=48 becuz both faktors dubled so it gets 4 times bigger.",
    "Its rong. Six times eight equals forty eight, not twenty four. You multiply by four.",
    "No the student doubled the product but should have made it 4 times 12 which is 48.",
  ], "match");
  expectStatus(q10, [
    "I am not sure yet.",
    "No that is not how it works.",
    "The answer is 48.",
    "Yes, but 6 times 8 is 48.",
    "It is wrong.",
    "You have to double it.",
  ], "review");
  expectStatus(q10, [
    "Yes, 6 times 8 is 24 because you double 12.",
    "It is right. Doubling both factors doubles the product so it is 24.",
    "No, 6 times 8 is 36.",
    "No, the answer is 12.",
    "6 times 8 is not 48. It is 24.",
    "Yes it is correct that 6 × 8 = 24.",
  ], "mismatch");
});

test("notebook price accepts divide or multiply reasoning and rejects another price", () => {
  expectStatus(q18, [
    "Each notebook costs 5 dollars because 40 divided by 8 is 5.",
    "One costs $5. I did 40 ÷ 8.",
    "Its 5 dolars. 8 times 5 is 40.",
    "five dollars each since 40 split into 8.",
    "One notebook is five dollars because I divided forty by eight.",
  ], "match");
  expectStatus(q18, [
    "I divided 40 by 8.",
    "The notebooks cost the same amount.",
    "They cost 40 dollars altogether.",
    "I used division.",
  ], "review");
  expectStatus(q18, [
    "Each notebook costs 8 dollars.",
    "One notebook is $4 because 40 minus 8.",
    "Each costs 40 dollars.",
    "It is not 5 dollars. Each one costs 8.",
    "40 times 8 is 320 so each notebook costs 320 dollars.",
  ], "mismatch");
});

test("using 2 times 8 accepts doubling 16 and rejects a different product", () => {
  expectStatus(q24, [
    "Double 16 to get 32 because 4 is twice 2.",
    "4 × 8 = 32. I doubled 16.",
    "Since 4 is double 2, double 16. Thats 32.",
    "dubble 16 and you get 32 because four is two times two.",
    "I added 16 and 16 to get thirty two.",
  ], "match");
  expectStatus(q24, [
    "Double 16.",
    "The answer is 32.",
    "4 times 8 is 32.",
    "Use the fact you know about doubling.",
  ], "review");
  expectStatus(q24, [
    "4 × 8 = 16 because it is the same product.",
    "Double both numbers so 4 times 16 is 64.",
    "Add 8 to get 24.",
    "Do not double 16. 4 times 8 is 16.",
    "Double 16 and you get 18.",
  ], "mismatch");
});

test("a saved sentence is checked without changing the 21 point score", () => {
  let state = blankState();
  for (const question of QUESTIONS) {
    if (question.kind === "written") continue;
    state = recordFirstAnswer(state, question, question.answer).state;
  }
  state = recordFirstAnswer(state, q10, "I am not sure yet.").state;
  const before = JSON.stringify(state);
  const checked = checkWrittenIdea(q10, state.answers.q10.value);
  assert.equal(checked.status, "review");
  assert.equal(JSON.stringify(state), before);
  assert.equal(scoreState(state, QUESTIONS).correct, 21);
  assert.equal(scoreState(state, QUESTIONS).total, 21);
});
