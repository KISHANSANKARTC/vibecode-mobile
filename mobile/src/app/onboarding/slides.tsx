import { useRef, useState } from 'react';
import {
  View,
  Text,
  Dimensions,
  FlatList,
  Pressable,
  ViewToken,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

interface Slide {
  id: string;
  image: any;
}

const slides: Slide[] = [
  {
    id: '1',
    image: require('../../../assets/slides/slide1.png'),
  },
  {
    id: '2',
    image: require('../../../assets/slides/slide2.png'),
  },
  {
    id: '3',
    image: require('../../../assets/slides/slide3.png'),
  },
];

export default function OnboardingSlidesScreen() {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useSharedValue(0);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
        viewPosition: 0,
      });
    } else {
      router.push('/onboarding/welcome');
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex - 1,
        animated: true,
        viewPosition: 0,
      });
    }
  };

  const handleSkip = () => {
    router.push('/onboarding/welcome');
  };

  // Get item layout for FlatList optimization
  const getItemLayout = (_data: any, index: number) => ({
    length: width,
    offset: width * index,
    index,
  });

  const renderSlide = ({ item, index }: { item: Slide; index: number }) => (
    <View style={{ width, height }} className="justify-center items-center">
      {/* Full-screen image */}
      <Image
        source={item.image}
        style={{
          width: '100%',
          height: '100%',
          resizeMode: 'cover',
        }}
      />
    </View>
  );

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      {/* Skip button */}
      <View
        className="absolute z-10 right-6"
        style={{ top: insets.top + 12 }}
      >
        <Pressable
          onPress={handleSkip}
          className="px-4 py-2 rounded-full"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
        >
          <Text className="text-white text-sm font-medium">Skip</Text>
        </Pressable>
      </View>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={getItemLayout}
        bounces={false}
      />

      {/* Bottom controls */}
      <View
        className="absolute bottom-0 left-0 right-0 px-6"
        style={{ paddingBottom: insets.bottom + 24 }}
      >
        {/* Progress dots */}
        <View className="flex-row justify-center items-center mb-8">
          {slides.map((_, index) => (
            <View
              key={index}
              className={`h-2 rounded-full mx-1.5 ${
                index === currentIndex ? 'w-8 bg-orange-500' : 'w-2 bg-neutral-700'
              }`}
            />
          ))}
        </View>

        {/* Navigation buttons */}
        <View className="flex-row justify-between items-center">
          {/* Back button */}
          <Pressable
            onPress={handleBack}
            disabled={currentIndex === 0}
            className={`w-14 h-14 rounded-full items-center justify-center ${
              currentIndex === 0 ? 'opacity-30' : 'opacity-100'
            }`}
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
          >
            <ChevronLeft size={24} color="#FFFFFF" />
          </Pressable>

          {/* Next/Get Started button */}
          <Pressable
            onPress={handleNext}
            className="flex-row items-center justify-center px-8 h-14 rounded-full bg-orange-500"
            style={{
              shadowColor: '#F97316',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
            }}
          >
            <Text className="text-white font-semibold text-base mr-2">
              {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
            </Text>
            <ChevronRight size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
