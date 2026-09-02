import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardView } from "./DashboardView";
import type { ApplicationResponse, StatsResponse } from "@/lib/types";

const baseStats: StatsResponse = {
  totalApplications: 3,
  responseRate: 66.7,
  oaRate: 33.3,
  onsiteRate: 0,
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

describe("DashboardView", () => {
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

  test("shows an 'Add First Application' CTA in the empty pipeline state when not read-only", () => {
    render(<DashboardView stats={baseStats} applications={[]} readOnly={false} />);

    const cta = screen.getByText("+ Add First Application");
    expect(cta.closest("a")).toHaveAttribute("href", "/applications/new");
  });

  test("hides the 'Add First Application' CTA in the empty pipeline state when read-only", () => {
    render(<DashboardView stats={baseStats} applications={[]} readOnly />);

    expect(screen.queryByText("+ Add First Application")).not.toBeInTheDocument();
  });

  test("lists applications with their status badge", () => {
    render(<DashboardView stats={baseStats} applications={[application]} readOnly={false} />);

    expect(screen.getByText("Backend Engineer · Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("OA")).toBeInTheDocument();
    const link = screen.getByText("Backend Engineer · Acme Corp").closest("a");
    expect(link).toHaveAttribute("href", "/applications/a1");
  });

  test("readOnly mode links into /demo/applications and hides 'View all'", () => {
    render(<DashboardView stats={baseStats} applications={[application]} readOnly />);

    expect(screen.getByText("Sample applications")).toBeInTheDocument();
    expect(screen.queryByText("View all")).not.toBeInTheDocument();
    const link = screen.getByText("Backend Engineer · Acme Corp").closest("a");
    expect(link).toHaveAttribute("href", "/demo/applications/a1");
  });

  test("real dashboard mode shows a 'View all' link", () => {
    render(<DashboardView stats={baseStats} applications={[application]} readOnly={false} />);

    expect(screen.getByText("Your applications")).toBeInTheDocument();
    expect(screen.getByText("View all")).toHaveAttribute("href", "/applications");
  });
});
