"use client";
import { useEffect, useState } from "react";
import {
  AiModel,
  AiProvider,
  defaultModel,
  OpenaiModel,
  DeepseekModel,
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
import { XCircle, CheckCircle, Loader2 } from "lucide-react";
import { checkIfModelIsRunning } from "@/utils/ai.utils";
import { getUserSettings, updateAiSettings } from "@/actions/userSettings.actions";

function AiSettings() {
  const [selectedModel, setSelectedModel] = useState<AiModel>(defaultModel);
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [fetchError, setFetchError] = useState<string>("");
  const [runningModelError, setRunningModelError] = useState<string>("");
  const [runningModelName, setRunningModelName] = useState<string>("");

  const currentEntry = PROVIDER_REGISTRY[selectedModel.provider];

  const setSelectedProvider = (provider: AiProvider) => {
    setSelectedModel({ provider, model: undefined });
    setFetchError("");
    setRunningModelError("");
    setRunningModelName("");
  };

  const setSelectedProviderModel = async (model: string) => {
    setSelectedModel({ ...selectedModel, model });
    setRunningModelName("");
    setRunningModelError("");

    if (currentEntry?.requiresRunningCheck) {
      const result = await checkIfModelIsRunning(model, selectedModel.provider);
      if (result.isRunning && result.runningModelName) {
        setRunningModelName(result.runningModelName);
        if (currentEntry.supportsKeepAlive) {
          await keepModelAlive(result.runningModelName);
        }
      } else if (result.error) {
        setRunningModelError(result.error);
      }
    }
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
      default:
        return [];
    }
  };

  useEffect(() => {
    if (!isInitialized) return;
    const entry = PROVIDER_REGISTRY[selectedModel.provider];
    if (!entry) return;

    if (entry.modelsEndpoint) {
      fetchModels(entry);
    } else {
      setFetchedModels(getFallbackModels(selectedModel.provider));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModel.provider, isInitialized]);

  const fetchModels = async (entry: typeof currentEntry) => {
    if (!entry?.modelsEndpoint) return;
    const fallback = getFallbackModels(selectedModel.provider);
    setIsLoadingModels(true);
    setFetchError("");
    try {
      const response = await fetch(`/api/ai/${entry.modelsEndpoint}`);
      if (!response.ok) {
        setFetchedModels(fallback);
        if (entry.category === "local") {
          setFetchError(
            `Failed to fetch ${entry.displayName} models. Make sure ${entry.displayName} is running.`,
          );
        }
        return;
      }
      const data = await response.json();
      const models = entry.parseModelsResponse?.(data) ?? [];
      setFetchedModels(models.length > 0 ? models : fallback);

      if (entry.requiresRunningCheck) {
        await fetchRunningModel();
      }
    } catch (error) {
      console.error(`Error fetching ${entry.displayName} models:`, error);
      setFetchedModels(fallback);
      if (entry.category === "local") {
        setFetchError(
          `Failed to fetch ${entry.displayName} models. Make sure ${entry.displayName} is running.`,
        );
      }
    } finally {
      setIsLoadingModels(false);
    }
  };

  const keepModelAlive = async (modelName: string) => {
    try {
      await fetch("/api/ai/ollama/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: modelName,
          prompt: "",
          keep_alive: "1h",
          stream: false,
        }),
      });
    } catch (error) {
      console.error("Error keeping model alive:", error);
    }
  };

  const fetchRunningModel = async () => {
    setRunningModelError("");
    setRunningModelName("");
    try {
      const response = await fetch("/api/ai/ollama/ps");
      if (!response.ok) {
        if (currentEntry?.requiresRunningCheck) {
          setRunningModelError(
            "No model is currently running. Please start a model first.",
          );
        }
        return;
      }
      const data = await response.json();
      if (data.models && data.models.length > 0) {
        const runningModel = data.models[0].name;
        setSelectedModel({
          provider: AiProvider.OLLAMA,
          model: runningModel,
        });
        const result = await checkIfModelIsRunning(
          runningModel,
          AiProvider.OLLAMA,
        );
        if (result.isRunning && result.runningModelName) {
          setRunningModelName(result.runningModelName);
          if (currentEntry?.supportsKeepAlive) {
            await keepModelAlive(result.runningModelName);
          }
        } else if (result.error) {
          setRunningModelError(result.error);
        }
      } else {
        if (currentEntry?.requiresRunningCheck) {
          setRunningModelError(
            `No model is currently running. Please run the ${currentEntry.displayName} model first.`,
          );
        }
      }
    } catch (error) {
      console.error("Error fetching running model:", error);
      if (currentEntry?.requiresRunningCheck) {
        setRunningModelError(
          `No model is currently running. Please run the ${currentEntry.displayName} model first.`,
        );
      }
    }
  };

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
        </div>
        {runningModelName && (
          <div className="flex items-center gap-1 text-green-600 text-sm mt-2">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            <span>{runningModelName} is running</span>
          </div>
        )}
        {runningModelError && (
          <div className="flex items-center gap-1 text-red-600 text-sm mt-2">
            <XCircle className="h-4 w-4 flex-shrink-0" />
            <span>{runningModelError}</span>
          </div>
        )}
      </div>
      <Button
        className="mt-4"
        onClick={saveModelSettings}
        disabled={
          !selectedModel.model ||
          (currentEntry?.requiresRunningCheck && !runningModelName) ||
          isLoadingModels ||
          isSaving
        }
      >
        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save
      </Button>
    </div>
  );
}

export default AiSettings;
