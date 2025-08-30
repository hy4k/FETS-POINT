import React, { useState, useEffect } from 'react'
import { Calendar, Plus, ChevronLeft, ChevronRight, Edit, Trash2, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { formatDateForIST, getCurrentISTDateString, isToday as isTodayIST, formatDateForDisplay } from '../utils/dateUtils'
import { validateSessionCapacity, getCapacityStatusColor, formatCapacityDisplay } from '../utils/sessionUtils'

interface Session {
  id?: number
  client_name: string
  exam_name: string
  date: string
  candidate_count: number
  start_time: string
  end_time: string
  user_id: string
  created_at?: string
  updated_at?: string
}

const CLIENT_COLORS = {
  'PEARSON': 'from-blue-500 to-blue-600 text-white',
  'VUE': 'from-red-500 to-red-600 text-white', 
  'ETS': 'from-green-500 to-green-600 text-white',
  'PSI': 'from-purple-500 to-purple-600 text-white',
  'PROMETRIC': 'from-orange-500 to-orange-600 text-white',
  'OTHER': 'from-gray-500 to-gray-600 text-white'
}

type ClientType = keyof typeof CLIENT_COLORS

export function FetsCalendar() {
  const { user } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null)
  const [formData, setFormData] = useState({
    client_name: '',
    exam_name: '',
    date: '',
    candidate_count: 1,
    start_time: '09:00',
    end_time: '17:00'
  })

  useEffect(() => {
    if (user) {
      loadSessions()
    }
  }, [user, currentDate])

  // Auto-hide notifications
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  const showNotification = (type: 'success' | 'error' | 'warning', message: string) => {
    setNotification({ type, message })
  }

  const loadSessions = async () => {
    try {
      setLoading(true)
      
      // Get sessions for current month using IST dates
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
      
      // Use IST date formatting for consistent query
      const startDateIST = formatDateForIST(startOfMonth)
      const endDateIST = formatDateForIST(endOfMonth)
      
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .gte('date', startDateIST)
        .lte('date', endDateIST)
        .order('date', { ascending: true })
      
      if (error) {
        console.error('Supabase error:', error)
        throw error
      }
      
      setSessions(data || [])
    } catch (error) {
      console.error('Error loading sessions:', error)
      showNotification('error', 'Failed to load sessions')
      setSessions([])
    } finally {
      setLoading(false)
    }
  }

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    
    const days = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    
    return days
  }

  const getSessionsForDate = (date: Date) => {
    const dateStr = formatDateForIST(date)
    return sessions.filter(session => session.date === dateStr)
  }

  const getClientType = (clientName: string): ClientType => {
    const upperName = clientName.toUpperCase()
    if (upperName.includes('PEARSON')) return 'PEARSON'
    if (upperName.includes('VUE')) return 'VUE'
    if (upperName.includes('ETS')) return 'ETS'
    if (upperName.includes('PSI')) return 'PSI'
    if (upperName.includes('PROMETRIC')) return 'PROMETRIC'
    return 'OTHER'
  }

  // Get per-client candidate counts for a date
  const getClientCounts = (date: Date) => {
    const daySessions = getSessionsForDate(date)
    const clientCounts: { [key: string]: number } = {}
    
    daySessions.forEach(session => {
      clientCounts[session.client_name] = (clientCounts[session.client_name] || 0) + session.candidate_count
    })
    
    return clientCounts
  }

  const formatTimeRange = (startTime: string, endTime: string) => {
    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(':')
      const hour = parseInt(hours)
      const ampm = hour >= 12 ? 'pm' : 'am'
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
      return `${displayHour}:${minutes}${ampm}`
    }
    return `${formatTime(startTime)} - ${formatTime(endTime)}`
  }

  const openModal = (date?: Date, session?: Session) => {
    if (session) {
      setEditingSession(session)
      setFormData({
        client_name: session.client_name,
        exam_name: session.exam_name,
        date: session.date,
        candidate_count: session.candidate_count,
        start_time: session.start_time,
        end_time: session.end_time
      })
    } else {
      setEditingSession(null)
      const dateStr = date ? formatDateForIST(date) : getCurrentISTDateString()
      setFormData({
        client_name: '',
        exam_name: '',
        date: dateStr,
        candidate_count: 1,
        start_time: '09:00',
        end_time: '17:00'
      })
    }
    setShowModal(true)
  }

  const openDetailsModal = (date: Date) => {
    const daySessions = getSessionsForDate(date)
    if (daySessions.length > 0) {
      setSelectedDate(date)
      setShowDetailsModal(true)
    } else {
      openModal(date)
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setShowDetailsModal(false)
    setEditingSession(null)
    setSelectedDate(null)
    setFormData({
      client_name: '',
      exam_name: '',
      date: '',
      candidate_count: 1,
      start_time: '09:00',
      end_time: '17:00'
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    // Validate session capacity
    const capacityValidation = validateSessionCapacity(formData.candidate_count)
    
    if (!capacityValidation.isValid) {
      showNotification('error', capacityValidation.error!)
      return
    }
    
    if (capacityValidation.warning) {
      showNotification('warning', capacityValidation.warning)
    }

    try {
      const sessionData = {
        ...formData,
        user_id: user.id,
        updated_at: new Date().toISOString()
      }

      if (editingSession && editingSession.id) {
        // Update existing session
        const { error } = await supabase
          .from('sessions')
          .update(sessionData)
          .eq('id', editingSession.id)
        
        if (error) throw error
        showNotification('success', 'Session updated successfully!')
      } else {
        // Create new session
        const { error } = await supabase
          .from('sessions')
          .insert([{
            ...sessionData,
            created_at: new Date().toISOString()
          }])
        
        if (error) throw error
        showNotification('success', 'Session created successfully!')
      }

      closeModal()
      await loadSessions()
    } catch (error) {
      console.error('Error saving session:', error)
      showNotification('error', 'Failed to save session')
    }
  }

  const handleDelete = async (sessionId: number) => {
    if (!confirm('Are you sure you want to delete this session?')) return

    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId)
      
      if (error) throw error
      showNotification('success', 'Session deleted successfully!')
      await loadSessions()
      
      // Close details modal if no more sessions for this date
      if (selectedDate) {
        const remainingSessions = getSessionsForDate(selectedDate).filter(s => s.id !== sessionId)
        if (remainingSessions.length === 0) {
          setShowDetailsModal(false)
        }
      }
    } catch (error) {
      console.error('Error deleting session:', error)
      showNotification('error', 'Failed to delete session')
    }
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setCurrentDate(newDate)
  }

  const monthYear = currentDate.toLocaleDateString('en-IN', { 
    month: 'long', 
    year: 'numeric',
    timeZone: 'Asia/Kolkata'
  })

  const days = getDaysInMonth()
  const isToday = (date: Date | null) => {
    if (!date) return false
    return isTodayIST(date)
  }

  if (loading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center bg-gradient-to-br from-blue-50 via-cyan-50 to-turquoise-50 min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-turquoise mx-auto mb-4"></div>
          <p className="text-gray-600">Loading calendar data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6 space-y-6 bg-gradient-to-br from-blue-50 via-cyan-50 to-turquoise-50 min-h-screen">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg backdrop-blur-md ${
          notification.type === 'success' ? 'bg-green-100/80 text-green-800 border border-green-200' :
          notification.type === 'warning' ? 'bg-yellow-100/80 text-yellow-800 border border-yellow-200' :
          'bg-red-100/80 text-red-800 border border-red-200'
        } transition-all duration-300`}>
          <div className="flex items-center space-x-2">
            {notification.type === 'success' ? '✅' : notification.type === 'warning' ? '⚠️' : '❌'}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Glassmorphic Header */}
      <div className="backdrop-blur-md bg-white/70 border border-white/20 shadow-xl rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-r from-turquoise to-cyan p-3 rounded-xl shadow-lg">
              <Calendar className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-turquoise to-cyan bg-clip-text text-transparent">
                FETS CALENDAR
              </h1>
              <p className="text-gray-600">Session scheduling and management</p>
            </div>
          </div>
          
          <button
            onClick={() => openModal()}
            className="bg-gradient-to-r from-turquoise to-cyan text-white px-6 py-3 rounded-xl font-medium hover:shadow-2xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Add Session</span>
          </button>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="backdrop-blur-md bg-white/70 border border-white/20 shadow-xl rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-3 rounded-xl bg-gradient-to-r from-turquoise to-cyan text-white hover:shadow-lg transform hover:scale-105 transition-all duration-200"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          <h2 className="text-2xl font-bold text-center min-w-[250px] bg-gradient-to-r from-turquoise to-cyan bg-clip-text text-transparent">
            {monthYear}
          </h2>
          
          <button
            onClick={() => navigateMonth('next')}
            className="p-3 rounded-xl bg-gradient-to-r from-turquoise to-cyan text-white hover:shadow-lg transform hover:scale-105 transition-all duration-200"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="backdrop-blur-md bg-white/70 border border-white/20 shadow-xl rounded-2xl p-6">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center text-sm font-bold text-turquoise py-3 backdrop-blur-sm bg-white/50 rounded-xl">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, index) => {
            if (!day) {
              return <div key={index} className="aspect-square"></div>
            }

            const clientCounts = getClientCounts(day)
            const hasEvents = Object.keys(clientCounts).length > 0
            const todayClass = isToday(day)

            return (
              <div
                key={index}
                className={`aspect-square rounded-2xl p-3 cursor-pointer transition-all duration-200 hover:scale-105 backdrop-blur-sm ${
                  todayClass 
                    ? 'bg-gradient-to-br from-yellow-400/80 to-orange-400/80 text-white shadow-2xl border border-yellow-300' 
                    : hasEvents 
                    ? 'bg-gradient-to-br from-turquoise/20 to-cyan/30 border border-turquoise/30 hover:shadow-xl'
                    : 'bg-white/50 border border-white/30 hover:bg-white/70 hover:shadow-lg'
                }`}
                onClick={() => openDetailsModal(day)}
              >
                <div className={`text-lg font-bold mb-2 ${
                  todayClass ? 'text-white' : 'text-gray-800'
                }`}>
                  {day.getDate()}
                </div>
                
                <div className="space-y-1 overflow-hidden">
                  {Object.entries(clientCounts).slice(0, 3).map(([client, count], idx) => {
                    const clientType = getClientType(client)
                    const colorClass = CLIENT_COLORS[clientType]
                    
                    return (
                      <div
                        key={idx}
                        className={`text-xs px-2 py-1 rounded-lg bg-gradient-to-r ${colorClass} shadow-md`}
                      >
                        <div className="font-medium truncate">{client}: {count}</div>
                      </div>
                    )
                  })}
                  
                  {Object.keys(clientCounts).length > 3 && (
                    <div className="text-xs text-turquoise font-semibold text-center bg-white/50 rounded-lg py-1">
                      +{Object.keys(clientCounts).length - 3} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Session Details Modal - Exact match to reference image */}
      {showDetailsModal && selectedDate && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-md border border-gray-700/50 rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header matching reference */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-turquoise">
                {formatDateForDisplay(selectedDate)}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Table exactly matching reference design */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-turquoise font-semibold text-sm uppercase tracking-wider">
                      SESSION
                    </th>
                    <th className="text-left py-3 px-4 text-turquoise font-semibold text-sm uppercase tracking-wider">
                      CLIENT
                    </th>
                    <th className="text-left py-3 px-4 text-turquoise font-semibold text-sm uppercase tracking-wider">
                      EXAM NAME
                    </th>
                    <th className="text-left py-3 px-4 text-turquoise font-semibold text-sm uppercase tracking-wider">
                      TIME
                    </th>
                    <th className="text-left py-3 px-4 text-turquoise font-semibold text-sm uppercase tracking-wider">
                      CANDIDATES
                    </th>
                    <th className="w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {getSessionsForDate(selectedDate).map((session) => (
                    <tr key={session.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center">
                          <div className="w-2 h-2 bg-orange-400 rounded-full mr-3"></div>
                          <span className="text-white font-medium">Morning</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-white font-medium">
                        {session.client_name}
                      </td>
                      <td className="py-4 px-4 text-white">
                        {session.exam_name}
                      </td>
                      <td className="py-4 px-4 text-white">
                        {formatTimeRange(session.start_time, session.end_time)}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className={`px-2 py-1 rounded text-xs font-semibold ${getCapacityStatusColor(session.candidate_count)}`}>
                          {formatCapacityDisplay(session.candidate_count)}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setShowDetailsModal(false)
                              openModal(undefined, session)
                            }}
                            className="p-2 text-turquoise hover:text-cyan transition-colors hover:bg-gray-700/50 rounded-lg"
                            title="Edit session"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => session.id && handleDelete(session.id)}
                            className="p-2 text-red-400 hover:text-red-300 transition-colors hover:bg-gray-700/50 rounded-lg"
                            title="Delete session"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add new session button */}
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => {
                  setShowDetailsModal(false)
                  openModal(selectedDate)
                }}
                className="bg-gradient-to-r from-turquoise to-cyan text-white px-6 py-3 rounded-xl font-medium hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-2"
              >
                <Plus className="h-5 w-5" />
                <span>Add Session for This Day</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Session Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="backdrop-blur-md bg-white/95 border border-white/20 shadow-2xl rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-turquoise to-cyan bg-clip-text text-transparent">
                {editingSession ? 'Edit Session' : 'Add New Session'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Client Name</label>
                <input
                  type="text"
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  className="w-full px-4 py-3 border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-turquoise focus:border-transparent transition-all bg-white/80 backdrop-blur-sm text-gray-800 shadow-md"
                  placeholder="e.g., Pearson VUE, ETS, PSI..."
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Exam Name</label>
                <input
                  type="text"
                  value={formData.exam_name}
                  onChange={(e) => setFormData({ ...formData, exam_name: e.target.value })}
                  className="w-full px-4 py-3 border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-turquoise focus:border-transparent transition-all bg-white/80 backdrop-blur-sm text-gray-800 shadow-md"
                  placeholder="e.g., TOEFL, GRE, CompTIA..."
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-3 border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-turquoise focus:border-transparent transition-all bg-white/80 backdrop-blur-sm text-gray-800 shadow-md"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Start Time</label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-4 py-3 border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-turquoise focus:border-transparent transition-all bg-white/80 backdrop-blur-sm text-gray-800 shadow-md"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">End Time</label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-4 py-3 border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-turquoise focus:border-transparent transition-all bg-white/80 backdrop-blur-sm text-gray-800 shadow-md"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Candidate Count</label>
                <input
                  type="number"
                  min="1"
                  max="40"
                  value={formData.candidate_count}
                  onChange={(e) => {
                    const count = parseInt(e.target.value) || 1
                    setFormData({ ...formData, candidate_count: count })
                    
                    // Real-time capacity validation
                    const validation = validateSessionCapacity(count)
                    if (validation.warning) {
                      showNotification('warning', validation.warning)
                    } else if (validation.error) {
                      showNotification('error', validation.error)
                    }
                  }}
                  className={`w-full px-4 py-3 border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-turquoise focus:border-transparent transition-all bg-white/80 backdrop-blur-sm text-gray-800 shadow-md ${
                    formData.candidate_count >= 40 ? 'border-red-300 bg-red-50' :
                    formData.candidate_count >= 30 ? 'border-yellow-300 bg-yellow-50' :
                    'border-white/30'
                  }`}
                  required
                />
                <div className="mt-2 text-xs">
                  <span className={`font-medium ${
                    formData.candidate_count >= 40 ? 'text-red-600' :
                    formData.candidate_count >= 30 ? 'text-orange-600' :
                    'text-green-600'
                  }`}>
                    {formatCapacityDisplay(formData.candidate_count)}
                  </span>
                  {formData.candidate_count >= 30 && (
                    <span className="ml-2 text-xs text-gray-500">
                      {formData.candidate_count >= 40 ? 'Maximum capacity reached' : 'Approaching capacity'}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all text-gray-700 font-medium backdrop-blur-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-turquoise to-cyan text-white px-6 py-3 rounded-xl font-medium hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
                >
                  {editingSession ? 'Update Session' : 'Create Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}