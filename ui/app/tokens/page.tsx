"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { tokenApi } from "@/lib/api";
import { Token } from "@/lib/types";
import { TokenDialog } from "@/components/tokens/token-dialog";
import { Loader2, Plus, Pencil, Trash2, RefreshCw } from "lucide-react";

const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum",
  56: "BSC",
  137: "Polygon",
  8453: "Base",
  42161: "Arbitrum",
  10: "Optimism",
};

export default function TokensPage() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);

  const fetchTokens = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await tokenApi.getAll();
      setTokens(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch tokens");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokens();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this token?")) {
      return;
    }
    try {
      await tokenApi.delete(id);
      await fetchTokens();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete token");
    }
  };

  const handleEdit = (token: Token) => {
    setSelectedToken(token);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedToken(null);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedToken(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Token Management</h1>
          <p className="text-muted-foreground">
            Manage tokens and their addresses across multiple chains
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchTokens} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleAdd} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Token
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
      ) : tokens.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tokens.map((token) => (
            <Card key={token.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {token.symbol}
                      {token.stable && (
                        <Badge variant="secondary" className="text-xs">
                          Stable
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {token.name}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      onClick={() => handleEdit(token)}
                      variant="ghost"
                      size="sm"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(token.id)}
                      variant="ghost"
                      size="sm"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {token.description && (
                  <p className="text-sm text-muted-foreground">
                    {token.description}
                  </p>
                )}
                <div>
                  <div className="text-sm font-medium mb-2">
                    Addresses ({token.addresses.length})
                  </div>
                  {token.addresses.length > 0 ? (
                    <div className="space-y-2">
                      {token.addresses.map((addr) => (
                        <div
                          key={addr.id}
                          className="text-xs border rounded p-2 space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-xs">
                              {CHAIN_NAMES[addr.chainId] || `Chain ${addr.chainId}`}
                            </Badge>
                            {addr.decimals && (
                              <span className="text-muted-foreground">
                                {addr.decimals} decimals
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-muted-foreground break-all">
                            {addr.address}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No addresses configured
                    </p>
                  )}
                </div>
                <div className="text-xs text-muted-foreground pt-2">
                  Updated: {new Date(token.updatedAt).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No tokens configured. Click &quot;Add Token&quot; to get started.
            </p>
          </CardContent>
        </Card>
      )}

      <TokenDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        onSuccess={fetchTokens}
        token={selectedToken}
      />
    </div>
  );
}
