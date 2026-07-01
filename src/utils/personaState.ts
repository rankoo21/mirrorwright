// Deterministic persona synthesis for mock mode. This mirrors the on-chain
// contract's logic (MirrorwrightContract.feed_fragment / _apply_fragment) so the
// mock reflection resolves the same way the real one would: a local stand-in for
// the validators' agreed decision fields.

import type {
  FragmentRelation,
  MirrorState,
  Persona,
} from "@/lib/genlayer/types";

export const LOCK_THRESHOLD = 2;
export const RESOLVE_THRESHOLD = 60;
export const MAX_LIST_ITEMS = 8;

// Words that hint a fragment conflicts with a slow, patient, questioning self.
const FAST_WORDS = ["quick", "fast", "blurt", "snap", "immediately", "rush", "clean answer", "instant"];
const SLOW_WORDS = ["slow", "patient", "wait", "ask", "listen", "sit", "quiet", "consider", "fear"];

export interface SynthDecision {
  relation: FragmentRelation;
  coherence: number;
  contradictsLocked: boolean;
  traits: string[];
  themes: string[];
  tone: string;
  cadence: string;
}

// A tiny keyword reader standing in for the model. It is deterministic so the
// mock never flickers between runs for the same input.
export function readFragment(text: string, persona: Persona): SynthDecision {
  const lower = text.toLowerCase();
  const fast = FAST_WORDS.some((w) => lower.includes(w));
  const slow = SLOW_WORDS.some((w) => lower.includes(w));

  const traits = extractTraits(lower);
  const themes = extractThemes(lower);

  let relation: FragmentRelation = "extends";
  let coherence = 64;

  const personaIsSlow =
    persona.lockedTraits.some((t) => SLOW_WORDS.some((w) => t.includes(w))) ||
    persona.tone.includes("patient") ||
    persona.cadence.includes("slow");

  if (fast && personaIsSlow) {
    relation = "contradicts";
    coherence = 18;
  } else if (slow && (personaIsSlow || persona.lockedTraits.length === 0)) {
    relation = "coheres";
    coherence = 84;
  } else if (slow) {
    relation = "coheres";
    coherence = 78;
  } else if (fast) {
    relation = "extends";
    coherence = 52;
  }

  const contradictsLocked =
    relation === "contradicts" &&
    persona.lockedTraits.some((t) => SLOW_WORDS.some((w) => t.includes(w)));

  const tone = fast ? "direct" : "patient";
  const cadence = fast ? "quick" : "slow";

  return { relation, coherence, contradictsLocked, traits, themes, tone, cadence };
}

function extractTraits(lower: string): string[] {
  const traits: string[] = [];
  if (lower.includes("slow")) traits.push("slows down");
  if (lower.includes("ask") || lower.includes("question")) traits.push("asks first");
  if (lower.includes("fear") || lower.includes("afraid")) traits.push("names the fear");
  if (lower.includes("listen")) traits.push("listens before speaking");
  if (lower.includes("quick") || lower.includes("fast")) traits.push("decides quickly");
  if (lower.includes("honest") || lower.includes("truth")) traits.push("values honesty");
  if (lower.includes("alone") || lower.includes("solitude")) traits.push("guards solitude");
  if (traits.length === 0) traits.push(firstPhrase(lower));
  return traits.slice(0, 5);
}

function extractThemes(lower: string): string[] {
  const themes: string[] = [];
  if (lower.includes("advice") || lower.includes("decision") || lower.includes("decide")) themes.push("decisions");
  if (lower.includes("fear") || lower.includes("afraid")) themes.push("fear");
  if (lower.includes("work") || lower.includes("build")) themes.push("work");
  if (lower.includes("love") || lower.includes("friend") || lower.includes("people")) themes.push("people");
  if (lower.includes("time") || lower.includes("slow") || lower.includes("wait")) themes.push("time");
  if (themes.length === 0) themes.push("self");
  return themes.slice(0, 5);
}

function firstPhrase(lower: string): string {
  const words = lower.replace(/[^a-z\s]/g, "").trim().split(/\s+/).slice(0, 3);
  return words.join(" ") || "a trait";
}

// Fold a decision into a persona, updating the trait-locking ledger. Returns the
// next persona plus the ledger so callers can persist both.
export function applyDecision(
  persona: Persona,
  decision: SynthDecision,
  counts: Record<string, number>,
): { persona: Persona; counts: Record<string, number> } {
  const next: Persona = {
    ...persona,
    recurringThemes: [...persona.recurringThemes],
    valueAnchors: [...persona.valueAnchors],
    lockedTraits: [...persona.lockedTraits],
    heldContradictions: [...persona.heldContradictions],
  };
  const ledger = { ...counts };

  if (decision.tone) next.tone = decision.tone;
  if (decision.cadence) next.cadence = decision.cadence;

  for (const theme of decision.themes) {
    if (theme && !next.recurringThemes.includes(theme) && next.recurringThemes.length < MAX_LIST_ITEMS) {
      next.recurringThemes.push(theme);
    }
  }

  for (const trait of decision.traits) {
    if (!trait) continue;
    ledger[trait] = (ledger[trait] ?? 0) + 1;
  }

  const locked: string[] = [];
  const anchors: string[] = [];
  for (const [trait, count] of Object.entries(ledger)) {
    if (count >= LOCK_THRESHOLD && locked.length < MAX_LIST_ITEMS) locked.push(trait);
    else if (anchors.length < MAX_LIST_ITEMS) anchors.push(trait);
  }
  next.lockedTraits = locked;
  next.valueAnchors = anchors;

  return { persona: next, counts: ledger };
}

export function deriveClarity(
  persona: Persona,
  fragmentCount: number,
  coherenceSum: number,
): number {
  if (fragmentCount === 0) return 0;
  const locked = persona.lockedTraits.length;
  const held = persona.heldContradictions.length;
  const avg = Math.floor(coherenceSum / fragmentCount);
  let value = Math.floor((avg * 40) / 100) + fragmentCount * 6 + locked * 18 - held * 8;
  if (value < 0) value = 0;
  if (value > 100) value = 100;
  return value;
}

export function deriveState(persona: Persona, fragmentCount: number): MirrorState {
  if (fragmentCount === 0) return "dim";
  if (persona.heldContradictions.length > 0) return "contested";
  if (persona.clarity >= RESOLVE_THRESHOLD && persona.lockedTraits.length >= 1) return "resolved";
  return "forming";
}

// Compose an in-voice answer for mock mode. Stitches persona fragments into a
// sentence that sounds like the owner, not a generic assistant.
export function speakInVoice(
  question: string,
  persona: Persona,
): { answer: string; stance: string; drawnFrom: string[]; heldBack: string } {
  const slow = persona.cadence.includes("slow") || persona.tone.includes("patient");
  const drawnFrom = [...persona.lockedTraits, ...persona.valueAnchors].slice(0, 4);
  const themeWord = persona.recurringThemes[0] ?? "this";

  let answer: string;
  if (slow) {
    answer =
      `Before anything, I would slow down and ask what you are really afraid of underneath ${themeWord}. ` +
      `I will not hand you a clean answer; I would sit in the question with you until the true one surfaces.`;
  } else {
    answer =
      `I trust the first honest instinct. With ${themeWord}, I would say the plain thing quickly, ` +
      `then stay to see what it stirs rather than soften it.`;
  }

  const stance = slow ? "patient" : "direct";
  const heldBack =
    persona.heldContradictions.length > 0
      ? "where two of your fragments still pull against each other"
      : "where the question outran what you have fed me";

  return { answer, stance, drawnFrom, heldBack };
}
