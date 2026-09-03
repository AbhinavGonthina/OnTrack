"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { useTheme } from "@/context/ThemeContext";

export function ProductPreview() {
  const { theme } = useTheme();
  const src = theme === "light" ? "/screenshots/dashboard-light.png" : "/screenshots/dashboard-dark.png";

  return (
    <div className="relative mx-auto w-full max-w-5xl px-6">
      <motion.div
        initial={{ y: 24 }}
        whileInView={{ y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {/* No separate fake browser-chrome bar here - the screenshot itself already
            includes the real app nav, so a second toolbar on top would just be redundant. */}
        <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface shadow-2xl">
          <Image
            src={src}
            alt="OnTrack dashboard showing application stats and a status pipeline funnel chart"
            width={1402}
            height={911}
            className="h-auto w-full"
          />
        </div>
      </motion.div>
      <p className="mt-5 text-center text-base font-medium text-foreground/80">
        Your dashboard at a glance — response, OA, onsite, and offer rates, plus a funnel
        showing exactly where applications stall.
      </p>
    </div>
  );
}
