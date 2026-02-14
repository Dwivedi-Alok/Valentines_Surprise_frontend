import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Card, Spinner } from '../components/ui';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, verifyLoginOtp, resendOtp } = useAuth();
  
  const [step, setStep] = useState('email'); // 'email' | 'otp'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError('');
    
    try {
      await login(email);
      setStep('otp');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    if (!otp) return;

    setLoading(true);
    setError('');
    
    try {
      await verifyLoginOtp({ email, otp });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResending(true);
    setError('');
    
    try {
      await resendOtp({ email, type: 'login' });
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Decorative header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full gradient-accent mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-dark">Welcome Back</h1>
          <p className="text-text-light mt-1">Sign in to your account</p>
        </div>

        <Card variant="elevated" padding="lg">
          {step === 'email' ? (
            <form onSubmit={handleEmailSubmit} className="space-y-5">
              <Input
                label="Email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={error}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                }
              />
              
              <Button type="submit" fullWidth loading={loading}>
                Continue
              </Button>
            </form>
          ) : (
            <form onSubmit={handleOtpSubmit} className="space-y-5">
              <div className="text-center mb-4">
                <p className="text-sm text-text-light">
                  We've sent a code to <span className="font-medium text-dark">{email}</span>
                </p>
              </div>
              
              <Input
                label="Verification Code"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                error={error}
                className="text-center tracking-widest"
              />
              
              <Button type="submit" fullWidth loading={loading}>
                Verify & Sign In
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resending}
                  className="text-sm text-deep hover:text-accent transition-colors disabled:opacity-50"
                >
                  {resending ? <Spinner.Inline size="sm" /> : "Didn't receive code? Resend"}
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  setOtp('');
                  setError('');
                }}
                className="w-full text-sm text-text-light hover:text-dark transition-colors"
              >
                ← Use a different email
              </button>
            </form>
          )}
        </Card>

        <p className="text-center mt-6 text-text-light">
          Don't have an account?{' '}
          <Link to="/signup" className="text-deep hover:text-accent font-medium transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
