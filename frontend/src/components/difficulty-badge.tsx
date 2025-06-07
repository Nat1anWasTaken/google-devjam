import { Badge } from "@/components/ui/badge";
import { getDifficultyColor } from "@/lib/utils";

interface DifficultyBadgeProps {
  difficulty: number;
}

export function DifficultyBadge({ difficulty }: DifficultyBadgeProps) {
  return (
    <Badge className={`text-white ${getDifficultyColor(difficulty)}`}>
      難度 {difficulty}/10
    </Badge>
  );
}
