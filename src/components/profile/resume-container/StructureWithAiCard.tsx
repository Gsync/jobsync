"use client";
import { Loader, Sparkles } from "lucide-react";
import type { AiModel } from "@/models/ai.model";
import { PROVIDER_REGISTRY } from "@/lib/ai/provider-registry";
import { ResponsiveCardHeader } from "../../ResponsiveCardHeader";
import { Button } from "../../ui/button";
import { Card } from "../../ui/card";

export function StructureWithAiCard({
  aiModel,
  localProviderConnected,
  connectionError,
  isStructuring,
  onStructure,
}: {
  aiModel: AiModel;
  localProviderConnected: boolean | null;
  connectionError: string;
  isStructuring: boolean;
  onStructure: () => void;
}) {
  const isLocalProvider = PROVIDER_REGISTRY[aiModel.provider]?.category === "local";
  return (
    <Card className="border-dashed">
      <ResponsiveCardHeader>
        <div>
          <p className="text-sm text-muted-foreground">
            A file is attached. Structure it into sections using AI.
          </p>
          {isLocalProvider &&
            localProviderConnected === false &&
            connectionError && (
              <p className="text-xs text-red-600 mt-1">
                {connectionError}
              </p>
            )}
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={
            isStructuring ||
            (isLocalProvider && localProviderConnected === false)
          }
          onClick={onStructure}
        >
          {isStructuring ? (
            <Loader className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          {isStructuring ? "Structuring…" : "Structure with AI"}
        </Button>
      </ResponsiveCardHeader>
    </Card>
  );
}
