import { useState, useEffect } from 'react'
import { Settings, User, Shield, Bell, Monitor, Database, Key, Save, RefreshCw, AlertTriangle, CheckCircle, Eye, EyeOff, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface UserSettings {
  notifications: {
    email: boolean
    push: boolean
    desktop: boolean
    security: boolean
    updates: boolean
  }
  display: {
    theme: 'dark' | 'light' | 'auto'
    language: string
    timezone: string
    dateFormat: string
  }
  security: {
    twoFactor: boolean
    sessionTimeout: number
    loginAlerts: boolean
  }
  system: {
    autoBackup: boolean
    maintenanceMode: boolean
    debugMode: boolean
  }
}

export function SettingsPage() {
  const { profile, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [settings, setSettings] = useState<UserSettings>({
    notifications: {
      email: true,
      push: true,
      desktop: false,
      security: true,
      updates: true
    },
    display: {
      theme: 'dark',
      language: 'en',
      timezone: 'UTC',
      dateFormat: 'MM/DD/YYYY'
    },
    security: {
      twoFactor: false,
      sessionTimeout: 30,
      loginAlerts: true
    },
    system: {
      autoBackup: true,
      maintenanceMode: false,
      debugMode: false
    }
  })
  const [profileData, setProfileData] = useState({
    fullName: profile?.full_name || '',
    email: profile?.email || '',
    phone: '',
    role: profile?.role || '',
    department: '',
    bio: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')

  // Role-based access control
  const isSuperAdmin = profile?.role === 'super_admin'
  const isAdmin = profile?.role === 'admin' || isSuperAdmin
  const canAccessSystemSettings = isSuperAdmin

  useEffect(() => {
    loadUserSettings()
  }, [])

  const loadUserSettings = async () => {
    try {
      // Load user settings from database or localStorage
      const savedSettings = localStorage.getItem('fets-point-settings')
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings))
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    }
  }

  const handleSaveSettings = async () => {
    try {
      setIsLoading(true)
      
      // Save settings to localStorage (in production, save to database)
      localStorage.setItem('fets-point-settings', JSON.stringify(settings))
      
      setSaveMessage('Settings saved successfully!')
      setTimeout(() => setSaveMessage(''), 3000)
    } catch (error) {
      console.error('Error saving settings:', error)
      setSaveMessage('Error saving settings')
      setTimeout(() => setSaveMessage(''), 3000)
    } finally {
      setIsLoading(false)
    }
  }

  const handleProfileUpdate = async () => {
    try {
      setIsLoading(true)
      
      // Update profile in database
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileData.fullName,
          // Add other profile fields as needed
        })
        .eq('user_id', profile?.user_id)

      if (error) {
        console.error('Error updating profile:', error)
        setSaveMessage('Error updating profile')
      } else {
        setSaveMessage('Profile updated successfully!')
      }
      
      setTimeout(() => setSaveMessage(''), 3000)
    } catch (error) {
      console.error('Error updating profile:', error)
      setSaveMessage('Error updating profile')
      setTimeout(() => setSaveMessage(''), 3000)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'display', name: 'Display', icon: Monitor },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'system', name: 'System', icon: Database }
  ]

  return (
    <div className="flex-1 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Settings className="h-8 w-8 text-yellow-400 mr-3" />
            <h1 className="text-3xl font-bold text-white">Settings</h1>
          </div>
          {saveMessage && (
            <div className={`px-4 py-2 rounded-lg ${
              saveMessage.includes('Error') 
                ? 'bg-red-500/20 text-red-400' 
                : 'bg-green-500/20 text-green-400'
            }`}>
              {saveMessage}
            </div>
          )}
        </div>
        <p className="text-gray-300">Customize your FETS POINT experience and manage system preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings Sidebar */}
        <div className="lg:col-span-1">
          <div className="golden-card p-4">
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{tab.name}</span>
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          <div className="golden-card p-6">
            {/* Profile Settings */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">Profile Settings</h2>
                  <button
                    onClick={handleProfileUpdate}
                    disabled={isLoading}
                    className="golden-button flex items-center space-x-2"
                  >
                    {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    <span>Save Changes</span>
                  </button>
                </div>

                {/* Profile Avatar */}
                <div className="flex items-center space-x-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-black font-bold text-2xl">
                    {profileData.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'U'}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">{profileData.fullName || 'User'}</h3>
                    <p className="text-gray-400">{profileData.role || 'Staff Member'}</p>
                    <button className="text-yellow-400 hover:text-yellow-300 text-sm mt-1">
                      Change Avatar
                    </button>
                  </div>
                </div>

                {/* Profile Form */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Full Name</label>
                    <input
                      type="text"
                      className="golden-input w-full"
                      value={profileData.fullName}
                      onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
                    <input
                      type="email"
                      className="golden-input w-full"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Phone</label>
                    <input
                      type="tel"
                      className="golden-input w-full"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Role</label>
                    <input
                      type="text"
                      className="golden-input w-full"
                      value={profileData.role}
                      onChange={(e) => setProfileData({ ...profileData, role: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Bio</label>
                  <textarea
                    className="golden-input w-full h-24"
                    value={profileData.bio}
                    onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                    placeholder="Tell us about yourself..."
                  />
                </div>

                {/* Account Actions */}
                <div className="pt-6 border-t border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-4">Account Actions</h3>
                  <div className="flex items-center space-x-4">
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      Change Password
                    </button>
                    <button 
                      onClick={handleSignOut}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Notification Settings */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">Notification Preferences</h2>
                  <button
                    onClick={handleSaveSettings}
                    disabled={isLoading}
                    className="golden-button flex items-center space-x-2"
                  >
                    {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    <span>Save Changes</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {[
                    { key: 'email', label: 'Email Notifications', description: 'Receive notifications via email' },
                    { key: 'push', label: 'Push Notifications', description: 'Browser push notifications' },
                    { key: 'desktop', label: 'Desktop Notifications', description: 'System desktop notifications' },
                    { key: 'security', label: 'Security Alerts', description: 'Important security notifications' },
                    { key: 'updates', label: 'System Updates', description: 'Notifications about system updates' }
                  ].map((setting) => (
                    <div key={setting.key} className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                      <div>
                        <h4 className="font-medium text-white">{setting.label}</h4>
                        <p className="text-sm text-gray-400">{setting.description}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={settings.notifications[setting.key as keyof typeof settings.notifications]}
                          onChange={(e) => setSettings({
                            ...settings,
                            notifications: {
                              ...settings.notifications,
                              [setting.key]: e.target.checked
                            }
                          })}
                        />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-400"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Display Settings */}
            {activeTab === 'display' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">Display Settings</h2>
                  <button
                    onClick={handleSaveSettings}
                    disabled={isLoading}
                    className="golden-button flex items-center space-x-2"
                  >
                    {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    <span>Save Changes</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Theme</label>
                    <select
                      className="golden-input w-full"
                      value={settings.display.theme}
                      onChange={(e) => setSettings({
                        ...settings,
                        display: { ...settings.display, theme: e.target.value as any }
                      })}
                    >
                      <option value="dark">Dark</option>
                      <option value="light">Light</option>
                      <option value="auto">Auto</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Language</label>
                    <select
                      className="golden-input w-full"
                      value={settings.display.language}
                      onChange={(e) => setSettings({
                        ...settings,
                        display: { ...settings.display, language: e.target.value }
                      })}
                    >
                      <option value="en">English</option>
                      <option value="es">Español</option>
                      <option value="fr">Français</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Timezone</label>
                    <select
                      className="golden-input w-full"
                      value={settings.display.timezone}
                      onChange={(e) => setSettings({
                        ...settings,
                        display: { ...settings.display, timezone: e.target.value }
                      })}
                    >
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/Denver">Mountain Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Date Format</label>
                    <select
                      className="golden-input w-full"
                      value={settings.display.dateFormat}
                      onChange={(e) => setSettings({
                        ...settings,
                        display: { ...settings.display, dateFormat: e.target.value }
                      })}
                    >
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Security Settings */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">Security Settings</h2>
                  <button
                    onClick={handleSaveSettings}
                    disabled={isLoading}
                    className="golden-button flex items-center space-x-2"
                  >
                    {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    <span>Save Changes</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Two-Factor Authentication */}
                  <div className="p-4 rounded-lg bg-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-white">Two-Factor Authentication</h4>
                        <p className="text-sm text-gray-400">Add an extra layer of security to your account</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={settings.security.twoFactor}
                          onChange={(e) => setSettings({
                            ...settings,
                            security: { ...settings.security, twoFactor: e.target.checked }
                          })}
                        />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-400"></div>
                      </label>
                    </div>
                  </div>

                  {/* Session Timeout */}
                  <div className="p-4 rounded-lg bg-white/5">
                    <div className="mb-2">
                      <h4 className="font-medium text-white">Session Timeout</h4>
                      <p className="text-sm text-gray-400">Automatic logout after inactivity</p>
                    </div>
                    <select
                      className="golden-input w-full max-w-xs"
                      value={settings.security.sessionTimeout}
                      onChange={(e) => setSettings({
                        ...settings,
                        security: { ...settings.security, sessionTimeout: parseInt(e.target.value) }
                      })}
                    >
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={60}>1 hour</option>
                      <option value={120}>2 hours</option>
                      <option value={240}>4 hours</option>
                    </select>
                  </div>

                  {/* Login Alerts */}
                  <div className="p-4 rounded-lg bg-white/5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-white">Login Alerts</h4>
                        <p className="text-sm text-gray-400">Get notified of new login attempts</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={settings.security.loginAlerts}
                          onChange={(e) => setSettings({
                            ...settings,
                            security: { ...settings.security, loginAlerts: e.target.checked }
                          })}
                        />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-400"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* System Settings */}
            {activeTab === 'system' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">System Settings</h2>
                  <button
                    onClick={handleSaveSettings}
                    disabled={isLoading}
                    className="golden-button flex items-center space-x-2"
                  >
                    {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    <span>Save Changes</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {[
                    { 
                      key: 'autoBackup', 
                      label: 'Automatic Backup', 
                      description: 'Automatically backup system data daily',
                      restricted: false
                    },
                    { 
                      key: 'maintenanceMode', 
                      label: 'Maintenance Mode', 
                      description: 'Enable system maintenance mode',
                      restricted: true
                    },
                    { 
                      key: 'debugMode', 
                      label: 'Debug Mode', 
                      description: 'Enable detailed system logging',
                      restricted: true
                    }
                  ].map((setting) => (
                    <div key={setting.key} className="p-4 rounded-lg bg-white/5">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-white">{setting.label}</h4>
                            {setting.restricted && (
                              <Key className="h-4 w-4 text-yellow-400" />
                            )}
                          </div>
                          <p className="text-sm text-gray-400">{setting.description}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={settings.system[setting.key as keyof typeof settings.system]}
                            disabled={setting.restricted && profile?.role !== 'super_admin'}
                            onChange={(e) => setSettings({
                              ...settings,
                              system: {
                                ...settings.system,
                                [setting.key]: e.target.checked
                              }
                            })}
                          />
                          <div className={`w-11 h-6 ${setting.restricted && profile?.role !== 'super_admin' ? 'bg-gray-700' : 'bg-gray-600'} peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-400 peer-disabled:opacity-50`}></div>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>

                {/* System Information */}
                <div className="pt-6 border-t border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-4">System Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-gray-400">Version</p>
                      <p className="text-white font-medium">FETS POINT v2.0.1</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-gray-400">Last Updated</p>
                      <p className="text-white font-medium">August 18, 2025</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-gray-400">Database</p>
                      <p className="text-white font-medium">PostgreSQL 15.3</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-gray-400">Uptime</p>
                      <p className="text-white font-medium">15 days, 8 hours</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
