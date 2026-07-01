import type { Answer, Fragment } from "@/lib/genlayer/types";

// Export helpers for The Depths: take an impression (Markdown), press the glass
// (JSON), read aloud (plain text).

export function exportImpression(fragments: Fragment[], answers: Answer[]): string {
  const lines: string[] = [];
  lines.push("# Mirrorwright impression");
  lines.push("");
  lines.push("A self, fed in fragments and answered in your voice.");
  lines.push("");
  lines.push("## Fragments fed");
  lines.push("");
  for (const f of [...fragments].sort((a, b) => a.createdAt - b.createdAt)) {
    lines.push(`- (${f.kind} . ${f.relation}) ${f.text}`);
  }
  lines.push("");
  lines.push("## Answers in your voice");
  lines.push("");
  for (const a of [...answers].sort((x, y) => x.createdAt - y.createdAt)) {
    lines.push(`### ${a.question}`);
    lines.push("");
    lines.push(a.text);
    lines.push("");
    lines.push(`Drawn from: ${a.drawnFrom.join(", ") || "the self"}`);
    if (a.heldBack) lines.push(`Held back: ${a.heldBack}`);
    lines.push("");
  }
  return lines.join("\n");
}

export function exportPressed(fragments: Fragment[], answers: Answer[]): string {
  return JSON.stringify({ fragments, answers }, null, 2);
}

export function exportAloud(fragments: Fragment[], answers: Answer[]): string {
  const lines: string[] = [];
  for (const a of [...answers].sort((x, y) => x.createdAt - y.createdAt)) {
    lines.push(`You asked: ${a.question}`);
    lines.push(`The reflection answered: ${a.text}`);
    lines.push("");
  }
  if (lines.length === 0) {
    for (const f of fragments) lines.push(f.text);
  }
  return lines.join("\n");
}

// Trigger a client-side download of text content.
export function downloadText(filename: string, content: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
