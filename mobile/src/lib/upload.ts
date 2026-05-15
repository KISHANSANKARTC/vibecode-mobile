import { Platform } from 'react-native';

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  url: string;
  cdnUrl: string;
  createdAt: string;
}

/**
 * Upload a file to Vibecode storage via backend
 * Works on both web and native platforms
 */
export async function uploadFile(
  uri: string,
  filename: string,
  mimeType: string
): Promise<UploadedFile> {
  // Try multiple sources for backend URL
  let backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL ||
                   process.env.EXPO_PUBLIC_VIBECODE_BACKEND_URL ||
                   (global as any).BACKEND_URL;

  if (!backendUrl) {
    console.error('[upload] Backend URL not found in environment');
    console.error('[upload] EXPO_PUBLIC_BACKEND_URL:', process.env.EXPO_PUBLIC_BACKEND_URL);
    console.error('[upload] EXPO_PUBLIC_VIBECODE_BACKEND_URL:', process.env.EXPO_PUBLIC_VIBECODE_BACKEND_URL);
    throw new Error('Backend URL not configured. Please configure EXPO_PUBLIC_BACKEND_URL in your environment.');
  }

  // Ensure URL has protocol
  if (!backendUrl.startsWith('http')) {
    backendUrl = 'https://' + backendUrl;
  }

  try {
    console.log('[upload] Starting file upload:', { uri, filename, mimeType, platform: Platform.OS, backendUrl });

    // Create FormData
    const formData = new FormData();

    // On web, fetch the file blob first
    if (Platform.OS === 'web') {
      try {
        const response = await fetch(uri);
        const blob = await response.blob();
        formData.append('file', blob, filename);
      } catch (fetchError: any) {
        console.error('[upload] Failed to fetch file on web:', fetchError);
        throw new Error(`Could not read file: ${fetchError?.message}`);
      }
    } else {
      // On native, use the URI directly
      // React Native's FormData handles URI -> blob conversion
      formData.append('file', {
        uri,
        type: mimeType || 'application/octet-stream',
        name: filename,
      } as any);
    }

    const uploadUrl = `${backendUrl}/api/upload`;
    console.log('[upload] Uploading to:', uploadUrl);

    let response: Response;
    try {
      response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        headers: {
          // Don't set Content-Type header - let the browser/Fetch set it with boundary
        },
      });
    } catch (fetchError: any) {
      console.error('[upload] Fetch error:', fetchError);
      const errorMsg = fetchError?.message || 'Network error';
      throw new Error(errorMsg);
    }

    let result: any;
    try {
      const responseText = await response.text();
      console.log('[upload] Response text:', responseText.substring(0, 200));
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[upload] Failed to parse response:', parseError);
      throw new Error('Server returned invalid JSON response');
    }

    console.log('[upload] Upload response status:', response.status);
    console.log('[upload] Upload response:', result);

    if (!response.ok) {
      const errorMessage = result.error?.message || result.error || 'Upload failed';
      console.error('[upload] Server error:', errorMessage);
      throw new Error(errorMessage);
    }

    if (!result.data) {
      console.error('[upload] No data in response:', result);
      throw new Error('Server returned empty response');
    }

    const uploadedUrl = result.data.url || result.data.cdnUrl;
    console.log('[upload] Upload successful:', uploadedUrl);
    return result.data as UploadedFile;
  } catch (err: any) {
    const errorMessage = err?.message || 'Upload failed';
    console.error('[upload] Final error:', errorMessage);
    throw err; // Re-throw original error to preserve stack trace
  }
}
