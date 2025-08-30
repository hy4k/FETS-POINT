import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase, config } from '../lib/supabase'
import { Shield } from 'lucide-react'

export function Login() {
  const [email, setEmail] = useState('mithun@fets.in') // Pre-fill test credentials
  const [password, setPassword] = useState('123456')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signIn } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (import.meta.env.DEV) {
        console.log('Login attempt for:', email)
        console.log('Supabase config:', config)
      }
      
      // Test connection first if in development
      if (import.meta.env.DEV) {
        const { error: testError } = await supabase.from('profiles').select('count', { count: 'exact', head: true })
        if (testError) {
          console.error('Connection test failed:', testError)
          setError(`Connection failed: ${testError.message}`)
          setLoading(false)
          return
        }
        console.log('Connection test passed, proceeding with login')
      }
      
      const { error } = await signIn(email, password)
      if (error) {
        if (import.meta.env.DEV) {
          console.error('Login failed:', error)
        }
        setError(`Login failed: ${error.message}`)
      } else {
        if (import.meta.env.DEV) {
          console.log('Login successful!')
        }
      }
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.error('Login exception:', err)
      }
      setError(`Exception: ${err.message || 'Login failed'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-dark-theme flex items-center justify-center p-4 relative">
      {/* Main Content */}
      <div className="text-center max-w-md mx-auto">
        {/* FETS POINT Logo and Branding */}
        <div className="mb-12">
          <div className="golden-logo inline-block mb-6">
            <img 
              src="/fets-point-logo.png" 
              alt="FETS POINT" 
              className="h-16 w-16"
            />
          </div>
          <h1 className="golden-title mb-2">FETS POINT</h1>
          <p className="golden-subtitle">Operational Platform Management Console</p>
          <div className="w-16 h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent mx-auto mt-4"></div>
        </div>

        {/* Login Card */}
        <div className="golden-card p-8 max-w-sm mx-auto">
          {/* Security Icon */}
          <div className="text-center mb-6">
            <div className="golden-logo inline-block p-3 mb-4">
              <Shield className="h-6 w-6 text-black" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Secure Access</h2>
            <p className="text-sm text-gray-300">Enter your credentials to access the platform management console</p>
          </div>

          {/* Development Debug Panel - Only visible in dev mode */}
          {import.meta.env.DEV && (
            <div className="golden-error mb-4 text-xs">
              <div className="font-medium mb-1">Development Mode</div>
              <div className="text-xs">
                <div>URL: {config.url}</div>
                <div>Key: {config.keyPreview}</div>
                <div className="text-green-400 mt-1">Environment variables: {import.meta.env.VITE_SUPABASE_URL ? 'Set' : 'Fallback'}</div>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="golden-error">
                <div className="font-medium text-sm">Error:</div>
                <div className="text-xs mt-1">{error}</div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="golden-input w-full"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="golden-input w-full"
                placeholder="Enter your password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="golden-button w-full flex items-center justify-center space-x-2"
            >
              <Shield className="h-4 w-4" />
              <span>{loading ? 'Accessing...' : 'Access Platform Management Console'}</span>
            </button>
          </form>

          {import.meta.env.DEV && (
            <div className="mt-4 text-center text-xs text-gray-400">
              Test Credentials: mithun@fets.in / 123456
            </div>
          )}
        </div>

        {/* Pagination Dots */}
        <div className="flex justify-center space-x-2 mt-8">
          <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
          <div className="w-2 h-2 rounded-full bg-gray-600"></div>
          <div className="w-2 h-2 rounded-full bg-gray-600"></div>
        </div>
      </div>
    </div>
  )
}
