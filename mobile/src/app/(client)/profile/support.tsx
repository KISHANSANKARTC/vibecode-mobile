import {
  View,
  Text,
  ScrollView,
  Pressable,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from '@/lib/router-helper';
import {
  ChevronLeft,
  Mail,
  MessageCircle,
  Clock,
  Key,
  CreditCard,
  AlertTriangle,
  UserCheck,
  ChevronRight,
  FileText,
  Shield,
  HelpCircle,
  ExternalLink,
} from 'lucide-react-native';
import { useState } from 'react';
import { SaraChat } from '@/components/SaraChat';

const FAQ_ITEMS = [
  {
    question: 'How do payments work?',
    answer:
      'Payments are processed through our secure platform powered by Stripe. Clients pay a deposit to confirm bookings, and the remaining balance is due after the session. Talent payouts are released within 24 to 48 hours after client approval.',
  },
  {
    question: 'What is the cancellation policy?',
    answer:
      'Cancellations made more than 48 hours before the scheduled session receive a full refund. Cancellations within 48 hours may be subject to a cancellation fee. Please review the specific policy for each booking.',
  },
  {
    question: 'How do I report an issue with a booking?',
    answer:
      'You can report issues directly from the project workspace by selecting Report an Issue in the payments tab. Our support team will review your case within 24 to 48 hours.',
  },
  {
    question: 'How does identity verification work?',
    answer:
      'Talent members must verify their identity to build trust with clients. This involves uploading a government issued ID and a selfie for verification. The process typically takes 1 to 2 business days.',
  },
  {
    question: 'How can I delete my account?',
    answer:
      'You can delete your account from the Settings page. Navigate to Account Settings and select Delete Account. Please note that this action is permanent and cannot be undone. Your data will be removed according to our data retention policy.',
  },
  {
    question: 'Can I download my data?',
    answer:
      'Yes, you can request a copy of your data at any time. Contact our support team at support@engageapp.co and we will provide you with a complete export of your personal information within 48 hours.',
  },
  {
    question: 'What payment methods are accepted?',
    answer:
      'We accept all major credit and debit cards including Visa, Mastercard, and American Express. Payments are processed securely through Stripe, which is PCI-DSS compliant.',
  },
  {
    question: 'How long does verification take?',
    answer:
      'Identity verification typically takes up to 3 hours. Company verification for business accounts also takes up to 3 hours.',
  },
];

export default function SupportPage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  return (
    <View className="flex-1 bg-white dark:bg-[#0A0A0A]">
      {/* Header */}
      <View
        className="flex-row items-center px-5 py-4 border-b border-[#E5E5E5] dark:border-[#374151] bg-white dark:bg-[#0A0A0A]"
        style={{ paddingTop: insets.top }}
      >
        <Pressable onPress={() => router.back()} className="mr-3">
          <ChevronLeft size={24} color="#171717" strokeWidth={2} />
        </Pressable>
        <Text className="text-[#171717] dark:text-white text-xl font-semibold">
          Help & Support
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-5 py-6"
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Hero Section */}
        <View className="items-center mb-10">
          <View className="w-20 h-20 rounded-3xl bg-orange-100 items-center justify-center mb-4">
            <HelpCircle size={40} color="#F97316" strokeWidth={2} />
          </View>
          <Text className="text-[#171717] dark:text-white text-2xl font-bold mb-2">
            How can we help?
          </Text>
          <Text className="text-[#737373] dark:text-[#A3A3A3] text-center text-sm">
            Find answers to common questions or get in touch with our team
          </Text>
        </View>

        {/* Contact Us Section */}
        <View className="mb-10">
          <Text className="text-[#171717] dark:text-white text-lg font-semibold mb-4">
            Contact Us
          </Text>

          {/* Email Support */}
          <Pressable
            onPress={() =>
              Linking.openURL('mailto:support@engageapp.co')
            }
            className="bg-white dark:bg-[#1A1A1A] rounded-2xl border border-[#E5E5E5] dark:border-[#374151] p-4 flex-row items-center gap-4 mb-3"
          >
            <View className="w-12 h-12 rounded-xl bg-orange-100 items-center justify-center">
              <Mail size={22} color="#F97316" strokeWidth={2} />
            </View>
            <View className="flex-1">
              <Text className="text-[#171717] dark:text-white font-medium">Email Support</Text>
              <Text className="text-[#737373] dark:text-[#A3A3A3] text-sm">
                support@engageapp.co
              </Text>
              <Text className="text-[#A3A3A3] dark:text-[#6B7280] text-xs">
                Response within 24 to 48 hours
              </Text>
            </View>
            <ChevronRight size={18} color="#9CA3AF" strokeWidth={2} />
          </Pressable>

          {/* In-App Chat */}
          <Pressable
            onPress={() => setIsChatOpen(true)}
            className="bg-white dark:bg-[#1A1A1A] rounded-2xl border border-[#E5E5E5] dark:border-[#374151] p-4 flex-row items-center gap-4"
          >
            <View className="w-12 h-12 rounded-xl bg-orange-100 items-center justify-center">
              <MessageCircle size={22} color="#F97316" strokeWidth={2} />
            </View>
            <View className="flex-1">
              <Text className="text-[#171717] dark:text-white font-medium">In-App Chat</Text>
              <Text className="text-[#737373] dark:text-[#A3A3A3] text-sm">
                Chat with Sara, our AI assistant
              </Text>
              <Text className="text-[#A3A3A3] dark:text-[#6B7280] text-xs">
                Available 24/7 - Escalate to human support anytime
              </Text>
            </View>
            <ChevronRight size={18} color="#9CA3AF" strokeWidth={2} />
          </Pressable>
        </View>

        {/* Quick Help Section */}
        <View className="mb-10">
          <Text className="text-[#171717] dark:text-white text-lg font-semibold mb-4">
            Quick Help
          </Text>

          <View className="flex-row flex-wrap gap-3">
            {/* Forgot Password */}
            <Pressable
              onPress={() => router.push('/(onboarding)/auth' as never)}
              className="flex-1 min-w-[45%] bg-white dark:bg-[#1A1A1A] rounded-2xl border border-[#E5E5E5] dark:border-[#374151] p-4"
            >
              <View className="w-10 h-10 rounded-xl bg-orange-100 items-center justify-center mb-3">
                <Key size={20} color="#F97316" strokeWidth={2} />
              </View>
              <Text className="text-[#171717] dark:text-white font-medium text-sm">
                Forgot Password
              </Text>
              <Text className="text-[#737373] dark:text-[#A3A3A3] text-xs mt-1">
                Reset your password via email
              </Text>
            </Pressable>

            {/* Payment Issues */}
            <Pressable
              onPress={() =>
                Linking.openURL(
                  'mailto:support@engageapp.co?subject=Payment%20Issue'
                )
              }
              className="flex-1 min-w-[45%] bg-white dark:bg-[#1A1A1A] rounded-2xl border border-[#E5E5E5] dark:border-[#374151] p-4"
            >
              <View className="w-10 h-10 rounded-xl bg-orange-100 items-center justify-center mb-3">
                <CreditCard size={20} color="#F97316" strokeWidth={2} />
              </View>
              <Text className="text-[#171717] dark:text-white font-medium text-sm">
                Payment Issues
              </Text>
              <Text className="text-[#737373] dark:text-[#A3A3A3] text-xs mt-1">
                Check payment status or request help
              </Text>
            </Pressable>

            {/* Booking Disputes */}
            <Pressable
              onPress={() =>
                Linking.openURL(
                  'mailto:support@engageapp.co?subject=Booking%20Dispute'
                )
              }
              className="flex-1 min-w-[45%] bg-white dark:bg-[#1A1A1A] rounded-2xl border border-[#E5E5E5] dark:border-[#374151] p-4"
            >
              <View className="w-10 h-10 rounded-xl bg-orange-100 items-center justify-center mb-3">
                <AlertTriangle size={20} color="#F97316" strokeWidth={2} />
              </View>
              <Text className="text-[#171717] dark:text-white font-medium text-sm">
                Booking Disputes
              </Text>
              <Text className="text-[#737373] dark:text-[#A3A3A3] text-xs mt-1">
                Report an issue with a booking
              </Text>
            </Pressable>

            {/* Verification Help */}
            <Pressable
              onPress={() =>
                router.push('/(client)/profile/verification' as never)
              }
              className="flex-1 min-w-[45%] bg-white dark:bg-[#1A1A1A] rounded-2xl border border-[#E5E5E5] dark:border-[#374151] p-4"
            >
              <View className="w-10 h-10 rounded-xl bg-orange-100 items-center justify-center mb-3">
                <UserCheck size={20} color="#F97316" strokeWidth={2} />
              </View>
              <Text className="text-[#171717] dark:text-white font-medium text-sm">
                Verification Help
              </Text>
              <Text className="text-[#737373] dark:text-[#A3A3A3] text-xs mt-1">
                Get verified to start booking
              </Text>
            </Pressable>
          </View>
        </View>

        {/* FAQ Section */}
        <View className="mb-10">
          <Text className="text-[#171717] dark:text-white text-lg font-semibold mb-4">
            Frequently Asked Questions
          </Text>

          <View className="bg-white dark:bg-[#1A1A1A] rounded-2xl border border-[#E5E5E5] dark:border-[#374151] overflow-hidden">
            {FAQ_ITEMS.map((item, index) => (
              <View
                key={item.question}
                className={
                  index < FAQ_ITEMS.length - 1 ? 'border-b border-[#E5E5E5] dark:border-[#374151]' : ''
                }
              >
                <Pressable
                  onPress={() =>
                    setExpandedFAQ(expandedFAQ === index ? null : index)
                  }
                  className="px-4 py-4 flex-row items-center justify-between"
                >
                  <Text className="text-[#171717] dark:text-white font-medium text-sm flex-1">
                    {item.question}
                  </Text>
                  <ChevronRight
                    size={18}
                    color="#9CA3AF"
                    strokeWidth={2}
                    style={{
                      transform: [
                        {
                          rotate: expandedFAQ === index ? '90deg' : '0deg',
                        },
                      ],
                    }}
                  />
                </Pressable>

                {expandedFAQ === index ? (
                  <View className="px-4 pb-4 bg-[#F5F5F5] dark:bg-[#0A0A0A]">
                    <Text className="text-[#737373] dark:text-[#A3A3A3] text-sm leading-6">
                      {item.answer}
                    </Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        </View>

        {/* Legal & Resources Section */}
        <View className="mb-10">
          <Text className="text-[#171717] dark:text-white text-lg font-semibold mb-4">
            Legal & Resources
          </Text>

          {/* Terms of Service */}
          <Pressable
            onPress={() => router.push('/terms' as never)}
            className="bg-white dark:bg-[#1A1A1A] rounded-2xl border border-[#E5E5E5] dark:border-[#374151] p-4 flex-row items-center gap-4 mb-3"
          >
            <View className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-[#2A2A2A] items-center justify-center">
              <FileText size={18} color="#9CA3AF" strokeWidth={2} />
            </View>
            <Text className="text-[#171717] dark:text-white font-medium flex-1">
              Terms of Service
            </Text>
            <ChevronRight size={18} color="#9CA3AF" strokeWidth={2} />
          </Pressable>

          {/* Privacy Policy */}
          <Pressable
            onPress={() => router.push('/privacy' as never)}
            className="bg-white dark:bg-[#1A1A1A] rounded-2xl border border-[#E5E5E5] dark:border-[#374151] p-4 flex-row items-center gap-4"
          >
            <View className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-[#2A2A2A] items-center justify-center">
              <Shield size={18} color="#9CA3AF" strokeWidth={2} />
            </View>
            <Text className="text-[#171717] dark:text-white font-medium flex-1">
              Privacy Policy
            </Text>
            <ChevronRight size={18} color="#9CA3AF" strokeWidth={2} />
          </Pressable>
        </View>

        {/* Business Hours Card */}
        <View className="bg-gradient-to-br from-orange-50 to-transparent dark:from-[#FA5610]/10 dark:to-transparent rounded-2xl border border-orange-200 dark:border-[#FA5610]/30 p-6 flex-row items-start gap-4">
          <View className="w-12 h-12 rounded-xl bg-orange-200 dark:bg-[#FA5610]/20 items-center justify-center flex-shrink-0">
            <Clock size={24} color="#F97316" strokeWidth={2} />
          </View>

          <View className="flex-1">
            <Text className="text-[#171717] dark:text-white font-semibold mb-2">
              Business Hours
            </Text>
            <View className="space-y-1">
              <Text className="text-[#737373] dark:text-[#A3A3A3] text-sm">
                In-App Chat: Available 24/7 (AI + Human)
              </Text>
              <Text className="text-[#737373] dark:text-[#A3A3A3] text-sm">
                Human Support: Sun-Thu, 9AM-6PM GST
              </Text>
              <Text className="text-[#737373] dark:text-[#A3A3A3] text-sm">
                Email support available 24/7
              </Text>
            </View>
            <Text className="text-[#A3A3A3] dark:text-[#6B7280] text-xs mt-2">
              Average response time: 24 to 48 hours
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View className="mt-8 pt-8 border-t border-[#E5E5E5] dark:border-[#374151]">
          <View className="flex-row items-center justify-center gap-3 mb-3">
            <Pressable
              onPress={() => Linking.openURL('https://engageapp.co')}
              className="flex-row items-center gap-1"
            >
              <Text className="text-[#171717] dark:text-white font-medium text-sm">
                engageapp.co
              </Text>
              <ExternalLink size={12} color="#9CA3AF" strokeWidth={2} />
            </Pressable>
            <Text className="text-[#D4D4D4] dark:text-[#4B5563] text-sm">|</Text>
            <Text className="text-[#737373] dark:text-[#A3A3A3] text-sm">
              Last updated: January 13, 2026
            </Text>
          </View>
          <Text className="text-[#A3A3A3] dark:text-[#6B7280] text-xs text-center">
            2026 Engage. All rights reserved.
          </Text>
        </View>
      </ScrollView>

      {/* Sara Chat Modal */}
      <SaraChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </View>
  );
}
