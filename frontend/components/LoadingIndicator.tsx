import React from 'react';
import { motion } from 'framer-motion';

export const LoadingIndicator: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="w-full max-w-4xl mx-auto rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.18)]"
    >
      <div className="flex flex-col gap-4">
        <div className="h-3 w-3/5 rounded-full bg-white/10 animate-pulse" />
        <div className="space-y-3">
          <div className="h-3 w-full rounded-full bg-white/10 animate-pulse" />
          <div className="h-3 w-4/5 rounded-full bg-white/10 animate-pulse" />
          <div className="h-3 w-2/5 rounded-full bg-white/10 animate-pulse" />
        </div>
        <p className="text-sm text-zinc-400">{message}</p>
      </div>
    </motion.div>
  );
};
