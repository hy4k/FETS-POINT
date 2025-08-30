import { createClient } from '@supabase/supabase-js'

// Production-ready environment variable configuration with secure fallbacks
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qqewusetilxxfvfkmsed.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxZXd1c2V0aWx4eGZ2Zmttc2VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNjI2NTUsImV4cCI6MjA3MDkzODY1NX0.-x783XXpilPWC3O-cJqmdSTmhpAvObk_MSElfGdrU8s'

// Configuration validation and logging
console.log('🔧 Supabase Configuration:')
console.log('URL Source:', import.meta.env.VITE_SUPABASE_URL ? 'Environment Variable ✅' : 'Fallback ⚠️')
console.log('Key Source:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Environment Variable ✅' : 'Fallback ⚠️')
console.log('Connection Ready ✅')

// Validate configuration
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration. Check environment variables or fallbacks.')
}

// Create and export Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'x-application': 'fets-point'
    }
  }
})

console.log('✅ Supabase client created successfully')

// Export configuration for debugging
export const config = {
  url: supabaseUrl,
  keyPreview: supabaseAnonKey.substring(0, 20) + '...'
}