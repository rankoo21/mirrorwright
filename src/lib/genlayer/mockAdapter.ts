import type {
  Answer,
  AskInput,
  AskResult,
  CorrectInput,
  CorrectResult,
  FeedFragmentInput,
  FeedResult,
  Fragment,
  Mirror,
  MirrorAdapter,
  Persona,
} from "./types";
import { makeId, mockTxHash } from "@/utils/format";
import {
  applyDecision,
  deriveClarity,
  deriveState,
  readFragment,
  speakInVoice,
} from "@/utils/personaState";
import { SEED_FRAGMENTS, CONTRADICTORY_FRAGMENT } from "@/data/mockFragments";
import { SEED_ANSWERS } from "@/data/mockAnswers";

const MOCK_OWNER = "0xMirrorwright_demo_self_000000000";

function emptyPersona(): Persona {
  return {
    tone: "",
    cadence: "",
    recurringThemes: [],
    valueAnchors: [],
    lockedTraits: [],
    heldContradictions: [],
    clarity: 0,
  };
}

// In-memory store mirroring what the contract would hold authoritatively, with
// localStorage persistence so the reflection survives a refresh.
interface PersistShape {
  mirror: Mirror | null;
  fragments: Record<string, Fragment>;
  answers: Record<string, Answer>;
  coherenceSum: number;
  counts: Record<string, number>;
  seeded: boolean;
}

const STORAGE_KEY = "mirrorwright.mock.v1";

class MockStore {
  mirror: Mirror | null = null;
  fragments = new Map<string, Fragment>();
  answers = new Map<string, Answer>();
  coherenceSum = 0;
  counts: Record<string, number> = {};
  seeded = false;

  load() {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const data = JSON.parse(raw) as PersistShape;
      this.mirror = data.mirror;
      this.fragments = new Map(Object.entries(data.fragments ?? {}));
      this.answers = new Map(Object.entries(data.answers ?? {}));
      this.coherenceSum = data.coherenceSum ?? 0;
      this.counts = data.counts ?? {};
      this.seeded = data.seeded ?? false;
    } catch {
      // Corrupt cache, ignore and start fresh.
    }
  }

  save() {
    if (typeof window === "undefined") return;
    const shape: PersistShape = {
      mirror: this.mirror,
      fragments: Object.fromEntries(this.fragments),
      answers: Object.fromEntries(this.answers),
      coherenceSum: this.coherenceSum,
      counts: this.counts,
      seeded: this.seeded,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(shape));
  }
}

const store = new MockStore();
let loaded = false;

function ensureLoaded() {
  if (loaded) return;
  loaded = true;
  store.load();
}

// Small artificial latency so transitions feel physical, like glass settling.
function delay<T>(value: T, ms = 520): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function newMirror(): Mirror {
  return {
    id: makeId("mirror"),
    owner: MOCK_OWNER,
    createdAt: Date.now(),
    state: "dim",
    fragmentIds: [],
    answerIds: [],
    fragmentCount: 0,
    answerCount: 0,
    persona: emptyPersona(),
  };
}

// Apply a fragment to the live mirror, returning the relation/coherence so the
// demo seeding and the public API share one path.
function applyFragmentInternal(text: string, kind: Fragment["kind"], createdAt: number) {
  const mirror = store.mirror!;
  const decision = readFragment(text, mirror.persona);

  const { persona, counts } = applyDecision(mirror.persona, decision, store.counts);
  store.counts = counts;
  mirror.persona = persona;

  if (decision.relation === "contradicts") {
    const short = text.length <= 120 ? text : text.slice(0, 120);
    if (!mirror.persona.heldContradictions.includes(short) && mirror.persona.heldContradictions.length < 8) {
      mirror.persona.heldContradictions.push(short);
    }
  }

  const id = makeId("fragment");
  const fragment: Fragment = {
    id,
    mirrorId: mirror.id,
    text,
    kind,
    relation: decision.relation,
    createdAt,
  };
  store.fragments.set(id, fragment);
  mirror.fragmentIds.push(id);
  mirror.fragmentCount += 1;
  store.coherenceSum += decision.coherence;

  mirror.persona.clarity = deriveClarity(mirror.persona, mirror.fragmentCount, store.coherenceSum);
  mirror.state = deriveState(mirror.persona, mirror.fragmentCount);

  return { fragment, decision };
}

export class MockAdapter implements MirrorAdapter {
  readonly mode = "mock" as const;

  constructor() {
    ensureLoaded();
  }

  getIdentityAddress(): string | null {
    return MOCK_OWNER;
  }

  isUsingWallet(): boolean {
    return false;
  }

  async openMirror(): Promise<Mirror> {
    ensureLoaded();
    if (!store.mirror) {
      store.mirror = newMirror();
      store.save();
    }
    return delay(structuredCloneSafe(store.mirror), 200);
  }

  async feedFragment(input: FeedFragmentInput): Promise<FeedResult> {
    if (!store.mirror) store.mirror = newMirror();
    const text = input.text.trim();
    if (text.length < 8) {
      throw new Error("The glass needs a fragment before it can resolve.");
    }
    const decisionBefore = readFragment(text, store.mirror.persona);
    if (decisionBefore.contradictsLocked) {
      throw new Error("This contradicts a locked trait; offer it as a correction instead.");
    }

    const { fragment, decision } = applyFragmentInternal(text, input.kind, Date.now());
    store.save();

    const note =
      decision.relation === "contradicts"
        ? "A shard settled, but it does not yet cohere. It will be held."
        : decision.relation === "coheres"
        ? "A shard settled. The reflection deepened."
        : "A shard settled and extended the reflection.";

    return delay({
      mirrorId: store.mirror.id,
      fragmentId: fragment.id,
      relation: decision.relation,
      coherence: decision.coherence,
      state: store.mirror.state,
      clarity: store.mirror.persona.clarity,
      note,
    });
  }

  async ask(input: AskInput): Promise<AskResult> {
    if (!store.mirror) throw new Error("No mirror is forming here yet.");
    const question = input.question.trim();
    if (question.length < 3) throw new Error("Speak a question into the glass first.");
    if (store.mirror.fragmentCount === 0 || store.mirror.persona.clarity < 10) {
      throw new Error("The reflection is too dim to answer yet.");
    }

    const spoken = speakInVoice(question, store.mirror.persona);
    const id = makeId("answer");
    const answer: Answer = {
      id,
      mirrorId: store.mirror.id,
      question,
      text: spoken.answer,
      drawnFrom: spoken.drawnFrom,
      heldBack: spoken.heldBack,
      stance: spoken.stance,
      createdAt: Date.now(),
      mockTxHash: mockTxHash(),
    };
    store.answers.set(id, answer);
    store.mirror.answerIds.push(id);
    store.mirror.answerCount += 1;
    store.save();

    return delay({
      mirrorId: store.mirror.id,
      answerId: id,
      question,
      answer: answer.text,
      stance: answer.stance,
      drawnFrom: answer.drawnFrom,
      heldBack: answer.heldBack,
      note: "It answered in your voice.",
    });
  }

  async correct(input: CorrectInput): Promise<CorrectResult> {
    if (!store.mirror) throw new Error("No mirror is forming here yet.");
    const text = input.correctionText.trim();
    if (text.length < 8) throw new Error("The glass needs a fragment before it can resolve.");

    const target = input.targetTrait.trim().toLowerCase();
    let dimmed = false;
    if (target && store.counts[target] !== undefined) {
      delete store.counts[target];
      dimmed = true;
    }
    // Clear any held contradiction the target matches.
    store.mirror.persona.heldContradictions = store.mirror.persona.heldContradictions.filter(
      (h) => target === "" || !h.toLowerCase().includes(target),
    );

    const { fragment, decision } = applyFragmentInternal(text, "correction", Date.now());
    store.save();

    return delay({
      mirrorId: store.mirror.id,
      fragmentId: fragment.id,
      dimmedTrait: dimmed ? target : "",
      relation: decision.relation,
      state: store.mirror.state,
      clarity: store.mirror.persona.clarity,
      note: "This shard dimmed. The reflection reshaped.",
    });
  }

  async getMirror(): Promise<Mirror | null> {
    ensureLoaded();
    return delay(store.mirror ? structuredCloneSafe(store.mirror) : null, 60);
  }

  async getMyMirror(): Promise<Mirror | null> {
    return this.getMirror();
  }

  async getPersona(): Promise<Persona | null> {
    ensureLoaded();
    return delay(store.mirror ? { ...store.mirror.persona } : null, 60);
  }

  async getFragments(): Promise<Fragment[]> {
    ensureLoaded();
    if (!store.mirror) return delay([], 60);
    const list = store.mirror.fragmentIds
      .map((id) => store.fragments.get(id))
      .filter((f): f is Fragment => Boolean(f))
      .sort((a, b) => b.createdAt - a.createdAt);
    return delay(list, 60);
  }

  async getAnswers(): Promise<Answer[]> {
    ensureLoaded();
    if (!store.mirror) return delay([], 60);
    const list = store.mirror.answerIds
      .map((id) => store.answers.get(id))
      .filter((a): a is Answer => Boolean(a))
      .sort((a, b) => b.createdAt - a.createdAt);
    return delay(list, 60);
  }

  // Seed a coherent demo persona so a first-time visitor sees the silhouette
  // resolve, a held contradiction, and example answers without typing anything.
  seedDemo(): void {
    ensureLoaded();
    if (store.seeded) return;
    store.mirror = newMirror();
    store.coherenceSum = 0;
    store.counts = {};

    let t = Date.now() - 1000 * 60 * 60 * 6;
    for (const frag of SEED_FRAGMENTS) {
      t += 1000 * 60 * 30;
      applyFragmentInternal(frag.text, frag.kind, t);
    }
    // The contradictory fragment becomes a held contradiction.
    t += 1000 * 60 * 30;
    applyFragmentInternal(CONTRADICTORY_FRAGMENT.text, CONTRADICTORY_FRAGMENT.kind, t);

    // Pre-populate The Depths with example answers.
    for (const a of SEED_ANSWERS) {
      t += 1000 * 60 * 15;
      const id = makeId("answer");
      const answer: Answer = {
        id,
        mirrorId: store.mirror.id,
        question: a.question,
        text: a.text,
        drawnFrom: a.drawnFrom,
        heldBack: a.heldBack,
        stance: a.stance,
        createdAt: t,
        mockTxHash: mockTxHash(),
      };
      store.answers.set(id, answer);
      store.mirror.answerIds.push(id);
      store.mirror.answerCount += 1;
    }

    store.seeded = true;
    store.save();
  }

  resetDemo(): void {
    store.mirror = null;
    store.fragments.clear();
    store.answers.clear();
    store.coherenceSum = 0;
    store.counts = {};
    store.seeded = false;
    if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
    loaded = false;
  }
}

// structuredClone is not available in every target; fall back to JSON.
function structuredCloneSafe<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}
