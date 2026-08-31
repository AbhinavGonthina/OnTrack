"use client";

import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";

export interface FloatingIconConfig {
  Icon: LucideIcon;
  className: string;
  delay: number;
  duration: number;
  accent: "brand" | "brand-secondary";
}

export function FloatingIcons({ icons }: { icons: FloatingIconConfig[] }) {
  return (
    <>
      {icons.map(({ Icon, className, delay, duration, accent }, i) => (
        <motion.div
          key={i}
          aria-hidden
          initial={{ opacity: 0, y: 10, scale: 0.8 }}
          animate={{ opacity: 0.3, scale: 1, y: [10, -6, 10] }}
          transition={{
            opacity: { duration: 0.6, delay, ease: "easeOut" },
            scale: { duration: 0.6, delay, ease: "easeOut" },
            y: { duration, delay, repeat: Infinity, ease: "easeInOut" },
          }}
          className={`pointer-events-none absolute hidden md:block ${className}`}
          style={{ color: `var(--${accent})` }}
        >
          <Icon className="h-full w-full" strokeWidth={1.5} />
        </motion.div>
      ))}
    </>
  );
}
