"use client";

export function DifficultyLoadingAnimation() {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="relative mb-4">
        {/* Animated level/gear icon */}
        <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center animate-pulse">
          <span className="text-lg text-primary-foreground">⚙️</span>
        </div>
        {/* Animated dots around the icon */}
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary/70 rounded-full animate-bounce"></div>
        <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
        <div className="absolute top-1/2 -left-3 w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
      </div>

      <h4 className="text-sm font-medium mb-2">調整難度等級中...</h4>
      <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></div>
          <span>更新學習偏好</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-primary/80 rounded-full animate-pulse" style={{ animationDelay: "0.3s" }}></div>
          <span>同步難度設定</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-32 h-1 bg-muted rounded-full mt-3 overflow-hidden">
        <div className="h-full bg-primary rounded-full animate-pulse relative">
          <div className="absolute inset-0 bg-primary-foreground/30 rounded-full animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}
