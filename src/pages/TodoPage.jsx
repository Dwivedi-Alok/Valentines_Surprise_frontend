import { useState, useEffect } from 'react';
import todoService from '../services/todoService';
import { Button, Input, Card, Spinner } from '../components/ui';
import Layout from '../components/Layout';

const TodoPage = () => {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dateTime: '',
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    try {
      const data = await todoService.getTodos();
      setTodos(data);
    } catch (err) {
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.dateTime) return;

    setSubmitting(true);
    setError('');

    try {
      if (editingId) {
        const updated = await todoService.updateTodo(editingId, formData);
        setTodos(todos.map(t => t._id === editingId ? updated : t));
      } else {
        const newTodo = await todoService.createTodo(formData);
        setTodos([newTodo, ...todos]);
      }
      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleComplete = async (id, completed) => {
    try {
      const updated = await todoService.toggleComplete(id, !completed);
      setTodos(todos.map(t => t._id === id ? updated : t));
    } catch (err) {
      setError('Failed to update task');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this task?')) return;
    
    try {
      await todoService.deleteTodo(id);
      setTodos(todos.filter(t => t._id !== id));
    } catch (err) {
      setError('Failed to delete task');
    }
  };

  const handleEdit = (todo) => {
    setFormData({
      title: todo.title,
      description: todo.description || '',
      dateTime: todo.dateTime ? new Date(todo.dateTime).toISOString().slice(0, 16) : '',
    });
    setEditingId(todo._id);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({ title: '', description: '', dateTime: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Spinner size="xl" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-dark">My Tasks</h1>
          <p className="text-text-light">Manage your to-do list</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Task'}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-error/10 text-error text-sm">
          {error}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Task Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
            <Input
              label="Description (optional)"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <Input
              label="Due Date & Time"
              type="datetime-local"
              value={formData.dateTime}
              onChange={(e) => setFormData({ ...formData, dateTime: e.target.value })}
              required
            />
            <div className="flex gap-3">
              <Button type="submit" loading={submitting}>
                {editingId ? 'Update Task' : 'Add Task'}
              </Button>
              {editingId && (
                <Button type="button" variant="ghost" onClick={resetForm}>
                  Cancel Edit
                </Button>
              )}
            </div>
          </form>
        </Card>
      )}

      {/* Task List */}
      {todos.length > 0 ? (
        <div className="space-y-3">
          {todos.map((todo) => (
            <Card
              key={todo._id}
              variant="default"
              padding="none"
              className={`overflow-hidden transition-all ${todo.completed ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start gap-4 p-4">
                {/* Checkbox */}
                <button
                  onClick={() => handleToggleComplete(todo._id, todo.completed)}
                  className={`
                    mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center
                    transition-all duration-200 ease-out
                    ${todo.completed
                      ? 'bg-success border-success'
                      : 'border-rose hover:border-deep'
                    }
                  `}
                >
                  {todo.completed && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className={`font-medium ${todo.completed ? 'line-through text-text-muted' : 'text-dark'}`}>
                    {todo.title}
                  </h3>
                  {todo.description && (
                    <p className="text-sm text-text-light mt-1 line-clamp-2">{todo.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {formatDate(todo.dateTime)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(todo)}
                    className="p-2 text-text-muted hover:text-deep hover:bg-blush rounded-lg transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(todo._id)}
                    className="p-2 text-text-muted hover:text-error hover:bg-error/10 rounded-lg transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card variant="blush" className="text-center py-12">
          <div className="text-4xl mb-3">📝</div>
          <p className="text-text-light">No tasks yet. Add your first one!</p>
        </Card>
      )}
    </Layout>
  );
};

export default TodoPage;
