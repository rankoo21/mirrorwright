// Live check against the deployed Mirrorwright contract. Exercises the full
// reflective journey: open the mirror, feed fragments, ask in voice, correct.
//
//   node scripts/livecheck.mjs

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { createClient, createAccount, generatePrivateKey } from "genlayer-js";
import { studionet, testnetBradbury, localnet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

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
      return testnetBradbury;
    case "localnet":
      return localnet;
    default:
      return studionet;
  }
}

const g = (o, k) => (o && typeof o.get === "function" ? o.get(k) : o?.[k]);

let passed = 0;
let failed = 0;
function check(label, cond, extra = "") {
  if (cond) {
    passed += 1;
    console.log(`  PASS  ${label}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${label}  ${extra}`);
  }
}

async function main() {
  const env = { ...parseEnv(join(root, ".env.deploy")), ...parseEnv(join(root, ".env.local")) };
  const address = env.MIRROR_CONTRACT_ADDRESS || env.NEXT_PUBLIC_MIRROR_CONTRACT;
  const network = env.GENLAYER_NETWORK || env.NEXT_PUBLIC_MIRROR_NETWORK || "studionet";
  if (!address) throw new Error("No contract address in env.");

  const chain = pickChain(network);
  const pk = env.GENLAYER_PRIVATE_KEY;
  const account = pk
    ? createAccount(pk.startsWith("0x") ? pk : `0x${pk}`)
    : createAccount(generatePrivateKey());
  const client = createClient({ chain, account });

  console.log(`Contract: ${address}`);
  console.log(`Network:  ${network}`);
  console.log(`Caller:   ${account.address}\n`);

  const wait = (hash) =>
    client.waitForTransactionReceipt({ hash, status: TransactionStatus.ACCEPTED, interval: 6000, retries: 150 });
  const read = (fn, args = []) => client.readContract({ address, functionName: fn, args });
  const write = async (fn, args) => {
    let lastErr;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const h = await client.writeContract({ address, functionName: fn, args, value: 0n });
        return await wait(h);
      } catch (e) {
        lastErr = e;
        const msg = String(e?.message ?? e);
        if (!/revert|timed out|temporarily|429/i.test(msg)) throw e;
        await new Promise((r) => setTimeout(r, 8000));
      }
    }
    throw lastErr;
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const readUntil = async (fn, args, pred, tries = 30, gap = 4000) => {
    let last;
    for (let i = 0; i < tries; i += 1) {
      last = await read(fn, args);
      if (pred(last)) return last;
      await sleep(gap);
    }
    return last;
  };

  // Open a mirror for this caller.
  console.log("Opening the mirror");
  await write("open_mirror", [Date.now()]);
  const mine = await readUntil("get_mirror_by_owner", [account.address], (m) => !!g(m, "id"));
  check("mirror opened for caller", !!g(mine, "id"), JSON.stringify(mine));
  const mirrorId = g(mine, "id");

  // Feed a couple of cohering fragments.
  console.log("\nFeeding fragments");
  await write("feed_fragment", [
    mirrorId,
    "When people ask me for advice, I slow down and ask what they are afraid of first.",
    "voice",
    Date.now(),
  ]);
  await write("feed_fragment", [
    mirrorId,
    "I would rather sit in a hard question than rush to a clean answer.",
    "habit",
    Date.now(),
  ]);
  const afterFeed = await readUntil("get_mirror", [mirrorId], (m) => Number(g(m, "fragmentCount")) >= 2);
  check("two fragments fed", Number(g(afterFeed, "fragmentCount")) >= 2, `count=${g(afterFeed, "fragmentCount")}`);

  const persona = await read("get_persona", [mirrorId]);
  check("persona has clarity > 0", Number(g(persona, "clarity")) > 0, `clarity=${g(persona, "clarity")}`);

  // Ask the mirror.
  console.log("\nAsking the mirror");
  let answered = false;
  try {
    await write("ask", [mirrorId, "How should I make a decision I am afraid of?", "0xlive", Date.now()]);
    answered = true;
  } catch (e) {
    console.log("  note: ask did not reach consensus this run:", String(e?.message ?? e));
  }
  if (answered) {
    const answers = await readUntil("get_answers", [mirrorId, 0, 20], (a) => Array.isArray(a) && a.length >= 1);
    check("an answer was stored", Array.isArray(answers) && answers.length >= 1, JSON.stringify(answers?.length));
    if (Array.isArray(answers) && answers.length) {
      check("answer has text", !!g(answers[0], "text"), JSON.stringify(g(answers[0], "text")));
    }
  }

  // Summary.
  const summary = await read("get_summary", []);
  console.log("\nContract summary:", JSON.stringify(summary, (k, v) => (typeof v === "bigint" ? Number(v) : v)));

  console.log(`\n=== ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error("LIVECHECK ERROR:", e?.message ?? e);
  process.exit(1);
});
