"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { strategyApi } from "@/lib/api";
import { Strategy } from "@/lib/types";
import { StrategyDialog } from "@/components/strategies/strategy-dialog";
import { ManagePoolsDialog } from "@/components/strategies/manage-pools-dialog";
import { Loader2, Plus, Pencil, Trash2, RefreshCw, ListTree } from "lucide-react";

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [poolsDialogOpen, setPoolsDialogOpen] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);

  const fetchStrategies = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await strategyApi.getAll();
      setStrategies(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch strategies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStrategies();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this strategy?")) {
      return;
    }
    try {
      await strategyApi.delete(id);
      await fetchStrategies();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete strategy");
    }
  };

  const handleEdit = (strategy: Strategy) => {
    setSelectedStrategy(strategy);
    setDialogOpen(true);
  };

  const handleManagePools = (strategy: Strategy) => {
    setSelectedStrategy(strategy);
    setPoolsDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedStrategy(null);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedStrategy(null);
  };

  const handlePoolsDialogClose = () => {
    setPoolsDialogOpen(false);
    setSelectedStrategy(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Strategy Management</h1>
          <p className="text-muted-foreground">
            Manage trading strategies and assign pools
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchStrategies} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleAdd} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Strategy
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
      ) : strategies.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {strategies.map((strategy) => (
            <Card key={strategy.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{strategy.type}</CardTitle>
                    <CardDescription className="mt-1">
                      ID: {strategy.id.substring(0, 8)}...
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      onClick={() => handleEdit(strategy)}
                      variant="ghost"
                      size="sm"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(strategy.id)}
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
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Pools</span>
                    <Badge variant="secondary">
                      {strategy.pools?.length || 0}
                    </Badge>
                  </div>
                  {strategy.pools && strategy.pools.length > 0 ? (
                    <div className="space-y-1">
                      {strategy.pools.slice(0, 3).map((pool) => (
                        <div
                          key={pool.id}
                          className="text-xs border rounded p-2 flex items-center justify-between"
                        >
                          <span>
                            {pool.token0?.symbol || "?"} / {pool.token1?.symbol || "?"}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {pool.dex?.name || "Unknown"}
                          </Badge>
                        </div>
                      ))}
                      {strategy.pools.length > 3 && (
                        <p className="text-xs text-muted-foreground text-center py-1">
                          +{strategy.pools.length - 3} more
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      No pools assigned
                    </p>
                  )}
                </div>
                <Button
                  onClick={() => handleManagePools(strategy)}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <ListTree className="h-4 w-4 mr-2" />
                  Manage Pools
                </Button>
                <div className="text-xs text-muted-foreground pt-2">
                  Updated: {new Date(strategy.updatedAt).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No strategies configured. Click &quot;Add Strategy&quot; to get started.
            </p>
          </CardContent>
        </Card>
      )}

      <StrategyDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        onSuccess={fetchStrategies}
        strategy={selectedStrategy}
      />

      <ManagePoolsDialog
        open={poolsDialogOpen}
        onOpenChange={handlePoolsDialogClose}
        onSuccess={fetchStrategies}
        strategy={selectedStrategy}
      />
    </div>
  );
}
