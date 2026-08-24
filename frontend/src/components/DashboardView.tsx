import Link from "next/link";
import { Briefcase, TrendingUp, ClipboardCheck, Building2, Trophy, Clock } from "lucide-react";
import type { ApplicationResponse, StatsResponse } from "@/lib/types";
import { StatTile } from "@/components/StatTile";
import { SankeyChart } from "@/components/SankeyChart";
import { StatusBadge } from "@/components/Badge";

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
        <StatTile icon={Briefcase} label="Applications" value={String(stats.totalApplications)} />
        <StatTile icon={TrendingUp} label="Response rate" value={formatPercent(stats.responseRate)} />
        <StatTile icon={ClipboardCheck} label="OA rate" value={formatPercent(stats.oaRate)} />
        <StatTile icon={Building2} label="Onsite rate" value={formatPercent(stats.onsiteRate)} />
        <StatTile icon={Trophy} label="Offer rate" value={formatPercent(stats.offerRate)} />
        <StatTile
          icon={Clock}
          label="Avg. days to first response"
          value={stats.avgDaysToFirstResponse !== null ? stats.avgDaysToFirstResponse.toFixed(1) : "—"}
        />
      </div>

      <div>
        <h2 className="text-sm font-medium text-muted">Pipeline</h2>
        <div className="mt-2">
          <SankeyChart links={stats.sankeyLinks} />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted">
            {readOnly ? "Sample applications" : "Your applications"}
          </h2>
          {!readOnly && (
            <Link href="/applications" className="text-sm font-medium text-brand hover:underline">
              View all
            </Link>
          )}
        </div>
        {applications.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No applications yet.</p>
        ) : (
          <ul className="card mt-2 divide-y divide-surface-border">
            {applications.slice(0, 8).map((app) => (
              <li key={app.id}>
                <Link
                  href={`${basePath}/${app.id}`}
                  className="flex items-center justify-between px-4 py-3 text-sm hover:bg-brand/5"
                >
                  <span className="text-foreground">
                    {app.role} · {app.company}
                  </span>
                  <StatusBadge status={app.currentStatus} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
