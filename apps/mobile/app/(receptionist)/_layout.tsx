import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

export default function ReceptionistLayout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: '#16A34A',
      tabBarInactiveTintColor: '#9CA3AF',
      headerShown: false,
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Today's Queue",
          tabBarIcon: ({ color, size }) => <Ionicons name="list" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="book"
        options={{
          title: 'Book',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="prescription"
        options={{
          title: 'Prescription',
          tabBarIcon: ({ color, size }) => <Ionicons name="document-text-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  )
}
