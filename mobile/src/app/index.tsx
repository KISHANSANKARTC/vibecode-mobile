import { useEffect } from 'react';
import { View, Text, Dimensions, Image as RNImage } from 'react-native';
import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

// Note: Local require() images are already bundled, no prefetch needed

export default function SplashScreenPage() {
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.8);
  const taglineOpacity = useSharedValue(0);
  const taglineTranslateY = useSharedValue(20);

  const navigateToSlides = () => {
    router.replace('/onboarding/slides');
  };

  useEffect(() => {
    // Hide the native splash screen
    SplashScreen.hideAsync();

    // Start animations
    logoOpacity.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
    logoScale.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.back(1.5)) });

    taglineOpacity.value = withDelay(
      500,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) })
    );
    taglineTranslateY.value = withDelay(
      500,
      withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) })
    );

    // Navigate after 2.2 seconds
    const timer = setTimeout(() => {
      logoOpacity.value = withTiming(0, { duration: 300 }, (finished) => {
        if (finished) {
          runOnJS(navigateToSlides)();
        }
      });
      taglineOpacity.value = withTiming(0, { duration: 300 });
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const taglineAnimatedStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ translateY: taglineTranslateY.value }],
  }));

  return (
    <View className="flex-1">
      <LinearGradient
        colors={['#0A0A0A', '#1A1A1A', '#0A0A0A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
      >
        {/* Decorative gradient orbs */}
        <View
          className="absolute w-96 h-96 rounded-full opacity-20"
          style={{
            top: -100,
            right: -100,
            backgroundColor: '#F97316',
            shadowColor: '#F97316',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.5,
            shadowRadius: 100,
          }}
        />
        <View
          className="absolute w-64 h-64 rounded-full opacity-10"
          style={{
            bottom: -50,
            left: -50,
            backgroundColor: '#F97316',
            shadowColor: '#F97316',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.3,
            shadowRadius: 80,
          }}
        />

        {/* Logo */}
        <Animated.View style={logoAnimatedStyle} className="items-center">
          <RNImage
            source={require('./onboarding/logo.png')}
            style={{
              width: 160,
              height: 160,
              resizeMode: 'contain',
            }}
          />
          <View className="h-0.5 w-24 bg-orange-500 mt-3 rounded-full" />
        </Animated.View>

        {/* Tagline */}
        <Animated.View style={taglineAnimatedStyle} className="mt-6">
          <Text className="text-neutral-400 text-sm tracking-widest">
            CREATIVE MARKETPLACE
          </Text>
        </Animated.View>
      </LinearGradient>
    </View>
  );
}
