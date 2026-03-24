"use client";

import { Paperclip } from "lucide-react";
import { toast } from "../ui/use-toast";

interface DownloadFileButtonProps {
  filePath: string;
  fileTitle: string;
  fileName: string;
}

export function DownloadFileButton({
  filePath,
  fileTitle,
  fileName,
}: DownloadFileButtonProps) {
  const handleDownload = async () => {
    try {
      const response = await fetch(
        `/api/profile/resume?filePath=${encodeURIComponent(filePath)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filePath.split("/").pop() || fileName;
        link.target = "_blank";
        link.click();
        window.URL.revokeObjectURL(url);
      } else {
        toast({
          variant: "destructive",
          description: "Failed to download file",
        });
      }
    } catch (error) {
      console.error("Download error:", error);
      toast({
        variant: "destructive",
        description: "Failed to download file",
      });
    }
  };

  return (
    <button
      className="flex items-center"
      onClick={handleDownload}
      title={`Download ${fileName}`}
    >
      <div>{fileTitle}</div>
      <Paperclip className="h-3.5 w-3.5 ml-1" />
    </button>
  );
}
