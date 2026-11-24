"use client";

import { useEffect, useRef, useState } from "react";
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
import { toastSuccess, toastError } from "@/lib/toast";
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
import { getAiProviders, isLocalProvider, PROVIDER_REGISTRY } from "@/lib/ai/provider-registry";
import { checkLocalProviderConnection } from "@/utils/ai.utils";
import { getUserSettings } from "@/actions/userSettings.actions";

interface ProviderConfig {
  id: ApiKeyProvider;
  name: string;
  placeholder: string;
  inputType: "password" | "text";
  description: string;
  sensitive: boolean;
}

const PROVIDERS: ProviderConfig[] = getAiProviders().map((entry) => ({
  id: entry.id as ApiKeyProvider,
  name: entry.displayName,
  placeholder: entry.keyConfig.placeholder,
  inputType: entry.keyConfig.inputType,
  description: entry.keyConfig.description,
  sensitive: entry.keyConfig.sensitive,
}));

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
  // An absent entry is unchecked. Null means a check is in progress.
  const [connections, setConnections] = useState<Partial<Record<ApiKeyProvider, boolean | null>>>({});

  const pendingChecks = useRef(new Map<ApiKeyProvider, ReturnType<typeof checkLocalProviderConnection>>());

  const recheckConnection = async (provider: ApiKeyProvider) => {
    setConnections((prev) => ({ ...prev, [provider]: null }));
    const check = checkLocalProviderConnection(provider);
    pendingChecks.current.set(provider, check);
    const result = await check;
    if (pendingChecks.current.get(provider) !== check) return;
    pendingChecks.current.delete(provider);
    setConnections((prev) => ({ ...prev, [provider]: result.isConnected }));
  };

  const applyKeys = (
    result: Awaited<ReturnType<typeof getUserApiKeys>>,
  ) => {
    if (result.success && result.data) {
      setKeys(result.data);
    }
  };

  const fetchKeys = async () => {
    setIsLoading(true);
    try {
      applyKeys(await getUserApiKeys());
    } catch (error) {
      console.error("Error fetching API keys:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // isLoading starts true, so the mount load needs no setState of its own.
  useEffect(() => {
    getUserApiKeys()
      .then(applyKeys)
      .catch((error) => console.error("Error fetching API keys:", error))
      .finally(() => setIsLoading(false));
    getDefaultOllamaBaseUrl().then(setDefaultOllamaUrl);
    getUserSettings().then((result) => {
      const provider = result?.data?.settings?.ai?.provider;
      if (result?.success && provider && isLocalProvider(provider)) {
        void recheckConnection(provider);
      }
    });
  }, []);

  const getKeyForProvider = (provider: ApiKeyProvider) =>
    keys.find((k) => k.provider === provider);

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
        const title =
          verifyData.reason === "unreachable"
            ? `Cannot reach ${PROVIDERS.find((p) => p.id === provider)?.name ?? provider}`
            : "Verification failed";
        toastError(verifyData.error || "Could not verify the key", title);
        return;
      }

      const providerConfig = PROVIDERS.find((p) => p.id === provider);
      const saveResult = await saveApiKey({
        provider,
        key: inputValue,
        sensitive: providerConfig?.sensitive ?? true,
      });
      if (saveResult.success) {
        toastSuccess(`${PROVIDERS.find((p) => p.id === provider)?.name} key verified and saved.`, "API key saved");
        setEditingProvider(null);
        setInputValue("");
        if (isLocalProvider(provider)) void recheckConnection(provider);
        await fetchKeys();
      } else {
        toastError(saveResult.message || "Failed to save API key", "Save failed");
      }
    } catch (error) {
      console.error("Error saving API key:", error);
      toastError("An unexpected error occurred");
    } finally {
      setVerifying(false);
    }
  };

  const handleDelete = async (provider: ApiKeyProvider) => {
    setDeleting(provider);
    try {
      const result = await deleteApiKey(provider);
      if (result.success) {
        toastSuccess(`${PROVIDERS.find((p) => p.id === provider)?.name} key removed.`, "API key deleted");
        if (isLocalProvider(provider)) void recheckConnection(provider);
        await fetchKeys();
      } else {
        toastError(result.message || "Failed to delete API key");
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
          const entry = PROVIDER_REGISTRY[provider.id];
          const isBaseUrl = entry.credentialType === "base-url";
          const defaultUrl = provider.id === "ollama" ? defaultOllamaUrl : entry.defaultCredential;
          const connected = connections[provider.id];
          const checking = connected === null;

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
                          Default: {defaultUrl ?? "none — set a URL"}
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
              {isLocalProvider(provider.id) && (
                <div className="px-6 pb-3">
                  <div className="flex items-center gap-2">
                    {checking ? (
                      <div className="flex items-center gap-1 text-muted-foreground text-sm">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Checking...</span>
                      </div>
                    ) : connected === true ? (
                      <div className="flex items-center gap-1 text-green-600 text-sm">
                        <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>{provider.name} is running</span>
                      </div>
                    ) : connected === false ? (
                      <div className="flex items-center gap-1 text-red-600 text-sm">
                        <XCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>{provider.name} is not running</span>
                      </div>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      aria-label={`Check ${provider.name} connection`}
                      onClick={() => recheckConnection(provider.id)}
                      disabled={checking}
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${checking ? "animate-spin" : ""}`} />
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
                            {isBaseUrl && (
                              <span className="ml-1">{defaultUrl ? "Reset to default" : "Remove"}</span>
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {isBaseUrl
                                ? `${defaultUrl ? "Reset" : "Remove"} ${provider.name} Base URL`
                                : "Delete API Key"}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {isBaseUrl ? (
                                defaultUrl
                                  ? `Clear the saved ${provider.name} base URL? JobSync will use the server default, ${defaultUrl}.`
                                  : `Clear the saved ${provider.name} base URL? It stops working until you add one again, unless the server sets ${entry.envVar}.`
                              ) : (
                                <>
                                  Are you sure you want to delete your{" "}
                                  {provider.name} key? The system will fall back
                                  to the server environment variable if
                                  available.
                                </>
                              )}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(provider.id)}
                            >
                              {isBaseUrl ? (defaultUrl ? "Reset" : "Remove") : "Delete"}
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
