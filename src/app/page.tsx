'use client';

import { useAppStore } from '@/lib/store';
import { LandingPage } from '@/components/landing';
import { AgentChat } from '@/components/agent-chat';
import { SignInPage } from '@/components/sign-in';
import { AnimatePresence, motion } from 'framer-motion';

export default function Home() {
  const view = useAppStore((s) => s.view);
  const user = useAppStore((s) => s.user);
  
  return (
    <AnimatePresence mode="wait">
      {view === 'signin' || (!user && view !== 'landing') ? (
        <motion.div
          key="signin"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <SignInPage />
        </motion.div>
      ) : view === 'landing' ? (
        <motion.div
          key="landing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <LandingPage />
        </motion.div>
      ) : (
        <motion.div
          key="chat"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <AgentChat />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
