import React, { useState } from 'react';
import { Hexagon, X } from 'lucide-react';

interface AuthModalProps {
  onLogin: () => void;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onLogin, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xl flex items-center justify-center z-50 p-4">
      <div className="relative bg-[#09090b]/80 border border-white/10 rounded-3xl w-full max-w-md p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
        
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-zinc-500 hover:text-zinc-300 transition-colors p-1 rounded-full hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center mb-8 mt-4">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-inner">
            <Hexagon className="w-6 h-6 text-zinc-100" strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-light text-zinc-100 tracking-tight">
            {isLogin ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-sm text-zinc-500 mt-2">
            Enter your details to access Mythical AI
          </p>
        </div>

        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onLogin(); }}>
          {!isLogin && (
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5 ml-1">Name</label>
              <input 
                type="text" 
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 focus:bg-black/60 transition-all"
                placeholder="John Doe"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5 ml-1">Email</label>
            <input 
              type="email" 
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 focus:bg-black/60 transition-all"
              placeholder="name@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5 ml-1">Password</label>
            <input 
              type="password" 
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 focus:bg-black/60 transition-all"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-zinc-100 text-zinc-950 font-medium py-3 rounded-xl hover:bg-white transition-all mt-8 text-sm shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
          >
            {isLogin ? 'Sign In' : 'Continue'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>

      </div>
    </div>
  );
};
