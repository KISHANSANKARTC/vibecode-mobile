import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface ShortlistItem {
  id: string;
  user_id: string;
  talent_id: string;
  folder_id: string | null;
  created_at: string;
  talent?: any;
  profile?: any;
}

export interface ShortlistFolder {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

interface User {
  id: string;
  [key: string]: any;
}

export function useShortlist(user: User | null) {
  const [items, setItems] = useState<ShortlistItem[]>([]);
  const [folders, setFolders] = useState<ShortlistFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Step 1: Fetch all shortlist items for this user
      const { data, error } = await supabase
        .from('shortlist_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        setItems([]);
        return;
      }

      // Step 2: Fetch talent profiles for all shortlisted talent IDs
      const talentIds = [...new Set(data.map((i: any) => i.talent_id))];
      const { data: talentData } = await supabase
        .from('talent_profiles')
        .select('id, category, bio, hourly_rate, rating, location_text, is_verified, user_id, display_name')
        .in('id', talentIds);

      const talentMap = new Map();
      (talentData || []).forEach((t: any) => {
        talentMap.set(t.id, t);
      });

      // Step 3: Fetch user profiles (for name and avatar)
      const talentUserIds = [...new Set((talentData || []).map((t: any) => t.user_id).filter(Boolean))];
      let profileMap = new Map();

      if (talentUserIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', talentUserIds);

        (profileData || []).forEach((p: any) => {
          profileMap.set(p.id, p);
        });
      }

      // Step 4: Merge everything together
      const enriched = data.map((item: any) => {
        const talent = talentMap.get(item.talent_id);
        return {
          ...item,
          talent,
          profile: talent?.user_id ? profileMap.get(talent.user_id) : null,
        };
      });

      setItems(enriched);
    } catch (err) {
      console.error('useShortlist fetchItems error:', err);
    }
  }, [user?.id]);

  const fetchFolders = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('shortlist_folders')
        .select('id, user_id, name, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFolders(data || []);
    } catch (err) {
      console.error('useShortlist fetchFolders error:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await Promise.all([fetchItems(), fetchFolders()]);
      setIsLoading(false);
    };
    load();
  }, [fetchItems, fetchFolders]);

  const isInShortlist = useCallback((talentId: string) => {
    return items.some((i) => i.talent_id === talentId);
  }, [items]);

  const addToShortlist = async (talentId: string) => {
    if (!user?.id) {
      alert('Please sign in to save talent');
      return;
    }

    // Prevent duplicates
    if (isInShortlist(talentId)) return;

    try {
      const { error } = await supabase.from('shortlist_items').insert({
        user_id: user.id,
        talent_id: talentId,
        folder_id: null,
      });

      if (error) throw error;
      await fetchItems(); // Refresh list
    } catch (err) {
      console.error('addToShortlist error:', err);
    }
  };

  const removeFromShortlist = async (talentId: string) => {
    if (!user?.id) return;
    try {
      const { error } = await supabase
        .from('shortlist_items')
        .delete()
        .eq('user_id', user.id)
        .eq('talent_id', talentId);

      if (error) throw error;
      setItems((prev) => prev.filter((i) => i.talent_id !== talentId));
    } catch (err) {
      console.error('removeFromShortlist error:', err);
    }
  };

  const createFolder = async (name: string) => {
    if (!user?.id) return null;
    try {
      const { data, error } = await supabase
        .from('shortlist_folders')
        .insert({ user_id: user.id, name })
        .select('id, user_id, name, created_at')
        .single();

      if (error) throw error;
      setFolders((prev) => [data, ...prev]);
      return data;
    } catch (err) {
      console.error('createFolder error:', err);
      return null;
    }
  };

  const deleteFolder = async (folderId: string) => {
    try {
      const { error } = await supabase
        .from('shortlist_folders')
        .delete()
        .eq('id', folderId);

      if (error) throw error;
      setFolders((prev) => prev.filter((f) => f.id !== folderId));
      setItems((prev) => prev.filter((i) => i.folder_id !== folderId));
    } catch (err) {
      console.error('deleteFolder error:', err);
    }
  };

  const getItemsForFolder = (folderId: string | null) => {
    if (folderId === null) return items.filter((i) => !i.folder_id);
    return items.filter((i) => i.folder_id === folderId);
  };

  return {
    items,
    folders,
    isLoading,
    isInShortlist,
    addToShortlist,
    removeFromShortlist,
    createFolder,
    deleteFolder,
    getItemsForFolder,
    refetch: async () => {
      await Promise.all([fetchItems(), fetchFolders()]);
    },
  };
}
