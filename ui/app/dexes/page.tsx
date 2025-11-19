"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { dexApi } from "@/lib/api";
import { Dex } from "@/lib/types";
import { DexDialog } from "@/components/dexes/dex-dialog";
import { Loader2, Plus, Pencil, Trash2, RefreshCw } from "lucide-react";

export default function DexesPage() {
  const [dexes, setDexes] = useState<Dex[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDex, setSelectedDex] = useState<Dex | null>(null);

  const fetchDexes = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dexApi.getAll();
      setDexes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch DEXes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDexes();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this DEX?")) {
      return;
    }
    try {
      await dexApi.delete(id);
      await fetchDexes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete DEX");
    }
  };

  const handleEdit = (dex: Dex) => {
    setSelectedDex(dex);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedDex(null);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedDex(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">DEX Management</h1>
          <p className="text-muted-foreground">
            Manage decentralized exchanges and event topics
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchDexes} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleAdd} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add DEX
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
      ) : dexes.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {dexes.map((dex) => (
            <Card key={dex.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{dex.name}</CardTitle>
                    <CardDescription className="mt-1">
                      ID: {dex.id.substring(0, 8)}...
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      onClick={() => handleEdit(dex)}
                      variant="ghost"
                      size="sm"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(dex.id)}
                      variant="ghost"
                      size="sm"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <div className="text-sm font-medium">Swap Topic</div>
                  <div className="text-xs text-muted-foreground font-mono break-all">
                    {dex.swapTopic}
                  </div>
                </div>
                {dex.addLiquidityTopic && (
                  <div>
                    <div className="text-sm font-medium">Add Liquidity Topic</div>
                    <div className="text-xs text-muted-foreground font-mono break-all">
                      {dex.addLiquidityTopic}
                    </div>
                  </div>
                )}
                {dex.removeLiquidityTopic && (
                  <div>
                    <div className="text-sm font-medium">Remove Liquidity Topic</div>
                    <div className="text-xs text-muted-foreground font-mono break-all">
                      {dex.removeLiquidityTopic}
                    </div>
                  </div>
                )}
                <div className="text-xs text-muted-foreground pt-2">
                  Updated: {new Date(dex.updatedAt).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No DEXes configured. Click &quot;Add DEX&quot; to get started.
            </p>
          </CardContent>
        </Card>
      )}

      <DexDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        onSuccess={fetchDexes}
        dex={selectedDex}
      />
    </div>
  );
}
