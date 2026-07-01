"use client";

import { motion } from "framer-motion";
import { EtchLine, EtchText } from "@/components/ui/EtchText";
import { useMirrorStore } from "@/store/useMirrorStore";

// Mode 3: The Resolve. Watch the persona fingerprint form. The readouts are
// faint etched marks around the frame, never dashboard cards or numbers.
export function Resolve() {
  const mirror = useMirrorStore((s) => s.mirror);
  const tiltTo = useMirrorStore((s) => s.tiltTo);
  const persona = mirror?.persona;

  const clarity = persona?.clarity ?? 0;
  const clarityWord =
    clarity < 20 ? "barely a shadow" : clarity < 45 ? "a gathering shape" : clarity < 70 ? "a clear bearing" : "almost a face";

  return (
    <div className="relative flex h-full min-h-[inherit] flex-col items-center justify-between px-8 py-14 text-center">
      <div className="flex flex-col items-center gap-2">
        <EtchLine className="text-2xl md:text-3xl">The glass is resolving.</EtchLine>
        <EtchText className="normal-case tracking-wide opacity-70">
          {mirror ? `${mirror.fragmentCount} fragments fed` : "no fragments yet"}
        </EtchText>
      </div>

      {/* Etched readouts arranged around the frame, not in a grid of cards. */}
      <div className="grid w-full max-w-2xl grid-cols-1 gap-8 md:grid-cols-2">
        <FrameReadout label="clarity" delay={0.1}>
          <span className="font-display text-breath text-lg">{clarityWord}</span>
        </FrameReadout>
        <FrameReadout label="recurring themes" delay={0.2}>
          <EtchedList items={persona?.recurringThemes ?? []} empty="nothing recurs yet" />
        </FrameReadout>
        <FrameReadout label="locked traits" delay={0.3}>
          <EtchedList items={persona?.lockedTraits ?? []} empty="none have settled" highlight />
        </FrameReadout>
        <FrameReadout label="held contradictions" delay={0.4}>
          <EtchedList items={persona?.heldContradictions ?? []} empty="none held" muted />
        </FrameReadout>
      </div>

      <div className="flex flex-col items-center gap-3">
        <EtchText className="normal-case tracking-wide opacity-60">
          The reflection sharpens as you feed it.
        </EtchText>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => tiltTo("feeding")}
            className="etched normal-case rounded-full border border-mercury/15 px-4 py-2 hover:border-mercury/35"
            style={{ letterSpacing: "0.12em" }}
          >
            feed another fragment
          </button>
          <button
            type="button"
            onClick={() => tiltTo("speaking")}
            disabled={clarity < 10}
            className="etched normal-case rounded-full border border-mercury/15 px-4 py-2 hover:border-mercury/35 disabled:opacity-30"
            style={{ letterSpacing: "0.12em" }}
          >
            ask the mirror
          </button>
        </div>
      </div>
    </div>
  );
}

function FrameReadout({ label, children, delay }: { label: string; children: React.ReactNode; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.6, delay }}
      className="flex flex-col items-center gap-2"
    >
      <span className="etched" style={{ letterSpacing: "0.22em" }}>
        {label}
      </span>
      <div className="min-h-[1.5rem]">{children}</div>
    </motion.div>
  );
}

function EtchedList({
  items,
  empty,
  highlight = false,
  muted = false,
}: {
  items: string[];
  empty: string;
  highlight?: boolean;
  muted?: boolean;
}) {
  if (items.length === 0) {
    return <span className="etched normal-case opacity-40">{empty}</span>;
  }
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
      {items.map((it) => (
        <span
          key={it}
          className={`font-display ${highlight ? "text-breath" : muted ? "text-smoke" : "text-mercury"}`}
          style={{ fontSize: "0.92rem" }}
        >
          {it}
        </span>
      ))}
    </div>
  );
}
