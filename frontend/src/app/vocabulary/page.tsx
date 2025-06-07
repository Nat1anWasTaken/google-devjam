"use client";

import { WordCard } from "@/components/word-card";
import { WordCardSkeleton } from "@/components/word-card-skeleton";
import { getWords } from "@/lib/api/vocabulary";
import { useQuery } from "@tanstack/react-query";

export default function VocabularyPage() {
  const query = useQuery({
    queryKey: ["vocabulary"],
    queryFn: () => getWords(),
  });

  return (
    <div className="h-full w-full px-6 py-8 overflow-auto">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold">單字庫</h1>
        <p className="text-sm text-muted-foreground mt-1">
          你有興趣的單字都在這裡，點擊查看詳細資訊或添加新單字。
        </p>
        <div className="mt-6 flex flex-col gap-4">
          {query.isLoading ? (
            <>
              <WordCardSkeleton />
              <WordCardSkeleton />
              <WordCardSkeleton />
            </>
          ) : query.data?.words.length === 0 ? (
            <div className="h-full w-full flex flex-col items-center justify-center">
              <p className="text-sm">這裡空空如也...</p>
            </div>
          ) : (
            query.data?.words.map((word) => (
              <WordCard
                key={word.id}
                wordId={word.id}
                word={word.word}
                definition_zh={word.definition_zh}
                definition_en={word.definition_en}
                partOfSpeech={word.part_of_speech}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
