"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { WritingSlit } from "@/components/glass/WritingSlit";
import { EtchLine, EtchText } from "@/components/ui/EtchText";
import { useMirrorStore } from "@/store/useMirrorStore";
import type { FragmentKind } from "@/lib/genlayer/types";

// The small etched marks for fragment kind, used as synthesis context, never as
// a label badge.
const KINDS: { key: FragmentKind; label: string }[] = [
  { key: "belief", label: "belief" },
  { key: "habit", label: "habit" },
  { key: "voice", label: "voice" },
  { key: "value", label: "value" },
  { key: "memory", label: "memory" },
];

// Mode 2: The Feeding. The user speaks fragments into the glass through the
// writing slit; typed words rise as drifting shards into the forming silhouette.
export function Feeding() {
  const feed = useMirrorStore((s) => s.feed);
  const busy = useMirrorStore((s) => s.busy);
  const tiltTo = useMirrorStore((s) => s.tiltTo);
  const [kind, setKind] = useState<FragmentKind>("voice");

  const commit = async (text: string) => {
    const result = await feed(text, kind);
    if (result) {
      // Shards drift up; tilt toward The Resolve to watch it gain definition.
      setTimeout(() => tiltTo("resolve"), 900);
    }
  };

  return (
    <div className="relative flex h-full min-h-[inherit] flex-col items-center justify-center gap-10 px-8 py-16">
      <div className="flex flex-col items-center gap-3 text-center">
        <EtchLine className="text-2xl md:text-3xl">Speak into the glass.</EtchLine>
        <EtchText className="normal-case tracking-wide opacity-70">
          Write how you think, not what you did.
        </EtchText>
      </div>

      {/* Fragment kind: faint etched marks. */}
      <div className="flex flex-wrap items-center justify-center gap-3" role="group" aria-label="Fragment kind">
        {KINDS.map((k) => (
          <button
            key={k.key}
            type="button"
            aria-pressed={kind === k.key}
            onClick={() => setKind(k.key)}
            className={`etched normal-case rounded-full border px-3 py-1 transition-colors duration-500 ${
              kind === k.key ? "border-mercury/50 text-breath" : "border-mercury/12 hover:border-mercury/30"
            }`}
            style={{ letterSpacing: "0.14em" }}
          >
            {k.label}
          </button>
        ))}
      </div>

      <WritingSlit
        ariaLabel="Feed a fragment of how you think"
        placeholder="When people ask me for advice, I slow down and ask what they are afraid of first."
        actLabel="let it settle into the glass"
        guidance={[
          "Small true fragments resolve a clearer reflection.",
          "Contradictions will be held, not hidden.",
        ]}
        busy={busy}
        onCommit={commit}
      />

      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-24 flex justify-center"
        animate={{ opacity: busy ? [0.2, 0.6, 0.2] : 0 }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <span className="etched normal-case">a shard rises into the glass</span>
      </motion.div>
    </div>
  );
}
