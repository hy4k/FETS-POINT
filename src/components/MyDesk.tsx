import { useState, useEffect } from 'react'
import { 
  User, 
  Calendar, 
  Heart,
  MessageCircle,
  Share2,
  Image as ImageIcon,
  Send,
  MoreHorizontal,
  UserCheck
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { FetsRoster } from './FetsRoster'
import { FetsCalendar } from './FetsCalendar'

interface WallPost {
  id: string
  user_id: string
  content: string
  post_type: string
  image_url?: string
  created_at: string
  updated_at: string
  is_deleted: boolean
  author?: {
    full_name: string
    avatar_url?: string
  }
  likes_count: number
  comments_count: number
  user_liked: boolean
  comments?: WallComment[]
}

interface WallComment {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
  author?: {
    full_name: string
    avatar_url?: string
  }
}

export function MyDesk() {
  const { user, profile } = useAuth()
  const [selectedTab, setSelectedTab] = useState('feed')
  const [posts, setPosts] = useState<WallPost[]>([])
  const [loading, setLoading] = useState(true)
  const [newPostContent, setNewPostContent] = useState('')
  const [newCommentContent, setNewCommentContent] = useState<{[key: string]: string}>({})
  const [showComments, setShowComments] = useState<{[key: string]: boolean}>({})
  const [postingUpdate, setPostingUpdate] = useState(false)

  useEffect(() => {
    if (user) {
      loadFeedData()
    }
  }, [user])

  const loadFeedData = async () => {
    try {
      setLoading(true)
      console.log('Loading My Desk feed data...')
      
      // Load posts with author information, likes, and comments count
      const { data: postsData, error: postsError } = await supabase
        .from('wall_posts')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url
          )
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(20)

      if (postsError) {
        console.error('Error loading posts:', postsError)
        loadMockFeedData()
      } else {
        // Process posts and get engagement data
        const processedPosts = await Promise.all(
          (postsData || []).map(async (post) => {
            // Get likes count and check if user liked
            const { count: likesCount } = await supabase
              .from('wall_likes')
              .select('*', { count: 'exact', head: true })
              .eq('post_id', post.id)

            const { data: userLike } = await supabase
              .from('wall_likes')
              .select('id')
              .eq('post_id', post.id)
              .eq('user_id', user!.id)
              .single()

            // Get comments count
            const { count: commentsCount } = await supabase
              .from('wall_comments')
              .select('*', { count: 'exact', head: true })
              .eq('post_id', post.id)
              .eq('is_deleted', false)

            return {
              ...post,
              author: post.profiles,
              likes_count: likesCount || 0,
              comments_count: commentsCount || 0,
              user_liked: !!userLike
            }
          })
        )
        setPosts(processedPosts)
        console.log(`Loaded ${processedPosts.length} posts`)
      }

    } catch (error) {
      console.error('Error loading feed data:', error)
      loadMockFeedData()
    } finally {
      setLoading(false)
    }
  }

  const loadMockFeedData = () => {
    const mockPosts: WallPost[] = [
      {
        id: '1',
        user_id: user!.id,
        content: 'Just completed the morning candidate check-in process. Everything running smoothly for today\'s certification exams! 📝',
        post_type: 'update',
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        is_deleted: false,
        author: {
          full_name: profile?.full_name || 'Test Administrator',
          avatar_url: undefined
        },
        likes_count: 5,
        comments_count: 2,
        user_liked: false
      },
      {
        id: '2',
        user_id: 'system',
        content: 'System Update: New emergency evacuation procedures have been uploaded to the FETS Vault. All staff should review the updated protocols.',
        post_type: 'announcement',
        created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        is_deleted: false,
        author: {
          full_name: 'FETS System',
          avatar_url: undefined
        },
        likes_count: 12,
        comments_count: 4,
        user_liked: true
      },
      {
        id: '3',
        user_id: user!.id,
        content: 'Great teamwork today! Successfully managed a high-volume testing session with 150+ candidates. Shoutout to the entire staff for maintaining excellent service standards.',
        post_type: 'update',
        created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        is_deleted: false,
        author: {
          full_name: profile?.full_name || 'Test Administrator',
          avatar_url: undefined
        },
        likes_count: 18,
        comments_count: 8,
        user_liked: false
      }
    ]
    setPosts(mockPosts)
  }

  const handleCreatePost = async () => {
    if (!newPostContent.trim() || !user) return
    
    try {
      setPostingUpdate(true)
      const { error } = await supabase
        .from('wall_posts')
        .insert({
          user_id: user.id,
          content: newPostContent,
          post_type: 'update'
        })

      if (error) {
        console.error('Error creating post:', error)
        // Add optimistic update for demo
        const newPost: WallPost = {
          id: Date.now().toString(),
          user_id: user.id,
          content: newPostContent,
          post_type: 'update',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_deleted: false,
          author: {
            full_name: profile?.full_name || 'You',
            avatar_url: profile?.avatar_url
          },
          likes_count: 0,
          comments_count: 0,
          user_liked: false
        }
        setPosts([newPost, ...posts])
      } else {
        // Reload feed to get the new post
        loadFeedData()
      }
      
      setNewPostContent('')
    } catch (error) {
      console.error('Error creating post:', error)
    } finally {
      setPostingUpdate(false)
    }
  }

  const handleLikePost = async (postId: string) => {
    if (!user) return

    const post = posts.find(p => p.id === postId)
    if (!post) return

    try {
      if (post.user_liked) {
        // Unlike
        await supabase
          .from('wall_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id)
        
        setPosts(posts.map(p => p.id === postId 
          ? { ...p, user_liked: false, likes_count: p.likes_count - 1 }
          : p
        ))
      } else {
        // Like
        await supabase
          .from('wall_likes')
          .insert({
            post_id: postId,
            user_id: user.id
          })
        
        setPosts(posts.map(p => p.id === postId 
          ? { ...p, user_liked: true, likes_count: p.likes_count + 1 }
          : p
        ))
      }
    } catch (error) {
      console.error('Error toggling like:', error)
    }
  }

  const handleComment = async (postId: string) => {
    const content = newCommentContent[postId]?.trim()
    if (!content || !user) return

    try {
      await supabase
        .from('wall_comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content: content
        })
      
      // Update comments count
      setPosts(posts.map(p => p.id === postId 
        ? { ...p, comments_count: p.comments_count + 1 }
        : p
      ))
      
      // Clear comment input
      setNewCommentContent({ ...newCommentContent, [postId]: '' })
    } catch (error) {
      console.error('Error adding comment:', error)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const past = new Date(dateString)
    const diffInMs = now.getTime() - past.getTime()
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInHours / 24)
    
    if (diffInHours < 1) {
      const diffInMins = Math.floor(diffInMs / (1000 * 60))
      return diffInMins < 1 ? 'Just now' : `${diffInMins}m ago`
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`
    } else if (diffInDays < 7) {
      return `${diffInDays}d ago`
    } else {
      return past.toLocaleDateString()
    }
  }

  const getDisplayName = () => {
    if (profile?.full_name) {
      return profile.full_name.split(' ')[0]
    }
    return user?.email?.split('@')[0] || 'User'
  }

  const getPostTypeColor = (type: string) => {
    switch (type) {
      case 'announcement': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'achievement': return 'bg-green-100 text-green-800 border-green-200'
      case 'alert': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your workspace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6 bg-gray-50">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <User className="h-8 w-8 text-yellow-500 mr-3" />
          <h1 className="text-3xl font-bold text-gray-900">My Desk</h1>
        </div>
        <p className="text-gray-600">Your personal workspace and activity feed</p>
      </div>

      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 rounded-2xl p-8 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-black mb-2">
              Welcome back, {getDisplayName()}!
            </h2>
            <p className="text-black/80 text-lg">
              Stay connected with your team and manage your daily tasks.
            </p>
          </div>
          <div className="text-right">
            <div className="text-black/80 text-sm">Today</div>
            <div className="text-black font-bold text-xl">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'short', 
                day: 'numeric' 
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Tabs */}
      <div className="golden-card p-6">
        <div className="flex space-x-6 mb-6 border-b border-gray-200">
          {[
            { id: 'feed', name: 'Activity Feed', icon: User },
            { id: 'fets-roster', name: 'FETS Roster', icon: UserCheck },
            { id: 'fets-calendar', name: 'FETS Calendar', icon: Calendar }
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-t-lg font-medium transition-colors ${
                  selectedTab === tab.id
                    ? 'text-yellow-600 border-b-2 border-yellow-500'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        {selectedTab === 'feed' && (
          <div className="max-w-2xl mx-auto">
            {/* New Post Creation */}
            <div className="bg-white rounded-lg border p-6 mb-6">
              <div className="flex space-x-4">
                <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-black" />
                </div>
                <div className="flex-1">
                  <textarea
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    placeholder="Share an update with your team..."
                    className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    rows={3}
                  />
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center space-x-3">
                      <button className="flex items-center space-x-1 text-gray-500 hover:text-gray-700">
                        <ImageIcon className="h-5 w-5" />
                        <span className="text-sm">Photo</span>
                      </button>
                    </div>
                    <button
                      onClick={handleCreatePost}
                      disabled={!newPostContent.trim() || postingUpdate}
                      className="golden-button flex items-center space-x-2 disabled:opacity-50"
                    >
                      {postingUpdate ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      <span>{postingUpdate ? 'Posting...' : 'Post Update'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Feed */}
            <div className="space-y-6">
              {posts.map((post) => (
                <div key={post.id} className="bg-white rounded-lg border p-6 hover:shadow-md transition-shadow">
                  {/* Post Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-black" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {post.author?.full_name || 'Unknown User'}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {formatTimeAgo(post.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {post.post_type !== 'update' && (
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${getPostTypeColor(post.post_type)}`}>
                          {post.post_type.toUpperCase()}
                        </span>
                      )}
                      <button className="text-gray-400 hover:text-gray-600">
                        <MoreHorizontal className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Post Content */}
                  <div className="mb-4">
                    <p className="text-gray-800 leading-relaxed">{post.content}</p>
                    {post.image_url && (
                      <img 
                        src={post.image_url} 
                        alt="Post image" 
                        className="mt-3 rounded-lg max-w-full h-auto"
                      />
                    )}
                  </div>

                  {/* Post Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center space-x-6">
                      <button 
                        onClick={() => handleLikePost(post.id)}
                        className={`flex items-center space-x-2 transition-colors ${
                          post.user_liked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
                        }`}
                      >
                        <Heart className={`h-5 w-5 ${post.user_liked ? 'fill-current' : ''}`} />
                        <span className="text-sm">{post.likes_count}</span>
                      </button>
                      <button 
                        onClick={() => setShowComments({...showComments, [post.id]: !showComments[post.id]})}
                        className="flex items-center space-x-2 text-gray-500 hover:text-blue-500 transition-colors"
                      >
                        <MessageCircle className="h-5 w-5" />
                        <span className="text-sm">{post.comments_count}</span>
                      </button>
                      <button className="flex items-center space-x-2 text-gray-500 hover:text-green-500 transition-colors">
                        <Share2 className="h-5 w-5" />
                        <span className="text-sm">Share</span>
                      </button>
                    </div>
                  </div>

                  {/* Comment Section */}
                  {showComments[post.id] && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex space-x-3">
                        <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-black" />
                        </div>
                        <div className="flex-1 flex space-x-2">
                          <input
                            type="text"
                            value={newCommentContent[post.id] || ''}
                            onChange={(e) => setNewCommentContent({...newCommentContent, [post.id]: e.target.value})}
                            placeholder="Write a comment..."
                            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleComment(post.id)
                              }
                            }}
                          />
                          <button
                            onClick={() => handleComment(post.id)}
                            disabled={!newCommentContent[post.id]?.trim()}
                            className="px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {posts.length === 0 && (
                <div className="text-center py-12">
                  <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No activity yet</h3>
                  <p className="text-gray-500 mb-6">Be the first to share an update with your team!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {selectedTab === 'fets-roster' && (
          <div>
            <FetsRoster />
          </div>
        )}

        {selectedTab === 'fets-calendar' && (
          <div>
            <FetsCalendar />
          </div>
        )}
      </div>
    </div>
  )
}
