"use client";

import { useState, useEffect } from "react";
import { RecommendationCard } from "@/components/recommendation-card";
import { AILoadingAnimation } from "@/components/ai-loading-animation";
import { getRecommendations } from "@/lib/api/vocabulary";
import { useQuery } from "@tanstack/react-query";

export default function RecommendationsPage() {
  const [localWords, setLocalWords] = useState<WordWithUserData[]>([]);
  const [hasAttemptedRefetch, setHasAttemptedRefetch] = useState(false);

  const query = useQuery({
    queryKey: ["recommendations"],
    queryFn: () => getRecommendations()
  });

  // 當查詢數據更新時，更新本地狀態
  useEffect(() => {
    if (query.data?.words) {
      setLocalWords(query.data.words);
      // 重置重新獲取狀態，因為我們有新數據了
      setHasAttemptedRefetch(false);
    }
  }, [query.data?.words]);

  // 當所有推薦都被移除時，自動獲取新推薦
  useEffect(() => {
    const shouldRefetch =
      localWords.length === 0 && // 沒有本地推薦
      !query.isLoading && // 不在載入中
      !query.error && // 沒有錯誤
      !hasAttemptedRefetch && // 還沒嘗試過重新獲取
      query.data; // 之前有過數據（不是初始狀態）

    if (shouldRefetch) {
      setHasAttemptedRefetch(true);
      query.refetch();
    }
  }, [localWords.length, query.isLoading, query.error, hasAttemptedRefetch, query.data, query]);

  // 處理卡片移除
  const handleRemoveCard = (wordId: string) => {
    setLocalWords((prev) => prev.filter((word) => word.id !== wordId));
  };

  return (
    <div className="h-full w-full px-6 py-8 overflow-auto">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold">推薦</h1>
        <p className="text-sm text-muted-foreground mt-1">根據你的學習進度，我們推薦你學習這些單字。右滑加入自己的單字庫，左滑移除這個推薦</p>
        <div className="mt-6 flex flex-col gap-4">
          {query.isLoading ? (
            <AILoadingAnimation />
          ) : query.error ? (
            <div className="h-full w-full flex flex-col items-center justify-center">
              <div className="text-6xl mb-4">⚠️</div>
              <p className="text-lg text-muted-foreground text-center mb-2">載入推薦內容時發生錯誤</p>
              <p className="text-sm text-muted-foreground text-center">請稍後再試或聯繫客服支援</p>
            </div>
          ) : localWords.length === 0 ? (
            // 如果正在重新獲取，顯示載入動畫，否則顯示空狀態
            hasAttemptedRefetch && query.isFetching ? (
              <div className="flex flex-col items-center justify-center">
                <AILoadingAnimation />
                <p className="text-sm text-muted-foreground text-center mt-4">正在為你準備更多推薦...</p>
              </div>
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center">
                <div className="text-6xl mb-4">🎯</div>
                <p className="text-lg text-muted-foreground text-center mb-2">目前沒有推薦內容</p>
                <p className="text-sm text-muted-foreground text-center">繼續學習現有單字，我們很快就會為你準備個人化推薦！</p>
              </div>
            )
          ) : (
            localWords.map((word) => (
              <div key={word.id} className="transition-all duration-300 ease-out">
                <RecommendationCard word={word} onRemove={handleRemoveCard} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
