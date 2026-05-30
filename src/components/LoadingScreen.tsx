import React from 'react';
import { motion } from 'motion/react';

interface LoadingScreenProps {
  appName: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ appName }) => {
  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
      className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center z-50 overflow-hidden"
    >
      {/* Ambient background blur circles */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-600/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-violet-600/20 rounded-full blur-[100px]" />

      <div className="relative text-center flex flex-col items-center">
        {/* Animated Shopping Bag Emoji */}
        <motion.div
          animate={{ 
            scale: [1, 1.15, 1],
            rotate: [0, -6, 6, -3, 3, 0] 
          }}
          transition={{ 
            repeat: Infinity, 
            duration: 2.2, 
            ease: 'easeInOut' 
          }}
          className="text-7xl mb-6 select-none"
        >
          🛍️
        </motion.div>

        {/* Brand Name with sleek purple gradient accent */}
        <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2 font-sans">
          {appName}<span className="text-violet-500">.</span>
        </h1>

        {/* Subtitle / Status */}
        <div className="flex items-center gap-1.5 mt-2">
          <span className="w-2 h-2 rounded-full bg-violet-500 animate-ping" />
          <p className="text-slate-400 font-mono text-xs tracking-widest uppercase">
            Loading...
          </p>
        </div>
      </div>
    </motion.div>
  );
};
