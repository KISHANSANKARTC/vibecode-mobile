import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Modal,
  Image,
  ActivityIndicator,
  StyleSheet,
  Linking,
  Clipboard,
  Dimensions,
  Platform,
  Pressable,
  TextInput,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode as atob } from 'base-64';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/state/auth-store';
import { useTheme } from '@/lib/theme/ThemeContext';
import { PortfolioGridSkeleton } from '@/components/SkeletonLoader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_COLS = 2;
const GRID_GAP = 12;
const HORIZONTAL_PADDING = 16;
const CELL_SIZE = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;

// ─────── Types ───────
interface MediaItem {
  id: string;
  media_url: string;
  media_type: 'image' | 'video';
  title?: string;
  talent_id: string;
}

interface PortfolioProject {
  id: string;
  title: string;
  description?: string;
  cover_media_url?: string;
  category?: string;
  tags?: string[];
  is_featured: boolean;
  template: string;
  created_at: string;
}

interface SocialLink {
  platform: string;
  url: string;
  label?: string;
}

interface UploadImage {
  id: string;
  uri: string;
  uploading: boolean;
  uploaded: boolean;
  type: 'image' | 'video';
}

// ─────── Content Type Helper ───────
function getContentType(fileExtension: string, isVideo: boolean = false): string {
  const ext = fileExtension.toLowerCase();
  if (isVideo) return 'video/mp4';
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    default:
      return 'image/jpeg';
  }
}

// ─────── Social Link Icon Mapping ───────
function getSocialIcon(platform: string): string {
  const map: Record<string, string> = {
    instagram: 'logo-instagram',
    website: 'globe-outline',
    youtube: 'logo-youtube',
    linkedin: 'logo-linkedin',
    twitter: 'logo-twitter',
    behance: 'globe-outline',
    dribbble: 'globe-outline',
    tiktok: 'musical-notes-outline',
  };
  return map[platform] || 'link-outline';
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

// ─────── Gallery Media Cell ───────
function MediaCell({
  item,
  onEdit,
  onDelete,
}: {
  item: MediaItem;
  onEdit: (item: MediaItem) => void;
  onDelete: (item: MediaItem) => void;
}) {
  const isVideo = item.media_type === 'video';
  const [showActions, setShowActions] = useState(false);

  return (
    <View style={{ width: CELL_SIZE, height: CELL_SIZE, marginRight: GRID_GAP }}>
      <TouchableOpacity
        style={{
          flex: 1,
          backgroundColor: '#f3f4f6',
          borderRadius: 12,
          overflow: 'hidden',
        }}
        activeOpacity={0.8}
        onLongPress={() => setShowActions(!showActions)}
      >
        <Image
          source={{ uri: item.media_url }}
          style={{ flex: 1 }}
          resizeMode="cover"
        />
        {isVideo ? (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: 'white',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Ionicons name="play" size={20} color="#111827" />
            </View>
          </View>
        ) : null}

        {item.title ? (
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 80,
              paddingHorizontal: 12,
              paddingBottom: 12,
              justifyContent: 'flex-end',
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
            }}
          >
            <Text style={{ color: 'white', fontSize: 12, fontWeight: '500' }} numberOfLines={2}>
              {item.title}
            </Text>
          </View>
        ) : null}

        {showActions ? (
          <View
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              flexDirection: 'row',
              gap: 8,
            }}
          >
            <Pressable
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onPress={() => {
                onEdit(item);
                setShowActions(false);
              }}
            >
              <Ionicons name="pencil" size={16} color="white" />
            </Pressable>
            <Pressable
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: 'rgba(220, 38, 38, 0.8)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onPress={() => {
                onDelete(item);
                setShowActions(false);
              }}
            >
              <Ionicons name="trash" size={16} color="white" />
            </Pressable>
          </View>
        ) : null}
      </TouchableOpacity>
    </View>
  );
}

// ─────── Edit Media Modal ───────
function EditMediaModal({
  visible,
  media,
  onClose,
  onSave,
}: {
  visible: boolean;
  media: MediaItem | null;
  onClose: () => void;
  onSave: (mediaId: string, caption: string) => Promise<void>;
}) {
  const [caption, setCaption] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (media) {
      setCaption(media.title || '');
    }
  }, [media]);

  const handleSave = async () => {
    if (!media) return;
    setSaving(true);
    try {
      await onSave(media.id, caption);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!media) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Edit Media</Text>
        </View>

        <ScrollView style={{ flex: 1, paddingHorizontal: 16 }}>
          <Image
            source={{ uri: media.media_url }}
            style={{
              width: '100%',
              aspectRatio: 16 / 9,
              borderRadius: 8,
              marginBottom: 24,
            }}
            resizeMode="cover"
          />

          <View style={{ marginBottom: 24 }}>
            <Text style={styles.label}>Caption</Text>
            <TextInput
              style={styles.input}
              placeholder="Add a caption..."
              value={caption}
              onChangeText={setCaption}
              maxLength={200}
              multiline
              numberOfLines={3}
            />
            <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
              {caption.length}/200
            </Text>
          </View>
        </ScrollView>

        <View style={styles.modalFooter}>
          <Pressable
            style={[styles.button, { borderWidth: 1, borderColor: '#e5e7eb' }]}
            onPress={onClose}
          >
            <Text style={{ color: '#6b7280', fontWeight: '500' }}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.button, { backgroundColor: '#fa5610' }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={{ color: 'white', fontWeight: '500' }}>Save Changes</Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ─────── Delete Confirmation Modal ───────
function DeleteConfirmationModal({
  visible,
  title,
  description,
  onCancel,
  onDelete,
  isDeleting,
}: {
  visible: boolean;
  title: string;
  description: string;
  onCancel: () => void;
  onDelete: () => Promise<void>;
  isDeleting: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.alertBox}>
          <Text style={styles.alertTitle}>{title}</Text>
          <Text style={styles.alertDescription}>{description}</Text>

          <View style={styles.alertButtonRow}>
            <Pressable
              style={[styles.alertButton, { borderWidth: 1, borderColor: '#e5e7eb' }]}
              onPress={onCancel}
              disabled={isDeleting}
            >
              <Text style={{ color: '#6b7280', fontWeight: '500' }}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.alertButton, { backgroundColor: '#dc2626' }]}
              onPress={onDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={{ color: 'white', fontWeight: '500' }}>Delete</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─────── Gallery Upload Modal ───────
function GalleryUploadModal({
  visible,
  onClose,
  onUpload,
  isUploading,
}: {
  visible: boolean;
  onClose: () => void;
  onUpload: (images: UploadImage[]) => Promise<void>;
  isUploading: boolean;
}) {
  const [uploadImages, setUploadImages] = useState<UploadImage[]>([]);

  const handleSelectImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        selectionLimit: 10,
      });

      if (!result.canceled && result.assets) {
        const newImages: UploadImage[] = result.assets.map((asset) => {
          const type = (asset.type === 'image' || asset.type === 'video') ? asset.type : 'image';
          return {
            id: Math.random().toString(36).substr(2, 9),
            uri: asset.uri,
            uploading: false,
            uploaded: false,
            type,
          };
        });
        setUploadImages([...uploadImages, ...newImages]);
      }
    } catch (err) {
      console.error('Image picker error:', err);
    }
  };

  const handleRemoveImage = (id: string) => {
    setUploadImages(uploadImages.filter((img) => img.id !== id));
  };

  const handleUpload = async () => {
    await onUpload(uploadImages);
    setUploadImages([]);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={styles.modalHeader}>
          <Ionicons name="image" size={20} color="#fa5610" />
          <Text style={styles.modalTitle}>Upload Gallery</Text>
        </View>

        <ScrollView style={{ flex: 1, paddingHorizontal: 16 }}>
          {uploadImages.length === 0 ? (
            <Pressable
              style={{
                height: 128,
                borderWidth: 2,
                borderStyle: 'dashed',
                borderColor: '#e5e7eb',
                borderRadius: 12,
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: 24,
              }}
              onPress={handleSelectImages}
            >
              <Ionicons name="cloud-upload" size={32} color="#9ca3af" />
              <Text style={{ fontSize: 14, fontWeight: '500', marginTop: 12, color: '#111827' }}>
                Tap to select
              </Text>
              <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                Images & videos
              </Text>
            </Pressable>
          ) : (
            <View style={{ marginTop: 24 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {uploadImages.map((img) => (
                  <View key={img.id} style={{ width: (SCREEN_WIDTH - 32 - 16) / 3, aspectRatio: 1 }}>
                    <View
                      style={{
                        flex: 1,
                        backgroundColor: '#f3f4f6',
                        borderRadius: 8,
                        overflow: 'hidden',
                      }}
                    >
                      <Image source={{ uri: img.uri }} style={{ flex: 1 }} resizeMode="cover" />
                      {img.uploading ? (
                        <View
                          style={{
                            ...StyleSheet.absoluteFillObject,
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <ActivityIndicator color="white" />
                        </View>
                      ) : null}
                      {img.uploaded ? (
                        <View
                          style={{
                            ...StyleSheet.absoluteFillObject,
                            backgroundColor: 'rgba(34, 197, 94, 0.5)',
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <Ionicons name="checkmark" size={24} color="white" />
                        </View>
                      ) : null}
                      <Pressable
                        style={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          backgroundColor: 'rgba(0, 0, 0, 0.5)',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                        onPress={() => handleRemoveImage(img.id)}
                      >
                        <Ionicons name="close" size={12} color="white" />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
              <Text
                style={{
                  fontSize: 12,
                  color: '#9ca3af',
                  textAlign: 'center',
                  marginTop: 16,
                }}
              >
                {uploadImages.length} image(s) selected
              </Text>
              <Pressable
                style={{
                  height: 44,
                  borderWidth: 2,
                  borderStyle: 'dashed',
                  borderColor: '#e5e7eb',
                  borderRadius: 12,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginTop: 12,
                }}
                onPress={handleSelectImages}
              >
                <Ionicons name="add" size={20} color="#fa5610" />
              </Pressable>
            </View>
          )}
        </ScrollView>

        <View style={styles.modalFooter}>
          <Pressable
            style={[styles.button, { borderWidth: 1, borderColor: '#e5e7eb' }]}
            onPress={() => {
              setUploadImages([]);
              onClose();
            }}
            disabled={isUploading}
          >
            <Text style={{ color: '#6b7280', fontWeight: '500' }}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[
              styles.button,
              {
                backgroundColor: uploadImages.length === 0 || isUploading ? '#d1d5db' : '#fa5610',
              },
            ]}
            onPress={handleUpload}
            disabled={uploadImages.length === 0 || isUploading}
          >
            {isUploading ? (
              <>
                <ActivityIndicator color="white" size="small" />
                <Text style={{ color: 'white', fontWeight: '500', marginLeft: 8 }}>Creating...</Text>
              </>
            ) : (
              <Text style={{ color: uploadImages.length === 0 ? '#9ca3af' : 'white', fontWeight: '500' }}>
                Upload
              </Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ─────── Social Links Modal ───────
function SocialLinksModal({
  visible,
  socialLinks,
  onClose,
  onSave,
  isSaving,
}: {
  visible: boolean;
  socialLinks: SocialLink[];
  onClose: () => void;
  onSave: (links: SocialLink[]) => Promise<void>;
  isSaving: boolean;
}) {
  const [links, setLinks] = useState<SocialLink[]>(socialLinks);

  useEffect(() => {
    setLinks(socialLinks);
  }, [socialLinks, visible]);

  const handleAddLink = () => {
    if (links.length < 8) {
      const unusedType = LINK_TYPES.find((type) => !links.some((l) => l.platform === type));
      setLinks([
        ...links,
        {
          platform: unusedType || 'website',
          url: '',
          label: LINK_LABELS[unusedType || 'website'],
        },
      ]);
    }
  };

  const handleUpdateLink = (index: number, field: 'platform' | 'url', value: string) => {
    const newLinks = [...links];
    if (field === 'platform') {
      newLinks[index].platform = value;
      newLinks[index].label = LINK_LABELS[value] || value;
    } else {
      newLinks[index].url = value;
    }
    setLinks(newLinks);
  };

  const handleRemoveLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    await onSave(links);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={styles.modalHeader}>
          <Ionicons name="globe" size={20} color="#fa5610" />
          <Text style={styles.modalTitle}>Manage Links</Text>
        </View>

        <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 24 }}>
          {links.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Ionicons name="globe" size={48} color="rgba(107, 114, 128, 0.3)" />
              <Text style={{ fontSize: 16, fontWeight: '500', marginTop: 16, color: '#111827' }}>
                No links added yet
              </Text>
              <Text style={{ fontSize: 14, color: '#9ca3af', marginTop: 8, textAlign: 'center' }}>
                Add your social links and websites
              </Text>
            </View>
          ) : (
            <View style={{ gap: 12, marginBottom: 24 }}>
              {links.map((link, index) => (
                <View key={`${link.label}-${link.url}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Pressable
                    style={{
                      width: 100,
                      height: 44,
                      borderWidth: 1,
                      borderColor: '#e5e7eb',
                      borderRadius: 8,
                      paddingHorizontal: 8,
                      justifyContent: 'center',
                    }}
                    onPress={() => {
                      // Simple type picker - would be better with a dropdown
                    }}
                  >
                    <Text style={{ fontSize: 12, color: '#6b7280' }}>{link.label}</Text>
                  </Pressable>
                  <TextInput
                    style={[styles.input, { flex: 1, height: 44 }]}
                    placeholder={`${link.label} URL`}
                    value={link.url}
                    onChangeText={(value) => handleUpdateLink(index, 'url', value)}
                  />
                  <Pressable
                    style={{
                      width: 40,
                      height: 40,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                    onPress={() => handleRemoveLink(index)}
                  >
                    <Ionicons name="trash" size={20} color="#9ca3af" />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {links.length < 8 && (
            <Pressable
              style={{
                height: 44,
                borderWidth: 2,
                borderStyle: 'dashed',
                borderColor: '#e5e7eb',
                borderRadius: 12,
                justifyContent: 'center',
                alignItems: 'center',
                flexDirection: 'row',
                gap: 8,
              }}
              onPress={handleAddLink}
            >
              <Ionicons name="add" size={20} color="#fa5610" />
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#fa5610' }}>Add Link</Text>
            </Pressable>
          )}
        </ScrollView>

        <View style={styles.modalFooter}>
          <Pressable
            style={[styles.button, { borderWidth: 1, borderColor: '#e5e7eb' }]}
            onPress={onClose}
            disabled={isSaving}
          >
            <Text style={{ color: '#6b7280', fontWeight: '500' }}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.button, { backgroundColor: '#fa5610' }]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={{ color: 'white', fontWeight: '500' }}>Save Links</Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ─────── Main Media Screen ───────
export default function MediaScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const { theme } = useTheme();
  const [talentProfileId, setTalentProfileId] = useState<string | null>(null);
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [galleryProjects, setGalleryProjects] = useState<PortfolioProject[]>([]);
  const [caseStudyProjects, setCaseStudyProjects] = useState<PortfolioProject[]>([]);
  const [galleryMedia, setGalleryMedia] = useState<MediaItem[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'portfolio' | 'case-study'>('portfolio');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingMedia, setEditingMedia] = useState<MediaItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaItem | PortfolioProject | null>(null);
  const [deleteType, setDeleteType] = useState<'media' | 'project' | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showLinksModal, setShowLinksModal] = useState(false);
  const [isSavingLinks, setIsSavingLinks] = useState(false);

  // ─────── Fetch Data on Mount ───────
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        // Get talent profile
        const { data: talentProfile } = await supabase
          .from('talent_profiles')
          .select('id, social_links')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!talentProfile) {
          setIsLoading(false);
          return;
        }

        setTalentProfileId(talentProfile.id);

        // Parse social links
        if (talentProfile.social_links) {
          try {
            const links = Array.isArray(talentProfile.social_links)
              ? talentProfile.social_links
              : JSON.parse(talentProfile.social_links);
            setSocialLinks(links || []);
          } catch (e) {
            setSocialLinks([]);
          }
        }

        // Fetch portfolio projects
        const { data: projectsData } = await supabase
          .from('portfolio_projects')
          .select('*')
          .eq('talent_id', talentProfile.id)
          .order('created_at', { ascending: false });

        if (projectsData) {
          setProjects(projectsData);
          const gallery = projectsData.filter((p) => p.template === 'gallery');
          const caseStudy = projectsData.filter((p) => p.template !== 'gallery');
          setGalleryProjects(gallery);
          setCaseStudyProjects(caseStudy);
        }

        // Fetch gallery media (approved only)
        const { data: mediaData } = await supabase
          .from('portfolio_items')
          .select('id, media_url, media_type, title, talent_id, approved_status')
          .eq('talent_id', talentProfile.id)
          .eq('approved_status', 'approved')
          .order('created_at', { ascending: false });

        if (mediaData) {
          setGalleryMedia(mediaData);
        }
      } catch (err) {
        console.error('[MediaScreen] Fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  // ─────── Handle Media Edit ───────
  const handleSaveCaption = async (mediaId: string, caption: string) => {
    try {
      await supabase
        .from('portfolio_items')
        .update({ title: caption })
        .eq('id', mediaId);

      setGalleryMedia(
        galleryMedia.map((item) =>
          item.id === mediaId ? { ...item, title: caption } : item
        )
      );
    } catch (err) {
      console.error('[MediaScreen] Save caption error:', err);
    }
  };

  // ─────── Handle Media Delete ───────
  const handleDeleteMedia = async () => {
    if (!deleteTarget || deleteType !== 'media') return;

    setIsDeleting(true);
    try {
      const media = deleteTarget as MediaItem;

      // Delete from storage
      try {
        const fileName = media.media_url.split('/').pop();
        if (fileName) {
          await supabase.storage.from('portfolio').remove([`${talentProfileId}/${fileName}`]);
        }
      } catch (err) {
        console.error('[MediaScreen] Storage delete error:', err);
      }

      // Delete from database
      await supabase.from('portfolio_items').delete().eq('id', media.id);

      setGalleryMedia(galleryMedia.filter((item) => item.id !== media.id));
      setDeleteTarget(null);
      setDeleteType(null);
    } catch (err) {
      console.error('[MediaScreen] Delete error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // ─────── Handle Project Delete ───────
  const handleDeleteProject = async () => {
    if (!deleteTarget || deleteType !== 'project') return;

    setIsDeleting(true);
    try {
      const project = deleteTarget as PortfolioProject;

      // Delete project (cascade should handle items/sections)
      await supabase.from('portfolio_projects').delete().eq('id', project.id);

      setProjects(projects.filter((p) => p.id !== project.id));
      setGalleryProjects(galleryProjects.filter((p) => p.id !== project.id));
      setCaseStudyProjects(caseStudyProjects.filter((p) => p.id !== project.id));
      setDeleteTarget(null);
      setDeleteType(null);
    } catch (err) {
      console.error('[MediaScreen] Delete project error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // ─────── Handle Gallery Upload ───────
  const handleUploadGallery = async (uploadImages: UploadImage[]) => {
    if (!talentProfileId) {
      Alert.alert('Error', 'Talent profile not found. Please refresh and try again.');
      return;
    }

    setIsUploading(true);
    const newMedia: MediaItem[] = [];

    try {

      // Upload each image/video directly to storage
      for (const img of uploadImages) {
        try {
          // Fetch the image/video from the URI as a blob
          const response = await fetch(img.uri);
          const blob = await response.blob();

          if (!blob) {
            console.warn('[MediaScreen] No blob for image:', img.id);
            continue;
          }

          // Convert blob to Uint8Array
          const arrayBuffer = await blob.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);

          // Upload to storage
          const ext = img.type === 'video' ? 'mp4' : 'jpg';
          const fileName = `${talentProfileId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;
          const contentType = getContentType(ext, img.type === 'video');


          const { error: uploadError } = await supabase.storage
            .from('portfolio')
            .upload(fileName, bytes.buffer, {
              contentType,
            });

          if (uploadError) {
            console.error('[MediaScreen] Storage upload error:', uploadError);
            continue;
          }

          // Get public URL
          const { data: publicUrlData } = supabase.storage
            .from('portfolio')
            .getPublicUrl(fileName);
          const publicUrl = publicUrlData?.publicUrl;

          if (!publicUrl) {
            console.warn('[MediaScreen] No public URL for:', fileName);
            continue;
          }


          // Add to local gallery
          newMedia.push({
            id: `local-${Date.now()}-${Math.random()}`,
            media_url: publicUrl,
            media_type: img.type,
            title: '',
            talent_id: talentProfileId,
          });
        } catch (err) {
          console.error('[MediaScreen] Error uploading image:', err);
          // Continue with next image instead of failing completely
        }
      }

      // Update gallery media with newly uploaded images
      if (newMedia.length > 0) {
        setGalleryMedia([...newMedia, ...galleryMedia]);
        Alert.alert('Success', `${newMedia.length} image(s) uploaded successfully!`);
        setShowUploadModal(false);
      } else {
        Alert.alert('Error', 'No images could be uploaded. Please try again.');
      }
    } catch (err) {
      console.error('[MediaScreen] Upload error:', err);
      Alert.alert('Error', 'Failed to upload images. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // ─────── Handle Save Links ───────
  const handleSaveLinks = async (links: SocialLink[]) => {
    if (!talentProfileId) return;

    setIsSavingLinks(true);
    try {
      await supabase
        .from('talent_profiles')
        .update({ social_links: links })
        .eq('id', talentProfileId);

      setSocialLinks(links);
    } catch (err) {
      console.error('[MediaScreen] Save links error:', err);
    } finally {
      setIsSavingLinks(false);
    }
  };

  // ─────── Render ───────
  const isDark = theme === 'dark';
  const colors = {
    bg: isDark ? '#0A0A0A' : '#fff',
    bgSecondary: isDark ? '#1A1A1A' : '#f9fafb',
    text: isDark ? '#ffffff' : '#111827',
    textSecondary: isDark ? '#9ca3af' : '#6b7280',
    border: isDark ? '#374151' : '#e5e7eb',
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.bg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Pressable
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.bgSecondary,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}
              onPress={() => router.replace('/(talent)/profile')}
            >
              <Ionicons name="arrow-back" size={20} color={colors.text} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}>Portfolio</Text>
            </View>
          </View>
          <Text style={{ fontSize: 14, color: colors.textSecondary }}>
            {projects.length} projects · {socialLinks.length} links
          </Text>
        </View>

        {isLoading ? (
          <>
            {/* Header visible during loading */}
            <PortfolioGridSkeleton count={6} />
          </>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Action Buttons */}
            <View
              style={{
                flexDirection: 'row',
                paddingHorizontal: 16,
                paddingVertical: 16,
                gap: 12,
              }}
            >
              {/* Case Study Button */}
              <Pressable
                style={{
                  flex: 1,
                  paddingVertical: 24,
                  paddingHorizontal: 16,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.bgSecondary,
                  alignItems: 'center',
                }}
                onPress={() => router.push('/(talent)/portfolio/new-case-study')}
              >
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: 'rgba(124, 58, 237, 0.1)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: 12,
                  }}
                >
                  <Ionicons name="document-text" size={24} color="#fa5610" />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>Case Study</Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4, textAlign: 'center' }}>
                  Tell the story of your project
                </Text>
              </Pressable>

              {/* Gallery Button */}
              <Pressable
                style={{
                  flex: 1,
                  paddingVertical: 24,
                  paddingHorizontal: 16,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.bgSecondary,
                  alignItems: 'center',
                }}
                onPress={() => setShowUploadModal(true)}
              >
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: 'rgba(124, 58, 237, 0.1)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: 12,
                  }}
                >
                  <Ionicons name="images" size={24} color="#fa5610" />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>Gallery</Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4, textAlign: 'center' }}>
                  Just add images and videos
                </Text>
              </Pressable>
            </View>

            {/* Social Links Display */}
            {socialLinks.length > 0 && (
              <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>Your Links</Text>
                  <Pressable onPress={() => setShowLinksModal(true)}>
                    <Text style={{ fontSize: 14, color: '#fa5610', fontWeight: '500' }}>Edit</Text>
                  </Pressable>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {socialLinks.map((link, index) => {
                    const iconName = getSocialIcon(link.platform);
                    return (
                      <Pressable
                        key={`${link.platform}-${link.url}`}
                        style={{
                          backgroundColor: colors.bgSecondary,
                          borderRadius: 8,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          borderWidth: 1,
                          borderColor: colors.border,
                        }}
                        onPress={() => Linking.openURL(link.url)}
                      >
                        <Ionicons
                          name={iconName as any}
                          size={16}
                          color={colors.textSecondary}
                        />
                        <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text }}>
                          {link.label || link.platform}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Content */}
            {projects.length === 0 ? (
              <View style={{ paddingHorizontal: 16, paddingVertical: 48, alignItems: 'center' }}>
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 16,
                    backgroundColor: colors.bgSecondary,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: 16,
                  }}
                >
                  <Ionicons name="folder-open" size={28} color={colors.textSecondary} />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>No projects yet</Text>
                <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center' }}>
                  Start by uploading images or creating your first project
                </Text>
              </View>
            ) : (
              <>
                {/* Tabs */}
                <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 16 }}>
                  <Pressable
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                      backgroundColor: activeTab === 'portfolio' ? '#fa5610' : colors.bgSecondary,
                      borderWidth: 1,
                      borderColor: activeTab === 'portfolio' ? '#fa5610' : colors.border,
                    }}
                    onPress={() => setActiveTab('portfolio')}
                  >
                    <Text
                      style={{
                        textAlign: 'center',
                        fontSize: 14,
                        fontWeight: '600',
                        color: activeTab === 'portfolio' ? '#fff' : colors.textSecondary,
                      }}
                    >
                      Portfolio {galleryMedia.length}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                      backgroundColor: activeTab === 'case-study' ? '#fa5610' : colors.bgSecondary,
                      borderWidth: 1,
                      borderColor: activeTab === 'case-study' ? '#fa5610' : colors.border,
                    }}
                    onPress={() => setActiveTab('case-study')}
                  >
                    <Text
                      style={{
                        textAlign: 'center',
                        fontSize: 14,
                        fontWeight: '600',
                        color: activeTab === 'case-study' ? '#fff' : colors.textSecondary,
                      }}
                    >
                      Case Study {caseStudyProjects.length}
                    </Text>
                  </Pressable>
                </View>

                {/* Tab Content */}
                {activeTab === 'portfolio' ? (
                  galleryMedia.length === 0 ? (
                    <View style={{ paddingHorizontal: 16, paddingVertical: 48, alignItems: 'center' }}>
                      <Ionicons name="images" size={32} color={colors.textSecondary} />
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 12 }}>
                        No gallery uploads yet
                      </Text>
                      <Pressable
                        style={{
                          marginTop: 16,
                          paddingVertical: 10,
                          paddingHorizontal: 16,
                          backgroundColor: '#fa5610',
                          borderRadius: 8,
                        }}
                        onPress={() => setShowUploadModal(true)}
                      >
                        <Text style={{ color: 'white', fontWeight: '600' }}>Upload Gallery</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View style={{ paddingHorizontal: 16 }}>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP }}>
                        {galleryMedia.map((item) => (
                          <MediaCell
                            key={item.id}
                            item={item}
                            onEdit={(media) => setEditingMedia(media)}
                            onDelete={(media) => {
                              setDeleteTarget(media);
                              setDeleteType('media');
                            }}
                          />
                        ))}
                      </View>
                    </View>
                  )
                ) : caseStudyProjects.length === 0 ? (
                  <View style={{ paddingHorizontal: 16, paddingVertical: 48, alignItems: 'center' }}>
                    <Ionicons name="document-text" size={32} color={colors.textSecondary} />
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 12 }}>
                      No case studies yet
                    </Text>
                    <Pressable
                      style={{
                        marginTop: 16,
                        paddingVertical: 10,
                        paddingHorizontal: 16,
                        backgroundColor: '#fa5610',
                        borderRadius: 8,
                      }}
                      onPress={() => router.push('/(talent)/portfolio/new-case-study')}
                    >
                      <Text style={{ color: 'white', fontWeight: '600' }}>Create Case Study</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={{ paddingHorizontal: 16, gap: 16 }}>
                    {caseStudyProjects.map((project) => (
                      <Pressable
                        key={project.id}
                        style={{
                          backgroundColor: theme === 'dark' ? '#1A1A1A' : '#fff',
                          borderWidth: 1,
                          borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
                          borderRadius: 12,
                          overflow: 'hidden',
                        }}
                        onPress={() => router.push(`/(talent)/portfolio/case-study-editor/${project.id}`)}
                      >
                        {project.cover_media_url ? (
                          <Image
                            source={{ uri: project.cover_media_url }}
                            style={{ width: '100%', aspectRatio: 4 / 3 }}
                            resizeMode="cover"
                          />
                        ) : null}
                        {project.is_featured ? (
                          <View
                            style={{
                              position: 'absolute',
                              top: 12,
                              left: 12,
                              backgroundColor: '#fa5610',
                              paddingHorizontal: 8,
                              paddingVertical: 6,
                              borderRadius: 6,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <Ionicons name="star" size={12} color="white" />
                            <Text style={{ fontSize: 12, fontWeight: '600', color: 'white' }}>Featured</Text>
                          </View>
                        ) : null}
                        <View style={{ padding: 16 }}>
                          <View
                            style={{
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              marginBottom: 8,
                            }}
                          >
                            <Text style={{ fontSize: 16, fontWeight: '600', color: theme === 'dark' ? '#ffffff' : '#111827', flex: 1 }}>
                              {project.title}
                            </Text>
                            <Pressable
                              style={{ padding: 4 }}
                              onPress={() => {
                                setDeleteTarget(project);
                                setDeleteType('project');
                              }}
                            >
                              <Ionicons name="ellipsis-vertical" size={20} color="#9ca3af" />
                            </Pressable>
                          </View>
                          {project.category ? (
                            <Text style={{ fontSize: 14, color: '#9ca3af', marginBottom: 8 }}>
                              {project.category}
                            </Text>
                          ) : null}
                          {project.tags && project.tags.length > 0 ? (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                              {project.tags.slice(0, 3).map((tag, index) => (
                                <View
                                  key={tag}
                                  style={{
                                    backgroundColor: theme === 'dark' ? '#2d2d2d' : '#f3f4f6',
                                    paddingHorizontal: 8,
                                    paddingVertical: 4,
                                    borderRadius: 4,
                              }}
                                >
                                  <Text style={{ fontSize: 12, color: theme === 'dark' ? '#d1d5db' : '#6b7280' }}>#{tag}</Text>
                                </View>
                              ))}
                              {project.tags.length > 3 ? (
                                <View
                                  style={{
                                    backgroundColor: theme === 'dark' ? '#2d2d2d' : '#f3f4f6',
                                    paddingHorizontal: 8,
                                    paddingVertical: 4,
                                    borderRadius: 4,
                                  }}
                                >
                                  <Text style={{ fontSize: 12, color: theme === 'dark' ? '#d1d5db' : '#6b7280' }}>
                                    +{project.tags.length - 3}
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                          ) : null}
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )}
              </>
            )}
          </ScrollView>
        )}

        {/* Modals */}
        <EditMediaModal
          visible={editingMedia !== null}
          media={editingMedia}
          onClose={() => setEditingMedia(null)}
          onSave={handleSaveCaption}
        />
        <GalleryUploadModal
          visible={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onUpload={handleUploadGallery}
          isUploading={isUploading}
        />
        <DeleteConfirmationModal
          visible={deleteTarget !== null}
          title={deleteType === 'media' ? 'Delete Media?' : 'Delete Project?'}
          description="This will permanently delete this item. This action cannot be undone."
          onCancel={() => {
            setDeleteTarget(null);
            setDeleteType(null);
          }}
          onDelete={deleteType === 'media' ? handleDeleteMedia : handleDeleteProject}
          isDeleting={isDeleting}
        />
        <SocialLinksModal
          visible={showLinksModal}
          socialLinks={socialLinks}
          onClose={() => setShowLinksModal(false)}
          onSave={handleSaveLinks}
          isSaving={isSavingLinks}
        />
      </SafeAreaView>
    </View>
  );
}

// ─────── Styles ───────
const styles = StyleSheet.create({
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  button: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  alertBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 24,
    width: '100%',
    maxWidth: 400,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  alertDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
    lineHeight: 20,
  },
  alertButtonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  alertButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: GRID_GAP,
  },
  gridImage: {
    flex: 1,
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  playBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
