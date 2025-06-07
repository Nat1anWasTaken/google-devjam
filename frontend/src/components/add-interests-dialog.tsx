"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { addInterest, getUserPreferences } from "@/lib/api/user";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Tag, TagInput } from "emblor";

interface AddInterestsDialogProps {
  currentInterests: string[];
}

export function AddInterestsDialog({
  currentInterests,
}: AddInterestsDialogProps) {
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [activeTagIndex, setActiveTagIndex] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const addInterestMutation = useMutation({
    mutationFn: addInterest,
    onSuccess: () => {
      // Invalidate and refetch preferences queries
      queryClient.invalidateQueries({ queryKey: ["userPreferences"] });
    },
    onError: (error) => {
      console.error("Failed to add interest:", error);
      // TODO: Add proper error handling/toast notification
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Add each new tag that's not already in current interests
    for (const tag of tags) {
      if (!currentInterests.includes(tag.text)) {
        try {
          await addInterestMutation.mutateAsync(tag.text);
        } catch (error) {
          console.error(`Failed to add interest "${tag.text}":`, error);
        }
      }
    }

    // Reset form and close dialog
    setTags([]);
    setOpen(false);
  };

  const handleCancel = () => {
    setTags([]);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Plus className="size-4 mr-2" />
          新增興趣
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md duration-150">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>新增興趣</DialogTitle>
            <DialogDescription>
              輸入您感興趣的主題，這將幫助我們為您推薦更適合的內容
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <TagInput
                placeholder="輸入興趣主題..."
                tags={tags}
                setTags={setTags}
                activeTagIndex={activeTagIndex}
                setActiveTagIndex={setActiveTagIndex}
                className="min-h-[2.5rem]"
                disabled={addInterestMutation.isPending}
                maxTags={10}
                minLength={1}
                maxLength={30}
                allowDuplicates={false}
                sortTags
              />
              <p className="text-xs text-muted-foreground">
                按 Enter 鍵或逗號來新增興趣標籤
              </p>
            </div>
          </div>
          <DialogFooter>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={addInterestMutation.isPending}
              >
                取消
              </Button>
              <Button
                type="submit"
                disabled={addInterestMutation.isPending || tags.length === 0}
              >
                {addInterestMutation.isPending ? "新增中..." : "新增"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
