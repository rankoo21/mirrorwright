import { create } from "zustand";
import { getAdapter } from "@/lib/genlayer";
import type {
  Answer,
  AskResult,
  CorrectResult,
  FeedResult,
  Fragment,
  FragmentKind,
  Mirror,
  MirrorState,
} from "@/lib/genlayer/types";

// The six modes of the single reflective surface. These are not pages; they are
// aspects of one mirror reached by The Tilt.
export type SurfaceMode =
  | "dim" // The Dim Glass (entry)
  | "feeding" // The Feeding
  | "resolve" // The Resolve
  | "speaking" // The Speaking
  | "correction" // The Correction
  | "depths"; // The Depths

export const MODE_ORDER: SurfaceMode[] = [
  "dim",
  "feeding",
  "resolve",
  "speaking",
  "correction",
  "depths",
];

export interface MotionPrefs {
  reducedMotion: boolean;
}

interface MirrorStoreState {
  // identity / connection (The Breath)
  mode: "mock" | "contract";
  identityAddress: string | null;
  breathed: boolean; // has the user breathed on the glass to connect
  connecting: boolean;
  usingWallet: boolean;

  // the reflective surface
  surface: SurfaceMode;
  previousSurface: SurfaceMode;

  // domain data
  mirror: Mirror | null;
  fragments: Fragment[];
  answers: Answer[];
  liveAnswer: AskResult | null; // the single answer currently held on the glass
  contestedTrait: string | null; // the shard being corrected

  // status
  busy: boolean;
  busyLabel: string;
  notice: string | null;
  error: string | null;
  ready: boolean;

  // actions
  init: () => Promise<void>;
  breatheOnGlass: () => Promise<void>;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  setSurface: (mode: SurfaceMode) => void;
  tiltTo: (mode: SurfaceMode) => void;
  feed: (text: string, kind: FragmentKind) => Promise<FeedResult | null>;
  askMirror: (question: string) => Promise<AskResult | null>;
  beginCorrection: (trait: string | null) => void;
  offerCorrection: (targetTrait: string, text: string) => Promise<CorrectResult | null>;
  letItSink: () => void;
  refresh: () => Promise<void>;
  clearNotice: () => void;
  resetMirror: () => Promise<void>;
}

function deriveSurfaceFromState(state: MirrorState): SurfaceMode {
  switch (state) {
    case "dim":
      return "feeding";
    case "forming":
      return "resolve";
    case "resolved":
      return "speaking";
    case "contested":
      return "correction";
    default:
      return "feeding";
  }
}

export const useMirrorStore = create<MirrorStoreState>((set, get) => ({
  mode: "mock",
  identityAddress: null,
  breathed: false,
  connecting: false,
  usingWallet: false,

  surface: "dim",
  previousSurface: "dim",

  mirror: null,
  fragments: [],
  answers: [],
  liveAnswer: null,
  contestedTrait: null,

  busy: false,
  busyLabel: "",
  notice: null,
  error: null,
  ready: false,

  init: async () => {
    const adapter = getAdapter();
    // In mock mode, seed the demo persona so the first arrival sees the
    // silhouette already resolving.
    if (adapter.mode === "mock" && adapter.seedDemo) {
      adapter.seedDemo();
    }
    set({ mode: adapter.mode });

    // Mock mode is offline; we can read immediately. In contract mode the room
    // still renders and reads work without a wallet (viewing existing
    // reflections needs no identity). Writing waits for a wallet connection.
    if (adapter.mode === "mock") {
      const mirror = await adapter.getMyMirror();
      const fragments = mirror ? await adapter.getFragments(mirror.id) : [];
      const answers = mirror ? await adapter.getAnswers(mirror.id) : [];
      set({
        mirror,
        fragments,
        answers,
        identityAddress: adapter.getIdentityAddress(),
        ready: true,
      });
    } else {
      set({ ready: true });
    }
  },

  breatheOnGlass: async () => {
    const adapter = getAdapter();
    // Contract mode: the only path to an identity is a real browser wallet.
    if (adapter.mode === "contract") {
      await get().connectWallet();
      return;
    }
    // Mock mode: the reflection forms fully offline, no wallet involved.
    set({ connecting: true, error: null });
    try {
      const address = adapter.getIdentityAddress();
      let mirror = await adapter.getMyMirror();
      if (!mirror) {
        set({ busy: true, busyLabel: "The glass is opening" });
        mirror = await adapter.openMirror();
      }
      const fragments = mirror ? await adapter.getFragments(mirror.id) : [];
      const answers = mirror ? await adapter.getAnswers(mirror.id) : [];
      set({
        breathed: true,
        identityAddress: address ?? adapter.getIdentityAddress(),
        usingWallet: false,
        mirror,
        fragments,
        answers,
      });
    } catch (e) {
      set({ error: humanize(e) });
    } finally {
      set({ connecting: false, busy: false, busyLabel: "" });
    }
  },

  connectWallet: async () => {
    const adapter = getAdapter();
    if (!adapter.connectWallet) {
      set({ error: "Wallet connection is only available in contract mode." });
      return;
    }
    set({ connecting: true, error: null });
    try {
      // The Breath: fog the glass, connect the visitor's own wallet. This is
      // the only way to gain an identity and the only way to write.
      await adapter.connectWallet();
      let mirror = await adapter.getMyMirror();
      if (!mirror) {
        set({ busy: true, busyLabel: "The glass is opening" });
        mirror = await adapter.openMirror();
      }
      const fragments = mirror ? await adapter.getFragments(mirror.id) : [];
      const answers = mirror ? await adapter.getAnswers(mirror.id) : [];
      set({
        breathed: true,
        identityAddress: adapter.getIdentityAddress(),
        usingWallet: adapter.isUsingWallet ? adapter.isUsingWallet() : true,
        mirror,
        fragments,
        answers,
      });
    } catch (e) {
      set({ error: humanize(e) });
    } finally {
      set({ connecting: false, busy: false, busyLabel: "" });
    }
  },

  disconnectWallet: () => {
    const adapter = getAdapter();
    if (adapter.disconnectWallet) adapter.disconnectWallet();
    // Drop identity and return to the entry so the user can connect a
    // different wallet cleanly.
    set({
      breathed: false,
      usingWallet: false,
      identityAddress: null,
      mirror: null,
      fragments: [],
      answers: [],
      liveAnswer: null,
      contestedTrait: null,
      surface: "dim",
      notice: null,
      error: null,
    });
  },

  setSurface: (mode) => set((s) => ({ previousSurface: s.surface, surface: mode })),

  tiltTo: (mode) => {
    const current = get().surface;
    if (current === mode) return;
    set({ previousSurface: current, surface: mode, error: null });
  },

  feed: async (text, kind) => {
    const adapter = getAdapter();
    if (!ensureWallet(get, set)) return null;
    const mirror = get().mirror;
    if (!mirror) {
      set({ error: "No mirror is forming here yet." });
      return null;
    }
    set({ busy: true, busyLabel: "The glass is resolving", error: null, notice: null });
    try {
      const result = await adapter.feedFragment({ mirrorId: mirror.id, text, kind });
      await get().refresh();
      set({ notice: result.note });
      return result;
    } catch (e) {
      set({ error: humanize(e) });
      return null;
    } finally {
      set({ busy: false, busyLabel: "" });
    }
  },

  askMirror: async (question) => {
    const adapter = getAdapter();
    if (!ensureWallet(get, set)) return null;
    const mirror = get().mirror;
    if (!mirror) {
      set({ error: "No mirror is forming here yet." });
      return null;
    }
    set({ busy: true, busyLabel: "The reflection is gathering its shards", error: null, notice: null });
    try {
      const result = await adapter.ask({ mirrorId: mirror.id, question });
      await get().refresh();
      set({ liveAnswer: result, notice: result.note });
      return result;
    } catch (e) {
      set({ error: humanize(e) });
      return null;
    } finally {
      set({ busy: false, busyLabel: "" });
    }
  },

  beginCorrection: (trait) => set({ contestedTrait: trait, surface: "correction", previousSurface: get().surface }),

  offerCorrection: async (targetTrait, text) => {
    const adapter = getAdapter();
    if (!ensureWallet(get, set)) return null;
    const mirror = get().mirror;
    if (!mirror) {
      set({ error: "No mirror is forming here yet." });
      return null;
    }
    set({ busy: true, busyLabel: "The reflection is reshaping", error: null, notice: null });
    try {
      const result = await adapter.correct({ mirrorId: mirror.id, targetTrait, correctionText: text });
      await get().refresh();
      set({ notice: result.note, contestedTrait: null });
      return result;
    } catch (e) {
      set({ error: humanize(e) });
      return null;
    } finally {
      set({ busy: false, busyLabel: "" });
    }
  },

  letItSink: () => set({ liveAnswer: null, surface: "depths", previousSurface: get().surface }),

  refresh: async () => {
    const adapter = getAdapter();
    const mirror = await adapter.getMyMirror();
    if (!mirror) {
      set({ mirror: null, fragments: [], answers: [] });
      return;
    }
    const fragments = await adapter.getFragments(mirror.id);
    const answers = await adapter.getAnswers(mirror.id);
    set({ mirror, fragments, answers });
  },

  clearNotice: () => set({ notice: null, error: null }),

  resetMirror: async () => {
    const adapter = getAdapter();
    if (adapter.resetDemo) adapter.resetDemo();
    set({
      mirror: null,
      fragments: [],
      answers: [],
      liveAnswer: null,
      contestedTrait: null,
      surface: "dim",
      breathed: false,
      notice: null,
      error: null,
    });
    await get().init();
  },
}));

// Writing needs a connected wallet. In mock mode there is always an identity,
// so this passes. In contract mode it blocks writes until the visitor connects
// their own browser wallet, surfacing an in-world prompt instead of failing.
function ensureWallet(
  get: () => MirrorStoreState,
  set: (partial: Partial<MirrorStoreState>) => void,
): boolean {
  const adapter = getAdapter();
  if (adapter.mode === "mock") return true;
  const connected = (adapter.isUsingWallet ? adapter.isUsingWallet() : false) || Boolean(get().usingWallet);
  if (!connected) {
    set({ error: "Breathe on the glass with your wallet to do this." });
    return false;
  }
  return true;
}

function humanize(e: unknown): string {
  const raw = String((e as any)?.message ?? e ?? "Something clouded the glass.");
  // Strip the contract's classification prefixes for display.
  const cleaned = raw.replace(/\[EXPECTED\]\s*/g, "").replace(/\[LLM_ERROR\]\s*/g, "");
  // Map known consensus failures to in-world copy.
  if (/could not agree|consensus|no quorum/i.test(cleaned)) {
    return "The mirror could not agree on an answer. Try again.";
  }
  return cleaned.trim() || "Something clouded the glass.";
}

export { deriveSurfaceFromState };
