"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent } from "./ui/card";

type WordCardProps = {
  wordId: string;
  word: string;
  definition_zh?: string;
  definition_en?: string;
  partOfSpeech?: string;
};

export function WordCard({
  wordId,
  word,
  definition_zh,
  definition_en,
  partOfSpeech,
}: WordCardProps) {
  const router = useRouter();

  // Use Chinese definition if available, otherwise fall back to English definition
  const displayDefinition = definition_zh || definition_en;

  return (
    <Card
      className="w-full max-w-sm"
      onClick={() => {
        router.push(`/vocabulary/${wordId}`);
      }}
    >
      <CardContent>
        <h2 className="text-lg font-semibold">
          {word}
          {partOfSpeech && ` (${partOfSpeech})`}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {displayDefinition}
        </p>
      </CardContent>
    </Card>
  );
}
