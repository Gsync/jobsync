"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  AiModel,
  AiProvider,
  defaultModel,
  OllamaModel,
  OpenaiModel,
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

function AiSettings() {
  const [selectedModel, setSelectedModel] = useState<AiModel>(defaultModel);
  const setSelectedProvider = (provider: AiProvider) => {
    setSelectedModel({ provider, model: undefined });
  };
  const setSelectedProviderModel = (model: string) => {
    setSelectedModel({ ...selectedModel, model });
  };

  useEffect(() => {
    const savedSettings = getFromLocalStorage("aiSettings", selectedModel);
    setSelectedModel(savedSettings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getModelsList = (provider: AiProvider) => {
    switch (provider) {
      case AiProvider.OLLAMA:
        return Object.entries(OllamaModel);
      case AiProvider.OPENAI:
        return Object.entries(OpenaiModel);
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
          <Select
            value={selectedModel.model}
            onValueChange={setSelectedProviderModel}
          >
            <SelectTrigger
              id="ai-model"
              aria-label="Select Model"
              className="w-[180px]"
            >
              <SelectValue placeholder="Select AI Model" />
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
        </div>
        <Button className="mt-8" onClick={saveModelSettings}>
          Save
        </Button>
      </CardContent>
    </Card>
  );
}

export default AiSettings;
