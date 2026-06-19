import { Tabs } from 'expo-router';
import { Redirect } from 'expo-router';
import { Platform, Text } from 'react-native';
import { Colors, Typography } from '../constants/design';
import { useAuthStore } from '../hooks/useAuthStore';

function TabIcon({ label, color }: { label: string; color: string }) {
  return <Text style={{ color, fontSize: 20, lineHeight: 24 }}>{label}</Text>;
}

export default function ClerkLayout() {
  const user = useAuthStore(s => s.user);
  if (!user || user.role !== 'clerk') return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.inversePrimary,
        tabBarInactiveTintColor: Colors.onPrimaryContainer,
        tabBarStyle: {
          backgroundColor: Colors.primary,
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 88 : 66,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          ...Typography.labelCaps,
          fontSize: 9,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <TabIcon label="⊞" color={color} />,
        }}
      />
      <Tabs.Screen
        name="cases"
        options={{
          title: 'Cases',
          tabBarIcon: ({ color }) => <TabIcon label="≡" color={color} />,
        }}
      />
      <Tabs.Screen
        name="new-case"
        options={{
          title: 'New',
          tabBarIcon: ({ color }) => <TabIcon label="＋" color={color} />,
        }}
      />
      <Tabs.Screen
        name="case-detail"
        options={{
          href: null, // hide from tab bar, accessed via navigation
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabIcon label="◎" color={color} />,
        }}
      />
    </Tabs>
  );
}
