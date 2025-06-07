"use client";

import { NewsCard } from "@/components/news-card";
import { NewsCardSkeleton } from "@/components/news-card-skeleton";
import { Button } from "@/components/ui/button";
import { generateNews } from "@/lib/api/news";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";

export default function NewsPage() {
  const query = useQuery({
    queryKey: ["news"],
    queryFn: generateNews,
    retry: 2,
  });

  const handleRetry = () => {
    query.refetch();
  };

  return (
    <div className="h-full w-full px-6 py-8 overflow-auto">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold">新聞</h1>
        <p className="text-sm text-muted-foreground mt-1">
          根據你的學習進度和興趣自動生成的個人化新聞內容。
        </p>

        <div className="mt-6">
          {query.isLoading ? (
            <NewsCardSkeleton />
          ) : query.error ? (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                無法生成新聞內容，請稍後再試。
              </p>
              <Button onClick={handleRetry} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                重新生成
              </Button>
            </div>
          ) : query.data?.all_news ? (
            <div className="flex flex-col gap-4">
              {query.data.all_news.map((news) => (
                <NewsCard key={news.id} news={news} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <p className="text-sm text-muted-foreground">
                沒有可用的新聞內容。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
