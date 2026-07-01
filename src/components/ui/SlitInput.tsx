"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface SlitInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel: string;
  multiline?: boolean;
  onSubmit?: () => void;
  maxLength?: number;
}

// The writing slit: a narrow luminous line at the base of the mirror. Typed
// words feel like they are spoken into the glass, not entered into a form field.
export function SlitInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
  multiline = false,
  onSubmit,
  maxLength = 600,
}: SlitInputProps) {
  const [focused, setFocused] = useState(false);

  const shared = {
    value,
    "aria-label": ariaLabel,
    placeholder,
    maxLength,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    className:
      "w-full bg-transparent text-breath placeholder:text-smoke/70 font-display text-lg leading-relaxed resize-none outline-none px-2 py-3",
  };

  return (
    <div className="relative w-full">
      {multiline ? (
        <textarea
          {...shared}
          rows={3}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && onSubmit) onSubmit();
          }}
        />
      ) : (
        <input
          {...shared}
          onKeyDown={(e) => {
            if (e.key === "Enter" && onSubmit) onSubmit();
          }}
        />
      )}
      {/* The luminous slit line. */}
      <motion.div
        aria-hidden
        className="h-px w-full slit-glow"
        style={{ background: "linear-gradient(90deg, transparent, rgba(199,205,212,0.7), transparent)" }}
        animate={{ opacity: focused ? 1 : 0.45, scaleX: focused ? 1 : 0.92 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />
    </div>
  );
}
