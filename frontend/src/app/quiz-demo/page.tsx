"use client";

import { useState } from "react";
import { QuizComponent } from "@/components/quiz-component";

// Mock word data for demonstration
const mockWord: WordWithUserData = {
  id: "1",
  word: "serendipity",
  translation: "意外發現",
  definition_zh: "意外發現珍奇事物的能力",
  definition_en: "The ability to find something good without looking for it",
  difficulty: 7,
  part_of_speech: "noun",
  root_word: "serendipity",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  learn_count: 3,
  fluency: 45,
  examples: [
    {
      id: "1",
      word_id: "1",
      sentence: "Finding this book was pure serendipity.",
    },
  ],
};

export default function QuizDemoPage() {
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [latestFluency, setLatestFluency] = useState(mockWord.fluency);

  const handleQuizComplete = (newFluency: number) => {
    console.log("Quiz completed! New fluency:", newFluency);
    setLatestFluency(newFluency);
  };

  const handleQuizRemove = (wordId: string) => {
    console.log("Quiz removed for word:", wordId);
    setQuizCompleted(true);
  };

  const resetDemo = () => {
    setQuizCompleted(false);
    setLatestFluency(mockWord.fluency);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Quiz Component Demo</h1>
          <p className="text-muted-foreground">
            Test the quiz component with a sample word. Swipe right for "Yes"
            (know the word) or swipe left for "No" (don't know the word).
          </p>
        </div>

        {!quizCompleted ? (
          <QuizComponent
            word={mockWord}
            onComplete={handleQuizComplete}
            onRemove={handleQuizRemove}
          />
        ) : (
          <div className="text-center space-y-4">
            <div className="text-6xl mb-4">✅</div>
            <p className="text-lg font-semibold">Quiz completed!</p>
            <p className="text-muted-foreground">
              The quiz card has been removed, just like the recommendation
              cards.
            </p>
            <div className="space-y-2">
              <p className="text-sm">
                Latest fluency:{" "}
                <span className="font-semibold">{latestFluency}/100</span>
              </p>
            </div>
            <button
              onClick={resetDemo}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {!quizCompleted && (
          <div className="text-center text-sm text-muted-foreground">
            <p>Current fluency: {mockWord.fluency}/100</p>
            <p>Times learned: {mockWord.learn_count}</p>
          </div>
        )}
      </div>
    </div>
  );
}
