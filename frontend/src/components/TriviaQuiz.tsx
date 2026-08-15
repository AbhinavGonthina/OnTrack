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
  const [questionIndex, setQuestionIndex] = useState(() => randomIndex());
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  useEffect(() => {
    const interval = setInterval(() => {
      setQuestionIndex((current) => randomIndex(current));
      setSelected(null);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(interval);
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
    <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-6 text-left dark:border-white/15 dark:bg-black">
      <div className="mb-4 flex items-center justify-between text-xs text-black/50 dark:text-white/50">
        <span>CS/SWE trivia while we wait</span>
        {score.total > 0 && (
          <span>
            Score: {score.correct}/{score.total}
          </span>
        )}
      </div>
      <p className="mb-4 text-sm font-medium text-black dark:text-white">{question.question}</p>
      <div className="flex flex-col gap-2">
        {question.choices.map((choice, index) => {
          const isCorrect = index === question.correctIndex;
          const isSelected = index === selected;
          let stateClasses = "border-black/10 dark:border-white/15";
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
              className={`rounded-lg border px-3 py-2 text-left text-sm text-black transition-colors dark:text-white ${stateClasses} ${
                selected === null ? "hover:bg-black/5 dark:hover:bg-white/10" : ""
              }`}
            >
              {choice}
            </button>
          );
        })}
      </div>
      {selected !== null && (
        <p className="mt-4 text-xs text-black/70 dark:text-white/70">{question.explanation}</p>
      )}
    </div>
  );
}
