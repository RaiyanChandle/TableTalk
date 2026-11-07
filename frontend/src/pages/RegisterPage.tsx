import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RegisterForm } from '../components/auth/RegisterForm';
import { useAuth } from '../context/AuthContext';

export const RegisterPage: React.FC = () => {
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
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
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
            Create Account
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
            Start querying your datasets with plain English
          </p>

          <RegisterForm />
        </div>
      </div>
    </div>
  );
};
