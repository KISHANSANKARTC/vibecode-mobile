# Project Chat Upload Error - Troubleshooting Guide

## Error: "StorageUnknownError: Failed to fetch"

This error occurs when attempting to upload a file to the Supabase `deliverables` storage bucket.

### Root Causes

The "Failed to fetch" error can be caused by:

1. **Missing Storage Bucket**
   - The `deliverables` bucket doesn't exist in Supabase Storage
   - Solution: Create the bucket in Supabase Dashboard → Storage

2. **RLS (Row Level Security) Policies**
   - Bucket exists but RLS policy blocks the upload
   - Solution: Update RLS policy to allow uploads for authenticated users

3. **Network/Connectivity Issues**
   - Poor internet connection during upload
   - Firewall or proxy blocking the request
   - CORS misconfiguration

4. **Invalid File Format**
   - File URI can't be fetched
   - File is too large (>10MB)
   - Solution: Check file selection and size

5. **Supabase Client Configuration**
   - Wrong bucket name
   - Missing or expired authentication credentials
   - Solution: Verify Supabase URL and key in .env

### Enhanced Error Handling

The updated code now provides detailed error messages:

```
Network error during upload:
  "Network error during upload. Please check your internet connection and try again."

Permission denied:
  "Permission denied. Unable to upload to storage bucket."

Bucket not found:
  "Storage bucket not found. Please contact support."
```

### How to Fix

#### 1. Check if `deliverables` Bucket Exists

In Supabase Dashboard:
1. Go to **Storage** section
2. Look for `deliverables` bucket
3. If missing, click **Create a new bucket**
4. Name it: `deliverables`
5. Set visibility: **Private** (if file access should be restricted)

#### 2. Update RLS Policy (if bucket exists)

If bucket exists but upload fails with permission error:

1. Go to **Storage** → **deliverables** bucket
2. Click **Policies**
3. Add policy for uploads:
   - Name: "Allow authenticated uploads"
   - Target roles: authenticated
   - Operations: SELECT, INSERT
   - Filter: `(bucket_id = 'deliverables')`

#### 3. Verify Supabase Configuration

Check `.env` file in `/mobile`:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Debugging Steps

1. **Check Console Logs**
   - Look for `[ProjectChat]` log entries
   - Check if fetch from file URI succeeds
   - Verify blob size is reasonable
   - Check Supabase response error details

2. **Test Network Connection**
   - Open a web browser
   - Try to access Supabase dashboard
   - Check if API endpoints are reachable

3. **Verify File**
   - File size should be < 10MB
   - File path should be accessible (file:// URI)
   - File type should be recognized

4. **Check Supabase Status**
   - Visit supabase.com/status
   - Ensure no service outages
   - Check project health in dashboard

### Implementation Details

**File Upload Flow:**
```
1. User selects file (handlePickFile/handlePickImage)
   ↓
2. File stored in state (selectedFile)
   ↓
3. User taps Send
   ↓
4. handleSendMessage called
   ↓
5. Fetch file from URI → Blob
   ↓
6. Upload blob to `deliverables` bucket
   ↓
7. Get path from response
   ↓
8. Send chat message with attachment path
   ↓
9. Message stored in database with attachment_url
```

**Upload Configuration:**
```typescript
await supabase.storage
  .from('deliverables')
  .upload(fileName, blob, {
    contentType: contentType,
    cacheControl: '3600',
    upsert: false,
  });
```

### File Path Format

Files are stored with this structure:
```
deliverables/
  ├── {bookingId}/
  │   ├── 1740000000000-abc1234.pdf
  │   ├── 1740000000100-xyz7890.jpg
  │   └── ...
```

Example: `booking-123/1740000000000-abc1234.pdf`

### Signed URL Generation

After upload, files are accessed via signed URLs (valid for 1 hour):

```typescript
const { data } = await supabase.storage
  .from('deliverables')
  .createSignedUrl(path, 3600);  // 3600 seconds = 1 hour
```

### Workarounds (if bucket doesn't exist)

**Temporary: Use existing buckets**

If the `deliverables` bucket can't be created, you can temporarily use:
- `portfolio` bucket (already exists for portfolio uploads)
- `verifications` bucket (already exists for ID verification)

To switch buckets, change:
```typescript
.from('deliverables')
// to
.from('portfolio')
```

This is a temporary workaround only. The proper solution is to create the `deliverables` bucket.

### Testing Upload Functionality

To test without selecting a real file:

1. Select a small image (< 1MB)
2. Confirm file preview appears
3. Check console for:
   - `[ProjectChat] File fetched successfully`
   - `[ProjectChat] Uploading to deliverables bucket...`
   - `[ProjectChat] Upload completed successfully`

4. Verify message appears in chat
5. Check if file attachment displays

### Still Not Working?

If uploads still fail after trying these steps:

1. Check Supabase project status and limits
2. Verify authentication token is valid
3. Check browser/app network tab for actual HTTP error
4. Review Supabase logs for upload attempts
5. Test with simpler file (small .txt file)
6. Ensure bucket permissions are correct for your user role

### Code Changes Made

Enhanced `handleSendMessage` in `/mobile/src/components/workspace/ProjectChat.tsx`:

1. Better logging at each step of upload process
2. More descriptive error messages based on error type
3. Separate error handling for file fetch vs Supabase upload
4. Network error detection and user-friendly messaging
5. Fallback message when only file is sent (no text)

### Related Code

**File:** `/mobile/src/components/workspace/ProjectChat.tsx`
- Lines 89-165: handleSendMessage function
- Lines 168-181: handleFileSelect function
- Lines 184-207: handlePickFile function
- Lines 210-234: handlePickImage function

**Storage Bucket:** Supabase `deliverables` bucket
**Database Table:** `chat_messages` (attachment_url column)
**Hook:** `useChat()` - handles sendMessage call

### Next Steps

1. Verify `deliverables` bucket exists
2. Check RLS policies allow uploads
3. Review console logs for specific error
4. Test file upload with small image
5. Check Supabase status page
