import { useState, useEffect } from 'react'
import { 
  Vault, 
  Plus, 
  Search, 
  FileText, 
  Eye, 
  Edit, 
  Lock, 
  Trash2,
  X,
  Tag,
  Calendar,
  CheckCircle,
  AlertCircle,
  Settings,
  Shield,
  Key,
  FolderPlus
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface VaultItem {
  id: string
  title: string
  description?: string
  content?: string
  category: string
  category_id?: string
  type: 'document' | 'procedure' | 'manual' | 'template' | 'policy' | 'training' | 'emergency' | 'knowledge'
  file_url?: string
  file_size?: string
  mime_type?: string
  is_confidential: boolean
  tags?: string[]
  author_id: string
  created_at: string
  updated_at: string
  is_deleted: boolean
  author?: {
    full_name: string
  }
}

interface VaultCategory {
  id: string
  name: string
  description: string
  color: string
  icon: string
  display_order: number
  created_by: string
  created_at: string
  updated_at: string
}

interface VaultFormData {
  title: string
  description: string
  content: string
  category_id: string
  type: 'document' | 'procedure' | 'manual' | 'template' | 'policy' | 'training' | 'emergency' | 'knowledge'
  is_confidential: boolean
  tags: string
}

interface CategoryFormData {
  name: string
  description: string
  color: string
  icon: string
  display_order: number
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

function PasswordVerificationModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  itemTitle 
}: {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  itemTitle: string
}) {
  const [password, setPassword] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const { user } = useAuth()

  const handleVerifyPassword = async () => {
    if (!password.trim() || !user) return

    setVerifying(true)
    setError('')

    try {
      // Attempt to sign in with current email and provided password
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email || '',
        password: password
      })

      if (error) {
        setError('Incorrect password. Please try again.')
      } else {
        onSuccess()
        setPassword('')
        onClose()
      }
    } catch (err: any) {
      setError('Password verification failed. Please try again.')
    } finally {
      setVerifying(false)
    }
  }

  const handleClose = () => {
    setPassword('')
    setError('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="modern-card p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900 flex items-center">
            <Shield className="h-6 w-6 mr-2 text-red-600" />
            Confidential Access
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800">
              <strong>"{itemTitle}"</strong> requires password verification for access.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter your current password:
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="password"
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white text-gray-900"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleVerifyPassword()}
                disabled={verifying}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end space-x-4 mt-6">
          <button
            onClick={handleClose}
            className="btn-tertiary-modern"
            disabled={verifying}
          >
            Cancel
          </button>
          <button
            onClick={handleVerifyPassword}
            className="btn-primary-modern flex items-center"
            disabled={!password.trim() || verifying}
          >
            {verifying ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Verifying...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Verify & Access
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export function FetsVault() {
  const { user } = useAuth()
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([])
  const [categories, setCategories] = useState<VaultCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [editingItem, setEditingItem] = useState<VaultItem | null>(null)
  const [editingCategory, setEditingCategory] = useState<VaultCategory | null>(null)
  const [pendingConfidentialItem, setPendingConfidentialItem] = useState<VaultItem | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null)
  const [showViewer, setShowViewer] = useState(false)
  const [formData, setFormData] = useState<VaultFormData>({
    title: '',
    description: '',
    content: '',
    category_id: '',
    type: 'document',
    is_confidential: false,
    tags: ''
  })
  const [categoryFormData, setCategoryFormData] = useState<CategoryFormData>({
    name: '',
    description: '',
    color: '#6B7280',
    icon: 'folder',
    display_order: 0
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const types: VaultFormData['type'][] = [
    'document',
    'procedure', 
    'manual',
    'template',
    'policy',
    'training',
    'emergency',
    'knowledge'
  ]

  useEffect(() => {
    loadVaultData()
  }, [])

  const loadVaultData = async () => {
    try {
      setLoading(true)
      console.log('Loading vault data...')
      
      // Load categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('vault_categories')
        .select('*')
        .order('display_order', { ascending: true })

      if (categoriesError) {
        console.error('Error loading categories:', categoriesError)
      } else {
        setCategories(categoriesData || [])
      }

      // Load vault items
      const { data, error } = await supabase
        .from('vault')
        .select(`
          *,
          profiles:author_id (
            full_name
          )
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading vault items:', error)
        loadMockData()
      } else {
        const processedItems = (data || []).map(item => ({
          ...item,
          author: item.profiles
        }))
        setVaultItems(processedItems)
        console.log(`Loaded ${processedItems.length} vault items`)
      }

    } catch (error) {
      console.error('Error loading vault data:', error)
      loadMockData()
    } finally {
      setLoading(false)
    }
  }

  const loadMockData = () => {
    const mockItems: VaultItem[] = [
      {
        id: '1',
        title: 'Emergency Evacuation Procedures',
        description: 'Complete guide for emergency evacuation protocols',
        content: 'In case of emergency evacuation:\n\n1. Remain calm and follow designated evacuation routes\n2. Assist candidates and staff to safety\n3. Report to designated assembly point\n4. Wait for further instructions from emergency coordinators\n\nDetailed procedures follow...',
        category: 'Emergency',
        category_id: '',
        type: 'emergency',
        file_size: '2.3 MB',
        is_confidential: true,
        tags: ['emergency', 'safety', 'evacuation'],
        author_id: user?.id || 'system',
        created_at: '2025-01-15T08:00:00Z',
        updated_at: '2025-08-15T10:00:00Z',
        is_deleted: false,
        author: {
          full_name: 'Safety Officer'
        }
      },
      {
        id: '2',
        title: 'System Backup Procedures',
        description: 'Step-by-step backup and recovery procedures',
        content: 'Daily backup procedures:\n\n1. Automated backups run at 2:00 AM daily\n2. Verify backup completion in system logs\n3. Test restore procedures monthly\n4. Document any issues or failures\n\nRecovery procedures:\n1. Assess data loss extent\n2. Identify most recent clean backup\n3. Follow restore checklist\n4. Verify data integrity post-restore',
        category: 'IT Operations',
        category_id: '',
        type: 'procedure',
        file_size: '1.8 MB',
        is_confidential: false,
        tags: ['backup', 'IT', 'procedure'],
        author_id: user?.id || 'system',
        created_at: '2025-02-01T09:00:00Z',
        updated_at: '2025-08-10T14:00:00Z',
        is_deleted: false,
        author: {
          full_name: 'IT Administrator'
        }
      },
      {
        id: '3',
        title: 'Test Administrator Training Manual',
        description: 'Comprehensive training guide for new test administrators',
        content: 'Welcome to FETS Point Training:\n\nModule 1: System Overview\n- Understanding the testing environment\n- Navigation and basic functions\n\nModule 2: Candidate Management\n- Check-in procedures\n- Accommodation handling\n- Incident reporting\n\nModule 3: Security Protocols\n- Maintaining test integrity\n- Handling security breaches\n- Documentation requirements',
        category: 'Training',
        category_id: '',
        type: 'training',
        file_size: '5.2 MB',
        is_confidential: false,
        tags: ['training', 'manual', 'administrator'],
        author_id: user?.id || 'system',
        created_at: '2025-03-10T11:00:00Z',
        updated_at: '2025-07-20T16:00:00Z',
        is_deleted: false,
        author: {
          full_name: 'Training Department'
        }
      }
    ]
    setVaultItems(mockItems)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const itemData = {
        title: formData.title,
        description: formData.description || null,
        content: formData.content || null,
        category_id: formData.category_id,
        type: formData.type,
        is_confidential: formData.is_confidential,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : null,
        author_id: user.id
      }

      if (editingItem) {
        // Update existing item
        const { data, error } = await supabase
          .from('vault')
          .update(itemData)
          .eq('id', editingItem.id)
          .select(`
            *,
            profiles:author_id (
              full_name
            )
          `)
          .single()

        if (error) throw error

        setVaultItems(vaultItems.map(item => 
          item.id === editingItem.id ? { ...data, author: data.profiles } : item
        ))
        setSuccess('Item updated successfully!')
      } else {
        // Create new item
        const { data, error } = await supabase
          .from('vault')
          .insert(itemData)
          .select(`
            *,
            profiles:author_id (
              full_name
            )
          `)
          .single()

        if (error) throw error

        setVaultItems([{ ...data, author: data.profiles }, ...vaultItems])
        setSuccess('Item created successfully!')
      }

      setFormData({
        title: '',
        description: '',
        content: '',
        category_id: '',
        type: 'document',
        is_confidential: false,
        tags: ''
      })
      setEditingItem(null)
      setShowModal(false)
    } catch (error: any) {
      console.error('Error saving vault item:', error)
      setError(error.message || 'An error occurred while saving the item')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const categoryData = {
        ...categoryFormData,
        created_by: user.id
      }

      if (editingCategory) {
        // Update existing category
        const { data, error } = await supabase
          .from('vault_categories')
          .update(categoryData)
          .eq('id', editingCategory.id)
          .select()
          .single()

        if (error) throw error

        setCategories(categories.map(cat => 
          cat.id === editingCategory.id ? data : cat
        ))
        setSuccess('Category updated successfully!')
      } else {
        // Create new category
        const { data, error } = await supabase
          .from('vault_categories')
          .insert(categoryData)
          .select()
          .single()

        if (error) throw error

        setCategories([...categories, data].sort((a, b) => a.display_order - b.display_order))
        setSuccess('Category created successfully!')
      }

      setCategoryFormData({
        name: '',
        description: '',
        color: '#6B7280',
        icon: 'folder',
        display_order: 0
      })
      setEditingCategory(null)
      setShowCategoryModal(false)
    } catch (error: any) {
      console.error('Error saving category:', error)
      setError(error.message || 'An error occurred while saving the category')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return

    try {
      const { error } = await supabase
        .from('vault')
        .update({ is_deleted: true })
        .eq('id', itemId)

      if (error) throw error

      setVaultItems(vaultItems.filter(item => item.id !== itemId))
      setSuccess('Item deleted successfully!')
    } catch (error: any) {
      console.error('Error deleting vault item:', error)
      setError(error.message || 'An error occurred while deleting the item')
    }
  }

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    const itemsInCategory = vaultItems.filter(item => item.category_id === categoryId)
    if (itemsInCategory.length > 0) {
      setError(`Cannot delete category "${categoryName}" because it contains ${itemsInCategory.length} items. Please move or delete the items first.`)
      return
    }

    if (!window.confirm(`Are you sure you want to delete the category "${categoryName}"?`)) return

    try {
      const { error } = await supabase
        .from('vault_categories')
        .delete()
        .eq('id', categoryId)

      if (error) throw error

      setCategories(categories.filter(cat => cat.id !== categoryId))
      setSuccess('Category deleted successfully!')
    } catch (error: any) {
      console.error('Error deleting category:', error)
      setError(error.message || 'An error occurred while deleting the category')
    }
  }

  const handleEditItem = (item: VaultItem) => {
    setEditingItem(item)
    setFormData({
      title: item.title,
      description: item.description || '',
      content: item.content || '',
      category_id: item.category_id || '',
      type: item.type,
      is_confidential: item.is_confidential,
      tags: item.tags?.join(', ') || ''
    })
    setShowModal(true)
  }

  const handleEditCategory = (category: VaultCategory) => {
    setEditingCategory(category)
    setCategoryFormData({
      name: category.name,
      description: category.description,
      color: category.color,
      icon: category.icon,
      display_order: category.display_order
    })
    setShowCategoryModal(true)
  }

  const handleViewItem = (item: VaultItem) => {
    if (item.is_confidential) {
      setPendingConfidentialItem(item)
      setShowPasswordModal(true)
    } else {
      setSelectedItem(item)
      setShowViewer(true)
    }
  }

  const handlePasswordVerified = () => {
    if (pendingConfidentialItem) {
      setSelectedItem(pendingConfidentialItem)
      setShowViewer(true)
      setPendingConfidentialItem(null)
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'procedure': return 'text-blue-600 bg-blue-50 border border-blue-200'
      case 'manual': return 'text-green-600 bg-green-50 border border-green-200'
      case 'template': return 'text-purple-600 bg-purple-50 border border-purple-200'
      case 'policy': return 'text-red-600 bg-red-50 border border-red-200'
      case 'training': return 'text-yellow-600 bg-yellow-50 border border-yellow-200'
      case 'emergency': return 'text-red-600 bg-red-50 border border-red-200'
      case 'knowledge': return 'text-indigo-600 bg-indigo-50 border border-indigo-200'
      default: return 'text-gray-600 bg-gray-50 border border-gray-200'
    }
  }

  const filteredItems = vaultItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.content?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = filterCategory === 'all' || item.category_id === filterCategory
    const matchesType = filterType === 'all' || item.type === filterType
    return matchesSearch && matchesCategory && matchesType
  })

  // Group items by category
  const itemsByCategory = categories.reduce((acc, category) => {
    acc[category.id] = filteredItems.filter(item => item.category_id === category.id)
    return acc
  }, {} as Record<string, VaultItem[]>)

  // Add uncategorized items
  const uncategorizedItems = filteredItems.filter(item => !item.category_id)
  if (uncategorizedItems.length > 0) {
    itemsByCategory['uncategorized'] = uncategorizedItems
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="dashboard-modern flex-1 p-4 sm:p-6 overflow-auto">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading Resource Center...</p>
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
                <Vault className="h-8 w-8 mr-3" />
                Resource Center
              </h1>
              <p className="text-white/90 text-lg">
                Secure document repository and knowledge base for organizational resources
              </p>
              <div className="flex items-center justify-center sm:justify-start mt-3 text-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                <span className="text-white/80">{vaultItems.length} resources available</span>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  setEditingItem(null)
                  setFormData({
                    title: '',
                    description: '',
                    content: '',
                    category_id: '',
                    type: 'document',
                    is_confidential: false,
                    tags: ''
                  })
                  setShowModal(true)
                }}
                className="btn-tertiary-modern bg-white text-gray-900 hover:bg-white/90 flex items-center justify-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Resource
              </button>
              <button
                onClick={() => {
                  setEditingCategory(null)
                  setCategoryFormData({
                    name: '',
                    description: '',
                    color: '#6B7280',
                    icon: 'folder',
                    display_order: categories.length
                  })
                  setShowCategoryModal(true)
                }}
                className="btn-tertiary-modern bg-white/20 text-white border-white/30 hover:bg-white/30 flex items-center justify-center"
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                Manage Categories
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Statistics Overview */}
      <div className="dashboard-section">
        <h2 className="section-title">Resource Overview</h2>
        <div className="grid-responsive grid-4">
          <ModernStatsCard
            title="Total Resources"
            value={vaultItems.length}
            subtitle={vaultItems.length > 0 ? `${vaultItems.length} resources available` : 'No resources yet'}
            icon={FileText}
            status="primary"
          />
          <ModernStatsCard
            title="Categories"
            value={categories.length}
            subtitle={`${categories.length} different categories`}
            icon={Tag}
            status="warning"
          />
          <ModernStatsCard
            title="Confidential"
            value={vaultItems.filter(i => i.is_confidential).length}
            subtitle={`${vaultItems.filter(i => i.is_confidential).length} restricted access`}
            icon={Lock}
            status="neutral"
          />
          <ModernStatsCard
            title="Recent Updates"
            value={vaultItems.filter(i => {
              const weekAgo = new Date()
              weekAgo.setDate(weekAgo.getDate() - 7)
              return new Date(i.updated_at) > weekAgo
            }).length}
            subtitle="Updated this week"
            icon={Calendar}
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
                placeholder="Search resources..."
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <select
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white text-gray-900"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            
            <select
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white text-gray-900"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">All Types</option>
              {types.map(type => (
                <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
              ))}
            </select>

            <div className="flex items-center justify-center bg-gray-50 rounded-lg px-4 py-3">
              <FileText className="h-4 w-4 mr-2 text-gray-500" />
              <span className="text-sm text-gray-600">
                {filteredItems.length} of {vaultItems.length} resources
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="text-green-700">{success}</span>
          <button onClick={() => setSuccess('')} className="ml-auto text-green-600 hover:text-green-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span className="text-red-700">{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-red-600 hover:text-red-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Category-Wise Resource Display */}
      <div className="dashboard-section">
        <div className="space-y-8">
          {Object.entries(itemsByCategory).map(([categoryId, items]) => {
            if (items.length === 0) return null

            const category = categoryId === 'uncategorized' 
              ? { name: 'Uncategorized', color: '#6B7280' } as VaultCategory
              : categories.find(cat => cat.id === categoryId)

            if (!category) return null

            return (
              <div key={categoryId} className="space-y-4">
                {/* Category Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.color }}
                    ></div>
                    <h2 className="text-2xl font-bold text-gray-900">{category.name}</h2>
                    <span className="text-sm text-gray-500">({items.length} resources)</span>
                  </div>
                  {categoryId !== 'uncategorized' && (
                    <button
                      onClick={() => handleEditCategory(category)}
                      className="text-gray-400 hover:text-gray-600 transition-colors p-2"
                      title="Edit category"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Resource Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {items.map((item) => (
                    <div key={item.id} className="modern-card p-6">
                      {/* Item Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                            {item.title}
                            {item.is_confidential && (
                              <Lock className="h-4 w-4 text-red-600 ml-2" />
                            )}
                          </h3>
                          <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
                        </div>
                      </div>

                      {/* Item Meta */}
                      <div className="flex items-center space-x-2 mb-4">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${getTypeColor(item.type)}`}>
                          {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                        </span>
                        {item.is_confidential && (
                          <span className="px-3 py-1 text-xs font-medium rounded-full text-red-600 bg-red-50 border border-red-200">
                            Confidential
                          </span>
                        )}
                      </div>

                      {/* Item Details */}
                      <div className="text-xs text-gray-500 space-y-1 mb-4">
                        <p>Created: {formatDate(item.created_at)}</p>
                        <p>Author: {item.author?.full_name || 'Unknown'}</p>
                        {item.file_size && <p>Size: {item.file_size}</p>}
                      </div>

                      {/* Item Tags */}
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {item.tags.slice(0, 3).map((tag, index) => (
                            <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                              {tag}
                            </span>
                          ))}
                          {item.tags.length > 3 && (
                            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                              +{item.tags.length - 3} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Item Actions */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <button
                          onClick={() => handleViewItem(item)}
                          className="flex items-center space-x-1 px-3 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors"
                        >
                          {item.is_confidential ? (
                            <><Shield className="h-4 w-4" /><span>Secure View</span></>
                          ) : (
                            <><Eye className="h-4 w-4" /><span>View</span></>
                          )}
                        </button>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditItem(item)}
                            className="flex items-center space-x-1 px-3 py-2 text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="flex items-center space-x-1 px-3 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {filteredItems.length === 0 && (
            <div className="modern-card p-12 text-center">
              <Vault className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No resources found</h3>
              <p className="text-gray-500 mb-6">
                {vaultItems.length === 0 
                  ? "Start building your knowledge base by adding your first resource."
                  : "Try adjusting your search or filter criteria."
                }
              </p>
              {vaultItems.length === 0 && (
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => {
                      setEditingItem(null)
                      setFormData({
                        title: '',
                        description: '',
                        content: '',
                        category_id: '',
                        type: 'document',
                        is_confidential: false,
                        tags: ''
                      })
                      setShowModal(true)
                    }}
                    className="btn-primary-modern"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Resource
                  </button>
                  <button
                    onClick={() => {
                      setEditingCategory(null)
                      setCategoryFormData({
                        name: '',
                        description: '',
                        color: '#6B7280',
                        icon: 'folder',
                        display_order: 0
                      })
                      setShowCategoryModal(true)
                    }}
                    className="btn-secondary-modern"
                  >
                    <FolderPlus className="h-4 w-4 mr-2" />
                    Create Category
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Password Verification Modal */}
      <PasswordVerificationModal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false)
          setPendingConfidentialItem(null)
        }}
        onSuccess={handlePasswordVerified}
        itemTitle={pendingConfidentialItem?.title || ''}
      />

      {/* Resource Modal (Create/Edit) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="modern-card p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editingItem ? 'Edit Resource' : 'Add New Resource'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white text-gray-900"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                  <select
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white text-gray-900"
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <select
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white text-gray-900"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as VaultFormData['type'] })}
                  >
                    {types.map(type => (
                      <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white text-gray-900"
                    placeholder="tag1, tag2, tag3"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white text-gray-900"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                <textarea
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white text-gray-900 h-32 resize-none"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                />
              </div>
              
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="confidential"
                  checked={formData.is_confidential}
                  onChange={(e) => setFormData({ ...formData, is_confidential: e.target.checked })}
                  className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500"
                />
                <label htmlFor="confidential" className="text-sm font-medium text-gray-700 flex items-center">
                  <Lock className="h-4 w-4 mr-1 text-red-600" />
                  Confidential (requires password verification)
                </label>
              </div>
            </form>
            
            <div className="flex items-center justify-end space-x-4 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="btn-tertiary-modern"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="btn-primary-modern"
                disabled={!formData.title.trim() || !formData.category_id || submitting}
              >
                {submitting ? 'Saving...' : editingItem ? 'Update Resource' : 'Add Resource'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal (Create/Edit) */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="modern-card p-6 w-full max-w-2xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </h2>
            
            <form onSubmit={handleCategorySubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category Name *</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white text-gray-900"
                    value={categoryFormData.name}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Display Order</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white text-gray-900"
                    value={categoryFormData.display_order}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, display_order: parseInt(e.target.value) || 0 })}
                    min={0}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white text-gray-900"
                  value={categoryFormData.description}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      className="w-12 h-12 border border-gray-200 rounded-lg"
                      value={categoryFormData.color}
                      onChange={(e) => setCategoryFormData({ ...categoryFormData, color: e.target.value })}
                    />
                    <input
                      type="text"
                      className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white text-gray-900"
                      value={categoryFormData.color}
                      onChange={(e) => setCategoryFormData({ ...categoryFormData, color: e.target.value })}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white text-gray-900"
                    placeholder="folder"
                    value={categoryFormData.icon}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, icon: e.target.value })}
                  />
                </div>
              </div>
            </form>
            
            <div className="flex items-center justify-between mt-6">
              <div>
                {editingCategory && (
                  <button
                    onClick={() => handleDeleteCategory(editingCategory.id, editingCategory.name)}
                    className="flex items-center space-x-1 px-3 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors"
                    disabled={submitting}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete Category</span>
                  </button>
                )}
              </div>
              
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowCategoryModal(false)}
                  className="btn-tertiary-modern"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCategorySubmit}
                  className="btn-primary-modern"
                  disabled={!categoryFormData.name.trim() || submitting}
                >
                  {submitting ? 'Saving...' : editingCategory ? 'Update Category' : 'Add Category'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resource Viewer Modal */}
      {showViewer && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="modern-card p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                {selectedItem.title}
                {selectedItem.is_confidential && (
                  <Lock className="h-6 w-6 text-red-600 ml-3" />
                )}
              </h2>
              <button
                onClick={() => setShowViewer(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span className={`px-3 py-1 rounded-full ${getTypeColor(selectedItem.type)}`}>
                  {selectedItem.type.charAt(0).toUpperCase() + selectedItem.type.slice(1)}
                </span>
                <span>Created: {formatDate(selectedItem.created_at)}</span>
                <span>Author: {selectedItem.author?.full_name || 'Unknown'}</span>
              </div>
              
              {selectedItem.description && (
                <div className="p-4 bg-gray-50 rounded-lg border-l-4 border-yellow-400">
                  <p className="text-gray-700">{selectedItem.description}</p>
                </div>
              )}
              
              {selectedItem.content && (
                <div className="prose max-w-none">
                  <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                    {selectedItem.content}
                  </div>
                </div>
              )}
              
              {selectedItem.tags && selectedItem.tags.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Tags:</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedItem.tags.map((tag, index) => (
                      <span key={index} className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-end space-x-4 mt-6">
              <button
                onClick={() => setShowViewer(false)}
                className="btn-tertiary-modern"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowViewer(false)
                  handleEditItem(selectedItem)
                }}
                className="btn-primary-modern"
              >
                Edit Resource
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
