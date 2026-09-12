import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { DashboardView } from "./DashboardView";
import { useAuth } from "../context/AuthContext";
import type { ApplicationResponse, StatsResponse } from "@/lib/types";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

const baseStats: StatsResponse = {
  totalApplications: 3,
  responseRate: 66.7,
  oaRate: 33.3,
  interviewRate: 0,
  offerRate: 0,
  avgDaysToFirstResponse: 5.2,
  sankeyLinks: [],
};

const application: ApplicationResponse = {
  id: "a1",
  company: "Acme Corp",
  role: "Backend Engineer",
  jobDescriptionText: null,
  dateApplied: "2026-01-01",
  currentStatus: "OA",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

function mockAuth(isAuthenticated: boolean) {
  vi.mocked(useAuth).mockReturnValue({
    token: isAuthenticated ? "t" : null,
    user: isAuthenticated ? { id: "1", email: "person@example.com" } : null,
    isAuthenticated,
    isInitializing: false,
    login: vi.fn(),
    logout: vi.fn(),
  });
}

describe("DashboardView", () => {
  beforeEach(() => {
    // Matches the real (always-authenticated) dashboard by default - the handful of tests
    // exercising the logged-out demo variant override this themselves.
    mockAuth(true);
  });

  test("renders every stat tile with its formatted value", () => {
    render(<DashboardView stats={baseStats} applications={[]} readOnly={false} />);

    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("66.7%")).toBeInTheDocument();
    expect(screen.getByText("33.3%")).toBeInTheDocument();
    expect(screen.getByText("5.2")).toBeInTheDocument();
  });

  test("shows an em dash when avgDaysToFirstResponse is null", () => {
    render(<DashboardView stats={{ ...baseStats, avgDaysToFirstResponse: null }} applications={[]} readOnly={false} />);

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  test("shows an empty-state message with an 'Add one now' link when no applications", () => {
    render(<DashboardView stats={baseStats} applications={[]} readOnly={false} />);

    expect(screen.getByText(/No applications logged yet\./)).toBeInTheDocument();
    expect(screen.getByText("Add one now")).toHaveAttribute("href", "/applications/new");
  });

  test("hides the 'Add one now' link in the applications empty state when read-only", () => {
    render(<DashboardView stats={baseStats} applications={[]} readOnly />);

    expect(screen.queryByText("Add one now")).not.toBeInTheDocument();
  });

  // The Sankey can only draw transitions, so this row is the only thing on the dashboard that
  // says anything at all until an application moves. It has to work from the very first one.
  test("counts where applications currently sit, including when nothing has moved yet", () => {
    const applied = { ...application, id: "a2", currentStatus: "APPLIED" as const };
    const alsoApplied = { ...application, id: "a3", currentStatus: "APPLIED" as const };
    render(
      <DashboardView stats={baseStats} applications={[application, applied, alsoApplied]} readOnly={false} />,
    );

    const row = screen.getByText("Where things stand").parentElement!;
    expect(within(row).getByText("Applied")).toBeInTheDocument();
    expect(within(row).getByText("2")).toBeInTheDocument();
    expect(within(row).getByText("OA")).toBeInTheDocument();
    expect(within(row).getByText("1")).toBeInTheDocument();
  });

  // Stages nobody is sitting in would otherwise pad the row with six zeroes.
  test("omits stages with no applications in them", () => {
    render(<DashboardView stats={baseStats} applications={[application]} readOnly={false} />);

    const row = screen.getByText("Where things stand").parentElement!;
    expect(within(row).getByText("OA")).toBeInTheDocument();
    expect(within(row).queryByText("Offer")).not.toBeInTheDocument();
    expect(within(row).queryByText("Rejected")).not.toBeInTheDocument();
  });

  test("hides the stage-count row entirely when there are no applications", () => {
    render(<DashboardView stats={baseStats} applications={[]} readOnly={false} />);

    expect(screen.queryByText("Where things stand")).not.toBeInTheDocument();
  });

  test("shows an 'Add First Application' CTA in the empty pipeline state when not read-only", () => {
    render(<DashboardView stats={baseStats} applications={[]} readOnly={false} />);

    const cta = screen.getByText("+ Add First Application");
    expect(cta.closest("a")).toHaveAttribute("href", "/applications/new");
  });

  // Telling someone to add their first application while they are looking at the one they just
  // added reads as a bug, even though an empty pipeline is correct until a status transition.
  test("asks for a status update, not a first application, once one exists", () => {
    render(<DashboardView stats={baseStats} applications={[application]} readOnly={false} />);

    expect(screen.getByText("Move an application to another stage to see the flow diagram.")).toBeInTheDocument();
    expect(screen.queryByText("+ Add First Application")).not.toBeInTheDocument();
    expect(screen.getByText("Go to applications").closest("a")).toHaveAttribute("href", "/applications");
  });

  test("hides the 'Add First Application' CTA in the empty pipeline state when read-only", () => {
    render(<DashboardView stats={baseStats} applications={[]} readOnly />);

    expect(screen.queryByText("+ Add First Application")).not.toBeInTheDocument();
  });

  test("lists applications with their status badge", () => {
    render(<DashboardView stats={baseStats} applications={[application]} readOnly={false} />);

    expect(screen.getByText("Backend Engineer · Acme Corp")).toBeInTheDocument();
    // Scoped to the row: "OA" is now also a label in the stage-count summary above the chart.
    const row = screen.getByText("Backend Engineer · Acme Corp").closest("a")!;
    expect(within(row).getByText("OA")).toBeInTheDocument();
    const link = screen.getByText("Backend Engineer · Acme Corp").closest("a");
    expect(link).toHaveAttribute("href", "/applications/a1");
  });

  test("lists every application, not just the first few", () => {
    const applications = Array.from({ length: 8 }, (_, i) => ({
      ...application,
      id: `a${i + 1}`,
      company: `Company ${i + 1}`,
    }));
    render(<DashboardView stats={baseStats} applications={applications} readOnly={false} />);

    for (const app of applications) {
      expect(screen.getByText(`Backend Engineer · ${app.company}`)).toBeInTheDocument();
    }
  });

  test("readOnly mode shows 'Sample applications' and links into /demo/applications", () => {
    render(<DashboardView stats={baseStats} applications={[application]} readOnly />);

    expect(screen.getByText("Sample applications")).toBeInTheDocument();
    const link = screen.getByText("Backend Engineer · Acme Corp").closest("a");
    expect(link).toHaveAttribute("href", "/demo/applications/a1");
  });

  test("real dashboard mode shows 'Your applications' and its own quick actions", () => {
    render(<DashboardView stats={baseStats} applications={[application]} readOnly={false} />);

    expect(screen.getByText("Your applications")).toBeInTheDocument();
    expect(screen.getByText("View all applications")).toHaveAttribute("href", "/applications");
    expect(screen.getByText("Check your resume fit")).toHaveAttribute("href", "/profile");
    expect(screen.getByText("Report a problem")).toBeInTheDocument();
  });

  test("readOnly quick actions point a logged-out visitor at signup/login", () => {
    mockAuth(false);
    render(<DashboardView stats={baseStats} applications={[]} readOnly />);

    expect(screen.getByText("Sign up free")).toHaveAttribute("href", "/signup");
    expect(screen.getByText("Log in")).toHaveAttribute("href", "/login");
    expect(screen.queryByText("Report a problem")).not.toBeInTheDocument();
  });

  test("readOnly quick actions point an already-signed-in visitor at their own dashboard", () => {
    mockAuth(true);
    render(<DashboardView stats={baseStats} applications={[]} readOnly />);

    expect(screen.getByText("Go to your dashboard")).toHaveAttribute("href", "/dashboard");
    expect(screen.getByText("View your applications")).toHaveAttribute("href", "/applications");
    expect(screen.queryByText("Sign up free")).not.toBeInTheDocument();
  });
});
