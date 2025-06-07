"use client";

import { WordCard } from "@/components/word-card";
import { WordCardSkeleton } from "@/components/word-card-skeleton";
import { getWords } from "@/lib/api/vocabulary";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";

export default function VocabularyPage() {
  const query = useQuery({
    queryKey: ["vocabulary"],
    queryFn: () => getWords()
  });

  return (
    <div className="h-full w-full px-6 py-8 overflow-auto">
      <div className="max-w-2xl mx-auto h-full">
        <h1 className="text-4xl font-bold">單字庫</h1>
        <p className="text-sm text-muted-foreground mt-1">你有興趣的單字都在這裡，點擊查看詳細資訊或添加新單字。</p>
        <div className="mt-6 flex flex-col gap-4">
          {query.isLoading ? (
            <>
              <WordCardSkeleton />
              <WordCardSkeleton />
              <WordCardSkeleton />
            </>
          ) : query.data?.words.length === 0 ? (
            <div className="h-full w-full flex flex-col items-center justify-center">
              <p className="text-lg">這裡空空如也...</p>
              <p className="text-sm text-muted-foreground mt-1">
                你還沒有添加任何單字，點擊下方的 <Plus className="h-4 w-4" /> 新增你想學習的單字！
              </p>
            </div>
          ) : (
            query.data?.words.map((word) => <WordCard key={word.id} word={word} />)
          )}
        </div>
      </div>
    </div>
  );
}
