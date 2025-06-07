"use client";

import { getSingleNews } from "@/lib/api/news";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  ArrowLeftIcon,
  Calendar,
  ExternalLink,
  Swords,
  Tag,
} from "lucide-react";
import Markdown from "react-markdown";
import { mapLevelToDifficulty } from "@/lib/utils";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { QuizComponentSkeleton } from "@/components/quiz-component-skeleton";
import { QuizComponent } from "@/components/quiz-component";
import { useNewsVocabulary } from "@/hooks/use-news-vocabulary";

export default function NewsPage() {
  const params = useParams();
  const router = useRouter();
  const newsId = params.newsId as string;

  const {
    data: newsResponse,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ["news", newsId],
    queryFn: () => getSingleNews(newsId),
    enabled: !!newsId,
  });

  const news = newsResponse?.news;

  const wordInNews = news?.word_in_news || [];

  const { wordsQuery, wordsToQuiz, updateFluencyMutation } =
    useNewsVocabulary(wordInNews);

  if (loading) {
    return (
      <div className="py-8 px-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Navigation button skeleton */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/news")}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              返回新聞列表
            </Button>
          </div>

          {/* Title skeleton */}
          <div className="flex items-start justify-between gap-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-16" />
          </div>

          {/* Content skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>

          <Skeleton className="h-px w-full" />

          {/* Metadata skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-5 w-16" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !news) {
    return (
      <div className="py-8 px-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Navigation button */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/news")}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              返回新聞列表
            </Button>
          </div>

          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {error?.message || "無法載入新聞內容"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation button */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/news")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            返回新聞列表
          </Button>
        </div>

        {/* Title and level */}
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl md:text-3xl font-bold leading-tight">
            {news.title}
          </h1>
          <DifficultyBadge difficulty={mapLevelToDifficulty(news.level)} />
        </div>

        {/* Article content */}
        <div className="prose prose-lg max-w-none">
          <div className="whitespace-pre-wrap text-base leading-relaxed text-foreground">
            <Markdown>{news.content}</Markdown>
          </div>
        </div>

        <Separator />

        {/* Quiz section */}
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Swords className="h-4 w-4" />
          <span>牛刀小試</span>
        </div>
        {wordsQuery.isLoading ? (
          <QuizComponentSkeleton />
        ) : (
          <div className="space-y-4">
            {wordsToQuiz.length > 0 &&
              wordsToQuiz.map((word) => (
                <QuizComponent
                  key={word.id}
                  word={word}
                  onComplete={() => {
                    // Handle quiz completion
                  }}
                />
              ))}
          </div>
        )}
        <Separator />

        {/* Keywords section */}
        {news.keywords.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Tag className="h-4 w-4" />
              <span>關鍵字</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {news.keywords.map((keyword, index) => (
                <Badge key={index} variant="outline" className="text-sm">
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Related words section */}
        {news.word_in_news.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Tag className="h-4 w-4" />
              <span>相關單字</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {news.word_in_news.map((word, index) => (
                <Badge key={index} variant="secondary" className="text-sm">
                  {word}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Sources section */}
        {news.source.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ExternalLink className="h-4 w-4" />
              <span>來源</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {news.source.map((src, index) => (
                <Badge key={index} variant="outline" className="text-sm">
                  {src}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Timestamps */}
        <div className="pt-4 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              發布時間:{" "}
              {new Date(news.created_at).toLocaleDateString("zh-TW", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          {news.updated_at !== news.created_at && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <Calendar className="h-4 w-4" />
              <span>
                更新時間:{" "}
                {new Date(news.updated_at).toLocaleDateString("zh-TW", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
