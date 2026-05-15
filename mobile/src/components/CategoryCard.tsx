import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LucideIcon } from 'lucide-react-native';

interface CategoryCardProps {
  icon: LucideIcon;
  label: string;
  onPress?: () => void;
}

export function CategoryCard({ icon: Icon, label, onPress }: CategoryCardProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 min-w-[30%] m-1"
      style={{
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          padding: 16,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.08)',
        }}
      >
        <View
          className="w-12 h-12 rounded-xl items-center justify-center mb-2"
          style={{ backgroundColor: 'rgba(249, 115, 22, 0.15)' }}
        >
          <Icon size={24} color="#F97316" strokeWidth={1.5} />
        </View>
        <Text className="text-white text-xs text-center" numberOfLines={2}>
          {label}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}
