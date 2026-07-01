import type { MirrorAdapter } from "./types";
import { MockAdapter } from "./mockAdapter";
import { ContractAdapter } from "./contractAdapter";

// Single place that decides which adapter is live. The UI imports getAdapter()
// and never imports a concrete adapter directly.
let cached: MirrorAdapter | null = null;

export function getAdapter(): MirrorAdapter {
  if (cached) return cached;

  const mode = process.env.NEXT_PUBLIC_MIRROR_MODE ?? "mock";
  const contractAddress = process.env.NEXT_PUBLIC_MIRROR_CONTRACT ?? "";
  const network = process.env.NEXT_PUBLIC_MIRROR_NETWORK ?? "studionet";

  if (mode === "contract" && contractAddress) {
    cached = new ContractAdapter({ contractAddress, network });
  } else {
    cached = new MockAdapter();
  }
  return cached;
}

export function getAdapterMode(): "mock" | "contract" {
  return getAdapter().mode;
}

export * from "./types";
