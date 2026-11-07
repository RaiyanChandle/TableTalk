import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-[#FAF7F2] text-[#261C14] relative p-6 overflow-hidden selection:bg-[#D05C2B]/20 selection:text-[#D05C2B]">
      {/* Ambient Warm Gradient Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[540px] h-[360px] bg-[#D05C2B]/7 rounded-full blur-3xl pointer-events-none animate-ambient-glow" />
      <div
        className="absolute bottom-1/4 right-1/3 w-[380px] h-[300px] bg-amber-400/8 rounded-full blur-3xl pointer-events-none animate-ambient-glow"
        style={{ animationDelay: '4.5s' }}
      />

      {/* Technical Grid Overlay ("boxy bg") */}
      <div
        className="absolute inset-0 pointer-events-none opacity-60 z-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(226, 219, 206, 0.45) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(226, 219, 206, 0.45) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />

      {/* Decorative Crosshair Marks (+) along grid lines */}
      <div className="absolute top-16 left-8 sm:left-16 text-[#D05C2B] font-mono text-sm select-none pointer-events-none animate-crosshair">
        +
      </div>
      <div
        className="absolute top-16 right-8 sm:right-16 text-[#D05C2B] font-mono text-sm select-none pointer-events-none animate-crosshair"
        style={{ animationDelay: '1.2s' }}
      >
        +
      </div>
      <div
        className="absolute bottom-16 left-8 sm:left-16 text-[#D05C2B] font-mono text-sm select-none pointer-events-none animate-crosshair"
        style={{ animationDelay: '2.4s' }}
      >
        +
      </div>
      <div
        className="absolute bottom-16 right-8 sm:right-16 text-[#D05C2B] font-mono text-sm select-none pointer-events-none animate-crosshair"
        style={{ animationDelay: '3.6s' }}
      >
        +
      </div>

      {/* Content Container */}
      <div className="relative z-10 w-full max-w-[420px] flex flex-col items-center mt-12 sm:mt-16">
        {/* Auth Card with dual archway crest */}
        <div className="relative w-full bg-white border border-[#DDD8CB] rounded-2xl pt-13 pb-8 px-8 sm:px-9 shadow-lg shadow-stone-900/5">
          {/* Outer concentric half-ring */}
          <div
            className="absolute -top-[68px] left-1/2 -translate-x-1/2 w-[136px] h-[69px] rounded-t-full border-t border-l border-r border-[#DDD8CB] pointer-events-none z-0"
            aria-hidden="true"
          />

          {/* Inner dome: upper outer boundary seamlessly continuing the card body */}
          <div
            className="absolute -top-[53px] left-1/2 -translate-x-1/2 w-[106px] h-[55px] rounded-t-full bg-white border-t border-l border-r border-[#DDD8CB] pointer-events-none z-10"
            aria-hidden="true"
          />

          {/* TableTalk Logo inside the crest */}
          <Link
            to="/"
            title="Back to TableTalk Home"
            className="absolute -top-10 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center select-none"
          >
            <img
              src="/logo.png"
              alt="TableTalk Logo"
              className="h-14 w-auto max-w-[82px] object-contain"
            />
          </Link>

          <h1 className="font-serif text-3xl font-medium text-[#261C14] mb-2 text-center">
            Sign In
          </h1>
          <p className="font-sans text-sm text-[#6E6A60] mb-6 text-center">
            Enter your email and password to continue
          </p>

          <LoginForm />
        </div>
      </div>
    </div>
  );
};
