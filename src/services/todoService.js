import api from './api';

export const todoService = {
    // Get all todos for current user
    async getTodos() {
        const response = await api.get('/todo');
        return response.data;
    },

    // Create a new todo
    async createTodo({ title, description, dateTime }) {
        const response = await api.post('/todo', { title, description, dateTime });
        return response.data;
    },

    // Update a todo
    async updateTodo(id, updates) {
        const response = await api.put(`/todo/${id}`, updates);
        return response.data;
    },

    // Delete a todo
    async deleteTodo(id) {
        const response = await api.delete(`/todo/${id}`);
        return response.data;
    },

    // Toggle completion status
    async toggleComplete(id, completed) {
        const response = await api.put(`/todo/${id}`, { completed });
        return response.data;
    },
};

export default todoService;
