"use client";

export function AILoadingAnimation() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative mb-6">
        {/* Animated brain/AI icon */}
        <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center animate-pulse">
          <span className="text-2xl text-primary-foreground">🧠</span>
        </div>
        {/* Animated dots around the brain */}
        <div className="absolute -top-2 -right-2 w-4 h-4 bg-primary/70 rounded-full animate-bounce"></div>
        <div className="absolute -bottom-2 -left-2 w-3 h-3 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
        <div className="absolute top-1/2 -left-4 w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
      </div>

      <h3 className="text-xl font-semibold mb-2">正在為你生成個人化推薦...</h3>
      <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
          <span>分析你的學習進度</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-primary/80 rounded-full animate-pulse" style={{ animationDelay: "0.5s" }}></div>
          <span>評估單字難度匹配</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-primary/60 rounded-full animate-pulse" style={{ animationDelay: "1s" }}></div>
          <span>AI 正在挑選最適合的單字</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-64 h-2 bg-muted rounded-full mt-6 overflow-hidden">
        <div className="h-full bg-primary rounded-full animate-pulse relative">
          <div className="absolute inset-0 bg-primary-foreground/30 rounded-full animate-pulse"></div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-4">這可能需要幾秒鐘時間...</p>
    </div>
  );
}
