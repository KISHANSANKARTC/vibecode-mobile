# Notifications Table Database Verification Checklist

## Quick Summary

The mobile app expects a `notifications` table in Supabase's public schema with proper Row-Level Security (RLS) policies. The current error "[notifications-store] Error fetching unread count: [object Object]" indicates the table or policies may not be properly configured.

## Table at a Glance

```
Table: public.notifications
├── id (UUID, PRIMARY KEY)
├── user_id (UUID, FK to auth.users, indexed)
├── type (TEXT) - verification_approved, verification_rejected, booking_accepted, payment, message
├── title (TEXT)
├── body (TEXT)
├── is_read (BOOLEAN, indexed)
├── deep_link (TEXT, optional)
├── created_at (TIMESTAMP, indexed)
└── updated_at (TIMESTAMP)
```

## RLS Policies Required (4 total)

| # | Policy Name | Operation | Condition | Purpose |
|---|-------------|-----------|-----------|---------|
| 1 | Users can read their own notifications | SELECT | `auth.uid() = user_id` | Users see only their notifications |
| 2 | Users can update their own notifications | UPDATE | `auth.uid() = user_id` | Users can mark as read |
| 3 | Users can delete their own notifications | DELETE | `auth.uid() = user_id` | Users can dismiss notifications |
| 4 | Service role can insert notifications | INSERT | `true` | Backend creates notifications |

## Verification Steps in Supabase Dashboard

### Step 1: Check if Table Exists
1. Open https://tghuqwogmnslvlbhchpu.supabase.co
2. Go to **SQL Editor**
3. Run this query:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema='public' AND table_name='notifications';
```
4. Result should show one row with `notifications` table

### Step 2: Verify Table Structure
1. Run this query:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name='notifications'
ORDER BY ordinal_position;
```
2. Verify these columns exist:
   - `id` (uuid) - NOT NULL
   - `user_id` (uuid) - NOT NULL
   - `type` (text) - NOT NULL
   - `title` (text) - NOT NULL
   - `body` (text) - NOT NULL
   - `is_read` (boolean) - nullable (default false)
   - `deep_link` (text) - nullable
   - `created_at` (timestamp) - nullable (default now())
   - `updated_at` (timestamp) - nullable (default now())

### Step 3: Check RLS Status
1. Go to **Authentication** > **Policies** in Supabase dashboard
2. Click on **notifications** table
3. Verify these 4 policies exist:
   - ✓ "Users can read their own notifications" (SELECT)
   - ✓ "Users can update their own notifications" (UPDATE)
   - ✓ "Users can delete their own notifications" (DELETE)
   - ✓ "Service role can insert notifications" (INSERT)
4. Verify RLS is **ENABLED** (toggle at top right)

### Step 4: Verify Indexes
1. Run this query:
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename='notifications';
```
2. Should show indexes on:
   - `user_id`
   - `created_at`
   - `is_read`
   - `id` (primary key index)

### Step 5: Test a Sample Query
1. Run this query to check if data access works:
```sql
SELECT count(*) FROM public.notifications;
```
2. If it returns a number (0 or more), the table is accessible
3. If it returns "Permission denied" error, RLS policies need adjustment

## If Table Doesn't Exist

Copy-paste this entire block into SQL Editor and run it:

```sql
-- Create table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policy 1: SELECT
CREATE POLICY IF NOT EXISTS "Users can read their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Policy 2: UPDATE
CREATE POLICY IF NOT EXISTS "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy 3: DELETE
CREATE POLICY IF NOT EXISTS "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

-- Policy 4: INSERT (for service role)
CREATE POLICY IF NOT EXISTS "Service role can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);
```

## How the App Uses This Table

### 1. On App Startup
- Fetches unread notification count
- Updates bell badge in header
- **Query**: `SELECT COUNT(*) WHERE user_id = current_user AND is_read = false`

### 2. When User Opens Notifications Screen
- Loads all notifications for the user
- Shows them in reverse chronological order (newest first)
- **Query**: `SELECT * WHERE user_id = current_user ORDER BY created_at DESC LIMIT 50`

### 3. When User Taps a Notification
- Marks that notification as read
- May navigate to relevant screen via deep_link
- **Query**: `UPDATE notifications SET is_read = true WHERE id = notification_id`

### 4. Real-time Updates
- Listens for new INSERT events on the notifications table
- Only receives events for the current user's notifications (filtered by RLS)
- Instantly adds new notifications to the feed

### 5. Mark All as Read
- Updates all unread notifications to read
- **Query**: `UPDATE notifications SET is_read = true WHERE user_id = current_user AND is_read = false`

## Column Details

### `user_id` (Most Important for RLS)
- Links to `auth.users(id)`
- Every RLS policy filters by this
- Must be the authenticated user's ID
- Indexed for fast lookups
- Enables real-time subscriptions to work

### `is_read` Boolean
- Tracks whether user has seen the notification
- Indexed because app frequently queries: `WHERE is_read = false`
- Default is `false` (new notifications start unread)

### `type` Enum-like Field
- Expected values: `verification_approved`, `verification_rejected`, `booking_accepted`, `payment`, `message`
- UI uses this to choose icon and color
- Can be any text value

### `deep_link` Navigation
- Optional field
- Format: `/(talent)/profile` or other Expo Router paths
- Used to navigate user when they tap notification

### Timestamps
- `created_at`: When notification was created
- `updated_at`: Last time notification was modified
- Used for sorting and time-ago display ("2h ago", "just now")

## Common Issues & Solutions

| Issue | Possible Cause | Solution |
|-------|----------------|----------|
| "[notifications-store] Error fetching unread count: [object Object]" | Table doesn't exist | Create table using SQL above |
| App shows 0 notifications but admin created some | RLS SELECT policy missing | Add SELECT policy with `auth.uid() = user_id` |
| User can't mark notifications as read | RLS UPDATE policy missing | Add UPDATE policy with `auth.uid() = user_id` |
| Real-time updates not working | RLS not enabled or policies incorrect | Enable RLS, check policy filters |
| Foreign key errors | user_id references wrong table | Ensure FK is `auth.users(id)` |
| Performance issues | Missing indexes | Add indexes on user_id, created_at, is_read |

## Files That Depend on This Table

All in `/home/user/workspace/mobile/src/`:

1. **lib/state/notifications-store.ts** (Zustand store)
   - `fetchUnreadCount(userId)` - Gets unread count
   - Used by: Bell icon badge

2. **app/(talent)/notifications/index.tsx** (Main notifications feed)
   - Fetches all notifications
   - Real-time subscription for new ones
   - Mark as read functionality

3. **app/(talent)/notifications/feed.tsx**
   - Alternative notifications display
   - Used in some flows

4. **app/(talent)/notifications/settings.tsx**
   - Notification preferences
   - May filter which notifications to show

5. **helpers/notificationHelpers.ts**
   - Utility functions for notifications

## Testing

Once table is set up, test with this query:

```sql
-- Insert a test notification
INSERT INTO public.notifications (user_id, type, title, body, is_read)
VALUES (
  'YOUR-USER-UUID-HERE',
  'verification_approved',
  'Verification Approved',
  'Your ID verification has been approved!',
  false
);

-- View it
SELECT * FROM public.notifications WHERE user_id = 'YOUR-USER-UUID-HERE';

-- Mark as read
UPDATE public.notifications SET is_read = true WHERE id = 'NOTIFICATION-ID';

-- Count unread
SELECT COUNT(*) FROM public.notifications WHERE user_id = 'YOUR-USER-UUID-HERE' AND is_read = false;
```

---

**Last Updated**: March 16, 2026
**Status**: Schema and RLS configuration guide for notifications table
**Project**: Engage - Creative Talent Marketplace
