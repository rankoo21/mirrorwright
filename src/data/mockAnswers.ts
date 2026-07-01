// A couple of example in-voice answers, used to pre-populate The Depths for the
// demo so a returning visitor sees past exchanges suspended in the pool.

export interface SeedAnswer {
  question: string;
  text: string;
  stance: string;
  drawnFrom: string[];
  heldBack: string;
}

export const SEED_ANSWERS: SeedAnswer[] = [
  {
    question: "How should I make a decision I am afraid of?",
    text:
      "Before anything, I would slow down and ask what you are really afraid of underneath the choice. I will not hand you a clean answer; I would sit in the question with you until the true one surfaces.",
    stance: "patient",
    drawnFrom: ["slows down", "asks first", "names the fear"],
    heldBack: "where the fear is still unnamed",
  },
  {
    question: "Should I say the hard thing or keep the peace?",
    text:
      "Say the hard thing, but slowly, and only after you understand what the peace was protecting. I would rather be honest late than smooth and false.",
    stance: "patient",
    drawnFrom: ["values honesty", "slows down"],
    heldBack: "where honesty might cost more than you can pay today",
  },
];

// One example correction for the demo: the owner amends a fast-blurting shard.
export const EXAMPLE_CORRECTION = {
  targetTrait: "decides quickly",
  correctionText:
    "That is not really me. Even when I seem fast, I have already been turning it over slowly for a long time.",
};
