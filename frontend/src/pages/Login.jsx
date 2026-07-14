// Login page. On success the auth context is populated and the user is sent to
// the dashboard. Errors are shown generically so the page never reveals whether
// an email exists.
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const schema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [serverError, setServerError] = useState('');
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
      await login(values);
      navigate('/dashboard');
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) setServerError('Invalid email or password.');
      else if (status === 403) setServerError('This account is not active.');
      else if (status === 429) setServerError('Too many attempts. Please wait and try again.');
      else setServerError('Something went wrong. Please try again.');
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: '2rem auto', padding: '0 1rem' }}>
      <h1>Log in</h1>
      {justRegistered && <p role="status">Account created — please log in.</p>}
      {justReset && <p role="status">Password updated — please log in.</p>}
      {serverError && (
        <p role="alert" style={{ color: '#B91C1C' }}>
          {serverError}
        </p>
      )}
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <label>
          Email
          <input type="email" autoComplete="email" {...register('email')} />
        </label>
        {errors.email && <span role="alert">{errors.email.message}</span>}

        <label>
          Password
          <input type="password" autoComplete="current-password" {...register('password')} />
        </label>
        {errors.password && <span role="alert">{errors.password.message}</span>}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <p>
        <Link to="/forgot-password">Forgot password?</Link>
      </p>
      <p>
        New here? <Link to="/register">Create an account</Link>
      </p>
    </main>
  );
}
