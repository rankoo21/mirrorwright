"use client";

import { useState } from "react";
import { SlitInput } from "@/components/ui/SlitInput";
import { GlassButton } from "@/components/ui/GlassButton";
import { EtchText } from "@/components/ui/EtchText";

interface WritingSlitProps {
  ariaLabel: string;
  placeholder: string;
  actLabel: string; // the act-as-label CTA, e.g. "Let it settle into the glass"
  guidance?: string[];
  multiline?: boolean;
  busy?: boolean;
  tone?: "mercury" | "ember";
  onCommit: (value: string) => void;
}

// The narrow luminous slit at the base of the mirror through which the user
// speaks into the glass. Shared by The Feeding, The Speaking, and The Correction.
export function WritingSlit({
  ariaLabel,
  placeholder,
  actLabel,
  guidance = [],
  multiline = true,
  busy = false,
  tone = "mercury",
  onCommit,
}: WritingSlitProps) {
  const [value, setValue] = useState("");

  const commit = () => {
    const trimmed = value.trim();
    if (!trimmed || busy) return;
    onCommit(trimmed);
    setValue("");
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <SlitInput
        value={value}
        onChange={setValue}
        placeholder={placeholder}
        ariaLabel={ariaLabel}
        multiline={multiline}
        onSubmit={commit}
      />
      <div className="mt-5 flex flex-col items-center gap-4">
        <GlassButton onClick={commit} disabled={busy || !value.trim()} tone={tone} ariaLabel={actLabel}>
          {busy ? "the glass is resolving" : actLabel}
        </GlassButton>
        {guidance.length > 0 && (
          <div className="flex flex-col items-center gap-1 pt-1">
            {guidance.map((g, i) => (
              <EtchText key={g} delay={0.4 + i * 0.3} className="normal-case tracking-wide text-center">
                {g}
              </EtchText>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
