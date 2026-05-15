import { Notification } from '@/hooks/useNotifications';

// Returns an Ionicons icon name for a notification type
export function getNotificationIconName(type: string): string {
  const bookingTypes = [
    'booking_request',
    'booking_accepted',
    'booking_declined',
    'booking_cancelled',
    'booking_completed',
    'booking_reminder',
    'booking',
  ];
  const messageTypes = ['message', 'new_message'];
  const paymentTypes = ['payment', 'payment_success', 'payment_received', 'payout_ready'];
  const fileTypes = ['file', 'file_uploaded'];
  const quoteTypes = ['quote', 'quote_accepted', 'quote_declined', 'custom_offer_received'];
  const verifyTypes = [
    'verification_approved',
    'verification_rejected',
    'influencer_verification_approved',
    'influencer_verification_rejected',
    'company_verification_approved',
    'company_verification_rejected',
  ];
  const welcomeTypes = ['welcome', 'welcome_client'];
  const inquiryTypes = ['inquiry', 'portfolio_request'];

  if (bookingTypes.includes(type)) return 'calendar-outline';
  if (messageTypes.includes(type)) return 'chatbubble-outline';
  if (paymentTypes.includes(type)) return 'card-outline';
  if (fileTypes.includes(type)) return 'folder-outline';
  if (quoteTypes.includes(type)) return 'document-text-outline';
  if (verifyTypes.includes(type)) return 'shield-checkmark-outline';
  if (welcomeTypes.includes(type)) return 'hand-left-outline';
  if (inquiryTypes.includes(type)) return 'mail-outline';
  return 'notifications-outline';
}

// Returns a human-readable group name
export function getTypeDisplayName(type: string): string {
  const nameMap: Record<string, string> = {
    booking_request: 'Booking Requests',
    booking_accepted: 'Bookings Accepted',
    booking_declined: 'Bookings Declined',
    booking_cancelled: 'Bookings Cancelled',
    booking_completed: 'Bookings Completed',
    booking_reminder: 'Booking Reminders',
    booking: 'Bookings',
    message: 'Messages',
    new_message: 'New Messages',
    payment: 'Payments',
    payment_success: 'Payment Confirmations',
    payment_received: 'Payments Received',
    payout_ready: 'Payouts Ready',
    file: 'Files',
    file_uploaded: 'Files Uploaded',
    quote: 'Quotes',
    quote_accepted: 'Quotes Accepted',
    quote_declined: 'Quotes Declined',
    custom_offer_received: 'Custom Offers',
    verification_approved: 'Verification Approved',
    verification_rejected: 'Verification Rejected',
    influencer_verification_approved: 'Influencer Verified',
    influencer_verification_rejected: 'Influencer Verification Rejected',
    company_verification_approved: 'Company Verified',
    company_verification_rejected: 'Company Verification Rejected',
    welcome: 'Welcome',
    welcome_client: 'Welcome',
    inquiry: 'Inquiries',
    portfolio_request: 'Portfolio Requests',
  };
  return nameMap[type] || type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

interface GroupedNotification {
  type: string;
  notifications: Notification[];
  latestNotification: Notification;
}

// Groups a flat array of notifications by type (for same-day sections)
export function groupByType(notifications: Notification[]): GroupedNotification[] {
  const typeMap = new Map<string, Notification[]>();
  notifications.forEach((n) => {
    const existing = typeMap.get(n.type) || [];
    existing.push(n);
    typeMap.set(n.type, existing);
  });

  return Array.from(typeMap.entries())
    .map(([type, items]) => ({
      type,
      notifications: items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
      latestNotification: items.reduce((latest, curr) =>
        curr.createdAt > latest.createdAt ? curr : latest
      ),
    }))
    .sort((a, b) => b.latestNotification.createdAt.getTime() - a.latestNotification.createdAt.getTime());
}

interface GroupedByDateResult {
  today: GroupedNotification[];
  yesterday: GroupedNotification[];
  thisWeek: GroupedNotification[];
  earlier: GroupedNotification[];
}

// Groups notifications into date-based sections: today, yesterday, thisWeek, earlier
export function groupNotificationsByDate(notifications: Notification[]): GroupedByDateResult {
  const now = new Date();
  const today: Notification[] = [];
  const yesterday: Notification[] = [];
  const thisWeek: Notification[] = [];
  const earlier: Notification[] = [];

  notifications.forEach((n) => {
    const d = n.createdAt;
    const diffMs = now.getTime() - d.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    const isSameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();

    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(now.getDate() - 1);

    if (isSameDay(d, now)) today.push(n);
    else if (isSameDay(d, yesterdayDate)) yesterday.push(n);
    else if (diffDays <= 7) thisWeek.push(n);
    else earlier.push(n);
  });

  return {
    today: groupByType(today),
    yesterday: groupByType(yesterday),
    thisWeek: groupByType(thisWeek),
    earlier: groupByType(earlier),
  };
}

// Time distance helper (replaces date-fns formatDistanceToNow)
export function timeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
}

// Deep link normalization (maps paths to Expo Router format with layout groups)
export function normalizeDeepLink(deepLink: string | null | undefined): string | null {
  if (!deepLink) return null;

  let normalized = deepLink
    .replace('/talent/bookings/', '/talent/jobs/')
    // IMPORTANT: /talent/messages/{id} → /talent/messagesGroup/messages/{id}
    .replace('/talent/messages/', '/talent/messagesGroup/messages/')
    .replace('/agencies/', '/client/')
    .replace(/^\/agencies$/, '/client')
    .replace('/client/dashboard', '/client')
    // IMPORTANT: /talent/payouts is a direct route, NOT under profile
    .replace('/talent/profile/payouts', '/talent/payouts')
    .replace('/talent/profile/settings', '/talent/profile/categories');

  // Convert to Expo Router layout group format: /talent/... → /(talent)/...
  if (normalized.startsWith('/talent/')) {
    normalized = normalized.replace('/talent/', '/(talent)/');
  } else if (normalized === '/talent') {
    normalized = '/(talent)';
  } else if (normalized.startsWith('/client/')) {
    normalized = normalized.replace('/client/', '/(client)/');
  } else if (normalized === '/client') {
    normalized = '/(client)';
  }

  return normalized;
}
