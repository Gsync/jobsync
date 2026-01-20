"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  AiModel,
  AiProvider,
  defaultModel,
  OpenaiModel,
  DeepseekModel,
} from "@/models/ai.model";
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
import {
  getFromLocalStorage,
  saveToLocalStorage,
} from "@/utils/localstorage.utils";
import { toast } from "../ui/use-toast";
import { XCircle, CheckCircle } from "lucide-react";
import { checkIfModelIsRunning } from "@/utils/ai.utils";

interface OllamaModelResponse {
  models: {
    name: string;
    model: string;
  }[];
}

interface OllamaRunningModelResponse {
  models: {
    name: string;
    model: string;
  }[];
}

interface DeepseekModelResponse {
  object: string;
  data: {
    id: string;
    object: string;
    owned_by: string;
  }[];
}

function AiSettings() {
  const [selectedModel, setSelectedModel] = useState<AiModel>(defaultModel);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [deepseekModels, setDeepseekModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [fetchError, setFetchError] = useState<string>("");
  const [runningModelError, setRunningModelError] = useState<string>("");
  const [runningModelName, setRunningModelName] = useState<string>("");

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

    // Check if the selected model is running (only for Ollama)
    if (selectedModel.provider === AiProvider.OLLAMA) {
      const result = await checkIfModelIsRunning(model, selectedModel.provider);
      if (result.isRunning && result.runningModelName) {
        setRunningModelName(result.runningModelName);
        // Keep the model alive indefinitely
        await keepModelAlive(result.runningModelName);
      } else if (result.error) {
        setRunningModelError(result.error);
      }
    }
  };

  useEffect(() => {
    const savedSettings = getFromLocalStorage("aiSettings", selectedModel);
    setSelectedModel(savedSettings);
    setIsInitialized(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isInitialized && selectedModel.provider === AiProvider.OLLAMA) {
      fetchOllamaModels();
    }
    if (isInitialized && selectedModel.provider === AiProvider.DEEPSEEK) {
      fetchDeepseekModels();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModel.provider, isInitialized]);

  const fetchOllamaModels = async () => {
    setIsLoadingModels(true);
    setFetchError("");
    try {
      const response = await fetch("http://localhost:11434/api/tags");
      if (!response.ok) {
        if (selectedModel.provider === AiProvider.OLLAMA) {
          setFetchError(
            "Failed to fetch Ollama models. Make sure Ollama is running.",
          );
        }
        return;
      }
      const data: OllamaModelResponse = await response.json();
      const modelNames = data.models.map((model) => model.name);
      setOllamaModels(modelNames);

      // Fetch and auto-select running model
      await fetchRunningModel();
    } catch (error) {
      console.error("Error fetching Ollama models:", error);
      if (selectedModel.provider === AiProvider.OLLAMA) {
        setFetchError(
          "Failed to fetch Ollama models. Make sure Ollama is running.",
        );
      }
    } finally {
      setIsLoadingModels(false);
    }
  };

  const keepModelAlive = async (modelName: string) => {
    try {
      // Send a request to keep the model loaded for 1 hour
      await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelName,
          prompt: "",
          keep_alive: "1h", // Keep loaded for 1 hour
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
      const response = await fetch("http://localhost:11434/api/ps");
      if (!response.ok) {
        if (selectedModel.provider === AiProvider.OLLAMA) {
          setRunningModelError(
            "No model is currently running. Please start a model first.",
          );
        }
        return;
      }
      const data: OllamaRunningModelResponse = await response.json();
      if (data.models && data.models.length > 0) {
        // Auto-select the first running model
        const runningModelName = data.models[0].name;
        setSelectedModel({
          provider: AiProvider.OLLAMA,
          model: runningModelName,
        });
        // Verify the model is running using shared utility
        const result = await checkIfModelIsRunning(
          runningModelName,
          AiProvider.OLLAMA,
        );
        if (result.isRunning && result.runningModelName) {
          setRunningModelName(result.runningModelName);
          await keepModelAlive(result.runningModelName);
        } else if (result.error) {
          setRunningModelError(result.error);
        }
      } else {
        if (selectedModel.provider === AiProvider.OLLAMA) {
          setRunningModelError(
            "No model is currently running. Please run the ollama model first.",
          );
        }
      }
    } catch (error) {
      console.error("Error fetching running model:", error);
      if (selectedModel.provider === AiProvider.OLLAMA) {
        setRunningModelError(
          "No model is currently running. Please run the ollama model first.",
        );
      }
    }
  };

  const fetchDeepseekModels = async () => {
    setIsLoadingModels(true);
    setFetchError("");
    try {
      const response = await fetch("/api/ai/deepseek/models");
      if (!response.ok) {
        // Fall back to enum models if API fails
        const fallbackModels = Object.values(DeepseekModel);
        setDeepseekModels(fallbackModels);
        return;
      }
      const data: DeepseekModelResponse = await response.json();
      const modelNames = data.data.map((model) => model.id);
      setDeepseekModels(
        modelNames.length > 0 ? modelNames : Object.values(DeepseekModel),
      );
    } catch (error) {
      console.error("Error fetching DeepSeek models:", error);
      // Fall back to enum models if API fails
      setDeepseekModels(Object.values(DeepseekModel));
    } finally {
      setIsLoadingModels(false);
    }
  };

  const getModelsList = (provider: AiProvider) => {
    switch (provider) {
      case AiProvider.OLLAMA:
        return ollamaModels.map((model) => [model, model]);
      case AiProvider.OPENAI:
        return Object.entries(OpenaiModel);
      case AiProvider.DEEPSEEK:
        return deepseekModels.map((model) => [model, model]);
      default:
        return [];
    }
  };
  const saveModelSettings = () => {
    if (!selectedModel.model) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a model to save.",
      });
      return;
    }
    saveToLocalStorage("aiSettings", selectedModel);
    toast({
      variant: "success",
      title: "Saved!",
      description: "AI Settings saved successfully.",
    });
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Settings</CardTitle>
      </CardHeader>
      <CardContent className="ml-4">
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
                {Object.entries(AiProvider).map(([key, value]) => (
                  <SelectItem key={key} value={value} className="capitalize">
                    {value}
                  </SelectItem>
                ))}
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
                  {getModelsList(selectedModel.provider).map(([key, value]) => (
                    <SelectItem key={key} value={value} className="capitalize">
                      {value}
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
          className="mt-8"
          onClick={saveModelSettings}
          disabled={
            !selectedModel.model ||
            (selectedModel.provider === AiProvider.OLLAMA &&
              !runningModelName) ||
            isLoadingModels
          }
        >
          Save
        </Button>
      </CardContent>
    </Card>
  );
}

export default AiSettings;
