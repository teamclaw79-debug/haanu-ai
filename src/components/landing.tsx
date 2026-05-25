'use client';

import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import {
  Bot,
  Search,
  Code,
  ImageIcon,
  Sparkles,
  Zap,
  Shield,
  Globe,
  ArrowRight,
  ChevronRight,
  Cpu,
  Eye,
  Target,
  Layers,
  Moon,
  Sun,
} from 'lucide-react';

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.1 } },
};

const features = [
  {
    icon: Search,
    title: 'Deep Web Research',
    description: 'Search the web in real-time, analyze multiple sources, and synthesize comprehensive answers with citations.',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: Code,
    title: 'Code Generation',
    description: 'Write, debug, and analyze code in any language. From simple scripts to complex applications.',
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
  },
  {
    icon: Globe,
    title: 'Browser Automation',
    description: 'Navigate websites, fill forms, click buttons, sign up for services — Haanu does it all like a real user.',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    icon: ImageIcon,
    title: 'Image Creation',
    description: 'Generate stunning images from text descriptions. Create visuals for any purpose instantly.',
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
  },
  {
    icon: Eye,
    title: 'AI Vision',
    description: 'Haanu can see and understand web pages using AI vision — reading screenshots, finding elements, and more.',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
  {
    icon: Target,
    title: 'Autonomous Execution',
    description: 'Give Haanu a task and watch it autonomously plan, browse, research, and execute until completion.',
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
  },
  {
    icon: Layers,
    title: 'Tool Integration',
    description: 'Seamlessly combines browser, search, code, images, and vision to accomplish complex goals.',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
];

const steps = [
  {
    number: '01',
    title: 'Describe Your Task',
    description: 'Tell Haanu what you need in natural language. Be as specific or as broad as you want.',
    icon: Sparkles,
  },
  {
    number: '02',
    title: 'Agent Plans & Executes',
    description: 'Haanu breaks down your task, selects the right tools, and executes each step autonomously.',
    icon: Cpu,
  },
  {
    number: '03',
    title: 'Get Complete Results',
    description: 'Receive a comprehensive answer with all the research, code, images, and analysis you need.',
    icon: Zap,
  },
];

const examplePrompts = [
  'Go to github.com and sign up for a new account',
  'Research the latest AI regulations in the EU and create a summary report',
  'Browse amazon.com and find the best wireless headphones under $100',
  'Go to twitter.com and see what\'s trending today',
];

export function LandingPage() {
  const { setView, theme, toggleTheme } = useAppStore();

  const startChat = () => {
    setView('chat');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">Haanu</span>
              <Badge variant="secondary" className="text-xs font-normal hidden sm:inline-flex">
                AI Agent
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="text-muted-foreground hover:text-foreground"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex text-muted-foreground hover:text-foreground"
              >
                Documentation
              </Button>
              <Button
                onClick={startChat}
                size="sm"
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25"
              >
                Launch Agent
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          {/* Background effects */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
            <div className="absolute top-20 right-1/4 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-1/2 w-72 h-72 bg-cyan-500/5 rounded-full blur-3xl" />
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-32 pb-20 sm:pb-24">
            <motion.div
              className="text-center max-w-4xl mx-auto"
              initial="initial"
              animate="animate"
              variants={stagger}
            >
              <motion.div variants={fadeInUp}>
                <Badge
                  variant="outline"
                  className="mb-6 px-4 py-1.5 text-sm border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Autonomous AI Agent — Free to Use
                </Badge>
              </motion.div>

              <motion.h1
                variants={fadeInUp}
                className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-6"
              >
                Your AI Agent That{' '}
                <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 bg-clip-text text-transparent">
                  Gets Things Done
                </span>
              </motion.h1>

              <motion.p
                variants={fadeInUp}
                className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
              >
                Haanu is an autonomous AI agent that plans, researches, codes, and creates — turning your ideas into
                reality. Just describe what you need.
              </motion.p>

              <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                <Button
                  onClick={startChat}
                  size="lg"
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-xl shadow-emerald-500/25 text-lg px-8 py-6"
                >
                  Start Using Haanu — It&apos;s Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="text-lg px-8 py-6 border-border/50 hover:border-emerald-500/50 hover:bg-emerald-500/5"
                >
                  See How It Works
                  <ChevronRight className="w-5 h-5 ml-1" />
                </Button>
              </motion.div>

              {/* Example prompts */}
              <motion.div variants={fadeInUp} className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl mx-auto">
                {examplePrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={startChat}
                    className="text-left text-sm p-3 rounded-xl border border-border/50 bg-card/50 hover:bg-emerald-500/5 hover:border-emerald-500/30 transition-all duration-200 text-muted-foreground hover:text-foreground"
                  >
                    <span className="text-emerald-500 mr-2">→</span>
                    {prompt}
                  </button>
                ))}
              </motion.div>
            </motion.div>

            {/* Hero Image */}
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="mt-16 max-w-5xl mx-auto"
            >
              <div className="relative rounded-2xl overflow-hidden border border-border/50 shadow-2xl shadow-emerald-500/10">
                <div className="bg-gradient-to-b from-emerald-500/5 to-transparent p-2">
                  <div className="flex items-center gap-2 px-4 py-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/80" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                      <div className="w-3 h-3 rounded-full bg-green-500/80" />
                    </div>
                    <div className="flex-1 text-center">
                      <span className="text-xs text-muted-foreground">Haanu Agent — Live Session</span>
                    </div>
                  </div>
                </div>
                <img
                  src="/haanu-hero.png"
                  alt="Haanu AI Agent Interface"
                  className="w-full object-cover"
                />
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 sm:py-28 relative">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background via-emerald-500/[0.02] to-background" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true, margin: '-100px' }}
              variants={stagger}
              className="text-center mb-16"
            >
              <motion.div variants={fadeInUp}>
                <Badge variant="outline" className="mb-4 border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400">
                  Capabilities
                </Badge>
              </motion.div>
              <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl font-bold mb-4">
                Everything You Need,{' '}
                <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                One Agent
                </span>
              </motion.h2>
              <motion.p variants={fadeInUp} className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Haanu combines multiple AI capabilities into a single autonomous agent that handles complex tasks end-to-end.
              </motion.p>
            </motion.div>

            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true, margin: '-100px' }}
              variants={stagger}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {features.map((feature) => (
                <motion.div key={feature.title} variants={fadeInUp}>
                  <Card className="h-full border-border/50 hover:border-emerald-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/5 group">
                    <CardHeader>
                      <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                        <feature.icon className={`w-6 h-6 ${feature.color}`} />
                      </div>
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm leading-relaxed">{feature.description}</CardDescription>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 sm:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true, margin: '-100px' }}
              variants={stagger}
              className="text-center mb-16"
            >
              <motion.div variants={fadeInUp}>
                <Badge variant="outline" className="mb-4 border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400">
                  How It Works
                </Badge>
              </motion.div>
              <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl font-bold mb-4">
                Three Steps to{' '}
                <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                  Any Result
                </span>
              </motion.h2>
            </motion.div>

            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true, margin: '-100px' }}
              variants={stagger}
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
            >
              {steps.map((step, i) => (
                <motion.div key={step.number} variants={fadeInUp} className="relative">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/25">
                      <step.icon className="w-8 h-8 text-white" />
                    </div>
                    <span className="text-5xl font-black text-emerald-500/10 absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2">
                      {step.number}
                    </span>
                    <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
                  </div>
                  {i < steps.length - 1 && (
                    <div className="hidden md:block absolute top-8 right-0 translate-x-1/2">
                      <ArrowRight className="w-6 h-6 text-emerald-500/30" />
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 sm:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative rounded-3xl overflow-hidden"
            >
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-10 sm:p-16 text-center">
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-4 left-4 w-32 h-32 border border-white/20 rounded-full" />
                  <div className="absolute bottom-4 right-4 w-48 h-48 border border-white/20 rounded-full" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-white/10 rounded-full" />
                </div>
                <div className="relative">
                  <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                    Ready to Let AI Do the Work?
                  </h2>
                  <p className="text-emerald-100 text-lg mb-8 max-w-2xl mx-auto">
                    Join thousands of users who are already using Haanu to research, code, and create — all for free.
                  </p>
                  <Button
                    onClick={startChat}
                    size="lg"
                    className="bg-white text-emerald-700 hover:bg-emerald-50 shadow-xl text-lg px-8 py-6"
                  >
                    Launch Haanu Now
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-semibold text-sm">Haanu</span>
              <span className="text-xs text-muted-foreground">© 2025</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                Free Forever
              </span>
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Privacy First
              </span>
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                Real-time AI
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
