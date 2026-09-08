"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { useTheme } from "@/context/ThemeContext";

// Intrinsic file dimensions. Everything was captured at devicePixelRatio 2, so the
// dashboard's numbers are twice the CSS viewport it was shot at; the two card crops are
// already inset past their own border and padding (see the crop notes below).
const DASHBOARD = { width: 2880, height: 1810 };
const STRENGTH_CARD = { width: 831, height: 879 };
const FIT_CARD = { width: 1241, height: 525 };

// The two foreground layers are crops of their card's interior - taken just inside the
// card's own border, so the wrapper below can supply that border instead and the two never
// double up. They are not whole pages: at 280px and 340px a full-page screenshot would
// render its body text at 2-3px.
//
// The overlay only engages at lg. The card widths here are fixed pixels and both cards hang
// 24px outside the container, so at the md breakpoint's 768px they would collide with each
// other and with the viewport edge. Below lg the whole thing degrades to a plain vertical
// stack, which is also the only readable arrangement at phone width.
//
// 976px is the dashboard's original width - what max-w-5xl minus px-6 used to resolve to.
// It's set explicitly rather than via max-w-5xl because the padding lives on the parent now:
// putting px-6 on the wrapper instead would make the cards' -left-6/-right-6 offsets resolve
// against the padding box and cancel the intended overhang.
//
// All three layers deliberately share one outline/shadow treatment - the same
// border-surface-border plus purple-tinted drop shadow the dashboard has always used. Depth
// comes from the rotation and overlap alone, not from per-card accent colours or glows.
// Two things make the overlays read as real cards rather than pasted screenshots.
//
// 1. bg-surface is OPAQUE. It was semi-transparent with a backdrop blur before, which meant
//    the dashboard behind showed through the wrapper's padding ring - its red "Rejected"
//    badge bled in as a coloured smear - and since the screenshot itself is opaque, the ring
//    and the image never matched, leaving a visible seam. Opaque --surface is a pixel-exact
//    match for the crops' own background (26,26,25 dark / 252,252,251 light), so the padding
//    ring and the image are indistinguishable.
//
// 2. The padding is real CSS pixels on the wrapper, not the screenshot's own. The source
//    card's 16px padding scales down with the image - at 280px wide that leaves about 5px of
//    visual padding, which looked cramped. p-3 doesn't scale, so both cards get consistent
//    breathing room regardless of how far the screenshot is reduced.
//
// The image needs its own rounding for the same reason the wrapper used to: the crop is a
// rectangle, so its corners contain page background from outside the card's own rounded
// corners. The card uses --radius-2xl (16px), which scales to roughly 9-11px at these
// widths, so a 12px radius on the image reliably clips those slivers. It can't be left to
// the wrapper's rounding now that padding insets the image away from the wrapper's edge.
const OUTLINE = "border border-surface-border shadow-2xl shadow-purple-950/20";
const CARD_BASE = `${OUTLINE} rounded-2xl bg-surface p-3 transition-all duration-300`;
const CARD_IMAGE = "h-auto w-full rounded-xl";

export function ProductPreview() {
  const { theme } = useTheme();
  // theme is null until the mount effect resolves the OS preference; default to the dark
  // asset rather than branching, so the markup is stable through hydration.
  const variant = theme === "light" ? "light" : "dark";

  return (
    <div className="px-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative mx-auto my-12 flex w-full max-w-[976px] flex-col gap-6 lg:block"
      >
        {/* Background layer. No fake browser-chrome bar - the screenshot already includes
            the real app nav, so a second toolbar on top would just be redundant. */}
        <div className={`${OUTLINE} overflow-hidden rounded-2xl`}>
          <Image
            src={`/screenshots/dashboard-${variant}.png`}
            alt="OnTrack dashboard: application counts, conversion rates and a funnel chart of the status pipeline"
            width={DASHBOARD.width}
            height={DASHBOARD.height}
            className="h-auto w-full"
            priority
            sizes="(max-width: 1024px) 100vw, 976px"
          />
        </div>

        {/* Foreground left: resume strength. */}
        <div
          className={`${CARD_BASE} lg:absolute lg:-bottom-8 lg:-left-6 lg:z-20 lg:w-[280px] lg:[transform:rotate(-2deg)] lg:hover:[transform:rotate(0deg)]`}
        >
          <Image
            src={`/screenshots/strength-card-${variant}.png`}
            alt="Resume strength scored 95 out of 100, broken down by impact, technical depth, ATS compatibility and clarity"
            width={STRENGTH_CARD.width}
            height={STRENGTH_CARD.height}
            className={CARD_IMAGE}
            sizes="(max-width: 1024px) 100vw, 280px"
          />
        </div>

        {/* Foreground right: resume/JD fit. Highest z so it reads as the nearest layer. */}
        <div
          className={`${CARD_BASE} lg:absolute lg:-right-6 lg:-bottom-10 lg:z-30 lg:w-[340px] lg:[transform:rotate(2deg)] lg:hover:[transform:rotate(0deg)]`}
        >
          <Image
            src={`/screenshots/fit-card-${variant}.png`}
            alt="Resume and job-description fit scored 88 out of 100, with missing keywords and rewritten resume bullets"
            width={FIT_CARD.width}
            height={FIT_CARD.height}
            className={CARD_IMAGE}
            sizes="(max-width: 1024px) 100vw, 340px"
          />
        </div>
      </motion.div>

      {/* mt clears the cards' -bottom-10 overhang before the caption starts. */}
      <p className="mx-auto mt-6 max-w-2xl text-center text-base leading-relaxed font-medium text-foreground/80 lg:mt-20">
        Track every stage of every application, score your resume out of 100, and check your fit
        against any job description — all in one place.
      </p>
    </div>
  );
}
