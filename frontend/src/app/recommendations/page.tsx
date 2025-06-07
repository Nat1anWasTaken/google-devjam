"use client";

export default function RecommendationsPage() {
  return (
    <div className="h-full w-full px-6 py-8 overflow-auto">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold">推薦</h1>
        <p className="text-sm text-muted-foreground mt-1">
          這裡是推薦頁面，API 功能正在開發中，敬請期待。
        </p>
        <div className="mt-8 flex flex-col items-center justify-center">
          <div className="text-6xl mb-4">⭐</div>
          <p className="text-lg text-muted-foreground text-center">
            個人化推薦功能即將上線
          </p>
          <p className="text-sm text-muted-foreground text-center mt-2">
            我們正在為您準備最適合的學習內容
          </p>
        </div>
      </div>
    </div>
  );
}
