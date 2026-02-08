import api from './api';

export const coupleService = {
    // Get couple info for current user
    async getCouple() {
        const response = await api.get('/couple');
        return response.data;
    },

    // Invite partner
    async invitePartner({ email, first_name, last_name }) {
        const response = await api.post('/couple/invite', { email, first_name, last_name });
        return response.data;
    },

    // Remove partner / cancel invite
    async removePartner() {
        const response = await api.delete('/couple');
        return response.data;
    },
};

export default coupleService;
