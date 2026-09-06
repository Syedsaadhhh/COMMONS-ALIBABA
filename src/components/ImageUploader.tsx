"use client";

import { useRef, useState } from "react";
import {
  validateImageFile,
  compressImageForUpload,
  MAX_IMAGES,
  MAX_SOURCE_FILE_BYTES,
  ACCEPTED_MIME_TYPES,
  ACCEPTED_EXTENSIONS,
  type ValidatedImage,
} from "@/lib/validation/images";

export type { ValidatedImage };

export interface ImageUploaderProps {
  images: ValidatedImage[];
  onChange: (images: ValidatedImage[]) => void;
  error?: string;
}

export function ImageUploader({ images, onChange, error }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);

  const accept = ACCEPTED_EXTENSIONS.join(",");

  async function handleFiles(fileList: FileList) {
    setProcessingError(null);
    const files = Array.from(fileList);
    const slotsRemaining = MAX_IMAGES - images.length;

    if (slotsRemaining <= 0) {
      setProcessingError(`Maximum of ${MAX_IMAGES} images allowed.`);
      return;
    }

    const toProcess = files.slice(0, slotsRemaining);
    setProcessing(true);

    try {
      const next = [...images];
      let runningBytes = images.reduce((sum, img) => sum + img.dataUrl.length, 0);

      for (const file of toProcess) {
        if (file.size > MAX_SOURCE_FILE_BYTES) {
          setProcessingError(`Choose photos up to ${Math.round(MAX_SOURCE_FILE_BYTES / 1024 / 1024)} MB each.`);
          break;
        }
        const compressed = await compressImageForUpload(file);
        const result = await validateImageFile(compressed, runningBytes);

        if ("message" in result) {
          setProcessingError(result.message);
          break;
        }

        runningBytes += result.dataUrl.length;
        next.push(result);
      }

      onChange(next);
    } catch {
      setProcessingError("One or more images could not be processed.");
    } finally {
      setProcessing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeImage(index: number) {
    onChange(images.filter((_, i) => i !== index));
    setProcessingError(null);
  }

  const displayError = error || processingError;

  return (
    <div className="image-uploader">
      <label className="image-uploader__label">
        <strong>Supporting images (optional)</strong>
        <p>Add up to {MAX_IMAGES} photos of the problem. JPEG, PNG, or WebP.</p>
      </label>

      {images.length < MAX_IMAGES && (
        <div
          className="image-uploader__dropzone"
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span>
            {processing
              ? "Processing…"
              : `Add photo (${images.length}/${MAX_IMAGES})`}
          </span>
          <small>Camera or gallery · up to 5 MB each, optimized before upload</small>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        capture="environment"
        className="sr-only"
        onChange={(event) => {
          if (event.target.files?.length) {
            void handleFiles(event.target.files);
          }
        }}
      />

      {images.length > 0 && (
        <div className="image-uploader__grid">
          {images.map((image, index) => (
            <div key={image.sha256} className="image-uploader__card">
              <img src={image.dataUrl} alt={`Attached image ${index + 1}`} />
              <div className="image-uploader__card-meta">
                <span>{image.mimeType.replace("image/", "").toUpperCase()}</span>
                <span>{Math.round(image.byteSize / 1024)} KB</span>
              </div>
              <button
                type="button"
                className="image-uploader__remove"
                onClick={() => removeImage(index)}
                aria-label={`Remove image ${index + 1}`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {displayError && (
        <p className="field-error" role="alert">{displayError}</p>
      )}
    </div>
  );
}
