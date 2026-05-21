import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { User, Shield, Bell, Palette, Key, Moon, Sun, Copy, Trash2, CheckCircle } from 'lucide-react';
import { fetchUserProfile, updateUserProfile, fetchApiKeys, createApiKey, revokeApiKey, deleteAccount } from '../services/userService';
import type { UserProfilePayload, ApiKeyItem } from '../services/userService';

const tabs = [
  { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
  { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" /> },
  { id: 'apikeys', label: 'API Keys', icon: <Key className="w-4 h-4" /> },
  { id: 'danger', label: 'Danger Zone', icon: <Shield className="w-4 h-4" /> },
];

type TabKey = 'profile' | 'appearance' | 'apikeys' | 'danger';

export const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('profile');
  const [profile, setProfile] = useState<UserProfilePayload>({ id: 'demo-user', name: 'Admin User', email: 'admin@mythical.ai' });
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark';
    return (localStorage.getItem('mythical-theme') as 'dark' | 'light') || 'dark';
  });
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('mythical-theme', theme);
  }, [theme]);

  useEffect(() => {
    fetchUserProfile().then((data) => setProfile(data)).catch(() => undefined);
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    setIsLoadingKeys(true);
    try {
      const keys = await fetchApiKeys();
      setApiKeys(keys);
    } finally {
      setIsLoadingKeys(false);
    }
  };

  const handleProfileSave = async () => {
    setIsSaving(true);
    setStatusMessage('Saving profile...');
    try {
      const updated = await updateUserProfile({ name: profile.name, email: profile.email });
      setProfile(updated);
      setStatusMessage('Profile saved successfully.');
    } catch (error: any) {
      setStatusMessage(error?.message || 'Failed to save profile.');
    } finally {
      setIsSaving(false);
      window.setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  const handleThemeToggle = () => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  };

  const handleCopyKey = async (key: ApiKeyItem) => {
    await navigator.clipboard.writeText(key.maskedKey);
    setStatusMessage('API key copied to clipboard.');
    window.setTimeout(() => setStatusMessage(''), 2500);
  };

  const handleRevokeKey = async (keyId: string) => {
    setIsLoadingKeys(true);
    try {
      await revokeApiKey(keyId);
      setApiKeys((prev) => prev.filter((item) => item.id !== keyId));
      setStatusMessage('API key revoked.');
    } finally {
      setIsLoadingKeys(false);
      window.setTimeout(() => setStatusMessage(''), 2500);
    }
  };

  const handleCreateKey = async () => {
    setIsCreatingKey(true);
    try {
      const key = await createApiKey();
      setApiKeys((prev) => [key, ...prev]);
      setStatusMessage('New API key generated.');
    } catch (error: any) {
      setStatusMessage(error?.message || 'Failed to create API key.');
    } finally {
      setIsCreatingKey(false);
      window.setTimeout(() => setStatusMessage(''), 2500);
    }
  };

  const confirmDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') return;
    await deleteAccount();
    window.location.reload();
  };

  const tabContent = useMemo(() => {
    switch (activeTab) {
      case 'profile':
        return (
          <section className="p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border)] backdrop-blur-md space-y-6">
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-semibold text-[var(--text)]">Profile Information</h2>
              <p className="text-sm text-zinc-400">Update your display name and email address. Changes are persisted to your account profile.</p>
            </div>
            <div className="grid gap-4">
              <label className="text-xs uppercase tracking-wider text-zinc-500">Display Name</label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm text-[var(--text)] outline-none transition focus:border-zinc-500"
              />
              <label className="text-xs uppercase tracking-wider text-zinc-500">Email Address</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile((prev) => ({ ...prev, email: e.target.value }))}
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm text-[var(--text)] outline-none transition focus:border-zinc-500"
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                onClick={handleProfileSave}
                disabled={isSaving}
                className="inline-flex items-center justify-center rounded-2xl bg-zinc-100 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-white disabled:opacity-60"
              >
                {isSaving ? 'Saving...' : 'Update Profile'}
              </button>
              {statusMessage && <span className="text-sm text-zinc-400">{statusMessage}</span>}
            </div>
          </section>
        );
      case 'appearance':
        return (
          <section className="p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border)] backdrop-blur-md space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-[var(--text)]">Appearance</h2>
              <p className="text-sm text-zinc-400">Choose your preferred color mode; theme changes are applied instantly.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-[var(--text)]">Current theme</p>
                <p className="text-sm text-zinc-400">{theme === 'dark' ? 'Dark mode' : 'Light mode'}</p>
              </div>
              <button
                onClick={handleThemeToggle}
                className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-5 py-3 text-sm text-[var(--text)] transition hover:border-zinc-500"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode
              </button>
            </div>
          </section>
        );
      case 'apikeys':
        return (
          <section className="p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border)] backdrop-blur-md space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-[var(--text)]">API Keys</h2>
              <p className="text-sm text-zinc-400">Manage your API keys, copy them quickly, or revoke access at any time.</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-zinc-400">Active keys</p>
                <p className="text-xs text-zinc-500">Stored safely and revocable on demand.</p>
              </div>
              <button
                onClick={handleCreateKey}
                disabled={isCreatingKey}
                className="inline-flex items-center gap-2 rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-white disabled:opacity-60"
              >
                {isCreatingKey ? 'Generating...' : 'Create API Key'}
              </button>
            </div>

            <div className="space-y-3">
              {isLoadingKeys ? (
                <p className="text-sm text-zinc-400">Loading API keys…</p>
              ) : apiKeys.length === 0 ? (
                <p className="text-sm text-zinc-400">No API keys found. Generate one to get started.</p>
              ) : (
                apiKeys.map((key) => (
                  <div key={key.id} className="flex flex-col gap-3 rounded-3xl border border-[var(--border)] bg-[var(--bg)] p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium text-[var(--text)]">{key.name}</p>
                        <p className="text-xs text-zinc-500">Created {new Date(key.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyKey(key)}
                          className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text)] transition hover:border-zinc-500"
                        >
                          <Copy className="w-3.5 h-3.5" /> Copy
                        </button>
                        <button
                          onClick={() => handleRevokeKey(key.id)}
                          className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300 transition hover:bg-red-500/20"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Revoke
                        </button>
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white/5 p-3 text-xs text-zinc-200">{key.maskedKey}</div>
                  </div>
                ))
              )}
            </div>

            {statusMessage && <p className="text-sm text-zinc-400">{statusMessage}</p>}
          </section>
        );
      case 'danger':
        return (
          <section className="p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border)] backdrop-blur-md space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-red-300">Danger Zone</h2>
              <p className="text-sm text-zinc-400">Permanently delete your account and all associated data. This action cannot be undone.</p>
            </div>
            <div className="space-y-4">
              <div className="rounded-3xl bg-red-950/10 border border-red-900/20 p-5">
                <p className="text-sm text-red-200">Type <span className="font-semibold text-red-100">DELETE</span> below to confirm account deletion.</p>
                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  className="mt-3 w-full rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm text-[var(--text)] outline-none"
                />
              </div>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex items-center gap-2 rounded-2xl bg-red-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-400"
              >
                <Trash2 className="w-4 h-4" /> Delete Account
              </button>
            </div>
            {statusMessage && <p className="text-sm text-zinc-400">{statusMessage}</p>}
          </section>
        );
      default:
        return null;
    }
  }, [activeTab, profile, isSaving, statusMessage, theme, apiKeys, isLoadingKeys, isCreatingKey, deleteConfirm, showDeleteModal]);

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] text-[var(--text)] relative overflow-y-auto">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-zinc-800/10 blur-[120px] pointer-events-none" />
      <div className="relative z-10 p-8 md:p-12 max-w-5xl mx-auto w-full">
        <div className="mb-10">
          <h1 className="text-3xl font-light tracking-tight mb-2">Settings</h1>
          <p className="text-sm text-zinc-400">Manage your account preferences and system configurations.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          <nav className="w-full md:w-64 flex flex-col gap-2 flex-shrink-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabKey)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-white/10 text-[var(--text)] border border-white/10 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.22 }}
              >
                {tabContent}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-md rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-6 shadow-2xl"
              initial={{ scale: 0.96, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 20 }}
              transition={{ duration: 0.18 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <Trash2 className="w-5 h-5 text-red-400" />
                <h2 className="text-lg font-semibold text-[var(--text)]">Confirm Delete Account</h2>
              </div>
              <p className="text-sm text-zinc-400 mb-5">This action will permanently remove your profile, sessions, and all associated data.</p>
              <div className="flex gap-3">
                <button
                  onClick={confirmDeleteAccount}
                  disabled={deleteConfirm !== 'DELETE'}
                  className="flex-1 rounded-2xl bg-red-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-400 disabled:opacity-60"
                >
                  Confirm Delete
                </button>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 rounded-2xl border border-[var(--border)] px-4 py-3 text-sm text-[var(--text)] transition hover:border-zinc-500"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
