import type { PromptShieldAdapter } from "./types";
import { ContractAdapter } from "./contractAdapter";
import { MockAdapter } from "./mockAdapter";

let cached: PromptShieldAdapter | null = null;

export function getPromptShieldAdapter(): PromptShieldAdapter {
  if (cached) return cached;

  const mode = process.env.NEXT_PUBLIC_PROMPTSHIELD_MODE ?? "mock";
  const contractAddress = process.env.NEXT_PUBLIC_PROMPTSHIELD_CONTRACT ?? "";
  const network = process.env.NEXT_PUBLIC_PROMPTSHIELD_NETWORK ?? "studionet";

  cached = mode === "contract" && contractAddress
    ? new ContractAdapter({ contractAddress, network })
    : new MockAdapter();
  return cached;
}

export function getPromptShieldMode(): "mock" | "contract" {
  return getPromptShieldAdapter().mode;
}

export * from "./types";
