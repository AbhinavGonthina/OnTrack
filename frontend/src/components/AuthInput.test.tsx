import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Mail } from "lucide-react";
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
});
