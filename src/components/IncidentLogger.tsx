import { useState, useEffect } from 'react'
import { AlertTriangle, Plus, Search, Filter, Eye, Edit, Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface Incident {
  id: string
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  reporter: string
  assignedTo?: string
  createdAt: Date
  updatedAt: Date
}

export function IncidentLogger() {
  const { profile } = useAuth()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [showNewIncidentModal, setShowNewIncidentModal] = useState(false)
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editIncident, setEditIncident] = useState({
    id: '',
    title: '',
    description: '',
    severity: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    assignedTo: '',
    status: 'open' as 'open' | 'in_progress' | 'resolved' | 'closed'
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterSeverity, setFilterSeverity] = useState('all')
  const [newIncident, setNewIncident] = useState({
    title: '',
    description: '',
    severity: 'medium' as const,
    assignedTo: ''
  })

  useEffect(() => {
    loadIncidents()
  }, [])

  const loadIncidents = async () => {
    try {
      console.log('Loading incidents from Supabase...')
      const { data: incidentsData, error } = await supabase
        .from('incidents')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading incidents:', error)
        return
      }

      if (incidentsData) {
        const formattedIncidents: Incident[] = incidentsData.map(incident => ({
          id: incident.id,
          title: incident.title,
          description: incident.description,
          severity: incident.severity,
          status: incident.status,
          reporter: incident.reporter,
          assignedTo: incident.assigned_to,
          createdAt: new Date(incident.created_at),
          updatedAt: new Date(incident.updated_at)
        }))
        setIncidents(formattedIncidents)
      }
    } catch (error) {
      console.error('Error loading incidents:', error)
    }
  }

  const handleViewIncident = (incident: Incident) => {
    setSelectedIncident(incident)
    setShowViewModal(true)
  }

  const handleEditIncident = (incident: Incident) => {
    setEditIncident({
      id: incident.id,
      title: incident.title,
      description: incident.description,
      severity: incident.severity,
      assignedTo: incident.assignedTo || '',
      status: incident.status
    })
    setShowEditModal(true)
  }

  const handleUpdateIncident = async () => {
    try {
      console.log('Updating incident...')
      const { error } = await supabase
        .from('incidents')
        .update({
          title: editIncident.title,
          description: editIncident.description,
          severity: editIncident.severity,
          assigned_to: editIncident.assignedTo || null,
          status: editIncident.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', editIncident.id)
      
      if (error) {
        console.error('Error updating incident:', error)
        alert('Failed to update incident')
        return
      }
      
      await loadIncidents()
      setShowEditModal(false)
      console.log('Incident updated successfully!')
    } catch (error) {
      console.error('Error updating incident:', error)
      alert('Error updating incident')
    }
  }

  const handleDeleteIncident = async (incident: Incident) => {
    if (!confirm('Are you sure you want to delete this incident? This action cannot be undone.')) {
      return
    }
    
    try {
      console.log('Deleting incident...')
      const { error } = await supabase
        .from('incidents')
        .delete()
        .eq('id', incident.id)
      
      if (error) {
        console.error('Error deleting incident:', error)
        alert('Failed to delete incident')
        return
      }
      
      await loadIncidents()
      console.log('Incident deleted successfully!')
    } catch (error) {
      console.error('Error deleting incident:', error)
      alert('Error deleting incident')
    }
  }

  const handleCreateIncident = async () => {
    try {
      console.log('Creating new incident...')
      const { data, error } = await supabase
        .from('incidents')
        .insert({
          title: newIncident.title,
          description: newIncident.description,
          severity: newIncident.severity,
          assigned_to: newIncident.assignedTo || null,
          reporter: profile?.full_name || 'Anonymous',
          user_id: profile?.user_id
        })
        .select()
        .single()
      
      if (error) {
        console.error('Error creating incident:', error)
        return
      }
      
      if (data) {
        const incident: Incident = {
          id: data.id,
          title: data.title,
          description: data.description,
          severity: data.severity,
          status: data.status,
          reporter: data.reporter,
          assignedTo: data.assigned_to,
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at)
        }
        
        setIncidents([incident, ...incidents])
        setNewIncident({ title: '', description: '', severity: 'medium', assignedTo: '' })
        setShowNewIncidentModal(false)
        console.log('Incident created successfully!')
      }
    } catch (error) {
      console.error('Error creating incident:', error)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-green-400 bg-green-500/20'
      case 'medium': return 'text-yellow-400 bg-yellow-500/20'
      case 'high': return 'text-orange-400 bg-orange-500/20'
      case 'critical': return 'text-red-400 bg-red-500/20'
      default: return 'text-gray-400 bg-gray-500/20'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-red-400 bg-red-500/20'
      case 'in_progress': return 'text-yellow-400 bg-yellow-500/20'
      case 'resolved': return 'text-green-400 bg-green-500/20'
      case 'closed': return 'text-gray-400 bg-gray-500/20'
      default: return 'text-gray-400 bg-gray-500/20'
    }
  }

  const filteredIncidents = incidents.filter(incident => {
    const matchesSearch = incident.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         incident.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === 'all' || incident.status === filterStatus
    const matchesSeverity = filterSeverity === 'all' || incident.severity === filterSeverity
    
    return matchesSearch && matchesStatus && matchesSeverity
  })

  return (
    <div className="flex-1 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-blue-500 mr-3" />
            <h1 className="text-3xl font-bold text-gray-800">Incident Logger</h1>
          </div>
          <button
            onClick={() => setShowNewIncidentModal(true)}
            className="golden-button flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>New Incident</span>
          </button>
        </div>
        <p className="text-gray-600">Log, track, and manage incidents across your organization</p>
      </div>

      {/* Filters and Search */}
      <div className="golden-card p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search incidents..."
              className="golden-input pl-10 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <select
            className="golden-input"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          <select
            className="golden-input"
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
          >
            <option value="all">All Severity</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>

          <div className="text-sm text-gray-600 flex items-center">
            <Filter className="h-4 w-4 mr-2" />
            {filteredIncidents.length} of {incidents.length} incidents
          </div>
        </div>
      </div>

      {/* Incidents List */}
      <div className="space-y-4">
        {filteredIncidents.map((incident) => (
          <div key={incident.id} className="golden-card p-6 hover:bg-white/10 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-800">{incident.title}</h3>
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSeverityColor(incident.severity)}`}>
                  {incident.severity.toUpperCase()}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(incident.status)}`}>
                  {incident.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>
            
            <p className="text-gray-600 mb-4">{incident.description}</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
              <div>
                <p className="text-gray-500">Reporter</p>
                <p className="text-gray-800 font-medium">{incident.reporter}</p>
              </div>
              <div>
                <p className="text-gray-500">Assigned To</p>
                <p className="text-gray-800 font-medium">{incident.assignedTo || 'Unassigned'}</p>
              </div>
              <div>
                <p className="text-gray-500">Created</p>
                <p className="text-gray-800 font-medium">{incident.createdAt.toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-gray-500">Updated</p>
                <p className="text-gray-800 font-medium">{incident.updatedAt.toLocaleDateString()}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => handleViewIncident(incident)}
                className="flex items-center space-x-1 px-3 py-1 text-blue-600 hover:bg-blue-500/20 rounded transition-colors"
              >
                <Eye className="h-4 w-4" />
                <span>View</span>
              </button>
              <button 
                onClick={() => handleEditIncident(incident)}
                className="flex items-center space-x-1 px-3 py-1 text-green-600 hover:bg-green-500/20 rounded transition-colors"
              >
                <Edit className="h-4 w-4" />
                <span>Edit</span>
              </button>
              <button 
                onClick={() => handleDeleteIncident(incident)}
                className="flex items-center space-x-1 px-3 py-1 text-red-600 hover:bg-red-500/20 rounded transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* New Incident Modal */}
      {showNewIncidentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="golden-card p-6 w-full max-w-2xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Create New Incident</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Title</label>
                <input
                  type="text"
                  className="golden-input w-full"
                  placeholder="Brief description of the incident"
                  value={newIncident.title}
                  onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Description</label>
                <textarea
                  className="golden-input w-full h-32"
                  placeholder="Detailed description of the incident"
                  value={newIncident.description}
                  onChange={(e) => setNewIncident({ ...newIncident, description: e.target.value })}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Severity</label>
                  <select
                    className="golden-input w-full"
                    value={newIncident.severity}
                    onChange={(e) => setNewIncident({ ...newIncident, severity: e.target.value as any })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Assign To</label>
                  <input
                    type="text"
                    className="golden-input w-full"
                    placeholder="Person or team to assign"
                    value={newIncident.assignedTo}
                    onChange={(e) => setNewIncident({ ...newIncident, assignedTo: e.target.value })}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-4 mt-6">
              <button
                onClick={() => setShowNewIncidentModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateIncident}
                className="golden-button"
                disabled={!newIncident.title.trim()}
              >
                Create Incident
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Incident Modal */}
      {showViewModal && selectedIncident && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="golden-card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Incident Details</h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{selectedIncident.title}</h3>
                <div className="flex items-center space-x-2 mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSeverityColor(selectedIncident.severity)}`}>
                    {selectedIncident.severity.toUpperCase()}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedIncident.status)}`}>
                    {selectedIncident.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Description</label>
                <p className="text-gray-800 bg-gray-50 p-3 rounded-lg">{selectedIncident.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Reporter</label>
                  <p className="text-gray-800">{selectedIncident.reporter}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Assigned To</label>
                  <p className="text-gray-800">{selectedIncident.assignedTo || 'Unassigned'}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Created</label>
                  <p className="text-gray-800">{selectedIncident.createdAt.toLocaleDateString()} at {selectedIncident.createdAt.toLocaleTimeString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Last Updated</label>
                  <p className="text-gray-800">{selectedIncident.updatedAt.toLocaleDateString()} at {selectedIncident.updatedAt.toLocaleTimeString()}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-4 mt-6">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowViewModal(false)
                  handleEditIncident(selectedIncident)
                }}
                className="golden-button"
              >
                Edit Incident
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Incident Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="golden-card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Edit Incident</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Title</label>
                <input
                  type="text"
                  className="golden-input w-full"
                  placeholder="Brief description of the incident"
                  value={editIncident.title}
                  onChange={(e) => setEditIncident({ ...editIncident, title: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Description</label>
                <textarea
                  className="golden-input w-full h-32"
                  placeholder="Detailed description of the incident"
                  value={editIncident.description}
                  onChange={(e) => setEditIncident({ ...editIncident, description: e.target.value })}
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Severity</label>
                  <select
                    className="golden-input w-full"
                    value={editIncident.severity}
                    onChange={(e) => setEditIncident({ ...editIncident, severity: e.target.value as any })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Status</label>
                  <select
                    className="golden-input w-full"
                    value={editIncident.status}
                    onChange={(e) => setEditIncident({ ...editIncident, status: e.target.value as any })}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Assign To</label>
                  <input
                    type="text"
                    className="golden-input w-full"
                    placeholder="Person or team to assign"
                    value={editIncident.assignedTo}
                    onChange={(e) => setEditIncident({ ...editIncident, assignedTo: e.target.value })}
                  />
                </div>
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
                onClick={handleUpdateIncident}
                className="golden-button"
                disabled={!editIncident.title.trim()}
              >
                Update Incident
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
