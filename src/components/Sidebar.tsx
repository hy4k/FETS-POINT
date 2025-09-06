import { 
  ChevronRight,
  ChevronLeft,
  X
} from 'lucide-react'
import { navigationGroups, NavigationItem } from '../lib/navigation'

interface SidebarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  isMobile?: boolean
  onClose?: () => void
  isCollapsed?: boolean
  setIsCollapsed?: (collapsed: boolean) => void
}

export function Sidebar({ 
  activeTab, 
  setActiveTab, 
  isMobile = false, 
  onClose,
  isCollapsed = false,
  setIsCollapsed
}: SidebarProps) {

  const handleItemClick = (item: NavigationItem) => {
    setActiveTab(item.id)
    if (isMobile && onClose) {
      onClose()
    }
  }

  const renderMenuItem = (item: NavigationItem) => {
    const Icon = item.icon
    const isActive = activeTab === item.id
    
    return (
      <button
        key={item.id}
        onClick={() => handleItemClick(item)}
        className={`reference-menu-item ${isActive ? 'active' : ''}`}
        title={isCollapsed ? item.name : undefined}
      >
        <div className="reference-menu-icon">
          <Icon size={20} />
        </div>
        {!isCollapsed && (
          <>
            <span className="reference-menu-text">{item.name}</span>
            {item.badge && (
              <span className={`reference-menu-badge ${isActive ? 'active' : ''}`}>
                {item.badge}
              </span>
            )}
          </>
        )}
      </button>
    )
  }

  const sidebarClassName = `reference-glassmorphic-sidebar ${
    isMobile ? 'w-80' : isCollapsed ? 'w-20' : 'w-72'
  }`

  const sidebarContent = (
    <div className={sidebarClassName}>
      {/* Brand Area - Exactly matching reference */}
      <div className="reference-brand-area">
        {!isCollapsed || isMobile ? (
          <>
            <div className="reference-brand-logo">
              <div className="reference-logo-icon">
                <div className="logo-square green"></div>
                <div className="logo-square orange"></div>
                <div className="logo-square blue"></div>
                <div className="logo-square yellow"></div>
              </div>
            </div>
            <h2 className="reference-brand-title">FETS POINT</h2>
            <p className="reference-brand-subtitle">Modern Command Center</p>
          </>
        ) : (
          <div className="text-center">
            <div className="reference-logo-icon-small">
              <div className="logo-square-small green"></div>
              <div className="logo-square-small orange"></div>
              <div className="logo-square-small blue"></div>
              <div className="logo-square-small yellow"></div>
            </div>
          </div>
        )}
        
        {/* Desktop Collapse Toggle */}
        {!isMobile && setIsCollapsed && (
          <div className="absolute top-6 right-6">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 rounded-lg hover:bg-white/20 transition-all"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <ChevronRight size={16} className="text-gray-600" />
              ) : (
                <ChevronLeft size={16} className="text-gray-600" />
              )}
            </button>
          </div>
        )}
        
        {/* Mobile Close Button */}
        {isMobile && onClose && (
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-lg hover:bg-white/20 transition-all"
            aria-label="Close navigation menu"
          >
            <X size={20} className="text-gray-600" />
          </button>
        )}
      </div>
      
      {/* Navigation Area - Exactly matching reference */}
      <div className="reference-navigation-area">
        {Object.entries(navigationGroups).map(([groupName, items]) => {
          const sectionTitles: { [key: string]: string } = {
            operations: 'OPERATIONS',
            compliance: 'COMPLIANCE', 
            admin: 'ADMIN'
          }
          
          return (
            <div key={groupName} className="reference-menu-section">
              {!isCollapsed && (
                <div className="reference-section-label">
                  {sectionTitles[groupName]}
                </div>
              )}
              <div className="reference-menu-items">
                {items.map(renderMenuItem)}
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Footer - Matching reference */}
      <div className="reference-sidebar-footer">
        {!isCollapsed || isMobile ? (
          <>
            <div className="reference-footer-version">FETS POINT v2.0</div>
            <div className="reference-footer-caption">Platform Management Console</div>
          </>
        ) : (
          <div className="text-center">
            <div className="reference-footer-version">v2.0</div>
          </div>
        )}
      </div>
    </div>
  )

  // For mobile, wrap in overlay
  if (isMobile && onClose) {
    return (
      <div className="mobile-sidebar" onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()}>
          {sidebarContent}
        </div>
      </div>
    )
  }

  return sidebarContent
}