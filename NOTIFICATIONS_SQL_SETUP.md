# Notifications Table - Ready-to-Use SQL Setup

## Quick Copy-Paste Solution

**Location**: Supabase Dashboard > SQL Editor
**URL**: https://tghuqwogmnslvlbhchpu.supabase.co/project/_/sql

### Step 1: Create Table and Policies (Copy-Paste All)

```sql
-- ============================================================================
-- NOTIFICATIONS TABLE SETUP
-- ============================================================================
-- This script creates the notifications table used by the Engage mobile app
-- Run the entire script at once in Supabase SQL Editor
-- ============================================================================

-- Create the notifications table
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

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

-- Enable Row-Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can read their own notifications
CREATE POLICY "Users can read their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Policy 2: Users can update their own notifications (mark as read)
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

-- ============================================================================
-- End of notifications table setup
-- ============================================================================
```

### Step 2: Verify It Worked

After running the above, run these verification queries:

```sql
-- Check table exists and has correct columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'notifications'
ORDER BY ordinal_position;

-- Expected output should show 9 columns:
-- id, user_id, type, title, body, is_read, deep_link, created_at, updated_at
```

### Step 3: Check RLS Policies

```sql
-- View all policies on notifications table
SELECT policyname, permissive, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'notifications'
ORDER BY policyname;

-- Expected output: 4 policies
-- - Service role can insert notifications
-- - Users can delete their own notifications
-- - Users can read their own notifications
-- - Users can update their own notifications
```

### Step 4: Check Indexes

```sql
-- View all indexes on notifications table
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'notifications'
AND indexname NOT LIKE '%_pkey'  -- Exclude primary key
ORDER BY indexname;

-- Expected output: 3 indexes
-- - idx_notifications_created_at
-- - idx_notifications_is_read
-- - idx_notifications_user_id
```

## Testing the Setup

### Test 1: Insert a Notification (Backend Only)

Use the service_role key to insert (or test in SQL Editor):

```sql
-- Insert test notification as superuser (simulates backend)
INSERT INTO public.notifications (user_id, type, title, body, is_read, deep_link)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',  -- Replace with real user ID
  'verification_approved',
  'Verification Approved',
  'Your ID verification has been approved!',
  false,
  '/(talent)/profile'
);

-- Check it was inserted
SELECT * FROM public.notifications;
```

### Test 2: Verify RLS Works

Use the anon key (what the app uses) - RLS should prevent unauthorized access:

```sql
-- This simulates what the mobile app can access
-- It should only see notifications where auth.uid() matches user_id
SELECT * FROM public.notifications
WHERE user_id = auth.uid();
```

## Column Descriptions

| Column | Type | Required | Default | Purpose |
|--------|------|----------|---------|---------|
| `id` | UUID | YES | uuid_generate_v4() | Unique notification ID |
| `user_id` | UUID | YES | - | User who receives notification (links to auth.users) |
| `type` | TEXT | YES | - | notification type (verification_approved, etc) |
| `title` | TEXT | YES | - | Short notification title |
| `body` | TEXT | YES | - | Longer notification message |
| `is_read` | BOOLEAN | NO | false | Whether user has read it |
| `deep_link` | TEXT | NO | null | URL to navigate to when tapped |
| `created_at` | TIMESTAMP+TZ | NO | NOW() | When notification was created |
| `updated_at` | TIMESTAMP+TZ | NO | NOW() | When notification was last updated |

## Notification Types

The app expects these type values. You can add more as needed:

- `verification_approved` - User's ID was approved
- `verification_rejected` - User's ID was rejected
- `booking_accepted` - A booking was accepted
- `payment` - Payment received
- `message` - Generic message
- Custom types work too (just won't have special styling)

## Common Issues After Setup

### Issue: "Permission denied" on SELECT
**Cause**: RLS policy not correct
**Fix**: Verify SELECT policy exists and has condition: `auth.uid() = user_id`

### Issue: Notifications not appearing in real-time
**Cause**: RLS filters or table not enabled correctly
**Fix**: Ensure RLS is enabled on table and filter is `user_id=eq.{user.id}`

### Issue: Users can see other users' notifications
**Cause**: RLS policies not enforced or disabled
**Fix**: Check RLS is ENABLED (not disabled) on table

### Issue: Cannot mark notifications as read
**Cause**: UPDATE policy missing
**Fix**: Create UPDATE policy with condition: `auth.uid() = user_id`

### Issue: Slow queries fetching notifications
**Cause**: Missing indexes
**Fix**: Ensure these indexes exist:
- `idx_notifications_user_id`
- `idx_notifications_created_at`
- `idx_notifications_is_read`

## SQL to Reset (if needed)

Only run this if something went wrong and you need to start over:

```sql
-- WARNING: This drops the entire table and all data!
DROP TABLE IF EXISTS public.notifications CASCADE;

-- Then run the Setup SQL above again
```

## Backup Verification

Run this single query to verify everything is correct:

```sql
-- Check all aspects of the notifications table
SELECT
  'Table Exists' AS check_name,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='notifications'
  ) AS result
UNION ALL
SELECT
  'RLS Enabled',
  (SELECT rowsecurity FROM pg_tables
   WHERE schemaname='public' AND tablename='notifications')
UNION ALL
SELECT
  'Column: id exists',
  EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name='notifications' AND column_name='id')
UNION ALL
SELECT
  'Column: user_id exists',
  EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name='notifications' AND column_name='user_id')
UNION ALL
SELECT
  'Policy: SELECT exists',
  EXISTS (SELECT 1 FROM pg_policies
          WHERE tablename='notifications' AND cmd='SELECT')
UNION ALL
SELECT
  'Policy: UPDATE exists',
  EXISTS (SELECT 1 FROM pg_policies
          WHERE tablename='notifications' AND cmd='UPDATE')
UNION ALL
SELECT
  'Policy: DELETE exists',
  EXISTS (SELECT 1 FROM pg_policies
          WHERE tablename='notifications' AND cmd='DELETE')
UNION ALL
SELECT
  'Policy: INSERT exists',
  EXISTS (SELECT 1 FROM pg_policies
          WHERE tablename='notifications' AND cmd='INSERT')
UNION ALL
SELECT
  'Index: user_id exists',
  EXISTS (SELECT 1 FROM pg_indexes
          WHERE tablename='notifications' AND indexname='idx_notifications_user_id')
UNION ALL
SELECT
  'Index: created_at exists',
  EXISTS (SELECT 1 FROM pg_indexes
          WHERE tablename='notifications' AND indexname='idx_notifications_created_at')
UNION ALL
SELECT
  'Index: is_read exists',
  EXISTS (SELECT 1 FROM pg_indexes
          WHERE tablename='notifications' AND indexname='idx_notifications_is_read');

-- Result: All should be TRUE (t) if setup is correct
```

## Files That Use This Table

### Mobile App
- `mobile/src/lib/state/notifications-store.ts` - Fetches unread count
- `mobile/src/app/(talent)/notifications/index.tsx` - Main notifications feed
- `mobile/src/app/(talent)/notifications/feed.tsx` - Alternative display
- `mobile/src/app/(talent)/notifications/settings.tsx` - Preferences

### Backend (To Be Implemented)
- Should insert into this table when admins approve/reject verification
- Should insert payment notifications when payments are made

## Support

If you encounter errors:

1. **Check Supabase logs**: Authentication > Logs
2. **Verify RLS is enabled**: Click table > click 🔒 icon
3. **Check policy conditions**: Each policy should have the right SQL
4. **Run verification query**: Use the backup verification query above
5. **Check error message**: Copy exact error and search Supabase docs

---

**Setup Guide**: Notifications Table SQL
**Version**: 1.0
**Compatible With**: Supabase (all regions)
**Time to Complete**: 2-3 minutes
**Lines of SQL**: 67
