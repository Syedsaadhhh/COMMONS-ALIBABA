"use client";

import { createClient } from "@/lib/db/client";

const PROJECT_BUCKET = "project-media";
const EVIDENCE_BUCKET = "evidence-media";
const SIGNED_URL_EXPIRY_SECONDS = 3600;

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, base64] = dataUrl.split(",");
  const mimeMatch = meta.match(/^data:([^;]+)/);
  const mime = mimeMatch?.[1] || "application/octet-stream";
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: mime });
}

export async function uploadProjectImageToStorage(params: {
  projectId: string;
  userId: string;
  dataUrl: string;
  sha256: string;
  mimeType: string;
  ordinal: number;
}): Promise<string> {
  const supabase = createClient();
  const extension = params.mimeType.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
  const path = `${params.projectId}/${params.userId}/${params.ordinal}-${params.sha256.slice(0, 12)}.${extension}`;

  const blob = dataUrlToBlob(params.dataUrl);
  const { error } = await supabase.storage
    .from(PROJECT_BUCKET)
    .upload(path, blob, {
      contentType: params.mimeType,
      upsert: true,
    });

  if (error) {
    throw new Error(error.message || "Image could not be uploaded to storage.");
  }

  return path;
}

export async function getProjectImageSignedUrl(storagePath: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(PROJECT_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS);

  if (error || !data) {
    throw new Error(error?.message || "Signed URL could not be generated.");
  }

  return data.signedUrl;
}

export async function uploadEvidenceFileToStorage(params: {
  projectId: string;
  evidenceId: string;
  file: File;
}): Promise<{ storagePath: string; fileHash: string }> {
  const { file } = params;
  const supabase = createClient();

  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  const fileHash = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  const extension = file.type.split("/")[1]?.replace("jpeg", "jpg") || "bin";
  const path = `${params.projectId}/${params.evidenceId}-${fileHash.slice(0, 12)}.${extension}`;

  const { error } = await supabase.storage
    .from(EVIDENCE_BUCKET)
    .upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });

  if (error) {
    throw new Error(error.message || "Evidence file could not be uploaded to storage.");
  }

  return { storagePath: path, fileHash };
}

export async function getEvidenceSignedUrl(storageKey: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(EVIDENCE_BUCKET)
    .createSignedUrl(storageKey, SIGNED_URL_EXPIRY_SECONDS);

  if (error || !data) {
    throw new Error(error?.message || "Signed URL could not be generated.");
  }

  return data.signedUrl;
}
