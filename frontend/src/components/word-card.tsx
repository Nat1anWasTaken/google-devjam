"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { getDifficultyColor } from "@/lib/utils";

type WordCardProps = {
  word: Word;
};

export function WordCard({ word }: WordCardProps) {
  const router = useRouter();

  // Use Chinese definition if available, otherwise fall back to English definition
  const displayDefinition = word.definition_zh || word.definition_en;

  return (
    <Card
      className="w-full max-w-sm"
      onClick={() => {
        router.push(`/vocabulary/${word.id}`);
      }}
    >
      <CardContent>
        <div className="flex flex-row justify-between items-center">
          <h2 className="text-lg font-semibold">{word.word}</h2>
          {word.part_of_speech && (
            <div className="flex justify-center items-center gap-2">
              <Badge variant="outline" className="text-muted-foreground">
                {word.part_of_speech ? word.part_of_speech : "Unknown"}
              </Badge>
              <Badge className={`text-white ${getDifficultyColor(word.difficulty)}`}>難度 {word.difficulty}/10</Badge>
            </div>
          )}
        </div>

        <p className="text-sm text-muted-foreground mt-1">{displayDefinition}</p>
      </CardContent>
    </Card>
  );
}
