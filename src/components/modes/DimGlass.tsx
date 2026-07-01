"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Condensation } from "@/components/glass/Condensation";
import { EtchLine, EtchText } from "@/components/ui/EtchText";
import { useMirrorStore } from "@/store/useMirrorStore";

// Mode 1: The Dim Glass. Entry, replaces the landing page. A tall dark faintly
// fractured mirror; behind it a vague silhouette and drifting fog. The only
// affordance is to wipe the condensation, which tilts toward The Feeding.
export function DimGlass() {
  const tiltTo = useMirrorStore((s) => s.tiltTo);
  const [progress, setProgress] = useState(0);
  const cleared = progress > 0.32;

  return (
    <div className="relative flex h-full min-h-[inherit] flex-col items-center justify-center px-8 py-16 text-center">
      {/* Condensation the user wipes across. */}
      <Condensation onWipeProgress={setProgress} active={!cleared} />

      <div className="relative z-10 flex flex-col items-center gap-6">
        <EtchLine className="text-3xl md:text-5xl">A mirror learning to be you.</EtchLine>

        <AnimatePresence>
          {cleared ? (
            <motion.div
              key="revealed"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.6 }}
              className="flex flex-col items-center gap-7"
            >
              <EtchText as="p" className="normal-case tracking-wide text-base opacity-80">
                Feed it fragments. It will learn to answer as you.
              </EtchText>
              <button
                type="button"
                onClick={() => tiltTo("feeding")}
                className="rounded-full border border-mercury/25 px-7 py-3 font-display text-mercury transition-colors duration-500 hover:border-mercury/50"
                style={{ letterSpacing: "0.06em" }}
              >
                open the writing slit
              </button>
            </motion.div>
          ) : (
            <motion.p
              key="hint"
              className="etched normal-case"
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 4, repeat: Infinity }}
              style={{ letterSpacing: "0.16em" }}
            >
              Wipe the glass to begin
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
