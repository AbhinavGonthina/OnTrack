"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Inbox, Pencil, Search, SearchX, Trash2 } from "lucide-react";
import type { ApplicationResponse, ApplicationStatus } from "@/lib/types";
import { STATUS_LABELS, STATUS_ORDER } from "@/lib/statusLabels";
import { StatusBadge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { FIELD_CLASSNAME } from "@/lib/inputStyles";
import { formatDateApplied } from "@/lib/dates";

const PAGE_SIZE = 10;

type StatusFilter = ApplicationStatus | "ALL";

// Grid spans come straight from the spec at md+ (5 / 3 / 2 / 2). Below md the same single
// grid is reused with different spans - title on its own full-width line, then date, status
// and actions sharing the next line - rather than a second layout, so there's only one row
// structure to keep in sync.
const CELL_TITLE = "col-span-12 min-w-0 text-left md:col-span-5";
const CELL_DATE = "col-span-5 text-left md:col-span-3";
const CELL_STATUS = "col-span-4 flex justify-center md:col-span-2";
const CELL_ACTIONS = "col-span-3 flex items-center justify-end gap-1.5 pr-2 md:col-span-2";

// Column gaps are written as explicit longhands at both breakpoints rather than mixing
// gap-x-3 with a md:gap-4 shorthand. The shorthand sets both axes, so which one won at md+
// came down to the order Tailwind emitted them in - a silent way for the header's tracks to
// stop matching the rows' and knock every column out of alignment.
const ROW_GRID = "grid grid-cols-12 items-center px-6 gap-x-3 gap-y-2 md:gap-x-4 md:gap-y-0";

const ICON_BUTTON =
  "rounded-lg p-2 text-muted transition-colors hover:bg-foreground/10 hover:text-foreground disabled:opacity-50";

// h-10 on all three top controls so they share one height baseline. The Button needs py-0
// and explicit centering alongside it: its md size is py-3, which at a fixed 40px height
// would squeeze the label's line box and clip it.
const CONTROL_HEIGHT = "h-10";

interface Props {
  applications: ApplicationResponse[];
  onDelete: (id: string) => void;
  deletingId: string | null;
}

export function ApplicationsTable({ applications, onDelete, deletingId }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [page, setPage] = useState(1);

  // Every status the data can actually hold, not just the subset named in the spec - leaving
  // out Phone Screen and Accepted would make those applications impossible to filter to.
  const statusOptions: StatusFilter[] = ["ALL", ...STATUS_ORDER];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return applications.filter((app) => {
      const matchesStatus = status === "ALL" || app.currentStatus === status;
      const matchesTerm =
        term.length === 0 ||
        app.company.toLowerCase().includes(term) ||
        app.role.toLowerCase().includes(term);
      return matchesStatus && matchesTerm;
    });
  }, [applications, search, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // Clamped rather than stored blindly: deleting the last row on the final page (or a filter
  // that shrinks the result set) would otherwise leave `page` pointing past the end and
  // render an empty table with no way back.
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const hasFilters = search.trim().length > 0 || status !== "ALL";

  function resetFilters() {
    setSearch("");
    setStatus("ALL");
    setPage(1);
  }

  return (
    <div className="mt-6 flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search
            size={15}
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search company or role…"
            aria-label="Search company or role"
            className={`w-full rounded-xl pl-9 ${CONTROL_HEIGHT} ${FIELD_CLASSNAME}`}
          />
        </div>

        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as StatusFilter);
            setPage(1);
          }}
          aria-label="Filter by status"
          className={`rounded-xl ${CONTROL_HEIGHT} ${FIELD_CLASSNAME}`}
        >
          {statusOptions.map((option) => (
            <option key={option} value={option}>
              {option === "ALL" ? "All statuses" : STATUS_LABELS[option]}
            </option>
          ))}
        </select>

        <Link href="/applications/new" className="sm:ml-auto">
          <Button className={`inline-flex w-full items-center justify-center py-0 sm:w-auto ${CONTROL_HEIGHT}`}>
            + New application
          </Button>
        </Link>
      </div>

      {applications.length === 0 ? (
        <EmptyState
          icon={<Inbox size={22} />}
          title="No applications yet"
          action={
            <Link href="/applications/new">
              <Button size="sm">Add your first one</Button>
            </Link>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<SearchX size={22} />}
          title="No applications found"
          description="Nothing matches the current search and filter."
          action={
            <Button variant="secondary" size="sm" onClick={resetFilters}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <>
          <div className="card overflow-hidden">
            <div
              className={`hidden border-b border-surface-border pt-4 pb-3 text-xs font-medium tracking-wider text-muted uppercase md:grid ${ROW_GRID}`}
            >
              <div className="col-span-5 text-left">Role &amp; company</div>
              <div className="col-span-3 text-left">Date applied</div>
              <div className="col-span-2 text-center">Status</div>
              {/* pr-2 matches the actions cell's own pr-2 so the label sits directly over
                  the icons rather than 8px to their right. */}
              <div className="col-span-2 pr-2 text-right">Actions</div>
            </div>

            <ul className="divide-y divide-surface-border">
              {visible.map((app) => (
                <li
                  key={app.id}
                  // Whole-row click is a mouse convenience only; the real navigation target is
                  // the link in the title cell, which keeps keyboard focus, middle-click and
                  // open-in-new-tab working. The action buttons stop propagation so they don't
                  // also trigger it.
                  onClick={() => router.push(`/applications/${app.id}`)}
                  className={`cursor-pointer py-3.5 transition-colors hover:bg-foreground/[0.04] ${ROW_GRID}`}
                >
                  <div className={CELL_TITLE}>
                    <Link
                      href={`/applications/${app.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="block truncate font-semibold text-foreground hover:underline"
                    >
                      {app.company}
                    </Link>
                    <p className="truncate text-sm text-muted">{app.role}</p>
                  </div>

                  <div className={`${CELL_DATE} text-xs text-muted sm:text-sm`}>
                    {formatDateApplied(app.dateApplied)}
                  </div>

                  <div className={CELL_STATUS}>
                    <StatusBadge status={app.currentStatus} />
                  </div>

                  <div className={CELL_ACTIONS}>
                    <Link
                      href={`/applications/${app.id}/edit`}
                      onClick={(e) => e.stopPropagation()}
                      title="Edit application"
                      aria-label={`Edit ${app.role} at ${app.company}`}
                      className={ICON_BUTTON}
                    >
                      <Pencil size={15} />
                    </Link>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(app.id);
                      }}
                      disabled={deletingId === app.id}
                      title="Delete application"
                      aria-label={`Delete ${app.role} at ${app.company}`}
                      className={`${ICON_BUTTON} hover:text-red-600 dark:hover:text-red-400`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 flex flex-col items-center justify-between gap-3 px-2 text-xs font-medium text-muted sm:flex-row">
            <p>
              Showing {(currentPage - 1) * PAGE_SIZE + 1}&ndash;
              {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
              {hasFilters ? ` (filtered from ${applications.length})` : ""}
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                  className={ICON_BUTTON}
                >
                  <ChevronLeft size={16} />
                </button>
                <span>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                  className={ICON_BUTTON}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 p-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand">{icon}</div>
      <div>
        <p className="font-medium text-foreground">{title}</p>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
