"use client";

import { AnimatePresence, motion } from "framer-motion";
import { WritingSlit } from "@/components/glass/WritingSlit";
import { AnswerLine } from "@/components/glass/AnswerLine";
import { EtchLine, EtchText } from "@/components/ui/EtchText";
import { EtchPanel } from "@/components/ui/EtchPanel";
import { useMirrorStore } from "@/store/useMirrorStore";

// Mode 4: The Speaking. Ask the mirror and hear an answer in the user's voice.
// Not a chat thread; a single spoken exchange at a time. Previous answers sink
// into The Depths.
export function Speaking() {
  const askMirror = useMirrorStore((s) => s.askMirror);
  const busy = useMirrorStore((s) => s.busy);
  const liveAnswer = useMirrorStore((s) => s.liveAnswer);
  const beginCorrection = useMirrorStore((s) => s.beginCorrection);
  const letItSink = useMirrorStore((s) => s.letItSink);

  const ask = (q: string) => {
    void askMirror(q);
  };

  return (
    <div className="relative flex h-full min-h-[inherit] flex-col items-center justify-center gap-10 px-8 py-16 text-center">
      <AnimatePresence mode="wait">
        {liveAnswer ? (
          <motion.div
            key={liveAnswer.answerId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex w-full max-w-2xl flex-col items-center gap-7"
          >
            <EtchText className="normal-case tracking-wide opacity-60">It answered in your voice.</EtchText>
            <AnswerLine text={liveAnswer.answer} />

            {/* Faint etched context, not a card. Meaning carried by labels and
                position, not the ember tint alone. */}
            <div className="flex w-full flex-col gap-4 pt-3 sm:flex-row sm:justify-center sm:gap-12">
              <EtchPanel className="px-2">
                <span className="etched block" style={{ letterSpacing: "0.2em" }}>
                  drawn from
                </span>
                <span className="font-display text-mercury text-sm">
                  {liveAnswer.drawnFrom.length ? liveAnswer.drawnFrom.join(", ") : "your locked traits"}
                </span>
              </EtchPanel>
              <EtchPanel className="px-2" delay={0.15}>
                <span className="etched block" style={{ letterSpacing: "0.2em" }}>
                  held back
                </span>
                <span className="font-display text-smoke text-sm">
                  {liveAnswer.heldBack || "nothing was held"}
                </span>
              </EtchPanel>
            </div>

            {/* Actions as etched glyph-acts. */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <ActLink label="ask again" onClick={() => useMirrorStore.setState({ liveAnswer: null })} />
              <ActLink label="correct this answer" onClick={() => beginCorrection(liveAnswer.drawnFrom[0] ?? null)} />
              <ActLink label="let it sink" onClick={letItSink} />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="ask"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex w-full flex-col items-center gap-9"
          >
            <EtchLine className="text-2xl md:text-3xl">Ask the mirror.</EtchLine>
            <WritingSlit
              ariaLabel="Ask the reflection a question"
              placeholder="How should I make a decision I am afraid of?"
              actLabel="speak into the glass"
              multiline={false}
              busy={busy}
              tone="ember"
              onCommit={ask}
            />
            {busy && (
              <motion.span
                className="etched normal-case"
                animate={{ opacity: [0.2, 0.7, 0.2] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                the reflection is gathering its shards
              </motion.span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ActLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="etched normal-case underline-offset-4 transition-opacity duration-300 hover:opacity-100"
      style={{ letterSpacing: "0.14em", opacity: 0.6 }}
    >
      {label}
    </button>
  );
}
