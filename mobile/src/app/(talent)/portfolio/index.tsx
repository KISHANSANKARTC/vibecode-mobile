import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Clipboard,
  Dimensions,
  Platform,
  RefreshControl,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from '@/lib/router-helper';
import { useTheme } from '@/lib/theme/ThemeContext';
import { usePortfolio, type MediaItem, type CaseStudyProject, type SocialLink } from '@/hooks/usePortfolio';
import { pickAndUploadGallery } from '@/helpers/uploadGallery';
import { useAuthStore } from '@/lib/state/auth-store';
import { supabase } from '@/lib/supabase';
import { SkeletonLoader, PortfolioGridSkeleton } from '@/components/SkeletonLoader';
import { PortfolioContextMenu } from '@/components/PortfolioContextMenu';
import { extractErrorMessage } from '@/lib/errorUtils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_COLS = 2;
const GRID_GAP = 12; // Gap between columns
const HORIZONTAL_PADDING = 16; // 16px padding on each side
// Calculate: available width = screen - 2*padding, then subtract gaps, divide by columns
const CELL_SIZE = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;

// Social icon map
function getSocialIcon(type: string) {
  const map: Record<string, string> = {
    instagram: 'logo-instagram',
    website: 'globe-outline',
    youtube: 'logo-youtube',
    linkedin: 'logo-linkedin',
    twitter: 'logo-twitter',
    behance: 'globe-outline',
    dribbble: 'globe-outline',
    tiktok: 'musical-notes-outline',
    other: 'link-outline',
  };
  return map[type] || 'link-outline';
}

const LINK_TYPES = ['website', 'instagram', 'behance', 'linkedin', 'tiktok', 'youtube', 'dribbble', 'twitter'];
const LINK_LABELS: Record<string, string> = {
  website: 'Website',
  instagram: 'Instagram',
  behance: 'Behance',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  dribbble: 'Dribbble',
  twitter: 'Twitter',
};

// ── Media Grid Cell ──
function MediaCell({ item, onPress, onEdit, onDelete }: {
  item: MediaItem;
  onPress: (item: MediaItem) => void;
  onEdit: (item: MediaItem) => void;
  onDelete: (item: MediaItem) => void;
}) {
  const isVideo = item.media_type === 'video';


  return (
    <TouchableOpacity
      onPress={() => onPress(item)}
      style={styles.gridCell}
      activeOpacity={0.9}
    >
      <Image
        source={{ uri: item.media_url }}
        style={styles.gridImage}
        resizeMode="cover"
      />
      {isVideo ? (
        <View style={styles.videoOverlay}>
          <View style={styles.playBtn}>
            <Ionicons name="play" size={16} color="#111827" />
          </View>
        </View>
      ) : null}
      {/* Edit + Delete overlay */}
      <View style={styles.cellOverlay}>
        <TouchableOpacity
          onPress={() => onEdit(item)}
          style={styles.cellOverlayBtn}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <Ionicons name="pencil" size={11} color="#ffffff" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onDelete(item)}
          style={[styles.cellOverlayBtn, styles.cellOverlayBtnRed]}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <Ionicons name="trash" size={11} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ── Case Study Card ──
function CaseStudyCard({ project, onEdit, onDelete, onToggleFeatured, onCopyLink, isDark = false }: {
  project: CaseStudyProject;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleFeatured: (id: string) => void;
  onCopyLink: (id: string) => void;
  isDark?: boolean;
}) {
  const [menuVisible, setMenuVisible] = useState(false);

  const menuOptions = [
    {
      label: 'Edit',
      icon: 'pencil',
      onPress: () => onEdit(project.id),
    },
    {
      label: project.is_featured ? 'Unfeature' : 'Set as Featured',
      icon: 'star',
      onPress: () => onToggleFeatured(project.id),
    },
    {
      label: 'Copy Share Link',
      icon: 'share-social',
      onPress: () => onCopyLink(project.id),
    },
    {
      label: 'Delete',
      icon: 'trash',
      isDangerous: true,
      onPress: () => {
        Alert.alert('Delete Project?', 'This action cannot be undone.', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              onDelete(project.id);
              setMenuVisible(false);
            }
          },
        ]);
      },
    },
  ];

  return (
    <>
      <View style={[styles.caseStudyCard, { borderColor: isDark ? '#374151' : '#e5e7eb', backgroundColor: isDark ? '#0A0A0A' : '#ffffff' }]}>
        {/* Cover image */}
        <TouchableOpacity
          onPress={() => onEdit(project.id)}
          style={styles.caseStudyCover}
          activeOpacity={0.9}
        >
          {project.thumbnail_url ? (
            <Image
              source={{ uri: project.thumbnail_url }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }]}>
              <Ionicons name="document-text-outline" size={32} color="#9ca3af" />
            </View>
          )}
          {project.is_featured ? (
            <View style={styles.featuredBadge}>
              <Ionicons name="star" size={11} color="#ffffff" />
              <Text style={styles.featuredBadgeText}>Featured</Text>
            </View>
          ) : null}
          {/* Edit overlay */}
          <View style={styles.caseStudyEditOverlay}>
            <View style={styles.caseStudyEditChip}>
              <Ionicons name="pencil" size={13} color="#111827" />
              <Text style={styles.caseStudyEditText}>Edit</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Footer */}
        <View style={[styles.caseStudyFooter, { backgroundColor: isDark ? '#1A1A1A' : '#ffffff' }]}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.caseStudyTitle, { color: isDark ? '#ffffff' : '#111827' }]} numberOfLines={1}>{project.title}</Text>
            {project.category ? (
              <Text style={[styles.caseStudyCategory, { color: isDark ? '#d1d5db' : '#9ca3af' }]} numberOfLines={1}>{project.category}</Text>
            ) : null}
            {project.tags && project.tags.length > 0 ? (
              <View style={styles.tagsRow}>
                {project.tags.slice(0, 3).map((tag) => (
                  <View key={tag} style={[styles.tagChip, { backgroundColor: isDark ? '#2d2d2d' : '#ffffff', borderColor: isDark ? '#374151' : '#e5e7eb' }]}>
                    <Text style={[styles.tagChipText, { color: isDark ? '#d1d5db' : '#6b7280' }]}>{tag}</Text>
                  </View>
                ))}
                {project.tags.length > 3 ? (
                  <View style={[styles.tagChip, { backgroundColor: isDark ? '#2d2d2d' : '#ffffff', borderColor: isDark ? '#374151' : '#e5e7eb' }]}>
                    <Text style={[styles.tagChipText, { color: isDark ? '#d1d5db' : '#6b7280' }]}>+{project.tags.length - 3}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
          {/* 3-dot menu */}
          <TouchableOpacity
            onPress={() => setMenuVisible(true)}
            style={styles.moreBtn}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <Ionicons name="ellipsis-vertical" size={18} color={isDark ? '#6b7280' : '#9ca3af'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Context Menu */}
      <PortfolioContextMenu
        visible={menuVisible}
        title={project.title}
        options={menuOptions}
        onClose={() => setMenuVisible(false)}
      />
    </>
  );
}

// ── Edit Caption Bottom Sheet ──
function EditCaptionModal({ item, visible, onClose, onSave }: {
  item: MediaItem | null;
  visible: boolean;
  onClose: () => void;
  onSave: (itemId: string, caption: string) => void;
}) {
  const [caption, setCaption] = useState('');
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    if (item) setCaption(item.title || '');
  }, [item]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Edit Media</Text>
          {item ? (
            <Image
              source={{ uri: item.media_url }}
              style={styles.editPreviewImage}
              resizeMode="cover"
            />
          ) : null}
          <Text style={styles.inputLabel}>Caption</Text>
          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder="Add a caption..."
            placeholderTextColor="#9ca3af"
            style={styles.captionInput}
            maxLength={200}
            multiline
          />
          <View style={styles.sheetButtonRow}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn} activeOpacity={0.8}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                if (item) {
                  onSave(item.id, caption.trim());
                }
                onClose();
              }}
              style={styles.saveBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Social Links Bottom Sheet ──
function SocialLinksModal({ visible, onClose, initialLinks, onSave }: {
  visible: boolean;
  onClose: () => void;
  initialLinks: SocialLink[];
  onSave: (links: SocialLink[]) => Promise<boolean>;
}) {
  const [editingLinks, setEditingLinks] = useState<SocialLink[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    if (visible) setEditingLinks((initialLinks || []).map(l => ({ ...l })));
  }, [visible, initialLinks]);

  const addLink = () => {
    const usedTypes = editingLinks.map(l => l.platform);
    const available = LINK_TYPES.find(t => !usedTypes.includes(t)) || 'website';
    setEditingLinks(prev => [...prev, { platform: available, url: '', id: `new-${Date.now()}` }]);
  };

  const removeLink = (index: number) => setEditingLinks(prev => prev.filter((_, i) => i !== index));

  const updateLink = (index: number, field: string, value: string) => {
    setEditingLinks(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const cycleType = (index: number) => {
    const currentIdx = LINK_TYPES.indexOf(editingLinks[index].platform);
    const usedTypes = editingLinks.map(l => l.platform).filter((_, i) => i !== index);
    let nextIdx = (currentIdx + 1) % LINK_TYPES.length;
    while (usedTypes.includes(LINK_TYPES[nextIdx]) && nextIdx !== currentIdx) {
      nextIdx = (nextIdx + 1) % LINK_TYPES.length;
    }
    updateLink(index, 'platform', LINK_TYPES[nextIdx]);
  };

  const handleSave = async () => {
    const validLinks = editingLinks.filter(l => l.url.trim() !== '');
    setIsSaving(true);
    const ok = await onSave(validLinks);
    setIsSaving(false);
    if (ok) {
      onClose();
      Alert.alert('✓ Saved', 'Your links have been updated.');
    } else {
      Alert.alert('Error', 'Failed to save links. Please try again.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.linksHeader}>
            <Ionicons name="globe-outline" size={20} color="#111827" />
            <Text style={styles.sheetTitle}>Manage Links</Text>
            <TouchableOpacity onPress={onClose} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={20} color="#111827" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
            {editingLinks.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Ionicons name="globe-outline" size={48} color="#e5e7eb" style={{ marginBottom: 12 }} />
                <Text style={{ fontSize: 13, color: '#9ca3af' }}>No links added yet</Text>
                <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Add your website, social media, and portfolio links</Text>
              </View>
            ) : (
              editingLinks.map((link, index) => (
                <View key={`${link.platform}-${link.url}`} style={styles.linkRow}>
                  <TouchableOpacity onPress={() => cycleType(index)} style={styles.linkTypeChip}>
                    <Ionicons name={getSocialIcon(link.platform) as any} size={14} color="#fa5610" />
                    <Text style={styles.linkTypeText}>{LINK_LABELS[link.platform] || link.platform}</Text>
                  </TouchableOpacity>
                  <TextInput
                    value={link.url}
                    onChangeText={(val) => updateLink(index, 'url', val)}
                    placeholder="https://..."
                    placeholderTextColor="#9ca3af"
                    style={styles.linkUrlInput}
                    keyboardType="url"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity onPress={() => removeLink(index)} style={styles.linkRemoveBtn}>
                    <Ionicons name="trash-outline" size={17} color="#9ca3af" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>

          {editingLinks.length < LINK_TYPES.length && (
            <TouchableOpacity onPress={addLink} style={styles.addLinkBtn}>
              <Ionicons name="add" size={18} color="#fa5610" />
              <Text style={styles.addLinkBtnText}>Add Link</Text>
            </TouchableOpacity>
          )}

          <View style={styles.sheetButtonRow}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn} activeOpacity={0.8}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              style={[styles.saveBtn, isSaving && { opacity: 0.7 }]}
              disabled={isSaving}
              activeOpacity={0.8}
            >
              {isSaving
                ? <ActivityIndicator size="small" color="#ffffff" />
                : <Text style={styles.saveBtnText}>Save Links</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Lightbox ──
function Lightbox({ items, startIndex, visible, onClose, insets }: {
  items: MediaItem[];
  startIndex: number;
  visible: boolean;
  onClose: () => void;
  insets: any;
}) {
  const [currentIdx, setCurrentIdx] = React.useState(startIndex || 0);
  React.useEffect(() => {
    setCurrentIdx(startIndex || 0);
  }, [startIndex]);

  if (!visible || !items || items.length === 0) return null;
  const item = items[currentIdx];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.lightboxBg}>
        <TouchableOpacity
          onPress={onClose}
          style={[styles.lightboxClose, { top: insets.top + 12 }]}
        >
          <Ionicons name="close" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={[styles.lightboxCounter, { top: insets.top + 12 }]}>
          <Text style={styles.lightboxCounterText}>{currentIdx + 1} / {items.length}</Text>
        </View>
        <Image
          source={{ uri: item.media_url }}
          style={styles.lightboxImage}
          resizeMode="contain"
        />
        {item.title ? (
          <View style={[styles.lightboxCaption, { bottom: insets.bottom + 24 }]}>
            <Text style={styles.lightboxCaptionText}>{item.title}</Text>
          </View>
        ) : null}
        {currentIdx > 0 && (
          <TouchableOpacity
            onPress={() => setCurrentIdx(i => i - 1)}
            style={[styles.lightboxArrow, { left: 16 }]}
          >
            <Ionicons name="chevron-back" size={28} color="#ffffff" />
          </TouchableOpacity>
        )}
        {currentIdx < items.length - 1 && (
          <TouchableOpacity
            onPress={() => setCurrentIdx(i => i + 1)}
            style={[styles.lightboxArrow, { right: 16 }]}
          >
            <Ionicons name="chevron-forward" size={28} color="#ffffff" />
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  );
}

// No longer needed
function DiagnosticInfo() {
  return null;
}

// ===================== MAIN SCREEN =====================
// Portfolio management screen with tabs, upload, and media grid
export default function TalentPortfolioScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const user = useAuthStore((state) => state.user);
  const {
    galleryMedia,
    caseStudyProjects,
    socialLinks,
    isLoading,
    deleteMediaItem,
    updateMediaCaption,
    deleteCaseStudy,
    toggleFeatured,
    saveSocialLinks,
    refetch,
  } = usePortfolio();

  const [activeTab, setActiveTab] = useState('portfolio');
  const [refreshing, setRefreshing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [showLinksModal, setShowLinksModal] = useState(false);
  const [editingMedia, setEditingMedia] = useState<MediaItem | null>(null);
  const [lightboxItem, setLightboxItem] = useState<MediaItem | null>(null);


  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const hasProjects = galleryMedia.length > 0 || caseStudyProjects.length > 0;
  const totalProjectCount = caseStudyProjects.length;

  const [talentId, setTalentId] = useState<string | null>(null);

  // Fetch talent ID from user profile
  React.useEffect(() => {
    const fetchTalentId = async () => {
      if (!user?.id) return;
      try {
        const { data } = await supabase
          .from('talent_profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        if (data?.id) {
          setTalentId(data.id);
        }
      } catch (err) {
        console.error('[Portfolio] Error fetching talent ID:', err);
      }
    };
    fetchTalentId();
  }, [user?.id]);


  // Gallery upload
  const handleGalleryUpload = async () => {
    if (!talentId) {
      Alert.alert('Error', 'Could not load your profile. Please try again.');
      return;
    }
    setIsUploading(true);
    try {
      const result = await pickAndUploadGallery(talentId);
      if (result) {
        await refetch();
        Alert.alert('✓ Uploaded', `${result.count} item${result.count !== 1 ? 's' : ''} added to your portfolio.`);
      } else {
        }
    } catch (err) {
      const errorMsg = extractErrorMessage(err);
      Alert.alert('Upload Failed', errorMsg || 'Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress({ current: 0, total: 0 });
    }
  };

  // Delete media with confirmation
  const handleDeleteMedia = (item: MediaItem) => {
    Alert.alert(
      'Delete Media?',
      `This will permanently delete this ${item.media_type === 'video' ? 'video' : 'image'} from your portfolio. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            const ok = await deleteMediaItem(item.id);
            if (!ok) Alert.alert('Error', 'Failed to delete. Please try again.');
          },
        },
      ]
    );
  };

  // Copy share link
  const handleCopyShareLink = async (projectId: string) => {
    const link = `https://engageapp.co/p/${projectId}`;
    try {
      Clipboard.setString(link);
      Alert.alert('✓ Copied', 'Share link copied to clipboard!');
    } catch {
      Alert.alert('Share Link', link);
    }
  };

  const lightboxIndex = galleryMedia.findIndex(m => m.id === lightboxItem?.id);

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: isDark ? '#0A0A0A' : '#ffffff' }]}>
        <View style={[styles.header, { backgroundColor: isDark ? '#0A0A0A' : '#ffffff', borderBottomColor: isDark ? '#374151' : '#e5e7eb' }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: isDark ? '#1A1A1A' : '#f3f4f6' }]}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={22} color={isDark ? '#ffffff' : '#111827'} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.headerTitle, { color: isDark ? '#ffffff' : '#111827' }]}>Portfolio</Text>
            <SkeletonLoader width="80%" height={14} borderRadius={4} isDark={isDark} />
          </View>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.scrollContent}>
            {/* Tab skeleton */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
              <SkeletonLoader width="25%" height={36} borderRadius={8} isDark={isDark} />
              <SkeletonLoader width="25%" height={36} borderRadius={8} isDark={isDark} />
            </View>
            {/* Portfolio grid skeleton */}
            <PortfolioGridSkeleton count={6} isDark={isDark} />
          </View>
        </ScrollView>
      </View>
    );
  }

  const colors = {
    bg: isDark ? '#0A0A0A' : '#ffffff',
    bgSecondary: isDark ? '#1A1A1A' : '#f9fafb',
    bgTertiary: isDark ? '#2d2d2d' : '#f3f4f6',
    text: isDark ? '#ffffff' : '#111827',
    textSecondary: isDark ? '#9ca3af' : '#6b7280',
    border: isDark ? '#374151' : '#e5e7eb',
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      <DiagnosticInfo />
      {/* ── STICKY HEADER ── */}
      <View style={[styles.header, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: colors.bgTertiary }]}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Portfolio</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              {totalProjectCount} project{totalProjectCount !== 1 ? 's' : ''} • {socialLinks.length} link{socialLinks.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { minHeight: '100%' }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fa5610" colors={['#fa5610']} />
        }
      >
        {/* ── 2-COLUMN UPLOAD TYPE CARDS ── */}
        <View style={styles.uploadCardsRow}>
          {/* Case Study */}
          <TouchableOpacity
            onPress={() => router.push('/(talent)/portfolio/new-case-study')}
            style={[styles.uploadCard, { backgroundColor: colors.bg, borderColor: colors.border }]}
            activeOpacity={0.85}
          >
            <View style={[styles.uploadIconCircle, { backgroundColor: isDark ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.1)' }]}>
              <Ionicons name="document-text-outline" size={24} color="#fa5610" />
            </View>
            <Text style={[styles.uploadCardTitle, { color: colors.text }]}>Case Study</Text>
            <Text style={[styles.uploadCardSubtitle, { color: colors.textSecondary }]}>Tell the story of your project</Text>
          </TouchableOpacity>

          {/* Gallery */}
          <TouchableOpacity
            onPress={handleGalleryUpload}
            style={[styles.uploadCard, { backgroundColor: colors.bg, borderColor: colors.border }]}
            activeOpacity={0.85}
            disabled={isUploading}
          >
            <View style={[styles.uploadIconCircle, { backgroundColor: isDark ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.1)' }]}>
              {isUploading
                ? <ActivityIndicator size="small" color="#fa5610" />
                : <Ionicons name="images-outline" size={24} color="#fa5610" />
              }
            </View>
            <Text style={[styles.uploadCardTitle, { color: colors.text }]}>Gallery</Text>
            <Text style={[styles.uploadCardSubtitle, { color: colors.textSecondary }]}>Just add images and videos</Text>
          </TouchableOpacity>
        </View>

        {/* Upload progress */}
        {isUploading && uploadProgress.total > 0 ? (
          <View style={styles.uploadProgressRow}>
            <ActivityIndicator size="small" color="#fa5610" />
            <Text style={styles.uploadProgressText}>
              Uploading {uploadProgress.current + 1} of {uploadProgress.total}...
            </Text>
          </View>
        ) : null}

        {/* ── SOCIAL LINKS ROW (only when links exist) ── */}
        {socialLinks.length > 0 && (
          <View style={styles.socialLinksSection}>
            <View style={styles.socialLinksHeaderRow}>
              <Text style={[styles.socialLinksTitle, { color: colors.text }]}>Your Links</Text>
              <TouchableOpacity onPress={() => setShowLinksModal(true)}>
                <Text style={styles.socialLinksEdit}>Edit</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {socialLinks.map((link) => (
                <View key={`${link.platform}-${link.url}`} style={[styles.socialChip, { backgroundColor: colors.bgTertiary }]}>
                  <Ionicons name={getSocialIcon(link.platform) as any} size={15} color="#6b7280" />
                  <Text style={[styles.socialChipText, { color: colors.text }]}>{LINK_LABELS[link.platform] || link.platform}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── CONTENT: Tabs or Empty State ── */}
        {!hasProjects ? (
          /* Full empty state — no projects at all */
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconBox, { backgroundColor: colors.bgTertiary }]}>
              <Ionicons name="folder-open-outline" size={28} color={colors.textSecondary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No projects yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Start by uploading images or creating your first project
            </Text>
          </View>
        ) : (
          <>
            {/* ── TABS ── */}
            <View style={styles.tabsWrapper}>
              <View style={[styles.tabsRow, { backgroundColor: colors.bgTertiary }]}>
                <TouchableOpacity
                  onPress={() => setActiveTab('portfolio')}
                  style={[styles.tabBtn, activeTab === 'portfolio' && [styles.tabBtnActive, { backgroundColor: colors.bg }]]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabText, activeTab === 'portfolio' && [styles.tabTextActive, { color: colors.text }]]}>
                    Gallery {galleryMedia.length > 0 ? `(${galleryMedia.length})` : ''}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setActiveTab('case-study')}
                  style={[styles.tabBtn, activeTab === 'case-study' && [styles.tabBtnActive, { backgroundColor: colors.bg }]]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabText, activeTab === 'case-study' && [styles.tabTextActive, { color: colors.text }]]}>
                    Case Study {caseStudyProjects.length > 0 ? `(${caseStudyProjects.length})` : ''}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ── PORTFOLIO TAB ── */}
            {activeTab === 'portfolio' && (
              <>
                {galleryMedia.length === 0 ? (
                  /* Portfolio tab empty state */
                  <View style={styles.emptyState}>
                    <View style={[styles.emptyIconBox, { backgroundColor: colors.bgTertiary }]}>
                      <Ionicons name="images-outline" size={24} color={colors.textSecondary} />
                    </View>
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>No gallery uploads yet</Text>
                    <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Add images and videos to showcase your work</Text>
                    <TouchableOpacity
                      onPress={handleGalleryUpload}
                      style={[styles.emptyButton, { backgroundColor: colors.bg, borderColor: colors.border }]}
                      activeOpacity={0.8}
                      disabled={isUploading}
                    >
                      <Ionicons name="images-outline" size={16} color="#fa5610" />
                      <Text style={styles.emptyButtonText}>Upload Gallery</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  /* 2-column grid of media items */
                  <View style={styles.mediaGrid}>
                    {galleryMedia.map((item) => (
                      <MediaCell
                        key={item.id}
                        item={item}
                        onPress={(it) => setLightboxItem(it)}
                        onEdit={(it) => setEditingMedia(it)}
                        onDelete={handleDeleteMedia}
                      />
                    ))}
                  </View>
                )}
              </>
            )}

            {/* ── CASE STUDY TAB ── */}
            {activeTab === 'case-study' && (
              <>
                {caseStudyProjects.length === 0 ? (
                  <View style={styles.emptyState}>
                    <View style={[styles.emptyIconBox, { backgroundColor: colors.bgTertiary }]}>
                      <Ionicons name="document-text-outline" size={24} color={colors.textSecondary} />
                    </View>
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>No case studies yet</Text>
                    <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                      Tell the story of your projects with detailed case studies
                    </Text>
                    <TouchableOpacity
                      onPress={() => router.push('/(talent)/portfolio/new-case-study')}
                      style={[styles.emptyButton, { backgroundColor: colors.bg, borderColor: colors.border }]}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="document-text-outline" size={16} color="#fa5610" />
                      <Text style={styles.emptyButtonText}>Create Case Study</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.caseStudyList}>
                    {caseStudyProjects.map((project) => (
                      <CaseStudyCard
                        key={project.id}
                        project={project}
                        isDark={isDark}
                        onEdit={(id) => router.push({
                          pathname: '/(talent)/portfolio/case-study-editor/[projectId]' as any,
                          params: { projectId: id },
                        })}
                        onDelete={deleteCaseStudy}
                        onToggleFeatured={(id) => toggleFeatured(id, caseStudyProjects.find(p => p.id === id)?.is_featured || false)}
                        onCopyLink={handleCopyShareLink}
                      />
                    ))}
                  </View>
                )}
              </>
            )}
          </>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* ── MODALS ── */}
      <EditCaptionModal
        item={editingMedia}
        visible={!!editingMedia}
        onClose={() => setEditingMedia(null)}
        onSave={updateMediaCaption}
      />

      <SocialLinksModal
        visible={showLinksModal}
        onClose={() => setShowLinksModal(false)}
        initialLinks={socialLinks}
        onSave={saveSocialLinks}
      />

      <Lightbox
        items={galleryMedia}
        startIndex={lightboxIndex >= 0 ? lightboxIndex : 0}
        visible={!!lightboxItem}
        onClose={() => setLightboxItem(null)}
        insets={insets}
      />
    </View>
  );
}

// ===================== STYLES =====================
const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  headerSubtitle: { fontSize: 12, color: '#9ca3af', marginTop: 1 },

  scrollContent: { padding: 16, paddingBottom: 80 },

  // Upload cards
  uploadCardsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  uploadCard: {
    flex: 1,
    padding: 20,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    gap: 10,
  },
  uploadIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(124,58,237,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadCardTitle: { fontSize: 14, fontWeight: '600', color: '#111827', textAlign: 'center' },
  uploadCardSubtitle: { fontSize: 11, color: '#9ca3af', textAlign: 'center', lineHeight: 15 },

  uploadProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  uploadProgressText: { fontSize: 13, color: '#fa5610' },

  // Social links
  socialLinksSection: { marginBottom: 24 },
  socialLinksHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  socialLinksTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  socialLinksEdit: { fontSize: 13, color: '#fa5610', fontWeight: '500' },
  socialChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  socialChipText: { fontSize: 13, fontWeight: '500', color: '#111827', textTransform: 'capitalize' },

  // Tabs
  tabsWrapper: { marginBottom: 16 },
  tabsRow: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 16,
  },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  tabBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  tabTextActive: { color: '#111827' },

  // Media grid — 2 columns
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  gridCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  gridImage: { width: '100%', height: '100%' },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 2,
  },
  cellOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    gap: 4,
  },
  cellOverlayBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellOverlayBtnRed: { backgroundColor: 'rgba(239,68,68,0.8)' },

  // Case Study list
  caseStudyList: { gap: 14 },
  caseStudyCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  caseStudyCover: {
    aspectRatio: 4 / 3,
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  featuredBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(124,58,237,0.85)',
  },
  featuredBadgeText: { color: '#ffffff', fontSize: 11, fontWeight: '700' },
  caseStudyEditOverlay: {
    position: 'absolute',
    bottom: 10,
    right: 10,
  },
  caseStudyEditChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  caseStudyEditText: { fontSize: 12, fontWeight: '600', color: '#111827' },
  caseStudyFooter: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    gap: 8,
  },
  caseStudyTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  caseStudyCategory: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 },
  tagChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tagChipText: { fontSize: 11, color: '#6b7280' },
  moreBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
    marginBottom: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  emptyButtonText: { fontSize: 14, fontWeight: '600', color: '#fa5610' },

  // Lightbox
  lightboxBg: { flex: 1, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' },
  lightboxClose: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxCounter: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  lightboxCounterText: { color: '#ffffff', fontSize: 13, fontWeight: '600' },
  lightboxImage: { width: '100%', height: '100%' },
  lightboxCaption: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 12,
  },
  lightboxCaptionText: { color: '#ffffff', fontSize: 13, textAlign: 'center' },
  lightboxArrow: {
    position: 'absolute',
    top: '46%',
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modals / Bottom sheets
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    gap: 14,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e5e7eb',
    alignSelf: 'center',
    marginBottom: 4,
  },
  sheetTitle: { fontSize: 16, fontWeight: '700' },
  inputLabel: { fontSize: 13, fontWeight: '500' },
  editPreviewImage: { width: '100%', height: 140, borderRadius: 14 },
  captionInput: {
    height: 80,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  sheetButtonRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  saveBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#fa5610',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { fontSize: 14, fontWeight: '600', color: '#ffffff' },

  // Social links modal
  linksHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  linkTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(124,58,237,0.08)',
    minWidth: 88,
    flexShrink: 0,
  },
  linkTypeText: { fontSize: 11, fontWeight: '600', color: '#fa5610' },
  linkUrlInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 10,
    fontSize: 13,
    color: '#111827',
  },
  linkRemoveBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  addLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    marginBottom: 4,
  },
  addLinkBtnText: { fontSize: 14, fontWeight: '600', color: '#fa5610' },
});
