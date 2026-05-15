import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/state/auth-store';

export interface MediaItem {
  id: string;
  media_url: string;
  thumbnail_url?: string;
  media_type: 'image' | 'video';
  title?: string;
  talent_id: string;
}

export interface CaseStudyProject {
  id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  category?: string;
  tags?: string[];
  is_featured: boolean;
  view_count: number;
  created_at: string;
}

export interface SocialLink {
  id: string;
  platform: string;
  url: string;
  username?: string;
}

export function usePortfolio() {
  const userId = useAuthStore((state) => state.user?.id);
  const [galleryMedia, setGalleryMedia] = useState<MediaItem[]>([]);
  const [caseStudyProjects, setCaseStudyProjects] = useState<CaseStudyProject[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [talentProfileId, setTalentProfileId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!userId) {
      console.log('[usePortfolio] No user ID, skipping fetch');
      setIsLoading(false);
      return;
    }

    try {
      console.log('[usePortfolio] Fetching portfolio data for user:', userId);

      // Step 1: Get talent profile
      const { data: talentProfile, error: profileError } = await supabase
        .from('talent_profiles')
        .select('id, social_links')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('[usePortfolio] Error fetching talent profile:', profileError);
        setIsLoading(false);
        return;
      }

      if (!talentProfile) {
        console.log('[usePortfolio] No talent profile found');
        setIsLoading(false);
        return;
      }

      const talentId = talentProfile.id;
      console.log('[usePortfolio] Found talent profile:', talentId);
      setTalentProfileId(talentId);

      // Step 2: Parse social links from talent profile
      if (talentProfile.social_links) {
        try {
          const links = Array.isArray(talentProfile.social_links)
            ? talentProfile.social_links
            : JSON.parse(talentProfile.social_links);
          setSocialLinks(links || []);
        } catch (e) {
          console.error('[usePortfolio] Error parsing social links:', e);
          setSocialLinks([]);
        }
      } else {
        setSocialLinks([]);
      }

      // Step 3 & 4: Fetch both projects and items in parallel
      const [projectsRes, itemsRes] = await Promise.all([
        supabase
          .from('portfolio_projects')
          .select('*')
          .eq('talent_id', talentId)
          .order('created_at', { ascending: false }),
        supabase
          .from('portfolio_items')
          .select('id, media_url, thumbnail_url, media_type, title, talent_id, created_at')
          .eq('talent_id', talentId)
          .order('created_at', { ascending: false }),
      ]);

      const { data: projects, error: projectsError } = projectsRes;
      const { data: items, error: itemsError } = itemsRes;

      if (projectsError) {
        console.error('[usePortfolio] Error fetching projects:', projectsError);
      }
      if (itemsError) {
        console.error('[usePortfolio] Error fetching items:', itemsError);
      }

      // Process case studies
      if (projects && projects.length > 0) {
        const caseStudies = projects.filter((p) => p.template !== 'gallery');
        setCaseStudyProjects(
          caseStudies.map((p) => ({
            id: p.id,
            title: p.title || 'Untitled',
            description: p.description,
            thumbnail_url: p.cover_media_url || p.thumbnail_url,
            category: p.category,
            tags: Array.isArray(p.tags) ? p.tags : (typeof p.tags === 'string' ? JSON.parse(p.tags) : []),
            is_featured: p.is_featured || false,
            view_count: p.view_count || 0,
            created_at: p.created_at || new Date().toISOString(),
          }))
        );
      } else {
        setCaseStudyProjects([]);
      }

      // Process gallery items
      if (items && items.length > 0) {
        const media: MediaItem[] = items.map((item) => ({
          id: item.id,
          media_url: item.media_url || '',
          thumbnail_url: item.thumbnail_url,
          media_type: (item.media_type || 'image').toLowerCase() === 'video' ? 'video' : 'image',
          title: item.title,
          talent_id: item.talent_id,
        }));
        setGalleryMedia(media);
      } else {
        setGalleryMedia([]);
      }

      console.log('[usePortfolio] Portfolio data loaded successfully');
    } catch (err) {
      console.error('[usePortfolio] Unexpected error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const deleteMediaItem = useCallback(
    async (itemId: string): Promise<boolean> => {
      try {
        const { error } = await supabase.from('portfolio_items').delete().eq('id', itemId);

        if (error) {
          console.error(error);
          return false;
        }

        setGalleryMedia((prev) => prev.filter((item) => item.id !== itemId));
        return true;
      } catch (err) {
        console.error('deleteMediaItem error:', err);
        return false;
      }
    },
    []
  );

  const updateMediaCaption = useCallback(
    async (itemId: string, caption: string): Promise<boolean> => {
      try {
        const { error } = await supabase
          .from('portfolio_items')
          .update({ title: caption })
          .eq('id', itemId);

        if (error) {
          console.error(error);
          return false;
        }

        setGalleryMedia((prev) =>
          prev.map((item) => (item.id === itemId ? { ...item, title: caption } : item))
        );
        return true;
      } catch (err) {
        console.error('updateMediaCaption error:', err);
        return false;
      }
    },
    []
  );

  const deleteCaseStudy = useCallback(
    async (projectId: string): Promise<boolean> => {
      try {
        const { error } = await supabase.from('portfolio_projects').delete().eq('id', projectId);

        if (error) {
          console.error(error);
          return false;
        }

        setCaseStudyProjects((prev) => prev.filter((p) => p.id !== projectId));
        return true;
      } catch (err) {
        console.error('deleteCaseStudy error:', err);
        return false;
      }
    },
    []
  );

  const toggleFeatured = useCallback(
    async (projectId: string, isFeatured: boolean): Promise<boolean> => {
      try {
        const { error } = await supabase
          .from('portfolio_projects')
          .update({ is_featured: !isFeatured })
          .eq('id', projectId);

        if (error) {
          console.error(error);
          return false;
        }

        setCaseStudyProjects((prev) =>
          prev.map((p) => (p.id === projectId ? { ...p, is_featured: !isFeatured } : p))
        );
        return true;
      } catch (err) {
        console.error('toggleFeatured error:', err);
        return false;
      }
    },
    []
  );

  const saveSocialLinks = useCallback(
    async (links: SocialLink[]): Promise<boolean> => {
      if (!talentProfileId) return false;

      try {
        const { error } = await supabase
          .from('talent_profiles')
          .update({ social_links: links })
          .eq('id', talentProfileId);

        if (error) {
          console.error(error);
          return false;
        }

        setSocialLinks(links);
        return true;
      } catch (err) {
        console.error('saveSocialLinks error:', err);
        return false;
      }
    },
    [talentProfileId]
  );

  return {
    galleryMedia,
    caseStudyProjects,
    socialLinks,
    isLoading,
    isLoadingMedia,
    deleteMediaItem,
    updateMediaCaption,
    deleteCaseStudy,
    toggleFeatured,
    saveSocialLinks,
    refetch: fetchAll,
  };
}
