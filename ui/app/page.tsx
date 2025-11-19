import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your arbitrage trading engine configuration
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/rpcs">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle>RPCs</CardTitle>
              <CardDescription>
                Manage blockchain RPC connections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Configure WebSocket RPC endpoints for EVM chains
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dexes">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle>DEXes</CardTitle>
              <CardDescription>
                Manage decentralized exchanges
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Configure DEX swap topics and event signatures
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/tokens">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle>Tokens</CardTitle>
              <CardDescription>
                Manage tokens and addresses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Track tokens across multiple chains
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/pools">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle>Pools</CardTitle>
              <CardDescription>
                Manage liquidity pools
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Configure token pairs and pool addresses
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/strategies">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle>Strategies</CardTitle>
              <CardDescription>
                Manage trading strategies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Configure arbitrage strategies and assign pools
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
