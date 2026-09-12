import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileView } from "./ProfileView";
import { useAiUsage } from "../context/AiUsageContext";

vi.mock("../context/AiUsageContext", () => ({
  useAiUsage: vi.fn(),
}));

function baseProps() {
  return {
    resumeText: "# Experience\n- Built things",
    onResumeTextChange: vi.fn(),
    onSave: vi.fn(),
    isSaving: false,
    isDirty: false,
    lastSavedAt: null,
    saveError: null,
    onUpload: vi.fn(),
    isUploading: false,
    uploadError: null,
    onNormalize: vi.fn(),
    isNormalizing: false,
    normalizeError: null,
    strength: null,
    onScoreStrength: vi.fn(),
    isScoringStrength: false,
    strengthError: null,
  };
}

describe("ProfileView", () => {
  beforeEach(() => {
    vi.mocked(useAiUsage).mockReturnValue({ aiUsage: null, refresh: vi.fn() });
  });

  test("Save is disabled when there are no unsaved changes, and shows the Saved badge", () => {
    render(<ProfileView {...baseProps()} />);

    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });

  test("shows an Unsaved changes badge and an enabled Save button when dirty", async () => {
    const props = { ...baseProps(), isDirty: true };
    render(<ProfileView {...props} />);

    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    const saveButton = screen.getByRole("button", { name: "Save" });
    expect(saveButton).toBeEnabled();

    await userEvent.click(saveButton);
    expect(props.onSave).toHaveBeenCalled();
  });

  test("defaults to the Formatted Preview tab and switches to the Raw Text Editor", async () => {
    render(<ProfileView {...baseProps()} />);

    expect(screen.getByText("Built things")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Raw Text Editor" }));

    expect(screen.getByRole("textbox")).toHaveValue("# Experience\n- Built things");
    expect(screen.getByText("5 words · 27 characters")).toBeInTheDocument();
  });

  test("typing in the raw editor calls onResumeTextChange", async () => {
    const props = { ...baseProps(), resumeText: "" };
    render(<ProfileView {...props} />);
    await userEvent.click(screen.getByRole("button", { name: "Raw Text Editor" }));

    await userEvent.type(screen.getByRole("textbox"), "x");

    expect(props.onResumeTextChange).toHaveBeenCalledWith("x");
  });

  test("clicking Normalize with Gemini calls onNormalize", async () => {
    const props = baseProps();
    render(<ProfileView {...props} />);

    await userEvent.click(screen.getByRole("button", { name: /Normalize with Gemini/ }));

    expect(props.onNormalize).toHaveBeenCalled();
  });

  test("clicking Analyze calls onScoreStrength, and a strength result renders the score, categories, and recommendations", async () => {
    const props = baseProps();
    const { rerender } = render(<ProfileView {...props} />);

    await userEvent.click(screen.getByRole("button", { name: "Analyze" }));
    expect(props.onScoreStrength).toHaveBeenCalledWith(false);

    rerender(
      <ProfileView
        {...props}
        strength={{
          score: 80,
          categories: [{ name: "Impact & Metrics", score: 60, feedback: "Quantify more bullets." }],
          recommendations: ["Add metrics"],
          cached: false,
        }}
      />,
    );

    expect(screen.getByText("80")).toBeInTheDocument();
    expect(screen.getByText("Impact & Metrics")).toBeInTheDocument();
    expect(screen.getByText("60")).toBeInTheDocument();
    expect(screen.getByText("Quantify more bullets.")).toBeInTheDocument();
    expect(screen.getByText("Add metrics")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Re-analyze" })).toBeInTheDocument();
  });

  // A stored score has to be visually distinguishable from one that just ran, or the user has no
  // way to know whether clicking cost them a Gemini call.
  test("marks a stored score as a saved result", () => {
    render(
      <ProfileView
        {...baseProps()}
        strength={{
          score: 72,
          categories: [{ name: "Clarity & Conciseness", score: 65, feedback: "Tight enough." }],
          recommendations: ["Trim the summary"],
          cached: true,
        }}
      />,
    );

    expect(screen.getByText("72")).toBeInTheDocument();
    expect(screen.getByText("Saved result")).toBeInTheDocument();
  });

  // Without force, Re-analyze would hand back the same cached score and appear to do nothing.
  test("re-analyzing an existing score forces a recompute", async () => {
    const props = baseProps();
    render(
      <ProfileView
        {...props}
        strength={{
          score: 72,
          categories: [{ name: "Clarity & Conciseness", score: 65, feedback: "Tight enough." }],
          recommendations: ["Trim the summary"],
          cached: true,
        }}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Re-analyze" }));

    expect(props.onScoreStrength).toHaveBeenCalledWith(true);
  });

  test("shows the AI usage badge when usage data is available", () => {
    vi.mocked(useAiUsage).mockReturnValue({ aiUsage: { remaining: 14, limit: 20 }, refresh: vi.fn() });

    render(<ProfileView {...baseProps()} />);

    expect(screen.getByText("14 / 20 AI calls left today")).toBeInTheDocument();
  });

  test("selecting a file in the upload dropzone calls onUpload", async () => {
    const props = baseProps();
    const { container } = render(<ProfileView {...props} />);
    const file = new File(["irrelevant"], "resume.pdf", { type: "application/pdf" });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(input, file);

    expect(props.onUpload).toHaveBeenCalledWith(file);
  });

  test("shows the uploadError message when present", () => {
    render(<ProfileView {...baseProps()} uploadError="File type not supported." />);
    expect(screen.getByText("File type not supported.")).toBeInTheDocument();
  });
});
