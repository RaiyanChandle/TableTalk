import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/login');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  return (
    <header
      style={{
        height: '56px',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F6F4EF',
        borderBottom: '1px solid #DDD8CB',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span
          style={{
            fontFamily: 'Newsreader, Georgia, serif',
            fontSize: '20px',
            fontWeight: 500,
            color: '#1B1B18',
            letterSpacing: '-0.01em',
          }}
        >
          ChatQL
        </span>
      </div>

      {user && (
        <div style={{ position: 'relative' }} ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '8px 12px',
              fontFamily: 'IBM Plex Sans, sans-serif',
              fontSize: '14px',
              color: menuOpen ? '#1B1B18' : '#6B675E',
              cursor: 'pointer',
              borderRadius: '6px',
              transition: 'color 150ms ease, background-color 150ms ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = '#1B1B18';
              e.currentTarget.style.backgroundColor = '#EFECE4';
            }}
            onMouseOut={(e) => {
              if (!menuOpen) {
                e.currentTarget.style.color = '#6B675E';
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            Account
          </button>

          {menuOpen && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 4px)',
                width: '240px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #DDD8CB',
                borderRadius: '6px',
                padding: '12px 16px',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: 'IBM Plex Sans, sans-serif',
                    fontSize: '12px',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: '#6B675E',
                    marginBottom: '4px',
                  }}
                >
                  Signed In As
                </div>
                <div
                  style={{
                    fontFamily: 'IBM Plex Sans, sans-serif',
                    fontSize: '14px',
                    color: '#1B1B18',
                    wordBreak: 'break-all',
                  }}
                >
                  {user.email}
                </div>
              </div>

              <div style={{ height: '1px', backgroundColor: '#DDD8CB' }} />

              <button
                type="button"
                onClick={handleLogout}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  padding: '6px 0',
                  fontFamily: 'IBM Plex Sans, sans-serif',
                  fontSize: '14px',
                  color: '#C8501E',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  transition: 'color 150ms ease',
                }}
                onMouseOver={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseOut={(e) => (e.currentTarget.style.textDecoration = 'none')}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
