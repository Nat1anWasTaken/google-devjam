"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeleteWordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  wordName?: string;
  isDeleting?: boolean;
}

export function DeleteWordDialog({
  open,
  onOpenChange,
  onConfirm,
  wordName,
  isDeleting = false,
}: DeleteWordDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>確認刪除單字</DialogTitle>
          <DialogDescription>
            確定要刪除單字「{wordName}」嗎？此操作無法復原。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="grid grid-cols-2 justify-between">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            取消
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "刪除中..." : "確認刪除"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
