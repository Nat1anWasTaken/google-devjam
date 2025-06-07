"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, ExternalLink, Tag } from "lucide-react";
import { useRouter } from "next/navigation";
import Markdown from "react-markdown";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { mapLevelToDifficulty } from "@/lib/utils";

interface NewsCardProps {
  news: News;
}

export function NewsCard({ news }: NewsCardProps) {
  const router = useRouter();

  return (
    <Card
      className="w-full"
      onClick={() => {
        router.push("/news/" + news.id);
      }}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-xl leading-tight">{news.title}</CardTitle>
          <DifficultyBadge difficulty={mapLevelToDifficulty(news.level)} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="prose prose-sm max-w-none">
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            <Markdown>{news.content.slice(0, 200) + "..."}</Markdown>
          </div>
        </div>

        {news.keywords.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Tag className="h-3 w-3" />
              <span>關鍵字</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {news.keywords.map((keyword, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {news.word_in_news.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Tag className="h-3 w-3" />
              <span>相關單字</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {news.word_in_news.map((word, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {word}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {news.source.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <ExternalLink className="h-3 w-3" />
              <span>來源</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {news.source.map((src, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {src}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-1 text-xs text-muted-foreground pt-2 border-t">
          <Calendar className="h-3 w-3" />
          <span>
            {new Date(news.created_at).toLocaleDateString("zh-TW", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
