import { useState, useEffect } from 'react'
import { 
  CheckCircle, 
  Plus, 
  Search, 
  Edit, 
  Trash2,
  X,
  CheckSquare,
  Square,
  PlayCircle,
  AlertTriangle,
  FileText,
  Eye
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface ChecklistTemplate {
  id: string
  name: string
  description?: string
  category: 'pre-exam' | 'post-exam'
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
  items?: ChecklistTemplateItem[]
}

interface ChecklistTemplateItem {
  id: string
  template_id: string
  title: string
  description?: string
  priority: 'low' | 'medium' | 'high'
  estimated_time_minutes: number
  responsible_role: string
  notes?: string
  sort_order: number
  created_at: string
}

interface ChecklistInstance {
  id: string
  template_id: string
  name: string
  category: 'pre-exam' | 'post-exam'
  exam_date: string
  created_by: string
  completed_at?: string
  created_at: string
  updated_at: string
  items?: ChecklistInstanceItem[]
}

interface ChecklistInstanceItem {
  id: string
  instance_id: string
  template_item_id?: string
  title: string
  description?: string
  priority: 'low' | 'medium' | 'high'
  estimated_time_minutes: number
  responsible_role: string
  notes?: string
  is_completed: boolean
  completed_by?: string
  completed_at?: string
  sort_order: number
  created_at: string
}

interface TemplateFormData {
  name: string
  description: string
  category: 'pre-exam' | 'post-exam'
}

interface ItemFormData {
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
  estimated_time_minutes: number
  responsible_role: string
  notes: string
}

export function ChecklistManagement() {
  const { user, profile } = useAuth()
  const [activeTab, setActiveTab] = useState<'templates' | 'instances'>('templates')
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([])
  const [instances, setInstances] = useState<ChecklistInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showItemModal, setShowItemModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ChecklistTemplate | null>(null)
  const [editingItem, setEditingItem] = useState<ChecklistTemplateItem | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<ChecklistTemplate | null>(null)
  const [selectedInstance, setSelectedInstance] = useState<ChecklistInstance | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [templateFormData, setTemplateFormData] = useState<TemplateFormData>({
    name: '',
    description: '',
    category: 'pre-exam'
  })
  const [itemFormData, setItemFormData] = useState<ItemFormData>({
    title: '',
    description: '',
    priority: 'medium',
    estimated_time_minutes: 5,
    responsible_role: 'any',
    notes: ''
  })

  // Role-based access control
  const isSuperAdmin = profile?.role === 'super_admin'
  const isAdmin = profile?.role === 'admin' || isSuperAdmin
  const canManageTemplates = isSuperAdmin
  const canDeleteInstances = isAdmin
  const canCreateInstances = isAdmin

  const priorities = [
    { value: 'low', label: 'Low', color: 'bg-gray-500' },
    { value: 'medium', label: 'Medium', color: 'bg-yellow-500' },
    { value: 'high', label: 'High', color: 'bg-red-500' }
  ]

  const roles = [
    'any',
    'tca',
    'super_admin',
    'tech_support',
    'manager',
    'staff'
  ]

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        loadTemplates(),
        loadInstances()
      ])
    } catch (error) {
      console.error('Error loading data:', error)
      setError('Failed to load checklist data')
    } finally {
      setLoading(false)
    }
  }

  const loadTemplates = async () => {
    const { data, error } = await supabase
      .from('checklist_templates')
      .select(`
        *,
        items:checklist_template_items(*)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    setTemplates(data || [])
  }

  const loadInstances = async () => {
    const { data, error } = await supabase
      .from('checklist_instances')
      .select(`
        *,
        items:checklist_instance_items(*)
      `)
      .order('exam_date', { ascending: false })

    if (error) throw error
    setInstances(data || [])
  }

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSubmitting(true)
    setError('')

    try {
      if (editingTemplate) {
        const { error } = await supabase
          .from('checklist_templates')
          .update(templateFormData)
          .eq('id', editingTemplate.id)

        if (error) throw error
        setSuccess('Template updated successfully!')
      } else {
        const { error } = await supabase
          .from('checklist_templates')
          .insert([{
            ...templateFormData,
            created_by: user.id
          }])

        if (error) throw error
        setSuccess('Template created successfully!')
      }

      resetTemplateForm()
      loadTemplates()
    } catch (error: any) {
      console.error('Error saving template:', error)
      setError(error.message || 'Failed to save template')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateInstance = async (template: ChecklistTemplate) => {
    if (!user) return

    try {
      setSubmitting(true)
      const today = new Date().toISOString().split('T')[0]

      // Create instance
      const { data: instance, error: instanceError } = await supabase
        .from('checklist_instances')
        .insert([{
          template_id: template.id,
          name: `${template.name} - ${today}`,
          category: template.category,
          exam_date: today,
          created_by: user.id
        }])
        .select()
        .single()

      if (instanceError) throw instanceError

      // Copy template items to instance items
      if (template.items && template.items.length > 0) {
        const instanceItems = template.items.map(item => ({
          instance_id: instance.id,
          template_item_id: item.id,
          title: item.title,
          description: item.description,
          priority: item.priority,
          estimated_time_minutes: item.estimated_time_minutes,
          responsible_role: item.responsible_role,
          notes: item.notes,
          sort_order: item.sort_order
        }))

        const { error: itemsError } = await supabase
          .from('checklist_instance_items')
          .insert(instanceItems)

        if (itemsError) throw itemsError
      }

      setSuccess('Checklist instance created successfully!')
      loadInstances()
    } catch (error: any) {
      console.error('Error creating instance:', error)
      setError(error.message || 'Failed to create checklist instance')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTemplate) return

    setSubmitting(true)
    setError('')

    try {
      const itemData = {
        ...itemFormData,
        template_id: selectedTemplate.id,
        sort_order: (selectedTemplate.items?.length || 0) + 1
      }

      if (editingItem) {
        const { error } = await supabase
          .from('checklist_template_items')
          .update(itemData)
          .eq('id', editingItem.id)

        if (error) throw error
        setSuccess('Item updated successfully!')
      } else {
        const { error } = await supabase
          .from('checklist_template_items')
          .insert([itemData])

        if (error) throw error
        setSuccess('Item added successfully!')
      }

      resetItemForm()
      loadTemplates()
    } catch (error: any) {
      console.error('Error saving item:', error)
      setError(error.message || 'Failed to save item')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleItem = async (instanceItem: ChecklistInstanceItem) => {
    if (!user) return

    try {
      const updateData = {
        is_completed: !instanceItem.is_completed,
        completed_by: !instanceItem.is_completed ? user.id : null,
        completed_at: !instanceItem.is_completed ? new Date().toISOString() : null
      }

      const { error } = await supabase
        .from('checklist_instance_items')
        .update(updateData)
        .eq('id', instanceItem.id)

      if (error) throw error
      loadInstances()
    } catch (error: any) {
      console.error('Error updating item:', error)
      setError('Failed to update item')
    }
  }

  const handleDeleteTemplate = async (template: ChecklistTemplate) => {
    if (!confirm('Are you sure you want to delete this template? This will also delete all associated items.')) return

    try {
      const { error } = await supabase
        .from('checklist_templates')
        .delete()
        .eq('id', template.id)

      if (error) throw error
      setSuccess('Template deleted successfully!')
      loadTemplates()
    } catch (error: any) {
      console.error('Error deleting template:', error)
      setError(error.message || 'Failed to delete template')
    }
  }

  const handleDeleteInstance = async (instance: ChecklistInstance) => {
    if (!confirm('Are you sure you want to delete this checklist instance?')) return

    try {
      const { error } = await supabase
        .from('checklist_instances')
        .delete()
        .eq('id', instance.id)

      if (error) throw error
      setSuccess('Checklist instance deleted successfully!')
      loadInstances()
    } catch (error: any) {
      console.error('Error deleting instance:', error)
      setError(error.message || 'Failed to delete instance')
    }
  }

  const resetTemplateForm = () => {
    setTemplateFormData({
      name: '',
      description: '',
      category: 'pre-exam'
    })
    setEditingTemplate(null)
    setShowTemplateModal(false)
  }

  const resetItemForm = () => {
    setItemFormData({
      title: '',
      description: '',
      priority: 'medium',
      estimated_time_minutes: 5,
      responsible_role: 'any',
      notes: ''
    })
    setEditingItem(null)
    setShowItemModal(false)
  }

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = priorities.find(p => p.value === priority)
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${
        priorityConfig?.color || 'bg-gray-500'
      }`}>
        {priorityConfig?.label || priority}
      </span>
    )
  }

  const getInstanceProgress = (instance: ChecklistInstance) => {
    if (!instance.items || instance.items.length === 0) return 0
    const completed = instance.items.filter(item => item.is_completed).length
    return Math.round((completed / instance.items.length) * 100)
  }

  const getTemplateStats = () => {
    const preExamTemplates = templates.filter(t => t.category === 'pre-exam').length
    const postExamTemplates = templates.filter(t => t.category === 'post-exam').length
    const activeTemplates = templates.filter(t => t.is_active).length
    const totalItems = templates.reduce((acc, template) => acc + (template.items?.length || 0), 0)

    return { preExamTemplates, postExamTemplates, activeTemplates, totalItems }
  }

  const getInstanceStats = () => {
    const today = new Date().toISOString().split('T')[0]
    const todayInstances = instances.filter(i => i.exam_date === today).length
    const completedInstances = instances.filter(i => i.completed_at).length
    const preExamInstances = instances.filter(i => i.category === 'pre-exam').length
    const postExamInstances = instances.filter(i => i.category === 'post-exam').length

    return { todayInstances, completedInstances, preExamInstances, postExamInstances }
  }

  const templateStats = getTemplateStats()
  const instanceStats = getInstanceStats()

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = filterCategory === 'all' || template.category === filterCategory
    return matchesSearch && matchesCategory
  })

  const filteredInstances = instances.filter(instance => {
    const matchesSearch = instance.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = filterCategory === 'all' || instance.category === filterCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <CheckCircle className="mr-3 h-6 w-6 text-green-500" />
            Checklist Management
            {/* Role Badge */}
            {profile && (
              <span className={`ml-4 px-3 py-1 text-xs font-semibold rounded-full ${isSuperAdmin 
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
          <p className="text-gray-600 mt-1">
            Manage exam checklists and track completion
            {!canManageTemplates && (
              <span className="text-amber-600 ml-2 text-sm">• View-only access</span>
            )}
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
            activeTab === 'templates'
              ? 'fets-orange-card'
              : 'golden-card text-gray-700 hover:bg-gray-50'
          }`}
        >
          Templates ({templates.length})
        </button>
        <button
          onClick={() => setActiveTab('instances')}
          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
            activeTab === 'instances'
              ? 'fets-sage-card'
              : 'golden-card text-gray-700 hover:bg-gray-50'
          }`}
        >
          Daily Checklists ({instances.length})
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {activeTab === 'templates' ? (
          <>
            <div className="fets-orange-card p-4 rounded-lg">
              <div className="text-2xl font-bold">{templateStats.activeTemplates}</div>
              <div className="text-sm opacity-90">Active Templates</div>
            </div>
            <div className="fets-sage-card p-4 rounded-lg">
              <div className="text-2xl font-bold">{templateStats.preExamTemplates}</div>
              <div className="text-sm opacity-90">Pre-Exam</div>
            </div>
            <div className="fets-teal-card p-4 rounded-lg">
              <div className="text-2xl font-bold">{templateStats.postExamTemplates}</div>
              <div className="text-sm opacity-90">Post-Exam</div>
            </div>
            <div className="golden-card p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{templateStats.totalItems}</div>
              <div className="text-sm text-gray-600">Total Items</div>
            </div>
          </>
        ) : (
          <>
            <div className="fets-sage-card p-4 rounded-lg">
              <div className="text-2xl font-bold">{instanceStats.todayInstances}</div>
              <div className="text-sm opacity-90">Today's Lists</div>
            </div>
            <div className="fets-orange-card p-4 rounded-lg">
              <div className="text-2xl font-bold">{instanceStats.preExamInstances}</div>
              <div className="text-sm opacity-90">Pre-Exam</div>
            </div>
            <div className="fets-teal-card p-4 rounded-lg">
              <div className="text-2xl font-bold">{instanceStats.postExamInstances}</div>
              <div className="text-sm opacity-90">Post-Exam</div>
            </div>
            <div className="golden-card p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{instanceStats.completedInstances}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
          </>
        )}
      </div>

      {/* Action Button and Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
        <button
          onClick={() => activeTab === 'templates' && canManageTemplates ? setShowTemplateModal(true) : null}
          disabled={activeTab !== 'templates' || !canManageTemplates}
          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center ${
            activeTab === 'templates' && canManageTemplates
              ? 'fets-orange-card'
              : 'golden-card text-gray-500 cursor-not-allowed opacity-50'
          }`}
        >
          <Plus className="mr-2 h-4 w-4" />
          {activeTab === 'templates' 
            ? (canManageTemplates ? 'Create Template' : 'Super Admin Required') 
            : 'Select Templates Tab'
          }
        </button>

        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="all">All Categories</option>
            <option value="pre-exam">Pre-Exam</option>
            <option value="post-exam">Post-Exam</option>
          </select>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 flex items-center">
          <CheckCircle className="h-4 w-4 mr-2" />
          {success}
          <button 
            onClick={() => setSuccess('')}
            className="ml-auto text-green-600 hover:text-green-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center">
          <AlertTriangle className="h-4 w-4 mr-2" />
          {error}
          <button 
            onClick={() => setError('')}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading checklists...</p>
        </div>
      ) : activeTab === 'templates' ? (
        /* Templates Tab */
        <div className="space-y-4">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <div className="relative">
                <FileText className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                  <Plus className="w-4 h-4 text-orange-600" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Templates Found</h3>
              <p className="text-gray-500 mb-6">
                {canManageTemplates 
                  ? "Create your first checklist template to get started"
                  : "No templates are available yet. Contact a Super Admin to create templates."
                }
              </p>
              {canManageTemplates && (
                <button
                  onClick={() => setShowTemplateModal(true)}
                  className="fets-orange-card px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:scale-105 shadow-lg"
                >
                  <Plus className="inline mr-2 h-5 w-5" />
                  Create Your First Template
                </button>
              )}
              {!canManageTemplates && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 max-w-md mx-auto">
                  <p className="text-amber-800 text-sm flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Super Admin access required to create templates
                  </p>
                </div>
              )}
            </div>
          ) : (
            filteredTemplates.map((template) => (
              <div key={template.id} className={`relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${
                template.is_active 
                  ? 'golden-card p-6 border-l-4 border-orange-400 shadow-lg' 
                  : 'bg-gray-50 p-6 border-l-4 border-gray-300 opacity-75'
              }`}>
                {/* Active indicator */}
                {template.is_active && (
                  <div className="absolute top-4 right-4">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                )}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                      <span className={`ml-3 px-2 py-1 text-xs rounded-full ${
                        template.category === 'pre-exam' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {template.category.replace('-', ' ').toUpperCase()}
                      </span>
                      {!template.is_active && (
                        <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                          INACTIVE
                        </span>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-gray-600 text-sm mb-3">{template.description}</p>
                    )}
                    <div className="flex items-center text-sm text-gray-500 space-x-4">
                      <span>{template.items?.length || 0} items</span>
                      <span>Created {new Date(template.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleCreateInstance(template)}
                      disabled={!template.is_active || submitting || !canCreateInstances}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center ${
                        template.is_active && canCreateInstances
                          ? 'fets-sage-card'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                      title={!canCreateInstances ? 'Admin access required' : 'Create daily checklist'}
                    >
                      <PlayCircle className="mr-1 h-4 w-4" />
                      Use Today
                    </button>
                    {canManageTemplates && (
                      <button
                        onClick={() => {
                          setSelectedTemplate(template)
                          setShowItemModal(true)
                        }}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Add Item"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    )}
                    {canManageTemplates && (
                      <button
                        onClick={() => {
                          setEditingTemplate(template)
                          setTemplateFormData({
                            name: template.name,
                            description: template.description || '',
                            category: template.category
                          })
                          setShowTemplateModal(true)
                        }}
                        className="p-2 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        title="Edit Template"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    )}
                    {canManageTemplates && (
                      <button
                        onClick={() => handleDeleteTemplate(template)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Template"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    {!canManageTemplates && (
                      <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded">
                        View Only
                      </span>
                    )}
                  </div>
                </div>

                {/* Template Items */}
                {template.items && template.items.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Checklist Items ({template.items.length})</h4>
                    <div className="space-y-2">
                      {template.items.map((item, index) => (
                        <div key={item.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center text-gray-400 mr-3">
                            <span className="text-xs font-medium w-6">{index + 1}.</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center mb-1">
                              <span className="font-medium text-gray-900">{item.title}</span>
                              {getPriorityBadge(item.priority)}
                              <span className="ml-2 text-xs text-gray-500">
                                ~{item.estimated_time_minutes}min
                              </span>
                            </div>
                            {item.description && (
                              <p className="text-sm text-gray-600">{item.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        /* Instances Tab */
        <div className="space-y-4">
          {filteredInstances.length === 0 ? (
            <div className="text-center py-12">
              <div className="relative">
                <CheckSquare className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center">
                  <PlayCircle className="w-4 h-4 text-teal-600" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Daily Checklists Found</h3>
              <p className="text-gray-500 mb-6">
                {canCreateInstances
                  ? "Create checklist instances from templates to start tracking daily tasks"
                  : "No checklist instances are available. Contact an Admin to create daily checklists."
                }
              </p>
              {canCreateInstances && templates.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-lg mx-auto">
                  <p className="text-blue-800 text-sm mb-4 flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Switch to Templates tab and click \"Use Today\" to create your first daily checklist
                  </p>
                  <button
                    onClick={() => setActiveTab('templates')}
                    className="fets-sage-card px-4 py-2 rounded-lg text-sm font-medium"
                  >
                    Go to Templates
                  </button>
                </div>
              )}
              {!canCreateInstances && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 max-w-md mx-auto">
                  <p className="text-amber-800 text-sm flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Admin access required to create daily checklists
                  </p>
                </div>
              )}
            </div>
          ) : (
            filteredInstances.map((instance) => {
              const progress = getInstanceProgress(instance)
              const isCompleted = progress === 100
              
              return (
                <div key={instance.id} className={`relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${
                  isCompleted 
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 p-6 border-l-4 border-green-500 shadow-lg'
                    : progress > 50
                    ? 'golden-card p-6 border-l-4 border-orange-400 shadow-lg'
                    : 'bg-white p-6 border-l-4 border-gray-300 shadow-md'
                }`}>
                  {/* Completion indicator */}
                  {isCompleted && (
                    <div className="absolute top-4 right-4">
                      <div className="flex items-center space-x-1">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                  )}
                  {!isCompleted && progress > 0 && (
                    <div className="absolute top-4 right-4">
                      <div className="relative w-8 h-8">
                        <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 32 32">
                          <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="4" fill="none" className="text-gray-200"/>
                          <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="4" fill="none" strokeDasharray={`${2 * Math.PI * 14}`} strokeDashoffset={`${2 * Math.PI * 14 * (1 - progress / 100)}`} className="text-orange-500 transition-all duration-500"/>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-600">{progress}%</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{instance.name}</h3>
                        <span className={`ml-3 px-2 py-1 text-xs rounded-full ${
                          instance.category === 'pre-exam' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {instance.category.replace('-', ' ').toUpperCase()}
                        </span>
                        {isCompleted && (
                          <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            COMPLETED
                          </span>
                        )}
                      </div>
                      <div className="flex items-center text-sm text-gray-500 space-x-4 mb-3">
                        <span>Exam Date: {new Date(instance.exam_date).toLocaleDateString()}</span>
                        <span>{instance.items?.length || 0} items</span>
                        <span>{progress}% complete</span>
                      </div>
                      
                      {/* Enhanced Progress Bar */}
                      <div className="w-full bg-gray-200 rounded-full h-3 mb-3 overflow-hidden shadow-inner">
                        <div className="relative h-full">
                          <div 
                            className={`h-full rounded-full transition-all duration-700 ease-out ${
                              progress === 100 
                                ? 'bg-gradient-to-r from-green-400 to-emerald-500 shadow-lg' 
                                : progress > 75
                                ? 'bg-gradient-to-r from-blue-400 to-blue-500'
                                : progress > 50
                                ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
                                : progress > 25
                                ? 'bg-gradient-to-r from-orange-400 to-red-400'
                                : 'bg-gradient-to-r from-red-400 to-red-500'
                            }`}
                            style={{ width: `${progress}%` }}
                          >
                            {progress > 0 && (
                              <div className="absolute right-0 top-0 h-full w-2 bg-white/30 rounded-full animate-pulse"></div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => setSelectedInstance(instance)}
                        className="fets-teal-card px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center"
                      >
                        <Eye className="mr-1 h-4 w-4" />
                        {selectedInstance?.id === instance.id ? 'Hide' : 'View'}
                      </button>
                      {canDeleteInstances && (
                        <button
                          onClick={() => handleDeleteInstance(instance)}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Instance"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                      {!canDeleteInstances && (
                        <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded">
                          Admin Required
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Instance Items - Show when selected */}
                  {selectedInstance?.id === instance.id && instance.items && instance.items.length > 0 && (
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Checklist Items</h4>
                      <div className="space-y-2">
                        {instance.items.map((item) => (
                          <div key={item.id} className={`group flex items-center p-4 rounded-xl border-2 transition-all duration-300 hover:scale-[1.02] ${
                            item.is_completed 
                              ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-md transform' 
                              : 'bg-white border-gray-200 hover:border-orange-300 hover:shadow-md'
                          }`}>
                            <button
                              onClick={() => handleToggleItem(item)}
                              className={`mr-4 p-2 rounded-lg transition-all duration-200 transform hover:scale-110 ${
                                item.is_completed 
                                  ? 'text-green-600 bg-green-100 hover:bg-green-200 shadow-sm' 
                                  : 'text-gray-400 hover:text-orange-600 hover:bg-orange-50'
                              }`}
                            >
                              {item.is_completed ? (
                                <CheckSquare className="h-6 w-6" />
                              ) : (
                                <Square className="h-6 w-6" />
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center mb-2">
                                <span className={`font-semibold text-lg transition-all duration-300 ${
                                  item.is_completed 
                                    ? 'text-green-800 line-through opacity-75' 
                                    : 'text-gray-900 group-hover:text-orange-700'
                                }`}>
                                  {item.title}
                                </span>
                                <div className="flex items-center ml-3 space-x-2">
                                  {getPriorityBadge(item.priority)}
                                  <span className={`text-sm px-2 py-1 rounded-full ${
                                    item.is_completed
                                      ? 'text-green-600 bg-green-100'
                                      : 'text-gray-600 bg-gray-100'
                                  }`}>
                                    ~{item.estimated_time_minutes}min
                                  </span>
                                </div>
                              </div>
                              {item.description && (
                                <p className={`text-sm transition-all duration-300 ${
                                  item.is_completed 
                                    ? 'text-green-600 italic' 
                                    : 'text-gray-600 group-hover:text-gray-800'
                                }`}>
                                  {item.description}
                                </p>
                              )}
                              {item.completed_at && (
                                <div className="mt-2 flex items-center">
                                  <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                                  <p className="text-xs text-green-600 font-medium">
                                    Completed: {new Date(item.completed_at).toLocaleString()}
                                  </p>
                                </div>
                              )}
                            </div>
                            {/* Item status indicator */}
                            <div className={`w-3 h-3 rounded-full ml-4 transition-all duration-300 ${
                              item.is_completed 
                                ? 'bg-green-500 shadow-lg animate-pulse' 
                                : 'bg-gray-300 group-hover:bg-orange-400'
                            }`}></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingTemplate ? 'Edit Template' : 'Create New Template'}
                </h2>
                <button
                  onClick={resetTemplateForm}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleCreateTemplate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    value={templateFormData.name}
                    onChange={(e) => setTemplateFormData({...templateFormData, name: e.target.value})}
                    required
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Enter template name..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={templateFormData.description}
                    onChange={(e) => setTemplateFormData({...templateFormData, description: e.target.value})}
                    rows={3}
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Describe the template purpose..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={templateFormData.category}
                    onChange={(e) => setTemplateFormData({...templateFormData, category: e.target.value as any})}
                    required
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="pre-exam">Pre-Exam</option>
                    <option value="post-exam">Post-Exam</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-4 mt-6">
                  <button
                    type="button"
                    onClick={resetTemplateForm}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="fets-orange-card px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : (editingTemplate ? 'Update' : 'Create')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Item Modal */}
      {showItemModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingItem ? 'Edit Item' : 'Add Item to Template'}
                </h2>
                <button
                  onClick={resetItemForm}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  Adding to: <strong>{selectedTemplate.name}</strong> ({selectedTemplate.category})
                </p>
              </div>

              <form onSubmit={handleAddItem} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item Title *
                  </label>
                  <input
                    type="text"
                    value={itemFormData.title}
                    onChange={(e) => setItemFormData({...itemFormData, title: e.target.value})}
                    required
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Enter item title..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={itemFormData.description}
                    onChange={(e) => setItemFormData({...itemFormData, description: e.target.value})}
                    rows={2}
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Describe what needs to be done..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    <select
                      value={itemFormData.priority}
                      onChange={(e) => setItemFormData({...itemFormData, priority: e.target.value as any})}
                      className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                      {priorities.map(priority => (
                        <option key={priority.value} value={priority.value}>{priority.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Time (minutes)
                    </label>
                    <input
                      type="number"
                      value={itemFormData.estimated_time_minutes}
                      onChange={(e) => setItemFormData({...itemFormData, estimated_time_minutes: parseInt(e.target.value) || 5})}
                      min={1}
                      max={120}
                      className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Responsible Role
                  </label>
                  <select
                    value={itemFormData.responsible_role}
                    onChange={(e) => setItemFormData({...itemFormData, responsible_role: e.target.value})}
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    {roles.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={itemFormData.notes}
                    onChange={(e) => setItemFormData({...itemFormData, notes: e.target.value})}
                    rows={2}
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Additional instructions or notes..."
                  />
                </div>

                <div className="flex justify-end space-x-4 mt-6">
                  <button
                    type="button"
                    onClick={resetItemForm}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="fets-orange-card px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : (editingItem ? 'Update' : 'Add Item')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
