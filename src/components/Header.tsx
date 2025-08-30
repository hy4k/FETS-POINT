// React import not needed with new JSX transform
import { LogOut, Bell, Menu, X, Moon, Sun, MapPin, User } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

interface HeaderProps {
  isMobile?: boolean
  sidebarOpen?: boolean
  setSidebarOpen?: (open: boolean) => void
}

export function Header({ isMobile = false, sidebarOpen = false, setSidebarOpen }: HeaderProps = {}) {
  const { signOut, profile, user } = useAuth()
  const { isDarkMode, toggleDarkMode } = useTheme()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const getDisplayName = () => {
    if (profile?.first_name) {
      return profile.first_name
    }
    if (user?.email) {
      return user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1)
    }
    return 'User'
  }

  const getUserRole = () => {
    if (profile?.role) {
      return profile.role.charAt(0).toUpperCase() + profile.role.slice(1)
    }
    return 'Super Admin'
  }

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  return (
    <>
      {/* SINGLE UNIFIED BANNER HEADER */}
      <div className="single-banner-header">
        <div className="single-banner-content">
          {/* Left Side: Welcome & Status Info */}
          <div className="banner-main-info">
            {/* Mobile Menu Button */}
            {isMobile && setSidebarOpen && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="banner-icon-button mr-2"
                aria-label="Toggle navigation menu"
              >
                {sidebarOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
            )}
            
            <div className="banner-welcome-text">
              <div className="banner-greeting">
                Good morning, {getDisplayName()}
              </div>
              <div className="banner-status">
                Platform Management Console is online • {getCurrentTime()}
              </div>
            </div>
          </div>

          {/* Right Side: Controls & User Info */}
          <div className="banner-controls">
            {/* Location Info */}
            {!isMobile && (
              <div className="banner-location">
                <MapPin className="h-3 w-3 inline mr-1" />
                Kochi, Kerala, India
              </div>
            )}
            
            {/* User Role & Info */}
            <div className="banner-user-info">
              <User className="h-4 w-4" />
              <span>{getUserRole()}</span>
            </div>
            
            {/* Action Buttons */}
            <div className="banner-action-buttons">
              {/* Dark Mode Toggle */}
              <button 
                onClick={toggleDarkMode}
                className="banner-icon-button"
                aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDarkMode ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </button>
              
              {/* Notifications */}
              <button className="banner-icon-button">
                <Bell className="h-4 w-4" />
              </button>
              
              {/* User Avatar */}
              <div className="banner-icon-button">
                <span className="text-xs font-bold">
                  {getDisplayName().charAt(0).toUpperCase()}
                </span>
              </div>
              
              {/* Sign Out */}
              <button
                onClick={handleSignOut}
                className="banner-icon-button hover:bg-red-200"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* SPACER - Push content below fixed header */}
      <div className="h-20"></div>
    </>
  )
}