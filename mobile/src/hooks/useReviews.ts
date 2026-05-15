import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/state/auth-store';

export interface Review {
  id: string;
  reviewer_user_id: string;
  reviewee_user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_name: string;
  reviewer_name_masked: string;
}

export function useReviews() {
  const user = useAuthStore((s) => s.user);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [averageRating, setAverageRating] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const maskLastName = (fullName: string | null | undefined): string => {
    if (!fullName) return 'Anonymous';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    // Keep first name, mask last name(s)
    const firstName = parts[0];
    const lastName = parts[parts.length - 1];
    return `${firstName} ${lastName.replace(/./g, '*')}`;
  };

  const fetchReviews = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch reviews where this user is the reviewee
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('id, reviewer_user_id, reviewee_user_id, rating, comment, created_at')
        .eq('reviewee_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (reviewsError) {
        throw reviewsError;
      }

      if (!reviewsData || reviewsData.length === 0) {
        setReviews([]);
        setAverageRating(0);
        setTotalCount(0);
        setIsLoading(false);
        return;
      }

      // Get all reviewer IDs
      const reviewerIds = [...new Set(reviewsData.map((r) => r.reviewer_user_id))];

      // Fetch reviewer profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', reviewerIds);

      if (profilesError) {
        console.error('Error fetching reviewer profiles:', profilesError);
      }

      // Create a map of reviewer ID to full name
      const reviewerMap = new Map<string, string>();
      if (profilesData) {
        profilesData.forEach((profile) => {
          reviewerMap.set(profile.id, profile.full_name || 'Anonymous');
        });
      }

      // Build enriched reviews array
      const enrichedReviews: Review[] = reviewsData.map((review) => {
        const reviewerName = reviewerMap.get(review.reviewer_user_id) || 'Anonymous';
        return {
          id: review.id,
          reviewer_user_id: review.reviewer_user_id,
          reviewee_user_id: review.reviewee_user_id,
          rating: review.rating,
          comment: review.comment,
          created_at: review.created_at,
          reviewer_name: reviewerName,
          reviewer_name_masked: maskLastName(reviewerName),
        };
      });

      setReviews(enrichedReviews);
      setTotalCount(enrichedReviews.length);

      // Calculate average rating (keep as decimal, not rounded)
      const sum = enrichedReviews.reduce((acc, review) => acc + review.rating, 0);
      const avg = enrichedReviews.length > 0 ? sum / enrichedReviews.length : 0;
      setAverageRating(avg);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch reviews';
      console.error('useReviews error:', message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  return {
    reviews,
    isLoading,
    error,
    averageRating,
    totalCount,
    refetch: fetchReviews,
  };
}
