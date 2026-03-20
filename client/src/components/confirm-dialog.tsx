import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "default";
  onConfirm: () => void;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title = "Are you sure?",
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  loading = false,
}: ConfirmDialogProps) {
  const confirmColors = {
    danger: "bg-red-600 hover:bg-red-700 text-white",
    warning: "bg-orange-600 hover:bg-orange-700 text-white",
    default: "bg-green-600 hover:bg-green-700 text-white",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">{title}</DialogTitle>
        </DialogHeader>
        {description && (
          <p className="text-sm text-gray-500 -mt-2">{description}</p>
        )}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            className={`flex-1 ${confirmColors[variant]}`}
            onClick={() => {
              onConfirm();
              if (!loading) onOpenChange(false);
            }}
            disabled={loading}
          >
            {loading ? "Please wait..." : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
