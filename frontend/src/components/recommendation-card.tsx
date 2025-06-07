"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Plus, X } from "lucide-react";
import { getDifficultyColor } from "@/lib/utils";
import { createWord } from "@/lib/api/vocabulary";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type RecommendationCardProps = {
  word: WordWithUserData;
  onRemove?: (wordId: string) => void;
};

export function RecommendationCard({
  word,
  onRemove,
}: RecommendationCardProps) {
  const queryClient = useQueryClient();
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationDirection, setAnimationDirection] = useState<
    "left" | "right" | null
  >(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const currentX = useRef(0);

  const addToVocabularyMutation = useMutation({
    mutationFn: () => createWord({ word: word.word }),
    onSuccess: () => {
      toast.success(`「${word.word}」已成功加入單字庫！`);
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: ["vocabulary"] });
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });
      // Only remove from parent after successful API call
      onRemove?.(word.id);
    },
    onError: (error: any) => {
      const errorMessage =
        error.fullResponse?.error || error.message || "加入失敗";
      toast.error(`加入單字失敗：${errorMessage}`);
      // Reset animation state on error
      setIsAnimating(false);
      setAnimationDirection(null);
      setDragX(0);
    },
  });

  // 觸發移除動畫
  const triggerRemoveAnimation = (direction: "left" | "right") => {
    setIsAnimating(true);
    setAnimationDirection(direction);

    // 計算最終位置（完全移出螢幕）
    const finalX =
      direction === "left" ? -window.innerWidth : window.innerWidth;
    setDragX(finalX);

    // 動畫結束後觸發回調
    setTimeout(() => {
      if (direction === "right") {
        // 右滑：開始API呼叫（成功後會在onSuccess中移除卡片）
        addToVocabularyMutation.mutate();
      } else {
        // 左滑：立即移除卡片
        toast.success("推薦已移除");
        onRemove?.(word.id);
      }
    }, 300); // 與 CSS 動畫時間相符
  };

  const handleAddToVocabulary = () => {
    triggerRemoveAnimation("right");
  };

  const handleRemoveCard = () => {
    triggerRemoveAnimation("left");
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;

    currentX.current = e.touches[0].clientX;
    const diffX = currentX.current - startX.current;
    setDragX(diffX);
  };

  const handleTouchEnd = () => {
    if (!isDragging || isAnimating) return;

    const threshold = 100; // 滑動閾值

    if (dragX > threshold) {
      // 右滑 - 加入單字庫
      handleAddToVocabulary();
    } else if (dragX < -threshold) {
      // 左滑 - 移除卡片
      handleRemoveCard();
    } else {
      // 重置狀態（滑動距離不足）
      setDragX(0);
    }

    setIsDragging(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    startX.current = e.clientX;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    currentX.current = e.clientX;
    const diffX = currentX.current - startX.current;
    setDragX(diffX);
  };

  const handleMouseUp = () => {
    if (!isDragging || isAnimating) return;

    const threshold = 100;

    if (dragX > threshold) {
      handleAddToVocabulary();
    } else if (dragX < -threshold) {
      handleRemoveCard();
    } else {
      // 重置狀態（滑動距離不足）
      setDragX(0);
    }

    setIsDragging(false);
  };

  // Use Chinese definition if available, otherwise fall back to English definition
  const displayDefinition = word.definition_zh || word.definition_en;

  // 計算透明度和背景類別
  const getSwipeClasses = () => {
    const normalizedDrag = Math.abs(dragX) / 100;
    let opacity = Math.min(normalizedDrag, 0.8);

    // 動畫期間保持高透明度
    if (isAnimating) {
      opacity = 0.9;
    }

    if (dragX > 0) {
      // 右滑 - 綠色背景
      return {
        className: "bg-green-500",
        style: { opacity },
      };
    } else if (dragX < 0) {
      // 左滑 - 紅色背景
      return {
        className: "bg-red-500",
        style: { opacity },
      };
    }
    return {
      className: "",
      style: { opacity: 0 },
    };
  };

  const swipeStyle = getSwipeClasses();

  // 使用 useEffect 來處理動畫完成後的清理
  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* 背景指示器 */}
      <div
        className={`absolute inset-0 flex items-center justify-center rounded-lg ${swipeStyle.className}`}
        style={swipeStyle.style}
      >
        {dragX > 50 && !isAnimating && <Plus className="w-8 h-8 text-white" />}
        {dragX < -50 && !isAnimating && <X className="w-8 h-8 text-white" />}
        {isAnimating && animationDirection === "right" && (
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span className="text-white font-medium">加入中...</span>
          </div>
        )}
        {isAnimating && animationDirection === "left" && (
          <X className="w-8 h-8 text-white" />
        )}
      </div>

      {/* 卡片內容 */}
      <Card
        ref={cardRef}
        className={`w-full max-w-sm cursor-grab active:cursor-grabbing ${
          isAnimating
            ? "transition-transform duration-300 ease-out"
            : "transition-transform duration-200 ease-out"
        }`}
        style={{
          transform: `translateX(${dragX}px)`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp} // 處理鼠標離開的情況
      >
        <CardContent>
          <div className="flex flex-row justify-between items-center">
            <h2 className="text-lg font-semibold">{word.word}</h2>
            {word.part_of_speech && (
              <div className="flex justify-center items-center gap-2">
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
            )}
          </div>

          <p className="text-sm text-muted-foreground mt-1">
            {displayDefinition}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
