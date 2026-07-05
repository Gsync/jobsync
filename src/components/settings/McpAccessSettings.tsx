"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Label } from "../ui/label";
import { toast } from "../ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Loader2, Plus, Trash2, Copy, Check } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import {
  createMcpToken,
  listMcpTokens,
  revokeMcpToken,
  type PublicTokenMeta,
} from "@/actions/mcpToken.actions";
import { APP_CONSTANTS } from "@/lib/constants";
import { format } from "date-fns";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Copy failed",
        description: "Couldn't copy to clipboard. Please copy the text manually.",
        variant: "destructive",
      });
    }
  };
  return (
    <Button variant="outline" size="sm" onClick={copy} className="shrink-0">
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

function CodeSnippet({ label, code }: { label: string; code: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <div className="flex gap-2 items-start">
        <pre className="flex-1 bg-muted rounded p-2 text-xs overflow-x-auto whitespace-pre-wrap break-all">{code}</pre>
        <CopyButton text={code} />
      </div>
    </div>
  );
}

function TokenRevealDialog({
  token,
  tokenName,
  mcpUrl,
  onClose,
}: {
  token: string;
  tokenName: string;
  mcpUrl: string;
  onClose: () => void;
}) {
  const ocSnippet = JSON.stringify(
    {
      mcpServers: {
        jobsync: {
          type: "streamable-http",
          url: mcpUrl,
          headers: { Authorization: `Bearer ${token}` },
        },
      },
    },
    null,
    2,
  );

  const isInsecureNonLocalhost = (() => {
    try {
      const { protocol, hostname } = new URL(mcpUrl);
      return protocol === "http:" && hostname !== "localhost" && hostname !== "127.0.0.1";
    } catch {
      return false;
    }
  })();

  const claudeSnippet = `npx mcp-remote ${mcpUrl} --header "Authorization: Bearer ${token}"${
    isInsecureNonLocalhost ? " --allow-http" : ""
  }`;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Token Created — Save It Now</DialogTitle>
          <DialogDescription>
            This is the only time you can see the full token. Copy it before closing.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs">Your token</Label>
            <div className="flex gap-2 items-center">
              <Input readOnly value={token} className="font-mono text-xs" />
              <CopyButton text={token} />
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Client config snippets</p>
            <CodeSnippet label="OpenClaw / Hermes (streamable-http)" code={ocSnippet} />
            <CodeSnippet label="Claude Desktop (via mcp-remote)" code={claudeSnippet} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>I saved my token</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function McpAccessSettings() {
  const [tokens, setTokens] = useState<PublicTokenMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [tokenName, setTokenName] = useState("");
  const [expiryDays, setExpiryDays] = useState<30 | 90 | 365>(
    APP_CONSTANTS.MCP_TOKEN_EXPIRY_DEFAULT_DAYS as 30 | 90 | 365,
  );

  const [revealedToken, setRevealedToken] = useState<{ token: string; name: string } | null>(null);

  const mcpUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/mcp`
      : "/api/mcp";

  const fetchTokens = async () => {
    setIsLoading(true);
    const result = await listMcpTokens();
    setTokens(result);
    setIsLoading(false);
  };

  useEffect(() => { fetchTokens(); }, []);

  const handleGenerate = async () => {
    if (!tokenName.trim()) return;
    setGenerating(true);
    const result = await createMcpToken({ name: tokenName.trim(), expiryDays });
    setGenerating(false);
    if (!result.success) {
      toast({ title: "Error", description: result.message, variant: "destructive" });
      return;
    }
    setRevealedToken({ token: result.token, name: result.record.name });
    setShowGenerateDialog(false);
    setTokenName("");
    setExpiryDays(APP_CONSTANTS.MCP_TOKEN_EXPIRY_DEFAULT_DAYS as 30 | 90 | 365);
    await fetchTokens();
  };

  const handleRevoke = async (id: string) => {
    setRevoking(id);
    const result = await revokeMcpToken(id);
    setRevoking(null);
    if (!result.success) {
      toast({ title: "Error", description: result.message ?? "Failed to revoke", variant: "destructive" });
      return;
    }
    setTokens((prev) => prev.filter((t) => t.id !== id));
    toast({ title: "Token revoked" });
  };

  return (
    <div className="space-y-6">
      {revealedToken && (
        <TokenRevealDialog
          token={revealedToken.token}
          tokenName={revealedToken.name}
          mcpUrl={mcpUrl}
          onClose={() => setRevealedToken(null)}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>MCP Endpoint</CardTitle>
          <CardDescription>Connect AI agents to JobSync via the Model Context Protocol.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Endpoint URL</Label>
            <div className="flex gap-2 items-center">
              <Input readOnly value={mcpUrl} className="font-mono text-sm" />
              <CopyButton text={mcpUrl} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div>
            <CardTitle>Personal Access Tokens</CardTitle>
            <CardDescription>Tokens authenticate external agents to call MCP tools.</CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowGenerateDialog(true)} disabled={isLoading}>
            <Plus className="h-4 w-4 mr-1" />
            Generate
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading tokens...
            </div>
          ) : tokens.length === 0 ? (
            <p className="text-sm text-muted-foreground">No MCP tokens yet. Generate one to get started.</p>
          ) : (
            <div className="space-y-3">
              {tokens.map((t) => (
                <div key={t.id} className="flex items-center justify-between border rounded p-3 gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{t.tokenPrefix}…</p>
                    <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                      <span>Created {format(new Date(t.createdAt), "PP")}</span>
                      <span>Expires {format(new Date(t.expiresAt), "PP")}</span>
                      {t.lastUsedAt && <span>Last used {format(new Date(t.lastUsedAt), "PP")}</span>}
                    </div>
                    <div className="flex gap-1 mt-1">
                      {t.scopes.map((s) => (
                        <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" disabled={revoking === t.id} title="Revoke token">
                        {revoking === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Revoke &ldquo;{t.name}&rdquo;?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Any agent using this token will immediately lose access. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleRevoke(t.id)}>Revoke</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate MCP Token</DialogTitle>
            <DialogDescription>
              Name this token after the client (e.g. ChatGPT, Hermes, Claude Desktop) &mdash; it&apos;s shown as the source on jobs this token creates.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Token name</Label>
              <Input
                placeholder="e.g. Claude Desktop"
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              />
            </div>
            <div className="space-y-2">
              <Label>Expires in</Label>
              <Select
                value={String(expiryDays)}
                onValueChange={(v) => setExpiryDays(Number(v) as 30 | 90 | 365)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APP_CONSTANTS.MCP_TOKEN_EXPIRY_PRESETS.map((d) => (
                    <SelectItem key={d} value={String(d)}>{d} days</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>Cancel</Button>
            <Button onClick={handleGenerate} disabled={generating || !tokenName.trim()}>
              {generating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
