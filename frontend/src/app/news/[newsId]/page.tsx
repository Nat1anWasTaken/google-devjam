"use client";

import { useState } from "react";
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
  PartyPopper,
  Swords,
  Tag,
  VolumeOff,
} from "lucide-react";
import Markdown from "react-markdown";
import { mapLevelToDifficulty } from "@/lib/utils";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { QuizComponentSkeleton } from "@/components/quiz-component-skeleton";
import { QuizComponent } from "@/components/quiz-component";
import { useNewsVocabulary } from "@/hooks/use-news-vocabulary";
import AudioPlayer from "@/components/audio-player";

export default function NewsPage() {
  const params = useParams();
  const router = useRouter();
  const newsId = params.newsId as string;

  // State to track completed/removed quizzes
  const [completedQuizzes, setCompletedQuizzes] = useState<Set<string>>(
    new Set()
  );

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

  const { wordsQuery, wordsToQuiz } = useNewsVocabulary(wordInNews);

  // Filter out completed quizzes
  const remainingQuizzes = wordsToQuiz.filter(
    (word) => !completedQuizzes.has(word.id)
  );

  // Handle quiz removal
  const handleQuizRemove = (wordId: string) => {
    setCompletedQuizzes((prev) => new Set([...prev, wordId]));
  };

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

        {/* Audio Player */}
        {news.audio_url ? (
          <AudioPlayer audioUrl={news.audio_url} newsId={news.id} />
        ) : (
          <div className="flex flex-row justify-start items-center gap-2 text-sm text-muted-foreground">
            <VolumeOff className="h-4 w-4" />
            此新聞沒有音訊檔案可供播放。
          </div>
        )}

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
          <span className="text-muted-foreground">
            （右滑知道、左滑不知道）
          </span>
        </div>
        {wordsQuery.isLoading ? (
          <QuizComponentSkeleton />
        ) : (
          <div className="space-y-4">
            {remainingQuizzes.length > 0 ? (
              remainingQuizzes.map((word) => (
                <QuizComponent
                  key={word.id}
                  word={word}
                  onRemove={handleQuizRemove}
                />
              ))
            ) : wordsToQuiz.length > 0 ? (
              <div className="flex flex-row justify-center items-center gap-2">
                <PartyPopper />
                <p className="text-sm text-muted-foreground">
                  所有測驗已完成！
                </p>
              </div>
            ) : (
              <div className="flex flex-row justify-center items-center gap-2">
                <PartyPopper />
                <p className="text-sm text-muted-foreground">沒有測驗</p>
              </div>
            )}
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
