import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sidebar } from './components/Sidebar';
import { ChatInterface } from './components/ChatInterface';
import { MemoryView } from './components/MemoryView';
import { AuthModal } from './components/AuthModal';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { SettingsView } from './components/SettingsView';
import { AppView, User, MemoryItem } from './types';

const MOCK_USER: User = {
  id: 'u1',
  name: 'Admin User',
  email: 'admin@mythical.ai'
};

const INITIAL_MEMORIES: MemoryItem[] = [
  { id: '1', category: 'Preferences', content: 'User prefers concise, technical explanations.', createdAt: Date.now() },
  { id: '2', category: 'Context', content: 'Working on a React SPA project named Mythical AI.', createdAt: Date.now() - 86400000 },
];

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [user, setUser] = useState<User | null>(null);
  
  // Lifted state for AI Memory Engine data flow
  const [memories, setMemories] = useState<MemoryItem[]>(INITIAL_MEMORIES);

  const handleAuthenticate = async (mode: 'login' | 'register', payload: { name?: string; email: string; password: string }) => {
    try {
      const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/session';
      const body = mode === 'register'
        ? { name: payload.name, email: payload.email, password: payload.password }
        : { email: payload.email, password: payload.password };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        console.error('Authentication failed:', errorPayload || response.statusText);
        return;
      }

      const { token, user } = await response.json();
      if (!token) {
        console.error('Authentication failed: missing token');
        return;
      }

      localStorage.setItem('auth_token', token);
      setIsAuthenticated(true);
      setUser(user ?? MOCK_USER);
      setShowAuthModal(false);
      setCurrentView('dashboard');
    } catch (error) {
      console.error('Authentication error:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_token');

    setIsAuthenticated(false);
    setUser(null);
    setCurrentView('dashboard');
  };

  const handleAddMemory = (newMemory: Omit<MemoryItem, 'id' | 'createdAt'>) => {
    const memory: MemoryItem = {
      ...newMemory,
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      createdAt: Date.now()
    };
    setMemories(prev => [memory, ...prev]);
  };

  const renderMainContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard user={user} />;
      case 'chat':
        return <ChatInterface memories={memories} onAddMemory={handleAddMemory} />;
      case 'memory':
        return <MemoryView memories={memories} />;
      case 'settings':
        return <SettingsView />;
      default:
        return <Dashboard user={user} />;
    }
  };

  if (!isAuthenticated) {
    return (
      <>
        <LandingPage onOpenAuth={() => setShowAuthModal(true)} />
        <AnimatePresence>
          {showAuthModal && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            >
              <AuthModal 
                onAuthenticate={handleAuthenticate} 
                onClose={() => setShowAuthModal(false)} 
              />
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#030303] overflow-hidden">
      <Sidebar 
        currentView={currentView} 
        onViewChange={setCurrentView} 
        user={user}
        onLogout={handleLogout}
      />
      
      <main className="flex-1 relative flex flex-col min-w-0">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ duration: 0.32, ease: 'easeOut' }}
            className="flex-1"
          >
            {renderMainContent()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
