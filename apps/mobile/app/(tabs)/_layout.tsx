import { Tabs } from 'expo-router'
import { Text } from 'react-native'
import { colors } from '@/lib/colors'

function Icon({ label }: { label: string }) {
  return <Text style={{ fontSize: 20 }}>{label}</Text>
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand[600],
        tabBarInactiveTintColor: colors.gray[400],
        tabBarStyle: {
          borderTopColor: colors.gray[100],
          paddingBottom: 6,
          paddingTop: 6,
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tabs.Screen name="index"
        options={{ title: 'Home', tabBarIcon: ({ focused }) => <Icon label={focused ? '🏠' : '🏡'} /> }} />
      <Tabs.Screen name="appointments"
        options={{ title: 'Appointments', tabBarIcon: ({ focused }) => <Icon label={focused ? '📅' : '🗓'} /> }} />
      <Tabs.Screen name="records"
        options={{ title: 'Records', tabBarIcon: ({ focused }) => <Icon label={focused ? '📋' : '📄'} /> }} />
      <Tabs.Screen name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ focused }) => <Icon label={focused ? '👤' : '👥'} /> }} />
    </Tabs>
  )
}
