import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, BrainCircuit, Clock, ArrowUpRight, Activity } from 'lucide-react';
import { User } from '../types';

interface DashboardProps {
  user: User | null;
  onOpenConversation?: (conversationId: string) => void;
}

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onOpenConversation }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/chat/conversations');
      if (response.ok) {
        const data = await response.json();
        setConversations(data.slice(0, 3));
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      setConversations([]);
    } finally {
      setLoadingConversations(false);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const getActivityType = (title: string): 'chat' | 'memory' | 'file' => {
    if (title.toLowerCase().includes('pdf') || title.toLowerCase().includes('file')) return 'file';
    if (title.toLowerCase().includes('memory') || title.toLowerCase().includes('note')) return 'memory';
    return 'chat';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="flex flex-col h-full bg-[#030303] relative overflow-y-auto"
    >
      {/* Ambient Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-zinc-800/10 blur-[100px] pointer-events-none" />

      <div className="relative z-10 p-8 md:p-12 max-w-6xl mx-auto w-full space-y-8">
        
        {/* Header */}
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-light text-zinc-100 tracking-tight">
            Welcome back, <span className="font-semibold">{user?.name.split(' ')[0] || 'User'}</span>.
          </h1>
          <p className="text-zinc-400 text-sm">Here is an overview of your intelligence workspace.</p>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard 
            icon={<MessageSquare className="w-5 h-5" />}
            label="Active Threads"
            value={conversations.length.toString()}
            trend={`${conversations.length > 0 ? 'Active' : 'No'} conversations`}
          />
          <StatCard 
            icon={<BrainCircuit className="w-5 h-5" />}
            label="Memory Nodes"
            value="1,048"
            trend="Optimized"
          />
          <StatCard 
            icon={<Activity className="w-5 h-5" />}
            label="System Status"
            value="Optimal"
            trend="99.9% uptime"
            valueColor="text-emerald-400"
          />
        </div>

        {/* Recent Activity */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-zinc-200">Recent Activity</h2>
            <motion.button
              whileHover={{ x: 2 }}
              className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1"
            >
              View all <ArrowUpRight className="w-4 h-4" />
            </motion.button>
          </div>
          
          <div className="space-y-3">
            {loadingConversations ? (
              <div className="text-center text-zinc-500 py-8">Loading conversations...</div>
            ) : conversations.length === 0 ? (
              <div className="text-center text-zinc-500 py-8">Start a conversation to see activity here.</div>
            ) : (
              conversations.map((conv, i) => {
                const activityType = getActivityType(conv.title);
                return (
                  <motion.button
                    key={conv.id}
                    onClick={() => onOpenConversation?.(conv.id)}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.995 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="group w-full text-left flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 backdrop-blur-md hover:bg-white/[0.04] transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-zinc-400 group-hover:text-zinc-200 transition-colors">
                        {activityType === 'chat' ? <MessageSquare className="w-4 h-4" /> : 
                         activityType === 'memory' ? <BrainCircuit className="w-4 h-4" /> : 
                         <Clock className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-200">{conv.title}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{getTimeAgo(conv.updatedAt)}</p>
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                  </motion.button>
                );
              })
            )}
          </div>
        </div>

      </div>
    </motion.div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: string, trend: string, valueColor?: string }> = ({ icon, label, value, trend, valueColor = "text-zinc-100" }) => (
  <motion.div
    whileHover={{ y: -4 }}
    transition={{ duration: 0.25, ease: 'easeOut' }}
    className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md flex flex-col gap-4"
  >
    <div className="flex items-center justify-between">
      <div className="text-zinc-400">{icon}</div>
      <span className="text-xs font-medium text-zinc-500 bg-white/5 px-2 py-1 rounded-md">{trend}</span>
    </div>
    <div>
      <p className={`text-3xl font-semibold tracking-tight ${valueColor}`}>{value}</p>
      <p className="text-sm text-zinc-500 mt-1">{label}</p>
    </div>
  </motion.div>
);
