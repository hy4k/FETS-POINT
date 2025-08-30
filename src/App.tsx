import { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { Login } from './components/Login'
import { Dashboard } from './components/Dashboard'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { supabase } from './lib/supabase'
import { useIsMobile, useScreenSize } from './hooks/use-mobile'

// Import all page components
import { CandidateTracker } from './components/CandidateTracker'
import { MyDesk } from './components/MyDesk'
import { StaffManagement } from './components/StaffManagement'
import { FetsVault } from './components/FetsVault'
import { FetsIntelligence } from './components/FetsIntelligence'
import { FetsRoster } from './components/FetsRoster'
import { FetsCalendar } from './components/FetsCalendar'
import { LogIncident } from './components/LogIncident'
import { ChecklistManagement } from './components/ChecklistManagement'
import { SettingsPage } from './components/SettingsPage'

// Connection status component for debugging
function ConnectionStatus() {
  const [connectionTest, setConnectionTest] = useState<string>('untested')
  
  const testConnection = async () => {
    try {
      setConnectionTest('testing')
      console.log('🔄 Testing Supabase connection...')
      
      const { error } = await supabase.from('profiles').select('count', { count: 'exact', head: true })
      
      if (error) {
        console.error('❌ Connection test failed:', error.message)
        setConnectionTest('failed')
      } else {
        console.log('✅ Connection test successful')
        setConnectionTest('success')
      }
    } catch (err: any) {
      console.error('❌ Connection test exception:', err.message)
      setConnectionTest('failed')
    }
  }
  
  if (process.env.NODE_ENV === 'development') {
    return (
      <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg border z-50">
        <div className="text-sm">
          <div className="font-medium mb-2">Supabase Connection</div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={testConnection}
              className="px-3 py-1 bg-blue-500 text-white rounded text-xs"
              disabled={connectionTest === 'testing'}
            >
              {connectionTest === 'testing' ? 'Testing...' : 'Test'}
            </button>
            <span className={`text-xs ${connectionTest === 'success' ? 'text-green-600' : connectionTest === 'failed' ? 'text-red-600' : 'text-gray-500'}`}>
              {connectionTest === 'success' ? '✅ Connected' : connectionTest === 'failed' ? '❌ Failed' : '⏳ Untested'}
            </span>
          </div>
        </div>
      </div>
    )
  }
  
  return null
}

function AppContent() {
  const { user, loading } = useAuth()
  const [activeTab, setActiveTab] = useState('command-center')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const isMobile = useIsMobile()
  const screenSize = useScreenSize()

  // Log app initialization
  console.log('🚀 FETS POINT App initialized')
  console.log('📊 App state:', { userAuthenticated: !!user, loading, isMobile, screenSize })

  if (loading) {
    return (
      <div className="golden-theme flex items-center justify-center relative min-h-screen">
        <div className="text-center relative z-10 px-4">
          <div className="golden-logo inline-block mb-8 golden-pulse">
            <img 
              src="/fets-point-logo.png" 
              alt="FETS POINT" 
              className="h-16 w-16 sm:h-20 sm:w-20"
            />
          </div>
          <h1 className="golden-title mb-4 text-2xl sm:text-3xl">FETS POINT</h1>
          <p className="golden-subtitle mb-8 text-sm sm:text-base">Loading Operational Platform Management Console...</p>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
          </div>
        </div>
        <ConnectionStatus />
      </div>
    )
  }

  if (!user) {
    return (
      <>
        <Login />
        <ConnectionStatus />
      </>
    )
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'command-center':
        return <Dashboard onNavigate={setActiveTab} />
      case 'candidate-tracker':
        return <CandidateTracker />
      case 'fets-roster':
        return <FetsRoster />
      case 'fets-calendar':
        return <FetsCalendar />
      case 'my-desk':
        return <MyDesk />
      case 'staff-management':
        return <StaffManagement />
      case 'fets-vault':
        return <FetsVault />
      case 'fets-intelligence':
        return <FetsIntelligence />
      case 'log-incident':
        return <LogIncident />
      case 'checklist-management':
        return <ChecklistManagement />
      case 'settings':
        return <SettingsPage />
      default:
        return <Dashboard onNavigate={setActiveTab} />
    }
  }

  return (
    <div className="golden-theme min-h-screen relative">
      {/* Single Unified Header */}
      <Header 
        isMobile={isMobile} 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen}
      />
      
      {/* Desktop Sidebar */}
      {!isMobile && (
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          isMobile={false}
          isCollapsed={sidebarCollapsed}
          setIsCollapsed={setSidebarCollapsed}
        />
      )}
      
      {/* Mobile Sidebar */}
      {isMobile && sidebarOpen && (
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={(tab) => {
            setActiveTab(tab)
            setSidebarOpen(false)
          }}
          isMobile={true}
          onClose={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Main Content with proper spacing */}
      <div className="content-with-single-banner">
        <div className="dashboard-centered">
          {renderContent()}
        </div>
      </div>
      
      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30">
          <MobileBottomNav 
            activeTab={activeTab} 
            setActiveTab={setActiveTab}
          />
        </div>
      )}
      
      <ConnectionStatus />
    </div>
  )
}

// Mobile Bottom Navigation Component
function MobileBottomNav({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: (tab: string) => void }) {
  const navigation = [
    { id: 'command-center', name: 'Dashboard', icon: '🏠' },
    { id: 'fets-roster', name: 'Roster', icon: '👥' },
    { id: 'fets-calendar', name: 'Calendar', icon: '📅' },
    { id: 'staff-management', name: 'Staff', icon: '👤' }
  ]

  return (
    <div className="flex items-center justify-around py-2 px-1 bg-white border-t border-gray-200">
      {navigation.map((item) => (
        <button
          key={item.id}
          onClick={() => setActiveTab(item.id)}
          className={`flex flex-col items-center justify-center p-2 rounded-lg min-h-[44px] flex-1 transition-colors ${
            activeTab === item.id
              ? 'text-yellow-600 bg-yellow-50'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <span className="text-lg mb-1">{item.icon}</span>
          <span className="text-xs font-medium">{item.name}</span>
        </button>
      ))}
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  )
}

export default App
