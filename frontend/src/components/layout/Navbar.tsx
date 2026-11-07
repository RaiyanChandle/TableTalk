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
    <header className="h-14 px-6 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-xs z-30">
      {/* Brand */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-md bg-[#C8501E] flex items-center justify-center text-white shadow-xs">
          <Database size={16} />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-slate-900 text-base tracking-tight">
            TableTalk
          </span>
          <span className="text-[10px] font-mono uppercase bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 font-medium">
            v1.0
          </span>
        </div>
      </div>

      {/* User Actions */}
      {user && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-md border border-slate-200">
            <UserIcon size={13} className="text-slate-400" />
            <span className="font-medium text-slate-700">{user.email}</span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-md transition-colors"
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
