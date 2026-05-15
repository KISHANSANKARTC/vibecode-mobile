# Notifications Table Schema & RLS Policy Report

## Supabase Project
- **URL**: https://tghuqwogmnslvlbhchpu.supabase.co
- **Schema**: `public`
- **Table Name**: `notifications`

## Expected Table Structure

### Column Definitions
Based on the mobile app code analysis, the `notifications` table should have:

| Column Name | Data Type | Constraints | Description |
|------------|-----------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique notification identifier |
| `user_id` | UUID | NOT NULL, FOREIGN KEY → auth.users(id) | The user receiving the notification (talent user ID) |
| `type` | TEXT | NOT NULL | Notification type: `verification_approved`, `verification_rejected`, `booking_accepted`, `payment`, `message` |
| `title` | TEXT | NOT NULL | Notification title (e.g., "Verification Approved") |
| `body` | TEXT | NOT NULL | Notification body/message content |
| `is_read` | BOOLEAN | DEFAULT false | Whether the notification has been read |
| `deep_link` | TEXT | NULLABLE | Optional deep link for navigation (e.g., "/(talent)/profile") |
| `created_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Last update timestamp |

## SQL to Create Table

```sql
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  deep_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can read their own notifications
CREATE POLICY "Users can read their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Policy 2: Users can update their own notifications
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

-- Policy 4: Service role can insert notifications
CREATE POLICY "Service role can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);
```

## RLS Policies Breakdown

### 1. SELECT Policy
- **Name**: "Users can read their own notifications"
- **Access**: Allows authenticated users to see only their own notifications
- **Filter**: `auth.uid() = user_id`
- **Why**: Prevents users from seeing other users' notifications

### 2. UPDATE Policy
- **Name**: "Users can update their own notifications"
- **Access**: Allows authenticated users to update only their own notifications
- **Filter**: `auth.uid() = user_id`
- **Used For**: Marking notifications as read

### 3. DELETE Policy
- **Name**: "Users can delete their own notifications"
- **Access**: Allows authenticated users to delete only their own notifications
- **Filter**: `auth.uid() = user_id`
- **Optional**: Used if app supports notification dismissal

### 4. INSERT Policy
- **Name**: "Service role can insert notifications"
- **Access**: Allows backend/admin (via service role) to create notifications
- **Why**: Backend needs to create notifications for users without row-level filtering

## How Notifications Are Used in the App

### 1. Fetch Unread Count (notifications-store.ts)
```typescript
const { count, error } = await supabase
  .from('notifications')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', userId)
  .eq('is_read', false);
```
- Called on app focus to update badge count
- Requires SELECT permission for the user's own notifications

### 2. Fetch All Notifications (/(talent)/notifications/index.tsx)
```typescript
const { data, error } = await supabase
  .from('notifications')
  .select('*')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false })
  .limit(50);
```
- Loads notifications feed
- Most recent first
- Requires SELECT permission

### 3. Mark as Read (/(talent)/notifications/index.tsx)
```typescript
const { error } = await supabase
  .from('notifications')
  .update({ is_read: true })
  .eq('id', notificationId);
```
- User marks individual notifications as read
- Requires UPDATE permission on the notification's row

### 4. Mark All as Read (/(talent)/notifications/index.tsx)
```typescript
const { error } = await supabase
  .from('notifications')
  .update({ is_read: true })
  .eq('user_id', user.id)
  .eq('is_read', false);
```
- Marks all unread notifications as read at once
- Requires UPDATE permission on all of user's notifications

### 5. Real-time Subscription (/(talent)/notifications/index.tsx)
```typescript
const channel = supabase
  .channel(`notifications:${user.id}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${user.id}`,
    },
    (payload) => {
      // Handle new notification
    }
  )
  .subscribe();
```
- Listens for new notifications in real-time
- User only sees their own notifications due to RLS filter
- Enables instant notification delivery

## Expected Notification Types

The app expects these notification types:

| Type | Trigger | Icon | Color |
|------|---------|------|-------|
| `verification_approved` | Admin approves talent's ID verification | checkmark-circle | Green (#10b981) |
| `verification_rejected` | Admin rejects talent's ID verification | alert-circle | Red (#ef4444) |
| `booking_accepted` | Talent's booking is accepted | checkmark-done-outline | Blue (#3b82f6) |
| `payment` | Payment received | cash-outline | Amber (#f59e0b) |
| `message` | Generic message | notifications-outline | Gray (#6b7280) |

## Troubleshooting

### Error: "[notifications-store] Error fetching unread count: [object Object]"

**Possible Causes:**
1. Table doesn't exist in Supabase
2. RLS policies not properly configured
3. Column names don't match (`user_id`, `is_read`)
4. Foreign key constraint issues

**Verification Steps:**
1. Open Supabase dashboard
2. Go to SQL Editor
3. Run: `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='notifications';`
4. If empty, table doesn't exist - create it using the SQL above
5. If exists, verify columns: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name='notifications';`
6. Check RLS policies: Navigate to Authentication > Policies in Supabase dashboard

### Error: "Permission denied" on SELECT
- Verify SELECT policy exists
- Ensure policy condition is `auth.uid() = user_id`
- Check that user is authenticated

### Error: "Permission denied" on UPDATE
- Verify UPDATE policy exists for marking as read
- Ensure policy checks `auth.uid() = user_id`

## File Locations in Codebase

- **Store**: `/home/user/workspace/mobile/src/lib/state/notifications-store.ts`
- **Screen**: `/home/user/workspace/mobile/src/app/(talent)/notifications/index.tsx`
- **Settings**: `/home/user/workspace/mobile/src/app/(talent)/notifications/settings.tsx`
- **Feed**: `/home/user/workspace/mobile/src/app/(talent)/notifications/feed.tsx`
- **Helpers**: `/home/user/workspace/mobile/src/helpers/notificationHelpers.ts`
