import { View, Text, Pressable, ScrollView, Modal, TextInput, Image } from 'react-native';
import { useTheme } from '@/lib/theme/ThemeContext';
import { useFileAssets } from '@/hooks/useFileAssets';
import { useDeliverables } from '@/hooks/useDeliverables';
import { useState, useEffect } from 'react';
import { FileText, Download, Eye, Trash2, CheckCircle, AlertCircle, Clock, Upload, Link2 } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

interface FileDeliveryProps {
  bookingId: string;
  isClient: boolean;
  talentCategory?: string | null;
  bookingStatus?: string;
  onMarkDelivered?: () => void;
  isMarkingDelivered?: boolean;
}

export function FileDelivery({
  bookingId,
  isClient,
  bookingStatus,
  onMarkDelivered,
  isMarkingDelivered,
}: FileDeliveryProps) {
  const { isDark } = useTheme();
  const { files, loading, fetchFiles, uploadFile, addLink, approveFile, requestRevision, deleteFile, getProgress, downloadFile } =
    useFileAssets(bookingId);
  const { deliverables, fetchDeliverables } = useDeliverables(bookingId);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [showRevisionDialog, setShowRevisionDialog] = useState(false);
  const [previewFile, setPreviewFile] = useState<any>(null);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchFiles();
    fetchDeliverables();
  }, [bookingId]);

  const progress = getProgress();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return '#22C55E';
      case 'revision_requested':
        return '#EF4444';
      default:
        return '#F59E0B';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'revision_requested':
        return 'Revision Needed';
      default:
        return 'Pending';
    }
  };

  const handleRevisionSubmit = async () => {
    if (selectedFileId && revisionNotes.trim()) {
      await requestRevision(selectedFileId, revisionNotes);
      setRevisionNotes('');
      setSelectedFileId(null);
      setShowRevisionDialog(false);
    }
  };

  const handleUploadFiles = async () => {
    try {
      setUploading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        quality: 0.8,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        if (asset.uri) {
          console.log('[FileDelivery] Uploading asset:', { uri: asset.uri, type: asset.type });

          // Get proper filename
          let filename = asset.fileName || asset.uri.split('/').pop() || `file-${Date.now()}`;

          try {
            // Fetch the asset as a blob
            const response = await fetch(asset.uri);
            if (!response.ok) {
              throw new Error(`Failed to fetch asset: ${response.statusText}`);
            }

            const blob = await response.blob();
            console.log('[FileDelivery] Blob size:', blob.size);

            // Determine proper MIME type
            let mimeType = 'application/octet-stream';
            if (asset.type === 'image') {
              mimeType = 'image/jpeg';
              if (!filename.includes('.')) filename += '.jpg';
            } else if (asset.type === 'video') {
              mimeType = 'video/mp4';
              if (!filename.includes('.')) filename += '.mp4';
            }

            const file = new File([blob], filename, { type: mimeType });
            console.log('[FileDelivery] Created file:', { name: file.name, size: file.size, type: file.type });

            await uploadFile(file);
            console.log('[FileDelivery] Upload completed');
            await fetchFiles();
          } catch (uploadErr) {
            const errorMsg = uploadErr instanceof Error ? uploadErr.message : typeof uploadErr === 'string' ? uploadErr : 'Unknown error';
            console.error('[FileDelivery] Upload error:', errorMsg);
            alert('Failed to upload file: ' + errorMsg);
          }
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error';
      console.error('Error in handleUploadFiles:', errorMsg);
      alert('Error selecting file: ' + errorMsg);
    } finally {
      setUploading(false);
    }
  };

  const handleAddLink = async () => {
    if (!linkUrl.trim() || !linkTitle.trim()) {
      alert('Please enter both a title and URL');
      return;
    }

    try {
      console.log('[FileDelivery] Adding link:', { linkTitle, linkUrl });
      setUploading(true);
      const result = await addLink(linkUrl.trim(), linkTitle.trim());
      console.log('[FileDelivery] Link added successfully:', result);

      // Success feedback
      alert('Link added successfully!');

      // Clear form
      setLinkUrl('');
      setLinkTitle('');
      setShowLinkDialog(false);

      // Refresh files list in background (don't wait for it)
      fetchFiles().catch(err => console.error('Error refreshing files:', err));
    } catch (error) {
      const message = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error';
      console.error('[FileDelivery] Error adding link:', message, error);
      alert('Failed to add link: ' + message);
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadFile = async (file: any) => {
    try {
      console.log('[FileDelivery] Download request:', { fileName: file.file_name, fileUrl: file.file_url });

      // Validate file has a URL
      if (!file.file_url || file.file_url === '') {
        console.error('[FileDelivery] Invalid file URL:', file.file_url);
        alert('File URL not available - please try uploading again');
        return;
      }

      // Get signed URL from hook (handles both files and links)
      let downloadUrl: string;
      try {
        downloadUrl = await downloadFile(file);
        console.log('[FileDelivery] Got signed URL for download');
      } catch (err) {
        console.error('[FileDelivery] Failed to get signed URL:', err);
        alert('Failed to prepare download');
        return;
      }

      // For links, just open them
      if (file.asset_type === 'link' && downloadUrl.startsWith('http')) {
        console.log('[FileDelivery] Opening link');
        if (typeof window !== 'undefined' && window.open) {
          window.open(downloadUrl, '_blank');
        }
        return;
      }

      // Try to use Expo FileSystem for mobile first
      if (FileSystem && FileSystem.documentDirectory) {
        try {
          const fileName = file.file_name || `download-${Date.now()}`;
          const downloadPath = FileSystem.documentDirectory + fileName;

          console.log('[FileDelivery] Mobile download attempt to:', downloadPath);

          const downloadResult = await FileSystem.downloadAsync(
            downloadUrl,
            downloadPath,
            {
              cache: true,
            }
          );

          if (downloadResult.status === 200) {
            console.log('[FileDelivery] Mobile download successful:', downloadResult.uri);
            alert(`✅ Downloaded: ${fileName}\n\nSaved to: Documents folder`);
            return;
          } else {
            console.warn('[FileDelivery] Mobile download status:', downloadResult.status);
            throw new Error('Download status: ' + downloadResult.status);
          }
        } catch (mobileError) {
          console.error('[FileDelivery] Mobile download failed:', mobileError);
          // Continue to try web method
        }
      }

      // Web platform download
      if (typeof window !== 'undefined' && window.document) {
        console.log('[FileDelivery] Attempting web download');

        try {
          // Use signed URL directly (no CORS issues)
          console.log('[FileDelivery] Fetch with signed URL');

          const response = await fetch(downloadUrl, {
            method: 'GET',
          });

          if (!response.ok) {
            console.error('[FileDelivery] Fetch response:', response.status, response.statusText);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const blob = await response.blob();
          console.log('[FileDelivery] Blob created:', blob.size, 'bytes');

          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = file.file_name || 'download';
          link.style.display = 'none';

          document.body.appendChild(link);
          link.click();

          // Clean up
          setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
          }, 100);

          console.log('[FileDelivery] Web download triggered');
          alert(`✅ Downloaded: ${file.file_name}`);
          return;
        } catch (fetchError) {
          console.error('[FileDelivery] Fetch method failed:', fetchError);

          // Fallback - direct link
          try {
            console.log('[FileDelivery] Fallback: Direct link click');

            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = file.file_name || 'download';
            link.target = '_blank';
            link.style.display = 'none';

            document.body.appendChild(link);
            link.click();

            setTimeout(() => {
              document.body.removeChild(link);
            }, 100);

            alert(`✅ Download started: ${file.file_name}`);
            return;
          } catch (fallbackError) {
            console.error('[FileDelivery] All download methods failed:', fallbackError);
            alert('Failed to download file - please try again');
          }
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : 'An error occurred';
      console.error('[FileDelivery] Download error:', errorMsg);
      alert('Error downloading file');
    }
  };


  if (loading) {
    return (
      <View className="flex-1 justify-center items-center py-8">
        <Text className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Loading files...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      {/* Summary Cards */}
      <Animated.View entering={FadeInUp.duration(400)} className="flex-row gap-3 mx-4 mt-4 mb-4">
        {/* Pending Card */}
        <View
          className={`flex-1 p-4 rounded-2xl items-center justify-center ${isDark ? 'bg-[#1A1A1A]' : 'bg-white'}`}
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
          }}>
          <Text className="text-3xl font-bold text-yellow-500">{progress.pending}</Text>
          <Text className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Pending</Text>
        </View>

        {/* Approved Card */}
        <View
          className={`flex-1 p-4 rounded-2xl items-center justify-center ${isDark ? 'bg-[#1A1A1A]' : 'bg-white'}`}
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
          }}>
          <Text className="text-3xl font-bold text-green-500">{progress.approved}</Text>
          <Text className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Approved</Text>
        </View>

        {/* Revisions Card */}
        <View
          className={`flex-1 p-4 rounded-2xl items-center justify-center ${isDark ? 'bg-[#1A1A1A]' : 'bg-white'}`}
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
          }}>
          <Text className="text-3xl font-bold text-red-500">{progress.revision}</Text>
          <Text className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Revisions</Text>
        </View>
      </Animated.View>

      {/* Upload Buttons (Talent Only) */}
      {!isClient ? (
        <Animated.View entering={FadeInUp.delay(100).duration(400)} className="mx-4 mb-4 flex-row gap-3">
          {/* Upload Files Button */}
          <Pressable
            onPress={handleUploadFiles}
            disabled={uploading}
            className={`flex-1 py-6 rounded-2xl items-center justify-center border-2 border-dashed ${
              isDark ? 'border-gray-700 bg-gray-900/50' : 'border-gray-300 bg-gray-50'
            } ${uploading ? 'opacity-60' : ''}`}>
            <Upload size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
            <Text className={`text-sm font-semibold mt-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {uploading ? 'Uploading...' : 'Upload Files'}
            </Text>
          </Pressable>

          {/* Add Link Button */}
          <Pressable
            onPress={() => setShowLinkDialog(true)}
            disabled={uploading}
            className={`flex-1 py-6 rounded-2xl items-center justify-center border-2 border-dashed ${
              isDark ? 'border-gray-700 bg-gray-900/50' : 'border-gray-300 bg-gray-50'
            } ${uploading ? 'opacity-60' : ''}`}>
            <Link2 size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
            <Text className={`text-sm font-semibold mt-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Add Link
            </Text>
          </Pressable>
        </Animated.View>
      ) : null}

      {/* Helper Text */}
      {!isClient ? (
        <Animated.View entering={FadeInUp.delay(150).duration(400)} className="mx-4 mb-6">
          <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Share files directly or use Google Drive, Dropbox, WeTransfer links
          </Text>
        </Animated.View>
      ) : null}

      {/* Files List */}
      {files.length === 0 ? (
        <Animated.View
          entering={FadeInUp.delay(200).duration(400)}
          className={`mx-4 mb-4 py-12 rounded-2xl items-center justify-center ${isDark ? 'bg-[#1A1A1A]' : 'bg-white'}`}
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
          }}>
          <FileText size={48} color={isDark ? '#4B5563' : '#D1D5DB'} />
          <Text className={`mt-3 text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            No files delivered yet
          </Text>
        </Animated.View>
      ) : (
        <Animated.View entering={FadeInUp.delay(200).duration(400)} className="mx-4 mb-4">
          {files.map((file, index) => (
            <Animated.View
              key={file.id}
              entering={FadeInUp.delay(300 + index * 50).duration(400)}
              className={`mb-3 p-4 rounded-2xl overflow-hidden ${isDark ? 'bg-[#1A1A1A]' : 'bg-white'}`}
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 2,
              }}>
              {/* For Links - Show preview card style */}
              {file.asset_type === 'link' ? (
                <View>
                  {/* Link Preview Card */}
                  <View className="flex-row items-center gap-3 mb-3">
                    {/* Link Icon Container */}
                    <View className={`w-16 h-16 rounded-2xl items-center justify-center ${isDark ? 'bg-orange-900/40' : 'bg-orange-100'}`}>
                      <Link2 size={28} color="#d97706" />
                    </View>

                    {/* Link Info */}
                    <View className="flex-1">
                      <Text className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {file.file_name}
                      </Text>
                      <Text className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} numberOfLines={1}>
                        {file.link_url}
                      </Text>
                    </View>

                    {/* Status Badge */}
                    <View
                      className="px-2 py-1 rounded-full flex-row items-center gap-1"
                      style={{ backgroundColor: `${getStatusColor(file.approved_status)}20` }}>
                      {file.approved_status === 'approved' && (
                        <CheckCircle size={12} color={getStatusColor(file.approved_status)} />
                      )}
                      {file.approved_status === 'revision_requested' && (
                        <AlertCircle size={12} color={getStatusColor(file.approved_status)} />
                      )}
                      {file.approved_status === 'pending' && (
                        <Clock size={12} color={getStatusColor(file.approved_status)} />
                      )}
                      <Text className="text-xs font-medium" style={{ color: getStatusColor(file.approved_status) }}>
                        {getStatusLabel(file.approved_status)}
                      </Text>
                    </View>
                  </View>

                  {/* Link Actions */}
                  <View className="flex-row gap-2">
                    {/* Open Link Button */}
                    <Pressable
                      className={`flex-1 py-2 rounded-lg items-center justify-center ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}
                      onPress={() => {
                        if (file.link_url) {
                          // Open link in new tab/window
                          if (typeof window !== 'undefined') {
                            window.open(file.link_url, '_blank');
                          }
                        }
                      }}>
                      <Ionicons name="open-outline" size={16} color={isDark ? '#E5E7EB' : '#374151'} />
                    </Pressable>

                    {/* Delete Button */}
                    <Pressable
                      className="flex-1 py-2 rounded-lg items-center justify-center bg-red-500"
                      onPress={() => deleteFile(file.id)}>
                      <Trash2 size={16} color="white" />
                    </Pressable>
                  </View>
                </View>
              ) : (
                /* For Files - Show existing layout */
                <View>
                  {/* File Header */}
                  <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-1">
                      <Text className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {file.file_name}
                      </Text>
                      <Text className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        v{file.version}
                      </Text>
                    </View>

                    {/* Status Badge */}
                    <View
                      className="px-3 py-1 rounded-full flex-row items-center gap-1"
                      style={{ backgroundColor: `${getStatusColor(file.approved_status)}20` }}>
                      {file.approved_status === 'approved' && (
                        <CheckCircle size={12} color={getStatusColor(file.approved_status)} />
                      )}
                      {file.approved_status === 'revision_requested' && (
                        <AlertCircle size={12} color={getStatusColor(file.approved_status)} />
                      )}
                      {file.approved_status === 'pending' && (
                        <Clock size={12} color={getStatusColor(file.approved_status)} />
                      )}
                      <Text className="text-xs font-medium" style={{ color: getStatusColor(file.approved_status) }}>
                        {getStatusLabel(file.approved_status)}
                      </Text>
                    </View>
                  </View>

                  {/* Revision Notes */}
                  {file.revision_notes ? (
                    <View className={`mb-3 p-3 rounded-xl ${isDark ? 'bg-red-900/20' : 'bg-red-50'}`}>
                      <Text className={`text-xs font-medium ${isDark ? 'text-red-300' : 'text-red-700'}`}>
                        Revision Requested:
                      </Text>
                      <Text className={`text-xs mt-1 ${isDark ? 'text-red-200' : 'text-red-600'}`}>
                        {file.revision_notes}
                      </Text>
                    </View>
                  ) : null}

                  {/* Action Buttons */}
                  {!isClient ? (
                    <View className="flex-row gap-2">
                      <Pressable
                        className={`flex-1 py-2 rounded-lg items-center justify-center ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}
                        onPress={() => setPreviewFile(file)}>
                        <Eye size={16} color={isDark ? '#E5E7EB' : '#374151'} />
                      </Pressable>
                      <Pressable
                        className={`flex-1 py-2 rounded-lg items-center justify-center ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}
                        onPress={() => handleDownloadFile(file)}>
                        <Download size={16} color={isDark ? '#E5E7EB' : '#374151'} />
                      </Pressable>
                      <Pressable
                        className="flex-1 py-2 rounded-lg items-center justify-center bg-red-500"
                        onPress={() => deleteFile(file.id)}>
                        <Trash2 size={16} color="white" />
                      </Pressable>
                    </View>
                  ) : null}

                  {/* Client Actions */}
                  {isClient ? (
                    <View className="flex-row gap-2">
                      {file.approved_status !== 'approved' ? (
                        <View className="flex-row gap-2">
                          <Pressable
                            className="flex-1 py-2 rounded-lg items-center justify-center bg-green-500"
                            onPress={() => approveFile(file.id)}>
                            <Text className="text-white text-sm font-semibold">Approve</Text>
                          </Pressable>
                          <Pressable
                            className="flex-1 py-2 rounded-lg items-center justify-center bg-red-500"
                            onPress={() => {
                              setSelectedFileId(file.id);
                              setShowRevisionDialog(true);
                            }}>
                            <Text className="text-white text-sm font-semibold">Request Revision</Text>
                          </Pressable>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              )}
            </Animated.View>
          ))}
        </Animated.View>
      )}

      {/* Add Link Dialog */}
      <Modal visible={showLinkDialog} transparent animationType="fade">
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center p-4"
          onPress={() => setShowLinkDialog(false)}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className={`w-full rounded-2xl p-6 ${isDark ? 'bg-[#1A1A1A]' : 'bg-white'}`}>
            <Text className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Add Link
            </Text>
            <TextInput
              placeholder="Link title..."
              value={linkTitle}
              onChangeText={setLinkTitle}
              className={`p-3 rounded-xl mb-3 ${isDark ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'}`}
              placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
            />
            <TextInput
              placeholder="Paste link URL..."
              value={linkUrl}
              onChangeText={setLinkUrl}
              className={`p-3 rounded-xl mb-4 ${isDark ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'}`}
              placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
            />
            <View className="flex-row gap-3">
              <Pressable
                className={`flex-1 py-3 rounded-xl items-center ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}
                onPress={() => setShowLinkDialog(false)}>
                <Text className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Cancel</Text>
              </Pressable>
              <Pressable
                className={`flex-1 py-3 rounded-xl items-center ${uploading ? 'bg-blue-400' : 'bg-blue-500'}`}
                onPress={handleAddLink}
                disabled={uploading}>
                <Text className="font-semibold text-white">{uploading ? 'Adding...' : 'Add'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Revision Dialog */}
      <Modal visible={showRevisionDialog} transparent animationType="fade">
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center p-4"
          onPress={() => setShowRevisionDialog(false)}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className={`w-full rounded-2xl p-6 ${isDark ? 'bg-[#1A1A1A]' : 'bg-white'}`}>
            <Text className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Request Revision
            </Text>
            <TextInput
              placeholder="Add revision notes..."
              value={revisionNotes}
              onChangeText={setRevisionNotes}
              multiline
              numberOfLines={4}
              className={`p-3 rounded-xl mb-4 ${isDark ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'}`}
              placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
            />
            <View className="flex-row gap-3">
              <Pressable
                className={`flex-1 py-3 rounded-xl items-center ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}
                onPress={() => setShowRevisionDialog(false)}>
                <Text className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Cancel</Text>
              </Pressable>
              <Pressable
                className="flex-1 py-3 rounded-xl items-center bg-red-500"
                onPress={handleRevisionSubmit}>
                <Text className="font-semibold text-white">Send</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* File Preview Modal */}
      {previewFile ? (
        <Modal visible={true} transparent animationType="fade">
          <Pressable
            className="flex-1 bg-black/90 justify-center items-center p-4"
            onPress={() => setPreviewFile(null)}>
            <View
              onTouchMove={(e) => e.stopPropagation()}
              className={`w-full max-h-[90%] rounded-2xl overflow-hidden ${isDark ? 'bg-[#1A1A1A]' : 'bg-white'}`}>
              {/* Close Button */}
              <View className="absolute top-4 right-4 z-10">
                <Pressable
                  className="w-10 h-10 rounded-full bg-black/70 items-center justify-center"
                  onPress={() => setPreviewFile(null)}>
                  <Text className="text-white text-2xl font-bold">×</Text>
                </Pressable>
              </View>

              {/* Preview Content */}
              {previewFile.file_type === 'image' ? (
                // Image Preview
                <View className="bg-black items-center justify-center max-h-96">
                  <Image
                    source={{ uri: previewFile.file_url }}
                    style={{ width: '100%', height: 400 }}
                    resizeMode="contain"
                    onError={() => {
                      console.error('Failed to load image:', previewFile.file_url);
                    }}
                  />
                </View>
              ) : previewFile.file_type === 'video' ? (
                // Video Preview (thumbnail or placeholder)
                <View className="bg-gray-900 items-center justify-center h-64">
                  {previewFile.thumbnail_url ? (
                    <Image
                      source={{ uri: previewFile.thumbnail_url }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="contain"
                    />
                  ) : (
                    <View className="items-center gap-2">
                      <FileText size={48} color="#6b7280" />
                      <Text className="text-gray-400 text-sm">Video Preview</Text>
                    </View>
                  )}
                </View>
              ) : (
                // Document Preview
                <View className="bg-gray-900 items-center justify-center h-64">
                  <View className="items-center gap-3">
                    <FileText size={48} color="#d97706" />
                    <Text className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {previewFile.file_name}
                    </Text>
                    <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Document Preview
                    </Text>
                  </View>
                </View>
              )}

              {/* File Info */}
              <View className={`p-4 border-t ${isDark ? 'bg-[#1A1A1A] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                <Text className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`} numberOfLines={1}>
                  {previewFile.file_name}
                </Text>
                <View className="flex-row items-center gap-2 mt-2">
                  <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    v{previewFile.version}
                  </Text>
                  <Text className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>•</Text>
                  <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {previewFile.file_type}
                  </Text>
                  {previewFile.file_size ? (
                    <>
                      <Text className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>•</Text>
                      <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {(previewFile.file_size / 1024 / 1024).toFixed(2)} MB
                      </Text>
                    </>
                  ) : null}
                </View>
              </View>
            </View>
          </Pressable>
        </Modal>
      ) : null}
    </ScrollView>
  );
}
