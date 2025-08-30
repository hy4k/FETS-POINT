import { useState, useEffect } from 'react'
import { UserCog, Plus, Search, Filter, Eye, Edit, Trash2, Users, Calendar, Phone, Mail, X, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface StaffMember {
  id: string
  fullName: string
  email: string
  phone?: string
  role: string
  department: string
  status: 'active' | 'inactive' | 'on_leave'
  hireDate: Date
  skills: string[]
  certifications: string[]
  notes?: string
}

export function StaffManagement() {
  const { profile } = useAuth()
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [showNewStaffModal, setShowNewStaffModal] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editStaff, setEditStaff] = useState({
    id: '',
    fullName: '',
    email: '',
    phone: '',
    role: '',
    department: '',
    hireDate: '',
    skills: '',
    certifications: '',
    notes: '',
    status: 'active' as 'active' | 'inactive' | 'on_leave'
  })
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDepartment, setFilterDepartment] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [newStaff, setNewStaff] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: '',
    department: '',
    hireDate: '',
    skills: '',
    certifications: '',
    notes: ''
  })

  // Role-based access control
  const isSuperAdmin = profile?.role === 'super_admin'
  const isAdmin = profile?.role === 'admin' || isSuperAdmin
  const canManageUsers = isSuperAdmin
  const canCreateUsers = isAdmin
  const canEditUsers = isSuperAdmin
  const canDeleteUsers = isSuperAdmin

  useEffect(() => {
    loadStaffData()
  }, [])

  const handleEditStaff = (staff: StaffMember) => {
    setEditStaff({
      id: staff.id,
      fullName: staff.fullName,
      email: staff.email,
      phone: staff.phone || '',
      role: staff.role,
      department: staff.department,
      hireDate: staff.hireDate.toISOString().split('T')[0],
      skills: staff.skills.join(', '),
      certifications: staff.certifications.join(', '),
      notes: staff.notes || '',
      status: staff.status
    })
    setShowEditModal(true)
  }

  const handleUpdateStaff = async () => {
    try {
      console.log('Updating staff member...')
      
      if (!editStaff.fullName.trim() || !editStaff.email.trim() || !editStaff.role.trim() || !editStaff.department.trim()) {
        console.error('Missing required fields')
        return
      }
      
      const skills = editStaff.skills ? editStaff.skills.split(',').map(s => s.trim()).filter(s => s) : []
      const certifications = editStaff.certifications ? editStaff.certifications.split(',').map(c => c.trim()).filter(c => c) : []
      
      const { error } = await supabase
        .from('staff_profiles')
        .update({
          full_name: editStaff.fullName,
          email: editStaff.email,
          phone: editStaff.phone || null,
          role: editStaff.role,
          department: editStaff.department,
          hire_date: editStaff.hireDate || null,
          skills: skills,
          certifications: certifications,
          notes: editStaff.notes || null,
          status: editStaff.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', editStaff.id)

      if (error) {
        console.error('Error updating staff member:', error)
        alert(`Failed to update staff member: ${error.message}`)
        return
      }
      
      await loadStaffData()
      setShowEditModal(false)
      alert('Staff member updated successfully!')
      console.log('Staff member updated successfully!')
    } catch (error: unknown) {
      console.error('Error updating staff member:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`Error updating staff member: ${errorMessage}`)
    }
  }

  const handleDeleteStaff = async (staff: StaffMember) => {
    if (!confirm(`Are you sure you want to delete ${staff.fullName}? This action cannot be undone.`)) {
      return
    }
    
    try {
      console.log('Deleting staff member...')
      const { error } = await supabase
        .from('staff_profiles')
        .delete()
        .eq('id', staff.id)
      
      if (error) {
        console.error('Error deleting staff member:', error)
        alert(`Failed to delete staff member: ${error.message}`)
        return
      }
      
      await loadStaffData()
      alert('Staff member deleted successfully!')
      console.log('Staff member deleted successfully!')
    } catch (error: unknown) {
      console.error('Error deleting staff member:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`Error deleting staff member: ${errorMessage}`)
    }
  }

  const loadStaffData = async () => {
    try {
      console.log('Loading staff from Supabase...')
      
      const { data: staffData, error } = await supabase
        .from('staff_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading staff:', error)
        return
      }

      const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()
      
      if (usersError) {
        console.error('Could not load auth users (normal in client-side):', usersError.message)
      } else {
        console.log('Loaded auth users:', users?.length || 0)
      }

      if (staffData) {
        const formattedStaff: StaffMember[] = staffData.map(staff => ({
          id: staff.id,
          fullName: staff.full_name,
          email: staff.email,
          phone: staff.phone,
          role: staff.role,
          department: staff.department,
          status: staff.status as 'active' | 'inactive' | 'on_leave',
          hireDate: new Date(staff.hire_date || staff.created_at),
          skills: staff.skills || [],
          certifications: staff.certifications || [],
          notes: staff.notes || ''
        }))
        
        setStaffMembers(formattedStaff)
        console.log(`Loaded ${formattedStaff.length} staff members`)
      }
    } catch (error) {
      console.error('Error loading staff data:', error)
    }
  }

  const handleCreateStaff = async () => {
    try {
      console.log('Creating new staff member...')
      
      if (!newStaff.fullName.trim() || !newStaff.email.trim() || !newStaff.role.trim() || !newStaff.department.trim()) {
        console.error('Missing required fields')
        return
      }
      
      const skills = newStaff.skills ? newStaff.skills.split(',').map(s => s.trim()).filter(s => s) : []
      const certifications = newStaff.certifications ? newStaff.certifications.split(',').map(c => c.trim()).filter(c => c) : []
      
      const { data, error } = await supabase
        .from('staff_profiles')
        .insert({
          full_name: newStaff.fullName,
          email: newStaff.email,
          phone: newStaff.phone || null,
          role: newStaff.role,
          department: newStaff.department,
          hire_date: newStaff.hireDate || null,
          skills: skills,
          certifications: certifications,
          notes: newStaff.notes || null,
          status: 'active'
        })
        .select()
        .single()

      if (error) {
        console.error('Error saving to database:', error)
        alert(`Failed to create staff member: ${error.message}`)
        return
      }
      
      if (data) {
        console.log('Staff member created successfully!')
        await loadStaffData()
        
        setNewStaff({ 
          fullName: '', 
          email: '', 
          phone: '', 
          role: '', 
          department: '', 
          hireDate: '', 
          skills: '', 
          certifications: '', 
          notes: '' 
        })
        setShowNewStaffModal(false)
        
        alert('Staff member created successfully!')
      }
    } catch (error: unknown) {
      console.error('Error creating staff member:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`Error creating staff member: ${errorMessage}`)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-700 bg-green-100'
      case 'inactive': return 'text-gray-700 bg-gray-100'
      case 'on_leave': return 'text-yellow-700 bg-yellow-100'
      default: return 'text-gray-700 bg-gray-100'
    }
  }

  const getDepartmentColor = (department: string) => {
    switch (department.toLowerCase()) {
      case 'operations': return 'text-blue-700 bg-blue-100'
      case 'information technology': return 'text-purple-700 bg-purple-100'
      case 'security': return 'text-red-700 bg-red-100'
      case 'administration': return 'text-green-700 bg-green-100'
      default: return 'text-gray-700 bg-gray-100'
    }
  }

  const filteredStaff = staffMembers.filter(staff => {
    const matchesSearch = 
      staff.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.role.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesDepartment = filterDepartment === 'all' || staff.department === filterDepartment
    const matchesStatus = filterStatus === 'all' || staff.status === filterStatus
    
    return matchesSearch && matchesDepartment && matchesStatus
  })

  const departments = ['all', ...new Set(staffMembers.map(staff => staff.department))]
  const activeStaff = staffMembers.filter(s => s.status === 'active').length
  const onLeaveStaff = staffMembers.filter(s => s.status === 'on_leave').length

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#fafaf9' }}>
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <UserCog className="h-8 w-8 text-orange-500 mr-3" />
              <div>
                <h1 className="text-3xl font-bold text-gray-800 flex items-center">
                  User Management
                  {/* Role Badge */}
                  {profile && (
                    <span className={`ml-4 px-3 py-1 text-xs font-semibold rounded-full ${
                      isSuperAdmin 
                        ? 'bg-red-100 text-red-800 ring-2 ring-red-200' 
                        : isAdmin 
                        ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-200'
                        : 'bg-gray-100 text-gray-800 ring-2 ring-gray-200'
                    }`}>
                      {profile.role === 'super_admin' ? 'SUPER ADMIN' : 
                       profile.role === 'admin' ? 'ADMIN' : 'USER'}
                    </span>
                  )}
                </h1>
              </div>
            </div>
            <button
              onClick={() => canCreateUsers ? setShowNewStaffModal(true) : null}
              disabled={!canCreateUsers}
              className={`flex items-center px-6 py-3 font-medium rounded-xl shadow-md transition-all duration-200 ${
                canCreateUsers
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:shadow-lg transform hover:scale-105'
                  : 'bg-gray-100 text-gray-500 cursor-not-allowed'
              }`}
              title={!canCreateUsers ? 'Admin access required' : 'Add new staff member'}
            >
              <Plus className="h-4 w-4 mr-2" />
              {canCreateUsers ? 'Add Staff Member' : 'Admin Required'}
            </button>
          </div>
          <p className="text-gray-600">
            Manage staff profiles, schedules, and organizational structure
            {!canManageUsers && (
              <span className="text-amber-600 ml-2 text-sm">• Limited access - Contact Super Admin for full management</span>
            )}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Total Staff</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">{staffMembers.length}</p>
              </div>
              <Users className="h-10 w-10 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Active Staff</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">{activeStaff}</p>
              </div>
              <UserCog className="h-10 w-10 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">On Leave</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">{onLeaveStaff}</p>
              </div>
              <Calendar className="h-10 w-10 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Departments</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">{departments.length - 1}</p>
              </div>
              <Users className="h-10 w-10 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search staff..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <select
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
            >
              {departments.map(dept => (
                <option key={dept} value={dept}>
                  {dept === 'all' ? 'All Departments' : dept}
                </option>
              ))}
            </select>

            <select
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="on_leave">On Leave</option>
            </select>

            <div className="text-sm text-gray-600 flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              {filteredStaff.length} of {staffMembers.length} staff members
            </div>
          </div>
        </div>

        {/* Staff Grid */}
        {filteredStaff.length === 0 ? (
          <div className="text-center py-12">
            <div className="relative">
              <Users className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                <Plus className="w-4 h-4 text-orange-600" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Staff Members Found</h3>
            <p className="text-gray-500 mb-6">
              {canCreateUsers 
                ? "Add your first staff member to get started"
                : "No staff members are available. Contact an Admin to add team members."
              }
            </p>
            {canCreateUsers && (
              <button
                onClick={() => setShowNewStaffModal(true)}
                className="fets-orange-card px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:scale-105 shadow-lg"
              >
                <Plus className="inline mr-2 h-5 w-5" />
                Add Your First Staff Member
              </button>
            )}
            {!canCreateUsers && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-amber-800 text-sm flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Admin access required to add staff members
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStaff.map((staff) => (
              <div key={staff.id} className="group relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-400">
                {/* Status indicator */}
                <div className="absolute top-4 right-4">
                  <div className={`w-3 h-3 rounded-full ${
                    staff.status === 'active' 
                      ? 'bg-green-500 animate-pulse' 
                      : staff.status === 'on_leave'
                      ? 'bg-yellow-500 animate-pulse'
                      : 'bg-gray-400'
                  }`}></div>
                </div>

                {/* Staff Avatar & Basic Info */}
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="w-20 h-20 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-2xl mb-4 shadow-lg">
                    {staff.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-1">{staff.fullName}</h3>
                  <p className="text-gray-600 font-medium mb-3">{staff.role}</p>
                  
                  {/* Status & Department Badges */}
                  <div className="flex items-center justify-center space-x-2 mb-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(staff.status)}`}>
                      {staff.status.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDepartmentColor(staff.department)}`}>
                      {staff.department.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="h-4 w-4 mr-3 text-gray-500" />
                    <span className="truncate">{staff.email}</span>
                  </div>
                  {staff.phone && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="h-4 w-4 mr-3 text-gray-500" />
                      <span>{staff.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-3 text-gray-500" />
                    <span>Joined {staff.hireDate.toLocaleDateString()}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">
                      {Math.floor((new Date().getTime() - staff.hireDate.getTime()) / (365 * 24 * 60 * 60 * 1000))} years experience
                    </span>
                  </div>
                </div>

                {/* Skills & Certifications Preview */}
                {(staff.skills.length > 0 || staff.certifications.length > 0) && (
                  <div className="mb-6">
                    {staff.skills.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-500 mb-2">Top Skills:</p>
                        <div className="flex flex-wrap gap-1">
                          {staff.skills.slice(0, 3).map((skill, index) => (
                            <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-lg">
                              {skill}
                            </span>
                          ))}
                          {staff.skills.length > 3 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg">
                              +{staff.skills.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {staff.certifications.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-2">Certifications:</p>
                        <div className="flex flex-wrap gap-1">
                          {staff.certifications.slice(0, 2).map((cert, index) => (
                            <span key={index} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-lg">
                              {cert}
                            </span>
                          ))}
                          {staff.certifications.length > 2 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg">
                              +{staff.certifications.length - 2}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col space-y-2">
                  <button
                    onClick={() => {
                      setSelectedStaff(staff)
                      setShowDetailsModal(true)
                    }}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                    <span>View Details</span>
                  </button>
                  
                  <div className="flex space-x-2">
                    {canEditUsers ? (
                      <button 
                        onClick={() => handleEditStaff(staff)}
                        className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                        <span>Edit</span>
                      </button>
                    ) : (
                      <div className="flex-1 flex items-center justify-center px-3 py-2 text-gray-400 bg-gray-50 rounded-lg cursor-not-allowed" title="Super Admin required">
                        <Edit className="h-4 w-4 mr-1" />
                        <span className="text-xs">Edit</span>
                      </div>
                    )}
                    
                    {canDeleteUsers ? (
                      <button 
                        onClick={() => handleDeleteStaff(staff)}
                        className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Remove</span>
                      </button>
                    ) : (
                      <div className="flex-1 flex items-center justify-center px-3 py-2 text-gray-400 bg-gray-50 rounded-lg cursor-not-allowed" title="Super Admin required">
                        <Trash2 className="h-4 w-4 mr-1" />
                        <span className="text-xs">Remove</span>
                      </div>
                    )}
                  </div>
                  
                  {!canEditUsers && !canDeleteUsers && (
                    <div className="text-center py-1">
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        Super Admin Required
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* New Staff Modal */}
        {showNewStaffModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Add New Staff Member</h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Full Name *</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                      placeholder="Enter full name"
                      value={newStaff.fullName}
                      onChange={(e) => setNewStaff({ ...newStaff, fullName: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Email *</label>
                    <input
                      type="email"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                      placeholder="staff@fetspoint.com"
                      value={newStaff.email}
                      onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Phone</label>
                    <input
                      type="tel"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                      placeholder="+1-555-0123"
                      value={newStaff.phone}
                      onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Hire Date</label>
                    <input
                      type="date"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                      value={newStaff.hireDate}
                      onChange={(e) => setNewStaff({ ...newStaff, hireDate: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Role *</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                      placeholder="Test Administrator, IT Specialist, etc."
                      value={newStaff.role}
                      onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Department *</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                      placeholder="Operations, IT, Security, etc."
                      value={newStaff.department}
                      onChange={(e) => setNewStaff({ ...newStaff, department: e.target.value })}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Skills (comma-separated)</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                    placeholder="Network Administration, Database Management, etc."
                    value={newStaff.skills}
                    onChange={(e) => setNewStaff({ ...newStaff, skills: e.target.value })}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Certifications (comma-separated)</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                    placeholder="CompTIA A+, PMP, Security+, etc."
                    value={newStaff.certifications}
                    onChange={(e) => setNewStaff({ ...newStaff, certifications: e.target.value })}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Notes</label>
                  <textarea
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none h-24 resize-none"
                    placeholder="Additional notes about this staff member"
                    value={newStaff.notes}
                    onChange={(e) => setNewStaff({ ...newStaff, notes: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-4 mt-6">
                <button
                  onClick={() => setShowNewStaffModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateStaff}
                  className="px-6 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                  disabled={!newStaff.fullName.trim() || !newStaff.email.trim() || !newStaff.role.trim() || !newStaff.department.trim()}
                >
                  Create Staff Member
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Staff Details Modal */}
        {showDetailsModal && selectedStaff && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Staff Details</h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                    {selectedStaff.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-semibold text-gray-800">{selectedStaff.fullName}</h3>
                    <p className="text-gray-600 text-lg">{selectedStaff.role}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedStaff.status)}`}>
                        {selectedStaff.status.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDepartmentColor(selectedStaff.department)}`}>
                        {selectedStaff.department}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Contact & Employment Info */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-4">Contact Information</h4>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-800">{selectedStaff.email}</span>
                      </div>
                      {selectedStaff.phone && (
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-800">{selectedStaff.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-4">Employment Details</h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-gray-600 text-sm">Hire Date</p>
                        <p className="text-gray-800">{selectedStaff.hireDate.toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-sm">Experience</p>
                        <p className="text-gray-800">
                          {Math.floor((new Date().getTime() - selectedStaff.hireDate.getTime()) / (365 * 24 * 60 * 60 * 1000))} years
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Skills & Certifications */}
                {(selectedStaff.skills.length > 0 || selectedStaff.certifications.length > 0) && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-4">Skills & Certifications</h4>
                    <div className="space-y-4">
                      {selectedStaff.skills.length > 0 && (
                        <div>
                          <p className="text-sm text-gray-600 mb-2">Skills:</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedStaff.skills.map((skill, index) => (
                              <span key={index} className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-lg">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {selectedStaff.certifications.length > 0 && (
                        <div>
                          <p className="text-sm text-gray-600 mb-2">Certifications:</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedStaff.certifications.map((cert, index) => (
                              <span key={index} className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-lg">
                                {cert}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Notes */}
                {selectedStaff.notes && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">Notes</h4>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-gray-700">{selectedStaff.notes}</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-end space-x-4 mt-6">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Close
                </button>
                {canEditUsers && (
                  <button 
                    onClick={() => {
                      setShowDetailsModal(false)
                      handleEditStaff(selectedStaff)
                    }}
                    className="px-6 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    Edit Staff Member
                  </button>
                )}
                {!canEditUsers && (
                  <div className="px-6 py-2 bg-gray-100 text-gray-500 font-medium rounded-lg cursor-not-allowed" title="Super Admin access required">
                    Edit Restricted
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Edit Staff Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Edit Staff Member</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Full Name *</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                      placeholder="Enter full name"
                      value={editStaff.fullName}
                      onChange={(e) => setEditStaff({ ...editStaff, fullName: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Email *</label>
                    <input
                      type="email"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                      placeholder="staff@fetspoint.com"
                      value={editStaff.email}
                      onChange={(e) => setEditStaff({ ...editStaff, email: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Phone</label>
                    <input
                      type="tel"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                      placeholder="+1-555-0123"
                      value={editStaff.phone}
                      onChange={(e) => setEditStaff({ ...editStaff, phone: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Hire Date</label>
                    <input
                      type="date"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                      value={editStaff.hireDate}
                      onChange={(e) => setEditStaff({ ...editStaff, hireDate: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Role *</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                      placeholder="Test Administrator, IT Specialist, etc."
                      value={editStaff.role}
                      onChange={(e) => setEditStaff({ ...editStaff, role: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Department *</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                      placeholder="Operations, IT, Security, etc."
                      value={editStaff.department}
                      onChange={(e) => setEditStaff({ ...editStaff, department: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Status</label>
                    <select
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                      value={editStaff.status}
                      onChange={(e) => setEditStaff({ ...editStaff, status: e.target.value as any })}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="on_leave">On Leave</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Skills (comma-separated)</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                    placeholder="Network Administration, Database Management, etc."
                    value={editStaff.skills}
                    onChange={(e) => setEditStaff({ ...editStaff, skills: e.target.value })}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Certifications (comma-separated)</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                    placeholder="CompTIA A+, PMP, Security+, etc."
                    value={editStaff.certifications}
                    onChange={(e) => setEditStaff({ ...editStaff, certifications: e.target.value })}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Notes</label>
                  <textarea
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none h-24 resize-none"
                    placeholder="Additional notes about this staff member"
                    value={editStaff.notes}
                    onChange={(e) => setEditStaff({ ...editStaff, notes: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-4 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateStaff}
                  className="px-6 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                  disabled={!editStaff.fullName.trim() || !editStaff.email.trim() || !editStaff.role.trim() || !editStaff.department.trim()}
                >
                  Update Staff Member
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
