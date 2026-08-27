"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { useTheme } from "@/context/ThemeContext";
import { useBackendWake } from "@/context/BackendWakeContext";
import { Button } from "@/components/Button";

export function ProductPreview() {
  const { theme } = useTheme();
  const { startWaking } = useBackendWake();
  const src = theme === "light" ? "/screenshots/dashboard-light.png" : "/screenshots/dashboard-dark.png";

  return (
    <div className="relative mx-auto w-full max-w-5xl px-6">
      <motion.div
        initial={{ y: 24 }}
        whileInView={{ y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface shadow-2xl">
          <div className="flex items-center gap-1.5 border-b border-surface-border px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
            <span className="ml-3 rounded-full bg-background px-3 py-1 text-xs text-muted">
              ontrack.app/dashboard
            </span>
            <Link href="/demo" onClick={startWaking} className="ml-auto">
              <Button variant="primary" size="sm">
                Try Demo
              </Button>
            </Link>
          </div>
          <Image
            src={src}
            alt="OnTrack dashboard showing application stats and a status pipeline funnel chart"
            width={1104}
            height={620}
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
