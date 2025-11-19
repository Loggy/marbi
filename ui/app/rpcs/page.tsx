"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { evmListenerApi } from "@/lib/api";
import { EvmListenerStatus } from "@/lib/types";
import { AddChainDialog } from "@/components/rpcs/add-chain-dialog";
import { Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";

export default function RPCsPage() {
  const [status, setStatus] = useState<EvmListenerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await evmListenerApi.getStatus();
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleRemoveChain = async (chainId: number) => {
    try {
      await evmListenerApi.removeChain(chainId);
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove chain");
    }
  };

  const handleRestartChain = async (chainId: number) => {
    try {
      await evmListenerApi.restartChain(chainId);
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to restart chain");
    }
  };

  const handleStopAll = async () => {
    try {
      await evmListenerApi.stopAll();
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stop all chains");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">RPC Management</h1>
          <p className="text-muted-foreground">
            Manage EVM blockchain RPC connections and monitoring
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchStatus} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleStopAll} variant="outline" size="sm">
            Stop All
          </Button>
          <Button onClick={() => setAddDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Chain
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
      ) : status ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Total Chains</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{status.totalChains || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Active Chains</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{status.activeChains || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Workers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{status.workers?.length || 0}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Chain Workers</CardTitle>
              <CardDescription>
                Status and metrics for each monitored blockchain
              </CardDescription>
            </CardHeader>
            <CardContent>
              {status.workers && status.workers.length > 0 ? (
                <div className="space-y-4">
                  {status.workers.map((worker) => (
                    <div
                      key={worker.chainId}
                      className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Chain ID: {worker.chainId}</span>
                          <Badge variant={worker.status === "active" ? "default" : "secondary"}>
                            {worker.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {worker.blockNumber && (
                            <span>Block: {worker.blockNumber}</span>
                          )}
                          {worker.latency && (
                            <span className="ml-4">Latency: {worker.latency}ms</span>
                          )}
                          {worker.errors !== undefined && (
                            <span className="ml-4">Errors: {worker.errors}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleRestartChain(worker.chainId)}
                          variant="outline"
                          size="sm"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleRemoveChain(worker.chainId)}
                          variant="outline"
                          size="sm"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No chain workers configured
                </p>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}

      <AddChainDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={fetchStatus}
      />
    </div>
  );
}
