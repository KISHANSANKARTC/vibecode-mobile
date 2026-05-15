import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useTheme } from '@/lib/theme/ThemeContext';
import { useReviews, type Review } from '@/hooks/useReviews';
import { ListItemSkeleton } from '@/components/SkeletonLoader';

type SortType = 'latest' | 'highest' | 'lowest';

function getInitials(name: string): string {
  if (!name || name === 'Anonymous') return 'A';
  const parts = name.split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

interface RatingDistribution {
  rating: number;
  count: number;
}

function getRatingDistribution(reviews: Review[]): RatingDistribution[] {
  const distribution: { [key: number]: number } = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  reviews.forEach((review) => {
    distribution[review.rating] = (distribution[review.rating] || 0) + 1;
  });

  return [
    { rating: 5, count: distribution[5] },
    { rating: 4, count: distribution[4] },
    { rating: 3, count: distribution[3] },
    { rating: 2, count: distribution[2] },
    { rating: 1, count: distribution[1] },
  ];
}

function ReviewCard({ review, isDark }: { review: Review; isDark: boolean }) {
  const colors = {
    bg: isDark ? '#1A1A1A' : '#ffffff',
    border: isDark ? '#374151' : '#e5e7eb',
    text: isDark ? '#ffffff' : '#111827',
    textSecondary: isDark ? '#9ca3af' : '#6b7280',
  };
  return (
    <View style={[styles.reviewCard, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        <View style={[styles.avatar, { backgroundColor: isDark ? '#2d2d2d' : '#f3f4f6' }]}>
          <Text style={[styles.avatarText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>{getInitials(review.reviewer_name_masked)}</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.cardContent}>
        {/* Header: Name and Rating */}
        <View style={styles.cardHeader}>
          <Text style={[styles.reviewerName, { color: colors.text }]}>{review.reviewer_name_masked}</Text>
          <Text style={[styles.ratingText, { color: colors.textSecondary }]}>{review.rating}/5</Text>
        </View>

        {/* Date */}
        <Text style={[styles.dateText, { color: colors.textSecondary }]}>{formatDate(review.created_at)}</Text>

        {/* Comment */}
        {review.comment ? <Text style={[styles.commentText, { color: colors.text }]}>{review.comment}</Text> : null}
      </View>
    </View>
  );
}

function SortPickerModal({
  visible,
  onClose,
  onSelect,
  currentSort,
  isDark,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (sort: SortType) => void;
  currentSort: SortType;
  isDark: boolean;
}) {
  const colors = {
    bg: isDark ? '#0A0A0A' : '#ffffff',
    bgSecondary: isDark ? '#1A1A1A' : '#f9fafb',
    text: isDark ? '#ffffff' : '#111827',
    textSecondary: isDark ? '#9ca3af' : '#6b7280',
    border: isDark ? '#374151' : '#e5e7eb',
  };

  const sortOptions: Array<{ value: SortType; label: string }> = [
    { value: 'latest', label: 'Latest' },
    { value: 'highest', label: 'Highest Rating' },
    { value: 'lowest', label: 'Lowest Rating' },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={[styles.sortPickerContainer, { backgroundColor: colors.bg }]}>
          <Text style={[styles.sortPickerTitle, { color: colors.text }]}>Sort By</Text>
          {sortOptions.map((option) => (
            <Pressable
              key={option.value}
              style={[
                styles.sortOption,
                currentSort === option.value && [styles.sortOptionActive, { backgroundColor: isDark ? '#1A1A1A' : 'rgba(124, 58, 237, 0.08)' }],
              ]}
              onPress={() => {
                onSelect(option.value);
                onClose();
              }}
            >
              <Text
                style={[
                  styles.sortOptionText,
                  { color: currentSort === option.value ? colors.text : colors.textSecondary },
                  currentSort === option.value && styles.sortOptionTextActive,
                ]}
              >
                {option.label}
              </Text>
              {currentSort === option.value && (
                <Ionicons name="checkmark" size={20} color="#fa5610" />
              )}
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

export default function MyReviewsScreen() {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { reviews, isLoading, averageRating, totalCount, refetch } = useReviews();
  const [sortBy, setSortBy] = useState<SortType>('latest');
  const [showAll, setShowAll] = useState(false);
  const [showSortPicker, setShowSortPicker] = useState(false);

  // Refetch reviews when screen is focused
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const sortedReviews = useMemo(() => {
    const sorted = [...reviews];

    if (sortBy === 'latest') {
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === 'highest') {
      sorted.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'lowest') {
      sorted.sort((a, b) => a.rating - b.rating);
    }

    return sorted;
  }, [reviews, sortBy]);

  const displayedReviews = useMemo(() => {
    return showAll ? sortedReviews : sortedReviews.slice(0, 5);
  }, [sortedReviews, showAll]);

  const ratingDistribution = useMemo(() => {
    return getRatingDistribution(reviews);
  }, [reviews]);

  const sortLabel = sortBy === 'latest' ? 'Latest' : sortBy === 'highest' ? 'Highest' : 'Lowest';

  const colors = {
    bg: isDark ? '#0A0A0A' : '#ffffff',
    bgSecondary: isDark ? '#1A1A1A' : '#f9fafb',
    text: isDark ? '#ffffff' : '#111827',
    textSecondary: isDark ? '#9ca3af' : '#6b7280',
    border: isDark ? '#374151' : '#e5e7eb',
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      {/* STICKY HEADER */}
      <View style={[styles.stickyHeader, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <Pressable
            style={[styles.backButton, { backgroundColor: colors.bgSecondary }]}
            onPress={() => router.replace('/(talent)/profile')}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </Pressable>

          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>My Reviews</Text>
            {totalCount > 0 && !isLoading ? (
              <View style={styles.headerSubtitle}>
                <Ionicons name="star" size={14} color="#fa5610" />
                <Text style={[styles.subtitleText, { color: colors.textSecondary }]}>
                  {averageRating.toFixed(1)} · {totalCount} review{totalCount !== 1 ? 's' : ''}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {/* LOADING STATE */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ListItemSkeleton count={5} />
        </View>
      ) : null}

      {/* EMPTY STATE */}
      {!isLoading && totalCount === 0 && (
        <View style={styles.emptyStateContainer}>
          <View style={[styles.emptyIconBox, { backgroundColor: colors.bgSecondary }]}>
            <Ionicons name="chatbox-outline" size={32} color={colors.textSecondary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No reviews yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Complete bookings to receive reviews from clients</Text>
        </View>
      )}

      {/* CONTENT - when has reviews */}
      {!isLoading && totalCount > 0 && (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* SUMMARY CARD */}
          <View style={[styles.summaryCard, { backgroundColor: colors.bg, borderColor: colors.border }]}>
            {/* Left section */}
            <View style={styles.summaryLeft}>
              <Text style={[styles.averageRating, { color: colors.text }]}>{averageRating.toFixed(1)}</Text>
              <Text style={[styles.reviewCountText, { color: colors.textSecondary }]}>
                {reviews.length} review{reviews.length !== 1 ? 's' : ''}
              </Text>
            </View>

            {/* Right section - Rating distribution */}
            <View style={styles.summaryRight}>
              {ratingDistribution.map((item) => (
                <View key={item.rating} style={styles.ratingDistributionRow}>
                  <Text style={[styles.ratingLabel, { color: colors.textSecondary }]}>{item.rating}</Text>
                  <View style={[styles.progressBarTrack, { backgroundColor: isDark ? '#2d2d2d' : '#f3f4f6' }]}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${
                            totalCount > 0 ? (item.count / totalCount) * 100 : 0
                          }%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.ratingCount, { color: colors.textSecondary, width: 32, textAlign: 'right' }]}>
                    {item.count}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* SORT CONTROLS */}
          <View style={styles.sortControlsRow}>
            <Text style={[styles.showingText, { color: colors.textSecondary }]}>
              Showing {displayedReviews.length} of {reviews.length}
            </Text>
            <Pressable
              style={[styles.sortButton, { borderColor: colors.border, backgroundColor: colors.bgSecondary }]}
              onPress={() => setShowSortPicker(true)}
            >
              <Text style={[styles.sortButtonText, { color: colors.text }]}>Sort: {sortLabel}</Text>
              <Ionicons name="chevron-down" size={14} color={colors.text} />
            </Pressable>
          </View>

          {/* REVIEWS LIST */}
          {displayedReviews.map((review) => (
            <ReviewCard key={review.id} review={review} isDark={isDark} />
          ))}

          {/* SHOW MORE BUTTON */}
          {reviews.length > 5 && !showAll && (
            <Pressable
              style={styles.showMoreButton}
              onPress={() => setShowAll(true)}
            >
              <Text style={styles.showMoreText}>
                Show all {reviews.length} reviews
              </Text>
            </Pressable>
          )}

          {/* Bottom spacer */}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* SORT PICKER MODAL */}
      <SortPickerModal
        visible={showSortPicker}
        onClose={() => setShowSortPicker(false)}
        onSelect={setSortBy}
        currentSort={sortBy}
        isDark={isDark}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  stickyHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerContent: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },

  headerSubtitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },

  subtitleText: {
    fontSize: 14,
    color: '#6b7280',
  },

  loadingContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'flex-start',
  },

  skeleton: {
    height: 128,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },

  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 8,
  },

  emptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    padding: 16,
  },

  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },

  summaryLeft: {
    alignItems: 'center',
    marginRight: 20,
  },

  averageRating: {
    fontSize: 48,
    fontWeight: '700',
    color: '#111827',
  },

  reviewCountText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },

  summaryRight: {
    flex: 1,
    gap: 8,
  },

  ratingDistributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  ratingLabel: {
    fontSize: 14,
    color: '#6b7280',
    width: 28,
  },

  progressBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f3f4f6',
    overflow: 'hidden',
  },

  progressBarFill: {
    height: '100%',
    backgroundColor: '#fa5610',
  },

  ratingCount: {
    fontSize: 14,
    color: '#6b7280',
  },

  sortControlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },

  showingText: {
    fontSize: 14,
    color: '#6b7280',
  },

  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  sortButtonText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },

  reviewCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },

  avatarContainer: {
    justifyContent: 'center',
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },

  cardContent: {
    flex: 1,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },

  reviewerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },

  ratingText: {
    fontSize: 12,
    color: '#6b7280',
  },

  dateText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },

  commentText: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 22,
  },

  showMoreButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 16,
  },

  showMoreText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },

  sortPickerContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 32,
  },

  sortPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },

  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
  },

  sortOptionActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
  },

  sortOptionText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },

  sortOptionTextActive: {
    color: '#111827',
    fontWeight: '600',
  },
});
