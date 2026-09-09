import { TriviaQuiz } from "@/components/TriviaQuiz";
import { Logo } from "@/components/Logo";

// The inner content on its own, with no page-level wrapper - lets the auth pages render this
// as AuthLayout's children during a cold start instead of swapping AuthLayout out entirely,
// so the card and floating icons stay mounted (no unmount/remount replaying their entrance).
export function WakingUpNoticeContent({
  isSlow,
  showLogo = true,
}: {
  isSlow: boolean;
  /** AuthLayout already pins its own "OnTrack" logo above the card, so the login/signup
   * pages (which render this as AuthLayout's children during a cold start) pass false here
   * to avoid a second logo stacked directly above this text. */
  showLogo?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="flex flex-col items-center">
        {showLogo && <Logo size={32} />}
        <h1 className={`font-display text-xl font-bold text-foreground ${showLogo ? "mt-4" : ""}`}>
          Waking up the server&hellip;
        </h1>
        <p className="mt-2 max-w-md text-sm text-foreground/70">
          OnTrack runs on free-tier hosting, so the backend naps after 15 minutes idle. It&apos;s
          starting back up now. This usually takes under a minute.
        </p>
        {isSlow && (
          <p className="mt-2 max-w-md text-sm text-amber-600 dark:text-amber-400">
            Still waking up. Hang tight, free hosting can occasionally take a little longer.
          </p>
        )}
      </div>
      <TriviaQuiz />
    </div>
  );
}

export function WakingUpNotice({ isSlow }: { isSlow: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-16">
      <WakingUpNoticeContent isSlow={isSlow} />
    </div>
  );
}
