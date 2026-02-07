'use client';

import { useState, useEffect, FormEvent, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { apiClient } from '@/lib/api-client';
import ProtectedRoute from '@/components/ProtectedRoute';
import LoadingSpinner from '@/components/LoadingSpinner';
import ConfirmModal from '@/components/ConfirmModal';
import ChatInterface from '@/components/ChatInterface';
import { ChatMessage } from '@/types/chat';

interface Todo {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  priority: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  tags?: Array<{ id: string; name: string; color: string }>;
}

interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

type FilterType = 'all' | 'active' | 'completed';
type SortType = 'date-desc' | 'date-asc' | 'title-asc' | 'title-desc' | 'priority' | 'due-date';

export default function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoDescription, setNewTodoDescription] = useState('');
  const [newTodoPriority, setNewTodoPriority] = useState('medium');
  const [newTodoDueDate, setNewTodoDueDate] = useState('');
  const [newTodoTagIds, setNewTodoTagIds] = useState<string[]>([]);
  const [editingTodo, setEditingTodo] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState('medium');
  const [editDueDate, setEditDueDate] = useState('');
  const [editTagIds, setEditTagIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('date-desc');
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; todoId: string | null }>({
    isOpen: false,
    todoId: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // Search and pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Chat sidebar state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [initialMessages] = useState<ChatMessage[]>([]);

  const { user, logout } = useAuth();
  const { showToast } = useToast();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to first page on search
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchTodos = useCallback(async () => {
    try {
      setIsLoading(true);
      const completedFilter = filter === 'all' ? undefined : filter === 'completed';
      const response = await apiClient.getTodos({
        completed: completedFilter,
        search: debouncedSearch || undefined,
        page: currentPage,
        page_size: pageSize,
      });
      setTodos(response.todos);
      setTotalPages(response.total_pages);
      setTotalCount(response.total);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to fetch todos', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [filter, debouncedSearch, currentPage, pageSize, showToast]);

  const fetchTags = useCallback(async () => {
    try {
      const data = await apiClient.getTags();
      setTags(data);
    } catch (err) {
      console.error('Failed to fetch tags:', err);
    }
  }, []);

  useEffect(() => {
    fetchTodos();
    fetchTags();
  }, [fetchTodos, fetchTags]);

  // Filter and sort todos (now done on backend, but keep for client-side title/priority/due-date sorting)
  const sortedTodos = useMemo(() => {
    const sorted = [...todos].sort((a, b) => {
      switch (sortBy) {
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        case 'priority': {
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
        }
        case 'due-date': {
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        }
        default:
          return 0;
      }
    });
    return sorted;
  }, [todos, sortBy]);

  const handleCreateTodo = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newTodoTitle.trim()) return;

    setIsCreating(true);

    try {
      const newTodo = await apiClient.createTodo({
        title: newTodoTitle,
        description: newTodoDescription || undefined,
        priority: newTodoPriority,
        due_date: newTodoDueDate || undefined,
        tag_ids: newTodoTagIds.length > 0 ? newTodoTagIds : undefined,
      });
      setTodos([newTodo, ...todos]);
      setNewTodoTitle('');
      setNewTodoDescription('');
      setNewTodoPriority('medium');
      setNewTodoDueDate('');
      setNewTodoTagIds([]);
      setNewTodoPriority('medium');
      setNewTodoDueDate('');
      showToast('Todo created successfully!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create todo', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleComplete = async (todo: Todo) => {
    // Optimistic UI update
    const previousTodos = [...todos];
    setTodos(todos.map((t) => (t.id === todo.id ? { ...t, completed: !t.completed } : t)));

    try {
      const updated = await apiClient.updateTodoStatus(todo.id, !todo.completed);
      setTodos(todos.map((t) => (t.id === todo.id ? updated : t)));
      showToast(
        updated.completed ? 'Todo marked as completed!' : 'Todo marked as active!',
        'success'
      );
    } catch (err) {
      // Revert on error
      setTodos(previousTodos);
      showToast(err instanceof Error ? err.message : 'Failed to update todo', 'error');
    }
  };

  const handleStartEdit = (todo: Todo) => {
    setEditingTodo(todo.id);
    setEditTitle(todo.title);
    setEditDescription(todo.description || '');
    setEditPriority(todo.priority);
    setEditDueDate(todo.due_date || '');
    setEditTagIds(todo.tags?.map(t => t.id) || []);
  };

  const handleCancelEdit = () => {
    setEditingTodo(null);
    setEditTitle('');
    setEditDescription('');
    setEditPriority('medium');
    setEditDueDate('');
    setEditTagIds([]);
  };

  const handleSaveEdit = async (todoId: string) => {
    if (!editTitle.trim()) {
      showToast('Title cannot be empty', 'error');
      return;
    }

    setIsSaving(true);

    try {
      const updated = await apiClient.updateTodo(todoId, {
        title: editTitle,
        description: editDescription || undefined,
        priority: editPriority,
        due_date: editDueDate || undefined,
        tag_ids: editTagIds.length > 0 ? editTagIds : undefined,
      });
      setTodos(todos.map((t) => (t.id === todoId ? updated : t)));
      setEditingTodo(null);
      setEditTitle('');
      setEditDescription('');
      setEditPriority('medium');
      setEditDueDate('');
      setEditTagIds([]);
      showToast('Todo updated successfully!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update todo', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (todoId: string) => {
    setDeleteConfirm({ isOpen: true, todoId });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.todoId) return;

    setIsDeleting(true);

    try {
      await apiClient.deleteTodo(deleteConfirm.todoId);
      setTodos(todos.filter((t) => t.id !== deleteConfirm.todoId));
      showToast('Todo deleted successfully!', 'success');
      setDeleteConfirm({ isOpen: false, todoId: null });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete todo', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({ isOpen: false, todoId: null });
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    try {
      const newTag = await apiClient.createTag({
        name: newTagName,
        color: newTagColor,
      });
      setTags([...tags, newTag]);
      setNewTagName('');
      setNewTagColor('#3B82F6');
      showToast('Tag created successfully!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create tag', 'error');
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    try {
      await apiClient.deleteTag(tagId);
      setTags(tags.filter((t) => t.id !== tagId));
      showToast('Tag deleted successfully!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete tag', 'error');
    }
  };

  const stats = {
    total: totalCount,
    active: todos.filter((t) => !t.completed).length,
    completed: todos.filter((t) => t.completed).length,
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
    setCurrentPage(1); // Reset to first page on filter change
  };

  // Chat handlers
  const handleConversationCreated = (newConversationId: number) => {
    setConversationId(newConversationId);
  };

  const handleChatMessageSent = () => {
    // Refresh todos list when chatbot sends a message
    // This ensures the list stays in sync with chatbot operations
    fetchTodos();
  };

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Todos</h1>
              <p className="text-sm text-gray-500 mt-1">
                {stats.active} active, {stats.completed} completed
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{user?.email}</span>
              <button
                onClick={logout}
                className="text-sm text-red-600 hover:text-red-800 font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Create Todo Form */}
          <div className="bg-white shadow rounded-lg p-6 mb-6 animate-fade-in">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Todo</h2>
            <form onSubmit={handleCreateTodo} className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Todo title"
                  value={newTodoTitle}
                  onChange={(e) => setNewTodoTitle(e.target.value)}
                  disabled={isCreating}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                />
              </div>
              <div>
                <textarea
                  placeholder="Description (optional)"
                  value={newTodoDescription}
                  onChange={(e) => setNewTodoDescription(e.target.value)}
                  disabled={isCreating}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={newTodoPriority}
                    onChange={(e) => setNewTodoPriority(e.target.value)}
                    disabled={isCreating}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newTodoDueDate}
                    onChange={(e) => setNewTodoDueDate(e.target.value)}
                    disabled={isCreating}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
              {/* Tag Selection */}
              {tags.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tags (optional)</label>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => {
                          if (newTodoTagIds.includes(tag.id)) {
                            setNewTodoTagIds(newTodoTagIds.filter(id => id !== tag.id));
                          } else {
                            setNewTodoTagIds([...newTodoTagIds, tag.id]);
                          }
                        }}
                        disabled={isCreating}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-all ${
                          newTodoTagIds.includes(tag.id)
                            ? 'ring-2 ring-offset-2'
                            : 'opacity-60 hover:opacity-100'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        style={{
                          backgroundColor: newTodoTagIds.includes(tag.id) ? tag.color : `${tag.color}20`,
                          color: newTodoTagIds.includes(tag.id) ? 'white' : tag.color,
                          boxShadow: newTodoTagIds.includes(tag.id) ? `0 0 0 2px ${tag.color}` : undefined
                        }}
                      >
                        {newTodoTagIds.includes(tag.id) ? '✓ ' : ''}🏷️ {tag.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <button
                type="submit"
                disabled={isCreating || !newTodoTitle.trim()}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isCreating ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Creating...</span>
                  </>
                ) : (
                  'Add Todo'
                )}
              </button>
            </form>
          </div>

          {/* Tag Management */}
          <div className="bg-white shadow rounded-lg p-6 mb-6 animate-fade-in">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Manage Tags</h2>
            <div className="space-y-4">
              {/* Create Tag Form */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Tag name"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="color"
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  className="w-16 h-10 border border-gray-300 rounded-md cursor-pointer"
                />
                <button
                  onClick={handleCreateTag}
                  disabled={!newTagName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Add Tag
                </button>
              </div>
              {/* Display Tags */}
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium"
                    style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                  >
                    🏷️ {tag.name}
                    <button
                      onClick={() => handleDeleteTag(tag.id)}
                      className="hover:opacity-70 transition-opacity"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {tags.length === 0 && (
                  <p className="text-sm text-gray-500">No tags yet. Create one above!</p>
                )}
              </div>
            </div>
          </div>

          {/* Search and Filter Controls */}
          <div className="bg-white shadow rounded-lg p-4 mb-6 animate-fade-in">
            {/* Search Bar */}
            <div className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search todos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <svg
                  className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              {/* Filter */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleFilterChange('all')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    filter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All ({stats.total})
                </button>
                <button
                  onClick={() => handleFilterChange('active')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    filter === 'active'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Active ({stats.active})
                </button>
                <button
                  onClick={() => handleFilterChange('completed')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    filter === 'completed'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Completed ({stats.completed})
                </button>
              </div>

              {/* Sort */}
              <div className="flex items-center gap-2">
                <label htmlFor="sort" className="text-sm font-medium text-gray-700">
                  Sort by:
                </label>
                <select
                  id="sort"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortType)}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="date-desc">Newest First</option>
                  <option value="date-asc">Oldest First</option>
                  <option value="title-asc">Title (A-Z)</option>
                  <option value="title-desc">Title (Z-A)</option>
                  <option value="priority">Priority (High to Low)</option>
                  <option value="due-date">Due Date (Earliest First)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Todos List */}
          <div className="bg-white shadow rounded-lg animate-fade-in">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {filter === 'all' && 'All Todos'}
                {filter === 'active' && 'Active Todos'}
                {filter === 'completed' && 'Completed Todos'}
                {' '}({sortedTodos.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {isLoading ? (
                <div className="px-6 py-12 text-center">
                  <LoadingSpinner size="lg" className="mb-4" />
                  <p className="text-gray-500">Loading todos...</p>
                </div>
              ) : sortedTodos.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-500">
                  {searchQuery && 'No todos found matching your search.'}
                  {!searchQuery && filter === 'all' && 'No todos yet. Create one above!'}
                  {!searchQuery && filter === 'active' && 'No active todos. Great job!'}
                  {!searchQuery && filter === 'completed' && 'No completed todos yet.'}
                </div>
              ) : (
                sortedTodos.map((todo) => (
                  <div key={todo.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    {editingTodo === todo.id ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          disabled={isSaving}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        />
                        <textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          disabled={isSaving}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                          rows={2}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                            <select
                              value={editPriority}
                              onChange={(e) => setEditPriority(e.target.value)}
                              disabled={isSaving}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                            <input
                              type="date"
                              value={editDueDate}
                              onChange={(e) => setEditDueDate(e.target.value)}
                              disabled={isSaving}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                            />
                          </div>
                        </div>
                        {/* Tag Selection */}
                        {tags.length > 0 && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                            <div className="flex flex-wrap gap-2">
                              {tags.map((tag) => (
                                <button
                                  key={tag.id}
                                  type="button"
                                  onClick={() => {
                                    if (editTagIds.includes(tag.id)) {
                                      setEditTagIds(editTagIds.filter(id => id !== tag.id));
                                    } else {
                                      setEditTagIds([...editTagIds, tag.id]);
                                    }
                                  }}
                                  disabled={isSaving}
                                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-all ${
                                    editTagIds.includes(tag.id)
                                      ? 'ring-2 ring-offset-2'
                                      : 'opacity-60 hover:opacity-100'
                                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                                  style={{
                                    backgroundColor: editTagIds.includes(tag.id) ? tag.color : `${tag.color}20`,
                                    color: editTagIds.includes(tag.id) ? 'white' : tag.color,
                                    boxShadow: editTagIds.includes(tag.id) ? `0 0 0 2px ${tag.color}` : undefined
                                  }}
                                >
                                  {editTagIds.includes(tag.id) ? '✓ ' : ''}🏷️ {tag.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveEdit(todo.id)}
                            disabled={isSaving}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                          >
                            {isSaving ? (
                              <>
                                <LoadingSpinner size="sm" />
                                <span>Saving...</span>
                              </>
                            ) : (
                              'Save'
                            )}
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            disabled={isSaving}
                            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-4">
                        <input
                          type="checkbox"
                          checked={todo.completed}
                          onChange={() => handleToggleComplete(todo)}
                          className="mt-1 h-5 w-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                        />
                        <div className="flex-1">
                          <h3
                            className={`text-lg font-medium transition-all ${
                              todo.completed
                                ? 'line-through text-gray-500'
                                : 'text-gray-900'
                            }`}
                          >
                            {todo.title}
                          </h3>
                          {todo.description && (
                            <p
                              className={`mt-1 text-sm transition-all ${
                                todo.completed ? 'text-gray-400' : 'text-gray-600'
                              }`}
                            >
                              {todo.description}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {/* Priority Badge */}
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                todo.priority === 'high'
                                  ? 'bg-red-100 text-red-800'
                                  : todo.priority === 'medium'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-green-100 text-green-800'
                              }`}
                            >
                              {todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1)} Priority
                            </span>
                            {/* Due Date */}
                            {todo.due_date && (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  new Date(todo.due_date) < new Date() && !todo.completed
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {new Date(todo.due_date) < new Date() && !todo.completed && '⚠️ '}
                                Due: {new Date(todo.due_date).toLocaleDateString()}
                              </span>
                            )}
                            {/* Tags */}
                            {todo.tags && todo.tags.length > 0 && todo.tags.map((tag) => (
                              <span
                                key={tag.id}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                                style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                              >
                                🏷️ {tag.name}
                              </span>
                            ))}
                          </div>
                          <p className="mt-2 text-xs text-gray-400">
                            Created: {new Date(todo.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleStartEdit(todo)}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteClick(todo.id)}
                            className="text-sm text-red-600 hover:text-red-800 font-medium transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing page {currentPage} of {totalPages} ({totalCount} total)
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-1 text-sm border rounded-md transition-colors ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Todo"
        message="Are you sure you want to delete this todo? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isDeleting}
      />

      {/* Floating Chat Button */}
      {!isChatOpen && (
        <button
          onClick={toggleChat}
          className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-110 z-40"
          aria-label="Open AI Assistant"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </button>
      )}

      {/* Chat Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-full md:w-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${
          isChatOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Chat Header */}
          <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
              <h2 className="text-lg font-semibold">AI Assistant</h2>
            </div>
            <button
              onClick={toggleChat}
              className="text-white hover:text-gray-200 transition-colors"
              aria-label="Close chat"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Chat Interface */}
          <div className="flex-1 overflow-hidden">
            <ChatInterface
              conversationId={conversationId}
              initialMessages={initialMessages}
              onConversationCreated={handleConversationCreated}
              onMessageSent={handleChatMessageSent}
            />
          </div>
        </div>
      </div>

      {/* Overlay when chat is open on mobile */}
      {isChatOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={toggleChat}
        />
      )}
    </ProtectedRoute>
  );
}
