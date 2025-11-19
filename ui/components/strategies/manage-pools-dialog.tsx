"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { strategyApi, poolApi } from "@/lib/api";
import { Strategy, Pool } from "@/lib/types";
import { Loader2, Plus, X } from "lucide-react";

interface ManagePoolsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  strategy: Strategy | null;
}

const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum",
  56: "BSC",
  137: "Polygon",
  8453: "Base",
  42161: "Arbitrum",
  10: "Optimism",
};

export function ManagePoolsDialog({
  open,
  onOpenChange,
  onSuccess,
  strategy,
}: ManagePoolsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allPools, setAllPools] = useState<Pool[]>([]);
  const [assignedPoolIds, setAssignedPoolIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchPools = async () => {
      if (!open || !strategy) return;
      try {
        setLoading(true);
        setError(null);
        const pools = await poolApi.getAll();
        setAllPools(pools);
        setAssignedPoolIds(new Set(strategy.pools?.map((p) => p.id) || []));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch pools");
      } finally {
        setLoading(false);
      }
    };
    fetchPools();
  }, [open, strategy]);

  const handleAddPool = async (poolId: string) => {
    if (!strategy) return;
    try {
      setError(null);
      await strategyApi.addPool(strategy.id, poolId);
      setAssignedPoolIds((prev) => new Set([...prev, poolId]));
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add pool");
    }
  };

  const handleRemovePool = async (poolId: string) => {
    if (!strategy) return;
    try {
      setError(null);
      await strategyApi.removePool(strategy.id, poolId);
      setAssignedPoolIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(poolId);
        return newSet;
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove pool");
    }
  };

  const assignedPools = allPools.filter((pool) => assignedPoolIds.has(pool.id));
  const availablePools = allPools.filter(
    (pool) => !assignedPoolIds.has(pool.id) && !pool.strategyId
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Manage Strategy Pools</DialogTitle>
          <DialogDescription>
            Add or remove pools for strategy: {strategy?.type}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Assigned Pools</h3>
                <Badge variant="secondary">{assignedPools.length}</Badge>
              </div>
              <ScrollArea className="h-[400px] border rounded p-2">
                {assignedPools.length > 0 ? (
                  <div className="space-y-2">
                    {assignedPools.map((pool) => (
                      <div
                        key={pool.id}
                        className="border rounded p-3 space-y-2 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-sm">
                              {pool.token0?.symbol || "?"} / {pool.token1?.symbol || "?"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {pool.dex?.name || "Unknown"}
                            </div>
                          </div>
                          <Button
                            onClick={() => handleRemovePool(pool.id)}
                            variant="ghost"
                            size="sm"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {CHAIN_NAMES[pool.chainId] || `Chain ${pool.chainId}`}
                          </Badge>
                          {pool.fee !== undefined && (
                            <Badge variant="secondary" className="text-xs">
                              {pool.fee / 100}%
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs font-mono text-muted-foreground break-all">
                          {pool.poolAddress.substring(0, 20)}...
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    No pools assigned
                  </div>
                )}
              </ScrollArea>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Available Pools</h3>
                <Badge variant="secondary">{availablePools.length}</Badge>
              </div>
              <ScrollArea className="h-[400px] border rounded p-2">
                {availablePools.length > 0 ? (
                  <div className="space-y-2">
                    {availablePools.map((pool) => (
                      <div
                        key={pool.id}
                        className="border rounded p-3 space-y-2 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-sm">
                              {pool.token0?.symbol || "?"} / {pool.token1?.symbol || "?"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {pool.dex?.name || "Unknown"}
                            </div>
                          </div>
                          <Button
                            onClick={() => handleAddPool(pool.id)}
                            variant="ghost"
                            size="sm"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {CHAIN_NAMES[pool.chainId] || `Chain ${pool.chainId}`}
                          </Badge>
                          {pool.fee !== undefined && (
                            <Badge variant="secondary" className="text-xs">
                              {pool.fee / 100}%
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs font-mono text-muted-foreground break-all">
                          {pool.poolAddress.substring(0, 20)}...
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    No available pools
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        )}

        <Separator />

        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
