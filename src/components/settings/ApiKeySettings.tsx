"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
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
import { Loader2, Plus, Trash2, CheckCircle } from "lucide-react";
import { getUserApiKeys, saveApiKey, deleteApiKey } from "@/actions/apiKey.actions";
import type { ApiKeyClientResponse, ApiKeyProvider } from "@/models/apiKey.model";

interface ProviderConfig {
  id: ApiKeyProvider;
  name: string;
  placeholder: string;
  inputType: "password" | "text";
  description: string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: "openai",
    name: "OpenAI",
    placeholder: "sk-...",
    inputType: "password",
    description: "Used for GPT models in resume review and job matching",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    placeholder: "sk-...",
    inputType: "password",
    description: "Used for DeepSeek models in resume review and job matching",
  },
  {
    id: "rapidapi",
    name: "RapidAPI",
    placeholder: "Your RapidAPI key",
    inputType: "password",
    description: "Used for JSearch job discovery automations",
  },
  {
    id: "ollama",
    name: "Ollama",
    placeholder: "http://127.0.0.1:11434",
    inputType: "text",
    description: "Base URL for your Ollama instance",
  },
];

function ApiKeySettings() {
  const [keys, setKeys] = useState<ApiKeyClientResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingProvider, setEditingProvider] = useState<ApiKeyProvider | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchKeys();
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

      const saveResult = await saveApiKey({ provider, key: inputValue });
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
          Manage your API keys for AI providers and external services. Keys are encrypted and stored securely.
        </p>
      </div>

      <div className="grid gap-4">
        {PROVIDERS.map((provider) => {
          const existingKey = getKeyForProvider(provider.id);
          const isEditing = editingProvider === provider.id;

          return (
            <Card key={provider.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{provider.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {provider.description}
                    </CardDescription>
                  </div>
                  {existingKey ? (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 hover:bg-green-100 dark:hover:bg-green-900">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      ····{existingKey.last4}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Not configured</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor={`key-${provider.id}`}>
                        {provider.id === "ollama" ? "Base URL" : "API Key"}
                      </Label>
                      <Input
                        id={`key-${provider.id}`}
                        type={provider.inputType}
                        placeholder={provider.placeholder}
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
                        {verifying && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                        Verify & Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleCancel}>
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
                              Are you sure you want to delete your {provider.name} key?
                              The system will fall back to the server environment variable if available.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(provider.id)}>
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
