"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import triviaBank from "@/data/trivia.json";
import { Button } from "@/components/Button";

interface TriviaQuestion {
  question: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
}

const QUESTIONS = triviaBank as TriviaQuestion[];

interface QuizState {
  index: number;
  /** Questions already shown this session - not persisted anywhere, just this
   * component's lifetime, which matches one backend wake-up. */
  seen: Set<number>;
}

/** Picks a question not yet seen this session. Once every question has been shown,
 * starts a fresh round rather than getting stuck - but still avoids repeating
 * whatever's on screen right now, so the round boundary itself never reads as a
 * literal repeat. */
function pickNext(seen: Set<number>, current: number): QuizState {
  let pool = QUESTIONS.map((_, i) => i).filter((i) => !seen.has(i));
  let nextSeen = seen;
  if (pool.length === 0) {
    pool = QUESTIONS.map((_, i) => i).filter((i) => i !== current);
    nextSeen = new Set();
  }
  const index = pool[Math.floor(Math.random() * pool.length)];
  return { index, seen: new Set(nextSeen).add(index) };
}

export function TriviaQuiz() {
  // Starts at a fixed index so server and client render the same question on
  // hydration (Math.random() during the initial render would mismatch between
  // SSR and the client); the effect below picks a random one right after mount.
  const [quiz, setQuiz] = useState<QuizState>({ index: 0, seen: new Set([0]) });
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  useEffect(() => {
    const pickInitial = setTimeout(() => {
      setQuiz((prev) => pickNext(prev.seen, prev.index));
    }, 0);

    return () => clearTimeout(pickInitial);
  }, []);

  const question = QUESTIONS[quiz.index];

  function selectAnswer(choiceIndex: number) {
    if (selected !== null) return;
    setSelected(choiceIndex);
    setScore((prev) => ({
      correct: prev.correct + (choiceIndex === question.correctIndex ? 1 : 0),
      total: prev.total + 1,
    }));
  }

  function goToNextQuestion() {
    setQuiz((prev) => pickNext(prev.seen, prev.index));
    setSelected(null);
  }

  return (
    <div className="card w-full max-w-md p-6 text-left shadow-sm">
      <div className="mb-4 flex items-center justify-between text-xs text-muted">
        <span>CS/SWE trivia while we wait</span>
        {score.total > 0 && (
          <span>
            Score: {score.correct}/{score.total}
          </span>
        )}
      </div>
      <p className="mb-4 text-sm font-medium text-foreground">{question.question}</p>
      <div className="flex flex-col gap-2">
        {question.choices.map((choice, index) => {
          const isCorrect = index === question.correctIndex;
          const isSelected = index === selected;
          let stateClasses = "border-surface-border";
          if (selected !== null) {
            if (isCorrect) {
              stateClasses = "border-green-600 bg-green-50 dark:bg-green-950";
            } else if (isSelected) {
              stateClasses = "border-red-600 bg-red-50 dark:bg-red-950";
            }
          }
          return (
            <button
              key={choice}
              type="button"
              onClick={() => selectAnswer(index)}
              disabled={selected !== null}
              className={`rounded-lg border px-3 py-2 text-left text-sm text-foreground transition-colors ${stateClasses} ${
                selected === null ? "hover:bg-brand/5" : ""
              }`}
            >
              {choice}
            </button>
          );
        })}
      </div>
      {selected !== null && (
        <p className="mt-4 text-xs text-foreground/70">{question.explanation}</p>
      )}
      <div className="mt-4 flex justify-end">
        <Button variant="secondary" size="sm" onClick={goToNextQuestion} className="ml-auto">
          <span className="inline-flex items-center gap-1.5">
            Next question
            <ArrowRight size={14} />
          </span>
        </Button>
      </div>
    </div>
  );
}
