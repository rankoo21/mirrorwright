import type { PromptShieldPayload } from "./types";

export const PROMPTSHIELD_APP = "promptshield" as const;
export const PROMPTSHIELD_LIMITS = {
  trustedSystemRules: 8000,
  untrustedContent: 12000,
  protectedDataDescription: 2000,
} as const;

export function normalizePayload(payload: PromptShieldPayload): PromptShieldPayload {
  return {
    trustedSystemRules: payload.trustedSystemRules.trim(),
    untrustedContent: payload.untrustedContent.trim(),
    protectedDataDescription: payload.protectedDataDescription?.trim() ?? "",
  };
}

export function validatePayload(payload: PromptShieldPayload): void {
  if (!payload.trustedSystemRules.trim()) throw new Error("Trusted system rules are required.");
  if (!payload.untrustedContent.trim()) throw new Error("Untrusted content is required.");
  if (payload.trustedSystemRules.length > PROMPTSHIELD_LIMITS.trustedSystemRules) throw new Error("Trusted system rules must be 8,000 characters or fewer.");
  if (payload.untrustedContent.length > PROMPTSHIELD_LIMITS.untrustedContent) throw new Error("Untrusted content must be 12,000 characters or fewer.");
  if ((payload.protectedDataDescription?.length ?? 0) > PROMPTSHIELD_LIMITS.protectedDataDescription) throw new Error("Protected-data description must be 2,000 characters or fewer.");
}

export function serializePayload(payload: PromptShieldPayload): string {
  const normalized = normalizePayload(payload);
  return JSON.stringify({
    trusted_system_rules: normalized.trustedSystemRules,
    untrusted_content: normalized.untrustedContent,
    protected_data_description: normalized.protectedDataDescription,
  });
}

export async function hashPayload(payload: PromptShieldPayload): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(serializePayload(payload)));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}