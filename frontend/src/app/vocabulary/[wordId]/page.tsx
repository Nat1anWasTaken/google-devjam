"use client";

import { getWord, deleteWord } from "@/lib/api/vocabulary";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DeleteWordDialog } from "@/components/delete-word-dialog";
import { ArrowLeftIcon, TrashIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState } from "react";
import { getDifficultyColor } from "@/lib/utils";

export default function WordPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const wordId = params.wordId as string;
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const {
    data: wordResponse,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ["word", wordId],
    queryFn: () => getWord(wordId),
    enabled: !!wordId,
  });

  const deleteWordMutation = useMutation({
    mutationFn: deleteWord,
    onSuccess: () => {
      toast.success("單字已成功刪除");

      // Optimistically update the vocabulary list cache
      queryClient.setQueryData(["vocabulary"], (oldData: unknown) => {
        if (!oldData || typeof oldData !== "object" || !("words" in oldData))
          return oldData;

        const data = oldData as { words: Array<{ id: string }>; total: number };
        const filteredWords = data.words.filter((word) => word.id !== wordId);

        return {
          ...data,
          words: filteredWords,
          total: Math.max(0, data.total - 1), // Update total count
        };
      });

      // Navigate back to vocabulary list immediately
      router.push("/vocabulary");

      // Invalidate after navigation to ensure data consistency in background
      queryClient.invalidateQueries({ queryKey: ["vocabulary"] });
    },
    onError: (error: Error) => {
      toast.error(error?.message || "刪除單字失敗");
    },
  });

  const handleDeleteWord = () => {
    deleteWordMutation.mutate(wordId);
    setShowDeleteDialog(false);
  };

  const word = wordResponse?.word;

  if (loading) {
    return (
      <div className="py-8 px-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* 導航按鈕 */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/vocabulary")}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              返回詞彙列表
            </Button>
          </div>

          {/* 主要單字資訊骨架 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-48" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Skeleton className="h-6 w-16 mb-2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
              <Skeleton className="h-px w-full" />
              <div>
                <Skeleton className="h-6 w-12 mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !word) {
    return (
      <div className="py-8 px-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* 導航與刪除按鈕 */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/vocabulary")}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              返回詞彙列表
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              disabled={deleteWordMutation.isPending}
              className="flex items-center gap-2"
            >
              <TrashIcon className="h-4 w-4" />
              {deleteWordMutation.isPending ? "刪除中..." : "刪除"}
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                {error?.message || "Word not found"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* 導航與刪除按鈕 */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/vocabulary")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            返回詞彙列表
          </Button>{" "}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            disabled={deleteWordMutation.isPending}
            className="flex items-center gap-2"
          >
            <TrashIcon className="h-4 w-4" />
            {deleteWordMutation.isPending ? "刪除中..." : "刪除"}
          </Button>
        </div>

        {/* 主要單字資訊 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-3xl font-bold">{word.word}</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-muted-foreground">
                  {word.part_of_speech ? word.part_of_speech : "Unknown"}
                </Badge>
                <Badge
                  className={`text-white ${getDifficultyColor(
                    word.difficulty
                  )}`}
                >
                  難度 {word.difficulty}/10
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 中文定義 */}
            <div>
              <h3 className="font-semibold text-sm mb-1">中文定義</h3>
              <p className="text-muted-foreground">{word.definition_zh}</p>
            </div>

            {/* 英文定義 */}
            <div>
              <h3 className="font-semibold text-sm mb-1">英文定義</h3>
              <p className="text-muted-foreground">{word.definition_en}</p>
            </div>

            {/* 翻譯 */}
            {word.translation && (
              <div>
                <h3 className="font-semibold text-sm mb-1">翻譯</h3>
                <p className="text-muted-foreground">{word.translation}</p>
              </div>
            )}

            {word.root_word && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold text-lg mb-2">詞根</h3>
                  <p className="text-muted-foreground">{word.root_word}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* 例句 */}
        {word &&
          "examples" in word &&
          word.examples &&
          word.examples.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>例句</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {word.examples.map((example) => (
                    <div
                      key={example.id}
                      className="p-3 bg-muted rounded-lg border-l-4 border-primary"
                    >
                      <p className="text-sm leading-relaxed">
                        {example.sentence}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

        {/* 時間戳記 */}
        <Card>
          <CardContent>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                創建時間: {new Date(word.created_at).toLocaleString("zh-TW")}
              </p>
              <p>
                更新時間: {new Date(word.updated_at).toLocaleString("zh-TW")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 刪除確認對話框 */}
      <DeleteWordDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDeleteWord}
        wordName={word?.word}
        isDeleting={deleteWordMutation.isPending}
      />
    </div>
  );
}
