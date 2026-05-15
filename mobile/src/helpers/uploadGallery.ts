import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { uploadFileToStorage, getContentType } from '@/helpers/uploadToStorage';
import { extractErrorMessage } from '@/lib/errorUtils';

interface UploadResult {
  project: any;
  count: number;
}

export async function pickAndUploadGallery(
  talentProfileId: string
): Promise<UploadResult | null> {
  try {
    // Web: Use HTML file input instead of ImagePicker
    if (Platform.OS === 'web') {
      return await pickAndUploadGalleryWeb(talentProfileId);
    }

    // NATIVE: Use ImagePicker
    // Request permission
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      console.error('[uploadGallery] Permission denied');
      return null;
    }

    // Pick multiple images
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      selectionLimit: 10,
      aspect: [1, 1],
    });

    if (result.canceled) {
      console.log('[uploadGallery] User cancelled image picker');
      return null;
    }

    const assets = result.assets || [];
    if (assets.length === 0) {
      console.log('[uploadGallery] No assets selected');
      return null;
    }

    console.log(`[uploadGallery] Selected ${assets.length} assets, starting upload...`);

    return await uploadAssetsToPortfolio(talentProfileId, assets.map(a => ({
      uri: a.uri,
      type: a.type || 'image',
      filename: `asset-${Date.now()}.${a.type === 'video' ? 'mp4' : 'jpg'}`
    })));
  } catch (err) {
    const errorMsg = extractErrorMessage(err);
    console.error('[uploadGallery] pickAndUploadGallery error:', errorMsg, err);
    throw err; // Throw error instead of returning null so caller can show specific error message
  }
}

/**
 * Web implementation: Use HTML file input
 */
async function pickAndUploadGalleryWeb(talentProfileId: string): Promise<UploadResult | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';
    input.multiple = true;

    input.onchange = async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (files.length === 0) {
        console.log('[uploadGallery] User cancelled file picker');
        resolve(null);
        return;
      }

      console.log(`[uploadGallery] Selected ${files.length} files, starting upload...`);

      const assets = files.map(f => ({
        file: f,
        type: f.type.startsWith('video/') ? 'video' : 'image',
        filename: f.name
      }));

      try {
        const result = await uploadFilesToPortfolio(talentProfileId, assets);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    };

    input.click();
  });
}

/**
 * Upload native assets (from ImagePicker)
 */
async function uploadAssetsToPortfolio(
  talentProfileId: string,
  assets: Array<{ uri: string; type: string; filename: string }>
): Promise<UploadResult | null> {
  try {
    console.log(`[uploadGallery] uploadAssetsToPortfolio starting with ${assets.length} assets`);
    const project = await createPortfolioProject(talentProfileId);
    if (!project) {
      throw new Error('Failed to create portfolio project. Check your permissions or try again.');
    }

    console.log('[uploadGallery] Project created, uploading assets...', { projectId: project.id });
    const uploadedCount = await uploadAssetsToProject(project.id, talentProfileId, assets);
    console.log(`[uploadGallery] uploadAssetsToProject returned uploadedCount: ${uploadedCount}`);

    if (uploadedCount === 0) {
      throw new Error('No assets were successfully uploaded. Please try again.');
    }

    return {
      project,
      count: uploadedCount,
    };
  } catch (err) {
    const errorMsg = extractErrorMessage(err);
    console.error('[uploadGallery] uploadAssetsToPortfolio error:', errorMsg, err);
    throw err;
  }
}

/**
 * Upload web files (from HTML input)
 */
async function uploadFilesToPortfolio(
  talentProfileId: string,
  files: Array<{ file: File; type: string; filename: string }>
): Promise<UploadResult | null> {
  try {
    console.log(`[uploadGallery] uploadFilesToPortfolio starting with ${files.length} files`);
    const project = await createPortfolioProject(talentProfileId);
    if (!project) {
      throw new Error('Failed to create portfolio project. Check your permissions or try again.');
    }

    console.log('[uploadGallery] Project created, uploading files...', { projectId: project.id });
    const uploadedCount = await uploadFilesToProject(project.id, talentProfileId, files);
    console.log(`[uploadGallery] uploadFilesToProject returned uploadedCount: ${uploadedCount}`);

    if (uploadedCount === 0) {
      throw new Error('No files were successfully uploaded. Please try again.');
    }

    return {
      project,
      count: uploadedCount,
    };
  } catch (err) {
    const errorMsg = extractErrorMessage(err);
    console.error('[uploadGallery] uploadFilesToPortfolio error:', errorMsg, err);
    throw err;
  }
}

/**
 * Create portfolio project and section
 */
async function createPortfolioProject(talentProfileId: string): Promise<any> {
  try {
    // Create portfolio project
    const { data: projectData, error: projectError } = await supabase
      .from('portfolio_projects')
      .insert({
        talent_id: talentProfileId,
        title: `Gallery ${new Date().toLocaleDateString()}`,
        template: 'gallery',
        is_featured: false,
        view_count: 0,
        cover_media_url: '', // Required field - empty string for gallery projects
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (projectError) {
      console.error('[uploadGallery] Project creation error - Full Details:', {
        message: projectError.message,
        code: projectError.code,
        details: projectError.details,
        hint: projectError.hint,
        full: JSON.stringify(projectError, null, 2),
      });
      // Throw error so caller can show to user
      throw new Error(`Portfolio project creation failed: ${projectError.message || projectError.code}`);
    }

    if (!projectData) {
      console.error('[uploadGallery] Project creation returned no data');
      throw new Error('Failed to create portfolio project - no data returned');
    }

    console.log('[uploadGallery] Project created successfully:', projectData.id);

    // Create portfolio section
    const { data: sectionData, error: sectionError } = await supabase
      .from('portfolio_sections')
      .insert({
        project_id: projectData.id,
        type: 'media_gallery',
        position: 0,
        data_json: JSON.stringify({ items: [], layout: 'grid' }),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (sectionError) {
      console.error('[uploadGallery] Section creation error - Full Details:', {
        message: sectionError.message,
        code: sectionError.code,
        details: sectionError.details,
        hint: sectionError.hint,
        full: JSON.stringify(sectionError, null, 2),
      });
      throw new Error(`Portfolio section creation failed: ${sectionError.message || sectionError.code}`);
    }

    if (!sectionData) {
      console.error('[uploadGallery] Section creation returned no data');
      throw new Error('Failed to create portfolio section - no data returned');
    }

    console.log('[uploadGallery] Section created successfully:', sectionData.id);

    return { ...projectData, section_id: sectionData.id };
  } catch (err) {
    const errorMsg = extractErrorMessage(err);
    console.error('[uploadGallery] createPortfolioProject error:', errorMsg, err);
    throw err;
  }
}

/**
 * Upload native assets
 */
async function uploadAssetsToProject(
  projectId: string,
  talentProfileId: string,
  assets: Array<{ uri: string; type: string; filename: string }>
): Promise<number> {
  let uploadCount = 0;

  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];
    const ext = asset.type === 'image' ? 'jpg' : 'mp4';
    const fileName = `${talentProfileId}/${Date.now()}-${i}.${ext}`;
    const contentType = getContentType(ext, asset.type === 'video');

    try {
      console.log(`[uploadGallery] Uploading asset ${i}:`, { fileName, uri: asset.uri, type: asset.type });

      const { publicUrl, error } = await uploadFileToStorage(
        'portfolio',
        fileName,
        asset.uri,
        contentType
      );

      if (error) {
        const err = error as unknown;
        const errorMsg = typeof err === 'string' ? err : err instanceof Error ? err.message : 'An error occurred';
        console.error(`[uploadGallery] Upload error for asset ${i}:`, errorMsg);
        continue;
      }

      if (!publicUrl) {
        console.error(`[uploadGallery] No public URL for asset ${i}`);
        continue;
      }

      console.log(`[uploadGallery] Asset ${i} uploaded successfully:`, publicUrl);

      // Create portfolio_item with correct field names
      try {
        const { error: itemError } = await supabase
          .from('portfolio_items')
          .insert({
            talent_id: talentProfileId,
            media_url: publicUrl,
            media_type: asset.type === 'image' ? 'image' : 'video',
            approved_status: 'approved',
            created_at: new Date().toISOString(),
          });

        if (itemError) {
          console.error(`[uploadGallery] Item creation failed for asset ${i}:`, {
            message: itemError.message,
            code: itemError.code,
            details: itemError.details,
            hint: itemError.hint,
            full: JSON.stringify(itemError, null, 2),
          });
          continue;
        }

        console.log(`[uploadGallery] Item ${i} created successfully in database`);
        uploadCount++;
      } catch (itemErr) {
        console.error(`[uploadGallery] Exception inserting item ${i}:`, itemErr);
        continue;
      }
    } catch (err) {
      console.error(`[uploadGallery] Error uploading asset ${i}:`, err);
      continue;
    }
  }

  console.log(`[uploadGallery] uploadAssetsToProject completed with uploadCount: ${uploadCount}`);
  return uploadCount;
}

/**
 * Upload web files
 */
async function uploadFilesToProject(
  projectId: string,
  talentProfileId: string,
  files: Array<{ file: File; type: string; filename: string }>
): Promise<number> {
  let uploadCount = 0;

  for (let i = 0; i < files.length; i++) {
    const { file, type } = files[i];
    const ext = type === 'image' ? 'jpg' : 'mp4';
    const fileName = `${talentProfileId}/${Date.now()}-${i}.${ext}`;
    const contentType = getContentType(ext, type === 'video');

    try {
      console.log(`[uploadGallery] Uploading file ${i}:`, { fileName, size: file.size, type });

      const { publicUrl, error } = await uploadFileToStorage(
        'portfolio',
        fileName,
        file,
        contentType
      );

      if (error) {
        const err = error as unknown;
        const errorMsg = typeof err === 'string' ? err : err instanceof Error ? err.message : 'An error occurred';
        console.error(`[uploadGallery] Upload error for file ${i}:`, errorMsg);
        continue;
      }

      if (!publicUrl) {
        console.error(`[uploadGallery] No public URL for file ${i}`);
        continue;
      }

      console.log(`[uploadGallery] File ${i} uploaded successfully:`, publicUrl);

      // Create portfolio_item with correct field names
      try {
        const { error: itemError } = await supabase
          .from('portfolio_items')
          .insert({
            talent_id: talentProfileId,
            media_url: publicUrl,
            media_type: type === 'image' ? 'image' : 'video',
            approved_status: 'approved',
            created_at: new Date().toISOString(),
          });

        if (itemError) {
          console.error(`[uploadGallery] Item creation failed for file ${i}:`, {
            message: itemError.message,
            code: itemError.code,
            details: itemError.details,
            hint: itemError.hint,
            full: JSON.stringify(itemError, null, 2),
          });
          continue;
        }

        console.log(`[uploadGallery] Item ${i} created successfully in database`);
        uploadCount++;
      } catch (itemErr) {
        console.error(`[uploadGallery] Exception inserting item ${i}:`, itemErr);
        continue;
      }
    } catch (err) {
      console.error(`[uploadGallery] Error uploading file ${i}:`, err);
      continue;
    }
  }

  console.log(`[uploadGallery] uploadFilesToProject completed with uploadCount: ${uploadCount}`);
  return uploadCount;
}

