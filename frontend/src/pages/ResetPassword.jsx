// Reset-password page. Reached from the emailed link (carries ?token). Applies
// the same client-side policy and strength gate as registration; the server
// re-checks policy, reuse, token validity and expiry.
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import zxcvbn from 'zxcvbn';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../api/auth';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter';

const schema = z
  .object({
    password: z
      .string()
      .min(12, 'Password must be at least 12 characters')
      .max(128, 'Password must be at most 128 characters')
      .refine((v) => /[a-z]/.test(v), 'Add a lowercase letter')
      .refine((v) => /[A-Z]/.test(v), 'Add an uppercase letter')
      .refine((v) => /[0-9]/.test(v), 'Add a digit')
      .refine((v) => /[^A-Za-z0-9]/.test(v), 'Add a special character'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  const password = watch('password') || '';
  const strength = password ? zxcvbn(password) : null;
  const tooWeak = strength !== null && strength.score < 2;

  async function onSubmit(values) {
    setServerError('');
    try {
      await resetPassword(token, values.password);
      navigate('/login', { state: { reset: true } });
    } catch (err) {
      const msg = err.response?.data?.error;
      setServerError(msg || 'Could not reset your password. Request a new link.');
    }
  }

  if (!token) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <span className="auth-brand">🌱 EcoLend</span>
          <h1>Reset your password</h1>
          <div className="alert alert-error" role="alert">This reset link is missing or invalid.</div>
          <p className="auth-alt"><Link to="/forgot-password">Request a new link</Link></p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <span className="auth-brand">🌱 EcoLend</span>
        <h1>Choose a new password</h1>
        {serverError && (
          <div className="alert alert-error" role="alert">{serverError}</div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="field">
            <label htmlFor="password">New password</label>
            <input id="password" type="password" autoComplete="new-password" {...register('password')} />
            <PasswordStrengthMeter result={strength} />
            {errors.password && <span className="field-error" role="alert">{errors.password.message}</span>}
          </div>

          <div className="field">
            <label htmlFor="confirmPassword">Confirm password</label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && <span className="field-error" role="alert">{errors.confirmPassword.message}</span>}
          </div>

          <button type="submit" className="btn-block" disabled={isSubmitting || tooWeak}>
            {isSubmitting ? 'Saving…' : 'Set new password'}
          </button>
        </form>
      </div>
    </div>
  );
}
