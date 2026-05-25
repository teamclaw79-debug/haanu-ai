'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface AgentAvatarProps {
  size?: 'sm' | 'md' | 'lg';
  isThinking?: boolean;
  isWorking?: boolean;
}

export function AgentAvatar({ size = 'md', isThinking = false, isWorking = false }: AgentAvatarProps) {
  const [blink, setBlink] = useState(false);
  const [expression, setExpression] = useState<'neutral' | 'thinking' | 'working'>('neutral');

  // Auto-blink every few seconds
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, 4000 + Math.random() * 2000);

    return () => clearInterval(blinkInterval);
  }, []);

  // Update expression based on state
  useEffect(() => {
    if (isThinking) {
      setExpression('thinking');
    } else if (isWorking) {
      setExpression('working');
    } else {
      setExpression('neutral');
    }
  }, [isThinking, isWorking]);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div className={`${sizeClasses[size]} rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25 flex items-center justify-center relative overflow-hidden`}>
      {/* Animated glow effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"
        animate={{
          opacity: isThinking ? [0.3, 0.5, 0.3] : isWorking ? [0.2, 0.4, 0.2] : 0.1,
        }}
        transition={{
          duration: isThinking ? 1.5 : 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Futuristic ring animation when thinking/working */}
      {(isThinking || isWorking) && (
        <motion.div
          className="absolute inset-0 rounded-xl border-2 border-white/30"
          animate={{
            rotate: 360,
            scale: isThinking ? [1, 1.05, 1] : [1, 1.02, 1],
          }}
          transition={{
            rotate: { duration: 3, repeat: Infinity, ease: 'linear' },
            scale: { duration: isThinking ? 1.5 : 2, repeat: Infinity, ease: 'easeInOut' },
          }}
        />
      )}

      {/* Avatar face container */}
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        {/* Eyes container */}
        <div className="flex gap-1.5 items-center">
          {/* Left eye */}
          <motion.div
            className={`${iconSizes[size]} rounded-full bg-white relative overflow-hidden`}
            animate={{
              scaleY: blink ? 0.1 : 1,
            }}
            transition={{ duration: 0.1 }}
          >
            {/* Eye shine */}
            <motion.div
              className="absolute top-0 right-0 w-1/3 h-1/3 bg-white rounded-full"
              animate={{
                x: expression === 'thinking' ? [0, 1, 0] : expression === 'working' ? [0, -1, 0] : 0,
                y: expression === 'thinking' ? [0, -1, 0] : 0,
              }}
              transition={{
                duration: isThinking ? 0.8 : 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </motion.div>

          {/* Right eye */}
          <motion.div
            className={`${iconSizes[size]} rounded-full bg-white relative overflow-hidden`}
            animate={{
              scaleY: blink ? 0.1 : 1,
            }}
            transition={{ duration: 0.1 }}
          >
            {/* Eye shine */}
            <motion.div
              className="absolute top-0 right-0 w-1/3 h-1/3 bg-white rounded-full"
              animate={{
                x: expression === 'thinking' ? [0, 1, 0] : expression === 'working' ? [0, -1, 0] : 0,
                y: expression === 'thinking' ? [0, -1, 0] : 0,
              }}
              transition={{
                duration: isThinking ? 0.8 : 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </motion.div>
        </div>

        {/* Mouth indicator - subtle line below eyes */}
        <motion.div
          className={`absolute bottom-1.5 w-3 h-0.5 bg-white/60 rounded-full ${size === 'sm' ? 'scale-75' : size === 'lg' ? 'scale-125' : ''}`}
          animate={{
            scaleX: expression === 'thinking' ? [1, 1.2, 1] : expression === 'working' ? [1, 1.1, 1] : 1,
            opacity: expression === 'neutral' ? 0.4 : 0.8,
          }}
          transition={{
            duration: isThinking ? 2 : 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      {/* Particle effects when thinking */}
      {isThinking && (
        <>
          <motion.div
            className="absolute -top-1 -left-1 w-1 h-1 bg-white rounded-full"
            animate={{
              opacity: [0, 1, 0],
              x: [0, 2, 4],
              y: [0, -2, -4],
            }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
          />
          <motion.div
            className="absolute -top-1 -right-1 w-1 h-1 bg-white rounded-full"
            animate={{
              opacity: [0, 1, 0],
              x: [0, -2, -4],
              y: [0, -2, -4],
            }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
          />
        </>
      )}
    </div>
  );
}
