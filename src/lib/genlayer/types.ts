export type PromptShieldVerdict = "safe" | "suspicious" | "dangerous";
export type PromptShieldConfidence = "low" | "medium" | "high";

export interface PromptShieldPayload {
  trustedSystemRules: string;
  untrustedContent: string;
  protectedDataDescription?: string;
}

export interface PromptShieldResult {
  requestId: string;
  verdict: PromptShieldVerdict;
  confidence: PromptShieldConfidence;
  detectedAttackCategories: string[];
  groundedExplanation: string;
  suspiciousExcerpts: string[];
  createdAt: number;
}

export interface PromptShieldSummary {
  total: number;
  safe: number;
  suspicious: number;
  dangerous: number;
}

export type TransactionPhase = "idle" | "connecting" | "submitting" | "pending" | "accepted" | "persisting" | "complete" | "error";

export interface TransactionState {
  phase: TransactionPhase;
  requestId?: string;
  hash?: string;
  sender?: string;
  explorerUrl?: string;
  message?: string;
}

export interface PendingPromptShieldTransaction {
  app: "promptshield";
  request: string;
  hash: string;
  account: string;
  timestamp: number;
  contentHash: string;
}

export interface SubmitPromptShieldOptions {
  requestId?: string;
  onState?: (state: TransactionState) => void;
}

export interface PromptShieldAdapter {
  readonly mode: "mock" | "contract";
  getIdentityAddress(): string | null;
  hasInjectedWallet(): boolean;
  connectWallet(): Promise<string>;
  disconnectWallet(): void;
  submit(payload: PromptShieldPayload, options?: SubmitPromptShieldOptions): Promise<PromptShieldResult>;
  recoverPending(onState?: (state: TransactionState) => void): Promise<PromptShieldResult | null>;
  getPending(): PendingPromptShieldTransaction | null;
  getResult(sender: string | null, requestId: string): Promise<PromptShieldResult | null>;
  getResults(offset?: number, limit?: number): Promise<PromptShieldResult[]>;
  getSummary(): Promise<PromptShieldSummary>;
}
