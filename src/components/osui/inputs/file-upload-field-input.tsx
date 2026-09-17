"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";

import { FileText, ImagePlus, Plus, X } from "lucide-react";

import { cn } from "@/lib/utils";

export type FileUploadFieldInputProps = Readonly<{
  label?: string;
  hint?: string;
  error?: boolean;
  errorMessage?: string;
  browseLabel?: string;
  dropLabel?: string;
  replaceLabel?: string;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxSizeBytes?: number;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  containerClassName?: string;
  onFilesChange?: (files: File[]) => void;
}>;

type FileEntry = Readonly<{
  id: string;
  file: File;
  previewUrl?: string;
}>;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageFile(file: File): boolean {
  return (
    file.type.startsWith("image/") ||
    /\.(png|jpe?g|gif|webp|svg)$/i.test(file.name)
  );
}

function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

function parseAcceptTokens(accept: string): string[] {
  return accept
    .split(",")
    .map((part) => part.trim().replace(/^\./, "").toUpperCase())
    .filter(Boolean);
}

function fileMatchesAccept(file: File, accept: string): boolean {
  const tokens = accept
    .split(",")
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
  if (tokens.length === 0) return true;

  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();
  return tokens.some((token) => {
    if (token.startsWith(".")) return fileName.endsWith(token);
    if (token.endsWith("/*")) return fileType.startsWith(token.slice(0, -1));
    return fileType === token;
  });
}

function createEntry(file: File): FileEntry {
  return {
    id: `${file.name}-${file.size}-${file.lastModified}`,
    file,
    previewUrl: isImageFile(file) ? URL.createObjectURL(file) : undefined,
  };
}

function revokeEntryPreview(entry: FileEntry) {
  if (entry.previewUrl) URL.revokeObjectURL(entry.previewUrl);
}

export const FileUploadFieldInput = forwardRef<
  HTMLInputElement,
  FileUploadFieldInputProps
>(function FileUploadFieldInput(
  {
    label = "Upload document",
    hint = "PDF, PNG, or JPG up to 5 MB.",
    error = false,
    errorMessage = "Could not upload this file.",
    browseLabel = "Choose file",
    dropLabel = "Drop your file here",
    replaceLabel = "Replace file",
    accept = ".pdf,.png,.jpg,.jpeg",
    multiple = false,
    maxFiles = 3,
    maxSizeBytes = 5 * 1024 * 1024,
    disabled = false,
    required = false,
    name,
    containerClassName,
    onFilesChange,
  },
  ref,
) {
  const generatedId = useId();
  const inputId = `${generatedId}-file`;
  const hintId = `${generatedId}-hint`;
  const errorId = `${generatedId}-error`;
  const localRef = useRef<HTMLInputElement | null>(null);
  const entriesRef = useRef<FileEntry[]>([]);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState("");
  const safeMaxFiles = Number.isFinite(maxFiles)
    ? Math.max(1, Math.floor(maxFiles))
    : 3;
  const safeMaxSizeBytes = Number.isFinite(maxSizeBytes)
    ? Math.max(0, maxSizeBytes)
    : 5 * 1024 * 1024;

  entriesRef.current = entries;

  const mergeRef = useCallback(
    (node: HTMLInputElement | null) => {
      localRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  useEffect(() => {
    return () => {
      for (const entry of entriesRef.current) revokeEntryPreview(entry);
    };
  }, []);

  useEffect(() => {
    const form = localRef.current?.form;
    if (!form) return;

    const handleReset = () => {
      for (const entry of entriesRef.current) revokeEntryPreview(entry);
      entriesRef.current = [];
      setEntries([]);
      setLocalError("");
      setDragging(false);
      onFilesChange?.([]);
    };

    form.addEventListener("reset", handleReset);
    return () => form.removeEventListener("reset", handleReset);
  }, [onFilesChange]);

  const validateAndAdd = useCallback(
    (incoming: File[]) => {
      setLocalError("");
      const validFiles: File[] = [];

      for (const file of incoming) {
        if (!fileMatchesAccept(file, accept)) {
          setLocalError(`"${file.name}" is not an accepted file type.`);
          continue;
        }
        if (file.size > safeMaxSizeBytes) {
          setLocalError(`"${file.name}" exceeds the size limit.`);
          continue;
        }
        validFiles.push(file);
      }

      if (validFiles.length === 0) return;

      const previous = entriesRef.current;
      const existingIds = new Set(previous.map((entry) => entry.id));
      const uniqueFiles = validFiles.filter(
        (file) =>
          !existingIds.has(`${file.name}-${file.size}-${file.lastModified}`),
      );
      const availableSlots = multiple
        ? Math.max(0, safeMaxFiles - previous.length)
        : 1;
      const filesToAdd = uniqueFiles.slice(0, availableSlots);

      if (uniqueFiles.length > availableSlots) {
        setLocalError(
          `You can upload up to ${safeMaxFiles} ${safeMaxFiles === 1 ? "file" : "files"}.`,
        );
      }
      if (filesToAdd.length === 0) return;

      const nextEntries = filesToAdd.map(createEntry);
      if (!multiple) {
        for (const entry of previous) revokeEntryPreview(entry);
      }

      const next = multiple ? [...previous, ...nextEntries] : nextEntries;
      entriesRef.current = next;
      setEntries(next);
      onFilesChange?.(next.map((entry) => entry.file));
    },
    [accept, multiple, onFilesChange, safeMaxFiles, safeMaxSizeBytes],
  );

  useEffect(() => {
    if (localRef.current && typeof DataTransfer !== "undefined") {
      const transfer = new DataTransfer();
      for (const entry of entries) transfer.items.add(entry.file);
      localRef.current.files = transfer.files;
    }
  }, [entries]);

  const openPicker = useCallback(() => {
    if (!disabled) localRef.current?.click();
  }, [disabled]);

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const list = event.target.files;
      if (!list?.length) return;
      validateAndAdd(Array.from(list));
      event.target.value = "";
    },
    [validateAndAdd],
  );

  const bindDrag = useCallback(
    (active: boolean) => {
      if (!disabled) setDragging(active);
    },
    [disabled],
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragging(false);
      if (disabled) return;
      const list = event.dataTransfer.files;
      if (!list.length) return;
      validateAndAdd(Array.from(list));
    },
    [disabled, validateAndAdd],
  );

  const removeFile = useCallback(
    (id: string) => {
      const previous = entriesRef.current;
      const target = previous.find((entry) => entry.id === id);
      if (target) revokeEntryPreview(target);
      const next = previous.filter((entry) => entry.id !== id);
      entriesRef.current = next;
      setEntries(next);
      onFilesChange?.(next.map((entry) => entry.file));
      setLocalError("");
    },
    [onFilesChange],
  );

  const showError = error || Boolean(localError);
  const message = localError || errorMessage;
  const hasFiles = entries.length > 0;
  const acceptTokens = parseAcceptTokens(accept);
  const maxSizeLabel = formatFileSize(safeMaxSizeBytes);
  const primaryEntry = entries[0];
  const showSinglePreview =
    !multiple && primaryEntry && isImageFile(primaryEntry.file);

  return (
    <div
      data-slot="file-upload-field-input"
      data-error={showError || undefined}
      data-filled={hasFiles || undefined}
      className={cn("w-full max-w-sm font-sans", containerClassName)}
    >
      <label
        htmlFor={inputId}
        className="mb-1.5 block w-fit cursor-pointer text-sm font-medium text-neutral-900"
      >
        {label}
        {required ? (
          <span className="ml-0.5 text-rose-500" aria-hidden>
            *
          </span>
        ) : null}
      </label>

      <input
        ref={mergeRef}
        id={inputId}
        type="file"
        name={name}
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        required={required && !hasFiles}
        aria-invalid={showError || undefined}
        aria-describedby={showError ? errorId : hint ? hintId : undefined}
        onChange={handleInputChange}
        className="sr-only"
      />

      <div
        className={cn(
          "overflow-hidden rounded-2xl border bg-white px-5 py-5 transition-[border-color] duration-200",
          showError ? "border-rose-200" : "border-neutral-100",
        )}
      >
        {!hasFiles ? (
          <div className="space-y-4">
            <div
              role="button"
              tabIndex={disabled ? -1 : 0}
              aria-label={dropLabel}
              onKeyDown={(event) => {
                if (disabled) return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openPicker();
                }
              }}
              onClick={openPicker}
              onDragEnter={(event) => {
                event.preventDefault();
                bindDrag(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                bindDrag(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                if (
                  !event.currentTarget.contains(event.relatedTarget as Node)
                ) {
                  bindDrag(false);
                }
              }}
              onDrop={handleDrop}
              className={cn(
                "group relative aspect-[4/3] cursor-pointer overflow-hidden rounded-xl border ring-0 transition-[border-color,background-color] duration-200 outline-none focus:border-neutral-900 focus:ring-0",
                dragging && !showError && "border-neutral-900 bg-neutral-50",
                showError && "border-rose-300 bg-rose-50/40",
                !dragging &&
                  !showError &&
                  "border-neutral-100 bg-neutral-50 hover:border-neutral-300 hover:bg-neutral-50/80",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              <div
                aria-hidden
                className="absolute inset-0 grid grid-cols-3 grid-rows-3"
              >
                {Array.from({ length: 9 }, (_, index) => (
                  <div
                    key={`grid-${index}`}
                    className="border border-neutral-100/90"
                  />
                ))}
              </div>

              <span
                aria-hidden
                className="absolute top-3 left-3 size-5 border-t-2 border-l-2 border-neutral-300 transition-colors duration-200 group-hover:border-neutral-500"
              />
              <span
                aria-hidden
                className="absolute top-3 right-3 size-5 border-t-2 border-r-2 border-neutral-300 transition-colors duration-200 group-hover:border-neutral-500"
              />
              <span
                aria-hidden
                className="absolute bottom-3 left-3 size-5 border-b-2 border-l-2 border-neutral-300 transition-colors duration-200 group-hover:border-neutral-500"
              />
              <span
                aria-hidden
                className="absolute right-3 bottom-3 size-5 border-r-2 border-b-2 border-neutral-300 transition-colors duration-200 group-hover:border-neutral-500"
              />

              <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                <span
                  className={cn(
                    "mb-3 flex size-12 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-600 transition-[border-color,transform] duration-200",
                    dragging && "scale-105 border-neutral-900 text-neutral-900",
                    !dragging &&
                      "group-hover:border-neutral-400 group-hover:text-neutral-900",
                  )}
                >
                  <ImagePlus size={22} strokeWidth={1.75} aria-hidden />
                </span>

                <span className="font-serif text-lg text-neutral-900">
                  {dragging ? "Release to upload" : dropLabel}
                </span>
                <span className="mt-1 text-sm text-neutral-500">
                  Drag & drop or click anywhere
                </span>
              </div>
            </div>

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-neutral-400">
                  No file selected
                </p>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {acceptTokens.join(", ")} · max {maxSizeLabel}
                  {multiple ? ` · up to ${safeMaxFiles} files` : ""}
                </p>
              </div>

              {!disabled ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    openPicker();
                  }}
                  className="inline-flex h-9 shrink-0 cursor-pointer items-center rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  {browseLabel}
                </button>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {acceptTokens.map((token) => (
                <span
                  key={token}
                  className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-[10px] font-medium tracking-wide text-neutral-600 uppercase"
                >
                  {token}
                </span>
              ))}
            </div>
          </div>
        ) : showSinglePreview && primaryEntry ? (
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-xl border border-neutral-100 bg-neutral-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={primaryEntry.previewUrl}
                alt={primaryEntry.file.name}
                className="aspect-[4/3] w-full object-cover"
              />
              {!disabled ? (
                <button
                  type="button"
                  aria-label={`Remove ${primaryEntry.file.name}`}
                  onClick={() => removeFile(primaryEntry.id)}
                  className="absolute top-2.5 right-2.5 flex size-8 cursor-pointer items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 transition-colors hover:border-neutral-300 hover:text-neutral-900"
                >
                  <X size={14} strokeWidth={2} aria-hidden />
                </button>
              ) : null}
            </div>

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-neutral-900">
                  {primaryEntry.file.name}
                </p>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {formatFileSize(primaryEntry.file.size)} · Ready to upload
                </p>
              </div>
              {!disabled ? (
                <button
                  type="button"
                  onClick={openPicker}
                  className="shrink-0 cursor-pointer text-sm font-medium text-neutral-900 underline-offset-2 hover:underline"
                >
                  {replaceLabel}
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <ul className="space-y-2">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center gap-3 rounded-xl border border-neutral-100 bg-neutral-50/80 p-2.5"
                >
                  {entry.previewUrl ? (
                    <div className="size-12 shrink-0 overflow-hidden rounded-lg border border-neutral-100 bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={entry.previewUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    </div>
                  ) : (
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-neutral-100 bg-white text-neutral-600">
                      {isPdfFile(entry.file) ? (
                        <FileText size={18} strokeWidth={1.75} aria-hidden />
                      ) : (
                        <ImagePlus size={18} strokeWidth={1.75} aria-hidden />
                      )}
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-900">
                      {entry.file.name}
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {formatFileSize(entry.file.size)}
                    </p>
                  </div>

                  {!disabled ? (
                    <button
                      type="button"
                      aria-label={`Remove ${entry.file.name}`}
                      onClick={() => removeFile(entry.id)}
                      className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-900"
                    >
                      <X size={14} strokeWidth={2} aria-hidden />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>

            {multiple && entries.length < safeMaxFiles && !disabled ? (
              <button
                type="button"
                onClick={openPicker}
                className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-200 bg-white text-sm font-medium text-neutral-700 transition-colors hover:border-neutral-400 hover:bg-neutral-50"
              >
                <Plus size={16} strokeWidth={2} aria-hidden />
                Add another file
              </button>
            ) : null}

            {!multiple && !disabled ? (
              <button
                type="button"
                onClick={openPicker}
                className="text-sm font-medium text-neutral-900 underline-offset-2 hover:underline"
              >
                {replaceLabel}
              </button>
            ) : null}
          </div>
        )}
      </div>

      {showError ? (
        <p id={errorId} role="alert" className="mt-1.5 text-xs text-rose-600">
          {message}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-xs text-neutral-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

FileUploadFieldInput.displayName = "FileUploadFieldInput";
