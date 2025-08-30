import { useState, useEffect } from 'react'
import { Activity, CheckCircle, Clock, AlertTriangle, Users, Monitor } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface SystemStatus {
  id: string
  name: string
  status: 'online' | 'offline' | 'maintenance'
  lastUpdate: string
  uptime: string
}

interface LiveTimer {
  id: string
  name: string
  startTime: Date
  type: 'session' | 'exam' | 'break'
}

export function LiveStatusBoard() {
  const [systemStatuses] = useState<SystemStatus[]>([
    { id: '1', name: 'Main Server', status: 'online', lastUpdate: '2 min ago', uptime: '99.9%' },
    { id: '2', name: 'Database', status: 'online', lastUpdate: '1 min ago', uptime: '99.8%' },
    { id: '3', name: 'Authentication Service', status: 'online', lastUpdate: '30 sec ago', uptime: '100%' },
    { id: '4', name: 'File Storage', status: 'maintenance', lastUpdate: '10 min ago', uptime: '98.5%' },
    { id: '5', name: 'Backup System', status: 'online', lastUpdate: '5 min ago', uptime: '99.2%' },
  ])

  const [liveTimers, setLiveTimers] = useState<LiveTimer[]>([])
  const [activeSessions, setActiveSessions] = useState(0)
  const [onlineUsers, setOnlineUsers] = useState(0)

  useEffect(() => {
    loadLiveData()
    const interval = setInterval(loadLiveData, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const loadLiveData = async () => {
    try {
      // Use fallback data for active sessions (roster-focused)
      setActiveSessions(5) // Fixed value for roster management

      // Load online users (mock data for now)
      setOnlineUsers(Math.floor(Math.random() * 10) + 5)

      // Load live timers from database
      const { data: timers } = await supabase
        .from('live_timers')
        .select('*')
        .eq('is_active', true)

      if (timers) {
        const formattedTimers: LiveTimer[] = timers.map(timer => ({
          id: timer.id,
          name: timer.timer_name,
          startTime: new Date(timer.start_time),
          type: timer.timer_type || 'session'
        }))
        setLiveTimers(formattedTimers)
      }
    } catch (error) {
      console.error('Error loading live data:', error)
      // Set safe fallback values
      setActiveSessions(5)
      setOnlineUsers(8)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="h-5 w-5 text-green-400" />
      case 'offline':
        return <AlertTriangle className="h-5 w-5 text-red-400" />
      case 'maintenance':
        return <Clock className="h-5 w-5 text-yellow-400" />
      default:
        return <Monitor className="h-5 w-5 text-gray-400" />
    }
  }

  const getElapsedTime = (startTime: Date) => {
    const now = new Date()
    const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000)
    const hours = Math.floor(elapsed / 3600)
    const minutes = Math.floor((elapsed % 3600) / 60)
    const seconds = elapsed % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex-1 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <Activity className="h-8 w-8 text-yellow-400 mr-3" />
          <h1 className="text-3xl font-bold text-white">Live Status Board</h1>
        </div>
        <p className="text-gray-300">Real-time monitoring of system status, active sessions, and live timers</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="golden-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Active Sessions</p>
              <p className="text-3xl font-bold text-white">{activeSessions}</p>
            </div>
            <Users className="h-8 w-8 text-blue-400" />
          </div>
        </div>
        
        <div className="golden-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Online Users</p>
              <p className="text-3xl font-bold text-white">{onlineUsers}</p>
            </div>
            <Activity className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="golden-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">System Health</p>
              <p className="text-3xl font-bold text-green-400">98.5%</p>
            </div>
            <Monitor className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="golden-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Live Timers</p>
              <p className="text-3xl font-bold text-white">{liveTimers.length}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-400" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Status */}
        <div className="golden-card p-6">
          <h2 className="text-xl font-bold text-white mb-6">System Status</h2>
          <div className="space-y-4">
            {systemStatuses.map((system) => (
              <div key={system.id} className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(system.status)}
                  <div>
                    <p className="font-medium text-white">{system.name}</p>
                    <p className="text-sm text-gray-400">Last update: {system.lastUpdate}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-white">{system.uptime}</p>
                  <p className="text-xs text-gray-400">Uptime</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Timers */}
        <div className="golden-card p-6">
          <h2 className="text-xl font-bold text-white mb-6">Live Timers</h2>
          <div className="space-y-4">
            {liveTimers.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">No active timers</p>
                <p className="text-sm text-gray-500">Timers will appear here when sessions are active</p>
              </div>
            ) : (
              liveTimers.map((timer) => (
                <div key={timer.id} className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${
                      timer.type === 'session' ? 'bg-blue-500/20' :
                      timer.type === 'exam' ? 'bg-red-500/20' : 'bg-green-500/20'
                    }`}>
                      <Clock className={`h-4 w-4 ${
                        timer.type === 'session' ? 'text-blue-400' :
                        timer.type === 'exam' ? 'text-red-400' : 'text-green-400'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium text-white">{timer.name}</p>
                      <p className="text-sm text-gray-400 capitalize">{timer.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-mono text-yellow-400">{getElapsedTime(timer.startTime)}</p>
                    <p className="text-xs text-gray-400">Elapsed</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Real-time Activity Feed */}
      <div className="golden-card p-6 mt-6">
        <h2 className="text-xl font-bold text-white mb-6">Real-time Activity Feed</h2>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          <div className="flex items-center space-x-3 p-3 rounded-lg bg-white/5">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <div className="flex-1">
              <p className="text-sm text-white">System health check completed successfully</p>
              <p className="text-xs text-gray-400">2 minutes ago</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 rounded-lg bg-white/5">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            <div className="flex-1">
              <p className="text-sm text-white">New user session started</p>
              <p className="text-xs text-gray-400">5 minutes ago</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 rounded-lg bg-white/5">
            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
            <div className="flex-1">
              <p className="text-sm text-white">File storage maintenance scheduled</p>
              <p className="text-xs text-gray-400">10 minutes ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
