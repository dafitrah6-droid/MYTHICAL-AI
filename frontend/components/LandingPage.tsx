import React from 'react';
import { motion } from 'framer-motion';
import { Hexagon, Sparkles, Shield, Zap, ChevronRight } from 'lucide-react';

interface LandingPageProps {
  onOpenAuth: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenAuth }) => {
  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 relative overflow-hidden flex flex-col">
      {/* Ambient Background Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-zinc-800/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-zinc-800/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <Hexagon className="w-8 h-8 text-zinc-100" strokeWidth={1.5} />
          <span className="font-semibold tracking-widest text-sm">MYTHICAL</span>
        </div>
        <button 
          onClick={onOpenAuth}
          className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm font-medium backdrop-blur-md transition-all duration-300"
        >
          Sign In
        </button>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 relative z-10 flex flex-col items-center justify-center px-4 text-center max-w-5xl mx-auto w-full mt-[-5vh]">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8">
          <Sparkles className="w-4 h-4 text-zinc-400" />
          <span className="text-xs font-medium text-zinc-300 tracking-wide uppercase">Mythical Engine v2.0 Live</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-light tracking-tight mb-6 leading-tight">
          Intelligence, <br className="hidden md:block" />
          <span className="font-semibold bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 to-zinc-500">
            Refined.
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mb-10 font-light leading-relaxed">
          Experience a premium AI assistant designed for clarity, speed, and absolute privacy. 
          Your thoughts, perfectly augmented.
        </p>
        
        <motion.button
          onClick={onOpenAuth}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          className="group flex items-center gap-2 px-8 py-4 bg-zinc-100 text-zinc-950 hover:bg-white rounded-full text-base font-medium transition-all duration-300 shadow-[0_0_40px_rgba(255,255,255,0.1)] hover:shadow-[0_0_60px_rgba(255,255,255,0.2)]"
        >
          Begin Journey
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </motion.button>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 w-full">
          <FeatureCard 
            icon={<Zap className="w-5 h-5" />}
            title="Instantaneous"
            description="Zero-latency responses powered by optimized edge infrastructure."
          />
          <FeatureCard 
            icon={<Shield className="w-5 h-5" />}
            title="Private by Design"
            description="Enterprise-grade encryption. Your data never trains our models."
          />
          <FeatureCard 
            icon={<Hexagon className="w-5 h-5" />}
            title="Core Memory"
            description="Persistent context that learns your preferences over time."
          />
        </div>
      </main>
    </div>
  );
};

const FeatureCard: React.FC<{ icon: React.ReactNode, title: string, description: string }> = ({ icon, title, description }) => (
  <motion.div
    whileHover={{ y: -6 }}
    whileTap={{ scale: 0.995 }}
    transition={{ duration: 0.2, ease: 'easeOut' }}
    className="flex flex-col items-center text-center p-6 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-sm hover:bg-white/[0.04] transition-colors"
  >
    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-4 text-zinc-200">
      {icon}
    </div>
    <h3 className="text-base font-medium text-zinc-200 mb-2">{title}</h3>
    <p className="text-sm text-zinc-500 leading-relaxed">{description}</p>
  </motion.div>
);
