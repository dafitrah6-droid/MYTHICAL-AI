import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Shield, Bell, Palette, Key, Copy, Trash2, Plus, Moon, Sun, Monitor, Check, X } from 'lucide-react';

type TabType = 'profile' | 'appearance' | 'api-keys' | 'notifications' | 'privacy';
type Theme = 'light' | 'dark' | 'system';

interface ApiKey {
  id: string;
  name: string;
  maskedKey: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [theme, setTheme] = useState<Theme>('dark');
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState({
    emailUpdates: true,
    securityAlerts: true,
    weeklyDigest: false,
  });
  const [displayName, setDisplayName] = useState('Admin User');
  const [email, setEmail] = useState('admin@mythical.ai');

  useEffect(() => {
    if (activeTab === 'api-keys') {
      fetchApiKeys();
    }
  }, [activeTab]);

  const fetchApiKeys = async () => {
    setLoadingKeys(true);
    try {
      const response = await fetch('/api/user/api-keys');
      if (response.ok) {
        const keys = await response.json();
        setApiKeys(keys);
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    } finally {
      setLoadingKeys(false);
    }
  };

  const handleCreateApiKey = async () => {
    try {
      const response = await fetch('/api/user/api-keys', { method: 'POST' });
      if (response.ok) {
        const newKey = await response.json();
        setApiKeys([...apiKeys, newKey]);
        if (newKey.value) {
          navigator.clipboard.writeText(newKey.value);
          setCopiedKeyId(newKey.id);
          setTimeout(() => setCopiedKeyId(null), 2000);
        }
      }
    } catch (error) {
      console.error('Failed to create API key:', error);
    }
  };

  const handleDeleteApiKey = async (keyId: string) => {
    try {
      const response = await fetch(`/api/user/api-keys/${keyId}`, { method: 'DELETE' });
      if (response.ok) {
        setApiKeys(apiKeys.filter(k => k.id !== keyId));
      }
    } catch (error) {
      console.error('Failed to delete API key:', error);
    }
  };

  const handleCopyKey = (keyId: string) => {
    setCopiedKeyId(keyId);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const handleSaveProfile = async () => {
    try {
      await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: displayName, email }),
      });
    } catch (error) {
      console.error('Failed to save profile:', error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="flex flex-col h-full bg-[#030303] relative overflow-y-auto"
    >
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-zinc-800/10 blur-[120px] pointer-events-none" />

      <div className="relative z-10 p-8 md:p-12 max-w-4xl mx-auto w-full">
        <div className="mb-10">
          <h1 className="text-3xl font-light text-zinc-100 tracking-tight mb-2">Settings</h1>
          <p className="text-sm text-zinc-400">Manage your account preferences and system configurations.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Settings Navigation */}
          <nav className="w-full md:w-64 flex flex-col gap-1 flex-shrink-0">
            {(['profile', 'appearance', 'api-keys', 'notifications', 'privacy'] as TabType[]).map(tab => (
              <SettingsTab
                key={tab}
                icon={
                  tab === 'profile' ? <User className="w-4 h-4" /> :
                  tab === 'appearance' ? <Palette className="w-4 h-4" /> :
                  tab === 'api-keys' ? <Key className="w-4 h-4" /> :
                  tab === 'notifications' ? <Bell className="w-4 h-4" /> :
                  <Shield className="w-4 h-4" />
                }
                label={tab.charAt(0).toUpperCase() + tab.slice(1).replace('-', ' ')}
                isActive={activeTab === tab}
                onClick={() => setActiveTab(tab)}
              />
            ))}
          </nav>

          {/* Settings Content */}
          <div className="flex-1">
            <AnimatePresence mode="wait">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
                  <section className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md space-y-6">
                    <h2 className="text-lg font-medium text-zinc-200 border-b border-white/5 pb-4">Profile Information</h2>
                    <div className="flex items-center gap-6">
                      <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center text-2xl font-medium text-zinc-300 border border-white/10">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                      <motion.button
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium text-zinc-200 transition-colors"
                      >
                        Change Avatar
                      </motion.button>
                    </div>
                    <div className="space-y-4">
                      <div className="grid gap-2">
                        <label className="text-xs font-medium text-zinc-400">Display Name</label>
                        <input 
                          type="text" 
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 transition-colors"
                        />
                      </div>
                      <div className="grid gap-2">
                        <label className="text-xs font-medium text-zinc-400">Email Address</label>
                        <input 
                          type="email" 
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 transition-colors"
                        />
                      </div>
                      <motion.button
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSaveProfile}
                        className="px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/10 rounded-lg text-sm font-medium text-zinc-200 transition-colors"
                      >
                        Save Changes
                      </motion.button>
                    </div>
                  </section>
                  <section className="p-6 rounded-2xl bg-red-950/10 border border-red-900/20 backdrop-blur-md space-y-4">
                    <h2 className="text-lg font-medium text-red-400">Danger Zone</h2>
                    <p className="text-sm text-zinc-500">Permanently delete your account and all associated data. This action cannot be undone.</p>
                    <motion.button
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-sm font-medium text-red-400 transition-colors"
                    >
                      Delete Account
                    </motion.button>
                  </section>
                </motion.div>
              )}

              {/* Appearance Tab */}
              {activeTab === 'appearance' && (
                <motion.div key="appearance" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <section className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md space-y-6">
                    <h2 className="text-lg font-medium text-zinc-200 border-b border-white/5 pb-4">Appearance Settings</h2>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-zinc-300 mb-3 block">Theme</label>
                        <div className="flex gap-3">
                          {(['light', 'dark', 'system'] as Theme[]).map(t => (
                            <motion.button
                              key={t}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setTheme(t)}
                              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                                theme === t 
                                  ? 'bg-white/10 border-white/20 text-zinc-100' 
                                  : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10'
                              }`}
                            >
                              {t === 'light' && <Sun className="w-4 h-4" />}
                              {t === 'dark' && <Moon className="w-4 h-4" />}
                              {t === 'system' && <Monitor className="w-4 h-4" />}
                              {t.charAt(0).toUpperCase() + t.slice(1)}
                            </motion.button>
                          ))}
                        </div>
                      </div>
                      <div className="pt-4 border-t border-white/5">
                        <p className="text-xs text-zinc-500">Currently selected: <span className="text-zinc-300 font-medium">{theme.charAt(0).toUpperCase() + theme.slice(1)} Mode</span></p>
                      </div>
                    </div>
                  </section>
                </motion.div>
              )}

              {/* API Keys Tab */}
              {activeTab === 'api-keys' && (
                <motion.div key="api-keys" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <section className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md space-y-6">
                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                      <h2 className="text-lg font-medium text-zinc-200">API Keys</h2>
                      <motion.button
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleCreateApiKey}
                        disabled={loadingKeys}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/15 border border-white/10 rounded-lg text-xs font-medium text-zinc-200 transition-colors disabled:opacity-50"
                      >
                        <Plus className="w-3 h-3" /> New Key
                      </motion.button>
                    </div>
                    {loadingKeys ? (
                      <div className="text-center text-zinc-400">Loading...</div>
                    ) : apiKeys.length === 0 ? (
                      <div className="text-center text-zinc-500 py-8">No API keys yet. Create one to get started.</div>
                    ) : (
                      <div className="space-y-3">
                        {apiKeys.map(key => (
                          <div key={key.id} className="flex items-center justify-between p-3 bg-black/30 border border-white/5 rounded-lg">
                            <div>
                              <p className="text-sm font-medium text-zinc-200">{key.name}</p>
                              <p className="text-xs text-zinc-500">Created {new Date(key.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-zinc-400">{key.maskedKey}</span>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleCopyKey(key.id)}
                                className={`p-1.5 rounded transition-colors ${
                                  copiedKeyId === key.id
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'hover:bg-white/10 text-zinc-400'
                                }`}
                              >
                                {copiedKeyId === key.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleDeleteApiKey(key.id)}
                                className="p-1.5 hover:bg-red-500/20 rounded transition-colors text-zinc-400 hover:text-red-400"
                              >
                                <Trash2 className="w-4 h-4" />
                              </motion.button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </motion.div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <motion.div key="notifications" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <section className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md space-y-6">
                    <h2 className="text-lg font-medium text-zinc-200 border-b border-white/5 pb-4">Notification Preferences</h2>
                    <div className="space-y-4">
                      {[
                        { key: 'emailUpdates', label: 'Email Updates', desc: 'Receive updates about new features and improvements' },
                        { key: 'securityAlerts', label: 'Security Alerts', desc: 'Get notified of security events and login attempts' },
                        { key: 'weeklyDigest', label: 'Weekly Digest', desc: 'Receive a weekly summary of your activity' },
                      ].map(item => (
                        <motion.button
                          key={item.key}
                          whileHover={{ scale: 1.01 }}
                          onClick={() => setNotifications({
                            ...notifications,
                            [item.key]: !notifications[item.key as keyof typeof notifications]
                          })}
                          className="w-full flex items-center justify-between p-4 bg-black/30 border border-white/5 rounded-lg hover:border-white/10 transition-all"
                        >
                          <div className="flex-1 text-left">
                            <p className="text-sm font-medium text-zinc-200">{item.label}</p>
                            <p className="text-xs text-zinc-500">{item.desc}</p>
                          </div>
                          <div className={`w-5 h-5 rounded border transition-all ${
                            notifications[item.key as keyof typeof notifications]
                              ? 'bg-emerald-500/20 border-emerald-500/50'
                              : 'border-white/10'
                          }`}>
                            {notifications[item.key as keyof typeof notifications] && (
                              <Check className="w-4 h-4 text-emerald-400 m-auto" />
                            )}
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </section>
                </motion.div>
              )}

              {/* Privacy Tab */}
              {activeTab === 'privacy' && (
                <motion.div key="privacy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <section className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md space-y-6">
                    <h2 className="text-lg font-medium text-zinc-200 border-b border-white/5 pb-4">Privacy Settings</h2>
                    <div className="space-y-4">
                      <div className="p-4 bg-black/30 border border-white/5 rounded-lg">
                        <p className="text-sm font-medium text-zinc-200 mb-2">Data Collection</p>
                        <p className="text-xs text-zinc-500">Your data is encrypted and stored securely. We never share your information with third parties.</p>
                      </div>
                      <div className="p-4 bg-black/30 border border-white/5 rounded-lg">
                        <p className="text-sm font-medium text-zinc-200 mb-2">Activity Logs</p>
                        <p className="text-xs text-zinc-500">View and manage your activity logs to see what data we've collected.</p>
                        <motion.button
                          whileHover={{ y: -1 }}
                          whileTap={{ scale: 0.98 }}
                          className="mt-3 px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/15 border border-white/10 rounded transition-colors text-zinc-200"
                        >
                          Download My Data
                        </motion.button>
                      </div>
                    </div>
                  </section>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const SettingsTab: React.FC<{ icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void }> = ({ icon, label, isActive, onClick }) => (
  <motion.button
    onClick={onClick}
    whileHover={{ x: 4 }}
    whileTap={{ scale: 0.98 }}
    transition={{ duration: 0.18 }}
    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
      isActive 
        ? 'bg-white/10 text-zinc-100 border border-white/5 shadow-sm' 
        : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
    }`}
  >
    {icon}
    {label}
  </motion.button>
);
