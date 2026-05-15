import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from '@/lib/router-helper';
import { useTheme } from '@/lib/theme/ThemeContext';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/state/auth-store';
import { uploadFileToStorage } from '@/helpers/uploadToStorage';
import { SkeletonLoader } from '@/components/SkeletonLoader';

interface UploadedImage {
  uri: string;
  type: 'image' | 'video';
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
    .replace(/-+/g, '-');
}

export default function NewCaseStudyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const user = useAuthStore((state) => state.user);

  const [title, setTitle] = useState('');
  const [coverImage, setCoverImage] = useState<UploadedImage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [talentId, setTalentId] = useState<string | null>(null);

  // Fetch talent ID
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
        console.error('[NewCaseStudy] Error fetching talent ID:', err);
      }
    };
    fetchTalentId();
  }, [user?.id]);

  const handlePickCoverImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setCoverImage({
          uri: asset.uri,
          type: 'image',
        });
      }
    } catch (err) {
      console.error('[NewCaseStudy] Error picking image:', err);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleCreateProject = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a project title.');
      return;
    }

    if (!coverImage) {
      Alert.alert('Required', 'Please upload a cover image.');
      return;
    }

    if (!talentId) {
      Alert.alert('Error', 'Could not load your profile. Please try again.');
      return;
    }

    setIsLoading(true);
    try {
      const slug = generateSlug(title);
      const timestamp = Date.now();
      const ext = 'jpg';
      const fileName = `${talentId}/cover-${timestamp}.${ext}`;
      const contentType = 'image/jpeg';


      // Upload cover image using the helper
      const { publicUrl, error } = await uploadFileToStorage(
        'portfolio',
        fileName,
        coverImage.uri,
        contentType
      );

      if (error) {
        const err = error as unknown;
        const errorMsg = typeof err === 'string' ? err : err instanceof Error ? err.message : 'An error occurred';
        console.error('[NewCaseStudy] Upload error:', errorMsg);
        throw new Error(`Upload failed: ${errorMsg}`);
      }

      if (!publicUrl) {
        throw new Error('Could not generate public URL');
      }


      // Create portfolio project
      const { data: projectData, error: projectError } = await supabase
        .from('portfolio_projects')
        .insert({
          talent_id: talentId,
          title: title.trim(),
          slug,
          template: 'case_study',
          cover_media_url: publicUrl,
          is_published: true,
          view_count: 0,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (projectError || !projectData) {
        throw new Error(`Project creation failed: ${projectError?.message || 'Unknown error'}`);
      }

      const projectId = projectData.id;

      // Create 4 default sections
      const defaultSections = [
        { type: 'text_block', position: 0, data: { title: '', body: '', alignment: 'left' } },
        { type: 'media_gallery', position: 1, data: { items: [], layout: 'grid' } },
        { type: 'text_block', position: 2, data: { title: '', body: '', alignment: 'left' } },
        { type: 'deliverables_list', position: 3, data: { items: [] } },
      ];

      for (const section of defaultSections) {
        const { error: sectionError } = await supabase
          .from('portfolio_sections')
          .insert({
            project_id: projectId,
            type: section.type,
            position: section.position,
            data_json: JSON.stringify(section.data),
            created_at: new Date().toISOString(),
          });

        if (sectionError) {
          console.error(`[NewCaseStudy] Error creating section ${section.type}:`, sectionError);
        }
      }

      Alert.alert('Success', 'Project created! You can now add content.', [
        {
          text: 'OK',
          onPress: () => {
            router.push({
              pathname: '/(talent)/portfolio/case-study-editor/[projectId]' as any,
              params: { projectId },
            });
          },
        },
      ]);
    } catch (err) {
      console.error('[NewCaseStudy] Error creating project:', err);
      Alert.alert('Error', 'Failed to create project. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: isDark ? '#0A0A0A' : '#ffffff' }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDark ? '#0A0A0A' : '#ffffff', borderBottomColor: isDark ? '#374151' : '#e5e7eb' }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: isDark ? '#1A1A1A' : '#f3f4f6' }]}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={22} color={isDark ? '#ffffff' : '#111827'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDark ? '#ffffff' : '#111827' }]}>New Project</Text>
        <View style={{ width: 40 }} />
      </View>

      {!talentId ? (
        // Skeleton loading state for form
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title skeleton */}
          <View style={styles.section}>
            <SkeletonLoader width="40%" height={14} borderRadius={4} style={{ marginBottom: 10 }} />
            <SkeletonLoader width="100%" height={48} borderRadius={14} />
          </View>

          {/* Cover image skeleton */}
          <View style={styles.section}>
            <SkeletonLoader width="40%" height={14} borderRadius={4} style={{ marginBottom: 10 }} />
            <SkeletonLoader
              width="100%"
              height={200}
              borderRadius={14}
              style={{ aspectRatio: 16 / 9 }}
            />
          </View>

          {/* Helper text skeleton */}
          <View style={styles.helperSection}>
            <SkeletonLoader width="100%" height={40} borderRadius={10} />
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        // Actual form content
        <>
          {(() => {
            const colors = {
              bg: isDark ? '#0A0A0A' : '#ffffff',
              bgSecondary: isDark ? '#1A1A1A' : '#f9fafb',
              text: isDark ? '#ffffff' : '#111827',
              textSecondary: isDark ? '#9ca3af' : '#6b7280',
              border: isDark ? '#374151' : '#e5e7eb',
              borderLight: isDark ? '#2d2d2d' : '#d1d5db',
            };
            return (
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Title Input */}
                <View style={styles.section}>
                  <Text style={[styles.label, { color: colors.text }]}>Project Title</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.bgSecondary, borderColor: colors.border, color: colors.text }]}
                    placeholder="e.g., Summer Campaign"
                    placeholderTextColor={colors.textSecondary}
                    value={title}
                    onChangeText={setTitle}
                    editable={!isLoading}
                  />
                </View>

                {/* Cover Image Upload */}
                <View style={styles.section}>
                  <Text style={[styles.label, { color: colors.text }]}>Cover Image</Text>
                  <TouchableOpacity
                    onPress={handlePickCoverImage}
                    style={[styles.imageUploadArea, { backgroundColor: colors.bgSecondary, borderColor: colors.borderLight }, coverImage && { borderStyle: 'solid' }]}
                    disabled={isLoading}
                    activeOpacity={0.8}
                  >
                    {coverImage ? (
                      <>
                        <Image
                          source={{ uri: coverImage.uri }}
                          style={StyleSheet.absoluteFill}
                          resizeMode="cover"
                        />
                        <View style={styles.imageOverlay}>
                          <View style={styles.tapToReplaceChip}>
                            <Ionicons name="image-outline" size={14} color="#ffffff" />
                            <Text style={styles.tapToReplaceText}>Tap to replace</Text>
                          </View>
                        </View>
                      </>
                    ) : (
                      <View style={styles.emptyUploadContent}>
                        <Ionicons name="cloud-upload-outline" size={32} color={colors.textSecondary} />
                        <Text style={[styles.emptyUploadText, { color: colors.text }]}>Upload cover image</Text>
                        <Text style={[styles.emptyUploadSubtext, { color: colors.textSecondary }]}>16:9 aspect ratio recommended</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Helper Text */}
                <View style={[styles.helperSection, { borderTopColor: colors.border }]}>
                  <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
                  <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                    You can add photos, videos, and text after creating your project
                  </Text>
                </View>

                <View style={{ height: 40 }} />
              </ScrollView>
            );
          })()}
        </>
      )}

      {/* Create Button */}
      <View style={[styles.footerContainer, { paddingBottom: insets.bottom + 16, backgroundColor: isDark ? '#0A0A0A' : '#ffffff', borderTopColor: isDark ? '#374151' : '#e5e7eb' }]}>
        <TouchableOpacity
          style={[
            styles.createBtn,
            (!title.trim() || !coverImage || isLoading) && styles.createBtnDisabled,
          ]}
          onPress={handleCreateProject}
          disabled={!title.trim() || !coverImage || isLoading || !talentId}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.createBtnText}>Create Project</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: '#111827',
  },
  imageUploadArea: {
    aspectRatio: 16 / 9,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#d1d5db',
    borderRadius: 14,
    backgroundColor: '#f9fafb',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tapToReplaceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  tapToReplaceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  emptyUploadContent: {
    alignItems: 'center',
    gap: 8,
  },
  emptyUploadText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  emptyUploadSubtext: {
    fontSize: 12,
    color: '#9ca3af',
  },
  helperSection: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(107, 114, 128, 0.05)',
  },
  helperText: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
    flex: 1,
  },
  footerContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  createBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: '#fa5610',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtnDisabled: {
    backgroundColor: '#d1d5db',
  },
  createBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
