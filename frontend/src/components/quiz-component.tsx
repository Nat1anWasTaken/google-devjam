"use client";

import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "./ui/card";
import { Check, X } from "lucide-react";
import { learnWord } from "@/lib/api/vocabulary";
import { toast } from "sonner";

interface QuizComponentProps {
  word: WordWithUserData;
  onComplete?: (newFluency: number) => void;
  onRemove?: (wordId: string) => void;
}

export function QuizComponent({ word, onComplete, onRemove }: QuizComponentProps) {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationDirection, setAnimationDirection] = useState<"left" | "right" | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const currentX = useRef(0);

  const learnWordMutation = useMutation({
    mutationFn: ({ correct }: { correct: boolean }) => learnWord(word.id, { correct }),
    onSuccess: (response) => {
      // Call onComplete with the new fluency
      onComplete?.(response.fluency);
      // Remove the quiz card from view
      onRemove?.(word.id);
    },
    onError: (error) => {
      console.error("Failed to update learning progress:", error);
      toast.error(`${word.word} 更新學習進度失敗，請稍後再試。`);
      // Reset animation state on error
      setIsAnimating(false);
      setAnimationDirection(null);
      setDragX(0);
    }
  });

  // 觸發答題動畫
  const triggerAnswerAnimation = (direction: "left" | "right") => {
    setIsAnimating(true);
    setAnimationDirection(direction);

    // 計算最終位置（完全移出螢幕）
    const finalX = direction === "left" ? -window.innerWidth : window.innerWidth;
    setDragX(finalX);

    // 動畫結束後觸發API呼叫
    setTimeout(() => {
      const correct = direction === "right";
      learnWordMutation.mutate({ correct });
    }, 300); // 與 CSS 動畫時間相符
  };

  const handleAnswer = (correct: boolean) => {
    if (learnWordMutation.isPending) return;
    triggerAnswerAnimation(correct ? "right" : "left");
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isAnimating) return;
    startX.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || isAnimating) return;

    currentX.current = e.touches[0].clientX;
    const diffX = currentX.current - startX.current;
    setDragX(diffX);
  };

  const handleTouchEnd = () => {
    if (!isDragging || isAnimating) return;

    const threshold = 100; // 滑動閾值

    if (dragX > threshold) {
      // 右滑 - Yes (知道)
      handleAnswer(true);
    } else if (dragX < -threshold) {
      // 左滑 - No (不知道)
      handleAnswer(false);
    } else {
      // 重置狀態（滑動距離不足）
      setDragX(0);
    }

    setIsDragging(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isAnimating) return;
    startX.current = e.clientX;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || isAnimating) return;

    currentX.current = e.clientX;
    const diffX = currentX.current - startX.current;
    setDragX(diffX);
  };

  const handleMouseUp = () => {
    if (!isDragging || isAnimating) return;

    const threshold = 100;

    if (dragX > threshold) {
      handleAnswer(true);
    } else if (dragX < -threshold) {
      handleAnswer(false);
    } else {
      // 重置狀態（滑動距離不足）
      setDragX(0);
    }

    setIsDragging(false);
  };

  // 計算透明度和背景類別
  const getSwipeClasses = () => {
    const normalizedDrag = Math.abs(dragX) / 100;
    let opacity = Math.min(normalizedDrag, 0.8);

    // 動畫期間保持高透明度
    if (isAnimating) {
      opacity = 0.9;
    }

    if (dragX > 0) {
      // 右滑 - 綠色背景 (Yes)
      return {
        className: "bg-green-500",
        style: { opacity }
      };
    } else if (dragX < 0) {
      // 左滑 - 紅色背景 (No)
      return {
        className: "bg-red-500",
        style: { opacity }
      };
    }
    return {
      className: "",
      style: { opacity: 0 }
    };
  };

  const swipeStyle = getSwipeClasses();

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* 背景指示器 */}
      <div className={`absolute inset-0 flex items-center justify-center rounded-lg ${swipeStyle.className}`} style={swipeStyle.style}>
        {dragX > 50 && !isAnimating && <Check className="w-8 h-8 text-white" />}
        {dragX < -50 && !isAnimating && <X className="w-8 h-8 text-white" />}
        {isAnimating && animationDirection === "right" && (
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span className="text-white font-medium">提交中...</span>
          </div>
        )}
        {isAnimating && animationDirection === "left" && (
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span className="text-white font-medium">提交中...</span>
          </div>
        )}
      </div>

      {/* 卡片內容 */}
      <Card
        ref={cardRef}
        className={`w-full max-w-md mx-auto cursor-grab active:cursor-grabbing ${isAnimating ? "transition-transform duration-300 ease-out" : "transition-transform duration-200 ease-out"}`}
        style={{
          transform: `translateX(${dragX}px)`
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
          <div className="flex flex-col justify-center items-start gap-4">
            <div className="flex flex-row justify-center items-end gap-2">
              <h2 className="text-lg font-semibold">{word.word}</h2>
              <h2 className="text-muted-foreground">{word.translation}</h2>
            </div>
            <p className="text-base text-muted-foreground">你知道這個字是什麼意思了嗎？</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
