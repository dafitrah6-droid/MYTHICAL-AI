import React from 'react';
import { MessageSquare, BrainCircuit, Settings, LogOut, Plus, Hexagon, LayoutDashboard } from 'lucide-react';
import { AppView, User } from '../types';

interface SidebarProps {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
  user: User | null;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, user, onLogout }) => {
  return (
    <div className="w-64 h-full bg-[#030303]/80 backdrop-blur-2xl border-r border-white/5 flex flex-col flex-shrink-0 relative z-20">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-white/5">
        <Hexagon className="w-6 h-6 text-zinc-100 mr-3" strokeWidth={1.5} />
        <span className="font-semibold tracking-widest text-sm text-zinc-100">MYTHICAL</span>
      </div>

      {/* New Chat Action */}
      <div className="p-4">
        <button className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/5 text-zinc-100 transition-all py-2.5 rounded-xl text-sm font-medium shadow-lg">
          <Plus className="w-4 h-4" />
          New Thread
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        <NavItem 
          icon={<LayoutDashboard className="w-4 h-4" />} 
          label="Dashboard" 
          isActive={currentView === 'dashboard'} 
          onClick={() => onViewChange('dashboard')} 
        />
        <NavItem 
          icon={<MessageSquare className="w-4 h-4" />} 
          label="Chat" 
          isActive={currentView === 'chat'} 
          onClick={() => onViewChange('chat')} 
        />
        <NavItem 
          icon={<BrainCircuit className="w-4 h-4" />} 
          label="Memory" 
          isActive={currentView === 'memory'} 
          onClick={() => onViewChange('memory')} 
        />
        <NavItem 
          icon={<Settings className="w-4 h-4" />} 
          label="Settings" 
          isActive={currentView === 'settings'} 
          onClick={() => onViewChange('settings')} 
        />
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-white/5 bg-white/[0.02]">
        {user ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-white/10 border border-white/5 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium text-zinc-200">{user.name.charAt(0)}</span>
              </div>
              <div className="truncate">
                <p className="text-sm font-medium text-zinc-200 truncate">{user.name}</p>
                <p className="text-xs text-zinc-500 truncate">{user.email}</p>
              </div>
            </div>
            <button onClick={onLogout} className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 rounded-md hover:bg-white/5">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="text-sm text-zinc-500 text-center">Not authenticated</div>
        )}
      </div>
    </div>
  );
};

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
        isActive 
          ? 'bg-white/10 text-zinc-100 font-medium border border-white/5 shadow-sm' 
          : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
      }`}
    >
      {icon}
      {label}
    </button>
  );
};
