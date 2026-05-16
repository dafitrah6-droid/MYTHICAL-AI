import React, { useState } from 'react';
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

  const handleLogin = () => {
    setIsAuthenticated(true);
    setUser(MOCK_USER);
    setShowAuthModal(false);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
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
        {showAuthModal && (
          <AuthModal 
            onLogin={handleLogin} 
            onClose={() => setShowAuthModal(false)} 
          />
        )}
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
        {renderMainContent()}
      </main>
    </div>
  );
}
