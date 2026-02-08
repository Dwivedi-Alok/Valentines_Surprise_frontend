import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Card, Spinner } from '../components/ui';

const SignupPage = () => {
  const navigate = useNavigate();
  const { signup, verifySignupOtp, resendOtp } = useAuth();
  
  const [step, setStep] = useState('email'); // 'email' | 'otp'
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    otp: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);

  const handleChange = (field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    setError('');
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email) return;

    setLoading(true);
    setError('');
    
    try {
      await signup(formData.email);
      setStep('otp');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    if (!formData.otp || !formData.first_name || !formData.last_name) return;

    setLoading(true);
    setError('');
    
    try {
      await verifySignupOtp({
        email: formData.email,
        otp: formData.otp,
        first_name: formData.first_name,
        last_name: formData.last_name,
      });
      navigate('/dashboard', { replace: true });
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
      await resendOtp({ email: formData.email, type: 'signup' });
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-dark">Create Account</h1>
          <p className="text-text-light mt-1">Join us for something special</p>
        </div>

        <Card variant="elevated" padding="lg">
          {step === 'email' ? (
            <form onSubmit={handleEmailSubmit} className="space-y-5">
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={handleChange('email')}
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
                  We've sent a code to <span className="font-medium text-dark">{formData.email}</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="First Name"
                  type="text"
                  value={formData.first_name}
                  onChange={handleChange('first_name')}
                  required
                />
                <Input
                  label="Last Name"
                  type="text"
                  value={formData.last_name}
                  onChange={handleChange('last_name')}
                  required
                />
              </div>
              
              <Input
                label="Verification Code"
                type="text"
                value={formData.otp}
                onChange={handleChange('otp')}
                maxLength={6}
                error={error}
                className="text-center tracking-widest"
              />
              
              <Button type="submit" fullWidth loading={loading}>
                Create Account
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
                  setFormData(prev => ({ ...prev, otp: '', first_name: '', last_name: '' }));
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
          Already have an account?{' '}
          <Link to="/login" className="text-deep hover:text-accent font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignupPage;
