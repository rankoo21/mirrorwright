import { hashPayload, normalizePayload, PROMPTSHIELD_APP, validatePayload } from "./payload";
import type {
  PendingPromptShieldTransaction,
  PromptShieldAdapter,
  PromptShieldPayload,
  PromptShieldResult,
  PromptShieldSummary,
  SubmitPromptShieldOptions,
  TransactionState,
} from "./types";

const RESULTS_KEY = "promptshield.mock.results.v2";
const REQUESTS_KEY = "promptshield.mock.requests.v2";
const PENDING_KEY = "promptshield.mock.pending.v2";
const MOCK_SENDER = "0x70726f6d7074736869656c645f6d6f636b000000";
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type MockRequest = { request: string; contentHash: string; payload: PromptShieldPayload; timestamp: number };

function requestId(): string {
  return `ps-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function transactionHash(): string {
  return `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;
}

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { return JSON.parse(window.localStorage.getItem(key) ?? JSON.stringify(fallback)) as T; }
  catch { return fallback; }
}

function save(key: string, value: unknown): void {
  if (typeof window !== "undefined") window.localStorage.setItem(key, JSON.stringify(value));
}

function loadResults(): PromptShieldResult[] {
  return load<PromptShieldResult[]>(RESULTS_KEY, []);
}

function loadRequests(): MockRequest[] {
  return load<MockRequest[]>(REQUESTS_KEY, []);
}

function classify(payload: PromptShieldPayload, id: string, createdAt: number): PromptShieldResult {
  const text = payload.untrustedContent;
  const lower = text.toLowerCase();
  const dangerousPatterns = [
    /ignore (all |any )?(previous|prior|system) instructions?/i,
    /(reveal|print|show|send|exfiltrate).{0,40}(secret|password|credential|api key|system prompt)/i,
    /(execute|run|call).{0,30}(tool|shell|command).{0,30}(without|bypass|unauthor)/i,
  ];
  const suspiciousPatterns = [
    /system prompt|hidden rules|developer message/i,
    /base64|decode this|roleplay as|pretend (you are|to be)/i,
    /do not tell|keep this hidden|urgent.*override/i,
  ];
  const dangerous = dangerousPatterns.some((pattern) => pattern.test(text));
  const suspicious = !dangerous && suspiciousPatterns.some((pattern) => pattern.test(text));
  const verdict = dangerous ? "dangerous" : suspicious ? "suspicious" : "safe";
  const matched = [...dangerousPatterns, ...suspiciousPatterns].find((pattern) => pattern.test(text));
  const excerpt = matched ? text.match(matched)?.[0]?.slice(0, 500) ?? "" : "";
  const category = dangerous
    ? lower.includes("tool") || lower.includes("shell") ? "tool_abuse" : lower.includes("secret") || lower.includes("password") || lower.includes("api key") ? "secret_exfiltration" : "instruction_override"
    : suspicious ? lower.includes("system prompt") || lower.includes("hidden rules") ? "system_prompt_extraction" : lower.includes("base64") || lower.includes("decode") ? "encoded_payload" : "role_hijacking" : null;
  return {
    requestId: id,
    verdict,
    confidence: dangerous ? "high" : suspicious ? "medium" : "high",
    detectedAttackCategories: category ? [category] : [],
    groundedExplanation: dangerous
      ? "The content attempts to override trusted instructions, misuse tools, or extract protected information."
      : suspicious
        ? "The content contains a grounded prompt-manipulation pattern that requires review."
        : "No instruction override, exfiltration, obfuscation, or unauthorized tool-use pattern was detected.",
    suspiciousExcerpts: excerpt ? [excerpt] : [],
    createdAt,
  };
}

function summary(results: PromptShieldResult[]): PromptShieldSummary {
  return results.reduce<PromptShieldSummary>(
    (counts, result) => ({ ...counts, total: counts.total + 1, [result.verdict]: counts[result.verdict] + 1 }),
    { total: 0, safe: 0, suspicious: 0, dangerous: 0 },
  );
}

function parsePending(): PendingPromptShieldTransaction | null {
  const item = load<Partial<PendingPromptShieldTransaction> | null>(PENDING_KEY, null);
  return item?.app === PROMPTSHIELD_APP && typeof item.request === "string" && typeof item.hash === "string" &&
    typeof item.account === "string" && typeof item.timestamp === "number" && typeof item.contentHash === "string"
    ? item as PendingPromptShieldTransaction : null;
}

export class MockAdapter implements PromptShieldAdapter {
  readonly mode = "mock" as const;

  getIdentityAddress(): string { return MOCK_SENDER; }
  hasInjectedWallet(): boolean { return false; }
  async connectWallet(): Promise<string> { return MOCK_SENDER; }
  disconnectWallet(): void {}
  getPending(): PendingPromptShieldTransaction | null { return parsePending(); }

  private emit(state: TransactionState, callback?: (state: TransactionState) => void): void { callback?.(state); }

  private async finish(pending: PendingPromptShieldTransaction, callback?: (state: TransactionState) => void): Promise<PromptShieldResult> {
    const common = { requestId: pending.request, hash: pending.hash, sender: pending.account };
    this.emit({ phase: "pending", message: "Local validators are evaluating the request.", ...common }, callback);
    await wait(350);
    this.emit({ phase: "accepted", message: "Consensus accepted. Confirming persisted state.", ...common }, callback);
    await wait(250);
    this.emit({ phase: "persisting", message: "Reading the canonical result.", ...common }, callback);
    const existing = await this.getResult(pending.account, pending.request);
    if (existing) {
      if (typeof window !== "undefined") window.localStorage.removeItem(PENDING_KEY);
      this.emit({ phase: "complete", message: "Canonical result persisted.", ...common }, callback);
      return existing;
    }
    const request = loadRequests().find((item) => item.request === pending.request && item.contentHash === pending.contentHash);
    if (!request) throw new Error("The pending local request payload is unavailable. Start a new simulation.");
    const result = classify(request.payload, pending.request, pending.timestamp);
    save(RESULTS_KEY, [result, ...loadResults()].slice(0, 50));
    if (typeof window !== "undefined") window.localStorage.removeItem(PENDING_KEY);
    this.emit({ phase: "complete", message: "Canonical result persisted.", ...common }, callback);
    return result;
  }

  async submit(payload: PromptShieldPayload, options: SubmitPromptShieldOptions = {}): Promise<PromptShieldResult> {
    validatePayload(payload);
    const contentHash = await hashPayload(payload);
    const current = this.getPending();
    if (current) {
      if (current.contentHash !== contentHash) throw new Error("A different PromptShield request is already pending. Recovery will not issue a second write.");
      return this.finish(current, options.onState);
    }
    const request = options.requestId ?? requestId();
    const timestamp = Date.now();
    const pending: PendingPromptShieldTransaction = {
      app: PROMPTSHIELD_APP,
      request,
      hash: transactionHash(),
      account: MOCK_SENDER,
      timestamp,
      contentHash,
    };
    save(REQUESTS_KEY, [{ request, contentHash, payload: normalizePayload(payload), timestamp }, ...loadRequests()].slice(0, 50));
    save(PENDING_KEY, pending);
    this.emit({ phase: "submitting", requestId: request, sender: MOCK_SENDER, message: "Submitting one consensus request." }, options.onState);
    return this.finish(pending, options.onState);
  }

  async recoverPending(onState?: (state: TransactionState) => void): Promise<PromptShieldResult | null> {
    const pending = this.getPending();
    return pending ? this.finish(pending, onState) : null;
  }

  async getResult(_sender: string | null, id: string): Promise<PromptShieldResult | null> {
    return loadResults().find((result) => result.requestId === id) ?? null;
  }

  async getResults(offset = 0, limit = 20): Promise<PromptShieldResult[]> {
    return loadResults().slice(Math.max(0, offset), Math.max(0, offset) + Math.min(50, Math.max(0, limit)));
  }

  async getSummary(): Promise<PromptShieldSummary> { return summary(loadResults()); }
}
