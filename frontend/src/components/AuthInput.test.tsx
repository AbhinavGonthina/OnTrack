import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Lock, Mail } from "lucide-react";
import { AuthInput } from "./AuthInput";

describe("AuthInput", () => {
  test("renders the label and forwards input props", () => {
    render(<AuthInput icon={Mail} label="Email" type="email" value="" onChange={() => {}} />);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("type", "email");
  });

  test("calls onChange when the user types", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<AuthInput icon={Mail} label="Email" type="email" value="" onChange={onChange} />);

    await user.type(screen.getByLabelText("Email"), "a");

    expect(onChange).toHaveBeenCalled();
  });

  test("does not render a visibility toggle for non-password inputs", () => {
    render(<AuthInput icon={Mail} label="Email" type="email" value="" onChange={() => {}} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  test("toggles password visibility when the eye button is clicked", async () => {
    const user = userEvent.setup();
    render(<AuthInput icon={Lock} label="Password" type="password" value="secret" onChange={() => {}} />);

    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(input).toHaveAttribute("type", "text");

    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(input).toHaveAttribute("type", "password");
  });
});
