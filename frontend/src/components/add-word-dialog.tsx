"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createWord } from "@/lib/api/vocabulary";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";

export function AddWordDialog() {
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState("");
  const [error, setError] = useState<string>("");
  const queryClient = useQueryClient();

  const createWordMutation = useMutation({
    mutationFn: createWord,
    onSuccess: () => {
      // Invalidate and refetch vocabulary queries
      queryClient.invalidateQueries({ queryKey: ["vocabulary"] });
      setWord("");
      setError("");
      setOpen(false);
    },
    onError: (error) => {
      console.error("Failed to create word:", error);
      setError(error instanceof Error ? error.message : String(error));
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim()) return;

    setError("");
    createWordMutation.mutate({ word: word.trim() });
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      setError("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          className="size-12 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-primary hover:bg-primary/90 relative overflow-hidden
                     before:absolute before:inset-0 before:rounded-full before:bg-primary/20 before:animate-ping before:opacity-75
                     after:absolute after:inset-0 after:rounded-full after:shadow-[0_0_15px_rgba(var(--primary),0.5)] after:animate-pulse"
        >
          <Plus className="size-6 relative z-10 text-foreground" />
          <span className="sr-only text-foreground">新增單字</span>
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
              <Input id="word" value={word} onChange={(e) => setWord(e.target.value)} placeholder="輸入單字..." disabled={createWordMutation.isPending} autoFocus />
            </div>
            {error && (
              <div className="text-sm text-red-500">
                <pre className="whitespace-pre-wrap text-left bg-red-50 p-2 rounded border overflow-auto max-h-32">{error}</pre>
              </div>
            )}
          </div>
          <DialogFooter>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={createWordMutation.isPending}>
                取消
              </Button>
              <Button type="submit" disabled={createWordMutation.isPending || !word.trim()}>
                {createWordMutation.isPending ? "新增中..." : "新增"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
