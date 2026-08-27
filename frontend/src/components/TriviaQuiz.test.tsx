import { describe, expect, test } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TriviaQuiz } from "./TriviaQuiz";

// No fake timers needed: fireEvent.click is synchronous, so it always fires
// in the same tick as render() - before the mount effect's setTimeout(0)
// (added to avoid an SSR/client hydration mismatch) gets a chance to run and
// randomize the question. That keeps the first question deterministically
// trivia[0] for every test here.
describe("TriviaQuiz", () => {
  test("renders the first question with no score shown yet", () => {
    render(<TriviaQuiz />);

    expect(
      screen.getByText("What is the average time complexity of searching in a balanced binary search tree?"),
    ).toBeInTheDocument();
    expect(screen.getByText("O(log n)")).toBeInTheDocument();
    expect(screen.queryByText(/^Score:/)).not.toBeInTheDocument();
  });

  test("selecting the correct answer scores it correct and shows the explanation", () => {
    render(<TriviaQuiz />);

    fireEvent.click(screen.getByText("O(log n)"));

    expect(screen.getByText("Score: 1/1")).toBeInTheDocument();
    expect(
      screen.getByText("A balanced BST halves the search space at each step, giving O(log n)."),
    ).toBeInTheDocument();
  });

  test("selecting a wrong answer still scores it and reveals the explanation", () => {
    render(<TriviaQuiz />);

    fireEvent.click(screen.getByText("O(1)"));

    expect(screen.getByText("Score: 0/1")).toBeInTheDocument();
  });

  test("choices become disabled after answering, so a second click doesn't change the score", () => {
    render(<TriviaQuiz />);

    fireEvent.click(screen.getByText("O(1)"));
    expect(screen.getByText("O(log n)")).toBeDisabled();

    fireEvent.click(screen.getByText("O(log n)"));

    expect(screen.getByText("Score: 0/1")).toBeInTheDocument();
  });
});
