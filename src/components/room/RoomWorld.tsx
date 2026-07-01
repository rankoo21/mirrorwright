"use client";

import { useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MirrorPlane } from "./MirrorPlane";
import { ShardField } from "./ShardField";
import { Silhouette } from "./Silhouette";
import { BreathFog } from "./BreathFog";
import { Breath } from "./Breath";
import { Sill } from "@/components/glass/Condensation";
import { EtchedGlyph, GLYPHS } from "@/components/glass/EtchedGlyph";
import { DimGlass } from "@/components/modes/DimGlass";
import { Feeding } from "@/components/modes/Feeding";
import { Resolve } from "@/components/modes/Resolve";
import { Speaking } from "@/components/modes/Speaking";
import { Correction } from "@/components/modes/Correction";
import { Depths } from "@/components/modes/Depths";
import { useMirrorStore } from "@/store/useMirrorStore";
import type { SurfaceMode } from "@/store/useMirrorStore";

// The single room. One reflective surface, the constellation of etched glyphs in
// the frame (The Tilt), the living wallet (The Breath), and the sill (The Sill).
export function RoomWorld() {
  const init = useMirrorStore((s) => s.init);
  const ready = useMirrorStore((s) => s.ready);
  const breathed = useMirrorStore((s) => s.breathed);
  const surface = useMirrorStore((s) => s.surface);
  const tiltTo = useMirrorStore((s) => s.tiltTo);
  const mirror = useMirrorStore((s) => s.mirror);
  const fragments = useMirrorStore((s) => s.fragments);
  const notice = useMirrorStore((s) => s.notice);
  const error = useMirrorStore((s) => s.error);
  const clearNotice = useMirrorStore((s) => s.clearNotice);

  useEffect(() => {
    void init();
  }, [init]);

  const clarity = mirror?.persona.clarity ?? 0;
  const contested = mirror?.state === "contested";

  const shardTexts = useMemo(() => fragments.map((f) => f.text), [fragments]);

  // Auto-dismiss notices after a beat.
  useEffect(() => {
    if (!notice && !error) return;
    const t = setTimeout(() => clearNotice(), 4200);
    return () => clearTimeout(t);
  }, [notice, error, clearNotice]);

  const renderMode = (mode: SurfaceMode) => {
    switch (mode) {
      case "dim":
        return <DimGlass />;
      case "feeding":
        return <Feeding />;
      case "resolve":
        return <Resolve />;
      case "speaking":
        return <Speaking />;
      case "correction":
        return <Correction />;
      case "depths":
        return <Depths />;
    }
  };

  return (
    <main className="relative min-h-screen w-full overflow-hidden room-vignette">
      <div aria-hidden className="pointer-events-none absolute inset-0 room-dust opacity-40" />

      {/* The Breath: the living wallet object. It gates the room until the user
          breathes on the glass, then becomes a warm fog mark in the corner. */}
      {ready && <Breath />}

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-16">
        {/* The Tilt: the constellation of etched glyphs in the frame. */}
        <nav
          aria-label="The Tilt: tilt the glass between modes"
          role="tablist"
          className="mb-7 flex items-center gap-6"
        >
          {GLYPHS.map((g) => (
            <EtchedGlyph
              key={g.mode}
              spec={g}
              active={surface === g.mode}
              disabled={!breathed && g.mode !== "dim"}
              onSelect={tiltTo}
            />
          ))}
        </nav>

        <MirrorPlane surface={surface} clarity={clarity} contested={contested}>
          {/* Layered scene behind the glass content. */}
          <div className="pointer-events-none absolute inset-0">
            <Silhouette clarity={clarity} contested={contested} />
            <ShardField clarity={clarity} shardTexts={shardTexts} speaking={surface === "speaking"} />
            <BreathFog intensity={surface === "dim" ? 1 : 0.5} />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={surface}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7 }}
              className="relative z-10 flex min-h-[inherit] flex-col"
            >
              {renderMode(surface)}
            </motion.div>
          </AnimatePresence>
        </MirrorPlane>
      </div>

      {/* Notices and errors, etched faintly rather than as toast cards. */}
      <AnimatePresence>
        {(notice || error) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            role="status"
            aria-live="polite"
            className="fixed left-1/2 top-20 z-40 -translate-x-1/2 px-6 text-center"
          >
            <span className={`font-display text-sm ${error ? "text-ember" : "text-mercury"}`}>
              {error || notice}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <Sill />
    </main>
  );
}
