"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AddInterestsDialog } from "@/components/add-interests-dialog";
import { DifficultyLoadingAnimation } from "@/components/difficulty-loading-animation";
import { InstallButton } from "@/components/install-button";
import useAuth from "@/hooks/use-auth";
import { getUserPreferences, removeInterest, updateUserPreferences } from "@/lib/api/user";
import { cn, getDifficultyColor } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Mail, User, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function UserPage() {
  const { user, isLoading: userLoading } = useAuth();
  const [optimisticLevel, setOptimisticLevel] = useState<number | null>(null);

  const queryClient = useQueryClient();

  // Fetch user preferences
  const {
    data: preferencesData,
    isLoading: preferencesLoading,
    error: preferencesError
  } = useQuery({
    queryKey: ["userPreferences"],
    queryFn: getUserPreferences,
    enabled: !!user
  });

  // Remove interest mutation
  const removeInterestMutation = useMutation({
    mutationFn: removeInterest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userPreferences"] });
    },
    onError: (error) => {
      console.error("Failed to remove interest:", error);
    }
  });

  // Update difficulty level mutation
  const updateLevelMutation = useMutation({
    mutationFn: (newLevel: number) => updateUserPreferences({ level: newLevel }),
    onSuccess: () => {
      // Clear optimistic state and refresh data
      setOptimisticLevel(null);
      queryClient.invalidateQueries({ queryKey: ["userPreferences"] });
    },
    onError: (error) => {
      console.error("Failed to update difficulty level:", error);
      // Rollback optimistic update
      setOptimisticLevel(null);
      toast.error("無法更新難度等級，請稍後再試");
    }
  });

  const handleRemoveInterest = (interest: string) => {
    removeInterestMutation.mutate(interest);
  };

  const handleLevelChange = async (direction: "increase" | "decrease") => {
    const currentLevel = preferences?.level || 1;
    let newLevel = currentLevel;

    if (direction === "increase" && currentLevel < 10) {
      newLevel = currentLevel + 1;
    } else if (direction === "decrease" && currentLevel > 1) {
      newLevel = currentLevel - 1;
    }

    if (newLevel !== currentLevel) {
      // Update UI immediately (optimistic)
      setOptimisticLevel(newLevel);

      // Perform mutation in background
      try {
        await updateLevelMutation.mutateAsync(newLevel);
      } catch (error) {
        // Error handling is done in the mutation's onError callback
      }
    }
  };

  if (userLoading) {
    return <UserPageSkeleton />;
  }

  if (!user) {
    return (
      <div className="h-full w-full px-6 py-8 overflow-auto">
        <div className="max-w-2xl mx-auto">
          <div className="text-center">
            <h1 className="text-2xl font-bold">請先登入</h1>
            <p className="text-muted-foreground mt-2">您需要登入才能查看用戶資訊</p>
          </div>
        </div>
      </div>
    );
  }

  const preferences = preferencesData?.preferences;
  const interests = preferences?.interests || [];
  // Use optimistic level if available, otherwise fall back to server data
  const level = optimisticLevel ?? preferences?.level ?? 1;

  return (
    <div className="h-full w-full px-6 py-8 overflow-auto">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* User Profile Section */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              {/* User Icon */}
              <div className="relative">
                <div className="size-24 rounded-full border-4 border-background shadow-lg bg-muted flex items-center justify-center">
                  <User className="size-12 text-muted-foreground" />
                </div>
              </div>

              {/* User Info */}
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
                  <User className="size-5" />
                  {user.display_name}
                </h1>
                <p className="text-muted-foreground flex items-center justify-center gap-2">
                  <Mail className="size-4" />
                  {user.email}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Difficulty Level Section */}
        <Card>
          <CardHeader>
            <CardTitle>目前難度等級</CardTitle>
          </CardHeader>
          <CardContent>
            {preferencesLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : preferencesError ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">無法載入用戶偏好設定</p>
              </div>
            ) : (
              <div className="text-center space-y-4 relative">
                {/* Loading Overlay */}
                {updateLevelMutation.isPending && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
                    <DifficultyLoadingAnimation />
                  </div>
                )}

                {/* Level Display with Arrow Controls */}
                <div className="flex items-center justify-center gap-4">
                  {/* Decrease Button */}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleLevelChange("decrease")}
                    disabled={level <= 1 || updateLevelMutation.isPending}
                    className="h-12 w-12 transition-all duration-200 hover:scale-105"
                  >
                    <ChevronLeft className="size-5" />
                    <span className="sr-only">降低難度等級</span>
                  </Button>

                  {/* Level Display */}
                  <div
                    className={cn(
                      "inline-flex items-center justify-center rounded-lg px-6 py-4 text-white font-bold text-3xl shadow-lg min-w-[160px] transition-all duration-300 transform",
                      getDifficultyColor(level),
                      optimisticLevel && "scale-110"
                    )}
                  >
                    Level {level}
                  </div>

                  {/* Increase Button */}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleLevelChange("increase")}
                    disabled={level >= 10 || updateLevelMutation.isPending}
                    className="h-12 w-12 transition-all duration-200 hover:scale-105"
                  >
                    <ChevronRight className="size-5" />
                    <span className="sr-only">提高難度等級</span>
                  </Button>
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground transition-all duration-300">
                  {level <= 3 && "初級程度 - 適合基礎學習"}
                  {level > 3 && level <= 6 && "中級程度 - 適合進階學習"}
                  {level > 6 && level <= 8 && "高級程度 - 適合深度學習"}
                  {level > 8 && "專家程度 - 適合挑戰性學習"}
                </p>

                {/* Helper Text */}
                <p className="text-xs text-muted-foreground">使用左右箭頭調整您的學習難度等級 (1-10)</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Interests Section */}
        <Card>
          <CardHeader>
            <CardTitle>興趣主題</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add Interest Button */}
            <AddInterestsDialog currentInterests={interests} />

            {/* Current Interests Display */}
            {preferencesLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-8 w-28" />
              </div>
            ) : interests.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {interests.map((interest: string) => (
                  <Badge key={interest} variant="secondary" className="text-sm px-3 py-1 flex items-center gap-2">
                    {interest}
                    <Button variant="ghost" size="sm" className="h-auto p-0 hover:bg-transparent" onClick={() => handleRemoveInterest(interest)} disabled={removeInterestMutation.isPending}>
                      <X className="size-3" />
                      <span className="sr-only">移除 {interest}</span>
                    </Button>
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>尚未設定任何興趣主題</p>
                <p className="text-sm mt-1">點擊上方按鈕新增您的興趣</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Install App Section */}
        <Card>
          <CardHeader>
            <CardTitle>安裝應用程式</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">將 LexLoop 安裝到您的裝置上，享受更好的使用體驗。</p>
            <InstallButton size="lg" className="w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function UserPageSkeleton() {
  return (
    <div className="h-full w-full px-6 py-8 overflow-auto">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* User Profile Skeleton */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="size-24 rounded-full bg-muted flex items-center justify-center">
                <User className="size-12 text-muted-foreground" />
              </div>
              <div className="text-center space-y-2">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-5 w-48" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Difficulty Level Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-24" />
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-4">
                <Skeleton className="h-12 w-12" />
                <Skeleton className="h-16 w-40" />
                <Skeleton className="h-12 w-12" />
              </div>
              <Skeleton className="h-4 w-48 mx-auto" />
              <Skeleton className="h-3 w-64 mx-auto" />
            </div>
          </CardContent>
        </Card>

        {/* Interests Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-20" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-8 w-28" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
