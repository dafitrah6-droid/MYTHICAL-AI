import React from 'react';
import { BrainCircuit, Search, Trash2 } from 'lucide-react';
import { MemoryItem } from '../types';

interface MemoryViewProps {
  memories: MemoryItem[];
}

export const MemoryView: React.FC<MemoryViewProps> = ({ memories }) => {
  return (
    <div className="flex flex-col h-full bg-[#030303] relative">
      <div className="absolute top-1/4 left-0 w-[400px] h-[400px] bg-zinc-800/10 blur-[100px] pointer-events-none" />

      <div className="relative z-10 p-8 md:p-12 border-b border-white/5 bg-white/[0.01] backdrop-blur-xl">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <BrainCircuit className="w-6 h-6 text-zinc-100" />
            <h1 className="text-3xl font-light text-zinc-100 tracking-tight">Core Memory</h1>
          </div>
          <p className="text-sm text-zinc-400">Manage the persistent context and facts Mythical has learned about you.</p>
        </div>
      </div>

      <div className="relative z-10 p-8 md:p-12 flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Search/Filter Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search memories..." 
              className="w-full bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm text-zinc-200 focus:outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all shadow-lg"
            />
          </div>

          {/* Memory List */}
          <div className="space-y-3">
            {memories.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 text-sm">
                No memories extracted yet. Chat with Mythical to build context.
              </div>
            ) : (
              memories.map(memory => (
                <div key={memory.id} className="group flex items-start justify-between p-5 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.04] hover:border-white/10 transition-all backdrop-blur-sm">
                  <div>
                    <span className="inline-block px-2.5 py-1 bg-white/10 border border-white/5 text-zinc-300 text-xs rounded-md mb-3 font-medium tracking-wide">
                      {memory.category}
                    </span>
                    <p className="text-sm text-zinc-200 leading-relaxed">{memory.content}</p>
                    <p className="text-xs text-zinc-600 mt-3 font-medium">
                      {new Date(memory.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button className="text-zinc-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all p-2">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
