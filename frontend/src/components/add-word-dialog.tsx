"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createWord } from "@/lib/api/vocabulary";

export function AddWordDialog() {
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim()) return;

    setIsLoading(true);
    try {
      await createWord({ word: word.trim() });
      setWord("");
      setOpen(false);
      // Optionally, you could trigger a refresh of the vocabulary list here
    } catch (error) {
      console.error("Failed to create word:", error);
      // TODO: Add proper error handling/toast notification
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          className="size-12 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-primary hover:bg-primary/90 relative overflow-hidden
                     before:absolute before:inset-0 before:rounded-full before:bg-primary/20 before:animate-ping before:opacity-75
                     after:absolute after:inset-0 after:rounded-full after:shadow-[0_0_15px_rgba(var(--primary),0.5)] after:animate-pulse"
        >
          <Plus className="size-6 relative z-10" />
          <span className="sr-only">新增單字</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md duration-150">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>新增單字</DialogTitle>
            <DialogDescription>輸入您想要學習的新單字</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="word">單字</Label>
              <Input
                id="word"
                value={word}
                onChange={(e) => setWord(e.target.value)}
                placeholder="輸入單字..."
                disabled={isLoading}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              取消
            </Button>
            <Button type="submit" disabled={isLoading || !word.trim()}>
              {isLoading ? "新增中..." : "新增"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
