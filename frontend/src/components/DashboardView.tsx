import Link from "next/link";
import { Briefcase, TrendingUp, ClipboardCheck, Building2, Trophy, Clock } from "lucide-react";
import type { ApplicationResponse, StatsResponse } from "@/lib/types";
import { StatTile } from "@/components/StatTile";
import { SankeyChart } from "@/components/SankeyChart";
import { StatusBadge } from "@/components/Badge";
import { Button } from "@/components/Button";

interface Props {
  stats: StatsResponse;
  applications: ApplicationResponse[];
  readOnly: boolean;
}

function formatPercent(value: number): string {
  return `${value}%`;
}

// A faint decorative outline of what the real Sankey chart will look like once there's
// data - purely visual, sits behind the empty-state message/CTA.
function SankeySkeleton() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 400 160"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full text-muted opacity-20"
    >
      <rect x="8" y="25" width="10" height="30" rx="2" fill="currentColor" />
      <rect x="8" y="80" width="10" height="45" rx="2" fill="currentColor" />
      <rect x="8" y="135" width="10" height="20" rx="2" fill="currentColor" />
      <rect x="382" y="15" width="10" height="40" rx="2" fill="currentColor" />
      <rect x="382" y="90" width="10" height="30" rx="2" fill="currentColor" />
      <path d="M18,40 C200,40 200,32 382,32" fill="none" stroke="currentColor" strokeWidth="10" opacity="0.5" />
      <path d="M18,100 C200,100 200,45 382,45" fill="none" stroke="currentColor" strokeWidth="8" opacity="0.5" />
      <path d="M18,105 C200,105 200,105 382,105" fill="none" stroke="currentColor" strokeWidth="14" opacity="0.5" />
      <path d="M18,145 C200,145 200,130 382,130" fill="none" stroke="currentColor" strokeWidth="6" opacity="0.5" />
    </svg>
  );
}

export function DashboardView({ stats, applications, readOnly }: Props) {
  const basePath = readOnly ? "/demo/applications" : "/applications";

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
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
          {stats.sankeyLinks.length === 0 ? (
            <div className="relative flex flex-col items-center gap-3 overflow-hidden rounded-2xl border border-dashed border-surface-border bg-surface/40 p-10 text-center">
              <SankeySkeleton />
              <div className="relative flex flex-col items-center gap-3">
                <Briefcase size={40} className="text-muted/40" />
                <p className="text-sm text-muted">
                  Add an application and log a status update to see your pipeline here.
                </p>
                {!readOnly && (
                  <Link href="/applications/new">
                    <Button variant="secondary" className="mt-2">
                      + Add First Application
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <SankeyChart links={stats.sankeyLinks} />
          )}
        </div>
      </div>

      <div className="card p-6">
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
          <p className="mt-2 text-sm text-muted">
            No applications logged yet.{" "}
            {!readOnly && (
              <Link href="/applications/new" className="font-medium text-brand hover:underline">
                Add one now
              </Link>
            )}
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-surface-border">
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
