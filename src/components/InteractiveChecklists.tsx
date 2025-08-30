import { useState, useEffect } from 'react'
import { CheckSquare, Plus, Search, Filter, Check, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface ChecklistItem {
  id: string
  title: string
  description?: string
  completed: boolean
  dueDate?: Date
  priority: 'low' | 'medium' | 'high'
  category: string
}

interface Checklist {
  id: string
  name: string
  items: ChecklistItem[]
  completedCount: number
  totalCount: number
  lastUpdated: Date
}

export function InteractiveChecklists() {
  const { profile } = useAuth()
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [selectedChecklist, setSelectedChecklist] = useState<string | null>(null)
  const [showNewChecklistModal, setShowNewChecklistModal] = useState(false)
  const [showNewItemModal, setShowNewItemModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [newChecklist, setNewChecklist] = useState({ name: '', description: '' })
  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium' as const,
    category: 'general'
  })

  useEffect(() => {
    loadChecklists()
  }, [])

  const loadChecklists = async () => {
    try {
      console.log('Loading tasks from Supabase...')
      const { data: tasksData, error } = await supabase
        .from('user_tasks')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading tasks:', error)
        return
      }

      if (tasksData && tasksData.length > 0) {
        // Group tasks by priority to create checklists
        const groupedTasks = tasksData.reduce((acc, task) => {
          const priority = task.priority || 'medium'
          if (!acc[priority]) {
            acc[priority] = []
          }
          acc[priority].push({
            id: task.id,
            title: task.title,
            description: task.description,
            completed: task.status === 'completed',
            priority: task.priority,
            category: 'work',
            dueDate: task.due_date ? new Date(task.due_date) : undefined
          })
          return acc
        }, {} as Record<string, ChecklistItem[]>)

        const formattedChecklists: Checklist[] = Object.entries(groupedTasks).map(([priority, items]) => ({
          id: priority,
          name: `${priority.charAt(0).toUpperCase() + priority.slice(1)} Priority Tasks`,
          items: items as ChecklistItem[],
          completedCount: (items as ChecklistItem[]).filter(item => item.completed).length,
          totalCount: (items as ChecklistItem[]).length,
          lastUpdated: new Date()
        }))

        setChecklists(formattedChecklists)
        if (formattedChecklists.length > 0) {
          setSelectedChecklist(formattedChecklists[0].id)
        }
        console.log(`Loaded ${formattedChecklists.length} checklists with ${tasksData.length} total tasks`)
      } else {
        // Create a default empty checklist if no tasks exist
        const defaultChecklist: Checklist = {
          id: '1',
          name: 'Daily Tasks',
          items: [],
          completedCount: 0,
          totalCount: 0,
          lastUpdated: new Date()
        }
        setChecklists([defaultChecklist])
        setSelectedChecklist(defaultChecklist.id)
      }
    } catch (error) {
      console.error('Error loading checklists:', error)
    }
  }

  const handleToggleItem = async (checklistId: string, itemId: string) => {
    try {
      const currentItem = checklists
        .find(c => c.id === checklistId)?.items
        .find(item => item.id === itemId)
      
      if (!currentItem) return
      
      const newStatus = currentItem.completed ? 'pending' : 'completed'
      
      // Update in Supabase
      const { error } = await supabase
        .from('user_tasks')
        .update({ 
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', itemId)
      
      if (error) {
        console.error('Error updating task:', error)
        return
      }
      
      // Update local state
      setChecklists(checklists.map(checklist => {
        if (checklist.id === checklistId) {
          const updatedItems = checklist.items.map(item => {
            if (item.id === itemId) {
              return { ...item, completed: !item.completed }
            }
            return item
          })
          const completedCount = updatedItems.filter(item => item.completed).length
          return {
            ...checklist,
            items: updatedItems,
            completedCount,
            lastUpdated: new Date()
          }
        }
        return checklist
      }))
      
      console.log('Task status updated successfully!')
    } catch (error) {
      console.error('Error toggling item:', error)
    }
  }

  const handleCreateChecklist = async () => {
    try {
      const checklist: Checklist = {
        id: Date.now().toString(),
        name: newChecklist.name,
        items: [],
        completedCount: 0,
        totalCount: 0,
        lastUpdated: new Date()
      }
      
      setChecklists([...checklists, checklist])
      setNewChecklist({ name: '', description: '' })
      setShowNewChecklistModal(false)
    } catch (error) {
      console.error('Error creating checklist:', error)
    }
  }

  const handleAddItem = async () => {
    if (!selectedChecklist) return
    
    try {
      console.log('Creating new task...')
      const { data, error } = await supabase
        .from('user_tasks')
        .insert({
          title: newItem.title,
          description: newItem.description,
          priority: newItem.priority,
          status: 'pending',
          due_date: newItem.dueDate ? new Date(newItem.dueDate).toISOString() : null,
          assigned_to: profile?.user_id,
          assigned_by: profile?.user_id
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating task:', error)
        return
      }
      
      if (data) {
        console.log('Task created successfully!')
        // Reload checklists from database
        await loadChecklists()
        
        setNewItem({ title: '', description: '', dueDate: '', priority: 'medium', category: 'general' })
        setShowNewItemModal(false)
      }
    } catch (error) {
      console.error('Error adding item:', error)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'text-green-400 bg-green-500/20'
      case 'medium': return 'text-yellow-400 bg-yellow-500/20'
      case 'high': return 'text-red-400 bg-red-500/20'
      default: return 'text-gray-400 bg-gray-500/20'
    }
  }

  const currentChecklist = checklists.find(c => c.id === selectedChecklist)
  const filteredItems = currentChecklist?.items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory
    return matchesSearch && matchesCategory
  }) || []

  const categories = ['all', ...new Set(currentChecklist?.items.map(item => item.category) || [])]

  return (
    <div className="flex-1 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <CheckSquare className="h-8 w-8 text-yellow-400 mr-3" />
            <h1 className="text-3xl font-bold text-white">Interactive Checklists</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowNewItemModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              disabled={!selectedChecklist}
            >
              <Plus className="h-4 w-4" />
              <span>Add Item</span>
            </button>
            <button
              onClick={() => setShowNewChecklistModal(true)}
              className="golden-button flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>New Checklist</span>
            </button>
          </div>
        </div>
        <p className="text-gray-300">Manage and complete your daily task checklists</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Checklist Sidebar */}
        <div className="lg:col-span-1">
          <div className="golden-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Checklists</h2>
            <div className="space-y-2">
              {checklists.map((checklist) => {
                const progressPercentage = checklist.totalCount > 0 
                  ? Math.round((checklist.completedCount / checklist.totalCount) * 100)
                  : 0
                
                return (
                  <button
                    key={checklist.id}
                    onClick={() => setSelectedChecklist(checklist.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedChecklist === checklist.id
                        ? 'bg-yellow-500/20 border border-yellow-500/50'
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-white truncate">{checklist.name}</h3>
                      <span className="text-sm text-gray-400">{progressPercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-yellow-400 h-2 rounded-full transition-all"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {checklist.completedCount} of {checklist.totalCount} completed
                    </p>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {currentChecklist ? (
            <>
              {/* Checklist Header */}
              <div className="golden-card p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-white">{currentChecklist.name}</h2>
                  <div className="text-sm text-gray-400">
                    Last updated: {currentChecklist.lastUpdated.toLocaleString()}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-white/5 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-400">
                      {Math.round((currentChecklist.completedCount / currentChecklist.totalCount) * 100) || 0}%
                    </p>
                    <p className="text-sm text-gray-400">Progress</p>
                  </div>
                  <div className="text-center p-4 bg-white/5 rounded-lg">
                    <p className="text-2xl font-bold text-green-400">{currentChecklist.completedCount}</p>
                    <p className="text-sm text-gray-400">Completed</p>
                  </div>
                  <div className="text-center p-4 bg-white/5 rounded-lg">
                    <p className="text-2xl font-bold text-blue-400">
                      {currentChecklist.totalCount - currentChecklist.completedCount}
                    </p>
                    <p className="text-sm text-gray-400">Remaining</p>
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="golden-card p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Search items..."
                      className="golden-input pl-10 w-full"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  <select
                    className="golden-input"
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
                      </option>
                    ))}
                  </select>

                  <div className="text-sm text-gray-400 flex items-center">
                    <Filter className="h-4 w-4 mr-2" />
                    {filteredItems.length} of {currentChecklist.items.length} items
                  </div>
                </div>
              </div>

              {/* Checklist Items */}
              <div className="space-y-3">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className={`golden-card p-4 transition-all ${
                      item.completed ? 'opacity-75' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <button
                        onClick={() => handleToggleItem(currentChecklist.id, item.id)}
                        className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          item.completed
                            ? 'bg-green-500 border-green-500'
                            : 'border-gray-400 hover:border-green-500'
                        }`}
                      >
                        {item.completed && <Check className="h-4 w-4 text-white" />}
                      </button>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className={`font-medium ${
                            item.completed ? 'text-gray-400 line-through' : 'text-white'
                          }`}>
                            {item.title}
                          </h3>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(item.priority)}`}>
                              {item.priority.toUpperCase()}
                            </span>
                            <span className="px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-400">
                              {item.category.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        
                        {item.description && (
                          <p className={`text-sm mb-2 ${
                            item.completed ? 'text-gray-500' : 'text-gray-300'
                          }`}>
                            {item.description}
                          </p>
                        )}
                        
                        {item.dueDate && (
                          <div className="flex items-center text-xs text-gray-400">
                            <Clock className="h-3 w-3 mr-1" />
                            Due: {item.dueDate.toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="golden-card p-12 text-center">
              <CheckSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Checklist Selected</h3>
              <p className="text-gray-400 mb-6">Select a checklist from the sidebar to view and manage items</p>
              <button
                onClick={() => setShowNewChecklistModal(true)}
                className="golden-button"
              >
                Create Your First Checklist
              </button>
            </div>
          )}
        </div>
      </div>

      {/* New Checklist Modal */}
      {showNewChecklistModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="golden-card p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-white mb-6">Create New Checklist</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Checklist Name</label>
                <input
                  type="text"
                  className="golden-input w-full"
                  placeholder="Enter checklist name"
                  value={newChecklist.name}
                  onChange={(e) => setNewChecklist({ ...newChecklist, name: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Description (Optional)</label>
                <textarea
                  className="golden-input w-full h-24"
                  placeholder="Brief description of this checklist"
                  value={newChecklist.description}
                  onChange={(e) => setNewChecklist({ ...newChecklist, description: e.target.value })}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-4 mt-6">
              <button
                onClick={() => setShowNewChecklistModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateChecklist}
                className="golden-button"
                disabled={!newChecklist.name.trim()}
              >
                Create Checklist
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Item Modal */}
      {showNewItemModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="golden-card p-6 w-full max-w-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">Add New Item</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Item Title</label>
                <input
                  type="text"
                  className="golden-input w-full"
                  placeholder="What needs to be done?"
                  value={newItem.title}
                  onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Description (Optional)</label>
                <textarea
                  className="golden-input w-full h-24"
                  placeholder="Additional details about this task"
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Priority</label>
                  <select
                    className="golden-input w-full"
                    value={newItem.priority}
                    onChange={(e) => setNewItem({ ...newItem, priority: e.target.value as any })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Category</label>
                  <input
                    type="text"
                    className="golden-input w-full"
                    placeholder="Category"
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Due Date (Optional)</label>
                  <input
                    type="date"
                    className="golden-input w-full"
                    value={newItem.dueDate}
                    onChange={(e) => setNewItem({ ...newItem, dueDate: e.target.value })}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-4 mt-6">
              <button
                onClick={() => setShowNewItemModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleAddItem}
                className="golden-button"
                disabled={!newItem.title.trim()}
              >
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
