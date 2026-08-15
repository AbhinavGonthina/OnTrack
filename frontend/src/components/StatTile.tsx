interface Props {
  label: string;
  value: string;
}

export function StatTile({ label, value }: Props) {
  return (
    <div className="rounded-xl border border-black/10 px-4 py-3 dark:border-white/10">
      <p className="text-xs text-black/60 dark:text-white/60">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-black dark:text-white">{value}</p>
    </div>
  );
}
