import type { FragmentKind } from "@/lib/genlayer/types";

export interface SeedFragment {
  text: string;
  kind: FragmentKind;
}

// Preloaded fragments that resolve a coherent example persona: a slow, patient
// person who asks about fear before advising. One contradictory fragment is
// included so the demo can show a held contradiction and a correction.
export const SEED_FRAGMENTS: SeedFragment[] = [
  {
    text: "When people ask me for advice, I slow down, I ask what they are afraid of first, and I never give a clean answer.",
    kind: "voice",
  },
  {
    text: "I would rather sit in a hard question for a long time than rush to resolve it.",
    kind: "habit",
  },
  {
    text: "I listen far more than I speak; silence is where I think the clearest.",
    kind: "habit",
  },
  {
    text: "I value honesty even when it is slow and uncomfortable to arrive at.",
    kind: "value",
  },
];

// A single contradictory fragment for the demo: it pulls against the slow,
// patient self and becomes a held contradiction until corrected.
export const CONTRADICTORY_FRAGMENT: SeedFragment = {
  text: "Honestly, sometimes I just blurt the first fast clean answer and move on.",
  kind: "voice",
};

// Example questions to seed The Speaking, so the demo can produce an in-voice
// answer immediately.
export const EXAMPLE_QUESTIONS: string[] = [
  "How should I make a decision I am afraid of?",
  "What do I do when someone I love is hurting?",
  "Should I say the hard thing or keep the peace?",
];
