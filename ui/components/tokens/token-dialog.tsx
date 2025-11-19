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
import { Badge } from "@/components/ui/badge";
import { tokenApi } from "@/lib/api";
import { Token, CreateTokenAddressDto } from "@/lib/types";
import { Loader2, Plus, Trash2 } from "lucide-react";

interface TokenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  token?: Token | null;
}

export function TokenDialog({ open, onOpenChange, onSuccess, token }: TokenDialogProps) {
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [addresses, setAddresses] = useState<CreateTokenAddressDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      setSymbol(token.symbol);
      setName(token.name);
      setDescription(token.description || "");
      setAddresses(
        token.addresses.map((addr) => ({
          address: addr.address,
          chainId: addr.chainId,
          decimals: addr.decimals,
        }))
      );
    } else {
      setSymbol("");
      setName("");
      setDescription("");
      setAddresses([]);
    }
    setError(null);
  }, [token, open]);

  const handleAddAddress = () => {
    setAddresses([...addresses, { address: "", chainId: 1, decimals: 18 }]);
  };

  const handleRemoveAddress = (index: number) => {
    setAddresses(addresses.filter((_, i) => i !== index));
  };

  const handleAddressChange = (
    index: number,
    field: keyof CreateTokenAddressDto,
    value: string | number | undefined
  ) => {
    const newAddresses = [...addresses];
    if (value === "") {
      const { [field]: _, ...rest } = newAddresses[index];
      newAddresses[index] = rest as CreateTokenAddressDto;
    } else {
      newAddresses[index] = { ...newAddresses[index], [field]: value as never };
    }
    setAddresses(newAddresses);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !name) {
      setError("Symbol and Name are required");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = {
        symbol,
        name,
        ...(description && { description }),
      };

      if (token) {
        await tokenApi.update(token.id, data);
      } else {
        await tokenApi.create({
          ...data,
          addresses: addresses.filter((addr) => addr.address),
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${token ? "update" : "create"} token`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{token ? "Edit Token" : "Add Token"}</DialogTitle>
            <DialogDescription>
              {token ? "Update token information" : "Add a new token with optional addresses"}
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
                <Label htmlFor="symbol">Symbol *</Label>
                <Input
                  id="symbol"
                  placeholder="USDC"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="USD Coin"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Optional description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
              />
            </div>

            {!token && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Addresses</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddAddress}
                    disabled={loading}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Address
                  </Button>
                </div>
                {addresses.length > 0 ? (
                  <div className="space-y-3">
                    {addresses.map((addr, index) => (
                      <div key={index} className="border rounded p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary">Address {index + 1}</Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveAddress(index)}
                            disabled={loading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`address-${index}`}>Address</Label>
                          <Input
                            id={`address-${index}`}
                            placeholder="0x..."
                            value={addr.address}
                            onChange={(e) =>
                              handleAddressChange(index, "address", e.target.value)
                            }
                            disabled={loading}
                            className="font-mono text-sm"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-2">
                            <Label htmlFor={`chainId-${index}`}>Chain ID</Label>
                            <Input
                              id={`chainId-${index}`}
                              type="number"
                              placeholder="1"
                              value={addr.chainId}
                              onChange={(e) =>
                                handleAddressChange(
                                  index,
                                  "chainId",
                                  parseInt(e.target.value, 10)
                                )
                              }
                              disabled={loading}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`decimals-${index}`}>Decimals</Label>
                            <Input
                              id={`decimals-${index}`}
                              type="number"
                              placeholder="18"
                              value={addr.decimals || ""}
                              onChange={(e) =>
                                handleAddressChange(
                                  index,
                                  "decimals",
                                  e.target.value ? parseInt(e.target.value, 10) : undefined
                                )
                              }
                              disabled={loading}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No addresses added. Click &quot;Add Address&quot; to add token addresses.
                  </p>
                )}
              </div>
            )}
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
              {token ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
