"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { WritingSlit } from "@/components/glass/WritingSlit";
import { EtchLine, EtchText } from "@/components/ui/EtchText";
import { useMirrorStore } from "@/store/useMirrorStore";

// Mode 5: The Correction. Amend the persona when an answer feels untrue. The
// user points at a shard (a trait) and speaks a correction into the slit. The
// named shard dims and a new fragment rises to replace its influence. Never a
// settings form.
export function Correction() {
  const mirror = useMirrorStore((s) => s.mirror);
  const contestedTrait = useMirrorStore((s) => s.contestedTrait);
  const offerCorrection = useMirrorStore((s) => s.offerCorrection);
  const busy = useMirrorStore((s) => s.busy);
  const tiltTo = useMirrorStore((s) => s.tiltTo);

  const traits = [
    ...(mirror?.persona.lockedTraits ?? []),
    ...(mirror?.persona.valueAnchors ?? []),
  ];
  const [target, setTarget] = useState<string>(contestedTrait ?? traits[0] ?? "");

  const commit = async (text: string) => {
    const result = await offerCorrection(target, text);
    if (result) setTimeout(() => tiltTo("resolve"), 900);
  };

  return (
    <div className="relative flex h-full min-h-[inherit] flex-col items-center justify-center gap-9 px-8 py-16 text-center">
      <div className="flex flex-col items-center gap-2">
        <EtchLine className="text-2xl md:text-3xl">Correct the reflection.</EtchLine>
        <EtchText className="normal-case tracking-wide opacity-70">
          Point at the shard that feels untrue, then speak what is truer.
        </EtchText>
      </div>

      {/* Point at a contested shard. */}
      <div className="flex flex-wrap items-center justify-center gap-3" role="group" aria-label="Choose a shard to contest">
        {traits.length === 0 && <span className="etched normal-case opacity-40">no shards have settled yet</span>}
        {traits.map((t) => {
          const selected = t === target;
          return (
            <button
              key={t}
              type="button"
              aria-pressed={selected}
              onClick={() => setTarget(t)}
              className="relative font-display transition-all duration-500"
              style={{ fontSize: "0.95rem", color: selected ? "#4A4E55" : "#C7CDD4", opacity: selected ? 0.6 : 1 }}
            >
              {t}
              {selected && (
                <motion.span
                  layoutId="dim-mark"
                  className="absolute -bottom-1 left-0 h-px w-full"
                  style={{ background: "rgba(199,205,212,0.4)" }}
                />
              )}
            </button>
          );
        })}
      </div>
      {target && <EtchText className="normal-case opacity-60">This shard dimmed: {target}</EtchText>}

      <WritingSlit
        ariaLabel="Speak a correction into the glass"
        placeholder="That is not really me. Even when I seem fast, I have been turning it over slowly."
        actLabel="offer a correction"
        guidance={["Validators must agree the correction coheres before the self changes."]}
        busy={busy}
        onCommit={commit}
      />

      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => tiltTo("speaking")}
          className="etched normal-case rounded-full border border-mercury/15 px-4 py-2 hover:border-mercury/35"
          style={{ letterSpacing: "0.12em" }}
        >
          keep the original
        </button>
        <button
          type="button"
          onClick={() => tiltTo("speaking")}
          className="etched normal-case rounded-full border border-mercury/15 px-4 py-2 hover:border-mercury/35"
          style={{ letterSpacing: "0.12em" }}
        >
          return to the speaking
        </button>
      </div>
    </div>
  );
}
