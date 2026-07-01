// Shared data models for Mirrorwright.
// These types are the contract between the UI, the store, and any GenLayer
// adapter (mock today, real on-chain tomorrow). Keep them stable.

// Reflection clarity state machine.
export type MirrorState = "dim" | "forming" | "resolved" | "contested";

export type FragmentKind =
  | "belief"
  | "habit"
  | "voice"
  | "value"
  | "memory"
  | "unspecified"
  | "correction";

export type FragmentRelation = "coheres" | "extends" | "contradicts";

// The persona fingerprint: compact clamped fields, never raw model prose.
export interface Persona {
  tone: string;
  cadence: string;
  recurringThemes: string[];
  valueAnchors: string[];
  lockedTraits: string[];
  heldContradictions: string[];
  clarity: number; // 0..100
}

export interface Fragment {
  id: string;
  mirrorId: string;
  text: string;
  kind: FragmentKind;
  relation: FragmentRelation;
  createdAt: number;
}

export interface Answer {
  id: string;
  mirrorId: string;
  question: string;
  text: string;
  drawnFrom: string[];
  heldBack: string;
  stance: string;
  createdAt: number;
  mockTxHash: string;
}

export interface Mirror {
  id: string;
  owner: string;
  createdAt: number;
  state: MirrorState;
  fragmentIds: string[];
  answerIds: string[];
  fragmentCount: number;
  answerCount: number;
  persona: Persona;
}

// Result returned by feeding a fragment.
export interface FeedResult {
  mirrorId: string;
  fragmentId: string;
  relation: FragmentRelation;
  coherence: number;
  state: MirrorState;
  clarity: number;
  note: string;
}

// Result returned by asking the mirror.
export interface AskResult {
  mirrorId: string;
  answerId: string;
  question: string;
  answer: string;
  stance: string;
  drawnFrom: string[];
  heldBack: string;
  note: string;
}

// Result returned by a correction.
export interface CorrectResult {
  mirrorId: string;
  fragmentId: string;
  dimmedTrait: string;
  relation: FragmentRelation;
  state: MirrorState;
  clarity: number;
  note: string;
}

export interface FeedFragmentInput {
  mirrorId: string;
  text: string;
  kind: FragmentKind;
}

export interface AskInput {
  mirrorId: string;
  question: string;
}

export interface CorrectInput {
  mirrorId: string;
  targetTrait: string;
  correctionText: string;
}

// The adapter interface. mockAdapter and contractAdapter both implement this so
// the UI never knows or cares which one is live.
export interface MirrorAdapter {
  readonly mode: "mock" | "contract";
  // Address of the active identity. In contract mode this is the connected
  // wallet address, or null when no wallet is connected; in mock mode a
  // synthetic address.
  getIdentityAddress(): string | null;
  // Optional browser-wallet support (contract mode only).
  hasInjectedWallet?(): boolean;
  connectWallet?(): Promise<string>;
  disconnectWallet?(): void;
  isUsingWallet?(): boolean;

  openMirror(): Promise<Mirror>;
  feedFragment(input: FeedFragmentInput): Promise<FeedResult>;
  ask(input: AskInput): Promise<AskResult>;
  correct(input: CorrectInput): Promise<CorrectResult>;
  getMirror(mirrorId: string): Promise<Mirror | null>;
  getMyMirror(): Promise<Mirror | null>;
  getPersona(mirrorId: string): Promise<Persona | null>;
  getFragments(mirrorId: string): Promise<Fragment[]>;
  getAnswers(mirrorId: string): Promise<Answer[]>;

  // Mock-only demo helpers. Real adapter leaves these undefined.
  seedDemo?(): void;
  resetDemo?(): void;
}
