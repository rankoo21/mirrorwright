"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMirrorStore } from "@/store/useMirrorStore";
import { shortenAddress } from "@/utils/format";

// The Breath: the living wallet object, not a rectangular button.
//
// Before connection: the glass is cold and clear with "Breathe on the glass".
// Breathing on it (click / tap-hold) fogs the glass and reveals the connect
// affordance. After connection: a small warm fog mark stays in a corner;
// hovering it reveals the shortened address.
export function Breath() {
  const breathed = useMirrorStore((s) => s.breathed);
  const connecting = useMirrorStore((s) => s.connecting);
  const identity = useMirrorStore((s) => s.identityAddress);
  const usingWallet = useMirrorStore((s) => s.usingWallet);
  const mode = useMirrorStore((s) => s.mode);
  const breatheOnGlass = useMirrorStore((s) => s.breatheOnGlass);
  const disconnectWallet = useMirrorStore((s) => s.disconnectWallet);

  const [fogged, setFogged] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startBreath = () => {
    holdTimer.current = setTimeout(() => setFogged(true), 260);
  };
  const endBreath = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    setFogged(true);
  };

  if (breathed) {
    return (
      <div className="fixed right-5 top-5 z-40 flex items-center gap-3 rounded-full border border-mercury/25 bg-room/70 px-4 py-2 backdrop-blur-sm">
        {/* A warm fog mark: connected. */}
        <motion.div
          className="relative h-6 w-6 rounded-full"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            background: "radial-gradient(circle at 40% 35%, rgba(232,163,106,0.7), rgba(239,244,248,0.15) 60%, transparent)",
            boxShadow: "0 0 18px rgba(232,163,106,0.35)",
          }}
          aria-label="Connected"
        />
        <span className="etched normal-case text-sm text-mercury" style={{ letterSpacing: "0.1em" }}>
          {usingWallet ? "wallet" : "self"} · {shortenAddress(identity) || "unsigned"}
        </span>
        {usingWallet && (
          <button
            type="button"
            onClick={disconnectWallet}
            className="etched normal-case rounded-full border border-mercury/25 px-3 py-1 text-xs text-mercury transition-colors duration-300 hover:border-mercury/50"
            style={{ letterSpacing: "0.08em" }}
            aria-label="Disconnect wallet"
          >
            disconnect
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-room/80 backdrop-blur-sm">
      <div className="relative flex flex-col items-center gap-8 px-6 text-center">
        <motion.button
          type="button"
          aria-label="Breathe on the glass to begin"
          onPointerDown={startBreath}
          onPointerUp={endBreath}
          onClick={() => setFogged(true)}
          className="relative flex h-56 w-56 items-center justify-center rounded-full"
          whileTap={{ scale: 0.97 }}
        >
          {/* Cold clear glass that fogs when breathed on. */}
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{
              opacity: fogged ? 0.9 : 0.25,
              background: fogged
                ? "radial-gradient(circle at 50% 45%, rgba(239,244,248,0.3), rgba(199,205,212,0.08) 60%, transparent)"
                : "radial-gradient(circle at 50% 45%, rgba(199,205,212,0.08), transparent 60%)",
            }}
            transition={{ duration: 1.4 }}
          />
          <motion.span
            className="etched-line relative text-lg"
            animate={{ opacity: fogged ? 0 : [0.4, 0.9, 0.4] }}
            transition={{ duration: 5, repeat: fogged ? 0 : Infinity }}
          >
            Breathe on the glass
          </motion.span>
        </motion.button>

        <AnimatePresence>
          {fogged && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2 }}
              className="flex flex-col items-center gap-4"
            >
              <p className="etched-line text-xl">The fog reveals a way in.</p>
              <div className="flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={breatheOnGlass}
                  disabled={connecting}
                  className="rounded-full border border-mercury/25 px-7 py-3 font-display text-mercury transition-colors duration-500 hover:border-mercury/50 disabled:opacity-40"
                  style={{ letterSpacing: "0.06em" }}
                >
                  {connecting
                    ? "the glass is opening"
                    : mode === "mock"
                      ? "step before the mirror"
                      : "sign with a wallet"}
                </button>
                <p className="etched normal-case max-w-xs leading-relaxed opacity-50" style={{ letterSpacing: "0.08em" }}>
                  {mode === "mock"
                    ? "Running in mock mode. The reflection forms fully offline."
                    : "Connect your browser wallet, MetaMask with the GenLayer Snap, to gain a self and speak into the glass. Viewing needs no wallet."}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
