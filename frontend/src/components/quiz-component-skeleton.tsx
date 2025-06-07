import { Card, CardContent } from "./ui/card";
import { Skeleton } from "./ui/skeleton";

export function QuizComponentSkeleton() {
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-6">
        <div className="text-center space-y-6">
          {/* Word title skeleton */}
          <Skeleton className="h-7 w-32 mx-auto" />

          {/* Question text skeleton */}
          <Skeleton className="h-5 w-64 mx-auto" />

          {/* Button grid skeleton */}
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
