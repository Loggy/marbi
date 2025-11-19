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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { poolApi, dexApi, tokenApi } from "@/lib/api";
import { Pool, Dex, Token } from "@/lib/types";
import { Loader2 } from "lucide-react";

interface PoolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  pool?: Pool | null;
}

export function PoolDialog({ open, onOpenChange, onSuccess, pool }: PoolDialogProps) {
  const [poolAddress, setPoolAddress] = useState("");
  const [chainId, setChainId] = useState("1");
  const [token0Id, setToken0Id] = useState("");
  const [token0Address, setToken0Address] = useState("");
  const [token1Id, setToken1Id] = useState("");
  const [token1Address, setToken1Address] = useState("");
  const [dexId, setDexId] = useState("");
  const [fee, setFee] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dexes, setDexes] = useState<Dex[]>([]);
  const [tokens, setTokens] = useState<Token[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dexData, tokenData] = await Promise.all([
          dexApi.getAll(),
          tokenApi.getAll(),
        ]);
        setDexes(dexData);
        setTokens(tokenData);
      } catch (err) {
        console.error("Failed to fetch data:", err);
      }
    };
    if (open) {
      fetchData();
    }
  }, [open]);

  useEffect(() => {
    if (pool) {
      setPoolAddress(pool.poolAddress);
      setChainId(pool.chainId.toString());
      setToken0Id(pool.token0Id);
      setToken0Address(pool.token0Address);
      setToken1Id(pool.token1Id);
      setToken1Address(pool.token1Address);
      setDexId(pool.dexId);
      setFee(pool.fee !== undefined ? pool.fee.toString() : "");
    } else {
      setPoolAddress("");
      setChainId("1");
      setToken0Id("");
      setToken0Address("");
      setToken1Id("");
      setToken1Address("");
      setDexId("");
      setFee("");
    }
    setError(null);
  }, [pool, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poolAddress || !chainId || !token0Id || !token0Address || !token1Id || !token1Address || !dexId) {
      setError("All required fields must be filled");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = {
        poolAddress,
        chainId: parseInt(chainId, 10),
        token0Id,
        token0Address,
        token1Id,
        token1Address,
        dexId,
        ...(fee && { fee: parseFloat(fee) }),
      };

      if (pool) {
        await poolApi.update(pool.id, data);
      } else {
        await poolApi.create(data);
      }

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${pool ? "update" : "create"} pool`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{pool ? "Edit Pool" : "Add Pool"}</DialogTitle>
            <DialogDescription>
              {pool ? "Update pool configuration" : "Add a new liquidity pool"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="poolAddress">Pool Address *</Label>
                <Input
                  id="poolAddress"
                  placeholder="0x..."
                  value={poolAddress}
                  onChange={(e) => setPoolAddress(e.target.value)}
                  disabled={loading}
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chainId">Chain ID *</Label>
                <Input
                  id="chainId"
                  type="number"
                  placeholder="1"
                  value={chainId}
                  onChange={(e) => setChainId(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dexId">DEX *</Label>
              <Select value={dexId} onValueChange={setDexId} disabled={loading}>
                <SelectTrigger id="dexId">
                  <SelectValue placeholder="Select a DEX" />
                </SelectTrigger>
                <SelectContent>
                  {dexes.map((dex) => (
                    <SelectItem key={dex.id} value={dex.id}>
                      {dex.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Token 0 *</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="token0Id" className="text-xs">
                    Token ID
                  </Label>
                  <Select value={token0Id} onValueChange={setToken0Id} disabled={loading}>
                    <SelectTrigger id="token0Id">
                      <SelectValue placeholder="Select token" />
                    </SelectTrigger>
                    <SelectContent>
                      {tokens.map((token) => (
                        <SelectItem key={token.id} value={token.id}>
                          {token.symbol} - {token.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="token0Address" className="text-xs">
                    Address on Chain
                  </Label>
                  <Input
                    id="token0Address"
                    placeholder="0x..."
                    value={token0Address}
                    onChange={(e) => setToken0Address(e.target.value)}
                    disabled={loading}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Token 1 *</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="token1Id" className="text-xs">
                    Token ID
                  </Label>
                  <Select value={token1Id} onValueChange={setToken1Id} disabled={loading}>
                    <SelectTrigger id="token1Id">
                      <SelectValue placeholder="Select token" />
                    </SelectTrigger>
                    <SelectContent>
                      {tokens.map((token) => (
                        <SelectItem key={token.id} value={token.id}>
                          {token.symbol} - {token.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="token1Address" className="text-xs">
                    Address on Chain
                  </Label>
                  <Input
                    id="token1Address"
                    placeholder="0x..."
                    value={token1Address}
                    onChange={(e) => setToken1Address(e.target.value)}
                    disabled={loading}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fee">Fee (basis points)</Label>
              <Input
                id="fee"
                type="number"
                placeholder="30"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                e.g., 30 for 0.3%, 100 for 1%
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
              {pool ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
