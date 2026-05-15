import { View, Text, Pressable, ActivityIndicator, Modal, Alert, Linking } from 'react-native';
import { X, Download } from 'lucide-react-native';
import { useTheme } from '@/lib/theme/ThemeContext';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useAudioPlayer } from 'expo-audio';
import * as WebBrowser from 'expo-web-browser';

interface AttachmentViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filePath?: string;
  fileName?: string;
}

export function AttachmentViewer({
  open,
  onOpenChange,
  filePath,
  fileName,
}: AttachmentViewerProps) {
  const { isDark } = useTheme();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const generateSignedUrl = async () => {
      if (!filePath) return;

      try {
        setLoading(true);
        const { data } = await supabase.storage
          .from('deliverables')
          .createSignedUrl(filePath, 3600);

        if (data?.signedUrl) {
          setSignedUrl(data.signedUrl);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : 'An error occurred';
        console.error('Error creating signed URL:', errorMsg);
        Alert.alert('Error', 'Failed to load attachment');
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      generateSignedUrl();
    } else {
      setSignedUrl(null);
    }
  }, [open, filePath]);

  if (!filePath) return null;

  const isPdf = filePath.toLowerCase().endsWith('.pdf');
  const isImage = !!filePath.match(/\.(jpg|jpeg|png|gif|webp|heic)$/i);
  const isVideo = !!filePath.match(/\.(mp4|webm|mov|m4v)$/i);
  const isAudio = !!filePath.match(/\.(mp3|wav|m4a|aac|ogg)$/i);

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={() => onOpenChange(false)}
    >
      <View className={`flex-1 ${isDark ? 'bg-[#0A0A0A]' : 'bg-white'}`}>
        <View className={`flex-row items-center justify-between px-4 py-4 border-b ${isDark ? 'bg-[#1A1A1A] border-gray-800' : 'bg-white border-gray-200'}`}>
          <Text className={`font-semibold text-base flex-1 ${isDark ? 'text-white' : 'text-gray-900'}`} numberOfLines={1}>
            {fileName || 'Attachment'}
          </Text>
          <Pressable onPress={() => onOpenChange(false)} className="p-2">
            <X size={20} color={isDark ? '#D1D5DB' : '#374151'} />
          </Pressable>
        </View>

        <View className="flex-1 items-center justify-center">
          {loading ? (
            <ActivityIndicator size="large" color="#3B82F6" />
          ) : !signedUrl ? (
            <Text className={`text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Failed to load attachment
            </Text>
          ) : isImage ? (
            <Image
              source={{ uri: signedUrl }}
              style={{ width: '100%', height: '100%' }}
              contentFit="contain"
              transition={200}
            />
          ) : isVideo ? (
            <VideoPlayerView uri={signedUrl} />
          ) : isAudio ? (
            <AudioPlayerView uri={signedUrl} fileName={fileName} isDark={isDark} />
          ) : isPdf ? (
            <ExternalOpener
              uri={signedUrl}
              label="Open PDF"
              isDark={isDark}
            />
          ) : (
            <ExternalOpener
              uri={signedUrl}
              label="Open File"
              isDark={isDark}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

function VideoPlayerView({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.play();
  });

  return (
    <VideoView
      player={player}
      style={{ width: '100%', height: '100%' }}
      contentFit="contain"
      allowsFullscreen
      allowsPictureInPicture
    />
  );
}

function AudioPlayerView({ uri, fileName, isDark }: { uri: string; fileName?: string; isDark: boolean }) {
  const player = useAudioPlayer({ uri });
  const [playing, setPlaying] = useState(false);

  return (
    <View className="items-center gap-6 px-6">
      <View className={`w-32 h-32 rounded-full items-center justify-center ${isDark ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
        <Text style={{ fontSize: 48 }}>🎵</Text>
      </View>
      <Text className={`text-center font-medium ${isDark ? 'text-white' : 'text-gray-900'}`} numberOfLines={2}>
        {fileName || 'Audio'}
      </Text>
      <Pressable
        onPress={() => {
          if (playing) {
            player.pause();
            setPlaying(false);
          } else {
            player.play();
            setPlaying(true);
          }
        }}
        className={`px-8 py-4 rounded-full ${isDark ? 'bg-blue-600' : 'bg-blue-500'}`}
      >
        <Text className="font-semibold text-white text-base">
          {playing ? 'Pause' : 'Play'}
        </Text>
      </Pressable>
    </View>
  );
}

function ExternalOpener({ uri, label, isDark }: { uri: string; label: string; isDark: boolean }) {
  return (
    <View className="items-center gap-4 px-6">
      <Text className={`text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        Tap below to open this file.
      </Text>
      <Pressable
        onPress={async () => {
          try {
            await WebBrowser.openBrowserAsync(uri);
          } catch {
            try {
              await Linking.openURL(uri);
            } catch {
              Alert.alert('Error', 'Could not open file.');
            }
          }
        }}
        className={`flex-row items-center gap-2 px-6 py-3 rounded-lg ${isDark ? 'bg-blue-600' : 'bg-blue-500'}`}
      >
        <Download size={18} color="#fff" />
        <Text className="font-semibold text-white">{label}</Text>
      </Pressable>
    </View>
  );
}
