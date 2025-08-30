import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Bell, Users, Settings, Plus, Eye, Clock, Calendar, CheckCircle, XCircle, AlertCircle, BarChart3, Trash2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { formatDateForIST } from '../utils/dateUtils'
import { getDisplayRole, filterStaffForRoster } from '../utils/staffUtils'
import { useIsMobile } from '../hooks/use-mobile'

interface RosterSchedule {
  id?: string
  profile_id: string
  date: string
  shift_code: string
  overtime_hours?: number
  status: string
  created_at?: string
  updated_at?: string
}

interface StaffProfile {
  id: string
  user_id?: string
  full_name: string
  role: string
  email: string
  department?: string
  position?: string
}

interface LeaveRequest {
  id?: string
  user_id: string
  request_type: string
  requested_date: string
  swap_with_user_id?: string
  swap_date?: string
  reason?: string
  status: string
  approved_by?: string
  approved_at?: string
  created_at?: string
  updated_at?: string
}

interface RosterVersion {
  id?: string
  month: number
  year: number
  version_number: string
  created_by?: string
  created_at?: string
  updated_by?: string
  updated_at?: string
  edit_log?: string
  is_active: boolean
}

interface OvertimeTracking {
  id?: string
  user_id: string
  date: string
  ot_hours: number
  description?: string
  created_by?: string
  created_at?: string
}

const SHIFT_CODES = {
  'D': { name: 'Day Shift (8AM-5PM)', color: 'bg-gradient-to-r from-turquoise to-cyan', textColor: 'text-white' },
  'HD': { name: 'Half Day', color: 'bg-gradient-to-r from-green-400 to-green-600', textColor: 'text-white' },
  'RD': { name: 'Rest Day', color: 'bg-gradient-to-r from-gray-400 to-gray-600', textColor: 'text-white' },
  'TOIL': { name: 'Time Off In Lieu', color: 'bg-gradient-to-r from-purple-400 to-purple-600', textColor: 'text-white' },
  'L': { name: 'Leave', color: 'bg-gradient-to-r from-red-400 to-red-600', textColor: 'text-white' },
  'OT': { name: 'Overtime', color: 'bg-gradient-to-r from-orange-400 to-orange-600', textColor: 'text-white' },
}

type ShiftCode = keyof typeof SHIFT_CODES

const REQUEST_TYPES = {
  'leave': 'Leave Request',
  'half_day': 'Half Day Request', 
  'shift_swap': 'Shift Swap',
  'off_day_swap': 'Off Day Swap'
}

export function FetsRoster() {
  const { user } = useAuth()
  const isMobile = useIsMobile()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [schedules, setSchedules] = useState<RosterSchedule[]>([])
  const [staffProfiles, setStaffProfiles] = useState<StaffProfile[]>([])
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [versions, setVersions] = useState<RosterVersion[]>([])
  const [overtimeData, setOvertimeData] = useState<OvertimeTracking[]>([])
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState<'roster' | 'requests' | 'overtime' | 'analytics'>('roster')
  
  // Modal states
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showOvertimeModal, setShowOvertimeModal] = useState(false)
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [selectedEdit, setSelectedEdit] = useState<{ profileId: string; date: string } | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null)
  
  // Form states
  const [requestForm, setRequestForm] = useState({
    type: 'leave',
    date: '',
    reason: '',
    swapPartner: '',
    swapDate: ''
  })
  
  const [overtimeForm, setOvertimeForm] = useState({
    userId: '',
    date: '',
    hours: 0,
    description: ''
  })
  
  const [currentVersion, setCurrentVersion] = useState<RosterVersion | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null)

  // Permission checks - use staff profile role, not auth profile role
  const getCurrentUserStaffProfile = () => {
    if (!user) return null
    return staffProfiles.find(p => p.user_id === user.id)
  }
  
  const currentStaffProfile = getCurrentUserStaffProfile()
  const isSuperAdmin = currentStaffProfile?.role === 'super_admin'
  const isAdmin = currentStaffProfile?.role === 'admin' || isSuperAdmin

  useEffect(() => {
    console.log('🔄 Roster useEffect triggered. User:', user?.id, 'Current date:', currentDate.toISOString().split('T')[0])
    if (user) {
      console.log('🚀 User authenticated, calling loadData...')
      loadData()
    } else {
      console.log('⚠️ No user, skipping loadData')
    }
  }, [user, currentDate])

  // Auto-hide notifications
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  const showNotification = (type: 'success' | 'error' | 'warning', message: string) => {
    setNotification({ type, message })
  }

  const loadData = async () => {
    try {
      setLoading(true)
      console.log('🚀 Starting roster data load...')
      console.log('🔍 Current user:', user?.id)
      console.log('🔍 Auth session:', await supabase.auth.getSession())
      
      // Load staff profiles first
      console.log('🔍 Querying staff_profiles table...')
      const { data: profiles, error: profilesError } = await supabase
        .from('staff_profiles')
        .select('id, user_id, full_name, role, email, department')
        .order('full_name')
      
      if (profilesError) {
        console.error('❌ Staff profiles error:', profilesError)
        throw profilesError
      }
      
      console.log('✅ Staff profiles loaded successfully:', profiles?.length || 0, 'profiles')
      
      // Map profiles to match StaffProfile interface
      const mappedProfiles: StaffProfile[] = (profiles || []).map(profile => ({
        id: profile.id,
        user_id: profile.user_id,
        full_name: profile.full_name,
        role: profile.role,
        email: profile.email || '',
        department: profile.department
      }))
      
      setStaffProfiles(mappedProfiles)

      // Load schedules for current month
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
      
      console.log('🔍 Querying roster_schedules table...')
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('roster_schedules')
        .select('id, profile_id, date, shift_code, overtime_hours, status, created_at, updated_at')
        .gte('date', startOfMonth.toISOString().split('T')[0])
        .lte('date', endOfMonth.toISOString().split('T')[0])
        .order('date')
      
      if (scheduleError) {
        console.error('❌ Schedule data error:', scheduleError)
        throw scheduleError
      }
      
      console.log('✅ Schedule data loaded successfully:', scheduleData?.length || 0, 'records')
      setSchedules(scheduleData || [])

      // Load current version
      const { data: versionData, error: versionError } = await supabase
        .from('roster_versions')
        .select('*')
        .eq('month', currentDate.getMonth() + 1)
        .eq('year', currentDate.getFullYear())
        .eq('is_active', true)
        .maybeSingle()
      
      if (versionError && versionError.code !== 'PGRST116') throw versionError
      setCurrentVersion(versionData)

      // Load all versions for history
      const { data: allVersions, error: allVersionsError } = await supabase
        .from('roster_versions')
        .select('*')
        .eq('month', currentDate.getMonth() + 1)
        .eq('year', currentDate.getFullYear())
        .order('created_at', { ascending: false })
      
      if (allVersionsError) throw allVersionsError
      setVersions(allVersions || [])

      // Load overtime data for current month
      const { data: overtimeDataResult, error: overtimeError } = await supabase
        .from('overtime_tracking')
        .select('*')
        .gte('date', startOfMonth.toISOString().split('T')[0])
        .lte('date', endOfMonth.toISOString().split('T')[0])
      
      if (overtimeError) throw overtimeError
      setOvertimeData(overtimeDataResult || [])

      // Load requests based on role - using staff_profiles for user mapping
      if (isSuperAdmin) {
        // Super admin sees all requests
        const { data: requestData, error: requestError } = await supabase
          .from('leave_requests')
          .select('*')
          .order('created_at', { ascending: false })
        
        if (requestError) throw requestError
        setRequests(requestData || [])
      } else if (user) {
        // Regular users see only their requests - need to map auth user to staff_profile
        const userStaffProfile = mappedProfiles.find(p => p.user_id === user.id)
        if (userStaffProfile) {
          const { data: requestData, error: requestError } = await supabase
            .from('leave_requests')
            .select('*')
            .eq('user_id', userStaffProfile.id) // Use staff_profiles.id
            .order('created_at', { ascending: false })
          
          if (requestError) throw requestError
          setRequests(requestData || [])
        }
      }
    } catch (error) {
      console.error('❌ Error loading roster data:', error)
      showNotification('error', `Database error: ${error instanceof Error ? error.message : 'Connection failed'}. Please check your authentication.`)
      
      // Don't use fallback data for production - user should see the real error
      setStaffProfiles([])
      setSchedules([])
      setRequests([])
      setVersions([])
      setOvertimeData([])
    } finally {
      setLoading(false)
    }
  }

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days = []
    
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    
    return days
  }

  const getScheduleForDate = (profileId: string, date: Date) => {
    const dateStr = formatDateForIST(date)
    return schedules.find(s => s.profile_id === profileId && s.date === dateStr)
  }

  const getOvertimeForDate = (profileId: string, date: Date) => {
    const dateStr = formatDateForIST(date)
    return overtimeData.find(ot => ot.user_id === profileId && ot.date === dateStr)
  }

  const handleEditShift = (profileId: string, date: Date) => {
    if (!isAdmin) return
    setSelectedEdit({ profileId, date: formatDateForIST(date) })
    setShowEditModal(true)
  }

  const saveShift = async (shiftCode: ShiftCode, overtimeHours = 0) => {
    if (!selectedEdit || !user || !isAdmin) {
      console.log('⚠️ Save shift blocked:', { selectedEdit, user: !!user, isAdmin })
      showNotification('warning', 'Unable to save shift - permission or context issue')
      return
    }

    try {
      console.log('🚀 Saving shift:', { profileId: selectedEdit.profileId, date: selectedEdit.date, shiftCode, overtimeHours })
      
      const scheduleData = {
        profile_id: selectedEdit.profileId,
        date: selectedEdit.date,
        shift_code: shiftCode,
        overtime_hours: overtimeHours,
        status: 'confirmed',
        updated_at: new Date().toISOString()
      }

      const existing = schedules.find(s => 
        s.profile_id === selectedEdit.profileId && s.date === selectedEdit.date
      )

      console.log('🔍 Existing schedule:', existing)

      if (existing) {
        console.log('🔄 Updating existing schedule...')
        const { error } = await supabase
          .from('roster_schedules')
          .update(scheduleData)
          .eq('id', existing.id)
        
        if (error) {
          console.error('❌ Update error:', error)
          throw error
        }
      } else {
        console.log('➕ Creating new schedule...')
        const { error } = await supabase
          .from('roster_schedules')
          .insert([{ ...scheduleData, created_at: new Date().toISOString() }])
        
        if (error) {
          console.error('❌ Insert error:', error)
          throw error
        }
      }

      // Create new version if needed
      await createNewVersion(`Updated shift for ${getStaffName(selectedEdit.profileId)} on ${selectedEdit.date}`)
      
      setShowEditModal(false)
      setSelectedEdit(null)
      await loadData()
      showNotification('success', 'Shift updated successfully!')
      console.log('✅ Shift saved successfully')
    } catch (error) {
      console.error('❌ Error saving shift:', error)
      showNotification('error', `Failed to save shift: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const createNewVersion = async (editLog: string) => {
    try {
      const nextVersionNumber = getNextVersionNumber()
      const versionData = {
        month: currentDate.getMonth() + 1,
        year: currentDate.getFullYear(),
        version_number: nextVersionNumber,
        created_by: currentStaffProfile?.user_id, // Use auth user ID for version tracking
        edit_log: editLog,
        is_active: true
      }

      // Set current version to inactive
      if (currentVersion) {
        await supabase
          .from('roster_versions')
          .update({ is_active: false })
          .eq('id', currentVersion.id)
      }

      const { error } = await supabase
        .from('roster_versions')
        .insert([versionData])
      
      if (error) throw error
    } catch (error) {
      console.error('Error creating version:', error)
    }
  }

  const getNextVersionNumber = (): string => {
    if (versions.length === 0) return 'v.01'
    const latestVersion = versions[0]?.version_number || 'v.00'
    const versionNum = parseInt(latestVersion.replace('v.', '')) + 1
    return `v.${versionNum.toString().padStart(2, '0')}`
  }

  const getStaffName = (profileId: string): string => {
    return staffProfiles.find(s => s.id === profileId)?.full_name || 'Unknown'
  }

  const deleteRoster = async () => {
    if (!isSuperAdmin) {
      showNotification('error', 'Only super admins can delete rosters')
      return
    }

    if (!confirm(`Are you sure you want to delete the entire roster for ${currentDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}? This action cannot be undone.`)) {
      return
    }

    try {
      console.log('🗑️ Deleting roster for month:', currentDate.getMonth() + 1, 'year:', currentDate.getFullYear())
      
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
      
      const startDateIST = formatDateForIST(startOfMonth)
      const endDateIST = formatDateForIST(endOfMonth)
      
      // Delete all roster schedules for the month
      const { error: scheduleError } = await supabase
        .from('roster_schedules')
        .delete()
        .gte('date', startDateIST)
        .lte('date', endDateIST)
      
      if (scheduleError) throw scheduleError
      
      // Set all versions to inactive
      if (currentVersion) {
        await supabase
          .from('roster_versions')
          .update({ is_active: false })
          .eq('month', currentDate.getMonth() + 1)
          .eq('year', currentDate.getFullYear())
      }
      
      await loadData()
      showNotification('success', 'Roster deleted successfully')
      console.log('✅ Roster deleted successfully')
    } catch (error) {
      console.error('❌ Error deleting roster:', error)
      showNotification('error', `Failed to delete roster: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !currentStaffProfile) return

    try {
      const requestData = {
        user_id: currentStaffProfile.id, // Use staff_profiles.id
        request_type: requestForm.type,
        requested_date: requestForm.date,
        swap_with_user_id: requestForm.swapPartner || null,
        swap_date: requestForm.swapDate || null,
        reason: requestForm.reason,
        status: 'pending'
      }

      const { error } = await supabase
        .from('leave_requests')
        .insert([requestData])

      if (error) throw error

      setShowRequestModal(false)
      setRequestForm({ type: 'leave', date: '', reason: '', swapPartner: '', swapDate: '' })
      await loadData()
      showNotification('success', 'Request submitted successfully')
    } catch (error) {
      console.error('Error submitting request:', error)
      showNotification('error', 'Failed to submit request')
    }
  }

  const approveRequest = async (requestId: string, approved: boolean) => {
    if (!isSuperAdmin) return

    try {
      const updateData = {
        status: approved ? 'approved' : 'rejected',
        approved_by: currentStaffProfile?.id, // Use staff profile ID
        approved_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('leave_requests')
        .update(updateData)
        .eq('id', requestId)

      if (error) throw error

      // If approved, update roster accordingly
      if (approved && selectedRequest) {
        await applyApprovedRequest(selectedRequest)
      }

      setShowApprovalModal(false)
      setSelectedRequest(null)
      await loadData()
      showNotification('success', `Request ${approved ? 'approved' : 'rejected'} successfully`)
    } catch (error) {
      console.error('Error processing request:', error)
      showNotification('error', 'Failed to process request')
    }
  }

  const applyApprovedRequest = async (request: LeaveRequest) => {
    try {
      console.log('🚀 Applying approved request:', request)
      
      // Apply the approved request to the roster
      const scheduleData = {
        profile_id: request.user_id, // This is already staff_profiles.id
        date: request.requested_date,
        shift_code: request.request_type === 'half_day' ? 'HD' : 'L',
        status: 'confirmed',
        updated_at: new Date().toISOString()
      }

      const existing = schedules.find(s => 
        s.profile_id === request.user_id && s.date === request.requested_date
      )

      console.log('🔍 Existing schedule for approved request:', existing)

      if (existing) {
        console.log('🔄 Updating existing schedule with approved request...')
        const { error } = await supabase
          .from('roster_schedules')
          .update(scheduleData)
          .eq('id', existing.id)
        
        if (error) {
          console.error('❌ Update schedule error:', error)
          throw error
        }
      } else {
        console.log('➕ Creating new schedule from approved request...')
        const { error } = await supabase
          .from('roster_schedules')
          .insert([{ ...scheduleData, created_at: new Date().toISOString() }])
        
        if (error) {
          console.error('❌ Insert schedule error:', error)
          throw error
        }
      }

      await createNewVersion(`Applied approved ${request.request_type} request for ${getStaffName(request.user_id)}`)
      console.log('✅ Applied approved request successfully')
    } catch (error) {
      console.error('❌ Error applying approved request:', error)
      throw error
    }
  }

  const quickAddMonth = async () => {
    if (!isAdmin) {
      showNotification('warning', 'Only admins can use Quick Add')
      return
    }

    try {
      console.log('🚀 Quick Add Month triggered...')
      const days = getDaysInMonth()
      const schedulesToCreate: any[] = []

      console.log('🔍 Staff profiles for Quick Add:', staffProfiles.length, 'profiles')

      staffProfiles.forEach(staff => {
        let dayCounter = 0
        days.forEach(day => {
          const dateStr = day.toISOString().split('T')[0]
          const existing = schedules.find(s => s.profile_id === staff.id && s.date === dateStr)
          
          if (!existing) {
            // Apply 6 days work + 1 day rest pattern
            const shiftCode = (dayCounter % 7 === 6) ? 'RD' : 'D'
            schedulesToCreate.push({
              profile_id: staff.id,
              date: dateStr,
              shift_code: shiftCode,
              status: 'confirmed',
              created_at: new Date().toISOString()
            })
          }
          dayCounter++
        })
      })

      console.log('🔍 Schedules to create:', schedulesToCreate.length)

      if (schedulesToCreate.length > 0) {
        const { error } = await supabase
          .from('roster_schedules')
          .insert(schedulesToCreate)
        
        if (error) {
          console.error('❌ Quick Add database error:', error)
          throw error
        }
        
        await createNewVersion(`Quick add generated ${schedulesToCreate.length} schedules`)
        await loadData()
        showNotification('success', `Generated ${schedulesToCreate.length} roster entries successfully!`)
      } else {
        showNotification('warning', 'All roster entries already exist for this month')
      }
    } catch (error) {
      console.error('❌ Error in Quick Add:', error)
      showNotification('error', 'Failed to generate month roster. Check console for details.')
    }
  }

  const saveOvertime = async (profileId: string, date: string, hours: number, description: string) => {
    if (!isAdmin) return

    try {
      const otData = {
        user_id: profileId, // This is staff_profiles.id
        date,
        ot_hours: hours,
        description,
        created_by: currentStaffProfile?.user_id // Use auth user ID for audit
      }

      const existing = overtimeData.find((ot: any) => ot.user_id === profileId && ot.date === date)
      
      if (existing) {
        const { error } = await supabase
          .from('overtime_tracking')
          .update({ ot_hours: hours, description })
          .eq('user_id', profileId)
          .eq('date', date)
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('overtime_tracking')
          .insert([otData])
        
        if (error) throw error
      }

      await loadData()
      showNotification('success', 'Overtime updated successfully')
    } catch (error) {
      console.error('Error saving overtime:', error)
      showNotification('error', 'Failed to save overtime')
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

  const monthYear = currentDate.toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  })

  const days = getDaysInMonth()
  const pendingRequests = requests.filter(r => r.status === 'pending')

  if (loading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-turquoise mx-auto mb-4"></div>
          <p className="text-gray-600">Loading roster data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-4 sm:p-6 space-y-4 sm:space-y-6 bg-gradient-to-br from-blue-50 via-cyan-50 to-turquoise-50 min-h-screen overflow-auto">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto z-50 p-4 rounded-lg shadow-lg backdrop-blur-md ${
          notification.type === 'success' ? 'bg-green-100/80 text-green-800 border border-green-200' :
          notification.type === 'error' ? 'bg-red-100/80 text-red-800 border border-red-200' :
          'bg-yellow-100/80 text-yellow-800 border border-yellow-200'
        } transition-all duration-300`}>
          <div className="flex items-center space-x-2">
            {notification.type === 'success' && <CheckCircle className="h-5 w-5" />}
            {notification.type === 'error' && <XCircle className="h-5 w-5" />}
            {notification.type === 'warning' && <AlertCircle className="h-5 w-5" />}
            <span className="text-sm sm:text-base">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Glassmorphic Header */}
      <div className="backdrop-blur-md bg-white/70 border border-white/20 shadow-xl rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:justify-between sm:items-center">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="bg-gradient-to-r from-turquoise to-cyan p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-lg">
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-turquoise to-cyan bg-clip-text text-transparent">
                FETS ROSTER
              </h1>
              <p className="text-gray-600 font-medium text-sm sm:text-base hidden sm:block">Professional Workforce Management System</p>
              {isMobile && <p className="text-gray-600 text-sm">Workforce Management</p>}
              {currentVersion && (
                <p className="text-xs sm:text-sm text-gray-500">Version: {currentVersion.version_number}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-3 overflow-x-auto">
            {isSuperAdmin && pendingRequests.length > 0 && (
              <div className="relative bg-gradient-to-r from-red-400 to-red-600 text-white rounded-xl sm:rounded-2xl px-3 py-2 sm:px-4 sm:py-3 shadow-lg backdrop-blur-md flex-shrink-0">
                <Bell className="h-4 w-4 sm:h-5 sm:w-5 inline mr-1 sm:mr-2" />
                <span className="font-medium text-sm sm:text-base">{pendingRequests.length} {isMobile ? '' : 'pending requests'}</span>
              </div>
            )}
            
            <button
              onClick={() => setShowRequestModal(true)}
              className="bg-gradient-to-r from-turquoise to-cyan text-white px-3 py-2 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl font-medium hover:shadow-2xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-1 sm:space-x-2 backdrop-blur-md min-h-[44px] flex-shrink-0"
            >
              <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="text-sm sm:text-base">{isMobile ? 'Request' : 'New Request'}</span>
            </button>
            
            {isAdmin && (
              <button
                onClick={quickAddMonth}
                className="bg-gradient-to-r from-purple-500 to-purple-700 text-white px-3 py-2 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl font-medium hover:shadow-2xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-1 sm:space-x-2 backdrop-blur-md min-h-[44px] flex-shrink-0"
              >
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="text-sm sm:text-base hidden sm:inline">Quick Add</span>
              </button>
            )}
            
            {isSuperAdmin && (
              <button
                onClick={deleteRoster}
                className="bg-gradient-to-r from-red-500 to-red-700 text-white px-3 py-2 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl font-medium hover:shadow-2xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-1 sm:space-x-2 backdrop-blur-md min-h-[44px] flex-shrink-0"
              >
                <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="text-sm sm:text-base hidden sm:inline">Delete</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="backdrop-blur-md bg-white/70 border border-white/20 shadow-xl rounded-2xl p-3 sm:p-4">
        <div className="flex space-x-1 overflow-x-auto">
          {[
            { key: 'roster', label: 'Roster', fullLabel: 'Roster Grid', icon: Calendar },
            { key: 'requests', label: 'Requests', fullLabel: 'Requests', icon: Bell },
            { key: 'overtime', label: 'Overtime', fullLabel: 'Overtime', icon: Clock },
            { key: 'analytics', label: 'Analytics', fullLabel: 'Analytics', icon: BarChart3 }
          ].map(({ key, label, fullLabel, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveView(key as any)}
              className={`flex items-center space-x-1 sm:space-x-2 px-3 py-2 sm:px-6 sm:py-3 rounded-xl font-medium transition-all duration-200 min-h-[44px] flex-shrink-0 ${
                activeView === key
                  ? 'bg-gradient-to-r from-turquoise to-cyan text-white shadow-lg'
                  : 'text-gray-600 hover:bg-white/50'
              }`}
            >
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="text-sm sm:text-base">{isMobile ? label : fullLabel}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Month Navigation */}
      {activeView === 'roster' && (
        <div className="backdrop-blur-md bg-white/70 border border-white/20 shadow-xl rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-3 rounded-xl bg-gradient-to-r from-cyan to-turquoise text-white hover:shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            
            <div className="text-center">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-turquoise to-cyan bg-clip-text text-transparent">
                {monthYear}
              </h2>
              {currentVersion && (
                <p className="text-sm text-gray-500 mt-1">
                  Current Version: {currentVersion.version_number}
                </p>
              )}
            </div>
            
            <button
              onClick={() => navigateMonth('next')}
              className="p-3 rounded-xl bg-gradient-to-r from-cyan to-turquoise text-white hover:shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}

      {/* Roster Grid View */}
      {activeView === 'roster' && (() => {
        // Debug logging for render - always enabled for debugging
        console.log('📝 Debug - Rendering staff profiles, count:', staffProfiles.length)
        
        // Filter staff for roster display (removes super admins)
        const filteredStaff = filterStaffForRoster(staffProfiles)
        console.log('📝 Debug - Filtered staff count:', filteredStaff.length)
        
        return (
          <div className="backdrop-blur-md bg-white/70 border border-white/20 shadow-xl rounded-2xl p-6 overflow-x-auto">
            <div className="min-w-[1200px]">
              {/* Header Row */}
              <div className="grid grid-cols-[250px_1fr] border-b-2 border-gradient-to-r from-turquoise to-cyan">
                <div className="p-4 font-bold bg-gradient-to-r from-turquoise/10 to-cyan/10 text-turquoise">Staff Member</div>
                <div className="grid" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(90px, 1fr))` }}>
                  {days.map((day, index) => {
                    const isToday = day.toDateString() === new Date().toDateString()
                    const dayOfWeek = day.getDay()
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
                    
                    return (
                      <div
                        key={index}
                        className={`p-3 text-center text-sm font-semibold border-l border-white/30 ${
                          isToday 
                            ? 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white shadow-lg' 
                            : isWeekend
                              ? 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-600'
                              : 'bg-gradient-to-r from-turquoise/10 to-cyan/10 text-turquoise'
                        }`}
                      >
                        <div className="text-lg">{day.getDate()}</div>
                        <div className="text-xs opacity-75">
                          {day.toLocaleDateString('en-US', { weekday: 'short' })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Staff Rows */}
              {filteredStaff.length === 0 ? (
                <div className="col-span-full text-center py-12 text-gray-500">
                  <div className="animate-pulse">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Loading staff profiles...</p>
                    <p className="text-sm">If this persists, check console logs</p>
                  </div>
                </div>
              ) : (
                filteredStaff.map((staff) => (
              <div key={staff.id} className="grid grid-cols-[250px_1fr] border-b border-white/20 hover:bg-white/40 transition-colors">
                <div className="p-4 backdrop-blur-sm bg-white/50">
                  <div className="font-semibold text-gray-800">{staff.full_name}</div>
                  <div className="text-sm text-turquoise capitalize font-medium">{getDisplayRole(staff.role)}</div>
                  {staff.department && (
                    <div className="text-xs text-gray-500">{staff.department}</div>
                  )}
                </div>
                <div className="grid" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(90px, 1fr))` }}>
                  {days.map((day, dayIndex) => {
                    const schedule = getScheduleForDate(staff.id, day)
                    const overtime = getOvertimeForDate(staff.id, day)
                    const shiftCode = schedule?.shift_code as ShiftCode
                    const shiftInfo = shiftCode ? SHIFT_CODES[shiftCode] : null
                    const dateStr = day.toISOString().split('T')[0]
                    
                    return (
                      <div
                        key={dayIndex}
                        className={`p-2 border-l border-white/20 min-h-[80px] flex flex-col justify-center items-center cursor-pointer hover:bg-white/60 transition-all duration-200 group relative ${
                          isAdmin ? 'hover:shadow-lg' : ''
                        }`}
                        onClick={() => isAdmin && handleEditShift(staff.id, day)}
                      >
                        {shiftInfo && (
                          <div className={`${shiftInfo.color} ${shiftInfo.textColor} text-xs px-3 py-1 rounded-full font-semibold shadow-md mb-1 relative`}>
                            {shiftCode}
                            {schedule?.overtime_hours && schedule.overtime_hours > 0 && (
                              <div className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow-md">
                                +{schedule.overtime_hours}h
                              </div>
                            )}
                          </div>
                        )}
                        
                        {overtime && overtime.ot_hours > 0 && (
                          <div className="text-xs text-orange-600 font-semibold bg-orange-100 px-2 py-1 rounded-full">
                            OT: {overtime.ot_hours}h
                          </div>
                        )}

                        {/* Hover Actions */}
                        {isAdmin && (
                          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col space-y-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setOvertimeForm({
                                  userId: staff.id,
                                  date: dateStr,
                                  hours: overtime?.ot_hours || 0,
                                  description: overtime?.description || ''
                                })
                                setShowOvertimeModal(true)
                              }}
                              className="p-1 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors shadow-md"
                              title="Manage Overtime"
                            >
                              <Clock className="h-3 w-3" />
                            </button>
                            {schedule && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  // View schedule details could be implemented here
                                }}
                                className="p-1 bg-turquoise text-white rounded-md hover:bg-cyan transition-colors shadow-md"
                                title="View Details"
                              >
                                <Eye className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
                  ))
                )}
            </div>
          </div>
        )
      })()}

      {/* Requests View */}
      {activeView === 'requests' && (
        <div className="backdrop-blur-md bg-white/70 border border-white/20 shadow-xl rounded-2xl p-6">
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-turquoise mb-4">Leave Requests</h3>
            
            {requests.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No requests found</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {requests.map((request) => (
                  <div key={request.id} className="backdrop-blur-sm bg-white/50 border border-white/30 rounded-xl p-4 hover:shadow-lg transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="font-semibold text-gray-800">
                            {getStaffName(request.user_id)}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            request.status === 'approved' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          <strong>Type:</strong> {REQUEST_TYPES[request.request_type as keyof typeof REQUEST_TYPES]}
                        </p>
                        <p className="text-sm text-gray-600 mb-1">
                          <strong>Date:</strong> {new Date(request.requested_date).toLocaleDateString()}
                        </p>
                        {request.reason && (
                          <p className="text-sm text-gray-600 mb-1">
                            <strong>Reason:</strong> {request.reason}
                          </p>
                        )}
                        {request.swap_with_user_id && (
                          <p className="text-sm text-gray-600 mb-1">
                            <strong>Swap with:</strong> {getStaffName(request.swap_with_user_id)}
                          </p>
                        )}
                      </div>
                      
                      {isSuperAdmin && request.status === 'pending' && (
                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => {
                              setSelectedRequest(request)
                              setShowApprovalModal(true)
                            }}
                            className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all flex items-center space-x-1"
                          >
                            <CheckCircle className="h-4 w-4" />
                            <span>Review</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Overtime View */}
      {activeView === 'overtime' && (
        <div className="backdrop-blur-md bg-white/70 border border-white/20 shadow-xl rounded-2xl p-6">
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-turquoise mb-4">Overtime Tracking</h3>
            
            {/* Monthly OT Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {filterStaffForRoster(staffProfiles).map(staff => {
                const monthlyOT = overtimeData
                  .filter(ot => ot.user_id === staff.id)
                  .reduce((sum, ot) => sum + ot.ot_hours, 0)
                
                return (
                  <div key={staff.id} className="backdrop-blur-sm bg-white/50 border border-white/30 rounded-xl p-4">
                    <div className="font-semibold text-gray-800">{staff.full_name}</div>
                    <div className="text-2xl font-bold text-orange-600">{monthlyOT}h</div>
                    <div className="text-sm text-gray-600">Monthly OT</div>
                  </div>
                )
              })}
            </div>

            {/* Detailed OT Records */}
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-800">Daily Records</h4>
              {overtimeData.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No overtime records found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {overtimeData
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((ot) => (
                    <div key={`${ot.user_id}-${ot.date}`} className="backdrop-blur-sm bg-white/50 border border-white/30 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-800">{getStaffName(ot.user_id)}</div>
                        <div className="text-sm text-gray-600">
                          {new Date(ot.date).toLocaleDateString()} - {ot.ot_hours}h overtime
                        </div>
                        {ot.description && (
                          <div className="text-xs text-gray-500">{ot.description}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Analytics View */}
      {activeView === 'analytics' && (
        <div className="backdrop-blur-md bg-white/70 border border-white/20 shadow-xl rounded-2xl p-6">
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-turquoise mb-4">Roster Analytics</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Shifts */}
              <div className="backdrop-blur-sm bg-white/50 border border-white/30 rounded-xl p-4">
                <div className="text-2xl font-bold text-turquoise">{schedules.length}</div>
                <div className="text-sm text-gray-600">Total Shifts</div>
              </div>
              
              {/* Leave Days */}
              <div className="backdrop-blur-sm bg-white/50 border border-white/30 rounded-xl p-4">
                <div className="text-2xl font-bold text-red-600">
                  {schedules.filter(s => s.shift_code === 'L').length}
                </div>
                <div className="text-sm text-gray-600">Leave Days</div>
              </div>
              
              {/* Overtime Hours */}
              <div className="backdrop-blur-sm bg-white/50 border border-white/30 rounded-xl p-4">
                <div className="text-2xl font-bold text-orange-600">
                  {overtimeData.reduce((sum, ot) => sum + ot.ot_hours, 0)}h
                </div>
                <div className="text-sm text-gray-600">Total OT Hours</div>
              </div>
              
              {/* Pending Requests */}
              <div className="backdrop-blur-sm bg-white/50 border border-white/30 rounded-xl p-4">
                <div className="text-2xl font-bold text-yellow-600">{pendingRequests.length}</div>
                <div className="text-sm text-gray-600">Pending Requests</div>
              </div>
            </div>

            {/* Shift Distribution */}
            <div className="backdrop-blur-sm bg-white/50 border border-white/30 rounded-xl p-4">
              <h4 className="font-semibold text-gray-800 mb-4">Shift Distribution</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {Object.entries(SHIFT_CODES).map(([code, info]) => {
                  const count = schedules.filter(s => s.shift_code === code).length
                  return (
                    <div key={code} className="text-center">
                      <div className={`${info.color} ${info.textColor} text-sm px-3 py-2 rounded-lg font-medium mb-1`}>
                        {code}
                      </div>
                      <div className="text-lg font-bold text-gray-800">{count}</div>
                      <div className="text-xs text-gray-600">{info.name}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shift Legend */}
      <div className="backdrop-blur-md bg-white/70 border border-white/20 shadow-xl rounded-2xl p-6">
        <h3 className="font-bold mb-4 flex items-center text-turquoise text-lg">
          <Settings className="h-6 w-6 mr-2" />
          Shift Codes & Working Hours
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
          {Object.entries(SHIFT_CODES).map(([code, info]) => (
            <div key={code} className="flex items-center space-x-3 backdrop-blur-sm bg-white/50 p-3 rounded-xl">
              <div className={`${info.color} ${info.textColor} text-sm px-3 py-1 rounded-lg font-semibold min-w-[50px] text-center shadow-md`}>
                {code}
              </div>
              <span className="text-sm font-medium text-gray-700">{info.name}</span>
            </div>
          ))}
        </div>
        <div className="text-sm text-gray-600 bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-xl border border-blue-200">
          <p className="font-semibold text-gray-800 mb-2">Working Hours Information:</p>
          <p>• Standard Hours: 8:00 AM - 5:00 PM (9 hours with 1-hour break)</p>
          <p>• Break Time: 1 hour (typically 12:00 PM - 1:00 PM)</p>
          <p>• Overtime: Any hours worked after 5:00 PM</p>
        </div>
      </div>

      {/* Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="backdrop-blur-md bg-white/90 border border-white/20 shadow-2xl rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-turquoise mb-6">New Request</h2>
            <form onSubmit={submitRequest} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Request Type</label>
                <select
                  value={requestForm.type}
                  onChange={(e) => setRequestForm({ ...requestForm, type: e.target.value })}
                  className="w-full px-4 py-3 border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-turquoise focus:border-transparent transition-all bg-white/80 backdrop-blur-sm text-gray-800"
                >
                  <option value="leave">Leave Request</option>
                  <option value="half_day">Half Day Request</option>
                  <option value="shift_swap">Shift Swap</option>
                  <option value="off_day_swap">Off Day Swap</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  value={requestForm.date}
                  onChange={(e) => setRequestForm({ ...requestForm, date: e.target.value })}
                  className="w-full px-4 py-3 border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-turquoise focus:border-transparent transition-all bg-white/80 backdrop-blur-sm text-gray-800"
                  required
                />
              </div>

              {(requestForm.type === 'shift_swap' || requestForm.type === 'off_day_swap') && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Swap With</label>
                    <select
                      value={requestForm.swapPartner}
                      onChange={(e) => setRequestForm({ ...requestForm, swapPartner: e.target.value })}
                      className="w-full px-4 py-3 border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-turquoise focus:border-transparent transition-all bg-white/80 backdrop-blur-sm text-gray-800"
                      required={requestForm.type === 'shift_swap'}
                    >
                      <option value="">Select staff member</option>
                      {staffProfiles
                        .filter(staff => staff.id !== currentStaffProfile?.id)
                        .map(staff => (
                          <option key={staff.id} value={staff.id}>
                            {staff.full_name}
                          </option>
                        ))
                      }
                    </select>
                  </div>
                  
                  {requestForm.type === 'off_day_swap' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Swap Date</label>
                      <input
                        type="date"
                        value={requestForm.swapDate}
                        onChange={(e) => setRequestForm({ ...requestForm, swapDate: e.target.value })}
                        className="w-full px-4 py-3 border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-turquoise focus:border-transparent transition-all bg-white/80 backdrop-blur-sm text-gray-800"
                      />
                    </div>
                  )}
                </>
              )}
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Reason (Optional)</label>
                <textarea
                  value={requestForm.reason}
                  onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
                  className="w-full px-4 py-3 border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-turquoise focus:border-transparent transition-all bg-white/80 backdrop-blur-sm text-gray-800 h-20 resize-none"
                  placeholder="Additional details..."
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-xl hover:bg-white/70 transition-all text-gray-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-turquoise to-cyan text-white px-6 py-3 rounded-xl font-medium hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Shift Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="backdrop-blur-md bg-white/90 border border-white/20 shadow-2xl rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-turquoise mb-6">Edit Shift</h2>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {Object.entries(SHIFT_CODES).map(([code, info]) => (
                <button
                  key={code}
                  onClick={() => saveShift(code as ShiftCode)}
                  className={`${info.color} ${info.textColor} p-4 rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200 text-center`}
                >
                  <div className="text-lg">{code}</div>
                  <div className="text-xs mt-1">{info.name}</div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowEditModal(false)}
              className="w-full px-6 py-3 border border-gray-300 rounded-xl hover:bg-white/70 transition-all text-gray-700 font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Overtime Modal */}
      {showOvertimeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="backdrop-blur-md bg-white/90 border border-white/20 shadow-2xl rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-orange-600 mb-6">Manage Overtime</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Staff Member</label>
                <div className="px-4 py-3 bg-gray-100 rounded-xl text-gray-800">
                  {getStaffName(overtimeForm.userId)}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
                <div className="px-4 py-3 bg-gray-100 rounded-xl text-gray-800">
                  {new Date(overtimeForm.date).toLocaleDateString()}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Overtime Hours</label>
                <input
                  type="number"
                  min="0"
                  max="12"
                  step="0.5"
                  value={overtimeForm.hours}
                  onChange={(e) => setOvertimeForm({ ...overtimeForm, hours: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all bg-white/80 backdrop-blur-sm text-gray-800"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description (Optional)</label>
                <textarea
                  value={overtimeForm.description}
                  onChange={(e) => setOvertimeForm({ ...overtimeForm, description: e.target.value })}
                  className="w-full px-4 py-3 border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all bg-white/80 backdrop-blur-sm text-gray-800 h-20 resize-none"
                  placeholder="Reason for overtime..."
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowOvertimeModal(false)
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-xl hover:bg-white/70 transition-all text-gray-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    saveOvertime(
                      overtimeForm.userId, 
                      overtimeForm.date, 
                      overtimeForm.hours, 
                      overtimeForm.description
                    )
                    setShowOvertimeModal(false)
                  }}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-xl font-medium hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
                >
                  Save Overtime
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="backdrop-blur-md bg-white/90 border border-white/20 shadow-2xl rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-turquoise mb-6">Review Request</h2>
            <div className="space-y-4 mb-6">
              <div>
                <span className="font-semibold text-gray-700">Staff:</span>
                <span className="ml-2 text-gray-800">{getStaffName(selectedRequest.user_id)}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Type:</span>
                <span className="ml-2 text-gray-800">{REQUEST_TYPES[selectedRequest.request_type as keyof typeof REQUEST_TYPES]}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Date:</span>
                <span className="ml-2 text-gray-800">{new Date(selectedRequest.requested_date).toLocaleDateString()}</span>
              </div>
              {selectedRequest.reason && (
                <div>
                  <span className="font-semibold text-gray-700">Reason:</span>
                  <p className="mt-1 text-gray-800 bg-gray-50 p-3 rounded-xl">{selectedRequest.reason}</p>
                </div>
              )}
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowApprovalModal(false)}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-xl hover:bg-white/70 transition-all text-gray-700 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => approveRequest(selectedRequest.id!, false)}
                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-xl font-medium hover:shadow-2xl transition-all duration-200"
              >
                Reject
              </button>
              <button
                onClick={() => approveRequest(selectedRequest.id!, true)}
                className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-xl font-medium hover:shadow-2xl transition-all duration-200"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}