# Chat File & Image Upload - Complete Implementation Prompt

## Overview
The chat feature in the Engage app includes full file and image upload capability. Users can attach files/images to messages via the paperclip button in the message composer.

## Files Involved
- **Frontend**: `/mobile/src/app/(client)/chat/[id].tsx`
- **Helper**: `/mobile/src/helpers/uploadToStorage.ts`

## Key Features

### 1. File Picker (Paperclip Button)
**Location**: Chat message composer, left side of text input

**Supported File Types**:
- Images: `image/*` (PNG, JPG, GIF, WebP)
- Documents: `application/pdf`
- Word: `.doc`, `.docx`
- Text: `.txt`
- Excel: `.xls`, `.xlsx`

**Implementation**:
```typescript
const handlePickFile = async () => {
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      'image/*',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
  });
  // Sets selectedFile state with uri, name, size, mimeType
};
```

**Button States**:
- Normal: Gray paperclip icon
- Uploading: Orange spinner (shows upload in progress)
- Disabled: Gray icon (during send)
- Hover: Color changes to gray (#6B7280)

### 2. File Preview Bar
**Location**: Above the message input, appears when file is selected

**Display**:
- **For Images**: Shows thumbnail preview (48×48px, rounded corners)
- **For Documents**: Shows file icon + filename + size

**Example Sizes**:
- `5.2 MB` → formatted as "MB"
- `240 KB` → formatted as "KB"
- `500 B` → formatted as "B"

**Remove File**: X button clears selection without sending

### 3. Upload Process

**Step 1: Get User Auth ID**
```typescript
const { data: authData } = await supabase.auth.getUser();
const authUserId = authData?.user?.id;
```

**Step 2: Generate File Path**
```typescript
const fileName = `${authUserId}/${Date.now()}_${selectedFile.name}`;
```

**Step 3: Determine Content Type**
Uses `getContentType(ext)` function to map file extensions to MIME types:
- `.pdf` → `application/pdf`
- `.docx` → `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- `.png` → `image/png`
- `.jpg`/`.jpeg` → `image/jpeg`
- etc.

**Step 4: Upload to Supabase**
```typescript
const { publicUrl, error } = await uploadFileToStorage(
  'chat-attachments',  // bucket name
  fileName,            // userId/timestamp_filename.ext
  selectedFile.uri,    // file URI
  contentType          // MIME type
);
```

**Step 5: Save Message with Attachment**
```typescript
await supabase.from('chat_messages').insert({
  thread_id: currentThreadId,
  sender_user_id: userId,
  message_text: content || null,
  attachment_url: publicUrl,  // URL from upload
  read_at: null,
});
```

### 4. Message Display

**Images in Chat**:
- Display inline in message bubble
- Size: 200×160px
- Rounded corners (8px radius)
- Tap to view full size (placeholder for future implementation)

**Documents in Chat**:
- Show as pressable file link
- Display: FileText icon + filename
- Background: Light gray (#F9FAFB)
- Tap to download (placeholder for future implementation)

### 5. Error Handling

**Error States & Messages**:
- "Failed to select file" → File picker error
- "Failed to upload file: [error details]" → Upload failed
- "Failed to send message: [error details]" → Message save failed

**Error Display**:
- Red banner at top of input area
- Auto-restores message text so user doesn't lose it
- Dismissible with X button
- Auto-clears on next action

**Logging**:
```typescript
console.log('[chat] File selected:', { name, size, mimeType });
console.log('[client-chat] Uploading attachment:', { fileName, mimeType, contentType });
console.log('[client-chat] Attachment uploaded successfully:', publicUrl);
console.error('[client-chat] Upload error:', error);
```

### 6. Content Type Mapping

The `getContentType()` helper in `/mobile/src/helpers/uploadToStorage.ts`:

```typescript
export function getContentType(fileExtension: string, isVideo: boolean = false): string {
  const mimeTypes: { [key: string]: string } = {
    // Images
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    // Documents
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'txt': 'text/plain',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };

  return mimeTypes[ext] || 'application/octet-stream';
}
```

## State Management

**React State**:
- `selectedFile`: `{ uri: string; name: string; size: number; mimeType: string } | null`
- `uploading`: `boolean` - True while file is being uploaded
- `sending`: `boolean` - True while message is being sent
- `error`: `string | null` - Error message to display

**State Flow**:
1. User taps paperclip → `handlePickFile()` → `setSelectedFile()`
2. User taps send → `handleSendMessage()` → `setUploading(true)`
3. Upload completes → `setUploading(false)` → Message sent
4. Error occurs → `setError(message)` → Display error banner
5. User dismisses error → `setError(null)`

## UI/UX Considerations

1. **Visual Feedback**:
   - Spinner shows during upload
   - Button disables during processing
   - Preview shows selected file
   - Error banner appears if something fails

2. **Accessibility**:
   - Buttons have proper touch targets (44×44px minimum)
   - Icons are clear and distinct
   - Error messages are readable
   - Loading states are obvious

3. **Mobile Optimization**:
   - Picker uses native file picker (DocumentPicker)
   - Touch-friendly button sizes
   - Proper keyboard avoidance with KeyboardAvoidingView
   - Bottom padding accommodates mobile nav bars

## Testing Checklist

- [ ] File picker opens when paperclip tapped
- [ ] Can select images (PNG, JPG, GIF)
- [ ] Can select PDFs
- [ ] Can select Word documents
- [ ] File preview shows correct thumbnail/icon
- [ ] File size displays correctly
- [ ] Can remove file before sending
- [ ] Upload shows spinner and disables button
- [ ] Successfully uploaded files appear in message
- [ ] Images display inline in chat
- [ ] Documents show as download links
- [ ] Error messages display on failure
- [ ] Message text restored on error
- [ ] Can send text without file
- [ ] Can send file without text
- [ ] Can send text + file together

## Troubleshooting

### File Picker Not Opening
- Check `DocumentPicker.getDocumentAsync()` is imported correctly
- Verify file types array has correct MIME type strings
- Check console for picker errors

### Upload Failing
- Verify Supabase `chat-attachments` bucket exists
- Check RLS policies allow user uploads
- Verify content-type is correct (check `getContentType()`)
- Check network connection
- Look for errors in console logs with `[client-chat]` prefix

### Wrong File Type Errors
- Update `DocumentPicker.getDocumentAsync()` type array
- Update `getContentType()` mimeTypes mapping
- Test with multiple file types

### Message Not Sending
- Check `chat_messages` table exists and is accessible
- Verify `thread_id` and `sender_user_id` are valid
- Check Supabase RLS policies for message inserts
- Look for error in console logs

## Future Enhancements

1. **File Download**: Implement actual download for documents
2. **Image Preview**: Full-screen image viewer
3. **File Type Icons**: Custom icons for different file types
4. **File Size Limits**: Prevent uploads over size limit
5. **Progress Bar**: Show upload progress percentage
6. **Multiple Files**: Allow multiple file selection
7. **Video Support**: Add video file support
8. **File Compression**: Auto-compress images before upload

## Database Schema

**chat_messages table columns used**:
- `thread_id`: UUID (references chat_threads)
- `sender_user_id`: UUID (user ID)
- `message_text`: Text (optional if file present)
- `attachment_url`: Text (public URL from Supabase Storage)
- `created_at`: Timestamp
- `read_at`: Timestamp (null until read)

**Storage bucket**: `chat-attachments`
- Path structure: `{userId}/{timestamp}_{filename}`
- Public access: Yes (for displaying in messages)
- RLS: Enforced by folder structure

## Related Files

- Backend message routes: `backend/src/routes/messages.ts`
- Supabase Storage config: Bucket `chat-attachments` (public)
- Supabase RLS policies: `chat_messages` table
- Database schema: Prisma schema with `chat_messages` model
