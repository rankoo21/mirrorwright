"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { EtchLine, EtchText } from "@/components/ui/EtchText";
import { useMirrorStore } from "@/store/useMirrorStore";
import { formatMoment, shortenAddress } from "@/utils/format";
import { exportImpression, exportPressed, exportAloud, downloadText } from "@/utils/exports";

type SunkItem =
  | { kind: "fragment"; id: string; createdAt: number; text: string; relation: string; traits: string[] }
  | {
      kind: "answer";
      id: string;
      createdAt: number;
      question: string;
      text: string;
      drawnFrom: string[];
      hash: string;
    };

// Mode 6: The Depths. The record of fragments and past answers, suspended in a
// dark pool below the visible glass. Touching a sunk shard floats it up and
// unfolds it into a readable form. Never a grid or history table.
export function Depths() {
  const fragments = useMirrorStore((s) => s.fragments);
  const answers = useMirrorStore((s) => s.answers);
  const [openId, setOpenId] = useState<string | null>(null);

  const sunk = useMemo<SunkItem[]>(() => {
    const items: SunkItem[] = [
      ...fragments.map((f) => ({
        kind: "fragment" as const,
        id: f.id,
        createdAt: f.createdAt,
        text: f.text,
        relation: f.relation,
        traits: [],
      })),
      ...answers.map((a) => ({
        kind: "answer" as const,
        id: a.id,
        createdAt: a.createdAt,
        question: a.question,
        text: a.text,
        drawnFrom: a.drawnFrom,
        hash: a.mockTxHash,
      })),
    ];
    return items.sort((a, b) => b.createdAt - a.createdAt);
  }, [fragments, answers]);

  return (
    <div className="relative flex h-full min-h-[inherit] flex-col px-8 py-14">
      <div className="flex flex-col items-center gap-2 text-center">
        <EtchLine className="text-2xl md:text-3xl">The Depths.</EtchLine>
        <EtchText className="normal-case tracking-wide opacity-70">
          Older shards and past answers hang suspended below the glass.
        </EtchText>
      </div>

      {/* Export acts, etched. */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
        <ExportAct label="take an impression" onClick={() => downloadText("mirrorwright-impression.md", exportImpression(fragments, answers))} />
        <ExportAct label="press the glass" onClick={() => downloadText("mirrorwright.json", exportPressed(fragments, answers))} />
        <ExportAct label="read aloud" onClick={() => downloadText("mirrorwright.txt", exportAloud(fragments, answers))} />
      </div>

      {/* The pool: items suspended in dark water. */}
      <div className="pool-scroll mt-8 flex-1 overflow-y-auto pb-24">
        {sunk.length === 0 ? (
          <p className="mt-16 text-center etched normal-case opacity-40">the pool is still and empty</p>
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-5">
            {sunk.map((item, i) => (
              <SunkShard
                key={item.id}
                item={item}
                depth={i}
                open={openId === item.id}
                onToggle={() => setOpenId(openId === item.id ? null : item.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SunkShard({
  item,
  depth,
  open,
  onToggle,
}: {
  item: SunkItem;
  depth: number;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: open ? 1 : 0.4 + Math.max(0, 0.3 - depth * 0.03), y: 0 }}
      whileHover={{ opacity: 0.95, y: -3 }}
      transition={{ duration: 0.8 }}
      className="w-full rounded-2xl px-5 py-4 text-left"
      style={{
        background: open
          ? "linear-gradient(160deg, rgba(199,205,212,0.06), rgba(20,36,42,0.3))"
          : "linear-gradient(160deg, rgba(199,205,212,0.02), transparent)",
        border: "1px solid rgba(199,205,212,0.08)",
      }}
      aria-expanded={open}
    >
      <div className="flex items-center justify-between gap-4">
        <span className="etched" style={{ letterSpacing: "0.2em" }}>
          {item.kind === "fragment" ? `fragment . ${item.relation}` : "an exchange"}
        </span>
        <span className="etched normal-case opacity-50">{formatMoment(item.createdAt)}</span>
      </div>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.5 }}
            className="overflow-hidden"
          >
            {item.kind === "fragment" ? (
              <p className="mt-3 font-display text-mercury text-base leading-relaxed">{item.text}</p>
            ) : (
              <div className="mt-3 flex flex-col gap-3">
                <p className="font-display text-mercury/80 text-sm italic">{item.question}</p>
                <p className="voice-ember font-display text-base leading-relaxed">{item.text}</p>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <span className="etched" style={{ letterSpacing: "0.18em" }}>
                    drawn from {item.drawnFrom.join(", ") || "the self"}
                  </span>
                  <span className="etched normal-case opacity-50">pressed {shortenAddress(item.hash)}</span>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <p className="mt-2 truncate font-display text-smoke text-sm">
            {item.kind === "fragment" ? item.text : item.text}
          </p>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

function ExportAct({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="etched normal-case rounded-full border border-mercury/15 px-4 py-2 transition-colors duration-500 hover:border-mercury/35"
      style={{ letterSpacing: "0.12em" }}
    >
      {label}
    </button>
  );
}
