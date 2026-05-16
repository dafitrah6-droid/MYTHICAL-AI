import React from 'react';
import { MessageSquare, BrainCircuit, Clock, ArrowUpRight, Activity } from 'lucide-react';
import { User } from '../types';

interface DashboardProps {
  user: User | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  return (
    <div className="flex flex-col h-full bg-[#030303] relative overflow-y-auto">
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
            value="12"
            trend="+2 this week"
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
            <button className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1">
              View all <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-3">
            {[
              { title: 'Project Architecture Discussion', time: '2 hours ago', type: 'chat' },
              { title: 'Updated preference: Code formatting', time: '5 hours ago', type: 'memory' },
              { title: 'Analyzed Q3 Financial Report.pdf', time: 'Yesterday', type: 'file' },
            ].map((item, i) => (
              <div key={i} className="group flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 backdrop-blur-md hover:bg-white/[0.04] transition-all cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-zinc-400 group-hover:text-zinc-200 transition-colors">
                    {item.type === 'chat' ? <MessageSquare className="w-4 h-4" /> : 
                     item.type === 'memory' ? <BrainCircuit className="w-4 h-4" /> : 
                     <Clock className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-200">{item.title}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{item.time}</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: string, trend: string, valueColor?: string }> = ({ icon, label, value, trend, valueColor = "text-zinc-100" }) => (
  <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md flex flex-col gap-4">
    <div className="flex items-center justify-between">
      <div className="text-zinc-400">{icon}</div>
      <span className="text-xs font-medium text-zinc-500 bg-white/5 px-2 py-1 rounded-md">{trend}</span>
    </div>
    <div>
      <p className={`text-3xl font-semibold tracking-tight ${valueColor}`}>{value}</p>
      <p className="text-sm text-zinc-500 mt-1">{label}</p>
    </div>
  </div>
);
