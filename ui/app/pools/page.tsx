"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { poolApi } from "@/lib/api";
import { Pool } from "@/lib/types";
import { PoolDialog } from "@/components/pools/pool-dialog";
import { Loader2, Plus, Pencil, Trash2, RefreshCw } from "lucide-react";

const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum",
  56: "BSC",
  137: "Polygon",
  8453: "Base",
  42161: "Arbitrum",
  10: "Optimism",
};

export default function PoolsPage() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);

  const fetchPools = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await poolApi.getAll();
      setPools(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch pools");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPools();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this pool?")) {
      return;
    }
    try {
      await poolApi.delete(id);
      await fetchPools();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete pool");
    }
  };

  const handleEdit = (pool: Pool) => {
    setSelectedPool(pool);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedPool(null);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedPool(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pool Management</h1>
          <p className="text-muted-foreground">
            Manage liquidity pools across different DEXes and chains
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchPools} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleAdd} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Pool
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : pools.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pools.map((pool) => (
            <Card key={pool.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 text-base">
                      {pool.token0?.symbol || "Unknown"} / {pool.token1?.symbol || "Unknown"}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      <Badge variant="outline" className="text-xs">
                        {CHAIN_NAMES[pool.chainId] || `Chain ${pool.chainId}`}
                      </Badge>
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      onClick={() => handleEdit(pool)}
                      variant="ghost"
                      size="sm"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(pool.id)}
                      variant="ghost"
                      size="sm"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-xs font-medium text-muted-foreground">DEX</div>
                  <div className="text-sm">{pool.dex?.name || "Unknown"}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-muted-foreground">Pool Address</div>
                  <div className="text-xs font-mono break-all text-muted-foreground">
                    {pool.poolAddress}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="font-medium text-muted-foreground">Token 0</div>
                    <div className="font-mono break-all">{pool.token0Address.substring(0, 10)}...</div>
                  </div>
                  <div>
                    <div className="font-medium text-muted-foreground">Token 1</div>
                    <div className="font-mono break-all">{pool.token1Address.substring(0, 10)}...</div>
                  </div>
                </div>
                {pool.fee !== undefined && (
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">Fee</div>
                    <div className="text-sm">{pool.fee / 100}%</div>
                  </div>
                )}
                {pool.strategy && (
                  <div>
                    <Badge variant="secondary" className="text-xs">
                      Strategy: {pool.strategy.type}
                    </Badge>
                  </div>
                )}
                <div className="text-xs text-muted-foreground pt-2">
                  Updated: {new Date(pool.updatedAt).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No pools configured. Click &quot;Add Pool&quot; to get started.
            </p>
          </CardContent>
        </Card>
      )}

      <PoolDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        onSuccess={fetchPools}
        pool={selectedPool}
      />
    </div>
  );
}
