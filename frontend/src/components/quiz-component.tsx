"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { learnWord } from "@/lib/api/vocabulary";

interface QuizComponentProps {
  word: WordWithUserData;
  onComplete?: (newFluency: number) => void;
}

export function QuizComponent({ word, onComplete }: QuizComponentProps) {
  const [isCompleted, setIsCompleted] = useState(false);
  const [result, setResult] = useState<{
    fluency: number;
    learn_count: number;
  } | null>(null);

  const learnWordMutation = useMutation({
    mutationFn: ({ correct }: { correct: boolean }) =>
      learnWord(word.id, { correct }),
    onSuccess: (response) => {
      setResult(response);
      setIsCompleted(true);
      onComplete?.(response.fluency);
    },
    onError: (error) => {
      console.error("Failed to update learning progress:", error);
      // TODO: Add proper error handling/toast notification
    },
  });

  const handleAnswer = (correct: boolean) => {
    if (learnWordMutation.isPending || isCompleted) return;
    learnWordMutation.mutate({ correct });
  };

  if (isCompleted && result) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <h2 className="text-lg font-semibold">{word.word}</h2>
            <p className="text-base text-muted-foreground">Quiz completed!</p>
            <div className="space-y-2">
              <p className="text-sm">
                Fluency:{" "}
                <span className="font-semibold">{result.fluency}/100</span>
              </p>
              <p className="text-sm">
                Times learned:{" "}
                <span className="font-semibold">{result.learn_count}</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent>
        <div className="flex flex-col justify-center items-start gap-2">
          <div className="flex flex-row justify-center items-end gap-2">
            <h2 className="text-lg font-semibold">{word.word}</h2>
            <h2 className="text-muted-foreground"> {word.translation}</h2>
          </div>
          <p className="text-base text-muted-foreground">
            你知道這個字是什麼意思了嗎？
          </p>
          <div className="grid grid-cols-2 gap-2 w-full">
            <Button
              onClick={() => handleAnswer(false)}
              disabled={learnWordMutation.isPending}
              className="w-full bg-red-600 text-foreground font-bold text-"
            >
              {learnWordMutation.isPending ? "..." : "No"}
            </Button>
            <Button
              onClick={() => handleAnswer(true)}
              disabled={learnWordMutation.isPending}
              className="w-full bg-green-600 text-foreground font-bold"
            >
              {learnWordMutation.isPending ? "..." : "Yes"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
