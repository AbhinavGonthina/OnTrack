"use client";

import { useEffect, useState } from "react";
import triviaBank from "@/data/trivia.json";

interface TriviaQuestion {
  question: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
}

const QUESTIONS = triviaBank as TriviaQuestion[];
const ROTATE_INTERVAL_MS = 18000;

function randomIndex(exclude?: number): number {
  if (QUESTIONS.length <= 1) return 0;
  let index = Math.floor(Math.random() * QUESTIONS.length);
  while (index === exclude) {
    index = Math.floor(Math.random() * QUESTIONS.length);
  }
  return index;
}

export function TriviaQuiz() {
  // Starts at a fixed index so server and client render the same question on
  // hydration (Math.random() during the initial render would mismatch between
  // SSR and the client); the effect below picks a random one right after mount.
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  useEffect(() => {
    const pickInitial = setTimeout(() => {
      setQuestionIndex((current) => randomIndex(current));
    }, 0);

    const interval = setInterval(() => {
      setQuestionIndex((current) => randomIndex(current));
      setSelected(null);
    }, ROTATE_INTERVAL_MS);

    return () => {
      clearTimeout(pickInitial);
      clearInterval(interval);
    };
  }, []);

  const question = QUESTIONS[questionIndex];

  function selectAnswer(choiceIndex: number) {
    if (selected !== null) return;
    setSelected(choiceIndex);
    setScore((prev) => ({
      correct: prev.correct + (choiceIndex === question.correctIndex ? 1 : 0),
      total: prev.total + 1,
    }));
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
    </div>
  );
}
