"use client";

import { Card, CardHeader } from "./ui/card";

type WordCardProps = {
  word: string;
};

export function WordCard({ word }: WordCardProps) {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>{word}</CardHeader>
    </Card>
  );
}
