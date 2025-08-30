import { useState, useEffect } from 'react'
import { 
  Calendar, 
  CheckCircle, 
  Clock, 
  UserCheck, 
  Users, 
  CalendarDays, 
  FileText, 
  AlertTriangle, 
  BarChart3,
  Plus,
  Eye
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

interface ModernStatsCardProps {
  title: string
  value: string | number
  subtitle: string
  icon: React.ElementType
  status?: 'positive' | 'warning' | 'neutral' | 'primary'
  onClick?: () => void
  clickable?: boolean
}

function ModernStatsCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  status = 'primary', 
  onClick, 
  clickable = false 
}: ModernStatsCardProps) {
  const statusClass = {
    positive: 'status-positive',
    warning: 'status-warning', 
    neutral: 'status-neutral',
    primary: 'status-warning' // Default to primary gradient
  }[status]

  return (
    <div 
      className={`stats-card ${clickable ? 'cursor-pointer' : ''}`}
      onClick={clickable ? onClick : undefined}
    >
      <div className="stats-card-title">{title}</div>
      <div className="stats-card-number">{value}</div>
      <div className="stats-card-subtitle">{subtitle}</div>
      <div className={`stats-icon ${statusClass}`}>
        <Icon />
      </div>
    </div>
  )
}

interface DashboardProps {
  onNavigate?: (tab: string) => void
}

export function Dashboard({ onNavigate }: DashboardProps = {}) {
  const { profile } = useAuth()
  const [candidateMetrics, setCandidateMetrics] = useState({
    todaysCandidates: { count: 0, subtitle: 'Loading...' },
    checkedIn: { count: 0, subtitle: 'Loading...' },
    inProgress: { count: 0, subtitle: 'Loading...' },
    completed: { count: 0, subtitle: 'Loading...' }
  })
  const [incidentStats, setIncidentStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0
  })
  const [checklistStats, setChecklistStats] = useState({
    todayInstances: 0,
    completedInstances: 0,
    totalProgress: 0
  })

  useEffect(() => {
    loadCandidateMetrics()
    loadIncidentStats()
    loadChecklistStats()
  }, [])

  const loadCandidateMetrics = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      const { data: todaysCandidates } = await supabase
        .from('candidates')
        .select('*')
        .gte('exam_date', `${today}T00:00:00Z`)
        .lt('exam_date', `${today}T23:59:59Z`)
      
      if (todaysCandidates) {
        const checkedInCount = todaysCandidates.filter(c => c.status === 'checked_in').length
        const inProgressCount = todaysCandidates.filter(c => c.status === 'in_progress').length
        const completedCount = todaysCandidates.filter(c => c.status === 'completed').length
        
        setCandidateMetrics({
          todaysCandidates: {
            count: todaysCandidates.length,
            subtitle: todaysCandidates.length > 0 ? 'Scheduled for today' : 'No candidates today'
          },
          checkedIn: {
            count: checkedInCount,
            subtitle: checkedInCount > 0 ? 'Currently checked in' : 'None checked in'
          },
          inProgress: {
            count: inProgressCount,
            subtitle: inProgressCount > 0 ? 'Active exams' : 'No active exams'
          },
          completed: {
            count: completedCount,
            subtitle: completedCount > 0 ? 'Finished today' : 'No completions yet'
          }
        })
      } else {
        throw new Error('No data available')
      }
    } catch (error) {
      console.error('Error loading candidate metrics:', error)
      setCandidateMetrics({
        todaysCandidates: { count: 0, subtitle: 'No candidates today' },
        checkedIn: { count: 0, subtitle: 'None checked in' },
        inProgress: { count: 0, subtitle: 'No active exams' },
        completed: { count: 0, subtitle: 'No completed exams' }
      })
    }
  }

  const loadIncidentStats = async () => {
    try {
      const { data: incidents } = await supabase
        .from('incidents')
        .select('*')

      if (incidents) {
        const stats = {
          total: incidents.length,
          open: incidents.filter(i => i.status === 'open').length,
          inProgress: incidents.filter(i => i.status === 'in_progress').length,
          resolved: incidents.filter(i => i.status === 'rectified' || i.status === 'closed').length
        }
        setIncidentStats(stats)
      }
    } catch (error) {
      console.error('Error loading incident stats:', error)
    }
  }

  const loadChecklistStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data: instances } = await supabase
        .from('checklist_instances')
        .select(`
          *,
          items:checklist_instance_items(*)
        `)

      if (instances) {
        const todayInstances = instances.filter(i => i.exam_date === today).length
        const completedInstances = instances.filter(i => i.completed_at).length
        
        let totalItems = 0
        let completedItems = 0
        instances.forEach(instance => {
          if (instance.items) {
            totalItems += instance.items.length
            completedItems += instance.items.filter((item: any) => item.is_completed).length
          }
        })
        
        const totalProgress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0
        
        setChecklistStats({
          todayInstances,
          completedInstances,
          totalProgress
        })
      }
    } catch (error) {
      console.error('Error loading checklist stats:', error)
    }
  }

  const getDisplayName = () => {
    if (profile?.full_name) {
      return profile.full_name.split(' ')[0]
    }
    return 'User'
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="dashboard-modern flex-1 overflow-auto">
      <div className="dashboard-centered">
        {/* Modern Welcome Section - Only show on Command Center */}
        <div className="dashboard-section">
          <div className="modern-card p-6 mb-8" style={{
            background: 'var(--primary-gradient)',
            color: 'white',
            border: 'none'
          }}>
            <div className="flex items-center justify-between flex-col sm:flex-row space-y-4 sm:space-y-0">
              <div className="text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                  {getGreeting()}, {getDisplayName()}! ✨
                </h1>
                <p className="text-white/90 text-lg">
                  Welcome to your FETS POINT Platform Management Console
                </p>
                <div className="flex items-center justify-center sm:justify-start mt-3 text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                  <span className="text-white/80">System operational - All services running</span>
                </div>
              </div>
              
              <div className="hidden sm:block bg-white/20 rounded-full px-4 py-2">
                <span className="text-white text-sm font-semibold">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

      {/* Statistics Overview - 2x2 Grid Layout */}
      <div className="dashboard-section">
        <h2 className="section-title">Today's Activity</h2>
        <div className="stats-grid">
          <ModernStatsCard
            title="Today's Candidates"
            value={candidateMetrics.todaysCandidates.count}
            subtitle={candidateMetrics.todaysCandidates.subtitle}
            icon={Calendar}
            status="primary"
            clickable={true}
            onClick={() => onNavigate?.('candidate-tracker')}
          />
          <ModernStatsCard
            title="Checked In"
            value={candidateMetrics.checkedIn.count}
            subtitle={candidateMetrics.checkedIn.subtitle}
            icon={UserCheck}
            status="warning"
          />
          <ModernStatsCard
            title="In Progress"
            value={candidateMetrics.inProgress.count}
            subtitle={candidateMetrics.inProgress.subtitle}
            icon={Clock}
            status="neutral"
          />
          <ModernStatsCard
            title="Completed"
            value={candidateMetrics.completed.count}
            subtitle={candidateMetrics.completed.subtitle}
            icon={CheckCircle}
            status="positive"
          />
        </div>
      </div>

      {/* Quick Actions Section */}
      <div className="dashboard-section">
        <h2 className="section-title">Quick Actions</h2>
        <div className="grid-responsive grid-3">
          <button
            onClick={() => onNavigate?.('fets-roster')}
            className="modern-card p-6 text-left border-none cursor-pointer hover:border-none"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="stats-icon status-neutral">
                <Users />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">FETS Roster</h3>
            <p className="text-gray-600 text-sm">Manage staff schedules and assignments</p>
          </button>
          
          <button
            onClick={() => onNavigate?.('fets-calendar')}
            className="modern-card p-6 text-left border-none cursor-pointer hover:border-none"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="stats-icon status-positive">
                <CalendarDays />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">FETS Calendar</h3>
            <p className="text-gray-600 text-sm">Schedule and manage exam sessions</p>
          </button>
          
          <button
            onClick={() => onNavigate?.('fets-vault')}
            className="modern-card p-6 text-left border-none cursor-pointer hover:border-none"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="stats-icon status-warning">
                <FileText />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Resource Center</h3>
            <p className="text-gray-600 text-sm">Access policies and documentation</p>
          </button>
        </div>
      </div>

      {/* Workflow Management */}
      <div className="dashboard-section">
        <h2 className="section-title">Workflow Management</h2>
        <div className="grid-responsive grid-2">
          {/* Incident Management Card */}
          <div className="modern-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <AlertTriangle className="h-5 w-5 text-orange-500 mr-2" />
                Incident Management
              </h3>
              <button
                onClick={() => onNavigate?.('log-incident')}
                className="btn-tertiary-modern flex items-center text-xs"
              >
                <Eye className="h-4 w-4 mr-1" />
                View All
              </button>
            </div>
            
            <div className="grid-responsive grid-2 mb-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-red-500 mb-1">{incidentStats.open}</div>
                <div className="text-sm text-gray-500">Open</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-amber-500 mb-1">{incidentStats.inProgress}</div>
                <div className="text-sm text-gray-500">In Progress</div>
              </div>
            </div>
            
            <div className="grid-responsive grid-2 mb-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-500 mb-1">{incidentStats.resolved}</div>
                <div className="text-sm text-gray-500">Resolved</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-1">{incidentStats.total}</div>
                <div className="text-sm text-gray-500">Total</div>
              </div>
            </div>
            
            <button
              onClick={() => onNavigate?.('log-incident')}
              className="btn-primary-modern w-full justify-center"
            >
              <Plus className="h-4 w-4" />
              Log New Incident
            </button>
          </div>

          {/* Checklist Management Card */}
          <div className="modern-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                Checklist Overview
              </h3>
              <button
                onClick={() => onNavigate?.('checklist-management')}
                className="btn-tertiary-modern flex items-center text-xs"
              >
                <Eye className="h-4 w-4 mr-1" />
                View All
              </button>
            </div>
            
            <div className="grid-responsive grid-2 mb-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-500 mb-1">{checklistStats.todayInstances}</div>
                <div className="text-sm text-gray-500">Today's Lists</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-500 mb-1">{checklistStats.completedInstances}</div>
                <div className="text-sm text-gray-500">Completed</div>
              </div>
            </div>
            
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-500 mb-3">
                <span>Overall Progress</span>
                <span className="font-semibold">{checklistStats.totalProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="h-3 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${checklistStats.totalProgress}%`,
                    background: 'var(--primary-gradient)'
                  }}
                ></div>
              </div>
            </div>
            
            <button
              onClick={() => onNavigate?.('checklist-management')}
              className="btn-secondary-modern w-full justify-center"
            >
              <BarChart3 className="h-4 w-4" />
              Manage Templates
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
