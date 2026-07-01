// Small formatting helpers shared across the reflective surface.

let counter = 0;

export function makeId(prefix: string): string {
  counter += 1;
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}_${counter}_${rand}`;
}

// A plausible-looking transaction id for mock mode, so The Depths can show a
// "pressed hash" without a real chain.
export function mockTxHash(): string {
  const hex = "0123456789abcdef";
  let out = "0x";
  for (let i = 0; i < 40; i += 1) {
    out += hex[Math.floor(Math.random() * hex.length)];
  }
  return out;
}

export function shortenAddress(address: string | null | undefined): string {
  if (!address) return "";
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}\u2026${address.slice(-4)}`;
}

export function formatMoment(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return "a moment with no hour";
  try {
    const d = new Date(ms);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "a moment with no hour";
  }
}

export function clampClarity(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}
