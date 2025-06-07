"use client";

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
  const handleQuizComplete = (newFluency: number) => {
    console.log("Quiz completed! New fluency:", newFluency);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Quiz Component Demo</h1>
          <p className="text-muted-foreground">
            Test the quiz component with a sample word. Click "Yes" to increase
            fluency by 30 points.
          </p>
        </div>

        <QuizComponent word={mockWord} onComplete={handleQuizComplete} />

        <div className="text-center text-sm text-muted-foreground">
          <p>Current fluency: {mockWord.fluency}/100</p>
          <p>Times learned: {mockWord.learn_count}</p>
        </div>
      </div>
    </div>
  );
}
