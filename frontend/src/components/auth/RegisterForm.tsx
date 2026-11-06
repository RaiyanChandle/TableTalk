import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export const RegisterForm: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Email address is required.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await register(trimmedEmail, password);
      navigate('/app', { replace: true });
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
      {error && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #C8501E',
            borderRadius: '6px',
            color: '#C8501E',
            fontSize: '14px',
            marginBottom: '24px',
            fontFamily: 'IBM Plex Sans, sans-serif',
          }}
        >
          {error}
        </div>
      )}

      <div style={{ marginBottom: '16px' }}>
        <label
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: '#6B675E',
            marginBottom: '8px',
            fontFamily: 'IBM Plex Sans, sans-serif',
          }}
        >
          Email Address
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="analyst@example.com"
          required
          autoComplete="email"
          style={{
            width: '100%',
            height: '40px',
            padding: '0 12px',
            borderRadius: '6px',
            border: '1px solid #DDD8CB',
            backgroundColor: '#FFFFFF',
            fontSize: '15px',
            color: '#1B1B18',
            fontFamily: 'IBM Plex Sans, sans-serif',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 150ms ease, box-shadow 150ms ease',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#C8501E';
            e.target.style.boxShadow = '0 0 0 2px rgba(200, 80, 30, 0.3)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#DDD8CB';
            e.target.style.boxShadow = 'none';
          }}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: '#6B675E',
            marginBottom: '8px',
            fontFamily: 'IBM Plex Sans, sans-serif',
          }}
        >
          Password (min. 8 characters)
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          autoComplete="new-password"
          style={{
            width: '100%',
            height: '40px',
            padding: '0 12px',
            borderRadius: '6px',
            border: '1px solid #DDD8CB',
            backgroundColor: '#FFFFFF',
            fontSize: '15px',
            color: '#1B1B18',
            fontFamily: 'IBM Plex Sans, sans-serif',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 150ms ease, box-shadow 150ms ease',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#C8501E';
            e.target.style.boxShadow = '0 0 0 2px rgba(200, 80, 30, 0.3)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#DDD8CB';
            e.target.style.boxShadow = 'none';
          }}
        />
      </div>

      <div style={{ marginBottom: '24px' }}>
        <label
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: '#6B675E',
            marginBottom: '8px',
            fontFamily: 'IBM Plex Sans, sans-serif',
          }}
        >
          Confirm Password
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
          required
          autoComplete="new-password"
          style={{
            width: '100%',
            height: '40px',
            padding: '0 12px',
            borderRadius: '6px',
            border: '1px solid #DDD8CB',
            backgroundColor: '#FFFFFF',
            fontSize: '15px',
            color: '#1B1B18',
            fontFamily: 'IBM Plex Sans, sans-serif',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 150ms ease, box-shadow 150ms ease',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#C8501E';
            e.target.style.boxShadow = '0 0 0 2px rgba(200, 80, 30, 0.3)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#DDD8CB';
            e.target.style.boxShadow = 'none';
          }}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        style={{
          width: '100%',
          height: '36px',
          backgroundColor: '#C8501E',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: 500,
          fontFamily: 'IBM Plex Sans, sans-serif',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.4 : 1,
          transition: 'background-color 150ms ease, opacity 150ms ease',
        }}
        onMouseOver={(e) => {
          if (!loading) e.currentTarget.style.backgroundColor = '#b04316';
        }}
        onMouseOut={(e) => {
          if (!loading) e.currentTarget.style.backgroundColor = '#C8501E';
        }}
      >
        {loading ? 'Creating account...' : 'Create Account'}
      </button>

      <div
        style={{
          marginTop: '24px',
          textAlign: 'center',
          fontSize: '14px',
          color: '#6B675E',
          fontFamily: 'IBM Plex Sans, sans-serif',
        }}
      >
        Already have an account?{' '}
        <Link
          to="/login"
          style={{
            color: '#C8501E',
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          Sign In
        </Link>
      </div>
    </form>
  );
};
