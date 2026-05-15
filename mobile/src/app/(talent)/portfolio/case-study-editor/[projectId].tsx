import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useRouter } from '@/lib/router-helper';
import * as ImagePicker from 'expo-image-picker';
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { extractErrorMessage } from '@/lib/errorUtils';
import {
  ChevronLeft,
  Settings,
  Save,
  Check,
  Loader,
  Copy,
  Trash2,
  GripVertical,
  Plus,
  X,
  Images,
  Type,
  ArrowLeftRight,
  Video,
  Grid3x3,
  Layers,
  Play,
  Upload,
  ExternalLink,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/state/auth-store';
import { uploadFileToStorage, getContentType } from '@/helpers/uploadToStorage';
import { useTheme } from '@/lib/theme/ThemeContext';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface PortfolioSection {
  id: string;
  project_id: string;
  type: 'text_block' | 'media_gallery' | 'before_after' | 'embed';
  position: number;
  data_json: string;
}

interface ProjectMetadata {
  id: string;
  title: string;
  talent_id?: string;
  category?: string;
  summary?: string;
  tags_json?: string;
  cover_media_url?: string;
}

const CATEGORIES = [
  'Editorial',
  'Commercial',
  'Fashion',
  'Music Video',
  'Portrait',
  'Product',
  'Event',
  'Documentary',
  'Art',
  'Other',
];

const SECTION_TYPES = [
  { id: 'media_gallery', label: 'Photos & Videos', icon: Images, desc: 'Upload your work' },
  { id: 'text_block', label: 'Text', icon: Type, desc: 'Add a description' },
  { id: 'before_after', label: 'Before & After', icon: ArrowLeftRight, desc: 'Show transformations' },
  { id: 'embed', label: 'Video Link', icon: Video, desc: 'YouTube or Vimeo' },
];

// ============================================================================
// HEADER COMPONENT
// ============================================================================
function StickyHeader({
  title,
  onTitleChange,
  onSettingsPress,
  onSavePress,
  onBackPress,
  isSaving,
  hasUnsavedChanges,
  isDark = false,
}: {
  title: string;
  onTitleChange: (text: string) => void;
  onSettingsPress: () => void;
  onSavePress: () => void;
  onBackPress: () => void;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  isDark?: boolean;
}) {
  const colors = {
    bg: isDark ? '#0A0A0A' : '#ffffff',
    border: isDark ? '#374151' : '#e5e7eb',
    buttonBg: isDark ? '#1f2937' : '#f3f4f6',
    text: isDark ? '#ffffff' : '#171717',
    iconColor: isDark ? '#ffffff' : '#171717',
  };

  return (
    <View
      style={{
        backgroundColor: colors.bg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 40,
      }}
    >
      {/* Left: Back button + Title */}
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }}>
        <Pressable
          onPress={onBackPress}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.buttonBg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ChevronLeft size={20} color={colors.iconColor} />
        </Pressable>
        <TextInput
          value={title}
          onChangeText={onTitleChange}
          placeholder="Project title"
          placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
          style={{
            flex: 1,
            fontSize: 18,
            fontWeight: '600',
            color: colors.text,
            borderWidth: 0,
            backgroundColor: 'transparent',
            padding: 0,
          }}
        />
      </View>

      {/* Right: Settings + Save */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable
          onPress={onSettingsPress}
          style={{ padding: 8, borderRadius: 6 }}
        >
          <Settings size={18} color={colors.iconColor} />
        </Pressable>
        <Pressable
          onPress={onSavePress}
          disabled={isSaving}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 6,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: isSaving
              ? (isDark ? '#374151' : '#d1d5db')
              : hasUnsavedChanges
              ? '#fa5610'
              : '#10b981',
            opacity: isSaving ? 0.6 : 1,
          }}
        >
          {isSaving ? (
            <Loader size={14} color="white" />
          ) : hasUnsavedChanges ? (
            <Save size={14} color="white" />
          ) : (
            <Check size={14} color="white" />
          )}
          <Text
            style={{
              fontSize: 12,
              fontWeight: '500',
              color: isSaving ? (isDark ? '#9ca3af' : '#374151') : '#ffffff',
            }}
          >
            {isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save' : 'Saved'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ============================================================================
// SETTINGS SHEET COMPONENT
// ============================================================================
function SettingsSheet({
  visible,
  onClose,
  project,
  onProjectChange,
}: {
  visible: boolean;
  onClose: () => void;
  project: ProjectMetadata;
  onProjectChange: (updates: Partial<ProjectMetadata>) => void;
}) {
  const { isDark } = useTheme();
  const [category, setCategory] = useState(project.category || '');
  const [summary, setSummary] = useState(project.summary || '');
  const [tags, setTags] = useState<string[]>(() => {
    try {
      if (!project.tags_json) return [];

      // If it's already an array, return it
      if (Array.isArray(project.tags_json)) return project.tags_json;

      // If it's a string, parse it
      if (typeof project.tags_json === 'string') {
        const trimmed = project.tags_json.trim();
        if (!trimmed) return [];
        return JSON.parse(trimmed);
      }

      return [];
    } catch (e) {
      const errorMsg = extractErrorMessage(e);
      console.error('Error parsing tags_json:', errorMsg);
      return [];
    }
  });
  const [tagInput, setTagInput] = useState('');
  const [coverUrl, setCoverUrl] = useState(project.cover_media_url || '');

  const handleAddTag = () => {
    if (tagInput.trim()) {
      const newTags = [...tags, tagInput.trim()];
      setTags(newTags);
      setTagInput('');
      onProjectChange({
        tags_json: JSON.stringify(newTags),
      });
    }
  };

  const handleRemoveTag = (index: number) => {
    const newTags = tags.filter((_, i) => i !== index);
    setTags(newTags);
    onProjectChange({
      tags_json: JSON.stringify(newTags),
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 bg-black/50">
        <View
          className="flex-1 mt-auto rounded-t-3xl p-6 max-h-[80%]"
          style={{ backgroundColor: isDark ? '#171717' : '#ffffff' }}
        >
          <View className="flex-row items-center justify-between mb-6">
            <Text style={{ fontSize: 18, fontWeight: '600', color: isDark ? '#ffffff' : '#171717' }}>Project Settings</Text>
            <Pressable onPress={onClose}>
              <X size={24} color={isDark ? '#ffffff' : '#171717'} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Cover Image */}
            <View className="mb-6">
              <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDark ? '#ffffff' : '#171717' }}>Cover Image</Text>
              <Pressable
                onPress={() => {
                  // TODO: Implement cover image upload
                }}
                className="w-full h-32 rounded-lg items-center justify-center"
                style={{
                  backgroundColor: isDark ? '#1f2937' : '#f3f4f6',
                  borderWidth: 2,
                  borderStyle: 'dashed',
                  borderColor: isDark ? '#4b5563' : '#d1d5db'
                }}
              >
                {coverUrl ? (
                  <Image
                    source={{ uri: coverUrl }}
                    className="w-full h-full rounded-lg"
                    style={{ resizeMode: 'cover' }}
                  />
                ) : (
                  <View className="items-center gap-2">
                    <Upload size={24} color={isDark ? '#9ca3af' : '#9ca3af'} />
                    <Text style={{ fontSize: 12, color: isDark ? '#9ca3af' : '#6b7280' }}>Upload cover</Text>
                  </View>
                )}
              </Pressable>
            </View>

            {/* Category */}
            <View className="mb-6">
              <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDark ? '#ffffff' : '#171717' }}>Category</Text>
              <View
                className="rounded-lg overflow-hidden"
                style={{
                  borderWidth: 1,
                  borderColor: isDark ? '#374151' : '#e5e7eb',
                  backgroundColor: isDark ? '#1f2937' : '#ffffff'
                }}
              >
                <TextInput
                  editable={false}
                  placeholder="Select category"
                  placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    fontSize: 16,
                    color: isDark ? '#ffffff' : '#171717'
                  }}
                  value={category}
                />
              </View>
              <View className="mt-2 flex-row flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat}
                    onPress={() => {
                      setCategory(cat);
                      onProjectChange({ category: cat });
                    }}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 999,
                      backgroundColor: category === cat ? '#fa5610' : isDark ? '#374151' : '#e5e7eb'
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '500',
                        color: category === cat ? '#ffffff' : isDark ? '#d1d5db' : '#4b5563'
                      }}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Summary */}
            <View className="mb-6">
              <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDark ? '#ffffff' : '#171717' }}>Summary</Text>
              <TextInput
                multiline
                numberOfLines={3}
                value={summary}
                onChangeText={(text) => {
                  setSummary(text);
                  onProjectChange({ summary: text });
                }}
                placeholder="Brief description of this project..."
                placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
                style={{
                  borderWidth: 1,
                  borderColor: isDark ? '#374151' : '#e5e7eb',
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  fontSize: 16,
                  backgroundColor: isDark ? '#1f2937' : '#ffffff',
                  color: isDark ? '#ffffff' : '#171717'
                }}
              />
            </View>

            {/* Tags */}
            <View className="mb-6">
              <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDark ? '#ffffff' : '#171717' }}>Tags</Text>
              <View className="flex-row gap-2 mb-2">
                <TextInput
                  value={tagInput}
                  onChangeText={setTagInput}
                  placeholder="Add tag..."
                  placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: isDark ? '#374151' : '#e5e7eb',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    backgroundColor: isDark ? '#1f2937' : '#ffffff',
                    color: isDark ? '#ffffff' : '#171717'
                  }}
                />
                <Pressable
                  onPress={handleAddTag}
                  className="rounded-lg px-4 py-2 items-center justify-center"
                  style={{ backgroundColor: isDark ? '#374151' : '#e5e7eb' }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '500', color: isDark ? '#d1d5db' : '#4b5563' }}>Add</Text>
                </Pressable>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {tags.map((tag, idx) => (
                  <Pressable
                    key={idx}
                    onPress={() => handleRemoveTag(idx)}
                    className="rounded-full px-3 py-1.5 flex-row items-center gap-1"
                    style={{ backgroundColor: isDark ? '#374151' : '#e5e7eb' }}
                  >
                    <Text style={{ fontSize: 12, color: isDark ? '#d1d5db' : '#4b5563' }}>{tag}</Text>
                    <Text style={{ fontSize: 12, color: isDark ? '#d1d5db' : '#4b5563' }}>×</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </ScrollView>

          <Pressable
            onPress={onClose}
            className="mt-6 rounded-lg py-3 items-center justify-center"
            style={{ backgroundColor: isDark ? '#374151' : '#e5e7eb' }}
          >
            <Text style={{ fontSize: 14, fontWeight: '500', color: isDark ? '#d1d5db' : '#4b5563' }}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================================
// ADD CONTENT MODAL
// ============================================================================
function AddContentModal({
  visible,
  onClose,
  onSelectType,
}: {
  visible: boolean;
  onClose: () => void;
  onSelectType: (type: string) => void;
}) {
  const { isDark } = useTheme();

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View className="flex-1 bg-black/50 items-center justify-center p-6">
        <View
          className="rounded-2xl p-6 w-full max-w-sm"
          style={{ backgroundColor: isDark ? '#171717' : '#ffffff' }}
        >
          <View className="flex-row items-center justify-between mb-6">
            <Text style={{ fontSize: 20, fontWeight: '700', color: isDark ? '#ffffff' : '#171717' }}>Add Content</Text>
            <Pressable onPress={onClose}>
              <X size={24} color={isDark ? '#ffffff' : '#171717'} />
            </Pressable>
          </View>

          <View className="gap-4">
            {/* 2x2 Grid */}
            {SECTION_TYPES.map((section) => {
              const IconComponent = section.icon;
              const isMediaGallery = section.id === 'media_gallery';
              return (
                <Pressable
                  key={section.id}
                  onPress={() => {
                    onSelectType(section.id);
                    onClose();
                  }}
                  className="rounded-2xl p-4 flex-row items-center gap-4"
                  style={{
                    borderWidth: 2,
                    borderColor: isMediaGallery ? '#fa5610' : isDark ? '#374151' : '#e5e7eb',
                    backgroundColor: isMediaGallery
                      ? isDark ? 'rgba(250, 86, 16, 0.1)' : '#fff7ed'
                      : isDark ? '#1f2937' : '#f3f4f6'
                  }}
                >
                  <View
                    className="w-12 h-12 rounded-lg items-center justify-center"
                    style={{ backgroundColor: isDark ? 'rgba(250, 86, 16, 0.2)' : '#ffedd5' }}
                  >
                    <IconComponent size={24} color="#fa5610" />
                  </View>
                  <View className="flex-1">
                    <Text style={{ fontSize: 14, fontWeight: '500', color: isDark ? '#ffffff' : '#171717' }}>
                      {section.label}
                    </Text>
                    <Text style={{ fontSize: 12, color: isDark ? '#9ca3af' : '#6b7280', marginTop: 2 }}>
                      {section.desc}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================================
// SECTION EDITORS
// ============================================================================

function TextBlockEditor({ section, onSave }: {
  section: PortfolioSection;
  onSave: (data: any) => void;
}) {
  const { isDark } = useTheme();
  const data = typeof section.data_json === 'string' ? JSON.parse(section.data_json) : section.data_json;
  const [title, setTitle] = useState(data?.title || '');
  const [body, setBody] = useState(data?.body || '');
  const [alignment, setAlignment] = useState(data?.alignment || 'left');

  const handleTitleChange = (text: string) => {
    setTitle(text);
    onSave({ title: text, body, alignment });
  };

  const handleBodyChange = (text: string) => {
    setBody(text);
    onSave({ title, body: text, alignment });
  };

  const handleAlignmentChange = (newAlignment: string) => {
    setAlignment(newAlignment);
    onSave({ title, body, alignment: newAlignment });
  };

  return (
    <View
      className="p-4 border-b"
      style={{
        backgroundColor: isDark ? '#171717' : '#ffffff',
        borderBottomColor: isDark ? '#374151' : '#e5e7eb'
      }}
    >
      <TextInput
        value={title}
        onChangeText={handleTitleChange}
        placeholder="Section title (optional)"
        placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
        className="text-2xl font-semibold mb-4 p-0 bg-transparent"
        style={{
          borderWidth: 0,
          borderBottomWidth: 1,
          borderBottomColor: isDark ? '#374151' : '#e5e7eb',
          color: isDark ? '#ffffff' : '#171717'
        }}
      />
      <TextInput
        multiline
        value={body}
        onChangeText={handleBodyChange}
        placeholder="Write your content here..."
        placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
        numberOfLines={6}
        className="text-base mb-4 p-0 bg-transparent"
        style={{ minHeight: 150, color: isDark ? '#ffffff' : '#171717' }}
      />
      <View className="flex-row gap-2">
        {['Left', 'Center'].map((option) => (
          <Pressable
            key={option}
            onPress={() => handleAlignmentChange(option.toLowerCase())}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: alignment === option.toLowerCase()
                ? '#fa5610'
                : isDark ? '#374151' : '#e5e7eb'
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '500',
                color: alignment === option.toLowerCase()
                  ? '#ffffff'
                  : isDark ? '#d1d5db' : '#4b5563'
              }}
            >
              {option}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function MediaGalleryEditor({ section, onSave, talentId }: {
  section: PortfolioSection;
  onSave: (data: any) => void;
  talentId: string;
}) {
  const { isDark } = useTheme();
  const data = typeof section.data_json === 'string' ? JSON.parse(section.data_json) : section.data_json;
  const [items, setItems] = useState(data?.items || []);
  const [layout, setLayout] = useState(data?.layout || 'grid');

  const handleAddMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      aspect: [1, 1],
    });

    if (!result.canceled) {
      for (const asset of result.assets) {
        const uri = asset.uri;
        const fileName = `${talentId}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;

        try {
          const file = await fetch(uri).then(r => r.blob());

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('portfolio')
            .upload(fileName, file);

          if (uploadError) {
            console.error('Upload error:', uploadError);
            throw uploadError;
          }


          const { data: publicUrlData } = supabase.storage
            .from('portfolio')
            .getPublicUrl(fileName);

          const newItem = {
            url: publicUrlData.publicUrl,
            media_type: 'image',
            caption: '',
          };

          const newItems = [...items, newItem];
          setItems(newItems);
          onSave({ items: newItems, layout });
        } catch (error) {
          const err = error as any;
          const errorMsg = err instanceof Error ? err.message : typeof err === 'string' ? err : 'An error occurred';
          console.error('Upload failed:', errorMsg);
          Alert.alert('Upload failed', `Could not upload media: ${errorMsg}`);
        }
      }
    }
  };

  return (
    <View
      className="p-4 border-b"
      style={{
        backgroundColor: isDark ? '#171717' : '#ffffff',
        borderBottomColor: isDark ? '#374151' : '#e5e7eb'
      }}
    >
      <View className="mb-4">
        <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDark ? '#ffffff' : '#171717' }}>Layout</Text>
        <View className="flex-row gap-2">
          {['grid', 'masonry', 'carousel'].map((l) => (
            <Pressable
              key={l}
              onPress={() => {
                setLayout(l);
                onSave({ items, layout: l });
              }}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: layout === l ? '#fa5610' : isDark ? '#374151' : '#e5e7eb'
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '500',
                  color: layout === l ? '#ffffff' : isDark ? '#d1d5db' : '#4b5563'
                }}
              >
                {l.charAt(0).toUpperCase() + l.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View
        className={`gap-2 ${
          layout === 'grid'
            ? 'flex-row flex-wrap'
            : layout === 'masonry'
            ? 'flex-row flex-wrap'
            : 'flex-row'
        }`}
      >
        {items.map((item: any, idx: number) => (
          <View key={idx} className="relative w-24 h-24 rounded-lg overflow-hidden">
            <Image
              source={{ uri: item.url }}
              className="w-full h-full"
              style={{ resizeMode: 'cover' }}
            />
            <Pressable
              onPress={() => {
                const newItems = items.filter((_: any, i: number) => i !== idx);
                setItems(newItems);
                onSave({ items: newItems, layout });
              }}
              className="absolute top-1 right-1 bg-red-500 rounded-full p-1"
            >
              <Trash2 size={14} color="white" />
            </Pressable>
          </View>
        ))}

        <Pressable
          onPress={handleAddMedia}
          className="w-24 h-24 rounded-lg items-center justify-center"
          style={{
            borderWidth: 2,
            borderStyle: 'dashed',
            borderColor: isDark ? '#4b5563' : '#d1d5db',
            backgroundColor: isDark ? '#1f2937' : '#f3f4f6'
          }}
        >
          <Plus size={24} color={isDark ? '#9ca3af' : '#9ca3af'} />
        </Pressable>
      </View>
    </View>
  );
}

function BeforeAfterEditor({ section, onSave, talentId }: {
  section: PortfolioSection;
  onSave: (data: any) => void;
  talentId: string;
}) {
  const { isDark } = useTheme();
  const data = typeof section.data_json === 'string' ? JSON.parse(section.data_json) : section.data_json;
  const [beforeUrl, setBeforeUrl] = useState(data?.before?.url || '');
  const [afterUrl, setAfterUrl] = useState(data?.after?.url || '');
  const [beforeLabel, setBeforeLabel] = useState(data?.before?.label || 'Before');
  const [afterLabel, setAfterLabel] = useState(data?.after?.label || 'After');

  const pickImage = async (type: 'before' | 'after') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      aspect: [1, 1],
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      const fileName = `${talentId}/${Date.now()}-${type}.jpg`;

      try {
        const file = await fetch(uri).then(r => r.blob());

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('portfolio')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw uploadError;
        }


        const { data: publicUrlData } = supabase.storage
          .from('portfolio')
          .getPublicUrl(fileName);

        if (type === 'before') {
          setBeforeUrl(publicUrlData.publicUrl);
          const updateData = {
            before: { url: publicUrlData.publicUrl, label: beforeLabel },
            after: { url: afterUrl, label: afterLabel }
          };
          onSave(updateData);
        } else {
          setAfterUrl(publicUrlData.publicUrl);
          const updateData = {
            before: { url: beforeUrl, label: beforeLabel },
            after: { url: publicUrlData.publicUrl, label: afterLabel }
          };
          onSave(updateData);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : 'An error occurred';
        console.error('Upload failed:', errorMsg);
        Alert.alert('Upload failed', `Could not upload image: ${errorMsg}`);
      }
    }
  };

  return (
    <View
      className="p-4 border-b"
      style={{
        backgroundColor: isDark ? '#171717' : '#ffffff',
        borderBottomColor: isDark ? '#374151' : '#e5e7eb'
      }}
    >
      <View className="flex-row gap-4">
        {/* Before */}
        <View className="flex-1">
          <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDark ? '#ffffff' : '#171717' }}>Before</Text>
          <Pressable
            onPress={() => pickImage('before')}
            className="aspect-video rounded-lg items-center justify-center mb-2"
            style={{
              borderWidth: 2,
              borderStyle: 'dashed',
              borderColor: isDark ? '#4b5563' : '#d1d5db',
              backgroundColor: isDark ? '#1f2937' : '#f3f4f6'
            }}
          >
            {beforeUrl ? (
              <Image
                source={{ uri: beforeUrl }}
                className="w-full h-full rounded-lg"
                style={{ resizeMode: 'cover' }}
              />
            ) : (
              <View className="items-center gap-2">
                <Upload size={24} color={isDark ? '#9ca3af' : '#9ca3af'} />
                <Text style={{ fontSize: 12, color: isDark ? '#9ca3af' : '#6b7280' }}>Upload</Text>
              </View>
            )}
          </Pressable>
          <TextInput
            value={beforeLabel}
            onChangeText={(text) => {
              setBeforeLabel(text);
              onSave({
                before: { url: beforeUrl, label: text },
                after: { url: afterUrl, label: afterLabel }
              });
            }}
            placeholder="Label"
            placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
            style={{
              borderWidth: 1,
              borderColor: isDark ? '#374151' : '#e5e7eb',
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 8,
              fontSize: 12,
              backgroundColor: isDark ? '#1f2937' : '#ffffff',
              color: isDark ? '#ffffff' : '#171717'
            }}
          />
        </View>

        {/* After */}
        <View className="flex-1">
          <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDark ? '#ffffff' : '#171717' }}>After</Text>
          <Pressable
            onPress={() => pickImage('after')}
            className="aspect-video rounded-lg items-center justify-center mb-2"
            style={{
              borderWidth: 2,
              borderStyle: 'dashed',
              borderColor: isDark ? '#4b5563' : '#d1d5db',
              backgroundColor: isDark ? '#1f2937' : '#f3f4f6'
            }}
          >
            {afterUrl ? (
              <Image
                source={{ uri: afterUrl }}
                className="w-full h-full rounded-lg"
                style={{ resizeMode: 'cover' }}
              />
            ) : (
              <View className="items-center gap-2">
                <Upload size={24} color={isDark ? '#9ca3af' : '#9ca3af'} />
                <Text style={{ fontSize: 12, color: isDark ? '#9ca3af' : '#6b7280' }}>Upload</Text>
              </View>
            )}
          </Pressable>
          <TextInput
            value={afterLabel}
            onChangeText={(text) => {
              setAfterLabel(text);
              onSave({
                before: { url: beforeUrl, label: beforeLabel },
                after: { url: afterUrl, label: text }
              });
            }}
            placeholder="Label"
            placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
            style={{
              borderWidth: 1,
              borderColor: isDark ? '#374151' : '#e5e7eb',
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 8,
              fontSize: 12,
              backgroundColor: isDark ? '#1f2937' : '#ffffff',
              color: isDark ? '#ffffff' : '#171717'
            }}
          />
        </View>
      </View>
    </View>
  );
}

function EmbedEditor({ section, onSave }: {
  section: PortfolioSection;
  onSave: (data: any) => void;
}) {
  const { isDark } = useTheme();
  const data = typeof section.data_json === 'string' ? JSON.parse(section.data_json) : section.data_json;
  const [layout, setLayout] = useState(data?.layout || 'single');
  const [items, setItems] = useState(data?.items || [{ url: '', embed_type: 'youtube', title: '' }]);

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
    onSave({ layout, items: newItems });
  };

  const addItem = () => {
    const newItems = [...items, { url: '', embed_type: 'youtube', title: '' }];
    setItems(newItems);
    onSave({ layout, items: newItems });
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_: any, i: number) => i !== index);
    setItems(newItems);
    onSave({ layout, items: newItems });
  };

  return (
    <View
      className="p-4 border-b"
      style={{
        backgroundColor: isDark ? '#171717' : '#ffffff',
        borderBottomColor: isDark ? '#374151' : '#e5e7eb'
      }}
    >
      <View className="mb-4">
        <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: isDark ? '#ffffff' : '#171717' }}>Layout</Text>
        <View className="flex-row gap-2">
          {['single', 'side-by-side', 'triple'].map((l) => (
            <Pressable
              key={l}
              onPress={() => {
                setLayout(l);
                onSave({ layout: l, items });
              }}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: layout === l ? '#fa5610' : isDark ? '#374151' : '#e5e7eb'
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '500',
                  color: layout === l ? '#ffffff' : isDark ? '#d1d5db' : '#4b5563'
                }}
              >
                {l.replace('-', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View className="gap-4">
        {items.map((item: any, idx: number) => (
          <View
            key={idx}
            className="rounded-lg p-3"
            style={{
              borderWidth: 1,
              borderColor: isDark ? '#374151' : '#e5e7eb',
              backgroundColor: isDark ? '#1f2937' : '#f9fafb'
            }}
          >
            <View className="flex-row items-center justify-between mb-2">
              <Text style={{ fontSize: 12, fontWeight: '500', color: isDark ? '#9ca3af' : '#6b7280' }}>Embed {idx + 1}</Text>
              {items.length > 1 && (
                <Pressable onPress={() => removeItem(idx)}>
                  <X size={16} color="#ef4444" />
                </Pressable>
              )}
            </View>

            <TextInput
              value={item.url}
              onChangeText={(text) => updateItem(idx, 'url', text)}
              placeholder="Paste YouTube, Vimeo, or Figma URL..."
              placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
              style={{
                borderWidth: 1,
                borderColor: isDark ? '#374151' : '#e5e7eb',
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 8,
                marginBottom: 8,
                fontSize: 12,
                backgroundColor: isDark ? '#111827' : '#ffffff',
                color: isDark ? '#ffffff' : '#171717'
              }}
            />

            <TextInput
              value={item.title}
              onChangeText={(text) => updateItem(idx, 'title', text)}
              placeholder="Title (optional)"
              placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
              style={{
                borderWidth: 1,
                borderColor: isDark ? '#374151' : '#e5e7eb',
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 8,
                fontSize: 12,
                backgroundColor: isDark ? '#111827' : '#ffffff',
                color: isDark ? '#ffffff' : '#171717'
              }}
            />
          </View>
        ))}

        {items.length < 3 && (
          <Pressable
            onPress={addItem}
            className="rounded-lg p-3 items-center justify-center"
            style={{
              borderWidth: 2,
              borderStyle: 'dashed',
              borderColor: isDark ? '#4b5563' : '#d1d5db',
              backgroundColor: isDark ? '#1f2937' : '#f3f4f6'
            }}
          >
            <Plus size={16} color={isDark ? '#9ca3af' : '#9ca3af'} />
            <Text style={{ fontSize: 12, color: isDark ? '#9ca3af' : '#6b7280', marginTop: 4 }}>Add embed</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ============================================================================
// MAIN SCREEN
// ============================================================================
export default function CaseStudyEditorScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { isDark } = useTheme();
  const projectId = params.projectId as string;

  // Theme colors
  const colors = {
    bg: isDark ? '#0A0A0A' : '#ffffff',
    text: isDark ? '#ffffff' : '#171717',
    textSecondary: isDark ? '#9ca3af' : '#6b7280',
  };

  const [project, setProject] = useState<ProjectMetadata | null>(null);
  const [sections, setSections] = useState<PortfolioSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [addContentVisible, setAddContentVisible] = useState(false);
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
        console.error('[CaseStudyEditor] Error fetching talent ID:', err);
      }
    };
    fetchTalentId();
  }, [user?.id]);

  // Load project and sections
  useFocusEffect(
    useCallback(() => {
      if (projectId) {
        loadProjectAndSections();
      }
    }, [projectId])
  );

  const loadProjectAndSections = async () => {
    if (!projectId) return;
    try {
      setLoading(true);

      // Fetch project metadata
      const { data: projectData, error: projectError } = await supabase
        .from('portfolio_projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      // Fetch sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('portfolio_sections')
        .select('*')
        .eq('project_id', projectId)
        .order('position', { ascending: true });

      if (sectionsError) throw sectionsError;
      setSections(
        sectionsData.map((s: any) => ({
          ...s,
          data_json: typeof s.data_json === 'string' ? s.data_json : JSON.stringify(s.data_json || {}),
        }))
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : 'An error occurred';
      console.error('Load error:', errorMsg);
      Alert.alert('Error', 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSection = async (sectionType: string) => {
    try {
      const defaultData: Record<string, any> = {
        text_block: { title: '', body: '', alignment: 'left' },
        media_gallery: { items: [], layout: 'grid' },
        before_after: { before: { url: '', label: 'Before' }, after: { url: '', label: 'After' } },
        embed: { items: [{ url: '', embed_type: 'youtube', title: '' }], layout: 'single' },
      };

      const { data: newSection, error } = await supabase
        .from('portfolio_sections')
        .insert({
          project_id: projectId,
          type: sectionType,
          position: sections.length,
          data_json: JSON.stringify(defaultData[sectionType] || {}),
        })
        .select()
        .single();

      if (error) throw error;
      setSections([...sections, newSection]);
      setAddContentVisible(false);
    } catch (error) {
      const err = error as any;
      const errorMsg = err instanceof Error ? err.message : typeof err === 'string' ? err : 'An error occurred';
      console.error('Add section error:', errorMsg);
      Alert.alert('Error', 'Failed to add section');
    }
  };

  const handleUpdateSection = async (sectionId: string, newData: any) => {
    try {
      const section = sections.find((s) => s.id === sectionId);
      if (!section) {
        console.error('Section not found:', sectionId);
        return;
      }


      const dataToSave = JSON.stringify(newData);
      const { error } = await supabase
        .from('portfolio_sections')
        .update({ data_json: dataToSave })
        .eq('id', sectionId);

      if (error) {
        console.error('Supabase error:', extractErrorMessage(error));
        throw error;
      }


      setSections(
        sections.map((s) =>
          s.id === sectionId
            ? { ...s, data_json: dataToSave }
            : s
        )
      );
    } catch (error) {
      const err = error as any;
      const errorMsg = err instanceof Error ? err.message : typeof err === 'string' ? err : 'An error occurred';
      console.error('Update section error:', errorMsg);
      Alert.alert('Error', `Failed to save section: ${errorMsg}`);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    Alert.alert('Delete', 'Remove this section?', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            const { error } = await supabase
              .from('portfolio_sections')
              .delete()
              .eq('id', sectionId);

            if (error) throw error;
            setSections(sections.filter((s) => s.id !== sectionId));
          } catch (error) {
            const err = error as any;
            const errorMsg = err instanceof Error ? err.message : typeof err === 'string' ? err : 'An error occurred';
            console.error('Delete error:', errorMsg);
            Alert.alert('Error', 'Failed to delete section');
          }
        },
        style: 'destructive',
      },
    ]);
  };

  const handleDuplicateSection = async (sectionId: string) => {
    try {
      const section = sections.find((s) => s.id === sectionId);
      if (!section) return;

      const { data: newSection, error } = await supabase
        .from('portfolio_sections')
        .insert({
          project_id: projectId,
          type: section.type,
          position: section.position + 1,
          data_json: section.data_json,
        })
        .select()
        .single();

      if (error) throw error;

      const newSections = [...sections];
      newSections.splice(section.position + 1, 0, newSection);
      setSections(newSections);
    } catch (error) {
      const err = error as any;
      const errorMsg = err instanceof Error ? err.message : typeof err === 'string' ? err : 'An error occurred';
      console.error('Duplicate error:', errorMsg);
      Alert.alert('Error', 'Failed to duplicate section');
    }
  };

  const handleSave = async () => {
    if (!project) return;

    try {
      setIsSaving(true);

      const { error } = await supabase
        .from('portfolio_projects')
        .update({
          title: project.title,
          category: project.category,
          summary: project.summary,
          tags_json: project.tags_json,
          cover_media_url: project.cover_media_url,
        })
        .eq('id', projectId);

      if (error) {
        console.error('Supabase error:', extractErrorMessage(error));
        throw error;
      }

      setHasUnsavedChanges(false);
      Alert.alert('Success', 'Project saved successfully', [
        {
          text: 'OK',
          onPress: () => {
            router.push('/(talent)/portfolio');
          },
        },
      ]);
    } catch (error) {
      const err = error as any;
      const errorMsg = err instanceof Error ? err.message : typeof err === 'string' ? err : 'An error occurred';
      console.error('Save error:', errorMsg);
      Alert.alert('Error', `Failed to save project: ${errorMsg}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleProjectChange = (updates: Partial<ProjectMetadata>) => {
    setProject(project ? { ...project, ...updates } : null);
    setHasUnsavedChanges(true);
  };

  if (loading || !project) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#fa5610" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <StickyHeader
        title={project.title}
        onTitleChange={(text) => handleProjectChange({ title: text })}
        onSettingsPress={() => setSettingsVisible(true)}
        onSavePress={handleSave}
        onBackPress={() => router.push('/(talent)/portfolio')}
        isSaving={isSaving}
        hasUnsavedChanges={hasUnsavedChanges}
        isDark={isDark}
      />

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1" style={{ backgroundColor: isDark ? '#0A0A0A' : '#ffffff' }}>
        {sections.length === 0 ? (
          // Empty state
          <View className="items-center justify-center py-16 px-4">
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                backgroundColor: colors.bg === '#0A0A0A' ? '#1f2937' : '#f3f4f6',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <Plus size={28} color={colors.bg === '#0A0A0A' ? '#6b7280' : '#9ca3af'} />
            </View>
            <Text style={{ fontSize: 20, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
              Add your first section
            </Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 24 }}>
              Start building your project by adding content sections
            </Text>
            <Pressable
              onPress={() => setAddContentVisible(true)}
              className="bg-[#fa5610] px-6 py-3 rounded-lg"
            >
              <Text className="text-white text-sm font-medium">Add Section</Text>
            </Pressable>
          </View>
        ) : (
          // Sections list
          <View className="px-4 py-4 gap-4">
            {sections.map((section, idx) => {
              const sectionType = SECTION_TYPES.find((s) => s.id === section.type);
              return (
                <View
                  key={section.id}
                  className="border-2 border-[#fa5610] rounded-2xl overflow-hidden"
                >
                  {/* Header */}
                  <View
                    className="px-4 py-3 flex-row items-center justify-between"
                    style={{
                      backgroundColor: isDark ? '#1f2937' : '#f3f4f6',
                      borderBottomWidth: 1,
                      borderBottomColor: isDark ? '#374151' : '#e5e7eb'
                    }}
                  >
                    <View className="flex-row items-center gap-2 flex-1">
                      <GripVertical size={16} color={isDark ? '#9ca3af' : '#9ca3af'} />
                      <Text style={{ fontSize: 14, fontWeight: '600', color: isDark ? '#ffffff' : '#171717' }}>
                        {sectionType?.label}
                      </Text>
                    </View>
                    <View className="flex-row gap-2">
                      <Pressable
                        onPress={() => handleDuplicateSection(section.id)}
                        className="p-2"
                      >
                        <Copy size={18} color={isDark ? '#ffffff' : '#171717'} />
                      </Pressable>
                      <Pressable
                        onPress={() => handleDeleteSection(section.id)}
                        className="p-2"
                      >
                        <Trash2 size={18} color="#ef4444" />
                      </Pressable>
                    </View>
                  </View>

                  {/* Editor */}
                  {section.type === 'text_block' && (
                    <TextBlockEditor
                      section={section}
                      onSave={(data) =>
                        handleUpdateSection(section.id, data)
                      }
                    />
                  )}
                  {section.type === 'media_gallery' && (
                    <MediaGalleryEditor
                      section={section}
                      onSave={(data) =>
                        handleUpdateSection(section.id, data)
                      }
                      talentId={talentId || ''}
                    />
                  )}
                  {section.type === 'before_after' && (
                    <BeforeAfterEditor
                      section={section}
                      onSave={(data) =>
                        handleUpdateSection(section.id, data)
                      }
                      talentId={talentId || ''}
                    />
                  )}
                  {section.type === 'embed' && (
                    <EmbedEditor
                      section={section}
                      onSave={(data) =>
                        handleUpdateSection(section.id, data)
                      }
                    />
                  )}
                </View>
              );
            })}

            {/* Add Section Button */}
            <Pressable
              onPress={() => setAddContentVisible(true)}
              className="rounded-lg py-6 items-center justify-center"
              style={{
                borderWidth: 2,
                borderStyle: 'dashed',
                borderColor: isDark ? '#4b5563' : '#d1d5db',
                backgroundColor: isDark ? '#1f2937' : '#f3f4f6'
              }}
            >
              <Plus size={20} color={isDark ? '#9ca3af' : '#9ca3af'} />
              <Text style={{ fontSize: 14, color: isDark ? '#9ca3af' : '#6b7280', marginTop: 4 }}>Add Section</Text>
            </Pressable>

            <View className="h-8" />
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      <SettingsSheet
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        project={project}
        onProjectChange={handleProjectChange}
      />

      <AddContentModal
        visible={addContentVisible}
        onClose={() => setAddContentVisible(false)}
        onSelectType={handleAddSection}
      />
    </View>
  );
}
