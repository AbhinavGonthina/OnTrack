import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TriviaQuiz } from "./TriviaQuiz";

// Matches src/data/trivia.json's current length - a second direct JSON import here (on top
// of TriviaQuiz.tsx's own) trips up Vite's import resolution in this test environment for
// reasons unrelated to the feature itself, so the count is just pinned instead.
const TOTAL_TRIVIA_QUESTIONS = 37;

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

  test("does not auto-advance on its own, even after a long wait - only the button changes the question", () => {
    vi.useFakeTimers();
    try {
      const { container } = render(<TriviaQuiz />);
      // Flushes the one-time post-mount randomize (the setTimeout(0) that avoids a
      // hydration mismatch) - not what's under test here.
      vi.advanceTimersByTime(100);
      const questionAfterMount = container.querySelector("p.mb-4")!.textContent;

      // Comfortably longer than the old auto-rotate interval this replaced.
      vi.advanceTimersByTime(60000);

      expect(container.querySelector("p.mb-4")!.textContent).toBe(questionAfterMount);
    } finally {
      vi.useRealTimers();
    }
  });

  test("clicking 'Next question' moves to a different question and clears the previous selection", () => {
    render(<TriviaQuiz />);

    fireEvent.click(screen.getByText("O(1)"));
    expect(screen.getByText("Score: 0/1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Next question/ }));

    expect(
      screen.queryByText("What is the average time complexity of searching in a balanced binary search tree?"),
    ).not.toBeInTheDocument();
    // Answering carries over as a running score, but the new question starts unanswered.
    expect(screen.getByText("Score: 0/1")).toBeInTheDocument();
  });

  test("never repeats a question within a session until every question has been shown", () => {
    const { container } = render(<TriviaQuiz />);

    const seenQuestions = new Set<string>();
    const getCurrentQuestion = () => container.querySelector("p.mb-4")!.textContent!;

    for (let i = 0; i < TOTAL_TRIVIA_QUESTIONS; i++) {
      const questionText = getCurrentQuestion();
      expect(seenQuestions.has(questionText)).toBe(false);
      seenQuestions.add(questionText);
      fireEvent.click(screen.getByRole("button", { name: /Next question/ }));
    }
  });
});
