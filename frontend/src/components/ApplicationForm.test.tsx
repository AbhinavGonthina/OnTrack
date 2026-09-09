import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApplicationForm } from "./ApplicationForm";

function renderForm(props: Partial<React.ComponentProps<typeof ApplicationForm>> = {}) {
  const onSubmit = props.onSubmit ?? vi.fn();
  render(
    <ApplicationForm
      submitLabel="Create application"
      isSubmitting={false}
      error={null}
      cancelHref="/applications"
      {...props}
      onSubmit={onSubmit}
    />,
  );
  return { onSubmit };
}

describe("ApplicationForm", () => {
  test("submits the entered field values", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    await user.type(screen.getByLabelText("Company"), "Acme Corp");
    await user.type(screen.getByLabelText("Role"), "Backend Engineer");
    await user.click(screen.getByRole("button", { name: "Create application" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const submitted = onSubmit.mock.calls[0][0];
    expect(submitted.company).toBe("Acme Corp");
    expect(submitted.role).toBe("Backend Engineer");
  });

  test("pre-fills fields from the initial value", () => {
    renderForm({
      initial: { company: "Acme", role: "SWE", jobDescriptionText: "desc", dateApplied: "2026-01-01" },
      submitLabel: "Save changes",
    });

    expect(screen.getByLabelText("Company")).toHaveValue("Acme");
    expect(screen.getByLabelText("Role")).toHaveValue("SWE");
    expect(screen.getByLabelText("Date applied")).toHaveValue("2026-01-01");
  });

  test("shows the error message when given one", () => {
    renderForm({ error: "Something broke" });
    expect(screen.getByText("Something broke")).toBeInTheDocument();
  });

  test("points Cancel at the given href", () => {
    renderForm({ cancelHref: "/applications/abc-123" });
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute("href", "/applications/abc-123");
  });

  test("labels the job description as the AI fit-analysis input", () => {
    renderForm();
    expect(screen.getByText("AI fit analysis input")).toBeInTheDocument();
  });

  // POST /api/applications accepts no status - the server always seeds APPLIED as the first
  // status event - so this field must never look editable, or a chosen value would be
  // silently discarded.
  test("shows the starting status as read-only when creating", () => {
    renderForm({ showInitialStatus: true });

    const field = screen.getByLabelText(/Starting status/);
    expect(field).toHaveValue("Applied");
    expect(field).toBeDisabled();
    expect(field).toHaveAttribute("readonly");
  });

  test("omits the starting status when editing an existing application", () => {
    renderForm({ submitLabel: "Save changes" });
    expect(screen.queryByLabelText(/Starting status/)).not.toBeInTheDocument();
  });

  test("disables submission while a save is in flight", () => {
    renderForm({ isSubmitting: true });
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
  });
});
