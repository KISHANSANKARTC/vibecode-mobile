import {
  View,
  Text,
  ScrollView,
  Pressable,
  Linking,
  Alert,
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
import { LinearGradient } from 'expo-linear-gradient';
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

export default function TalentSupportPage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  return (
    <View className="flex-1 bg-white dark:bg-[#0A0A0A]">
      {/* Sticky Header */}
      <View
        className="flex-row items-center justify-between px-5 py-4 border-b border-[#E5E5E5] dark:border-[#374151] bg-white/80 dark:bg-[#0A0A0A]/80 backdrop-blur-md"
        style={{ paddingTop: insets.top }}
      >
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.push('/(talent)/profile')}
            className="w-10 h-10 rounded-full bg-gray-100 dark:bg-[#1A1A1A] items-center justify-center"
          >
            <ChevronLeft size={22} color="#171717" strokeWidth={2} />
          </Pressable>
          <Text className="text-[#171717] dark:text-white text-lg font-semibold">
            Help & Support
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5 py-6"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View className="items-center mb-10">
          <LinearGradient
            colors={['#FA5610', '#FF7B3A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="w-20 h-20 rounded-3xl items-center justify-center mb-4"
          >
            <HelpCircle size={40} color="#FFFFFF" strokeWidth={2} />
          </LinearGradient>
          <Text className="text-[#171717] dark:text-white text-2xl font-bold mb-2">
            How can we help?
          </Text>
          <Text className="text-[#737373] dark:text-[#A3A3A3] text-center text-sm">
            Find answers to common questions or get in touch with our team
          </Text>
        </View>

        {/* Contact Us Section */}
        <View className="mb-10">
          <Text className="text-[#171717] dark:text-white text-base font-semibold mb-4">
            Contact Us
          </Text>

          {/* Email Support */}
          <Pressable
            onPress={() =>
              Linking.openURL('mailto:support@engageapp.co')
            }
            className="bg-white dark:bg-[#1A1A1A] rounded-2xl border border-[#E5E5E5] dark:border-[#374151] p-4 flex-row items-center gap-4 mb-3 active:scale-98"
          >
            <View className="w-12 h-12 rounded-xl bg-[rgba(250,86,16,0.1)] items-center justify-center">
              <Mail size={22} color="#FA5610" strokeWidth={2} />
            </View>
            <View className="flex-1">
              <Text className="text-[#171717] dark:text-white font-medium text-sm">Email Support</Text>
              <Text className="text-[#737373] dark:text-[#A3A3A3] text-xs">
                support@engageapp.co
              </Text>
              <Text className="text-[#A3A3A3] dark:text-[#6B7280] text-xs mt-1">
                Response within 24 to 48 hours
              </Text>
            </View>
            <ChevronRight size={18} color="#A3A3A3" strokeWidth={2} />
          </Pressable>

          {/* In-App Chat */}
          <Pressable
            onPress={() => setIsChatOpen(true)}
            className="bg-white dark:bg-[#1A1A1A] rounded-2xl border border-[#E5E5E5] dark:border-[#374151] p-4 flex-row items-center gap-4 active:scale-98"
          >
            <View className="w-12 h-12 rounded-xl bg-[rgba(250,86,16,0.1)] items-center justify-center">
              <MessageCircle size={22} color="#FA5610" strokeWidth={2} />
            </View>
            <View className="flex-1">
              <Text className="text-[#171717] dark:text-white font-medium text-sm">In-App Chat</Text>
              <Text className="text-[#737373] dark:text-[#A3A3A3] text-xs">
                Chat with Sara
              </Text>
              <Text className="text-[#A3A3A3] dark:text-[#6B7280] text-xs mt-1">
                Available 24/7
              </Text>
            </View>
            <ChevronRight size={18} color="#A3A3A3" strokeWidth={2} />
          </Pressable>
        </View>

        {/* Quick Help Grid */}
        <View className="mb-10">
          <Text className="text-[#171717] dark:text-white text-base font-semibold mb-4">
            Quick Help
          </Text>

          <View className="flex-row flex-wrap gap-3">
            {/* Forgot Password */}
            <Pressable
              onPress={() => {
                try {
                  router.push('/(onboarding)/auth' as any);
                } catch (err) {
                  console.error('Navigation error:', err);
                  Alert.alert('Error', 'Could not navigate to login screen');
                }
              }}
              className="flex-1 min-w-[45%] bg-white dark:bg-[#1A1A1A] rounded-2xl border border-[#E5E5E5] dark:border-[#374151] p-4 active:scale-98"
            >
              <View className="w-10 h-10 rounded-xl bg-[rgba(250,86,16,0.1)] items-center justify-center mb-3">
                <Key size={20} color="#FA5610" strokeWidth={2} />
              </View>
              <Text className="text-[#171717] dark:text-white font-medium text-sm">
                Forgot Password
              </Text>
              <Text className="text-[#737373] dark:text-[#A3A3A3] text-xs mt-1">
                Reset your password
              </Text>
            </Pressable>

            {/* Payment Issues */}
            <Pressable
              onPress={async () => {
                const url = 'mailto:support@engageapp.co?subject=Payment%20Issue';
                try {
                  const canOpen = await Linking.canOpenURL(url);
                  if (canOpen) {
                    await Linking.openURL(url);
                  } else {
                    Alert.alert('Error', 'Could not open email client. Please try again.');
                  }
                } catch (err) {
                  console.error('Email link error:', err);
                  Alert.alert('Error', 'Could not open email client');
                }
              }}
              className="flex-1 min-w-[45%] bg-white dark:bg-[#1A1A1A] rounded-2xl border border-[#E5E5E5] dark:border-[#374151] p-4 active:scale-98"
            >
              <View className="w-10 h-10 rounded-xl bg-[rgba(250,86,16,0.1)] items-center justify-center mb-3">
                <CreditCard size={20} color="#FA5610" strokeWidth={2} />
              </View>
              <Text className="text-[#171717] dark:text-white font-medium text-sm">
                Payment Issues
              </Text>
              <Text className="text-[#737373] dark:text-[#A3A3A3] text-xs mt-1">
                Check payment status
              </Text>
            </Pressable>

            {/* Booking Disputes */}
            <Pressable
              onPress={async () => {
                const url = 'mailto:support@engageapp.co?subject=Booking%20Dispute';
                try {
                  const canOpen = await Linking.canOpenURL(url);
                  if (canOpen) {
                    await Linking.openURL(url);
                  } else {
                    Alert.alert('Error', 'Could not open email client. Please try again.');
                  }
                } catch (err) {
                  console.error('Email link error:', err);
                  Alert.alert('Error', 'Could not open email client');
                }
              }}
              className="flex-1 min-w-[45%] bg-white dark:bg-[#1A1A1A] rounded-2xl border border-[#E5E5E5] dark:border-[#374151] p-4 active:scale-98"
            >
              <View className="w-10 h-10 rounded-xl bg-[rgba(250,86,16,0.1)] items-center justify-center mb-3">
                <AlertTriangle size={20} color="#FA5610" strokeWidth={2} />
              </View>
              <Text className="text-[#171717] dark:text-white font-medium text-sm">
                Booking Disputes
              </Text>
              <Text className="text-[#737373] dark:text-[#A3A3A3] text-xs mt-1">
                Report a booking issue
              </Text>
            </Pressable>

            {/* Verification Help */}
            <Pressable
              onPress={() => {
                try {
                  router.push('/(talent)/verifyidentity' as any);
                } catch (err) {
                  console.error('Navigation error:', err);
                  Alert.alert('Error', 'Could not navigate to verification screen');
                }
              }}
              className="flex-1 min-w-[45%] bg-white dark:bg-[#1A1A1A] rounded-2xl border border-[#E5E5E5] dark:border-[#374151] p-4 active:scale-98"
            >
              <View className="w-10 h-10 rounded-xl bg-[rgba(250,86,16,0.1)] items-center justify-center mb-3">
                <UserCheck size={20} color="#FA5610" strokeWidth={2} />
              </View>
              <Text className="text-[#171717] dark:text-white font-medium text-sm">
                Verification Help
              </Text>
              <Text className="text-[#737373] dark:text-[#A3A3A3] text-xs mt-1">
                Get verified quickly
              </Text>
            </Pressable>
          </View>
        </View>

        {/* FAQ Section */}
        <View className="mb-10">
          <Text className="text-[#171717] dark:text-white text-base font-semibold mb-4">
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
                  className="px-4 py-4 flex-row items-center justify-between active:bg-[#F5F5F5] dark:active:bg-[#2A2A2A]"
                >
                  <Text className="text-[#171717] dark:text-white font-medium text-sm flex-1">
                    {item.question}
                  </Text>
                  <ChevronRight
                    size={18}
                    color="#A3A3A3"
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
          <Text className="text-[#171717] dark:text-white text-base font-semibold mb-4">
            Legal & Resources
          </Text>

          {/* Terms of Service */}
          <Pressable
            onPress={() => router.push('/terms' as never)}
            className="bg-white dark:bg-[#1A1A1A] rounded-2xl border border-[#E5E5E5] dark:border-[#374151] p-4 flex-row items-center gap-4 mb-3 active:scale-98"
          >
            <View className="w-10 h-10 rounded-xl bg-[#E5E5E5] dark:bg-[#2A2A2A] items-center justify-center">
              <FileText size={18} color="#737373" strokeWidth={2} />
            </View>
            <Text className="text-[#171717] dark:text-white font-medium flex-1 text-sm">
              Terms of Service
            </Text>
            <ChevronRight size={18} color="#A3A3A3" strokeWidth={2} />
          </Pressable>

          {/* Privacy Policy */}
          <Pressable
            onPress={() => router.push('/privacy' as never)}
            className="bg-white dark:bg-[#1A1A1A] rounded-2xl border border-[#E5E5E5] dark:border-[#374151] p-4 flex-row items-center gap-4 active:scale-98"
          >
            <View className="w-10 h-10 rounded-xl bg-[#E5E5E5] dark:bg-[#2A2A2A] items-center justify-center">
              <Shield size={18} color="#737373" strokeWidth={2} />
            </View>
            <Text className="text-[#171717] dark:text-white font-medium flex-1 text-sm">
              Privacy Policy
            </Text>
            <ChevronRight size={18} color="#A3A3A3" strokeWidth={2} />
          </Pressable>
        </View>

        {/* Business Hours Card */}
        <View className="rounded-2xl border border-[#FA5610]/20 dark:border-[#FA5610]/30 p-6 flex-row items-start gap-4 mb-10" style={{
          backgroundColor: 'rgba(250, 86, 16, 0.05)',
        }}>
          <View className="w-12 h-12 rounded-xl bg-[rgba(250,86,16,0.2)] items-center justify-center flex-shrink-0">
            <Clock size={24} color="#FA5610" strokeWidth={2} />
          </View>

          <View className="flex-1">
            <Text className="text-[#171717] dark:text-white font-semibold mb-2 text-sm">
              Business Hours
            </Text>
            <View className="gap-1">
              <Text className="text-[#737373] dark:text-[#A3A3A3] text-xs">
                In-App Chat: 24/7 (AI + Human)
              </Text>
              <Text className="text-[#737373] dark:text-[#A3A3A3] text-xs">
                Human Support: Sun-Thu, 9AM-6PM GST
              </Text>
              <Text className="text-[#737373] dark:text-[#A3A3A3] text-xs">
                Email support available 24/7
              </Text>
            </View>
            <Text className="text-[#A3A3A3] dark:text-[#6B7280] text-xs mt-2">
              Avg response: 24 to 48 hours
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
              <Text className="text-[#171717] dark:text-white font-medium text-xs">
                engageapp.co
              </Text>
              <ExternalLink size={12} color="#A3A3A3" strokeWidth={2} />
            </Pressable>
            <Text className="text-[#D4D4D4] dark:text-[#4B5563] text-xs">|</Text>
            <Text className="text-[#737373] dark:text-[#A3A3A3] text-xs">
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
