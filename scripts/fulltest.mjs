// Full live end-to-end test of the deployed Mirrorwright contract on
// Testnet Bradbury. Discovers the real method signatures from the on-chain
// schema, then exercises the full AI-consensus lifecycle with WRITES:
//   open_mirror -> feed_fragment (x3) -> ask
// and reads back get_persona / get_summary at the end.
//
// Every transaction is printed as a public explorer link as it happens, and an
// EXPLORER LINKS block is printed at the end.
//
//   node scripts/fulltest.mjs
//
// Env (.env.deploy):
//   GENLAYER_PRIVATE_KEY      required, funded signer key (never printed)
//   MIRROR_CONTRACT_ADDRESS   required, deployed Bradbury address
//   GENLAYER_NETWORK          bradbury (default here)

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { createClient, createAccount } from "genlayer-js";
import { studionet, testnetBradbury, localnet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const envPath = join(root, ".env.deploy");

const EXPLORER_BASE = "https://explorer-bradbury.genlayer.com";
const txLink = (hash) => `${EXPLORER_BASE}/tx/${hash}`;
const addrLink = (addr) => `${EXPLORER_BASE}/address/${addr}`;

// Collected explorer links, printed in a block at the end.
const txLinks = [];

function parseEnv(path) {
  const out = {};
  if (!existsSync(path)) return out;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    out[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return out;
}

function pickChain(name) {
  switch ((name ?? "studionet").toLowerCase()) {
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

// Convert BigInt / Map / Set into plain JSON-serializable values.
function toPlain(value) {
  if (typeof value === "bigint") return Number(value);
  if (value instanceof Map) {
    const o = {};
    for (const [k, v] of value.entries()) o[String(k)] = toPlain(v);
    return o;
  }
  if (value instanceof Set) return Array.from(value).map(toPlain);
  if (Array.isArray(value)) return value.map(toPlain);
  if (value && typeof value === "object") {
    const o = {};
    for (const [k, v] of Object.entries(value)) o[k] = toPlain(v);
    return o;
  }
  return value;
}

const pretty = (v) => JSON.stringify(toPlain(v), null, 2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const env = parseEnv(envPath);
  const pk = env.GENLAYER_PRIVATE_KEY;
  const address = env.MIRROR_CONTRACT_ADDRESS;
  const networkName = env.GENLAYER_NETWORK || "bradbury";

  if (!pk) throw new Error("Missing GENLAYER_PRIVATE_KEY in .env.deploy.");
  if (!address) throw new Error("Missing MIRROR_CONTRACT_ADDRESS in .env.deploy.");

  const chain = pickChain(networkName);
  const account = createAccount(pk.startsWith("0x") ? pk : `0x${pk}`);
  const client = createClient({ chain, account });

  console.log("=== Mirrorwright full live end-to-end test (Testnet Bradbury) ===");
  console.log(`Network:  ${networkName}`);
  console.log(`Contract: ${address}`);
  console.log(`Caller:   ${account.address}`);
  console.log(`Explorer: ${addrLink(address)}`);
  console.log("");

  // --- Step 1: discover the real method signatures from the on-chain schema.
  console.log("Fetching contract schema (no guessing on method names)...");
  let schema;
  try {
    schema = await client.getContractSchema(address);
    const methods = schema?.methods ?? schema?.abi ?? schema;
    console.log("Contract schema methods:");
    console.log(pretty(methods));
  } catch (e) {
    console.log(`  warning: could not fetch schema: ${String(e?.message ?? e)}`);
    console.log("  proceeding with signatures confirmed from contract source.");
  }
  console.log("");

  // --- helpers for reads / writes with Bradbury-aware retry.
  const read = (fn, args = []) => client.readContract({ address, functionName: fn, args });

  const wait = (hash) =>
    client.waitForTransactionReceipt({
      hash,
      status: TransactionStatus.ACCEPTED,
      interval: 6000,
      retries: 150,
    });

  // Writes are AI-consensus txs; Bradbury transiently reverts at the consensus
  // layer, so retry up to 4 times on transient errors with a 10s wait.
  const RETRYABLE = /revert|timed out|temporarily|429|nonce/i;
  const write = async (step, fn, args) => {
    let lastErr;
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      try {
        console.log(`  [${step}] submitting ${fn} (attempt ${attempt}/4)...`);
        const hash = await client.writeContract({ address, functionName: fn, args, value: 0n });
        console.log(`  [${step}] tx: ${txLink(hash)}`);
        txLinks.push({ step: `${step} (${fn})`, link: txLink(hash) });
        const receipt = await wait(hash);
        console.log(`  [${step}] ACCEPTED`);
        return receipt;
      } catch (e) {
        lastErr = e;
        const msg = String(e?.message ?? e);
        if (!RETRYABLE.test(msg)) {
          console.log(`  [${step}] non-retryable error: ${msg}`);
          throw e;
        }
        console.log(`  [${step}] transient failure (attempt ${attempt}/4): ${msg.slice(0, 160)}`);
        if (attempt < 4) await sleep(10000);
      }
    }
    throw new Error(`Write step "${step}" (${fn}) failed after 4 attempts: ${String(lastErr?.message ?? lastErr)}`);
  };

  const readUntil = async (fn, args, pred, tries = 30, gap = 4000) => {
    let last;
    for (let i = 0; i < tries; i += 1) {
      try {
        last = await read(fn, args);
        if (pred(last)) return last;
      } catch (e) {
        // Bradbury reads can lag; keep polling.
      }
      await sleep(gap);
    }
    return last;
  };

  const g = (o, k) => (o && typeof o.get === "function" ? o.get(k) : o?.[k]);

  const writeFailures = [];

  const persistedWrite = async (step, fn, argsFactory, summaryKey) => {
    let lastCount = -1;
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      const before = await read("get_summary", []);
      const beforeCount = Number(g(before, summaryKey) ?? 0);
      await write(`${step} persistence ${attempt}`, fn, argsFactory());
      const after = await readUntil(
        "get_summary",
        [],
        (s) => Number(g(s, summaryKey) ?? 0) > beforeCount,
        12,
        3000,
      );
      lastCount = Number(g(after, summaryKey) ?? 0);
      if (lastCount > beforeCount) return;
      console.log(`  [${step}] transaction reached consensus but did not persist; retrying.`);
      await sleep(8000);
    }
    throw new Error(`${step} did not persist after 4 consensus attempts (last ${summaryKey}=${lastCount}).`);
  };

  // --- Step 2: open the mirror (idempotent per owner).
  console.log("Step 1/4: open_mirror");
  try {
    await write("open_mirror", "open_mirror", [Date.now()]);
  } catch (e) {
    writeFailures.push({ step: "open_mirror", error: String(e?.message ?? e) });
    console.log(`  FAILED: ${String(e?.message ?? e)}`);
  }
  console.log("");

  // Resolve the mirror id owned by this caller.
  const mine = await readUntil("get_mirror_by_owner", [account.address], (m) => !!g(m, "id"));
  const mirrorId = g(mine, "id");
  console.log(`Resolved mirror id: ${mirrorId ?? "(none)"}`);
  console.log("");

  if (!mirrorId) {
    console.log("Could not resolve a mirror id; cannot continue the lifecycle.");
  } else {
    // --- Step 3: feed coherent persona fragments.
    const fragments = [
      {
        text: "When people ask me for advice, I slow down and ask what they are afraid of before I say anything.",
        kind: "voice",
      },
      {
        text: "I would rather sit inside a hard question than rush toward a clean, comfortable answer.",
        kind: "habit",
      },
      {
        text: "I value honesty even when it costs me, and I try to name the thing everyone is avoiding.",
        kind: "value",
      },
    ];

    console.log("Step 2/4: feed_fragment (x3)");
    for (let i = 0; i < fragments.length; i += 1) {
      const f = fragments[i];
      try {
        await persistedWrite(
          `feed_fragment #${i + 1}`,
          "feed_fragment",
          () => [mirrorId, f.text, f.kind, Date.now()],
          "fragments",
        );
      } catch (e) {
        writeFailures.push({ step: `feed_fragment #${i + 1}`, error: String(e?.message ?? e) });
        console.log(`  FAILED: ${String(e?.message ?? e)}`);
      }
    }
    console.log("");

    // --- Step 4: ask the mirror a question.
    console.log("Step 3/4: ask");
    try {
      await persistedWrite(
        "ask",
        "ask",
        () => [mirrorId, "How should I make a decision I am afraid of?", "0xlive", Date.now()],
        "answers",
      );
    } catch (e) {
      writeFailures.push({ step: "ask", error: String(e?.message ?? e) });
      console.log(`  FAILED: ${String(e?.message ?? e)}`);
    }
    console.log("");
  }

  // --- Step 5: read back persona + summary.
  console.log("Step 4/4: read back get_persona / get_summary");
  let persona = null;
  let summary = null;
  if (mirrorId) {
    persona = await readUntil("get_persona", [mirrorId], (p) => !!p, 10, 4000);
  }
  summary = await readUntil("get_summary", [], (s) => !!s, 10, 4000);

  console.log("");
  console.log("get_persona ->");
  console.log(pretty(persona));
  console.log("");
  console.log("get_summary ->");
  console.log(pretty(summary));
  console.log("");

  // --- Explorer links block.
  console.log("========================= EXPLORER LINKS =========================");
  console.log(`Contract:  ${addrLink(address)}`);
  if (txLinks.length === 0) {
    console.log("(no transactions were submitted)");
  } else {
    for (const t of txLinks) {
      console.log(`${t.step}: ${t.link}`);
    }
  }
  console.log("==================================================================");
  console.log("");

  // --- Final verdict.
  if (writeFailures.length === 0 && txLinks.length > 0) {
    console.log("RESULT: all AI-consensus writes succeeded.");
  } else if (writeFailures.length > 0) {
    console.log("RESULT: some AI-consensus writes FAILED after retries:");
    for (const wf of writeFailures) {
      console.log(`  - ${wf.step}: ${wf.error}`);
    }
    process.exitCode = 1;
  } else {
    console.log("RESULT: no writes were submitted.");
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("FULLTEST ERROR:", err?.message ?? err);
  process.exit(1);
});
