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
import { dexApi } from "@/lib/api";
import { Dex } from "@/lib/types";
import { Loader2 } from "lucide-react";

interface DexDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  dex?: Dex | null;
}

export function DexDialog({ open, onOpenChange, onSuccess, dex }: DexDialogProps) {
  const [name, setName] = useState("");
  const [swapTopic, setSwapTopic] = useState("");
  const [addLiquidityTopic, setAddLiquidityTopic] = useState("");
  const [removeLiquidityTopic, setRemoveLiquidityTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (dex) {
      setName(dex.name);
      setSwapTopic(dex.swapTopic);
      setAddLiquidityTopic(dex.addLiquidityTopic || "");
      setRemoveLiquidityTopic(dex.removeLiquidityTopic || "");
    } else {
      setName("");
      setSwapTopic("");
      setAddLiquidityTopic("");
      setRemoveLiquidityTopic("");
    }
    setError(null);
  }, [dex, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !swapTopic) {
      setError("Name and Swap Topic are required");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = {
        name,
        swapTopic,
        ...(addLiquidityTopic && { addLiquidityTopic }),
        ...(removeLiquidityTopic && { removeLiquidityTopic }),
      };

      if (dex) {
        await dexApi.update(dex.id, data);
      } else {
        await dexApi.create(data);
      }

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${dex ? "update" : "create"} DEX`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{dex ? "Edit DEX" : "Add DEX"}</DialogTitle>
            <DialogDescription>
              {dex ? "Update DEX configuration" : "Add a new decentralized exchange"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="Uniswap V2"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="swapTopic">Swap Topic *</Label>
              <Input
                id="swapTopic"
                placeholder="0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822"
                value={swapTopic}
                onChange={(e) => setSwapTopic(e.target.value)}
                disabled={loading}
                className="font-mono text-sm"
              />
              <p className="text-sm text-muted-foreground">
                Event signature hash for swap events
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="addLiquidityTopic">Add Liquidity Topic</Label>
              <Input
                id="addLiquidityTopic"
                placeholder="0x..."
                value={addLiquidityTopic}
                onChange={(e) => setAddLiquidityTopic(e.target.value)}
                disabled={loading}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="removeLiquidityTopic">Remove Liquidity Topic</Label>
              <Input
                id="removeLiquidityTopic"
                placeholder="0x..."
                value={removeLiquidityTopic}
                onChange={(e) => setRemoveLiquidityTopic(e.target.value)}
                disabled={loading}
                className="font-mono text-sm"
              />
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
              {dex ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
