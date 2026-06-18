import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'

const SecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
}

const SUPABASE_URL = 'https://urrccvyiibqcfqfjgedp.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVycmNjdnlpaWJxY2ZxZmpnZWRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1NjMzOTUsImV4cCI6MjA2NTEzOTM5NX0.dH3YmWDCO7IHJbZCY_qFcJ5kKPCqNQ_RiWJPPY-XWXo'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
