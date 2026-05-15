import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { extractErrorMessage } from '@/lib/errorUtils';
import { useAuthStore } from '@/lib/state/auth-store';

export function useTalentProfileData() {
  const user = useAuthStore((s) => s.user);
  const [profile, setProfile] = useState<{
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    username: string | null;
    email: string | null;
  } | null>(null);
  const [talentProfile, setTalentProfile] = useState<{
    id: string;
    account_type: string | null;
    is_verified: boolean;
    category: string | null;
    location_text: string | null;
    rating: number | null;
    total_completed_bookings: number | null;
    banner_url: string | null;
  } | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [hasClientRole, setHasClientRole] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      console.log('[useTalentProfileData] Fetching profile data for user:', user.id);

      let profileResult = { error: null as any, data: null as any };
      let talentProfileResult = { error: null as any, data: null as any };
      let rolesResult = { error: null as any, data: null as any };

      try {
        profileResult = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, username, email')
          .eq('id', user.id)
          .single();
      } catch (err) {
        profileResult = { error: err, data: null };
      }

      try {
        talentProfileResult = await supabase
          .from('talent_profiles')
          .select('id, account_type, is_verified, category, location_text, rating, total_completed_bookings, banner_url')
          .eq('user_id', user.id)
          .maybeSingle();
      } catch (err) {
        talentProfileResult = { error: err, data: null };
      }

      try {
        rolesResult = await supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', user.id)
          .eq('role', 'client')
          .maybeSingle();
      } catch (err) {
        rolesResult = { error: err, data: null };
      }

      if (profileResult.error) {
        console.warn('[useTalentProfileData] Profile query error - profiles table may not exist or user has no profile:', profileResult.error?.message || 'Unknown error');
      }

      if (profileResult.data) {
        console.log('[useTalentProfileData] Profile loaded:', { ...profileResult.data, avatar_url: profileResult.data.avatar_url ? '✓ has avatar' : '✗ no avatar' });
        setProfile(profileResult.data);
      }
      if (talentProfileResult.data) {
        console.log('[useTalentProfileData] Talent profile loaded:', talentProfileResult.data.id);
        setTalentProfile(talentProfileResult.data);
      }
      if (talentProfileResult.error && !profileResult.data) {
        console.warn('[useTalentProfileData] Talent profile query error:', talentProfileResult.error?.message || 'Unknown error');
      }
      if (rolesResult.data) {
        console.log('[useTalentProfileData] User has client role');
        setHasClientRole(true);
      }
    } catch (err) {
      console.error('useTalentProfileData error:', extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'T';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return {
    profile,
    talentProfile,
    isVerified,
    hasClientRole,
    isLoading,
    getInitials,
    refetch: fetchAll,
    userId: user?.id,
  };
}
