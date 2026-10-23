import { Logo } from "../../components/Logo";

/** Placeholder shell. The real state machine arrives in step 10. */
export function App() {
  return (
    <main className="p-4">
      <header className="flex items-center gap-2">
        <Logo size={20} />
        <h1 className="text-sm font-semibold">OnTrack</h1>
      </header>
      <p className="mt-3 text-[var(--color-muted)]">
        Open a job posting in this tab, then click OnTrack again.
      </p>
    </main>
  );
}
