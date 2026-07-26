// Login page. On success the auth context is populated and the user is sent to
// the dashboard. Errors are shown generically so the page never reveals whether
// an email exists.
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Captcha from '../components/Captcha';

const schema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [serverError, setServerError] = useState('');
  // The server demands a CAPTCHA after 3 failed attempts on an account; it
  // signals that with captchaRequired so the widget appears only when needed.
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const justRegistered = location.state?.registered;
  const justReset = location.state?.reset;
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  async function onSubmit(values) {
    setServerError('');
    try {
      const result = await login({ ...values, captchaToken });
      if (result?.mfaRequired) {
        navigate('/login/mfa');
        return;
      }
      // Admins land in the admin console; members in the marketplace dashboard.
      // save id to localStorage
      localStorage.setItem('userId', result?.id);
      navigate(result?.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      const status = err.response?.status;
      if (err.response?.data?.passwordExpired) {
        navigate('/forgot-password', { state: { expired: true } });
        return;
      }
      // Once the server asks for a CAPTCHA, keep showing it until success.
      if (err.response?.data?.captchaRequired) setCaptchaRequired(true);
      setCaptchaToken('');
      if (status === 401) setServerError('Invalid email or password.');
      else if (status === 403) setServerError('This account is not active.');
      else if (status === 429) setServerError('Too many attempts. Please wait and try again.');
      else setServerError('Something went wrong. Please try again.');
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <span className="auth-brand">🌱 EcoLend</span>
        <h1>Welcome back</h1>
        <p className="muted">Log in to manage your listings and bookings.</p>
        {justRegistered && (
          <div className="alert alert-success" role="status">Account created — please log in.</div>
        )}
        {justReset && (
          <div className="alert alert-success" role="status">Password updated — please log in.</div>
        )}
        {serverError && (
          <div className="alert alert-error" role="alert">{serverError}</div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="email" {...register('email')} />
            {errors.email && <span className="field-error" role="alert">{errors.email.message}</span>}
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" autoComplete="current-password" {...register('password')} />
            {errors.password && <span className="field-error" role="alert">{errors.password.message}</span>}
          </div>

          {captchaRequired && <Captcha onChange={setCaptchaToken} />}

          <button type="submit" className="btn-block" disabled={isSubmitting || (captchaRequired && !captchaToken)}>
            {isSubmitting ? 'Logging in…' : 'Log in'}
          </button>
        </form>
        <p className="text-sm" style={{ marginTop: 'var(--space-4)' }}>
          <Link to="/forgot-password">Forgot password?</Link>
        </p>
        <p className="auth-alt">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
