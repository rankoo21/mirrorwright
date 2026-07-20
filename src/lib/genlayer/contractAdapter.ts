import { createClient, createAccount, generatePrivateKey } from "genlayer-js";
import { studionet, testnetBradbury, localnet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
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

// Real GenLayer adapter. Implements the exact same MirrorAdapter interface as
// the mock, so swapping it in does not touch a single line of UI code.
//
// To go live:
//   1. Deploy contracts/MirrorwrightContract.py (see scripts/deploy.mjs).
//   2. Set NEXT_PUBLIC_MIRROR_MODE=contract and NEXT_PUBLIC_MIRROR_CONTRACT=0x...
//   3. Optionally set NEXT_PUBLIC_MIRROR_NETWORK (studionet | bradbury | localnet).
//
// Identity model: reads are open to everyone through a read-only client. That
// client still needs an account attached, because genlayer-js throws
// "No account set. Configure the client with an account or pass an account to
// this function." when readContract is called with no account. For reads we
// attach a throwaway ephemeral account (a freshly generated key that never
// signs a write and is never persisted), so viewing existing reflections never
// requires a wallet and never hits the account error. Writing still requires
// the visitor to connect their own browser wallet (MetaMask with the GenLayer
// Snap). The deploy key in .env.deploy is server-side only.

type AnyClient = ReturnType<typeof createClient>;

const ACCEPTED = TransactionStatus.ACCEPTED;
const IDENTITY_PREF_STORAGE = "mirrorwright.identity.mode";

export interface ContractAdapterConfig {
  contractAddress: string;
  network?: string;
}

function pickChain(network?: string) {
  switch ((network ?? "studionet").toLowerCase()) {
    case "bradbury":
    case "testnet-bradbury":
    case "testnetbradbury":
      return testnetBradbury;
    case "localnet":
      return localnet;
    case "studionet":
    default:
      return studionet;
  }
}

function networkName(network?: string): "studionet" | "testnetBradbury" | "localnet" {
  switch ((network ?? "studionet").toLowerCase()) {
    case "bradbury":
    case "testnet-bradbury":
    case "testnetbradbury":
      return "testnetBradbury";
    case "localnet":
      return "localnet";
    default:
      return "studionet";
  }
}

// Recursively turn Maps (genlayer calldata) into plain objects so the UI can
// read fields with dot access regardless of how the value was decoded.
function toPlain(value: unknown): any {
  if (value instanceof Map) {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of value.entries()) obj[String(k)] = toPlain(v);
    return obj;
  }
  if (Array.isArray(value)) return value.map(toPlain);
  if (typeof value === "bigint") return Number(value);
  return value;
}

export class ContractAdapter implements MirrorAdapter {
  readonly mode = "contract" as const;
  private readonly config: ContractAdapterConfig;
  private readonly chain: ReturnType<typeof pickChain>;
  private client: AnyClient | null = null;
  private readClient: AnyClient | null = null;
  private walletAddress: string | null = null;
  private usingWallet = false;

  constructor(config: ContractAdapterConfig) {
    this.config = config;
    this.chain = pickChain(config.network);
  }

  // -- identity --------------------------------------------------------

  // Read-only client. It carries a throwaway ephemeral account so view calls
  // never trip genlayer-js's "No account set" error. This account only exists
  // to satisfy the client; it never signs a write and is never stored. If a
  // wallet is connected we reuse that client so reads share the same account.
  private getReadClient(): AnyClient {
    if (this.usingWallet && this.client) return this.client;
    if (this.readClient) return this.readClient;
    const account = createAccount(generatePrivateKey());
    this.readClient = createClient({ chain: this.chain, account }) as AnyClient;
    return this.readClient;
  }

  hasInjectedWallet(): boolean {
    return typeof window !== "undefined" && Boolean((window as any).ethereum);
  }

  async connectWallet(): Promise<string> {
    if (typeof window === "undefined") {
      throw new Error("Wallet connect is only available in the browser.");
    }
    const eth = (window as any).ethereum;
    if (!eth) {
      throw new Error("No browser wallet found. Install MetaMask with the GenLayer Snap to connect.");
    }

    // 1. Unlock MetaMask and get the selected address FIRST.
    let addr: string | undefined;
    try {
      const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
      addr = accounts?.[0];
    } catch (e: any) {
      if (e?.code === 4001) throw new Error("Wallet connection was rejected.");
      throw new Error("Could not reach MetaMask. Unlock it and try again.");
    }
    if (!addr) throw new Error("MetaMask returned no account. Unlock it and try again.");

    // 2. Create the client WITH the account address up front. genlayer-js
    //    validates client.account on every write ("No account set" otherwise),
    //    and setting it after construction does not take, so it must be passed
    //    to createClient here. Signing still routes through the GenLayer Snap.
    const client = createClient({
      chain: this.chain,
      account: addr as `0x${string}`,
    }) as AnyClient;

    // 3. Activate the GenLayer Snap and switch the network.
    try {
      await client.connect(networkName(this.config.network));
    } catch (e: any) {
      if (e?.code === 4001) throw new Error("The GenLayer Snap connection was rejected in MetaMask.");
      const detail = String(e?.message ?? e).slice(0, 200);
      throw new Error(
        "Could not activate the GenLayer Snap in MetaMask. Make sure MetaMask is unlocked and allows Snaps, then approve the install. Details: " +
          detail,
      );
    }

    this.client = client;
    this.walletAddress = addr;
    this.usingWallet = true;
    window.localStorage.setItem(IDENTITY_PREF_STORAGE, "wallet");
    return addr;
  }

  disconnectWallet(): void {
    this.client = null;
    this.walletAddress = null;
    this.usingWallet = false;
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(IDENTITY_PREF_STORAGE);
    }
  }

  isUsingWallet(): boolean {
    return this.usingWallet;
  }

  get ownerAddress(): string | null {
    return this.usingWallet ? this.walletAddress : null;
  }

  getIdentityAddress(): string | null {
    return this.ownerAddress;
  }

  private get address(): `0x${string}` {
    return this.config.contractAddress as `0x${string}`;
  }

  // -- low level -------------------------------------------------------

  private async read<T>(functionName: string, args: unknown[] = []): Promise<T> {
    const client = this.getReadClient();
    const raw = await client.readContract({
      address: this.address,
      functionName,
      args: args as any,
    });
    return toPlain(raw) as T;
  }

  private requireWalletClient(): AnyClient {
    if (!this.usingWallet || !this.client) {
      throw new Error("Breathe on the glass with your wallet to do this.");
    }
    return this.client;
  }

  private async writeAndWait(functionName: string, args: unknown[]): Promise<any> {
    const client = this.requireWalletClient();
    // Bradbury occasionally reverts a tx transiently at the consensus layer.
    let lastErr: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const hash = await client.writeContract({
          address: this.address,
          functionName,
          args: args as any,
          value: 0n,
        });
        return await client.waitForTransactionReceipt({
          hash,
          status: ACCEPTED,
          interval: 6000,
          retries: 150,
        });
      } catch (e) {
        lastErr = e;
        const msg = String((e as any)?.message ?? e);
        if (!/revert|timed out|temporarily|429/i.test(msg)) throw e;
        await new Promise((r) => setTimeout(r, 8000));
      }
    }
    throw lastErr;
  }

  // -- writes ----------------------------------------------------------

  async openMirror(): Promise<Mirror> {
    await this.writeAndWait("open_mirror", [Date.now()]);
    const mine = await this.getMyMirror();
    if (!mine) throw new Error("The mirror opened but could not be read back.");
    return mine;
  }

  async feedFragment(input: FeedFragmentInput): Promise<FeedResult> {
    const receipt = await this.writeAndWait("feed_fragment", [
      input.mirrorId,
      input.text,
      input.kind,
      Date.now(),
    ]);
    const out = toPlain(this.extractReturn<any>(receipt)) ?? {};
    return {
      mirrorId: input.mirrorId,
      fragmentId: out.fragmentId ?? "",
      relation: (out.relation ?? "extends") as FeedResult["relation"],
      coherence: Number(out.coherence ?? 0),
      state: (out.state ?? "forming") as FeedResult["state"],
      clarity: Number(out.clarity ?? 0),
      note: out.note ?? "A shard settled.",
    };
  }

  async ask(input: AskInput): Promise<AskResult> {
    const receipt = await this.writeAndWait("ask", [input.mirrorId, input.question, "", Date.now()]);
    const out = toPlain(this.extractReturn<any>(receipt)) ?? {};
    return {
      mirrorId: input.mirrorId,
      answerId: out.answerId ?? "",
      question: out.question ?? input.question,
      answer: out.answer ?? "",
      stance: out.stance ?? "",
      drawnFrom: Array.isArray(out.drawnFrom) ? out.drawnFrom : [],
      heldBack: out.heldBack ?? "",
      note: out.note ?? "It answered in your voice.",
    };
  }

  async correct(input: CorrectInput): Promise<CorrectResult> {
    const receipt = await this.writeAndWait("correct", [
      input.mirrorId,
      input.targetTrait,
      input.correctionText,
      Date.now(),
    ]);
    const out = toPlain(this.extractReturn<any>(receipt)) ?? {};
    return {
      mirrorId: input.mirrorId,
      fragmentId: out.fragmentId ?? "",
      dimmedTrait: out.dimmedTrait ?? "",
      relation: (out.relation ?? "extends") as CorrectResult["relation"],
      state: (out.state ?? "contested") as CorrectResult["state"],
      clarity: Number(out.clarity ?? 0),
      note: out.note ?? "This shard dimmed. The reflection reshaped.",
    };
  }

  // -- reads -----------------------------------------------------------

  async getMirror(mirrorId: string): Promise<Mirror | null> {
    const mirror = await this.read<any>("get_mirror", [mirrorId]);
    return mirror ? (mirror as Mirror) : null;
  }

  async getMyMirror(): Promise<Mirror | null> {
    const owner = this.ownerAddress;
    if (!owner) return null;
    const mirror = await this.read<any>("get_mirror_by_owner", [owner]);
    return mirror ? (mirror as Mirror) : null;
  }

  async getPersona(mirrorId: string): Promise<Persona | null> {
    const persona = await this.read<any>("get_persona", [mirrorId]);
    return persona ? (persona as Persona) : null;
  }

  async getFragments(mirrorId: string): Promise<Fragment[]> {
    const all: Fragment[] = [];
    const limit = 20;
    let offset = 0;
    for (;;) {
      const page = await this.read<Fragment[]>("get_fragments", [mirrorId, offset, limit]);
      if (!page || page.length === 0) break;
      all.push(...page);
      if (page.length < limit) break;
      offset += limit;
    }
    return all;
  }

  async getAnswers(mirrorId: string): Promise<Answer[]> {
    const all: Answer[] = [];
    const limit = 20;
    let offset = 0;
    for (;;) {
      const page = await this.read<Answer[]>("get_answers", [mirrorId, offset, limit]);
      if (!page || page.length === 0) break;
      all.push(...page);
      if (page.length < limit) break;
      offset += limit;
    }
    return all;
  }

  // -- receipt helpers -------------------------------------------------

  private extractReturn<T>(receipt: any): T | undefined {
    if (!receipt) return undefined;
    const candidates = [
      receipt?.consensus_data?.leader_receipt?.[0]?.result,
      receipt?.consensus_data?.leader_receipt?.result,
      receipt?.result,
      receipt?.returnValue,
      receipt?.data,
    ];
    for (const c of candidates) {
      if (c !== undefined && c !== null) return toPlain(c) as T;
    }
    return undefined;
  }
}
