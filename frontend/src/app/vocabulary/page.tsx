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
          這裡是你的單字庫，所有學習過的單字將會在這裡顯示。
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
                definition={word.definition}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
