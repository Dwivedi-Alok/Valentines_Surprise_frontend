import { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check auth status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setLoading(true);
      const userData = await authService.checkAuth();
      setUser(userData);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email) => {
    setError(null);
    try {
      const result = await authService.signup(email);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const verifySignupOtp = async ({ email, otp, first_name, last_name }) => {
    setError(null);
    try {
      const result = await authService.verifySignupOtp({ email, otp, first_name, last_name });
      console.log('Signup Verify Result:', result); // Debug log
      setUser(result.user);
      if (result.token) {
        console.log('Storing token in localStorage:', result.token); // Debug log
        localStorage.setItem('token', result.token);
      } else {
        console.warn('No token found in signup response');
      }
      return result;
    } catch (err) {
      console.error('Signup Verify Error:', err);
      setError(err.message);
      throw err;
    }
  };

  const login = async (email) => {
    setError(null);
    try {
      const result = await authService.login(email);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const verifyLoginOtp = async ({ email, otp }) => {
    setError(null);
    try {
      const result = await authService.verifyLoginOtp({ email, otp });
      console.log('Login Verify Result:', result); // Debug log
      setUser(result.user);
      if (result.token) {
        console.log('Storing token in localStorage:', result.token); // Debug log
        localStorage.setItem('token', result.token);
      } else {
        console.warn('No token found in login response');
      }
      return result;
    } catch (err) {
      console.error('Login Verify Error:', err);
      setError(err.message);
      throw err;
    }
  };

  const resendOtp = async ({ email, type }) => {
    setError(null);
    try {
      const result = await authService.resendOtp({ email, type });
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      localStorage.removeItem('token');
      setUser(null);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    signup,
    verifySignupOtp,
    login,
    verifyLoginOtp,
    resendOtp,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
