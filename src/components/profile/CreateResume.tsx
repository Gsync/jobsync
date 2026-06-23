"use client";
import { Loader, Sparkles } from "lucide-react";
import { Button } from "../ui/button";
import { useForm } from "react-hook-form";
import { CreateResumeFormSchema } from "@/models/createResumeForm.schema";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import { Resume } from "@/models/profile.model";
import { toast } from "../ui/use-toast";
import { AiModel, AiProvider, defaultModel } from "@/models/ai.model";
import { getUserSettings } from "@/actions/userSettings.actions";
import { checkOllamaConnection } from "@/utils/ai.utils";
import { useRouter } from "next/navigation";

type CreateResumeProps = {
  resumeDialogOpen: boolean;
  setResumeDialogOpen: (e: boolean) => void;
  resumeToEdit?: Resume | null;
  reloadResumes: () => void;
  setNewResumeId: (id: string) => void;
};

// Derive a clean title from an uploaded filename
function titleFromFilename(name: string): string {
  const withoutExt = name.replace(/\.[^.]+$/, "");
  return withoutExt.replace(/[_-]+/g, " ").trim();
}

function CreateResume({
  resumeDialogOpen,
  setResumeDialogOpen,
  resumeToEdit,
  reloadResumes,
  setNewResumeId,
}: CreateResumeProps) {
  const [isPending, startTransition] = useTransition();
  const [autoFill, setAutoFill] = useState(true);
  const [aiAvailable, setAiAvailable] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AiModel>(defaultModel);
  const [isImporting, setIsImporting] = useState(false);
  const router = useRouter();

  const pageTitle = resumeToEdit ? "Edit Resume Title" : "Create Resume";

  const form = useForm<z.infer<typeof CreateResumeFormSchema>>({
    resolver: zodResolver(CreateResumeFormSchema),
    mode: "onChange",
    defaultValues: { title: "" },
  });

  const {
    reset,
    watch,
    setValue,
    formState: { errors, isValid },
  } = form;

  const watchedFile = watch("file");

  // Populate form when editing an existing resume
  useEffect(() => {
    if (resumeToEdit) {
      reset({
        id: resumeToEdit.id ?? undefined,
        title: resumeToEdit.title ?? "",
        fileId: resumeToEdit.FileId ?? undefined,
      });
    }
  }, [resumeToEdit, reset]);

  // Auto-fill title from filename when file changes (new resume only)
  useEffect(() => {
    if (!resumeToEdit && watchedFile instanceof File && watchedFile.name) {
      const derived = titleFromFilename(watchedFile.name);
      if (derived) setValue("title", derived, { shouldValidate: true });
    }
  }, [watchedFile, resumeToEdit, setValue]);

  // Check AI availability when dialog opens
  useEffect(() => {
    if (!resumeDialogOpen || resumeToEdit) return;
    const check = async () => {
      try {
        const result = await getUserSettings();
        if (result.success && result.data?.settings?.ai) {
          const ai = result.data.settings.ai;
          const model: AiModel = {
            provider: ai.provider || defaultModel.provider,
            model: ai.model,
          };
          setSelectedModel(model);

          if (model.provider === AiProvider.OLLAMA) {
            const result = await checkOllamaConnection(AiProvider.OLLAMA);
            setAiAvailable(result.isConnected);
          } else {
            setAiAvailable(true);
          }
        }
      } catch {
        setAiAvailable(false);
      }
    };
    check();
  }, [resumeDialogOpen, resumeToEdit]);

  const closeDialog = () => setResumeDialogOpen(false);

  const onSubmit = (data: z.infer<typeof CreateResumeFormSchema>) => {
    const formData = new FormData();
    formData.append("file", data.file as File);
    formData.append("title", data.title);
    if (resumeToEdit) {
      formData.append("id", data.id as string);
      if (resumeToEdit.FileId) {
        formData.append("fileId", data.fileId as string);
      }
    }

    startTransition(async () => {
      const res = await fetch("/api/profile/resume", {
        method: "POST",
        body: formData,
      });
      const response = await res.json();
      if (!response.success) {
        toast({
          variant: "destructive",
          title: "Error!",
          description: response?.message,
        });
        return;
      }

      const newResumeId: string | undefined =
        response.data?.id ?? response.data?.resumes?.[0]?.id;

      // Auto-fill with AI: call import route then navigate to editor
      if (
        !resumeToEdit &&
        autoFill &&
        aiAvailable &&
        data.file &&
        newResumeId
      ) {
        setIsImporting(true);
        try {
          const importRes = await fetch("/api/ai/resume/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ resumeId: newResumeId, selectedModel }),
          });
          const importJson = await importRes.json();
          if (importJson.success && importJson.data) {
            sessionStorage.setItem(
              `import:${newResumeId}`,
              JSON.stringify({
                data: importJson.data,
                truncated: importJson.truncated ?? false,
              }),
            );
          }
        } catch {
          // Non-fatal: editor opens without pending cards
        } finally {
          setIsImporting(false);
        }
        reset();
        setResumeDialogOpen(false);
        router.push(`/dashboard/profile/resume/${newResumeId}`);
        return;
      }

      reset();
      setResumeDialogOpen(false);
      reloadResumes();
      if (newResumeId) {
        setNewResumeId(newResumeId);
      }
      toast({
        variant: "success",
        description: `Resume title has been ${resumeToEdit ? "updated" : "created"} successfully`,
      });
    });
  };

  const hasFile = !resumeToEdit && watchedFile instanceof File;

  return (
    <Dialog open={resumeDialogOpen} onOpenChange={setResumeDialogOpen}>
      <DialogContent className="lg:max-h-screen overflow-y-scroll">
        <DialogHeader>
          <DialogTitle>{pageTitle}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(event) => {
              event.stopPropagation();
              form.handleSubmit(onSubmit)(event);
            }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 p-2"
          >
            {/* RESUME TITLE */}
            <div className="md:col-span-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resume Title</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ex: Full Stack Developer Angular, Java"
                        data-testid="resume-title-input"
                      />
                    </FormControl>
                    <FormMessage>
                      {errors.title && (
                        <span className="text-red-500">
                          {errors.title.message}
                        </span>
                      )}
                    </FormMessage>
                  </FormItem>
                )}
              />
            </div>

            {/* RESUME FILE */}
            <div className="md:col-span-2">
              <FormField
                control={form.control}
                name="file"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Upload Resume (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept=".pdf,.docx"
                        onChange={(e) => {
                          field.onChange(e.target.files?.[0] || null);
                        }}
                      />
                    </FormControl>
                    <FormMessage>
                      {errors.file?.message && (
                        <span className="text-red-500">
                          {errors.file.message}
                        </span>
                      )}
                    </FormMessage>
                  </FormItem>
                )}
              />
            </div>

            {/* AUTO-FILL TOGGLE */}
            {hasFile && (
              <div className="md:col-span-2 flex items-center gap-3">
                <Switch
                  id="auto-fill"
                  checked={autoFill && aiAvailable}
                  disabled={!aiAvailable}
                  onCheckedChange={setAutoFill}
                />
                <label
                  htmlFor="auto-fill"
                  className="text-sm cursor-pointer select-none"
                >
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5" />
                    Auto-fill with AI
                  </span>
                  {!aiAvailable && (
                    <span className="text-muted-foreground text-xs block mt-0.5">
                      (AI unavailable — manual entry)
                    </span>
                  )}
                </label>
              </div>
            )}

            <div className="md:col-span-2 mt-4">
              <DialogFooter>
                <Button
                  type="reset"
                  variant="outline"
                  className="mt-2 md:mt-0"
                  onClick={closeDialog}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!isValid || isPending || isImporting}
                >
                  {isImporting ? "Importing…" : "Save"}
                  {(isPending || isImporting) && (
                    <Loader className="h-4 w-4 shrink-0 animate-spin" />
                  )}
                </Button>
              </DialogFooter>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateResume;
