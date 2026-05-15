import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { extractErrorMessage } from '@/lib/errorUtils';
import { useAuthStore } from '@/lib/state/auth-store';

export interface FileAsset {
  id: string;
  booking_id: string;
  deliverable_id?: string;
  uploaded_by_user_id: string;
  file_url: string;
  file_name: string;
  file_type: 'image' | 'video' | 'document' | 'link';
  file_size?: number;
  thumbnail_url?: string;
  approved_status: 'pending' | 'approved' | 'revision_requested';
  revision_notes?: string;
  version: number;
  asset_type: 'file' | 'link';
  link_url?: string;
  link_title?: string;
  created_at: string;
  updated_at: string;
}

// Helper function to ensure file_url is a valid public URL
function sanitizeFileUrl(fileUrl: string): string {
  if (!fileUrl) {
    console.warn('[sanitizeFileUrl] Empty URL');
    return '';
  }

  console.log('[sanitizeFileUrl] Processing URL:', fileUrl.substring(0, 100));

  // If it's already a proper HTTP(S) URL, return as-is
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    console.log('[sanitizeFileUrl] Valid HTTP URL');
    return fileUrl;
  }

  // If it contains data URI, it's malformed - skip it
  if (fileUrl.includes('data:image') || fileUrl.includes('data:video')) {
    console.warn('[sanitizeFileUrl] Malformed data URI detected');
    return '';
  }

  // If it's a storage path (doesn't start with http), reconstruct the public URL
  if (!fileUrl.startsWith('http')) {
    console.log('[sanitizeFileUrl] Converting storage path to public URL');
    // Get Supabase URL from environment
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (supabaseUrl) {
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/deliverables/${fileUrl}`;
      console.log('[sanitizeFileUrl] Generated public URL:', publicUrl.substring(0, 100));
      return publicUrl;
    } else {
      console.warn('[sanitizeFileUrl] Supabase URL not available');
      return '';
    }
  }

  console.log('[sanitizeFileUrl] Returning URL as-is');
  return fileUrl;
}

export function useFileAssets(bookingId: string) {
  const [files, setFiles] = useState<FileAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const user = useAuthStore((state) => state.user);

  // Fetch all files for this booking
  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('file_assets')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false });

      if (err) throw err;

      // Sanitize all file URLs
      const sanitizedFiles = (data || []).map((file: FileAsset) => ({
        ...file,
        file_url: sanitizeFileUrl(file.file_url),
      }));

      setFiles(sanitizedFiles);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch files';
      setError(message);
      console.error('Error fetching files:', err);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  // Upload a file
  const uploadFile = useCallback(
    async (file: File, deliverableId?: string) => {
      try {
        setError(null);
        if (!user) throw new Error('Not authenticated');

        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 11);
        const ext = file.name.split('.').pop() || 'bin';
        const storagePath = `${bookingId}/${timestamp}-${random}.${ext}`;

        console.log('[uploadFile] Starting upload:', { storagePath, fileSize: file.size, fileType: file.type });

        // Upload to storage
        const { error: uploadErr, data: uploadData } = await supabase.storage
          .from('deliverables')
          .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadErr) {
          console.error('[uploadFile] Upload error:', uploadErr);
          throw uploadErr;
        }

        console.log('[uploadFile] Upload successful:', uploadData);

        // Get the public URL
        const { data: urlData } = supabase.storage
          .from('deliverables')
          .getPublicUrl(storagePath);

        const publicUrl = urlData?.publicUrl;

        if (!publicUrl) {
          throw new Error('Failed to generate public URL');
        }

        // Validate that we got a proper URL (not base64)
        if (publicUrl.includes('data:') || publicUrl.includes('base64')) {
          throw new Error('Generated URL is malformed (contains data URI)');
        }

        console.log('[uploadFile] Public URL generated:', publicUrl);

        // Detect file type
        let fileType: 'image' | 'video' | 'document' | 'link' = 'document';
        if (file.type.startsWith('image/')) fileType = 'image';
        else if (file.type.startsWith('video/')) fileType = 'video';

        // Insert into database with public URL
        const { data: newFile, error: dbErr } = await supabase
          .from('file_assets')
          .insert({
            booking_id: bookingId,
            deliverable_id: deliverableId,
            uploaded_by_user_id: user.id,
            file_url: publicUrl,
            file_name: file.name,
            file_type: fileType,
            file_size: file.size,
            approved_status: 'pending',
            version: 1,
            asset_type: 'file',
          })
          .select()
          .single();

        if (dbErr) {
          console.error('[uploadFile] Database insert error:', dbErr);
          throw dbErr;
        }

        console.log('[uploadFile] File record created:', newFile);
        setFiles((prev) => [newFile as FileAsset, ...prev]);
        return newFile;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to upload file';
        setError(message);
        console.error('[uploadFile] Error:', message, err);
        throw err;
      }
    },
    [bookingId, user]
  );

  // Add external link
  const addLink = useCallback(
    async (url: string, title: string, deliverableId?: string) => {
      try {
        console.log('[useFileAssets] Adding link:', { url, title, bookingId, userId: user?.id });
        setError(null);
        if (!user) throw new Error('Not authenticated');

        const { data: newLink, error: err } = await supabase
          .from('file_assets')
          .insert({
            booking_id: bookingId,
            uploaded_by_user_id: user.id,
            file_url: url,
            file_name: title,
            file_type: 'link',
            approved_status: 'pending',
            version: 1,
            deliverable_id: deliverableId || null,
            asset_type: 'link',
            link_url: url,
            link_title: title,
          })
          .select()
          .single();

        if (err) {
          const errorDetails = {
            code: err.code || 'UNKNOWN',
            message: err.message || 'Unknown error',
            details: err.details || '',
            hint: err.hint || '',
            status: (err as any).status || 'UNKNOWN',
          };
          console.error('[useFileAssets] Supabase insert error:', errorDetails);
          throw new Error(`${errorDetails.message}${errorDetails.details ? ' - ' + errorDetails.details : ''}`);
        }

        console.log('[useFileAssets] Link added successfully:', newLink);
        setFiles((prev) => [newLink as FileAsset, ...prev]);
        return newLink;
      } catch (err) {
        const message = extractErrorMessage(err);
        setError(message);
        console.error('[useFileAssets] Error adding link:', message);
        throw new Error(message);
      }
    },
    [bookingId, user]
  );

  // Approve a file
  const approveFile = useCallback(async (fileId: string) => {
    try {
      setError(null);
      const { error: err } = await supabase
        .from('file_assets')
        .update({ approved_status: 'approved' })
        .eq('id', fileId);

      if (err) throw err;

      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, approved_status: 'approved' as const } : f
        )
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to approve file';
      setError(message);
      console.error('Error approving file:', err);
    }
  }, []);

  // Request revision
  const requestRevision = useCallback(
    async (fileId: string, notes: string) => {
      try {
        setError(null);
        const file = files.find((f) => f.id === fileId);
        if (!file) throw new Error('File not found');

        const { error: err } = await supabase
          .from('file_assets')
          .update({
            approved_status: 'revision_requested',
            revision_notes: notes,
            version: file.version + 1,
          })
          .eq('id', fileId);

        if (err) throw err;

        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? {
                  ...f,
                  approved_status: 'revision_requested' as const,
                  revision_notes: notes,
                  version: f.version + 1,
                }
              : f
          )
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to request revision';
        setError(message);
        console.error('Error requesting revision:', err);
      }
    },
    [files]
  );

  // Delete a file
  const deleteFile = useCallback(async (fileId: string) => {
    try {
      setError(null);
      const file = files.find((f) => f.id === fileId);
      if (!file) throw new Error('File not found');

      // Delete from storage if it's a file (not a link)
      if (file.asset_type === 'file') {
        const { error: storageErr } = await supabase.storage
          .from('deliverables')
          .remove([file.file_url]);

        if (storageErr) console.warn('Storage deletion warning:', storageErr);
      }

      // Delete from database
      const { error: dbErr } = await supabase
        .from('file_assets')
        .delete()
        .eq('id', fileId);

      if (dbErr) throw dbErr;

      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete file';
      setError(message);
      console.error('Error deleting file:', err);
    }
  }, [files]);

  // Get signed URL for a file
  const getSignedUrl = useCallback(async (filePath: string): Promise<string> => {
    try {
      console.log('[getSignedUrl] Creating signed URL for:', filePath);

      // If it's already a full HTTP URL, extract just the storage path
      let storagePath = filePath;
      if (filePath.startsWith('http')) {
        // Extract path from Supabase URL like: https://xxx.supabase.co/storage/v1/object/public/deliverables/bookingId/filename.ext
        const match = filePath.match(/deliverables\/(.+?)(?:\?|$)/);
        if (match && match[1]) {
          storagePath = match[1];
          console.log('[getSignedUrl] Extracted storage path:', storagePath);
        }
      }

      const { data, error: err } = await supabase.storage
        .from('deliverables')
        .createSignedUrl(storagePath, 3600);

      if (err) {
        console.error('[getSignedUrl] Error creating signed URL:', err);
        throw err;
      }

      console.log('[getSignedUrl] Signed URL created successfully');
      return data.signedUrl;
    } catch (err) {
      console.error('[getSignedUrl] Error:', err);
      throw err;
    }
  }, []);

  // Download a file
  const downloadFile = useCallback(
    async (file: FileAsset) => {
      try {
        console.log('[downloadFile] Download request for:', file.file_name);

        if (file.asset_type === 'link' && file.link_url) {
          // For links, just return the link URL
          console.log('[downloadFile] Link asset detected, returning link URL');
          return file.link_url;
        }

        if (file.asset_type === 'file') {
          // For files, get a signed URL that bypasses CORS
          console.log('[downloadFile] File asset detected, getting signed URL');
          const signedUrl = await getSignedUrl(file.file_url);
          return signedUrl;
        }

        throw new Error('Unknown asset type');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to get download URL';
        console.error('[downloadFile] Error:', message);
        throw new Error(message);
      }
    },
    [getSignedUrl]
  );

  // Get progress statistics
  const getProgress = useCallback(() => {
    const total = files.length;
    const approved = files.filter((f) => f.approved_status === 'approved').length;
    const pending = files.filter((f) => f.approved_status === 'pending').length;
    const revision = files.filter((f) => f.approved_status === 'revision_requested').length;
    const percentage = total > 0 ? Math.round((approved / total) * 100) : 0;

    return { total, approved, pending, revision, percentage };
  }, [files]);

  // Get files for a specific deliverable
  const getFilesForDeliverable = useCallback(
    (deliverableId?: string) => {
      if (!deliverableId) return files;
      return files.filter((f) => f.deliverable_id === deliverableId);
    },
    [files]
  );

  return {
    files,
    loading,
    error,
    fetchFiles,
    uploadFile,
    addLink,
    approveFile,
    requestRevision,
    deleteFile,
    getSignedUrl,
    downloadFile,
    getProgress,
    getFilesForDeliverable,
  };
}
