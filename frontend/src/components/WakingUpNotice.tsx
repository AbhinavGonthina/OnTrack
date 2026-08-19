import { TriviaQuiz } from "@/components/TriviaQuiz";

export function WakingUpNotice({ isSlow }: { isSlow: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <div>
        <h1 className="text-xl font-semibold text-black dark:text-white">
          Waking up the server&hellip;
        </h1>
        <p className="mt-2 max-w-md text-sm text-black/70 dark:text-white/70">
          OnTrack runs on free-tier hosting, so the backend naps after 15 minutes idle. It&apos;s
          starting back up now — this usually takes under a minute.
        </p>
        {isSlow && (
          <p className="mt-2 max-w-md text-sm text-amber-600 dark:text-amber-400">
            Still waking up — hang tight, free hosting can occasionally take a little longer.
          </p>
        )}
      </div>
      <TriviaQuiz />
    </div>
  );
}
