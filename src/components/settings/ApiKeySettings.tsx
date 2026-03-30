"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Label } from "../ui/label";
import { toast } from "../ui/use-toast";
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
import { Loader2, Plus, Trash2, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import {
  getUserApiKeys,
  saveApiKey,
  deleteApiKey,
  getDefaultOllamaBaseUrl,
} from "@/actions/apiKey.actions";
import type {
  ApiKeyClientResponse,
  ApiKeyProvider,
} from "@/models/apiKey.model";
import { getAiProviders } from "@/lib/ai/provider-registry";
import { AiProvider } from "@/models/ai.model";
import { checkOllamaConnection } from "@/utils/ai.utils";

interface ProviderConfig {
  id: ApiKeyProvider;
  name: string;
  placeholder: string;
  inputType: "password" | "text";
  description: string;
  sensitive: boolean;
}

const PROVIDERS: ProviderConfig[] = [
  ...getAiProviders().map((entry) => ({
    id: entry.id as ApiKeyProvider,
    name: entry.displayName,
    placeholder: entry.keyConfig.placeholder,
    inputType: entry.keyConfig.inputType,
    description: entry.keyConfig.description,
    sensitive: entry.keyConfig.sensitive,
  })),
  {
    id: "rapidapi",
    name: "RapidAPI",
    placeholder: "Your RapidAPI key",
    inputType: "password" as const,
    description: "Used for JSearch job discovery automations",
    sensitive: true,
  },
];

function ApiKeySettings() {
  const [keys, setKeys] = useState<ApiKeyClientResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [defaultOllamaUrl, setDefaultOllamaUrl] = useState(
    "http://127.0.0.1:11434",
  );
  const [editingProvider, setEditingProvider] = useState<ApiKeyProvider | null>(
    null,
  );
  const [inputValue, setInputValue] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [ollamaConnected, setOllamaConnected] = useState<boolean | null>(null);
  const [ollamaChecking, setOllamaChecking] = useState(false);

  const recheckOllamaConnection = async () => {
    setOllamaChecking(true);
    const result = await checkOllamaConnection(AiProvider.OLLAMA);
    setOllamaConnected(result.isConnected);
    setOllamaChecking(false);
  };

  useEffect(() => {
    fetchKeys();
    getDefaultOllamaBaseUrl().then(setDefaultOllamaUrl);
    recheckOllamaConnection();
  }, []);

  const fetchKeys = async () => {
    setIsLoading(true);
    try {
      const result = await getUserApiKeys();
      if (result.success && result.data) {
        setKeys(result.data);
      }
    } catch (error) {
      console.error("Error fetching API keys:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getKeyForProvider = (provider: ApiKeyProvider) =>
    keys.find((k) => k.provider === provider);

  const isBaseUrlProvider = (providerId: string) => {
    const entry = getAiProviders().find((e) => e.id === providerId);
    return entry?.credentialType === "base-url";
  };

  const handleVerifyAndSave = async (provider: ApiKeyProvider) => {
    if (!inputValue.trim()) return;

    setVerifying(true);
    try {
      const verifyRes = await fetch("/api/settings/api-keys/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, key: inputValue }),
      });
      const verifyData = await verifyRes.json();

      if (!verifyData.success) {
        toast({
          variant: "destructive",
          title: "Verification failed",
          description: verifyData.error || "Could not verify the key",
        });
        return;
      }

      const providerConfig = PROVIDERS.find((p) => p.id === provider);
      const saveResult = await saveApiKey({
        provider,
        key: inputValue,
        sensitive: providerConfig?.sensitive ?? true,
      });
      if (saveResult.success) {
        toast({
          variant: "success",
          title: "API key saved",
          description: `${PROVIDERS.find((p) => p.id === provider)?.name} key verified and saved.`,
        });
        setEditingProvider(null);
        setInputValue("");
        await fetchKeys();
      } else {
        toast({
          variant: "destructive",
          title: "Save failed",
          description: saveResult.message || "Failed to save API key",
        });
      }
    } catch (error) {
      console.error("Error saving API key:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred",
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleDelete = async (provider: ApiKeyProvider) => {
    setDeleting(provider);
    try {
      const result = await deleteApiKey(provider);
      if (result.success) {
        toast({
          variant: "success",
          title: "API key deleted",
          description: `${PROVIDERS.find((p) => p.id === provider)?.name} key removed.`,
        });
        await fetchKeys();
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message || "Failed to delete API key",
        });
      }
    } catch (error) {
      console.error("Error deleting API key:", error);
    } finally {
      setDeleting(null);
    }
  };

  const handleCancel = () => {
    setEditingProvider(null);
    setInputValue("");
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">API Keys</h3>
          <p className="text-sm text-muted-foreground">
            Manage your API keys for AI providers and external services.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading keys...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">API Keys</h3>
        <p className="text-sm text-muted-foreground">
          Manage your API keys for AI providers and external services. Keys are
          encrypted and stored securely.
        </p>
      </div>

      <div className="grid gap-4">
        {PROVIDERS.map((provider) => {
          const existingKey = getKeyForProvider(provider.id);
          const isEditing = editingProvider === provider.id;
          const isBaseUrl = isBaseUrlProvider(provider.id);

          return (
            <Card key={provider.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{provider.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {provider.description}
                      {isBaseUrl && (
                        <span className="block text-xs text-muted-foreground/70 mt-0.5">
                          Default: {provider.id === "ollama" ? defaultOllamaUrl : provider.placeholder}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  {existingKey ? (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 hover:bg-green-100 dark:hover:bg-green-900">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {provider.sensitive
                        ? `····${existingKey.last4}`
                        : existingKey.displayValue || existingKey.last4}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Not configured</Badge>
                  )}
                </div>
              </CardHeader>
              {provider.id === "ollama" && (
                <div className="px-6 pb-3">
                  <div className="flex items-center gap-2">
                    {ollamaChecking ? (
                      <div className="flex items-center gap-1 text-muted-foreground text-sm">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Checking...</span>
                      </div>
                    ) : ollamaConnected === true ? (
                      <div className="flex items-center gap-1 text-green-600 text-sm">
                        <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>Ollama is running</span>
                      </div>
                    ) : ollamaConnected === false ? (
                      <div className="flex items-center gap-1 text-red-600 text-sm">
                        <XCircle className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>Ollama is not running</span>
                      </div>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={recheckOllamaConnection}
                      disabled={ollamaChecking}
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${ollamaChecking ? "animate-spin" : ""}`} />
                    </Button>
                  </div>
                </div>
              )}
              <CardContent>
                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor={`key-${provider.id}`}>
                        {isBaseUrl ? "Base URL" : "API Key"}
                      </Label>
                      <Input
                        id={`key-${provider.id}`}
                        type={provider.inputType}
                        placeholder={
                          isBaseUrl && provider.id === "ollama"
                            ? defaultOllamaUrl
                            : provider.placeholder
                        }
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleVerifyAndSave(provider.id)}
                        disabled={!inputValue.trim() || verifying}
                      >
                        {verifying && (
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        )}
                        Verify & Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancel}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingProvider(provider.id);
                        setInputValue("");
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {existingKey ? "Update Key" : "Add Key"}
                    </Button>
                    {existingKey && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                            disabled={deleting === provider.id}
                          >
                            {deleting === provider.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete API Key</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete your{" "}
                              {provider.name} key? The system will fall back to
                              the server environment variable if available.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(provider.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default ApiKeySettings;
