import api from './api';

export const paymentService = {
    // Get all payments (mine + partner's)
    async getPayments() {
        const response = await api.get('/payment');
        return response.data;
    },

    // Add new payment method
    async addPayment(data) {
        const response = await api.post('/payment', data);
        return response.data;
    },

    // Delete payment method
    async deletePayment(id) {
        const response = await api.delete(`/payment/${id}`);
        return response.data;
    },
};

export default paymentService;
