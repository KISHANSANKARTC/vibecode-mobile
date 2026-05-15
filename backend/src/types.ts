import { z } from "zod";

/**
 * File object from Vibecode storage service
 */
export const VibecodeFileSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  environment: z.string(),
  originalFilename: z.string(),
  storagePath: z.string(),
  contentType: z.string(),
  sizeBytes: z.number(),
  url: z.string(),
  created: z.string(),
  updated: z.string(),
});

export type VibecodeFile = z.infer<typeof VibecodeFileSchema>;

/**
 * Upload response from Vibecode storage service
 */
export const UploadResponseSchema = z.object({
  file: VibecodeFileSchema,
});

export type UploadResponse = z.infer<typeof UploadResponseSchema>;

/**
 * Normalized upload response for API
 * Maps Vibecode storage response to a standard format
 */
export const NormalizedUploadSchema = z.object({
  id: z.string(),
  name: z.string(),
  size: z.number(),
  mimeType: z.string(),
  url: z.string(),
  cdnUrl: z.string(),
  createdAt: z.string(),
});

export type NormalizedUpload = z.infer<typeof NormalizedUploadSchema>;

/**
 * API response envelope for upload endpoint
 */
export const UploadApiResponseSchema = z.object({
  data: NormalizedUploadSchema,
});

export type UploadApiResponse = z.infer<typeof UploadApiResponseSchema>;
