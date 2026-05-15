# Project Chat - File & Image Upload Fix

## Fixed Issues

### Issue 1: File/Image Buttons Not Opening Picker
**Problem**: The Paperclip and Image buttons in the chat composer had no `onPress` handlers, so they didn't open the file picker when tapped.

**Solution**: Added proper event handlers:
- **Paperclip Button** → `handlePickFile()` → Opens `DocumentPicker.getDocumentAsync()` for all file types
- **Image Button** → `handlePickImage()` → Opens `ImagePickerLib.launchImageLibraryAsync()` for media files

### Issue 2: Layout/Spacing
**Problem**: The chat component layout was handled correctly with proper flex layout.

**Solution**: Component uses `KeyboardAvoidingView` + `View` with `flex-1` to ensure proper spacing.

## Implementation Details

### File: `/mobile/src/components/workspace/ProjectChat.tsx`

**Imports Added:**
```typescript
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePickerLib from 'expo-image-picker';
```

**New Handler: `handlePickFile`**
- Opens native document picker for all file types
- Accepts: `*/*` (all files)
- Validates file size (10MB max)
- Logs file selection with details
- Updates state with `handleFileSelect()`

```typescript
const handlePickFile = useCallback(async () => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
    });
    // ... file validation and state update
  } catch (error) {
    Alert.alert('Error', 'Failed to pick file');
  }
}, [handleFileSelect]);
```

**New Handler: `handlePickImage`**
- Opens native media library for images, videos, audio
- Uses `ImagePickerLib.launchImageLibraryAsync()`
- Quality: 0.8 (balanced)
- No editing allowed
- Auto-detects media type (image/video)
- Updates state with `handleFileSelect()`

```typescript
const handlePickImage = useCallback(async () => {
  try {
    const result = await ImagePickerLib.launchImageLibraryAsync({
      mediaTypes: ImagePickerLib.MediaTypeOptions.All,
      allowsEditing: false,
      quality: 0.8,
    });
    // ... file validation and state update
  } catch (error) {
    Alert.alert('Error', 'Failed to pick image');
  }
}, [handleFileSelect]);
```

**Updated Composer Buttons:**

```typescript
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
```

## File Selection Flow

```
User taps Paperclip/Image button
  ↓
Opens native file picker
  ↓
User selects file
  ↓
handlePickFile/handlePickImage called
  ↓
handleFileSelect validates and stores in state
  ↓
File preview appears above composer
  ↓
User can remove file (X button) or send
  ↓
handleSendMessage uploads file to Supabase + sends message
```

## File Preview Bar

Shows before sending:
- **Images**: Thumbnail preview (48×48px, rounded)
- **Documents**: File icon (FileText) + filename + size
- **Remove Button**: X button to clear selection without sending

Example display:
```
┌─────────────────────────────────────────────┐
│ [🖼️ 48x48] Document.pdf          [X]      │
│            25.5 MB                         │
└─────────────────────────────────────────────┘
```

## Upload Process

1. **File Selection** → `handlePickFile()` / `handlePickImage()`
2. **Preview** → Shows file preview bar
3. **Validation** → Checks file size (max 10MB)
4. **Send Click** → `handleSendMessage()` initiates
5. **Upload** → Blob fetched from URI, uploaded to Supabase `deliverables` bucket
6. **Message Save** → Message record created with attachment_url
7. **State Clear** → File preview cleared, message input reset
8. **Scroll** → Auto-scrolls to bottom to show new message

## Attachment Display in Chat

**Received attachments are displayed as:**
- **Images**: `<Image source={{ uri: signedUrl }}/>` (200×150px)
- **PDFs**: "📄 PDF Document" icon badge
- **Videos/Other**: "📎 Attachment" icon badge

Signed URLs are generated on-demand with 3600s (1 hour) expiry.

## State Management

```typescript
const [selectedFile, setSelectedFile] = useState<any>(null);
const [previewUrl, setPreviewUrl] = useState<string | null>(null);
const [isUploading, setIsUploading] = useState(false);
const [isSending, setIsSending] = useState(false);
```

**State Changes:**
- `selectedFile` → Set when file picked, cleared after send
- `previewUrl` → URI of selected file (for thumbnail display)
- `isUploading` → True during file upload (disables buttons, shows spinner)
- `isSending` → True during message send

## Error Handling

**File Picker Errors:**
- File picker canceled → No action
- File too large (>10MB) → Alert: "File size must be less than 10MB"
- Picker error → Alert: "Failed to pick file"

**Upload Errors:**
- Upload fails → Alert: "Failed to upload file"
- Message insert fails → Alert: "Failed to send message"

**User Feedback:**
- Loading spinner on send button during upload
- Buttons disabled during send/upload
- Error alerts with clear messages

## Testing Checklist

- [ ] Tap Paperclip button → File picker opens
- [ ] Select PDF/Word/Excel file → Preview appears
- [ ] Tap Image button → Media library opens
- [ ] Select image from gallery → Thumbnail preview shows
- [ ] Tap remove (X) → File cleared from preview
- [ ] Tap send without file → Only text sent
- [ ] Tap send with file only → File uploads, message sent
- [ ] Tap send with text + file → Both sent together
- [ ] File preview shows correct name and size
- [ ] Upload shows spinner, buttons disabled
- [ ] After send, preview cleared, input reset
- [ ] Message appears in chat with attachment
- [ ] Images display inline, documents show as icons
- [ ] Can receive files from other user
- [ ] Signed URLs work for attachment display

## Related Code

**Hook:** `/mobile/src/hooks/useChat.ts`
- `sendMessage(text, attachmentPath)` - Sends message with optional attachment

**Type:** `Message` interface includes `attachment_url` field

**Storage:** Supabase `deliverables` bucket
- Private bucket (requires signed URLs)
- Path structure: `{bookingId}/{timestamp}-{random}.{ext}`

**Database:** `chat_messages` table columns:
- `id` - UUID
- `thread_id` - References chat_threads
- `message_text` - Text content (can be null if only attachment)
- `attachment_url` - Storage path of uploaded file
- `sender_user_id` - User who sent message
- `created_at` - Timestamp
- `read_at` - When message was read (null until read)

## Performance Notes

- Document picker and image library are native, so very fast
- Blob upload is efficient (Supabase handles chunking)
- Signed URLs cached in component state to reduce API calls
- Scroll performance maintained with React.memo (if used)

## Future Enhancements

1. Multiple file selection (upload batch)
2. Drag-and-drop file upload
3. File compression before upload
4. Progress bar for upload percentage
5. Share files directly from messages
6. File history/search
7. Video preview with play button
8. Audio player for audio files
