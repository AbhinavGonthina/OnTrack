"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { PartyPopper, X } from "lucide-react";

const COLORS = ["var(--brand)", "var(--brand-secondary)", "#059669", "#f59e0b", "#e11d48"];
const PIECE_COUNT = 70;
const AUTO_DISMISS_MS = 5000;

interface ConfettiPiece {
  id: number;
  left: number;
  color: string;
  delay: number;
  duration: number;
  rotation: number;
  drift: number;
}

function generatePieces(): ConfettiPiece[] {
  return Array.from({ length: PIECE_COUNT }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    color: COLORS[i % COLORS.length],
    delay: Math.random() * 0.5,
    duration: 2.4 + Math.random() * 1.4,
    rotation: Math.random() * 360 - 180,
    drift: (Math.random() - 0.5) * 200,
  }));
}

export function OfferCelebration({ onDone }: { onDone: () => void }) {
  // A useState lazy initializer (not useMemo) - it's the one React-sanctioned place to run
  // one-time impure logic like Math.random() during render, since it's guaranteed to run
  // only once for this component instance, never re-evaluated on a later render.
  const [pieces] = useState<ConfettiPiece[]>(generatePieces);

  useEffect(() => {
    const timer = setTimeout(onDone, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  return createPortal(
    <>
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[110] overflow-hidden">
        {pieces.map((piece) => (
          <motion.span
            key={piece.id}
            className="absolute top-0 h-2.5 w-1.5 rounded-[1px]"
            style={{ left: `${piece.left}%`, background: piece.color }}
            initial={{ y: -20, x: 0, rotate: 0, opacity: 1 }}
            animate={{ y: "110vh", x: piece.drift, rotate: piece.rotation, opacity: [1, 1, 0.8, 0] }}
            transition={{ duration: piece.duration, delay: piece.delay, ease: "easeIn" }}
          />
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="card fixed top-6 left-1/2 z-[111] flex -translate-x-1/2 items-center gap-3 px-5 py-3 shadow-lg"
      >
        <PartyPopper className="text-brand" size={22} />
        <p className="text-sm font-medium text-foreground">Congratulations on your offer!</p>
        <button
          onClick={onDone}
          className="rounded-lg p-1 text-muted transition-colors hover:bg-foreground/5 hover:text-foreground"
        >
          <X size={16} />
        </button>
      </motion.div>
    </>,
    document.body,
  );
}
