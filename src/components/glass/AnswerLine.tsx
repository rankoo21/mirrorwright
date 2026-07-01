"use client";

import { motion } from "framer-motion";
import { useReducedMotionPref } from "@/components/room/useReducedMotionPref";

interface AnswerLineProps {
  text: string;
}

// The twin's answer surfacing on the glass, a line forming from shards with a
// warm ember tint. The ember marks the twin's own voice; it is never the only
// signal (the answer also carries a label and holds a distinct position).
export function AnswerLine({ text }: AnswerLineProps) {
  const reduced = useReducedMotionPref();
  const words = text.split(/\s+/);

  if (reduced) {
    return (
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
        className="voice-ember font-display text-xl md:text-2xl leading-relaxed text-balance"
      >
        {text}
      </motion.p>
    );
  }

  return (
    <p className="voice-ember font-display text-xl md:text-2xl leading-relaxed text-balance">
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          initial={{ opacity: 0, y: 14, rotateX: -60, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, rotateX: 0, filter: "blur(0px)" }}
          transition={{
            duration: 0.7,
            delay: i * 0.06,
            type: "spring",
            stiffness: 120,
            damping: 16,
          }}
          className="inline-block mr-[0.3em]"
        >
          {word}
        </motion.span>
      ))}
    </p>
  );
}
