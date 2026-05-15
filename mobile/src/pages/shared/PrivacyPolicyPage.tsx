import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/theme/ThemeContext';
import {
  ArrowLeft,
  Eye,
  Server,
  Lock,
  Users,
  Clock,
  Mail,
  Shield,
  Cookie,
  Baby,
  Globe,
  Bell,
} from 'lucide-react-native';

interface PrivacySection {
  id: string;
  icon: React.ReactNode;
  title: string;
  content: {
    subtitle?: string;
    items: string[];
  }[];
}

type UserType = 'client' | 'talent';

interface PrivacyPolicyPageProps {
  userType?: UserType;
}

const privacySections: PrivacySection[] = [
  {
    id: 'collect',
    icon: <Eye size={20} color="#7C3AED" strokeWidth={2} />,
    title: 'Information We Collect',
    content: [
      {
        subtitle: 'Personal Information',
        items: [
          'Name, email address, and phone number',
          'Profile photos and biography',
          'Government issued ID for verification purposes',
        ],
      },
      {
        subtitle: 'Financial Information',
        items: [
          'Payment card details processed securely by Stripe',
          'Billing address and transaction history',
        ],
      },
      {
        subtitle: 'Usage Data',
        items: [
          'Portfolio media including photos and videos',
          'Booking and chat messages',
          'Device information and IP address',
          'Location data for service matching',
        ],
      },
    ],
  },
  {
    id: 'how-collect',
    icon: <Server size={20} color="#7C3AED" strokeWidth={2} />,
    title: 'How We Collect Data',
    content: [
      {
        items: [
          'Account registration and profile creation',
          'Booking requests and confirmations',
          'Payment processing via Stripe',
          'In-app messaging and communications',
          'Automatic collection via cookies and analytics',
          'Identity verification submissions',
        ],
      },
    ],
  },
  {
    id: 'use',
    icon: <Lock size={20} color="#7C3AED" strokeWidth={2} />,
    title: 'How We Use Your Information',
    content: [
      {
        items: [
          'Provide and maintain our booking platform',
          'Process payments and refunds securely',
          'Connect talents with clients for bookings',
          'Send booking confirmations and updates',
          'Provide customer support',
          'Improve our services and user experience',
          'Detect and prevent fraud',
          'Send marketing communications with your consent',
          'Comply with legal obligations',
        ],
      },
    ],
  },
  {
    id: 'sharing',
    icon: <Users size={20} color="#7C3AED" strokeWidth={2} />,
    title: 'Information Sharing',
    content: [
      {
        subtitle: 'Payment Processors',
        items: [
          'Stripe processes all payments securely and is PCI-DSS compliant',
        ],
      },
      {
        subtitle: 'Service Providers',
        items: [
          'Cloud hosting and storage providers',
          'Email service providers for notifications',
          'Analytics services for app improvement',
        ],
      },
      {
        subtitle: 'Other Users',
        items: [
          'Profile information visible to facilitate bookings',
          'Contact details shared only after booking confirmation',
        ],
      },
      {
        subtitle: 'Legal Requirements',
        items: [
          'When required by law or legal process',
          'To protect our rights, safety, and property',
        ],
      },
    ],
  },
  {
    id: 'ai',
    icon: <Shield size={20} color="#7C3AED" strokeWidth={2} />,
    title: 'Third Party AI Disclosure',
    content: [
      {
        items: [
          'Engage does not share, sell, or provide your personal data to third party AI providers for model training or development',
          'Any AI powered features in the app operate locally or use anonymized, aggregated data only',
          'Your personal information is never used to train external AI models',
        ],
      },
    ],
  },
  {
    id: 'retention',
    icon: <Clock size={20} color="#7C3AED" strokeWidth={2} />,
    title: 'Data Retention',
    content: [
      {
        subtitle: 'Active Accounts',
        items: [
          'Profile and account data retained for the duration of your account',
        ],
      },
      {
        subtitle: 'After Account Deletion',
        items: [
          'Transaction records retained for 2 years due to legal and tax requirements',
          'Chat messages deleted after 90 days',
          'Portfolio content immediately deleted upon request',
        ],
      },
      {
        subtitle: 'Backup Data',
        items: [
          'System backups may retain deleted data for up to 30 days before permanent removal',
        ],
      },
    ],
  },
  {
    id: 'rights',
    icon: <Lock size={20} color="#7C3AED" strokeWidth={2} />,
    title: 'Your Rights',
    content: [
      {
        items: [
          'Access your personal data at any time',
          'Download a copy of your data',
          'Correct inaccurate information',
          'Delete your account and all associated data',
          'Opt out of marketing emails',
          'Withdraw consent at any time',
          'Lodge a complaint with a data protection authority',
        ],
      },
    ],
  },
  {
    id: 'security',
    icon: <Lock size={20} color="#7C3AED" strokeWidth={2} />,
    title: 'Data Security',
    content: [
      {
        items: [
          'SSL/TLS encryption for all data transfers',
          'PCI-DSS compliant payment processing via Stripe',
          'Secure cloud infrastructure with access controls',
          'Regular security audits and monitoring',
          'Multi-factor authentication options',
        ],
      },
    ],
  },
  {
    id: 'cookies',
    icon: <Cookie size={20} color="#7C3AED" strokeWidth={2} />,
    title: 'Cookies and Tracking',
    content: [
      {
        items: [
          'Keep you signed in to your account',
          'Remember your preferences and settings',
          'Analyze app usage and performance',
          'Improve our services',
        ],
      },
    ],
  },
  {
    id: 'children',
    icon: <Baby size={20} color="#7C3AED" strokeWidth={2} />,
    title: "Children's Privacy",
    content: [
      {
        items: [
          'Engage is not intended for users under 18 years of age',
          'We do not knowingly collect personal information from children under 18',
          'If you believe we have collected information from a child, please contact us immediately',
        ],
      },
    ],
  },
  {
    id: 'international',
    icon: <Globe size={20} color="#7C3AED" strokeWidth={2} />,
    title: 'International Data Transfers',
    content: [
      {
        items: [
          'Your information may be transferred to and processed in countries other than your own',
          'We ensure appropriate safeguards are in place to protect your data in compliance with applicable privacy laws',
        ],
      },
    ],
  },
  {
    id: 'changes',
    icon: <Bell size={20} color="#7C3AED" strokeWidth={2} />,
    title: 'Changes to This Policy',
    content: [
      {
        items: [
          'We may update this Privacy Policy from time to time',
          'We will notify you of any material changes by posting the new policy and updating the last updated date',
          'We encourage you to review this policy periodically',
        ],
      },
    ],
  },
];

export function PrivacyPolicyPage({ userType = 'client' }: PrivacyPolicyPageProps) {
  const router = useRouter();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // Theme-aware colors
  const colors = {
    bg: isDark ? '#0A0A0A' : '#ffffff',
    cardBg: isDark ? '#1A1A1A' : '#ffffff',
    border: isDark ? '#374151' : '#e5e7eb',
    text: isDark ? '#ffffff' : '#1f2937',
    textSecondary: isDark ? '#9ca3af' : '#6b7280',
    mutedBg: isDark ? '#2d3748' : '#f3f4f6',
    heroBg: isDark ? '#111827' : '#f9fafb',
    accentPurple: '#7C3AED',
    accentPurpleLight: isDark ? 'rgba(124, 58, 237, 0.15)' : 'rgba(124, 58, 237, 0.1)',
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: colors.cardBg,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          paddingHorizontal: 16,
          paddingTop: insets.top + 12,
          paddingBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            {
              width: 40,
              height: 40,
              borderRadius: 20,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: pressed ? colors.border : colors.mutedBg,
            },
          ]}
        >
          <ArrowLeft size={24} color={colors.text} strokeWidth={2} />
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 16, paddingVertical: 24, paddingBottom: 48 }}>
          {/* Hero Section */}
          <View style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16, alignItems: 'center' }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: colors.accentPurpleLight,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Shield size={22} color={colors.accentPurple} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
                  Your Privacy Matters
                </Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
                  Last updated: January 13, 2026
                </Text>
              </View>
            </View>

            <Text style={{ fontSize: 14, color: colors.text, lineHeight: 22, textAlign: 'left' }}>
              This Privacy Policy describes how Engage collects, uses, and shares information about you when you use our mobile application and services. We are committed to protecting your privacy and ensuring you understand how your data is handled.
            </Text>
          </View>

          {/* Privacy Sections */}
          {privacySections.map((section) => (
            <View
              key={section.id}
              style={{
                backgroundColor: colors.cardBg,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16, alignItems: 'center' }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: colors.accentPurpleLight,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  {section.icon}
                </View>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, flex: 1 }}>
                  {section.title}
                </Text>
              </View>

              <View style={{ paddingLeft: 4, gap: 16 }}>
                {section.content.map((block, blockIndex) => (
                  <View key={blockIndex}>
                    {block.subtitle ? (
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 10 }}>
                        {block.subtitle}
                      </Text>
                    ) : null}
                    <View style={{ gap: 10 }}>
                      {block.items.map((item, itemIndex) => (
                        <View key={itemIndex} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                          <View
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: colors.accentPurple,
                              marginTop: 7,
                              marginRight: 12,
                              flexShrink: 0,
                            }}
                          />
                          <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20, flex: 1 }}>
                            {item}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}

          {/* Contact Section */}
          <View
            style={{
              backgroundColor: colors.cardBg,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 16,
              marginTop: 12,
              marginBottom: 16,
            }}
          >
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12, alignItems: 'center' }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: colors.accentPurpleLight,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Mail size={18} color={colors.accentPurple} strokeWidth={2} />
              </View>
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, flex: 1 }}>
                Questions About Your Privacy?
              </Text>
            </View>

            <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 20, marginBottom: 12, paddingLeft: 4 }}>
              We're here to help. Reach out to our support team and we'll respond within 24 to 48 hours.
            </Text>

            <Pressable
              onPress={() => Linking.openURL('mailto:support@engageapp.co')}
              style={{ paddingLeft: 4 }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.accentPurple }}>
                support@engageapp.co
              </Text>
            </Pressable>
          </View>

          {/* Footer */}
          <View style={{ paddingTop: 24, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginBottom: 12 }}>
              <Pressable onPress={() => router.push('/terms' as never)}>
                <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '500' }}>
                  Terms of Service
                </Text>
              </Pressable>
              <Text style={{ fontSize: 13, color: colors.border }}>•</Text>
              <Pressable onPress={() => router.push('/support' as never)}>
                <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '500' }}>
                  Help & Support
                </Text>
              </Pressable>
            </View>
            <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center' }}>
              © 2026 Engage. All rights reserved.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
