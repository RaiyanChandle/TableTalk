import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Failed to log out:', err);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header className="h-14 px-6 bg-white border-b border-[#DDD8CB] flex items-center justify-between shrink-0 z-30">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-sm bg-[#C8501E] flex items-center justify-center text-white">
          <Database size={16} />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-serif font-bold text-[#1F1E1B] text-lg tracking-tight">
            TableTalk
          </span>
          <span className="text-[10px] font-mono uppercase bg-[#EFECE4] text-[#6E6A60] px-1.5 py-0.5 rounded border border-[#DDD8CB] font-medium">
            TableTalk
          </span>
        </div>
      </div>

      {/* User Actions */}
      {user && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-[#1F1E1B] bg-[#FAF9F6] px-2.5 py-1.5 rounded border border-[#DDD8CB]">
            <UserIcon size={13} className="text-[#6E6A60]" />
            <span className="font-medium">{user.email}</span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#6E6A60] hover:text-[#C8501E] hover:bg-[#FAF9F6] border border-[#DDD8CB] rounded transition-colors"
            title="Log out of session"
          >
            <LogOut size={13} />
            <span>{loggingOut ? 'Signing out...' : 'Logout'}</span>
          </button>
        </div>
      )}
    </header>
  );
};
