"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { strategyApi } from "@/lib/api";
import { Strategy } from "@/lib/types";
import { Loader2 } from "lucide-react";

interface StrategyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  strategy?: Strategy | null;
}

export function StrategyDialog({ open, onOpenChange, onSuccess, strategy }: StrategyDialogProps) {
  const [type, setType] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (strategy) {
      setType(strategy.type);
    } else {
      setType("");
    }
    setError(null);
  }, [strategy, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type) {
      setError("Strategy type is required");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (strategy) {
        await strategyApi.update(strategy.id, { type });
      } else {
        await strategyApi.create({ type });
      }

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${strategy ? "update" : "create"} strategy`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{strategy ? "Edit Strategy" : "Add Strategy"}</DialogTitle>
            <DialogDescription>
              {strategy ? "Update strategy type" : "Create a new trading strategy"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="type">Strategy Type *</Label>
              <Input
                id="type"
                placeholder="dex-to-dex"
                value={type}
                onChange={(e) => setType(e.target.value)}
                disabled={loading}
              />
              <p className="text-sm text-muted-foreground">
                e.g., dex-to-dex, cross-chain, arbitrage
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {strategy ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
