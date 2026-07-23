"use client";

import { useRef, useState } from "react";
import { FileText, ImageIcon, Loader2, Upload, X } from "lucide-react";

import { formatFileSize } from "@/lib/format";
import {
  acceptAttribute,
  UPLOAD_RULES,
  validateUpload,
  type UploadKind,
} from "@/lib/upload";
import { Button } from "@/components/ui/button";

// The persisted result of a completed upload — what the create form saves.
export interface UploadedFile {
  fileUrl: string;
  fileName: string;
  fileSize: number;
}

interface FileUploadProps {
  kind: UploadKind;
  value: UploadedFile | null;
  onChange: (value: UploadedFile | null) => void;
  // Lets the parent disable submit while an upload is in flight.
  onUploadingChange?: (uploading: boolean) => void;
}

// Drag-and-drop (or click-to-browse) upload for file/image items. Uploads to
// POST /api/upload with an XHR so we can show real progress, validates against
// the kind's rules client-side first, and previews the result (image thumbnail
// or file chip) with a remove control.
export function FileUpload({
  kind,
  value,
  onChange,
  onUploadingChange,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const rules = UPLOAD_RULES[kind];
  const maxLabel = `${Math.round(rules.maxSize / (1024 * 1024))} MB`;

  function setUploadingState(next: boolean) {
    setUploading(next);
    onUploadingChange?.(next);
  }

  function upload(file: File) {
    setError(null);

    const validation = validateUpload({
      kind,
      fileName: file.name,
      size: file.size,
      mimeType: file.type || undefined,
    });
    if (!validation.ok) {
      setError(validation.error);
      return;
    }

    const form = new FormData();
    form.append("file", file);
    form.append("kind", kind);

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open("POST", "/api/upload");

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        setProgress(Math.round((event.loaded / event.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      xhrRef.current = null;
      setUploadingState(false);
      setProgress(0);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText) as UploadedFile;
          onChange(data);
        } catch {
          setError("Upload failed. Please try again.");
        }
      } else {
        let message = "Upload failed. Please try again.";
        try {
          const data = JSON.parse(xhr.responseText) as { error?: string };
          if (data.error) message = data.error;
        } catch {
          // keep the generic message
        }
        setError(message);
      }
    });

    xhr.addEventListener("error", () => {
      xhrRef.current = null;
      setUploadingState(false);
      setProgress(0);
      setError("Upload failed. Please check your connection and try again.");
    });

    setUploadingState(true);
    setProgress(0);
    xhr.send(form);
  }

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) upload(file);
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragging(false);
    if (uploading) return;
    handleFiles(event.dataTransfer.files);
  }

  function handleRemove() {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
      setUploadingState(false);
      setProgress(0);
    }
    setError(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const Icon = kind === "image" ? ImageIcon : FileText;

  // Completed upload — preview + remove.
  if (value && !uploading) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
          {kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element -- R2 public URL, not a static asset
            <img
              src={value.fileUrl}
              alt={value.fileName}
              className="size-14 shrink-0 rounded-md border object-cover"
            />
          ) : (
            <span className="flex size-14 shrink-0 items-center justify-center rounded-md border bg-background">
              <Icon className="size-6 text-muted-foreground" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{value.fileName}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(value.fileSize)}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Remove file"
            onClick={handleRemove}
          >
            <X />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        role="button"
        tabIndex={0}
        aria-label={`Upload ${kind}`}
        onClick={() => !uploading && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !uploading) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!uploading) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
          dragging
            ? "border-primary bg-primary/5"
            : "border-input hover:bg-accent/40"
        } ${uploading ? "pointer-events-none opacity-80" : ""}`}
      >
        {uploading ? (
          <>
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Uploading… {progress}%
            </p>
            <div className="h-1.5 w-full max-w-56 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </>
        ) : (
          <>
            <Upload className="size-6 text-muted-foreground" />
            <p className="text-sm">
              <span className="font-medium text-foreground">
                Click to upload
              </span>{" "}
              or drag and drop
            </p>
            <p className="text-xs text-muted-foreground">
              {kind === "image" ? "Images" : "Files"} up to {maxLabel}
            </p>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={acceptAttribute(kind)}
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
