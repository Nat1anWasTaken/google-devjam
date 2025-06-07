"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent } from "./ui/card";

type WordCardProps = {
  wordId: string;
  word: string;
  definition?: string;
};

export function WordCard({ wordId, word, definition }: WordCardProps) {
  const router = useRouter();

  return (
    <Card
      className="w-full max-w-sm"
      onClick={() => {
        router.push(`/vocabulary/${wordId}`);
      }}
    >
      <CardContent>
        <h2 className="text-lg font-semibold">{word} (n.)</h2>
        <p className="text-sm text-muted-foreground mt-1">{definition}</p>
      </CardContent>
    </Card>
  );
}
