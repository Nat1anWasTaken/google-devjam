import { Card, CardContent } from "./ui/card";
import { Skeleton } from "./ui/skeleton";

export function WordCardSkeleton() {
  return (
    <Card className="w-full max-w-sm">
      <CardContent>
        <Skeleton className="h-6 w-24 mb-2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4 mt-1" />
      </CardContent>
    </Card>
  );
}
