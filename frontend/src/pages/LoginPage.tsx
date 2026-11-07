import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginForm } from '../components/auth/LoginForm';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/app', { replace: true });
    }
  }, [user, loading, navigate]);

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F6F4EF',
        padding: '24px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div style={{ marginBottom: '32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img
            src="/logo.svg"
            alt="TableTalk"
            style={{ width: '44px', height: '44px', objectFit: 'contain', marginBottom: '8px' }}
          />
          <span
            style={{
              fontFamily: 'Newsreader, Georgia, serif',
              fontSize: '28px',
              fontWeight: 600,
              color: '#1B1B18',
              letterSpacing: '-0.02em',
            }}
          >
            TableTalk
          </span>
        </div>

        <div
          style={{
            width: '100%',
            backgroundColor: '#FFFFFF',
            border: '1px solid #DDD8CB',
            borderRadius: '6px',
            padding: '32px 24px',
            boxSizing: 'border-box',
          }}
        >
          <h1
            style={{
              fontFamily: 'Newsreader, Georgia, serif',
              fontSize: '28px',
              fontWeight: 400,
              color: '#1B1B18',
              marginBottom: '8px',
              textAlign: 'center',
            }}
          >
            Sign In
          </h1>
          <p
            style={{
              fontFamily: 'IBM Plex Sans, sans-serif',
              fontSize: '15px',
              color: '#6B675E',
              marginBottom: '24px',
              textAlign: 'center',
            }}
          >
            Enter your email and password to continue
          </p>

          <LoginForm />
        </div>
      </div>
    </div>
  );
};
