// Minimal live read against the deployed Mirrorwright contract on Bradbury.
// Reads get_summary (and get_persona on a missing mirror) to verify the
// contract responds. Bradbury reads can lag, so we poll.
//
//   node scripts/liveread.mjs

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { createClient, createAccount, generatePrivateKey } from "genlayer-js";
import { studionet, testnetBradbury, localnet } from "genlayer-js/chains";

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const env = { ...parseEnv(join(root, ".env.deploy")), ...parseEnv(join(root, ".env.local")) };
  const address = env.MIRROR_CONTRACT_ADDRESS || env.NEXT_PUBLIC_MIRROR_CONTRACT;
  const network = env.GENLAYER_NETWORK || env.NEXT_PUBLIC_MIRROR_NETWORK || "studionet";
  if (!address) throw new Error("No contract address in env.");

  const chain = pickChain(network);
  const account = createAccount(generatePrivateKey());
  const client = createClient({ chain, account });

  console.log(`Contract: ${address}`);
  console.log(`Network:  ${network}\n`);

  let summary;
  for (let i = 0; i < 30; i += 1) {
    try {
      summary = await client.readContract({ address, functionName: "get_summary", args: [] });
      if (summary) break;
    } catch (e) {
      console.log(`  read attempt ${i + 1} lagging: ${String(e?.message ?? e).slice(0, 80)}`);
    }
    await sleep(4000);
  }

  const plain = JSON.parse(JSON.stringify(summary, (k, v) => (typeof v === "bigint" ? Number(v) : v)));
  console.log("get_summary ->", JSON.stringify(plain));
  if (!summary) {
    console.error("Live read failed: no response from get_summary.");
    process.exit(1);
  }
  console.log("\nLive read OK: the deployed contract responded.");
}

main().catch((e) => {
  console.error("LIVEREAD ERROR:", e?.message ?? e);
  process.exit(1);
});
