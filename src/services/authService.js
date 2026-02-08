import api from './api';

export const authService = {
    // Initiate signup - sends OTP to email
    async signup(email) {
        const response = await api.post('/auth/signup', { email });
        return response.data;
    },

    // Verify signup OTP and complete registration
    async verifySignupOtp({ email, otp, first_name, last_name }) {
        const response = await api.post('/auth/verify-signup-otp', { email, otp, first_name, last_name });
        return response.data;
    },

    // Initiate login - sends OTP to email
    async login(email) {
        const response = await api.post('/auth/login', { email });
        return response.data;
    },

    // Verify login OTP
    async verifyLoginOtp({ email, otp }) {
        const response = await api.post('/auth/verify-login-otp', { email, otp });
        return response.data;
    },

    // Resend OTP
    async resendOtp({ email, type }) {
        const response = await api.post('/auth/resend-otp', { email, type });
        return response.data;
    },

    // Check current auth status
    async checkAuth() {
        const response = await api.get('/auth/check-auth');
        return response.data;
    },

    // Logout
    async logout() {
        const response = await api.post('/auth/logout');
        return response.data;
    },
};

export default authService;
