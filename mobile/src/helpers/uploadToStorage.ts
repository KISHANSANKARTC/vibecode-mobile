import { supabase } from '@/lib/supabase';
import { Platform } from 'react-native';

/**
 * Upload a file to Supabase Storage
 * Works on both web and native by detecting the platform and handling File objects vs URIs
 */
export async function uploadFileToStorage(
  bucket: 'portfolio' | 'avatars' | 'banners' | 'chat-attachments' | 'verifications',
  fileName: string,
  fileUri: string | File,
  contentType: string,
  options?: { upsert?: boolean }
): Promise<{ publicUrl: string | null; error: string | null }> {
  try {
    console.log(`[uploadToStorage] Starting upload to ${bucket}:`, { fileName, contentType, isFile: fileUri instanceof File });

    let fileData: File | Uint8Array | ArrayBuffer;

    // Platform-specific handling
    if (Platform.OS === 'web' || fileUri instanceof File) {
      // WEB: Use File object directly
      if (fileUri instanceof File) {
        console.log(`[uploadToStorage] Using File object directly on web`);
        fileData = fileUri;
      } else {
        // Convert URL to File on web
        const response = await fetch(fileUri);
        const blob = await response.blob();
        fileData = new File([blob], fileName, { type: contentType });
        console.log(`[uploadToStorage] Converted URL to File: ${fileData.size} bytes`);
      }
    } else {
      // NATIVE: Use fallback to fetch (FileSystem handling done elsewhere if needed)
      console.log('[uploadToStorage] Using fetch fallback for native');
      const response = await fetch(fileUri as string);
      const blob = await response.blob();
      fileData = new File([blob], fileName, { type: contentType });
    }

    console.log(`[uploadToStorage] Uploading to ${bucket}/${fileName}`);

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, fileData, {
        contentType,
        upsert: options?.upsert ?? false,
      });

    if (uploadError) {
      console.error(`[uploadToStorage] Upload error:`, uploadError);
      return { publicUrl: null, error: uploadError.message || 'Upload failed' };
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(fileName);

    if (!publicUrlData?.publicUrl) {
      console.error('[uploadToStorage] Could not generate public URL');
      return { publicUrl: null, error: 'Could not generate public URL' };
    }

    console.log(`[uploadToStorage] Upload successful:`, { publicUrl: publicUrlData.publicUrl });
    return { publicUrl: publicUrlData.publicUrl, error: null };
  } catch (err: any) {
    const errorMessage = err?.message || 'Upload failed';
    console.error(`[uploadToStorage] Error:`, errorMessage);
    return { publicUrl: null, error: errorMessage };
  }
}

/**
 * Determine content type from file extension
 */
export function getContentType(fileExtension: string, isVideo: boolean = false): string {
  const ext = fileExtension.toLowerCase();

  if (isVideo) {
    return 'video/mp4';
  }

  const mimeTypes: { [key: string]: string } = {
    // Images
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    // Documents
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'txt': 'text/plain',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };

  return mimeTypes[ext] || 'application/octet-stream';
}



