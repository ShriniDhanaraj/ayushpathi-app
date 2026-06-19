import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { TouchableOpacity, Text } from 'react-native'
import { supabase } from '../../lib/supabase'
import { resolveAndOpenSupportWA } from '../../lib/whatsapp'

function WAHeaderButton() {
  async function handlePress() {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      await resolveAndOpenSupportWA(session.access_token, 'Hi! I need help with my Ayushpathi appointment.')
    }
  }
  return (
    <TouchableOpacity onPress={handlePress} style={{ marginRight: 16 }}>
      <Text style={{ fontSize: 22 }}>💬</Text>
    </TouchableOpacity>
  )
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1a6b3a',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#e0ede6' },
        headerShown: true,
        headerRight: () => <WAHeaderButton />,
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#166534',
      }}
    >
      <Tabs.Screen name="index"
        options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="appointments"
        options={{ title: 'Appointments', tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="records"
        options={{ title: 'Records', tabBarIcon: ({ color, size }) => <Ionicons name="document-text-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="doctors"
        options={{ title: 'Doctors', tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} /> }} />
    </Tabs>
  )
}
