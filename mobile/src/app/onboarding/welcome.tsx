import { View, Text, Pressable, ScrollView, Image as RNImage } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { User, Briefcase, Star, ArrowRight } from 'lucide-react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { useEffect } from 'react';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    // Note: Local require() images are bundled at build time, no prefetch needed
  }, []);

  const handleRoleSelect = (role: 'talent' | 'client') => {
    if (role === 'client') {
      router.push({
        pathname: '/onboarding/client-auth',
        params: { role },
      });
    } else {
      router.push({
        pathname: '/onboarding/auth',
        params: { role },
      });
    }
  };

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      {/* Background Image */}
      <RNImage
        source={require('./welcome-bg.png')}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          resizeMode: 'cover',
        }}
      />

      {/* Dark Overlay */}
      <View
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(10, 10, 10, 0.55)',
        }}
      />

      <LinearGradient
        colors={['rgba(26, 26, 26, 0.4)', 'rgba(10, 10, 10, 0.6)', 'rgba(10, 10, 10, 0.7)']}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top + 48,
            paddingBottom: insets.bottom + 24,
            paddingHorizontal: 24,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <Animated.View
            entering={FadeInDown.delay(100).duration(600)}
            className="items-center mb-16"
          >
            <RNImage
              source={require('./logo.png')}
              style={{
                width: 160,
                height: 160,
                resizeMode: 'contain',
              }}
            />
            <View className="h-0.5 w-16 bg-orange-500 mt-3 rounded-full" />
          </Animated.View>

          {/* Heading */}
          <Animated.View
            entering={FadeInDown.delay(200).duration(600)}
            className="mb-10"
          >
            <Text className="text-2xl text-white text-center mb-3" style={{ fontWeight: '300' }}>
              Ready to Engage?
            </Text>
            <Text className="text-neutral-400 text-center text-sm">
              Choose how you want to use the platform
            </Text>
          </Animated.View>

          {/* Role Cards */}
          <View className="gap-4 mb-12">
            {/* Talent Card */}
            <Animated.View entering={FadeInDown.delay(300).duration(600)}>
              <Pressable
                onPress={() => handleRoleSelect('talent')}
                className="overflow-hidden rounded-3xl"
                style={{
                  backgroundColor: 'rgba(249, 115, 22, 0.15)',
                  borderWidth: 1,
                  borderColor: 'rgba(249, 115, 22, 0.3)',
                }}
              >
                <View className="p-4">
                  <View className="flex-row items-center mb-3">
                    <View
                      className="w-12 h-12 rounded-2xl items-center justify-center mr-3"
                      style={{ backgroundColor: 'rgba(249, 115, 22, 0.2)' }}
                    >
                      <Star size={24} color="#F97316" strokeWidth={1.5} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-white text-lg font-semibold mb-1">
                        I'm a Talent
                      </Text>
                      <Text className="text-neutral-400 text-xs">
                        Model, Actor, Creator
                      </Text>
                    </View>
                    <ArrowRight size={20} color="#F97316" />
                  </View>
                  <Text className="text-neutral-300 text-sm leading-5">
                    Get discovered and booked by clients looking for creative professionals like you
                  </Text>
                </View>

                {/* Orange accent button at bottom */}
                <View className="bg-orange-500 py-3 items-center">
                  <Text className="text-white font-semibold text-sm">
                    Join as Talent
                  </Text>
                </View>
              </Pressable>
            </Animated.View>

            {/* Client Card */}
            <Animated.View entering={FadeInDown.delay(400).duration(600)}>
              <Pressable
                onPress={() => handleRoleSelect('client')}
                className="overflow-hidden rounded-3xl"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                }}
              >
                <View className="p-4">
                  <View className="flex-row items-center mb-3">
                    <View
                      className="w-12 h-12 rounded-2xl items-center justify-center mr-3"
                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                    >
                      <Briefcase size={24} color="#FFFFFF" strokeWidth={1.5} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-white text-lg font-semibold mb-1">
                        I'm a Client
                      </Text>
                      <Text className="text-neutral-400 text-xs">
                        Brand, Agency, Production
                      </Text>
                    </View>
                    <ArrowRight size={20} color="#FFFFFF" style={{ opacity: 0.5 }} />
                  </View>
                  <Text className="text-neutral-300 text-sm leading-5">
                    Book creatives for your projects with secure payments and instant availability
                  </Text>
                </View>

                {/* Glass button at bottom */}
                <View
                  className="py-3 items-center"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                >
                  <Text className="text-white font-semibold text-sm">
                    Join as Client
                  </Text>
                </View>
              </Pressable>
            </Animated.View>
          </View>

          {/* Terms and Privacy */}
          <Animated.View
            entering={FadeInUp.delay(500).duration(600)}
            className="mt-auto"
          >
            <Text className="text-neutral-500 text-center text-xs leading-5">
              By continuing, you agree to our{' '}
              <Pressable onPress={() => router.push('/terms')}>
                <Text className="text-orange-500 underline">Terms of Service</Text>
              </Pressable>
              {' '}and{' '}
              <Pressable onPress={() => router.push('/privacy')}>
                <Text className="text-orange-500 underline">Privacy Policy</Text>
              </Pressable>
            </Text>
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}
