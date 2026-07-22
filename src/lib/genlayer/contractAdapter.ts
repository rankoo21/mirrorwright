import { createAccount, createClient, generatePrivateKey } from "genlayer-js";
import { localnet, studionet, testnetBradbury } from "genlayer-js/chains";
import { ExecutionResult, TransactionStatus, type Hash } from "genlayer-js/types";
import { hashPayload, PROMPTSHIELD_APP, serializePayload, validatePayload } from "./payload";
import type {
  PendingPromptShieldTransaction,
  PromptShieldAdapter,
  PromptShieldConfidence,
  PromptShieldPayload,
  PromptShieldResult,
  PromptShieldSummary,
  PromptShieldVerdict,
  SubmitPromptShieldOptions,
  TransactionState,
} from "./types";

const PENDING_KEY = "promptshield.contract.pending.v2";
const ACCEPTED = TransactionStatus.ACCEPTED;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
type AnyClient = ReturnType<typeof createClient>;

type ReceiptLike = {
  txExecutionResultName?: string;
  consensus_data?: {
    leader_receipt?: Array<{ execution_result?: string; error?: string | null }>;
  };
};

export interface ContractAdapterConfig {
  contractAddress: string;
  network?: string;
}

function pickChain(network = "studionet") {
  switch (network.toLowerCase()) {
    case "bradbury":
    case "testnet-bradbury":
    case "testnetbradbury":
      return testnetBradbury;
    case "localnet":
      return localnet;
    default:
      return studionet;
  }
}

function networkName(network = "studionet"): "studionet" | "testnetBradbury" | "localnet" {
  if (network.toLowerCase() === "localnet") return "localnet";
  return /bradbury/i.test(network) ? "testnetBradbury" : "studionet";
}

function toPlain(value: unknown): any {
  if (value instanceof Map) return Object.fromEntries(Array.from(value.entries(), ([key, item]) => [String(key), toPlain(item)]));
  if (Array.isArray(value)) return value.map(toPlain);
  if (typeof value === "bigint") return Number(value);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toPlain(item)]));
  return value;
}

function normalizeResult(value: unknown): PromptShieldResult | null {
  const item = toPlain(value);
  if (!item || typeof item !== "object" || !item.request_id) return null;
  const verdict = String(item.verdict) as PromptShieldVerdict;
  const confidence = String(item.confidence) as PromptShieldConfidence;
  if (!["safe", "suspicious", "dangerous"].includes(verdict) || !["low", "medium", "high"].includes(confidence)) return null;
  return {
    requestId: String(item.request_id),
    verdict,
    confidence,
    detectedAttackCategories: Array.isArray(item.detected_attack_categories) ? item.detected_attack_categories.map(String) : [],
    groundedExplanation: String(item.grounded_explanation ?? ""),
    suspiciousExcerpts: Array.isArray(item.suspicious_excerpts) ? item.suspicious_excerpts.map(String) : [],
    createdAt: Number(item.created_at ?? 0),
  };
}

function makeRequestId(): string {
  return `ps-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function parsePending(raw: string | null): PendingPromptShieldTransaction | null {
  if (!raw) return null;
  try {
    const item = JSON.parse(raw) as Partial<PendingPromptShieldTransaction>;
    if (item.app !== PROMPTSHIELD_APP || typeof item.request !== "string" || typeof item.hash !== "string" ||
      typeof item.account !== "string" || typeof item.timestamp !== "number" || typeof item.contentHash !== "string") return null;
    return item as PendingPromptShieldTransaction;
  } catch {
    return null;
  }
}

function receiptError(receipt: unknown): string | null {
  const item = toPlain(receipt) as ReceiptLike;
  const leaders = item?.consensus_data?.leader_receipt ?? [];
  const failed = leaders.find((leader) => leader.execution_result === ExecutionResult.FINISHED_WITH_ERROR || Boolean(leader.error));
  if (failed) return failed.error?.trim() || "The contract execution finished with an error.";
  if (item?.txExecutionResultName === ExecutionResult.FINISHED_WITH_ERROR) return "The contract execution finished with an error.";
  return null;
}

export class ContractAdapter implements PromptShieldAdapter {
  readonly mode = "contract" as const;
  private readonly config: ContractAdapterConfig;
  private readonly chain: ReturnType<typeof pickChain>;
  private readClient: AnyClient | null = null;
  private walletClient: AnyClient | null = null;
  private walletAddress: string | null = null;

  constructor(config: ContractAdapterConfig) {
    this.config = config;
    this.chain = pickChain(config.network);
  }

  private get address(): `0x${string}` {
    return this.config.contractAddress as `0x${string}`;
  }

  private getReadClient(): AnyClient {
    if (!this.readClient) this.readClient = createClient({ chain: this.chain, account: createAccount(generatePrivateKey()) });
    return this.readClient;
  }

  hasInjectedWallet(): boolean {
    return typeof window !== "undefined" && Boolean((window as Window & { ethereum?: unknown }).ethereum);
  }

  async connectWallet(): Promise<string> {
    if (typeof window === "undefined") throw new Error("Wallet connection is only available in the browser.");
    const ethereum = (window as Window & { ethereum?: { request(args: { method: string }): Promise<string[]> } }).ethereum;
    if (!ethereum) throw new Error("No browser wallet found. Install MetaMask with the GenLayer Snap.");
    let accounts: string[];
    try {
      accounts = await ethereum.request({ method: "eth_requestAccounts" });
    } catch (error: any) {
      if (error?.code === 4001) throw new Error("Wallet connection was rejected.");
      throw new Error("Could not connect to the browser wallet.");
    }
    const selected = accounts[0];
    if (!selected) throw new Error("The wallet returned no account.");
    const client = createClient({ chain: this.chain, account: selected as `0x${string}` });
    await client.connect(networkName(this.config.network));
    this.walletClient = client;
    this.walletAddress = selected;
    return selected;
  }

  disconnectWallet(): void {
    this.walletClient = null;
    this.walletAddress = null;
  }

  getIdentityAddress(): string | null {
    return this.walletAddress;
  }

  getPending(): PendingPromptShieldTransaction | null {
    if (typeof window === "undefined") return null;
    return parsePending(window.localStorage.getItem(PENDING_KEY));
  }

  private savePending(pending: PendingPromptShieldTransaction): void {
    if (typeof window !== "undefined") window.localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  }

  private clearPending(): void {
    if (typeof window !== "undefined") window.localStorage.removeItem(PENDING_KEY);
  }

  private explorerUrl(hash: string): string | undefined {
    const base = this.chain.blockExplorers?.default.url?.replace(/\/$/, "");
    return base ? `${base}/tx/${hash}` : undefined;
  }

  private state(pending: PendingPromptShieldTransaction, phase: TransactionState["phase"], message: string): TransactionState {
    return { phase, message, requestId: pending.request, hash: pending.hash, sender: pending.account, explorerUrl: this.explorerUrl(pending.hash) };
  }

  private async read<T>(functionName: string, args: unknown[] = []): Promise<T> {
    const value = await this.getReadClient().readContract({ address: this.address, functionName, args: args as any });
    return toPlain(value) as T;
  }

  private async waitForPersisted(pending: PendingPromptShieldTransaction, onState?: (state: TransactionState) => void): Promise<PromptShieldResult> {
    onState?.(this.state(pending, "pending", "Waiting for validator consensus."));
    const receipt = await (this.walletClient ?? this.getReadClient()).waitForTransactionReceipt({
      hash: pending.hash as Hash,
      status: ACCEPTED,
      interval: 5000,
      retries: 180,
    });
    const failure = receiptError(receipt);
    if (failure) {
      this.clearPending();
      throw new Error(failure);
    }
    onState?.(this.state(pending, "accepted", "Transaction accepted. Verifying canonical state."));
    onState?.(this.state(pending, "persisting", "Polling the contract for the persisted result."));
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const result = await this.getResult(pending.account, pending.request);
      if (result) {
        this.clearPending();
        onState?.(this.state(pending, "complete", "Canonical result persisted."));
        return result;
      }
      await sleep(3000);
    }
    throw new Error("Consensus was accepted, but the canonical result is not readable yet. Recovery will resume on reload.");
  }

  async submit(payload: PromptShieldPayload, options: SubmitPromptShieldOptions = {}): Promise<PromptShieldResult> {
    validatePayload(payload);
    const contentHash = await hashPayload(payload);
    if (!this.walletClient || !this.walletAddress) {
      options.onState?.({ phase: "connecting", message: "Connect a wallet before submitting." });
      await this.connectWallet();
    }
    const account = this.walletAddress!;
    const existing = this.getPending();
    if (existing) {
      if (existing.account.toLowerCase() !== account.toLowerCase()) throw new Error("A pending PromptShield request belongs to a different wallet account.");
      if (existing.contentHash !== contentHash) throw new Error("A different PromptShield request is already pending. Recovery will not issue a second write.");
      return this.waitForPersisted(existing, options.onState);
    }
    const request = options.requestId ?? makeRequestId();
    const timestamp = Date.now();
    options.onState?.({ phase: "submitting", requestId: request, sender: account, message: "Submitting exactly one contract write." });

    // This is intentionally the adapter's only writeContract call. Recovery
    // always resumes from the stored hash and never resubmits the transaction.
    const hash = await this.walletClient!.writeContract({
      address: this.address,
      functionName: "submit_check",
      args: [request, serializePayload(payload), timestamp] as any,
      value: 0n,
    });
    const pending: PendingPromptShieldTransaction = {
      app: PROMPTSHIELD_APP,
      request,
      hash: String(hash),
      account,
      timestamp,
      contentHash,
    };
    this.savePending(pending);
    return this.waitForPersisted(pending, options.onState);
  }

  async recoverPending(onState?: (state: TransactionState) => void): Promise<PromptShieldResult | null> {
    const pending = this.getPending();
    if (!pending) return null;
    if (this.walletAddress && pending.account.toLowerCase() !== this.walletAddress.toLowerCase()) {
      throw new Error("The pending PromptShield request belongs to a different wallet account.");
    }
    return this.waitForPersisted(pending, onState);
  }

  async getResult(sender: string | null, requestId: string): Promise<PromptShieldResult | null> {
    if (!sender) return null;
    return normalizeResult(await this.read<unknown>("get_result", [sender, requestId]));
  }

  async getResults(offset = 0, limit = 20): Promise<PromptShieldResult[]> {
    const values = await this.read<unknown[]>("get_results", [offset, Math.min(50, Math.max(0, limit))]);
    return (Array.isArray(values) ? values : []).map(normalizeResult).filter((item): item is PromptShieldResult => Boolean(item));
  }

  async getSummary(): Promise<PromptShieldSummary> {
    const value = await this.read<any>("get_summary");
    return { total: Number(value?.total ?? 0), safe: Number(value?.safe ?? 0), suspicious: Number(value?.suspicious ?? 0), dangerous: Number(value?.dangerous ?? 0) };
  }
}
