import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApplicationsTable } from "./ApplicationsTable";
import { formatDateApplied } from "../lib/dates";
import type { ApplicationResponse, ApplicationStatus } from "../lib/types";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

function app(
  id: string,
  company: string,
  role: string,
  currentStatus: ApplicationStatus = "APPLIED",
  dateApplied = "2026-01-14",
): ApplicationResponse {
  return {
    id,
    company,
    role,
    jobDescriptionText: null,
    dateApplied,
    currentStatus,
    createdAt: "2026-01-14T10:00:00Z",
    updatedAt: "2026-01-14T10:00:00Z",
  };
}

const APPS = [
  app("a1", "Stripe", "Software Engineer Intern", "INTERVIEW"),
  app("a2", "Datadog", "Platform Engineer", "REJECTED"),
  app("a3", "Airbnb", "Backend Engineer", "OFFER"),
];

function renderTable(applications = APPS, onDelete = vi.fn(), deletingId: string | null = null) {
  render(<ApplicationsTable applications={applications} onDelete={onDelete} deletingId={deletingId} />);
  return { onDelete };
}

function rows() {
  return screen.getAllByRole("listitem");
}

beforeEach(() => {
  push.mockClear();
});

describe("formatDateApplied", () => {
  test("formats an ISO calendar date as a readable month/day/year", () => {
    expect(formatDateApplied("2026-09-07")).toBe("Sep 7, 2026");
  });

  // new Date("2026-01-01") parses as UTC midnight, which in any negative-offset timezone
  // renders as Dec 31 of the previous year. The date must be built from its parts.
  test("does not shift the date backwards across a timezone offset", () => {
    expect(formatDateApplied("2026-01-01")).toBe("Jan 1, 2026");
  });

  test("passes through anything that isn't a parseable date", () => {
    expect(formatDateApplied("not-a-date")).toBe("not-a-date");
  });
});

describe("ApplicationsTable", () => {
  test("shows every application with its company, role, date and status", () => {
    renderTable();

    expect(rows()).toHaveLength(3);
    expect(screen.getByText("Stripe")).toBeInTheDocument();
    expect(screen.getByText("Software Engineer Intern")).toBeInTheDocument();
    expect(screen.getAllByText("Jan 14, 2026")).toHaveLength(3);
    // Scoped to the row: "Interview" is also one of the status filter's <option> labels.
    expect(within(screen.getByText("Stripe").closest("li")!).getByText("Interview")).toBeInTheDocument();
  });

  test("filters by a search term against both company and role", async () => {
    const user = userEvent.setup();
    renderTable();

    await user.type(screen.getByLabelText("Search company or role"), "datadog");
    expect(rows()).toHaveLength(1);
    expect(screen.getByText("Datadog")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Search company or role"));
    await user.type(screen.getByLabelText("Search company or role"), "backend");
    expect(rows()).toHaveLength(1);
    expect(screen.getByText("Airbnb")).toBeInTheDocument();
  });

  test("filters by status", async () => {
    const user = userEvent.setup();
    renderTable();

    await user.selectOptions(screen.getByLabelText("Filter by status"), "REJECTED");
    expect(rows()).toHaveLength(1);
    expect(screen.getByText("Datadog")).toBeInTheDocument();
  });

  // The spec's filter list omitted Phone Screen and Accepted, which would make applications
  // in those states impossible to filter to.
  test("offers every status the data can hold, not just a subset", () => {
    renderTable();

    const select = screen.getByLabelText("Filter by status");
    for (const label of ["All statuses", "Applied", "OA", "Phone Screen", "Interview", "Offer", "Accepted", "Declined", "Rejected"]) {
      expect(within(select).getByText(label)).toBeInTheDocument();
    }
  });

  test("shows a distinct empty state when a filter matches nothing, and can reset it", async () => {
    const user = userEvent.setup();
    renderTable();

    await user.type(screen.getByLabelText("Search company or role"), "zzzz");
    expect(screen.getByText("No applications found")).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(rows()).toHaveLength(3);
  });

  test("shows the first-run empty state when there are no applications at all", () => {
    renderTable([]);

    expect(screen.getByText("No applications yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add your first one" })).toBeInTheDocument();
    expect(screen.queryByText("No applications found")).not.toBeInTheDocument();
  });

  test("paginates at 10 per page and moves between pages", async () => {
    const user = userEvent.setup();
    const many = Array.from({ length: 23 }, (_, i) => app(`id${i}`, `Company ${i}`, `Role ${i}`));
    renderTable(many);

    expect(rows()).toHaveLength(10);
    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
    expect(screen.getByText(/Showing 1.*10 of 23/)).toBeInTheDocument();

    await user.click(screen.getByLabelText("Next page"));
    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
    expect(screen.getByText("Company 10")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Previous page"));
    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
  });

  test("does not paginate a single page of results", () => {
    renderTable();

    expect(screen.queryByLabelText("Next page")).not.toBeInTheDocument();
    expect(screen.getByText(/Showing 1.*3 of 3/)).toBeInTheDocument();
  });

  // Filtering while on a later page would otherwise leave the page index past the end of the
  // shrunken result set, rendering an empty table with no way back.
  test("falls back to a valid page when a filter shrinks the results", async () => {
    const user = userEvent.setup();
    const many = Array.from({ length: 23 }, (_, i) => app(`id${i}`, `Company ${i}`, `Role ${i}`));
    renderTable(many);

    await user.click(screen.getByLabelText("Next page"));
    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Search company or role"), "Company 1");
    expect(screen.getAllByRole("listitem").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Page 2 of/)).not.toBeInTheDocument();
  });

  test("clicking a row navigates to that application", async () => {
    const user = userEvent.setup();
    renderTable();

    await user.click(screen.getByText("Stripe").closest("li")!);
    expect(push).toHaveBeenCalledWith("/applications/a1");
  });

  test("the delete action fires onDelete without also navigating", async () => {
    const user = userEvent.setup();
    const { onDelete } = renderTable();

    await user.click(screen.getByLabelText("Delete Software Engineer Intern at Stripe"));

    expect(onDelete).toHaveBeenCalledWith("a1");
    expect(push).not.toHaveBeenCalled();
  });

  test("the edit action links to the edit page without also navigating to the detail page", async () => {
    const user = userEvent.setup();
    renderTable();

    const edit = screen.getByLabelText("Edit Software Engineer Intern at Stripe");
    expect(edit).toHaveAttribute("href", "/applications/a1/edit");

    await user.click(edit);
    expect(push).not.toHaveBeenCalled();
  });

  test("disables the delete button for the row currently being deleted", () => {
    renderTable(APPS, vi.fn(), "a1");

    expect(screen.getByLabelText("Delete Software Engineer Intern at Stripe")).toBeDisabled();
    expect(screen.getByLabelText("Delete Platform Engineer at Datadog")).toBeEnabled();
  });
});
