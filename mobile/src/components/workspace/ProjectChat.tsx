import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { useTheme } from '@/lib/theme/ThemeContext';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Paperclip, Image as ImageIcon, Send, CheckCheck, Check, X } from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { useChat, Message } from '@/hooks/useChat';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePickerLib from 'expo-image-picker';
import { uploadFile } from '@/lib/upload';

const PLACEHOLDER_AVATAR = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop';

interface ProjectChatProps {
  bookingId: string;
}

export function ProjectChat({ bookingId }: ProjectChatProps) {
  const { isDark } = useTheme();
  const { messages, isLoading, sendMessage, markAsRead, currentUserId, typingUsers, setTyping, thread } = useChat(bookingId);

  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const scrollViewRef = useRef<ScrollView>(null);

  // No longer need signed URLs since we're using CDN URLs directly from backend
  // Keeping signedUrls state for compatibility but it's not used

  // Auto-scroll to bottom
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  // Content moderation - check for phone numbers and emails
  const validateMessage = (text: string): boolean => {
    const phoneRegex = /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|(\+\d{1,3}[-.\s]?)?\d{10,}/;
    const emailRegex = /[^\s@]+@[^\s@]+\.[^\s@]+/;

    if (phoneRegex.test(text) || emailRegex.test(text)) {
      Alert.alert('Warning', 'Phone numbers and email addresses cannot be shared in chat for your protection.');
      return false;
    }
    return true;
  };

  const handleSendMessage = useCallback(async () => {
    if ((!newMessage.trim() && !selectedFile) || !currentUserId) return;

    if (newMessage.trim() && !validateMessage(newMessage)) {
      return;
    }

    try {
      setIsSending(true);
      setTyping(false);

      let attachmentPath: string | undefined;

      // Upload file if selected
      if (selectedFile) {
        setIsUploading(true);
        const fileName = selectedFile.name || `file_${Date.now()}`;

        try {
          console.log('[ProjectChat] Starting upload:', {
            fileName,
            uri: selectedFile.uri,
            type: selectedFile.type,
          });

          const uploadedFile = await uploadFile(selectedFile.uri, fileName, selectedFile.type);
          console.log('[ProjectChat] Upload completed successfully:', { url: uploadedFile.cdnUrl || uploadedFile.url });
          attachmentPath = uploadedFile.cdnUrl || uploadedFile.url;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error';
          console.error('[ProjectChat] File upload error:', errorMsg);
          Alert.alert('Upload Error', errorMsg);
          setIsUploading(false);
          setIsSending(false);
          return;
        }

        setIsUploading(false);
      }

      // Send message
      const messageContent = newMessage.trim() || (selectedFile ? `Sent a file: ${selectedFile.name}` : '');
      console.log('[ProjectChat] Sending chat message:', {
        hasText: !!newMessage.trim(),
        hasAttachment: !!attachmentPath,
        contentLength: messageContent.length,
      });

      await sendMessage(messageContent, attachmentPath);
      setNewMessage('');
      setSelectedFile(null);
      setPreviewUrl(null);

      // Scroll to new message
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);

      console.log('[ProjectChat] Message sent successfully');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error occurred';
      console.error('[ProjectChat] Error in handleSendMessage:', errorMsg);
      Alert.alert('Error', `Failed to send message: ${errorMsg}`);
    } finally {
      setIsSending(false);
    }
  }, [newMessage, selectedFile, currentUserId, bookingId, sendMessage, setTyping, validateMessage]);

  const handleFileSelect = useCallback((file: any) => {
    if (file.size > 10 * 1024 * 1024) {
      Alert.alert('Error', 'File size must be less than 10MB');
      return;
    }
    setSelectedFile(file);

    // Generate preview for images
    if (file.type?.startsWith('image/')) {
      setPreviewUrl(file.uri);
    } else {
      setPreviewUrl(null);
    }
  }, []);

  // Handle document picker (all file types)
  const handlePickFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      if (file) {
        handleFileSelect({
          uri: file.uri,
          name: file.name,
          size: file.size || 0,
          type: file.mimeType || 'application/octet-stream',
        });
        console.log('[ProjectChat] File selected:', { name: file.name, size: file.size, type: file.mimeType });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error';
      console.error('Error picking file:', errorMsg);
      Alert.alert('Error', 'Failed to pick file');
    }
  }, [handleFileSelect]);

  // Handle image/media picker
  const handlePickImage = useCallback(async () => {
    try {
      const result = await ImagePickerLib.launchImageLibraryAsync({
        mediaTypes: ImagePickerLib.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 0.8,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      if (asset) {
        handleFileSelect({
          uri: asset.uri,
          name: asset.fileName || 'media',
          size: asset.fileSize || 0,
          type: asset.type === 'image' ? 'image/jpeg' : asset.type === 'video' ? 'video/mp4' : 'application/octet-stream',
        });
        console.log('[ProjectChat] Image selected:', { name: asset.fileName, size: asset.fileSize, type: asset.type });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error';
      console.error('Error picking image:', errorMsg);
      Alert.alert('Error', 'Failed to pick image');
    }
  }, [handleFileSelect]);

  if (isLoading) {
    return (
      <View className={`flex-1 items-center justify-center ${isDark ? 'bg-[#0A0A0A]' : 'bg-white'}`}>
        <ActivityIndicator size="large" color={isDark ? '#3B82F6' : '#3B82F6'} />
      </View>
    );
  }

  return (
    <View className={`flex-1 ${isDark ? 'bg-[#0A0A0A]' : 'bg-white'}`}>
      {/* Messages Area */}
      {messages.length === 0 ? (
        <Animated.View entering={FadeInUp.duration(400)} className="flex-1 items-center justify-center px-4">
          <Text className={`text-lg font-semibold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            No messages yet
          </Text>
          <Text className={`text-sm mt-2 text-center ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
            Start the conversation!
          </Text>
        </Animated.View>
      ) : (
        <ScrollView
          ref={scrollViewRef}
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message, idx) => {
            const isOwnMessage = message.sender_user_id === currentUserId;
            const attachmentUrl = message.attachment_url;

            return (
              <Animated.View key={message.id || `msg-${idx}`} entering={FadeInUp.duration(300)} className="mb-4">
                {!isOwnMessage && (
                  <View className="flex-row items-center gap-2 mb-2">
                    {message.sender?.avatar_url ? (
                      <Image
                        source={{ uri: message.sender.avatar_url }}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <View className={`w-8 h-8 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
                    )}
                    <Text className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {message.sender?.full_name || 'Unknown'}
                    </Text>
                  </View>
                )}

                <View className={`flex-row ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                  <View
                    className={`px-4 py-3 rounded-2xl ${
                      isOwnMessage
                        ? 'bg-violet-600 rounded-tr-none'
                        : isDark
                          ? 'bg-gray-800 rounded-tl-none'
                          : 'bg-gray-100 rounded-tl-none'
                    }`}
                    style={{ maxWidth: '75%' }}
                  >
                    {!!message.message_text && (
                      <Text
                        className={`text-sm ${isOwnMessage ? 'text-white' : isDark ? 'text-white' : 'text-gray-900'}`}
                      >
                        {message.message_text}
                      </Text>
                    )}

                    {/* Attachment preview */}
                    {!!attachmentUrl && (
                      <View className="mt-2">
                        {message.attachment_url?.endsWith('.pdf') ? (
                          <View className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                            <Text className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                              📄 PDF Document
                            </Text>
                          </View>
                        ) : message.attachment_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                          <Image
                            source={{ uri: attachmentUrl }}
                            style={{ width: 200, height: 150, borderRadius: 8, marginBottom: 8 }}
                          />
                        ) : (
                          <View className={`p-2 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                            <Text className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                              📎 Attachment
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    <View className="flex-row items-center justify-between mt-1 gap-2">
                      <Text
                        className={`text-xs ${
                          isOwnMessage ? 'text-violet-100' : isDark ? 'text-gray-500' : 'text-gray-400'
                        }`}
                      >
                        {format(new Date(message.created_at), 'h:mm a')}
                      </Text>
                      {!!isOwnMessage && (
                        <View className="flex-row gap-0.5">
                          {message.read_at ? (
                            <CheckCheck size={14} color="rgba(255, 255, 255, 0.7)" />
                          ) : (
                            <Check size={14} color="rgba(255, 255, 255, 0.5)" />
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </Animated.View>
            );
          })}

          {/* Typing indicator */}
          {typingUsers.size > 0 && (
            <View className="mb-4">
              <View className={`px-4 py-2 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {typingUsers.size} user{typingUsers.size > 1 ? 's' : ''} typing...
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* File Preview */}
      {!!selectedFile && (
        <View className={`px-4 py-3 flex-row items-center gap-3 border-t ${isDark ? 'border-gray-800 bg-[#1A1A1A]' : 'border-gray-200 bg-white'}`}>
          {!!previewUrl ? (
            <Image source={{ uri: previewUrl }} className="w-12 h-12 rounded-lg" />
          ) : (
            <View className={`w-12 h-12 rounded-lg flex items-center justify-center ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <Text className={`text-xl ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>📎</Text>
            </View>
          )}
          <View className="flex-1">
            <Text className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`} numberOfLines={1}>
              {selectedFile.name || 'File'}
            </Text>
            <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </Text>
          </View>
          <Pressable onPress={() => {
            setSelectedFile(null);
            setPreviewUrl(null);
          }} className="p-2">
            <X size={18} color={isDark ? '#9CA3AF' : '#6B7280'} />
          </Pressable>
        </View>
      )}

      {/* Message Input */}
      <Animated.View
        entering={FadeInUp.delay(100).duration(400)}
        className={`px-4 py-3 border-t ${isDark ? 'border-gray-800 bg-[#1A1A1A]' : 'border-gray-200 bg-white'}`}
      >
        <View
          className={`flex-row items-center gap-3 px-4 py-3 rounded-full border ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}
        >
          {/* Attachment Button - Opens all file types */}
          <Pressable
            onPress={handlePickFile}
            disabled={isSending || isUploading}
            className="p-2"
          >
            {isUploading ? (
              <ActivityIndicator size="small" color="#FA5610" />
            ) : (
              <Paperclip
                size={18}
                color={(isSending || isUploading) ? '#9CA3AF' : '#6B7280'}
              />
            )}
          </Pressable>

          {/* Image Button - Opens media files */}
          <Pressable
            onPress={handlePickImage}
            disabled={isSending || isUploading}
            className="p-2"
          >
            <ImageIcon
              size={18}
              color={(isSending || isUploading) ? '#9CA3AF' : '#6B7280'}
            />
          </Pressable>

          {/* Text Input */}
          <TextInput
            placeholder="Type a message..."
            value={newMessage}
            onChangeText={(text) => {
              setNewMessage(text);
              setTyping(text.length > 0);
            }}
            placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
            multiline
            maxLength={500}
            className={`flex-1 text-sm py-2 ${isDark ? 'text-white' : 'text-gray-900'}`}
            editable={!isSending && !isUploading}
          />

          {/* Send Button */}
          <Pressable
            onPress={handleSendMessage}
            disabled={(!newMessage.trim() && !selectedFile) || isSending || isUploading}
            className={`p-2 rounded-full ${(!newMessage.trim() && !selectedFile) || isSending || isUploading ? 'opacity-50' : ''}`}
          >
            {isSending || isUploading ? (
              <ActivityIndicator size="small" color="#FA5610" />
            ) : (
              <Send
                size={18}
                color={newMessage.trim() || selectedFile ? '#FA5610' : '#9CA3AF'}
              />
            )}
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}
