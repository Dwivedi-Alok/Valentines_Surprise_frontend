import api from './api';

export const urlService = {
    // Get all saved URLs for current user
    async getUrls() {
        const response = await api.get('/urls');
        return response.data;
    },

    // Save a new URL
    async createUrl({ url, title }) {
        const response = await api.post('/urls', { url, title });
        return response.data;
    },

    // Delete a saved URL
    async deleteUrl(id) {
        const response = await api.delete(`/urls/${id}`);
        return response.data;
    },
};

export default urlService;
