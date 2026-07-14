// Registration page. Client-side validation mirrors the server policy (the
// server remains the real gate). On success the user is sent to the login page;
// email verification is layered in later.
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import zxcvbn from 'zxcvbn';
import { Link, useNavigate } from 'react-router-dom';
import { register as registerApi } from '../api/auth';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter';

const schema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(100),
    email: z.string().trim().email('Enter a valid email'),
    password: z
      .string()
      .min(12, 'Password must be at least 12 characters')
      .max(128, 'Password must be at most 128 characters')
      .refine((v) => /[a-z]/.test(v), 'Add a lowercase letter')
      .refine((v) => /[A-Z]/.test(v), 'Add an uppercase letter')
      .refine((v) => /[0-9]/.test(v), 'Add a digit')
      .refine((v) => /[^A-Za-z0-9]/.test(v), 'Add a special character'),
    confirmPassword: z.string(),
    terms: z.literal(true, {
      errorMap: () => ({ message: 'You must accept the Terms and Privacy Policy' }),
    }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export default function Register() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  // Live strength scoring. Submission is blocked below score 2 and while the
  // two password fields disagree (the server enforces the same policy).
  const password = watch('password') || '';
  const confirmPassword = watch('confirmPassword') || '';
  const strength = password ? zxcvbn(password) : null;
  const tooWeak = strength !== null && strength.score < 2;
  const mismatch = confirmPassword.length > 0 && password !== confirmPassword;

  async function onSubmit(values) {
    setServerError('');
    try {
      await registerApi(values);
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      const status = err.response?.status;
      if (status === 409) setServerError('Unable to register with those details.');
      else if (status === 400) setServerError('Please check the form and try again.');
      else if (status === 429) setServerError('Too many attempts. Please wait and try again.');
      else setServerError('Something went wrong. Please try again.');
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: '2rem auto', padding: '0 1rem' }}>
      <h1>Create your account</h1>
      {serverError && (
        <p role="alert" style={{ color: '#B91C1C' }}>
          {serverError}
        </p>
      )}
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <label>
          Name
          <input type="text" autoComplete="name" {...register('name')} />
        </label>
        {errors.name && <span role="alert">{errors.name.message}</span>}

        <label>
          Email
          <input type="email" autoComplete="email" {...register('email')} />
        </label>
        {errors.email && <span role="alert">{errors.email.message}</span>}

        <label>
          Password
          <input type="password" autoComplete="new-password" {...register('password')} />
        </label>
        <PasswordStrengthMeter result={strength} />
        {errors.password && <span role="alert">{errors.password.message}</span>}

        <label>
          Confirm password
          <input
            type="password"
            autoComplete="new-password"
            {...register('confirmPassword')}
          />
        </label>
        {errors.confirmPassword && <span role="alert">{errors.confirmPassword.message}</span>}

        <label>
          <input type="checkbox" {...register('terms')} /> I accept the{' '}
          <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>
        </label>
        {errors.terms && <span role="alert">{errors.terms.message}</span>}

        <button type="submit" disabled={isSubmitting || tooWeak || mismatch}>
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </main>
  );
}
