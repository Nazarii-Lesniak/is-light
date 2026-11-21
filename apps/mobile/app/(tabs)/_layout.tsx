import { FloatingGlassTabBar } from '@/shared/ui/FloatingGlassTabBar';
import { Tabs } from 'expo-router';
import { Home, List, PlusCircle } from 'lucide-react-native';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingGlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Головна',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="list"
        options={{
          title: 'Список',
          tabBarIcon: ({ color, size }) => <List size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Додати',
          tabBarIcon: ({ color, size }) => <PlusCircle size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
