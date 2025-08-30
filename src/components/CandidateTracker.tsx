import { useState, useEffect } from 'react'
import { Users, Plus, Search, Filter, Eye, Edit, UserCheck, UserX, Clock, Phone, Mail, X, Calendar, Upload, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface Candidate {
  id: string
  fullName: string
  email: string
  phone?: string
  examDate?: Date
  examName?: string
  status: 'registered' | 'checked_in' | 'in_progress' | 'completed' | 'no_show' | 'cancelled'
  confirmationNumber: string
  checkInTime?: Date
  notes?: string
  createdAt: Date
}

interface ModernStatsCardProps {
  title: string
  value: string | number
  subtitle: string
  icon: React.ElementType
  status?: 'positive' | 'warning' | 'neutral' | 'primary'
  onClick?: () => void
  clickable?: boolean
}

interface EditCandidateData {
  fullName: string
  email: string
  phone: string
  examDate: string
  examName: string
  notes: string
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

export function CandidateTracker() {
  const { user } = useAuth()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
  const [showNewCandidateModal, setShowNewCandidateModal] = useState(false)
  const [showEditCandidateModal, setShowEditCandidateModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterDate, setFilterDate] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [uploadResults, setUploadResults] = useState<{ success: number; errors: string[] }>({ success: 0, errors: [] })
  const [loading, setLoading] = useState(true)
  const [newCandidate, setNewCandidate] = useState({
    fullName: '',
    email: '',
    phone: '',
    examDate: '',
    examName: '',
    notes: ''
  })
  const [editCandidate, setEditCandidate] = useState<EditCandidateData>({
    fullName: '',
    email: '',
    phone: '',
    examDate: '',
    examName: '',
    notes: ''
  })

  useEffect(() => {
    loadCandidates()
  }, [])

  const loadCandidates = async () => {
    try {
      setLoading(true)
      console.log('Loading candidates from Supabase...')
      const { data: candidatesData, error } = await supabase
        .from('candidates')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading candidates:', error)
        return
      }

      if (candidatesData) {
        const formattedCandidates: Candidate[] = candidatesData.map(candidate => ({
          id: candidate.id,
          fullName: candidate.full_name,
          email: candidate.email,
          phone: candidate.phone,
          examDate: candidate.exam_date ? new Date(candidate.exam_date) : undefined,
          examName: candidate.exam_name || 'Exam Session',
          status: candidate.status,
          confirmationNumber: candidate.confirmation_number || generateConfirmationNumber(),
          checkInTime: candidate.check_in_time ? new Date(candidate.check_in_time) : undefined,
          notes: candidate.notes,
          createdAt: new Date(candidate.created_at)
        }))
        setCandidates(formattedCandidates)
        console.log(`Loaded ${formattedCandidates.length} candidates`)
      }
    } catch (error) {
      console.error('Error loading candidates:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateConfirmationNumber = () => {
    const prefix = 'EXAM'
    const year = new Date().getFullYear()
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `${prefix}${year}-${random}`
  }

  const handleCreateCandidate = async () => {
    try {
      const confirmationNumber = generateConfirmationNumber()
      
      console.log('Creating new candidate...')
      const { data, error } = await supabase
        .from('candidates')
        .insert({
          full_name: newCandidate.fullName,
          email: newCandidate.email,
          phone: newCandidate.phone || null,
          exam_date: newCandidate.examDate ? new Date(newCandidate.examDate).toISOString() : null,
          exam_name: newCandidate.examName || null,
          status: 'registered',
          confirmation_number: confirmationNumber,
          notes: newCandidate.notes || null,
          user_id: user?.id
        })
        .select()
        .single()

      if (error) {
        console.error('Error saving to database:', error)
        alert('Failed to create candidate: ' + error.message)
        return
      }
      
      if (data) {
        console.log('Candidate created successfully!')
        await loadCandidates()
        
        setNewCandidate({ fullName: '', email: '', phone: '', examDate: '', examName: '', notes: '' })
        setShowNewCandidateModal(false)
        alert('Candidate created successfully!')
      }
    } catch (error) {
      console.error('Error creating candidate:', error)
      alert('Failed to create candidate. Please try again.')
    }
  }

  const handleEditCandidate = async () => {
    if (!selectedCandidate) return

    try {
      console.log('Updating candidate...')
      const { error } = await supabase
        .from('candidates')
        .update({
          full_name: editCandidate.fullName,
          email: editCandidate.email,
          phone: editCandidate.phone || null,
          exam_date: editCandidate.examDate ? new Date(editCandidate.examDate).toISOString() : null,
          exam_name: editCandidate.examName || null,
          notes: editCandidate.notes || null
        })
        .eq('id', selectedCandidate.id)

      if (error) {
        console.error('Error updating candidate:', error)
        alert('Failed to update candidate: ' + error.message)
        return
      }
      
      console.log('Candidate updated successfully!')
      await loadCandidates()
      setShowEditCandidateModal(false)
      setSelectedCandidate(null)
      alert('Candidate updated successfully!')
    } catch (error) {
      console.error('Error updating candidate:', error)
      alert('Failed to update candidate. Please try again.')
    }
  }

  const handleDeleteCandidate = async (candidateId: string, candidateName: string) => {
    if (!window.confirm(`Are you sure you want to delete candidate "${candidateName}"? This action cannot be undone.`)) {
      return
    }

    try {
      console.log('Deleting candidate...')
      const { error } = await supabase
        .from('candidates')
        .delete()
        .eq('id', candidateId)

      if (error) {
        console.error('Error deleting candidate:', error)
        alert('Failed to delete candidate: ' + error.message)
        return
      }
      
      console.log('Candidate deleted successfully!')
      await loadCandidates()
      alert('Candidate deleted successfully!')
    } catch (error) {
      console.error('Error deleting candidate:', error)
      alert('Failed to delete candidate. Please try again.')
    }
  }

  const openEditModal = (candidate: Candidate) => {
    setSelectedCandidate(candidate)
    setEditCandidate({
      fullName: candidate.fullName,
      email: candidate.email,
      phone: candidate.phone || '',
      examDate: candidate.examDate ? candidate.examDate.toISOString().slice(0, 16) : '',
      examName: candidate.examName || '',
      notes: candidate.notes || ''
    })
    setShowEditCandidateModal(true)
  }

  const handleUpdateStatus = async (candidateId: string, newStatus: Candidate['status']) => {
    try {
      const updateData: any = { status: newStatus }
      if (newStatus === 'checked_in') {
        updateData.check_in_time = new Date().toISOString()
      }

      const { error } = await supabase
        .from('candidates')
        .update(updateData)
        .eq('id', candidateId)

      if (error) {
        console.error('Error updating status:', error)
        alert('Failed to update status: ' + error.message)
        return
      }

      await loadCandidates()
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update status. Please try again.')
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
      if (validTypes.includes(file.type) || file.name.endsWith('.csv')) {
        setUploadFile(file)
        setUploadStatus('idle')
        setUploadResults({ success: 0, errors: [] })
      } else {
        alert('Please select a valid CSV or Excel file')
      }
    }
  }

  const processBulkUpload = async () => {
    if (!uploadFile || !user) return

    setUploadStatus('uploading')
    setUploadProgress(0)
    const errors: string[] = []
    let successCount = 0

    try {
      // Record the upload attempt
      const { data: uploadRecord, error: uploadError } = await supabase
        .from('candidate_roster_uploads')
        .insert({
          filename: uploadFile.name,
          total_candidates: 0, // Will update this after processing
          uploaded_by_user_id: user.id,
          status: 'processing'
        })
        .select()
        .single()

      if (uploadError) {
        console.error('Error creating upload record:', uploadError)
      }

      const text = await uploadFile.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        throw new Error('File must contain at least a header row and one data row')
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      const dataLines = lines.slice(1)

      // Validate required headers
      const requiredHeaders = ['full_name', 'email']
      const missingHeaders = requiredHeaders.filter(h => !headers.some(header => header.includes(h.replace('_', ''))))
      if (missingHeaders.length > 0) {
        throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`)
      }

      for (let i = 0; i < dataLines.length; i++) {
        try {
          const values = dataLines[i].split(',').map(v => v.trim())
          const candidateData: any = {}

          headers.forEach((header, index) => {
            const value = values[index] || ''
            if (header.includes('name') || header.includes('full')) candidateData.full_name = value
            if (header.includes('email')) candidateData.email = value
            if (header.includes('phone')) candidateData.phone = value || null
            if (header.includes('exam') && header.includes('name')) candidateData.exam_name = value || null
            if (header.includes('exam') && header.includes('date')) {
              candidateData.exam_date = value ? new Date(value).toISOString() : null
            }
            if (header.includes('note')) candidateData.notes = value || null
          })

          // Validate required fields
          if (!candidateData.full_name || !candidateData.email) {
            errors.push(`Row ${i + 2}: Missing name or email`)
            continue
          }

          // Check for duplicate email
          const existingCandidate = candidates.find(c => c.email === candidateData.email)
          if (existingCandidate) {
            errors.push(`Row ${i + 2}: Email ${candidateData.email} already exists`)
            continue
          }

          candidateData.status = 'registered'
          candidateData.confirmation_number = generateConfirmationNumber()
          candidateData.user_id = user.id

          const { error } = await supabase
            .from('candidates')
            .insert(candidateData)

          if (error) {
            errors.push(`Row ${i + 2}: Database error - ${error.message}`)
          } else {
            successCount++
          }
        } catch (rowError: any) {
          errors.push(`Row ${i + 2}: ${rowError.message}`)
        }

        setUploadProgress(Math.round(((i + 1) / dataLines.length) * 100))
      }

      // Update upload record
      if (uploadRecord) {
        await supabase
          .from('candidate_roster_uploads')
          .update({
            total_candidates: dataLines.length,
            processed_candidates: successCount,
            failed_candidates: errors.length,
            status: errors.length === dataLines.length ? 'failed' : 'completed',
            error_log: errors.length > 0 ? errors.join('\n') : null,
            processed_date: new Date().toISOString()
          })
          .eq('id', uploadRecord.id)
      }

      setUploadResults({ success: successCount, errors })
      setUploadStatus(errors.length === dataLines.length ? 'error' : 'success')
      
      if (successCount > 0) {
        await loadCandidates()
      }
    } catch (error: any) {
      setUploadStatus('error')
      setUploadResults({ success: 0, errors: [error.message] })
    }
  }

  const resetBulkUpload = () => {
    setUploadFile(null)
    setUploadStatus('idle')
    setUploadProgress(0)
    setUploadResults({ success: 0, errors: [] })
    setShowBulkUploadModal(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'registered': return 'text-blue-600 bg-blue-50 border border-blue-200'
      case 'checked_in': return 'text-yellow-600 bg-yellow-50 border border-yellow-200'
      case 'in_progress': return 'text-orange-600 bg-orange-50 border border-orange-200'
      case 'completed': return 'text-green-600 bg-green-50 border border-green-200'
      case 'no_show': return 'text-red-600 bg-red-50 border border-red-200'
      case 'cancelled': return 'text-gray-600 bg-gray-50 border border-gray-200'
      default: return 'text-gray-600 bg-gray-50 border border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'checked_in': return <UserCheck className="h-4 w-4" />
      case 'completed': return <UserCheck className="h-4 w-4" />
      case 'no_show': return <UserX className="h-4 w-4" />
      case 'in_progress': return <Clock className="h-4 w-4" />
      default: return <Users className="h-4 w-4" />
    }
  }

  const filteredCandidates = candidates.filter(candidate => {
    const matchesSearch = 
      candidate.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.confirmationNumber.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = filterStatus === 'all' || candidate.status === filterStatus
    
    const matchesDate = !filterDate || 
      (candidate.examDate && candidate.examDate.toISOString().split('T')[0] === filterDate)
    
    return matchesSearch && matchesStatus && matchesDate
  })

  const todayCandidates = candidates.filter(candidate => {
    if (!candidate.examDate) return false
    const today = new Date().toISOString().split('T')[0]
    return candidate.examDate.toISOString().split('T')[0] === today
  })

  if (loading) {
    return (
      <div className="dashboard-modern flex-1 p-4 sm:p-6 overflow-auto">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading candidates...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-modern flex-1 p-4 sm:p-6 overflow-auto">
      {/* Modern Header Section */}
      <div className="dashboard-section">
        <div className="modern-card p-6 mb-8" style={{
          background: 'var(--primary-gradient)',
          color: 'white',
          border: 'none'
        }}>
          <div className="flex items-center justify-between flex-col sm:flex-row space-y-4 sm:space-y-0">
            <div className="text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center justify-center sm:justify-start">
                <Users className="h-8 w-8 mr-3" />
                Candidate Tracker
              </h1>
              <p className="text-white/90 text-lg">
                Track and manage candidate registrations, check-ins, and exam progress
              </p>
              <div className="flex items-center justify-center sm:justify-start mt-3 text-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                <span className="text-white/80">{candidates.length} total candidates</span>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowNewCandidateModal(true)}
                className="btn-tertiary-modern bg-white text-gray-900 hover:bg-white/90 flex items-center justify-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Register Candidate
              </button>
              <button
                onClick={() => setShowBulkUploadModal(true)}
                className="btn-tertiary-modern bg-white/20 text-white border-white/30 hover:bg-white/30 flex items-center justify-center"
              >
                <Upload className="h-4 w-4 mr-2" />
                Bulk Upload
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Statistics Overview */}
      <div className="dashboard-section">
        <h2 className="section-title">Candidate Overview</h2>
        <div className="grid-responsive grid-4">
          <ModernStatsCard
            title="Today's Candidates"
            value={todayCandidates.length}
            subtitle={todayCandidates.length > 0 ? `${todayCandidates.length} scheduled for today` : 'No candidates scheduled'}
            icon={Calendar}
            status="primary"
          />
          <ModernStatsCard
            title="Checked In"
            value={candidates.filter(c => c.status === 'checked_in').length}
            subtitle={candidates.filter(c => c.status === 'checked_in').length > 0 ? 'Ready for exam' : 'None checked in'}
            icon={UserCheck}
            status="warning"
          />
          <ModernStatsCard
            title="In Progress"
            value={candidates.filter(c => c.status === 'in_progress').length}
            subtitle={candidates.filter(c => c.status === 'in_progress').length > 0 ? 'Currently testing' : 'No active exams'}
            icon={Clock}
            status="neutral"
          />
          <ModernStatsCard
            title="Completed"
            value={candidates.filter(c => c.status === 'completed').length}
            subtitle={candidates.filter(c => c.status === 'completed').length > 0 ? 'Exams finished' : 'No completions yet'}
            icon={UserCheck}
            status="positive"
          />
        </div>
      </div>

      {/* Modern Search and Filters */}
      <div className="dashboard-section">
        <h2 className="section-title">Search & Filter</h2>
        <div className="modern-card p-6">
          <div className="grid-responsive grid-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search candidates..."
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <select
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white text-gray-900"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="registered">Registered</option>
              <option value="checked_in">Checked In</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="no_show">No Show</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <input
              type="date"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white text-gray-900"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              placeholder="Filter by exam date"
            />

            <div className="flex items-center justify-center bg-gray-50 rounded-lg px-4 py-3">
              <Filter className="h-4 w-4 mr-2 text-gray-500" />
              <span className="text-sm text-gray-600">
                {filteredCandidates.length} of {candidates.length} candidates
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Candidates List */}
      <div className="dashboard-section">
        <h2 className="section-title">Candidate List</h2>
        <div className="space-y-4">
          {filteredCandidates.map((candidate) => (
            <div key={candidate.id} className="modern-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{
                    background: 'var(--primary-gradient)'
                  }}>
                    {candidate.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{candidate.fullName}</h3>
                    <p className="text-gray-500">{candidate.confirmationNumber}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(candidate.status)}`}>
                    {getStatusIcon(candidate.status)}
                    <span>{candidate.status.replace('_', ' ').toUpperCase()}</span>
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm mb-4">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">{candidate.email}</span>
                </div>
                {candidate.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">{candidate.phone}</span>
                  </div>
                )}
                <div>
                  <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Exam</p>
                  <p className="text-gray-900 font-medium">{candidate.examName || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Date & Time</p>
                  <p className="text-gray-900 font-medium">
                    {candidate.examDate ? candidate.examDate.toLocaleString() : 'Not scheduled'}
                  </p>
                </div>
              </div>
              
              {candidate.notes && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg border-l-4 border-yellow-400">
                  <p className="text-sm text-gray-700">{candidate.notes}</p>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {candidate.status === 'registered' && (
                    <button
                      onClick={() => handleUpdateStatus(candidate.id, 'checked_in')}
                      className="btn-secondary-modern flex items-center text-sm"
                    >
                      <UserCheck className="h-4 w-4 mr-1" />
                      Check In
                    </button>
                  )}
                  {candidate.status === 'checked_in' && (
                    <button
                      onClick={() => handleUpdateStatus(candidate.id, 'in_progress')}
                      className="flex items-center space-x-1 px-3 py-2 text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Clock className="h-4 w-4" />
                      <span>Start Exam</span>
                    </button>
                  )}
                  {candidate.status === 'in_progress' && (
                    <button
                      onClick={() => handleUpdateStatus(candidate.id, 'completed')}
                      className="btn-secondary-modern flex items-center text-sm"
                    >
                      <UserCheck className="h-4 w-4 mr-1" />
                      Complete
                    </button>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setSelectedCandidate(candidate)
                      setShowDetailsModal(true)
                    }}
                    className="btn-tertiary-modern flex items-center text-sm"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Details
                  </button>
                  <button 
                    onClick={() => openEditModal(candidate)}
                    className="flex items-center space-x-1 px-3 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Edit</span>
                  </button>
                  <button 
                    onClick={() => handleDeleteCandidate(candidate.id, candidate.fullName)}
                    className="flex items-center space-x-1 px-3 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {filteredCandidates.length === 0 && (
            <div className="modern-card p-12 text-center">
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No candidates found</h3>
              <p className="text-gray-500 mb-6">
                {candidates.length === 0 
                  ? "Get started by registering your first candidate or uploading a CSV file."
                  : "Try adjusting your search or filter criteria."
                }
              </p>
              {candidates.length === 0 && (
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => setShowNewCandidateModal(true)}
                    className="btn-primary-modern"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Register First Candidate
                  </button>
                  <button
                    onClick={() => setShowBulkUploadModal(true)}
                    className="btn-secondary-modern"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Bulk Upload CSV
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modern New Candidate Modal */}
      {showNewCandidateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="modern-card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Register New Candidate</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500"
                    placeholder="Enter candidate's full name"
                    value={newCandidate.fullName}
                    onChange={(e) => setNewCandidate({ ...newCandidate, fullName: e.target.value })}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                  <input
                    type="email"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500"
                    placeholder="candidate@email.com"
                    value={newCandidate.email}
                    onChange={(e) => setNewCandidate({ ...newCandidate, email: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500"
                    placeholder="+1-555-0123"
                    value={newCandidate.phone}
                    onChange={(e) => setNewCandidate({ ...newCandidate, phone: e.target.value })}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Exam Name</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500"
                    placeholder="AWS Solutions Architect, TOEFL, etc."
                    value={newCandidate.examName}
                    onChange={(e) => setNewCandidate({ ...newCandidate, examName: e.target.value })}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Exam Date & Time</label>
                <input
                  type="datetime-local"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white text-gray-900"
                  value={newCandidate.examDate}
                  onChange={(e) => setNewCandidate({ ...newCandidate, examDate: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 h-24 resize-none"
                  placeholder="Special accommodations, dietary requirements, etc."
                  value={newCandidate.notes}
                  onChange={(e) => setNewCandidate({ ...newCandidate, notes: e.target.value })}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-4 mt-6">
              <button
                onClick={() => setShowNewCandidateModal(false)}
                className="btn-tertiary-modern"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCandidate}
                className="btn-primary-modern"
                disabled={!newCandidate.fullName.trim() || !newCandidate.email.trim()}
              >
                Register Candidate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Edit Candidate Modal */}
      {showEditCandidateModal && selectedCandidate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="modern-card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Candidate: {selectedCandidate.fullName}</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500"
                    placeholder="Enter candidate's full name"
                    value={editCandidate.fullName}
                    onChange={(e) => setEditCandidate({ ...editCandidate, fullName: e.target.value })}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                  <input
                    type="email"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500"
                    placeholder="candidate@email.com"
                    value={editCandidate.email}
                    onChange={(e) => setEditCandidate({ ...editCandidate, email: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500"
                    placeholder="+1-555-0123"
                    value={editCandidate.phone}
                    onChange={(e) => setEditCandidate({ ...editCandidate, phone: e.target.value })}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Exam Name</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500"
                    placeholder="AWS Solutions Architect, TOEFL, etc."
                    value={editCandidate.examName}
                    onChange={(e) => setEditCandidate({ ...editCandidate, examName: e.target.value })}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Exam Date & Time</label>
                <input
                  type="datetime-local"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white text-gray-900"
                  value={editCandidate.examDate}
                  onChange={(e) => setEditCandidate({ ...editCandidate, examDate: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 h-24 resize-none"
                  placeholder="Special accommodations, dietary requirements, etc."
                  value={editCandidate.notes}
                  onChange={(e) => setEditCandidate({ ...editCandidate, notes: e.target.value })}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-4 mt-6">
              <button
                onClick={() => setShowEditCandidateModal(false)}
                className="btn-tertiary-modern"
              >
                Cancel
              </button>
              <button
                onClick={handleEditCandidate}
                className="btn-primary-modern"
                disabled={!editCandidate.fullName.trim() || !editCandidate.email.trim()}
              >
                Update Candidate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Candidate Details Modal */}
      {showDetailsModal && selectedCandidate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="modern-card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Candidate Details</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl" style={{
                  background: 'var(--primary-gradient)'
                }}>
                  {selectedCandidate.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-gray-900">{selectedCandidate.fullName}</h3>
                  <p className="text-gray-600">{selectedCandidate.confirmationNumber}</p>
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium mt-2 ${getStatusColor(selectedCandidate.status)}`}>
                    {selectedCandidate.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h4>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">{selectedCandidate.email}</span>
                    </div>
                    {selectedCandidate.phone && (
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">{selectedCandidate.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Exam Information</h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Exam Name</p>
                      <p className="text-gray-900 font-medium">{selectedCandidate.examName || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Scheduled Date</p>
                      <p className="text-gray-900 font-medium">
                        {selectedCandidate.examDate ? selectedCandidate.examDate.toLocaleString() : 'Not scheduled'}
                      </p>
                    </div>
                    {selectedCandidate.checkInTime && (
                      <div>
                        <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Check-in Time</p>
                        <p className="text-gray-900 font-medium">{selectedCandidate.checkInTime.toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {selectedCandidate.notes && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Notes</h4>
                  <div className="p-4 bg-gray-50 rounded-lg border-l-4 border-yellow-400">
                    <p className="text-gray-700">{selectedCandidate.notes}</p>
                  </div>
                </div>
              )}
              
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Registration Details</h4>
                <div className="text-sm text-gray-600">
                  <p>Registered: {selectedCandidate.createdAt.toLocaleString()}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-4 mt-6">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="btn-tertiary-modern"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  setShowDetailsModal(false)
                  openEditModal(selectedCandidate)
                }}
                className="btn-primary-modern"
              >
                Edit Candidate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Bulk Upload Modal */}
      {showBulkUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="modern-card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Bulk Upload Candidates</h2>
              <button
                onClick={() => resetBulkUpload()}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Upload Instructions</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Upload a CSV file with candidate information</li>
                  <li>• Required columns: <strong>full_name</strong>, <strong>email</strong></li>
                  <li>• Optional columns: phone, exam_name, exam_date, notes</li>
                  <li>• First row should contain column headers</li>
                  <li>• Date format: YYYY-MM-DD or MM/DD/YYYY</li>
                </ul>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select CSV File</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-gray-400 transition-colors">
                  <div className="text-center">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="bulk-upload-input"
                    />
                    <label
                      htmlFor="bulk-upload-input"
                      className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Click to select file
                    </label>
                    <p className="text-gray-500 text-sm mt-1">CSV, XLS, or XLSX files only</p>
                  </div>
                  
                  {uploadFile && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700">
                        <strong>Selected:</strong> {uploadFile.name} ({Math.round(uploadFile.size / 1024)}KB)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Progress */}
              {uploadStatus === 'uploading' && (
                <div>
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Processing candidates...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="h-3 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${uploadProgress}%`,
                        background: 'var(--primary-gradient)'
                      }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Upload Results */}
              {uploadStatus === 'success' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-green-900 mb-2">Upload Completed!</h3>
                  <p className="text-green-800">
                    Successfully imported {uploadResults.success} candidates.
                  </p>
                  {uploadResults.errors.length > 0 && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-yellow-700 font-medium">View {uploadResults.errors.length} errors</summary>
                      <ul className="mt-2 text-sm text-yellow-800 space-y-1 pl-4">
                        {uploadResults.errors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}

              {uploadStatus === 'error' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-red-900 mb-2">Upload Failed</h3>
                  <ul className="text-red-800 space-y-1">
                    {uploadResults.errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-4 mt-6">
              <button
                onClick={() => resetBulkUpload()}
                className="btn-tertiary-modern"
              >
                {uploadStatus === 'success' ? 'Done' : 'Cancel'}
              </button>
              {uploadFile && uploadStatus !== 'uploading' && uploadStatus !== 'success' && (
                <button
                  onClick={processBulkUpload}
                  className="btn-primary-modern"
                  disabled={!uploadFile}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Candidates
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
