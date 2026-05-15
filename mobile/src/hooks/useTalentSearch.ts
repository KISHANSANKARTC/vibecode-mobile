import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { extractErrorMessage } from '@/lib/errorUtils';
import { TalentSearchFilters } from '@/components/search/MobileFilterSheet';

export interface TalentCard {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviewCount: number;
  hourlyRate: number;
  imageUrl: string | null;
  isVerified: boolean;
  isPremium: boolean;
  location: string;
  availability: string;
  specialties: string[];
  hasInstantBook?: boolean;
  portfolioItems?: any[];
  totalBookings?: number;
  gender?: string | null;
}

interface UseTalentSearchOptions {
  pageSize?: number;
  initialFilters?: Partial<TalentSearchFilters>;
}

export function useTalentSearch(options: UseTalentSearchOptions = {}) {
  const { pageSize = 20, initialFilters = {} } = options;

  const [talents, setTalents] = useState<TalentCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState<TalentSearchFilters>({
    query: '',
    category: null,
    country: null,
    nationality: null,
    minRating: null,
    minPrice: null,
    maxPrice: null,
    isVerified: false,
    isPremium: false,
    gender: null,
    ethnicity: null,
    build: null,
    heightMin: null,
    heightMax: null,
    weight: null,
    weightMax: null,
    shoeSize: null,
    followerCountMin: null,
    followerCountMax: null,
    niches: [],
    audiences: [],
    specialties: [],
    availabilityFilter: null,
    sort: 'recommended',
    nearMeDistance: null,
    ...initialFilters,
  });

  const pageRef = useRef(0);
  const resultKeyRef = useRef<string | null>(null);

  // Generate result key for request sequencing
  const generateResultKey = useCallback(() => {
    return JSON.stringify({
      category: filters.category,
      query: filters.query,
      sort: filters.sort,
      minRating: filters.minRating,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      isVerified: filters.isVerified,
      isPremium: filters.isPremium,
      country: filters.country,
      ethnicity: filters.ethnicity,
      nationality: filters.nationality,
      build: filters.build,
      heightMin: filters.heightMin,
      heightMax: filters.heightMax,
      weight: filters.weight,
      weightMax: filters.weightMax,
      shoeSize: filters.shoeSize,
      followerCountMin: filters.followerCountMin,
      followerCountMax: filters.followerCountMax,
      niches: filters.niches,
      audiences: filters.audiences,
      specialties: filters.specialties,
      gender: filters.gender,
    });
  }, [filters]);

  // Fetch talents with all the logic specified
  const fetchTalents = useCallback(
    async (pageNum: number = 0) => {
      try {
        setLoading(true);
        setError(null);

        // Generate result key for this request
        const currentRequestKey = generateResultKey();
        resultKeyRef.current = currentRequestKey;

        const from = pageNum * pageSize;
        const to = from + pageSize - 1;

        // STEP A: Main query on talent_profiles
        let query = supabase
          .from('talent_profiles')
          .select('*', { count: 'exact' });

        // STEP B: Apply sorting first
        const sortMapping: Record<string, { column: string; ascending: boolean }> = {
          recommended: { column: 'rating', ascending: false },
          newest: { column: 'created_at', ascending: false },
          oldest: { column: 'created_at', ascending: true },
          nearest: { column: 'distance', ascending: true },
          highest_rated: { column: 'rating', ascending: false },
          available_first: { column: 'is_available', ascending: false },
          price_low_high: { column: 'hourly_rate', ascending: true },
          price_high_low: { column: 'hourly_rate', ascending: false },
        };

        const sortConfig = sortMapping[filters.sort || 'recommended'];
        query = query.order(sortConfig.column, { ascending: sortConfig.ascending }).order('id', { ascending: true });

        // STEP D: Apply text search - build search conditions BEFORE other filters
        if (filters.query?.trim()) {
          const searchTerm = filters.query.trim();
          // Search in display_name, bio, and location_text
          query = query.or(
            `display_name.ilike.%${searchTerm}%,bio.ilike.%${searchTerm}%,location_text.ilike.%${searchTerm}%`
          );
        }

        // STEP E: Apply category filter
        if (filters.category) {
          query = query.or(`categories.cs.["${filters.category}"],category.eq.${filters.category}`);
        }

        // STEP F: Apply server-side filters (these use AND logic)
        if (filters.minRating && filters.minRating > 0) {
          query = query.gte('rating', filters.minRating);
        }
        if (filters.minPrice && filters.minPrice > 0) {
          query = query.gte('hourly_rate', filters.minPrice);
        }
        if (filters.maxPrice && filters.maxPrice < 10000) {
          query = query.lte('hourly_rate', filters.maxPrice);
        }
        if (filters.isVerified) {
          query = query.eq('is_verified', true);
        }
        if (filters.isPremium) {
          query = query.eq('is_premium', true);
        }
        if (filters.ethnicity) {
          query = query.eq('ethnicity', filters.ethnicity);
        }
        if (filters.nationality) {
          query = query.eq('nationality', filters.nationality);
        }
        if (filters.build && filters.build !== 'any') {
          query = query.eq('build', filters.build);
        }
        if (filters.heightMin && filters.heightMin > 0) {
          query = query.gte('height_cm', filters.heightMin);
        }
        if (filters.heightMax && filters.heightMax < 250) {
          query = query.lte('height_cm', filters.heightMax);
        }
        if (filters.weight && filters.weight > 0) {
          // Weight is a minimum value (used as lower bound of a range)
          query = query.gte('weight_kg', filters.weight);
        }
        if (filters.weightMax && filters.weightMax < 250) {
          // Weight max is upper bound of range
          query = query.lte('weight_kg', filters.weightMax);
        }
        if (filters.shoeSize) {
          query = query.eq('shoe_size', filters.shoeSize);
        }
        if (filters.followerCountMin && filters.followerCountMin > 0) {
          query = query.gte('follower_count', filters.followerCountMin);
        }
        if (filters.followerCountMax && filters.followerCountMax < 10000000) {
          query = query.lte('follower_count', filters.followerCountMax);
        }
        if (filters.niches && filters.niches.length > 0) {
          query = query.overlaps('influencer_niche', filters.niches);
        }
        if (filters.audiences && filters.audiences.length > 0) {
          query = query.overlaps('audience_type', filters.audiences);
        }
        if (filters.country) {
          query = query.eq('country', filters.country);
        }

        // STEP C: Apply pagination AFTER all filters
        query = query.range(from, to);

        // Execute main query
        const { data: talentData, error: talentError, count } = await query;

        if (talentError) {
          console.error('Supabase query error:', talentError);
          throw talentError;
        }

        if (!talentData || talentData.length === 0) {
          // Only set empty if this is the most recent request
          if (currentRequestKey === resultKeyRef.current) {
            if (pageNum === 0) {
              setTalents([]);
            }
            setHasMore(false);
          }
          setLoading(false);
          return;
        }

        // STEP G: Run parallel secondary queries
        const userIds = [...new Set(talentData.map((t: any) => t.user_id))];
        const talentIds = talentData.map((t: any) => t.id);

        const [adminResult, profileResult, portfolioResult, bookingResult, packagesResult] = await Promise.all(
          [
            supabase.from('user_roles').select('user_id').eq('role', 'admin'),
            supabase.from('profiles').select('id, full_name, avatar_url, gender').in('id', userIds),
            supabase
              .from('portfolio_items')
              .select('id, talent_id, media_url, media_type')
              .in('talent_id', talentIds)
              .eq('approved_status', 'approved')
              .order('sort_order', { ascending: true }),
            supabase
              .from('booking_talents')
              .select('talent_id')
              .in('talent_id', talentIds)
              .eq('status', 'completed'),
            supabase
              .from('packages')
              .select('talent_id, instant_book_enabled')
              .in('talent_id', talentIds)
              .eq('instant_book_enabled', true)
              .eq('is_active', true),
          ]
        );

        // STEP H: Merge all data
        const adminUserIds = new Set(adminResult.data?.map((a: any) => a.user_id) || []);
        const filteredTalentData = talentData.filter((t: any) => !adminUserIds.has(t.user_id));

        const profileMap = new Map(profileResult.data?.map((p: any) => [p.id, p]) || []);

        const portfolioMap = new Map<string, any[]>();
        portfolioResult.data?.forEach((p: any) => {
          if (!portfolioMap.has(p.talent_id)) portfolioMap.set(p.talent_id, []);
          portfolioMap.get(p.talent_id)!.push(p);
        });

        const bookingCountMap = new Map<string, number>();
        bookingResult.data?.forEach((b: any) => {
          bookingCountMap.set(b.talent_id, (bookingCountMap.get(b.talent_id) || 0) + 1);
        });

        const instantBookSet = new Set<string>();
        packagesResult.data?.forEach((p: any) => {
          if (p.instant_book_enabled) {
            const talent = filteredTalentData.find((t: any) => t.id === p.talent_id);
            if (talent && talent.instant_book_master_enabled !== false) {
              instantBookSet.add(p.talent_id);
            }
          }
        });

        // Map to TalentCard format
        const merged = filteredTalentData.map((t: any) => ({
          id: t.id,
          name: profileMap.get(t.user_id)?.full_name || t.display_name || 'Talent',
          category: t.category || '',
          rating: Number(t.rating) || 0,
          reviewCount: Number(t.total_completed_bookings) || 0,
          hourlyRate: t.hourly_rate || 0,
          imageUrl: profileMap.get(t.user_id)?.avatar_url || null,
          isVerified: t.is_verified || false,
          isPremium: t.is_premium || false,
          location: t.location_text || t.country || '',
          availability: t.is_available ? 'Available' : 'Not Available',
          specialties: Array.isArray(t.subcategories) ? t.subcategories : [],
          gender: profileMap.get(t.user_id)?.gender || null,
          hasInstantBook: instantBookSet.has(t.id),
          portfolioItems: portfolioMap.get(t.id)?.slice(0, 3) || [],
          totalBookings: bookingCountMap.get(t.id) || 0,
        }));

        // STEP I: Apply client-side filters
        let filtered = merged;

        // Gender filter
        if (filters.gender && filters.gender !== 'any') {
          filtered = filtered.filter((t) => t.gender === filters.gender);
        }

        // Specialty filter - check subcategories
        if (filters.specialties && filters.specialties.length > 0) {
          filtered = filtered.filter((t) => {
            if (!t.specialties || t.specialties.length === 0) return false;
            return filters.specialties!.some((spec) =>
              t.specialties.some((sub: any) =>
                (typeof sub === 'string' ? sub : sub?.id || sub?.name || '')
                  .toLowerCase()
                  .includes(spec.toLowerCase())
              )
            );
          });
        }

        // Check if this is still the most recent request
        if (currentRequestKey === resultKeyRef.current) {
          if (pageNum === 0) {
            setTalents(filtered);
          } else {
            setTalents((prev) => [...prev, ...filtered]);
          }

          const totalCount = count || 0;
          setHasMore(from + pageSize < totalCount);
        }

        pageRef.current = pageNum;
      } catch (err) {
        const msg = extractErrorMessage(err);
        console.error('Talent search error:', msg);
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [filters, pageSize, generateResultKey]
  );

  // Load more talents (infinite scroll)
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchTalents(pageRef.current + 1);
    }
  }, [loading, hasMore, fetchTalents]);

  // Reset and update filters — the useEffect on fetchTalents handles the actual fetch
  const search = useCallback(
    (newFilters: Partial<TalentSearchFilters>) => {
      setFilters(prev => ({ ...prev, ...newFilters }));
      pageRef.current = 0;
    },
    []
  );

  // Initial fetch on mount
  useEffect(() => {
    fetchTalents(0);
  }, [fetchTalents]);

  return {
    talents,
    loading,
    error,
    hasMore,
    filters,
    setFilters,
    search,
    loadMore,
    fetchTalents,
  };
}
