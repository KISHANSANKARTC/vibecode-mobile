import {
  View,
  Text,
  ScrollView,
  Pressable,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ChevronLeft,
  Mail,
  MessageCircle,
  Clock,
  ChevronRight,
} from 'lucide-react-native';
import { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

export default function SupportScreen() {
  const insets = useSafeAreaInsets();
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  const contactOptions = [
    {
      icon: Mail,
      label: 'Email Support',
      value: 'support@engage.ae',
      action: () => Linking.openURL('mailto:support@engage.ae'),
    },
    {
      icon: MessageCircle,
      label: 'WhatsApp',
      value: 'Chat with us',
      action: () => Linking.openURL('https://wa.me/971XXXXXXXXX'),
    },
    {
      icon: Clock,
      label: 'Response Time',
      value: 'Usually within 2 hours',
      action: null,
    },
  ];

  const faqItems: FAQItem[] = [
    {
      question: 'How do I create a booking?',
      answer:
        'Navigate to the Search page, find talent you\'d like to work with, and click "Book Now" to start the booking process.',
    },
    {
      question: 'How do payments work?',
      answer:
        'Payments are processed securely through our platform. You can pay via credit card or bank transfer.',
    },
    {
      question: 'Can I cancel a booking?',
      answer:
        'You can cancel a booking before it\'s confirmed by the talent. Check our cancellation policy for details.',
    },
    {
      question: 'How do I contact talent?',
      answer:
        'Once you have an active booking or send a custom offer, you can message talent directly through the Messages section.',
    },
    {
      question: 'How long does verification take?',
      answer:
        'Identity verification typically takes up to 3 hours. Company verification for business accounts also takes up to 3 hours.',
    },
  ];

  return (
    <View className="flex-1 bg-[#F8F8F8]">
      <View
        className="flex-row items-center px-5 py-4 border-b border-gray-200 bg-white"
        style={{ paddingTop: insets.top }}
      >
        <Pressable onPress={() => router.back()} className="mr-3">
          <ChevronLeft size={24} color="#1F2937" strokeWidth={2} />
        </Pressable>
        <Text className="text-gray-900 text-xl font-semibold">
          Help & Support
        </Text>
      </View>

      <ScrollView className="flex-1 px-5 py-6" contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Contact Options */}
        <Text className="text-gray-600 text-sm font-medium mb-4">Contact Us</Text>
        {contactOptions.map((option, index) => {
          const Icon = option.icon;
          return (
            <Pressable
              key={index}
              onPress={option.action}
              disabled={!option.action}
              className="bg-white rounded-2xl p-4 border border-gray-200 mb-3 flex-row items-center justify-between"
              style={{ opacity: option.action ? 1 : 0.7 }}
            >
              <View className="flex-1 flex-row items-center">
                <View className="w-10 h-10 rounded-full items-center justify-center mr-3 bg-orange-50">
                  <Icon size={20} color="#F97316" strokeWidth={1.5} />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 font-semibold text-sm">
                    {option.label}
                  </Text>
                  <Text className="text-gray-600 text-xs mt-0.5">
                    {option.value}
                  </Text>
                </View>
              </View>
              {option.action ? (
                <ChevronRight size={20} color="#9CA3AF" strokeWidth={2} />
              ) : null}
            </Pressable>
          );
        })}

        {/* FAQ Section */}
        <Text className="text-gray-600 text-sm font-medium mb-4 mt-6">
          Frequently Asked Questions
        </Text>
        {faqItems.map((item, index) => (
          <Pressable
            key={index}
            onPress={() =>
              setExpandedFAQ(expandedFAQ === index ? null : index)
            }
            className="bg-white rounded-2xl border border-gray-200 mb-3 overflow-hidden"
          >
            <View className="flex-row items-center justify-between p-4">
              <Text className="text-gray-900 font-semibold text-sm flex-1 mr-4">
                {item.question}
              </Text>
              <Text
                className="text-gray-400 text-xl"
                style={{
                  transform: [
                    {
                      rotate: expandedFAQ === index ? '180deg' : '0deg',
                    },
                  ],
                }}
              >
                ▼
              </Text>
            </View>
            {expandedFAQ === index ? (
              <View className="px-4 pb-4 border-t border-gray-100">
                <Text className="text-gray-600 text-sm leading-5">
                  {item.answer}
                </Text>
              </View>
            ) : null}
          </Pressable>
        ))}

        {/* Quick Links */}
        <Text className="text-gray-600 text-sm font-medium mb-4 mt-6">
          Quick Links
        </Text>
        <Pressable
          onPress={() => router.push('/(client)/privacy' as never)}
          className="bg-white rounded-2xl p-4 border border-gray-200 mb-3 flex-row items-center justify-between"
        >
          <Text className="text-gray-900 font-semibold text-sm flex-1">
            Privacy Policy
          </Text>
          <ChevronRight size={20} color="#9CA3AF" strokeWidth={2} />
        </Pressable>

        <Pressable
          onPress={() => router.push('/(client)/terms' as never)}
          className="bg-white rounded-2xl p-4 border border-gray-200 flex-row items-center justify-between"
        >
          <Text className="text-gray-900 font-semibold text-sm flex-1">
            Terms of Service
          </Text>
          <ChevronRight size={20} color="#9CA3AF" strokeWidth={2} />
        </Pressable>
      </ScrollView>
    </View>
  );
}
