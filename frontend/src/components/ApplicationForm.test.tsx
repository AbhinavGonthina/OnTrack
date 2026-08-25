import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApplicationForm } from "./ApplicationForm";

describe("ApplicationForm", () => {
  test("submits the entered field values", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ApplicationForm submitLabel="Create" isSubmitting={false} error={null} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Company"), "Acme Corp");
    await user.type(screen.getByLabelText("Role"), "Backend Engineer");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const submitted = onSubmit.mock.calls[0][0];
    expect(submitted.company).toBe("Acme Corp");
    expect(submitted.role).toBe("Backend Engineer");
  });

  test("pre-fills fields from the initial value", () => {
    render(
      <ApplicationForm
        initial={{ company: "Acme", role: "SWE", jobDescriptionText: "desc", dateApplied: "2026-01-01" }}
        submitLabel="Save"
        isSubmitting={false}
        error={null}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Company")).toHaveValue("Acme");
    expect(screen.getByLabelText("Role")).toHaveValue("SWE");
  });

  test("shows the error message when given one", () => {
    render(
      <ApplicationForm submitLabel="Create" isSubmitting={false} error="Something broke" onSubmit={vi.fn()} />,
    );
    expect(screen.getByText("Something broke")).toBeInTheDocument();
  });
});
