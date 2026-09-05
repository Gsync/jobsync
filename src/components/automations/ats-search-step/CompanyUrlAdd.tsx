"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { resolveAtsBoard } from "@/actions/atsCompany.actions";
import type { JobBoard, LeverCompany } from "@/models/automation.model";

interface CompanyUrlAddProps {
  provider: JobBoard;
  placeholder: string;
  disabled: boolean;
  onResolved: (company: LeverCompany) => void;
}

// Adds a company by pasting its board URL or token, for boards the indexed
// company search doesn't cover.
export function CompanyUrlAdd({
  provider,
  placeholder,
  disabled,
  onResolved,
}: CompanyUrlAddProps) {
  const [urlInput, setUrlInput] = useState("");
  const [isResolving, setIsResolving] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  const resolveUrl = async () => {
    setUrlError(null);
    setIsResolving(true);
    try {
      const result = await resolveAtsBoard(provider, urlInput);
      if (result.success) {
        onResolved({
          name: result.name,
          token: result.token,
          ...(result.host ? { host: result.host } : {}),
        });
        setUrlInput("");
      } else {
        setUrlError(result.message);
      }
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          value={urlInput}
          disabled={disabled}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              resolveUrl();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          onClick={resolveUrl}
          disabled={isResolving || disabled || urlInput.trim().length === 0}
        >
          {isResolving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </Button>
      </div>
      {urlError && <p className="text-sm text-destructive">{urlError}</p>}
    </>
  );
}
