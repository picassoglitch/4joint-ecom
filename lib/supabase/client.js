import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// During build time, provide dummy values to avoid errors
// These will be replaced with actual values at runtime
const buildTimeUrl = supabaseUrl || 'https://placeholder.supabase.co'
const buildTimeKey = supabaseAnonKey || 'placeholder-key'

export const supabase = createClient(buildTimeUrl, buildTimeKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce', // Use PKCE flow for better security
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'sb-auth-token',
  },
})

// Validate at runtime (not during build)
if (typeof window !== 'undefined' && (!supabaseUrl || !supabaseAnonKey)) {
  console.error('⚠️ Missing Supabase environment variables. Some features may not work.')
}

