import Link from "next/link";
import {
  Briefcase,
  TrendingUp,
  ClipboardCheck,
  Building2,
  Trophy,
  Clock,
  ListChecks,
  FileText,
  LayoutDashboard,
  UserPlus,
  LogIn,
} from "lucide-react";
import type { ApplicationResponse, StatsResponse } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { StatTile } from "@/components/StatTile";
import { SankeyChart } from "@/components/SankeyChart";
import { StatusBadge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { ReportProblemButton } from "@/components/ReportProblemButton";

interface Props {
  stats: StatsResponse;
  applications: ApplicationResponse[];
  readOnly: boolean;
}

const QUICK_ACTION_CLASSNAME =
  "flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-surface-border bg-white/[0.03] px-3.5 py-2.5 text-sm text-foreground transition-all hover:bg-white/[0.08]";

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

function StatTiles({ stats, compact }: { stats: StatsResponse; compact: boolean }) {
  return (
    <>
      <StatTile compact={compact} icon={Briefcase} label="Applications" value={String(stats.totalApplications)} />
      <StatTile compact={compact} icon={TrendingUp} label="Response rate" value={formatPercent(stats.responseRate)} />
      <StatTile compact={compact} icon={ClipboardCheck} label="OA rate" value={formatPercent(stats.oaRate)} />
      <StatTile compact={compact} icon={Building2} label="Interview rate" value={formatPercent(stats.interviewRate)} />
      <StatTile compact={compact} icon={Trophy} label="Offer rate" value={formatPercent(stats.offerRate)} />
      <StatTile
        compact={compact}
        icon={Clock}
        label="Avg. days to first response"
        value={stats.avgDaysToFirstResponse !== null ? stats.avgDaysToFirstResponse.toFixed(1) : "—"}
      />
    </>
  );
}

function PipelineEmptyState({ readOnly, fillHeight = false }: { readOnly: boolean; fillHeight?: boolean }) {
  return (
    <div
      className={`relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border border-dashed border-surface-border bg-surface/40 p-10 text-center ${
        fillHeight ? "h-full w-full" : ""
      }`}
    >
      <h2 className="absolute top-4 left-4 text-sm font-medium text-muted">Pipeline</h2>
      <SankeySkeleton />
      <div className="relative flex flex-col items-center gap-3">
        <Briefcase size={40} className="text-muted/40" />
        <p className="text-sm text-muted">Add an application and log a status update to see your pipeline here.</p>
        {!readOnly && (
          <Link href="/applications/new">
            <Button variant="secondary" className="mt-2">
              + Add First Application
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

function ApplicationsList({
  applications,
  readOnly,
  basePath,
  compact = false,
}: {
  applications: ApplicationResponse[];
  readOnly: boolean;
  basePath: string;
  compact?: boolean;
}) {
  if (applications.length === 0) {
    return (
      <p className="mt-2 text-sm text-muted">
        No applications logged yet.{" "}
        {!readOnly && (
          <Link href="/applications/new" className="font-medium text-brand hover:underline">
            Add one now
          </Link>
        )}
      </p>
    );
  }

  return (
    <ul className={`divide-y divide-surface-border ${compact ? "mt-2" : "mt-4"}`}>
      {applications.map((app) => (
        <li key={app.id}>
          <Link
            href={`${basePath}/${app.id}`}
            className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm transition-colors hover:bg-white/[0.02]"
          >
            <span className="min-w-0 truncate text-foreground">
              {app.role} · {app.company}
            </span>
            <StatusBadge status={app.currentStatus} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function DashboardView({ stats, applications, readOnly }: Props) {
  const { isAuthenticated } = useAuth();
  const basePath = readOnly ? "/demo/applications" : "/applications";
  const applicationsHeading = readOnly ? "Sample applications" : "Your applications";

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 flex flex-col gap-3 md:col-span-3">
        <div className="grid grid-cols-2 gap-3">
          <StatTiles stats={stats} compact />
        </div>
        {/* flex-1: the grid's default stretch behavior matches this column's height to
            the right column's (whichever is taller), and this card fills the leftover
            space - without it, the grid would still align the two columns' outer boxes,
            but this card would stay short and leave a visible empty gap below it. */}
        <div className="card flex flex-1 flex-col gap-2 p-4">
          <h2 className="shrink-0 text-sm font-medium text-muted">Quick actions</h2>
          <div className="flex flex-1 flex-col gap-3">
            {readOnly ? (
              isAuthenticated ? (
                <>
                  <Link href="/dashboard" className={QUICK_ACTION_CLASSNAME}>
                    <LayoutDashboard size={16} className="text-brand" />
                    Go to your dashboard
                  </Link>
                  <Link href="/applications" className={QUICK_ACTION_CLASSNAME}>
                    <ListChecks size={16} className="text-brand" />
                    View your applications
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/signup" className={QUICK_ACTION_CLASSNAME}>
                    <UserPlus size={16} className="text-brand" />
                    Sign up free
                  </Link>
                  <Link href="/login" className={QUICK_ACTION_CLASSNAME}>
                    <LogIn size={16} className="text-brand" />
                    Log in
                  </Link>
                </>
              )
            ) : (
              <>
                <Link href="/applications" className={QUICK_ACTION_CLASSNAME}>
                  <ListChecks size={16} className="text-brand" />
                  View all applications
                </Link>
                <Link href="/profile" className={QUICK_ACTION_CLASSNAME}>
                  <FileText size={16} className="text-brand" />
                  Check your resume fit
                </Link>
                <ReportProblemButton variant="action" />
              </>
            )}
          </div>
        </div>
      </div>

      <div className="col-span-12 flex flex-col gap-6 md:col-span-9">
        {/* A fixed height, not a proportional flex-grow split against the viewport - the
            page itself scrolls now, so this only needs to be tall enough to render the
            chart well, not to divide up a fixed budget with the Applications card below. */}
        <div className="h-[380px]">
          {stats.sankeyLinks.length === 0 ? (
            <PipelineEmptyState readOnly={readOnly} fillHeight />
          ) : (
            <SankeyChart links={stats.sankeyLinks} fillHeight />
          )}
        </div>

        {/* A real fixed height, not flex-1 - this card's box size (and therefore the whole
            rectangle's shape, and Quick Actions' matched height on the left) never changes
            as more applications get added. Shows every application (no artificial cap),
            scrolling internally instead. */}
        <div className="card flex h-[320px] flex-col p-4">
          <h2 className="shrink-0 text-sm font-medium text-muted">{applicationsHeading}</h2>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <ApplicationsList applications={applications} readOnly={readOnly} basePath={basePath} compact />
          </div>
        </div>
      </div>
    </div>
  );
}
