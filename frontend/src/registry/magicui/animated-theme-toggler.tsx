import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';

interface AnimatedThemeTogglerProps {
  theme?: 'dark' | 'light';
  onToggle?: () => void;
}

export function AnimatedThemeToggler({ theme = 'light', onToggle }: AnimatedThemeTogglerProps) {
  return (
    <button
      onClick={onToggle}
      className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--surface-alt)] shadow-sm overflow-hidden relative cursor-pointer"
      title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      <AnimatePresence mode="wait" initial={false}>
        {theme === 'dark' ? (
          <motion.div
            key="sun"
            initial={{ rotate: -90, scale: 0, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 90, scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 16 }}
            className="flex items-center justify-center"
          >
            <Sun size={15} className="text-amber-500 fill-amber-500/20" />
          </motion.div>
        ) : (
          <motion.div
            key="moon"
            initial={{ rotate: 90, scale: 0, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: -90, scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 16 }}
            className="flex items-center justify-center"
          >
            <Moon size={15} className="text-stone-700 fill-stone-700/20" />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}
