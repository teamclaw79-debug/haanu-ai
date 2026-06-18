'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { AgentAvatar } from '@/components/agent-avatar';
import { Mail, ArrowRight, Sparkles } from 'lucide-react';

// Minimal email sanity check — we don't need a full RFC validator for an
// email-only sign-in flow, just enough to catch obvious typos.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SignInPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signIn = useAppStore((s) => s.signIn);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Please enter your email address.');
      return;
    }
    if (!EMAIL_RE.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      await signIn(trimmed);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign-in failed. Please try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-border/50 bg-card/50 backdrop-blur-xl">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center mb-2">
              <AgentAvatar size="lg" />
            </div>
            <CardTitle className="text-2xl font-bold">Welcome to Haanu</CardTitle>
            <CardDescription className="text-muted-foreground">
              Your AI agent that can browse, research, code, and complete real tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="pl-10"
                    required
                  />
                </div>
                {error && (
                  <p className="text-xs text-red-500 mt-1" role="alert">
                    {error}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                disabled={isLoading || !email.trim()}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Continue with Email
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Secure &amp; Private
                </span>
              </div>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              By continuing, you agree to our Terms of Service and Privacy Policy.
              Your chats are saved locally and synced across sessions.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
