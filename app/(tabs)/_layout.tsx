// app/(tabs)/_layout.tsx
import { HapticTab } from '@/components/haptic-tab';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#FF6A00',
        tabBarInactiveTintColor: '#FFFFFF',
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: '#000000',
          borderTopWidth: 0,
          height: 64 + insets.bottom,
          paddingTop: 6,
          paddingBottom: 8 + insets.bottom,
          ...Platform.select({
            ios: {
              position: 'absolute',
            },
          }),
        },
        tabBarIcon: ({ color, focused }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          switch (route.name) {
            case 'index':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'workouts':
              iconName = focused ? 'barbell' : 'barbell-outline';
              break;
            case 'meals':
              iconName = focused ? 'restaurant' : 'restaurant-outline';
              break;
            case 'photos':
              iconName = focused ? 'camera' : 'camera-outline';
              break;
            case 'history':
              iconName = focused ? 'time' : 'time-outline';
              break;
            default:
              iconName = 'ellipse';
              break;
          }

          return <Ionicons name={iconName} size={22} color={color} />;
        },
        tabBarLabelStyle: {
          fontSize: 11,
        },
      })}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: 'Workouts',
        }}
      />
      <Tabs.Screen
        name="meals"
        options={{
          title: 'Meals',
        }}
      />
      <Tabs.Screen
        name="photos"
        options={{
          title: 'Photos',
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
        }}
      />
      <Tabs.Screen
        name="history/[dayId]"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
