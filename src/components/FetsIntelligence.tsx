import { useState, useEffect } from 'react'
import { Brain, TrendingUp, BarChart, Calendar, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'
// import { useAuth } from '../contexts/AuthContext'

interface Analytics {
  totalSessions: number
  successRate: number
  avgDuration: string
  peakHours: string
  topExams: { name: string; count: number }[]
  monthlyTrend: { month: string; sessions: number }[]
  issueReports: { type: string; count: number; trend: 'up' | 'down' | 'stable' }[]
}

interface Insight {
  id: string
  title: string
  description: string
  type: 'performance' | 'optimization' | 'alert' | 'trend'
  priority: 'low' | 'medium' | 'high'
  actionable: boolean
  createdAt: Date
}

interface Report {
  id: string
  title: string
  description: string
  type: 'daily' | 'weekly' | 'monthly' | 'custom'
  generatedAt: Date
  fileUrl?: string
}

export function FetsIntelligence() {
  // const { profile } = useAuth()
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [insights, setInsights] = useState<Insight[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [selectedTimeframe, setSelectedTimeframe] = useState('7d')
  const [activeTab, setActiveTab] = useState('overview')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadIntelligenceData()
  }, [selectedTimeframe])

  const loadIntelligenceData = async () => {
    try {
      setIsLoading(true)
      await loadAnalytics()
      await loadInsights()
      await loadReports()
    } catch (error) {
      console.error('Error loading intelligence data:', error)
      loadMockData()
    } finally {
      setIsLoading(false)
    }
  }

  const loadAnalytics = async () => {
    try {
      // Load session data for analytics
      const { data: sessions } = await supabase
        .from('sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (sessions && sessions.length > 0) {
        // Process analytics from real data
        const totalSessions = sessions.length
        const successRate = 85 // Mock calculation
        const avgDuration = '2h 15m' // Mock calculation
        const peakHours = '10:00 - 14:00' // Mock analysis

        // Generate top exams data
        const examCounts = sessions.reduce((acc, session) => {
          const exam = session.exam_name || 'Unknown'
          acc[exam] = (acc[exam] || 0) + 1
          return acc
        }, {} as Record<string, number>)

        const topExams = Object.entries(examCounts)
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .slice(0, 5)
          .map(([name, count]) => ({ name, count: count as number }))

        // Generate monthly trend (mock data)
        const monthlyTrend = [
          { month: 'Jan', sessions: 45 },
          { month: 'Feb', sessions: 52 },
          { month: 'Mar', sessions: 48 },
          { month: 'Apr', sessions: 61 },
          { month: 'May', sessions: 55 },
          { month: 'Jun', sessions: 67 },
          { month: 'Jul', sessions: 73 },
          { month: 'Aug', sessions: 68 }
        ]

        const issueReports = [
          { type: 'Technical Issues', count: 3, trend: 'down' as const },
          { type: 'No Shows', count: 8, trend: 'stable' as const },
          { type: 'Late Arrivals', count: 12, trend: 'up' as const },
          { type: 'Equipment Problems', count: 2, trend: 'down' as const }
        ]

        setAnalytics({
          totalSessions,
          successRate,
          avgDuration,
          peakHours,
          topExams,
          monthlyTrend,
          issueReports
        })
      } else {
        loadMockAnalytics()
      }
    } catch (error) {
      console.error('Error loading analytics:', error)
      loadMockAnalytics()
    }
  }

  const loadInsights = async () => {
    try {
      // Generate insights based on data patterns (mock implementation)
      const mockInsights: Insight[] = [
        {
          id: '1',
          title: 'Peak Usage Hours Identified',
          description: 'Sessions are most frequent between 10 AM and 2 PM. Consider scheduling maintenance outside these hours.',
          type: 'optimization',
          priority: 'medium',
          actionable: true,
          createdAt: new Date('2025-08-18T09:00:00')
        },
        {
          id: '2',
          title: 'Late Arrival Trend Increasing',
          description: 'Late arrivals have increased by 15% this month. Review check-in procedures and candidate communication.',
          type: 'alert',
          priority: 'high',
          actionable: true,
          createdAt: new Date('2025-08-18T08:30:00')
        },
        {
          id: '3',
          title: 'TOEFL Sessions Show High Success Rate',
          description: 'TOEFL sessions maintain a 92% completion rate, 7% above average. Current procedures are working well.',
          type: 'performance',
          priority: 'low',
          actionable: false,
          createdAt: new Date('2025-08-17T16:45:00')
        },
        {
          id: '4',
          title: 'System Performance Optimization Opportunity',
          description: 'Database queries during peak hours are 20% slower. Consider implementing caching or load balancing.',
          type: 'optimization',
          priority: 'medium',
          actionable: true,
          createdAt: new Date('2025-08-17T14:20:00')
        }
      ]
      setInsights(mockInsights)
    } catch (error) {
      console.error('Error loading insights:', error)
    }
  }

  const loadReports = async () => {
    try {
      const mockReports: Report[] = [
        {
          id: '1',
          title: 'Weekly Operations Summary',
          description: 'Comprehensive report covering all operational metrics for the week',
          type: 'weekly',
          generatedAt: new Date('2025-08-18T06:00:00')
        },
        {
          id: '2',
          title: 'Monthly Performance Analysis',
          description: 'Detailed analysis of performance trends and key metrics',
          type: 'monthly',
          generatedAt: new Date('2025-08-15T23:59:00')
        },
        {
          id: '3',
          title: 'Daily Activity Report',
          description: 'Summary of today\'s sessions, incidents, and key events',
          type: 'daily',
          generatedAt: new Date('2025-08-18T23:45:00')
        }
      ]
      setReports(mockReports)
    } catch (error) {
      console.error('Error loading reports:', error)
    }
  }

  const loadMockAnalytics = () => {
    const mockAnalytics: Analytics = {
      totalSessions: 147,
      successRate: 87,
      avgDuration: '2h 18m',
      peakHours: '10:00 - 14:00',
      topExams: [
        { name: 'TOEFL iBT', count: 42 },
        { name: 'GRE General Test', count: 28 },
        { name: 'AWS Solutions Architect', count: 21 },
        { name: 'CISSP', count: 18 },
        { name: 'CompTIA Security+', count: 15 }
      ],
      monthlyTrend: [
        { month: 'Jan', sessions: 45 },
        { month: 'Feb', sessions: 52 },
        { month: 'Mar', sessions: 48 },
        { month: 'Apr', sessions: 61 },
        { month: 'May', sessions: 55 },
        { month: 'Jun', sessions: 67 },
        { month: 'Jul', sessions: 73 },
        { month: 'Aug', sessions: 68 }
      ],
      issueReports: [
        { type: 'Technical Issues', count: 3, trend: 'down' },
        { type: 'No Shows', count: 8, trend: 'stable' },
        { type: 'Late Arrivals', count: 12, trend: 'up' },
        { type: 'Equipment Problems', count: 2, trend: 'down' }
      ]
    }
    setAnalytics(mockAnalytics)
  }

  const loadMockData = () => {
    loadMockAnalytics()
    loadInsights()
    loadReports()
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'performance': return <TrendingUp className="h-5 w-5" />
      case 'optimization': return <BarChart className="h-5 w-5" />
      case 'alert': return <AlertTriangle className="h-5 w-5" />
      case 'trend': return <TrendingUp className="h-5 w-5" />
      default: return <Brain className="h-5 w-5" />
    }
  }

  const getInsightColor = (type: string, priority: string) => {
    if (priority === 'high') return 'text-red-400 bg-red-500/20 border-red-500/50'
    if (priority === 'medium') return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50'
    
    switch (type) {
      case 'performance': return 'text-green-400 bg-green-500/20 border-green-500/50'
      case 'optimization': return 'text-blue-400 bg-blue-500/20 border-blue-500/50'
      case 'alert': return 'text-red-400 bg-red-500/20 border-red-500/50'
      case 'trend': return 'text-purple-400 bg-purple-500/20 border-purple-500/50'
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/50'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '↗️'
      case 'down': return '↘️'
      case 'stable': return '➡️'
      default: return '➡️'
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Brain className="h-8 w-8 text-yellow-400 mr-3" />
            <h1 className="text-3xl font-bold text-white">FETS Intelligence</h1>
          </div>
          <div className="flex items-center space-x-4">
            <select
              className="golden-input"
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
            >
              <option value="1d">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>
        </div>
        <p className="text-gray-300">Advanced analytics, insights, and intelligence reporting for data-driven decisions</p>
      </div>

      {/* Key Metrics */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="golden-stats-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-black/70 text-sm">Total Sessions</p>
                <p className="text-3xl font-bold text-black">{analytics.totalSessions}</p>
                <p className="text-black/70 text-sm">+12% from last period</p>
              </div>
              <Calendar className="h-8 w-8 text-black/70" />
            </div>
          </div>
          
          <div className="golden-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Success Rate</p>
                <p className="text-3xl font-bold text-white">{analytics.successRate}%</p>
                <p className="text-gray-400 text-sm">Above target</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </div>

          <div className="golden-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Avg Duration</p>
                <p className="text-3xl font-bold text-white">{analytics.avgDuration}</p>
                <p className="text-gray-400 text-sm">Within range</p>
              </div>
              <Clock className="h-8 w-8 text-blue-400" />
            </div>
          </div>

          <div className="golden-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Peak Hours</p>
                <p className="text-xl font-bold text-white">{analytics.peakHours}</p>
                <p className="text-gray-400 text-sm">Daily pattern</p>
              </div>
              <TrendingUp className="h-8 w-8 text-yellow-400" />
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="golden-card p-6">
        <div className="flex space-x-6 mb-6 border-b border-gray-700">
          {[
            { id: 'overview', name: 'Overview', icon: BarChart },
            { id: 'insights', name: 'Smart Insights', icon: Brain },
            { id: 'reports', name: 'Reports', icon: CheckCircle }
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-t-lg font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-yellow-400 border-b-2 border-yellow-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && analytics && (
          <div className="space-y-6">
            {/* Top Exams */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Top Exams</h3>
                <div className="space-y-3">
                  {analytics.topExams.map((exam, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                      <div className="flex items-center space-x-3">
                        <span className="text-yellow-400 font-bold">#{index + 1}</span>
                        <span className="text-white">{exam.name}</span>
                      </div>
                      <span className="text-gray-400">{exam.count} sessions</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Issue Reports */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Issue Analysis</h3>
                <div className="space-y-3">
                  {analytics.issueReports.map((issue, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                      <div className="flex items-center space-x-3">
                        <span className="text-gray-400">{issue.type}</span>
                        <span className="text-2xl">{getTrendIcon(issue.trend)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-white font-semibold">{issue.count}</span>
                        <p className="text-xs text-gray-400">{issue.trend} trend</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Monthly Trend Chart */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Monthly Session Trends</h3>
              <div className="grid grid-cols-8 gap-2 p-4 bg-white/5 rounded-lg">
                {analytics.monthlyTrend.map((month, index) => {
                  const maxSessions = Math.max(...analytics.monthlyTrend.map(m => m.sessions))
                  const height = (month.sessions / maxSessions) * 100
                  return (
                    <div key={index} className="flex flex-col items-center">
                      <div 
                        className="w-8 bg-gradient-to-t from-yellow-600 to-yellow-400 rounded-t"
                        style={{ height: `${height}px`, minHeight: '20px' }}
                      ></div>
                      <span className="text-xs text-gray-400 mt-2">{month.month}</span>
                      <span className="text-xs text-white font-medium">{month.sessions}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">AI-Powered Insights</h3>
              <span className="text-sm text-gray-400">{insights.length} insights generated</span>
            </div>
            
            {insights.map((insight) => (
              <div key={insight.id} className={`p-4 rounded-lg border transition-colors ${getInsightColor(insight.type, insight.priority)}`}>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 p-2 rounded-lg bg-current/20">
                    {getInsightIcon(insight.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-current">{insight.title}</h4>
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-1 bg-current/20 text-current text-xs rounded">
                          {insight.priority.toUpperCase()}
                        </span>
                        {insight.actionable && (
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                            ACTIONABLE
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-current/80 mb-3">{insight.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-current/60">
                        {insight.createdAt.toLocaleString()}
                      </span>
                      {insight.actionable && (
                        <button className="text-xs bg-current/20 hover:bg-current/30 px-3 py-1 rounded transition-colors">
                          Take Action
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Generated Reports</h3>
              <button className="golden-button text-sm px-4 py-2">
                Generate New Report
              </button>
            </div>
            
            {reports.map((report) => (
              <div key={report.id} className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-white">{report.title}</h4>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      report.type === 'daily' ? 'bg-blue-500/20 text-blue-400' :
                      report.type === 'weekly' ? 'bg-green-500/20 text-green-400' :
                      report.type === 'monthly' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {report.type.toUpperCase()}
                    </span>
                  </div>
                </div>
                <p className="text-gray-300 mb-3">{report.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">
                    Generated: {report.generatedAt.toLocaleString()}
                  </span>
                  <div className="flex items-center space-x-2">
                    <button className="flex items-center space-x-1 px-3 py-1 text-blue-400 hover:bg-blue-500/20 rounded">
                      <Brain className="h-4 w-4" />
                      <span>View</span>
                    </button>
                    <button className="flex items-center space-x-1 px-3 py-1 text-green-400 hover:bg-green-500/20 rounded">
                      <TrendingUp className="h-4 w-4" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
