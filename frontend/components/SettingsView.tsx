import React from 'react';
import { User, Shield, Bell, Palette, Key } from 'lucide-react';

export const SettingsView: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-[#030303] relative overflow-y-auto">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-zinc-800/10 blur-[120px] pointer-events-none" />

      <div className="relative z-10 p-8 md:p-12 max-w-4xl mx-auto w-full">
        <div className="mb-10">
          <h1 className="text-3xl font-light text-zinc-100 tracking-tight mb-2">Settings</h1>
          <p className="text-sm text-zinc-400">Manage your account preferences and system configurations.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Settings Navigation */}
          <nav className="w-full md:w-64 flex flex-col gap-1 flex-shrink-0">
            <SettingsTab icon={<User className="w-4 h-4" />} label="Profile" isActive={true} />
            <SettingsTab icon={<Palette className="w-4 h-4" />} label="Appearance" isActive={false} />
            <SettingsTab icon={<Key className="w-4 h-4" />} label="API Keys" isActive={false} />
            <SettingsTab icon={<Bell className="w-4 h-4" />} label="Notifications" isActive={false} />
            <SettingsTab icon={<Shield className="w-4 h-4" />} label="Privacy" isActive={false} />
          </nav>

          {/* Settings Content */}
          <div className="flex-1 space-y-8">
            
            {/* Profile Section */}
            <section className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md space-y-6">
              <h2 className="text-lg font-medium text-zinc-200 border-b border-white/5 pb-4">Profile Information</h2>
              
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center text-2xl font-medium text-zinc-300 border border-white/10">
                  A
                </div>
                <button className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium text-zinc-200 transition-colors">
                  Change Avatar
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid gap-2">
                  <label className="text-xs font-medium text-zinc-400">Display Name</label>
                  <input 
                    type="text" 
                    defaultValue="Admin User"
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 transition-colors"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-xs font-medium text-zinc-400">Email Address</label>
                  <input 
                    type="email" 
                    defaultValue="admin@mythical.ai"
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 transition-colors"
                  />
                </div>
              </div>
            </section>

            {/* Danger Zone */}
            <section className="p-6 rounded-2xl bg-red-950/10 border border-red-900/20 backdrop-blur-md space-y-4">
              <h2 className="text-lg font-medium text-red-400">Danger Zone</h2>
              <p className="text-sm text-zinc-500">Permanently delete your account and all associated data. This action cannot be undone.</p>
              <button className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-sm font-medium text-red-400 transition-colors">
                Delete Account
              </button>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
};

const SettingsTab: React.FC<{ icon: React.ReactNode, label: string, isActive: boolean }> = ({ icon, label, isActive }) => (
  <button className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
    isActive 
      ? 'bg-white/10 text-zinc-100 border border-white/5 shadow-sm' 
      : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
  }`}>
    {icon}
    {label}
  </button>
);
