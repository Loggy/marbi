"use client";

import { useState } from "react";
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
import { evmListenerApi } from "@/lib/api";
import { Loader2 } from "lucide-react";

interface AddChainDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddChainDialog({ open, onOpenChange, onSuccess }: AddChainDialogProps) {
  const [chainId, setChainId] = useState("");
  const [rpcUrl, setRpcUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chainId || !rpcUrl) {
      setError("All fields are required");
      return;
    }

    if (!rpcUrl.match(/^wss?:\/\//)) {
      setError("RPC URL must start with ws:// or wss://");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await evmListenerApi.addChain({
        chainId: parseInt(chainId, 10),
        rpcUrl,
      });
      setChainId("");
      setRpcUrl("");
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add chain");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Chain</DialogTitle>
            <DialogDescription>
              Add a new blockchain chain to monitor via WebSocket RPC
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="chainId">Chain ID</Label>
              <Input
                id="chainId"
                type="number"
                placeholder="1"
                value={chainId}
                onChange={(e) => setChainId(e.target.value)}
                disabled={loading}
              />
              <p className="text-sm text-muted-foreground">
                e.g., 1 for Ethereum, 56 for BSC, 8453 for Base
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rpcUrl">WebSocket RPC URL</Label>
              <Input
                id="rpcUrl"
                type="text"
                placeholder="wss://..."
                value={rpcUrl}
                onChange={(e) => setRpcUrl(e.target.value)}
                disabled={loading}
              />
              <p className="text-sm text-muted-foreground">
                Must start with ws:// or wss://
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
              Add Chain
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
