import Link from "next/link";
import type { ApplicationResponse, StatsResponse } from "@/lib/types";
import { StatTile } from "@/components/StatTile";
import { SankeyChart } from "@/components/SankeyChart";

interface Props {
  stats: StatsResponse;
  applications: ApplicationResponse[];
  readOnly: boolean;
}

function formatPercent(value: number): string {
  return `${value}%`;
}

export function DashboardView({ stats, applications, readOnly }: Props) {
  const basePath = readOnly ? "/demo/applications" : "/applications";

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Applications" value={String(stats.totalApplications)} />
        <StatTile label="Response rate" value={formatPercent(stats.responseRate)} />
        <StatTile label="OA rate" value={formatPercent(stats.oaRate)} />
        <StatTile label="Onsite rate" value={formatPercent(stats.onsiteRate)} />
        <StatTile label="Offer rate" value={formatPercent(stats.offerRate)} />
        <StatTile
          label="Avg. days to first response"
          value={stats.avgDaysToFirstResponse !== null ? stats.avgDaysToFirstResponse.toFixed(1) : "—"}
        />
      </div>

      <div>
        <h2 className="text-sm font-medium text-black/70 dark:text-white/70">Pipeline</h2>
        <div className="mt-2">
          <SankeyChart links={stats.sankeyLinks} />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-black/70 dark:text-white/70">
            {readOnly ? "Sample applications" : "Your applications"}
          </h2>
          {!readOnly && (
            <Link href="/applications" className="text-sm font-medium text-black underline dark:text-white">
              View all
            </Link>
          )}
        </div>
        {applications.length === 0 ? (
          <p className="mt-2 text-sm text-black/50 dark:text-white/50">No applications yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-black/10 rounded-xl border border-black/10 dark:divide-white/10 dark:border-white/10">
            {applications.slice(0, 8).map((app) => (
              <li key={app.id}>
                <Link
                  href={`${basePath}/${app.id}`}
                  className="flex items-center justify-between px-4 py-3 text-sm hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <span className="text-black dark:text-white">
                    {app.role} · {app.company}
                  </span>
                  <span className="text-black/50 dark:text-white/50">{app.currentStatus}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
