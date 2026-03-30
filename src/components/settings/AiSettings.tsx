"use client";
import { useEffect, useState } from "react";
import {
  AiModel,
  AiProvider,
  defaultModel,
  OpenaiModel,
  DeepseekModel,
  GeminiModel,
} from "@/models/ai.model";
import {
  PROVIDER_REGISTRY,
  AI_PROVIDERS,
} from "@/lib/ai/provider-registry";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { toast } from "../ui/use-toast";
import { XCircle, Loader2 } from "lucide-react";
import { checkOllamaConnection } from "@/utils/ai.utils";
import { getUserSettings, updateAiSettings } from "@/actions/userSettings.actions";

function AiSettings() {
  const [selectedModel, setSelectedModel] = useState<AiModel>(defaultModel);
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [fetchError, setFetchError] = useState<string>("");
  const [connectionError, setConnectionError] = useState<string>("");


  const setSelectedProvider = (provider: AiProvider) => {
    setSelectedModel({ provider, model: undefined });
    setFetchError("");
    setConnectionError("");
  };

  const setSelectedProviderModel = (model: string) => {
    setSelectedModel({ ...selectedModel, model });
  };

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoadingSettings(true);
      try {
        const settingsResult = await getUserSettings();

        if (settingsResult.success && settingsResult.data?.settings?.ai) {
          const aiSettings = settingsResult.data.settings.ai;
          setSelectedModel({
            provider: aiSettings.provider || defaultModel.provider,
            model: aiSettings.model,
          });
        }
      } catch (error) {
        console.error("Error fetching user settings:", error);
      } finally {
        setIsLoadingSettings(false);
        setIsInitialized(true);
      }
    };
    fetchSettings();
  }, []);

  const getFallbackModels = (provider: AiProvider): string[] => {
    switch (provider) {
      case AiProvider.OPENAI:
        return Object.values(OpenaiModel);
      case AiProvider.DEEPSEEK:
        return Object.values(DeepseekModel);
      case AiProvider.GEMINI:
        return Object.values(GeminiModel);
      default:
        return [];
    }
  };

  useEffect(() => {
    if (!isInitialized) return;
    const entry = PROVIDER_REGISTRY[selectedModel.provider];
    if (!entry) return;

    if (!entry.modelsEndpoint) {
      setFetchedModels(getFallbackModels(selectedModel.provider));
      return;
    }

    const fallback = getFallbackModels(selectedModel.provider);
    let cancelled = false;
    setIsLoadingModels(true);
    setFetchError("");
    setConnectionError("");

    (async () => {
      try {
        if (entry.category === "local") {
          const connResult = await checkOllamaConnection(selectedModel.provider as AiProvider);
          if (!connResult.isConnected) {
            if (!cancelled) {
              setFetchedModels(fallback);
              setConnectionError(connResult.error || "Ollama is not reachable.");
            }
            return;
          }
        }
        const response = await fetch(`/api/ai/${entry.modelsEndpoint}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          const errorMsg = errorData?.error
            || (entry.category === "local"
              ? `Failed to fetch ${entry.displayName} models. Make sure ${entry.displayName} is running.`
              : `Failed to fetch ${entry.displayName} models. Please check your API key in API Keys settings.`);
          if (!cancelled) {
            setFetchError(errorMsg);
            setFetchedModels(fallback);
          }
          return;
        }
        const data = await response.json();
        const models = entry.parseModelsResponse?.(data) ?? [];
        if (!cancelled) {
          setFetchedModels(models.length > 0 ? models : fallback);
        }
      } catch (error) {
        console.error(`Error fetching ${entry.displayName} models:`, error);
        if (!cancelled) {
          setFetchedModels(fallback);
          setFetchError(
            entry.category === "local"
              ? `Failed to fetch ${entry.displayName} models. Make sure ${entry.displayName} is running.`
              : `Failed to fetch ${entry.displayName} models. Please check your API key in API Keys settings.`,
          );
        }
      } finally {
        if (!cancelled) setIsLoadingModels(false);
      }
    })();

    return () => { cancelled = true; };
  }, [selectedModel.provider, isInitialized]);

  const saveModelSettings = async () => {
    if (!selectedModel.model) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a model to save.",
      });
      return;
    }
    setIsSaving(true);
    try {
      const result = await updateAiSettings({
        provider: selectedModel.provider,
        model: selectedModel.model,
      });
      if (result.success) {
        toast({
          variant: "success",
          title: "Saved!",
          description: "AI Settings saved successfully.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message || "Failed to save AI settings.",
        });
      }
    } catch (error) {
      console.error("Error saving AI settings:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save AI settings.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingSettings) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">AI Provider</h3>
          <p className="text-sm text-muted-foreground">
            Configure your AI service provider and model.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">AI Provider</h3>
        <p className="text-sm text-muted-foreground">
          Configure your AI service provider and model.
        </p>
      </div>
      <div>
        <Label className="my-4" htmlFor="ai-provider">
          AI Service Provider
        </Label>
        <Select
          value={selectedModel.provider}
          onValueChange={setSelectedProvider}
        >
          <SelectTrigger
            id="ai-provider"
            aria-label="Select AI provider"
            className="w-[180px]"
          >
            <SelectValue placeholder="Select AI Service Provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {AI_PROVIDERS.map((id) => {
                const entry = PROVIDER_REGISTRY[id];
                return (
                  <SelectItem key={id} value={id} className="capitalize">
                    {entry.displayName}
                  </SelectItem>
                );
              })}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="my-4" htmlFor="ai-model">
          Model
        </Label>
        <div className="flex items-start gap-2">
          <Select
            value={selectedModel.model}
            onValueChange={setSelectedProviderModel}
            disabled={isLoadingModels}
          >
            <SelectTrigger
              id="ai-model"
              aria-label="Select Model"
              className="w-[180px]"
            >
              <SelectValue
                placeholder={
                  isLoadingModels ? "Loading models..." : "Select AI Model"
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {fetchedModels.map((model) => (
                  <SelectItem key={model} value={model} className="capitalize">
                    {model}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {fetchError && (
            <div className="flex items-center gap-1 text-red-600 text-sm mt-2">
              <XCircle className="h-4 w-4 flex-shrink-0" />
              <span>{fetchError}</span>
            </div>
          )}
          {connectionError && (
            <div className="flex items-center gap-1 text-red-600 text-sm mt-2">
              <XCircle className="h-4 w-4 flex-shrink-0" />
              <span>{connectionError}</span>
            </div>
          )}
        </div>
      </div>
      <Button
        className="mt-4"
        onClick={saveModelSettings}
        disabled={!selectedModel.model || isLoadingModels || isSaving}
      >
        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save
      </Button>
    </div>
  );
}

export default AiSettings;
