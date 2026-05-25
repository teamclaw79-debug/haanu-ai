'use client';

import { useAppStore, ToolStep } from '@/lib/store';
import { connectSocket, sendMessage, stopAgent, disconnectSocket } from '@/lib/socket';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Bot,
  Send,
  Search,
  Code,
  ImageIcon,
  Loader2,
  ArrowLeft,
  StopCircle,
  Sparkles,
  Brain,
  Globe,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  X,
  Zap,
  Copy,
  Check,
  Monitor,
  MousePointerClick,
  Eye,
  BookOpen,
  Maximize2,
  Minimize2,
  ExternalLink,
} from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';

function ToolStepCard({ step }: { step: ToolStep }) {
  const [expanded, setExpanded] = useState(false);

  const toolConfig: Record<string, { icon: typeof Search; label: string; color: string; bg: string }> = {
    web_search: { icon: Search, label: 'Web Search', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    image_generation: { icon: ImageIcon, label: 'Image Generation', color: 'text-pink-500', bg: 'bg-pink-500/10' },
    code_generation: { icon: Code, label: 'Code Generation', color: 'text-orange-500', bg: 'bg-orange-500/10' },
    page_reader: { icon: BookOpen, label: 'Read Page', color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
    browser_open: { icon: Globe, label: 'Open Website', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    browser_snapshot: { icon: Eye, label: 'Analyze Page', color: 'text-violet-500', bg: 'bg-violet-500/10' },
    browser_click: { icon: MousePointerClick, label: 'Click', color: 'text-amber-500', bg: 'bg-amber-500/10' },
    browser_fill: { icon: Code, label: 'Fill Field', color: 'text-teal-500', bg: 'bg-teal-500/10' },
    browser_type: { icon: Code, label: 'Type Text', color: 'text-teal-500', bg: 'bg-teal-500/10' },
    browser_press: { icon: Code, label: 'Press Key', color: 'text-gray-500', bg: 'bg-gray-500/10' },
    browser_scroll: { icon: Monitor, label: 'Scroll', color: 'text-gray-500', bg: 'bg-gray-500/10' },
    browser_screenshot: { icon: Monitor, label: 'Screenshot', color: 'text-violet-500', bg: 'bg-violet-500/10' },
    browser_close: { icon: X, label: 'Close Browser', color: 'text-gray-500', bg: 'bg-gray-500/10' },
    browser_wait: { icon: Loader2, label: 'Wait', color: 'text-gray-400', bg: 'bg-gray-400/10' },
    browser_get_url: { icon: Globe, label: 'Get URL', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    browser_get_text: { icon: BookOpen, label: 'Get Text', color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
    analyze_screenshot: { icon: Brain, label: 'AI Vision', color: 'text-purple-500', bg: 'bg-purple-500/10' },
  };

  const config = toolConfig[step.tool] || { icon: Zap, label: step.tool, color: 'text-muted-foreground', bg: 'bg-muted' };
  const Icon = config.icon;

  const isBrowserTool = step.tool.startsWith('browser_');

  const getResultPreview = () => {
    if (!step.result) return null;
    if (typeof step.result === 'string') return step.result;
    if (step.tool === 'web_search' && Array.isArray(step.result)) {
      return step.result.slice(0, 3).map((r: { name?: string; snippet?: string; url?: string }, i: number) => (
        <div key={i} className="text-xs py-1.5 border-b border-border/50 last:border-0">
          <div className="font-medium text-foreground">{r.name || 'Result'}</div>
          <div className="text-muted-foreground line-clamp-2">{r.snippet || ''}</div>
        </div>
      ));
    }
    if (step.tool === 'image_generation' && typeof step.result === 'object' && step.result !== null) {
      const result = step.result as { base64?: string; prompt?: string };
      if (result.base64) {
        return (
          <div className="mt-2">
            <img
              src={`data:image/png;base64,${result.base64}`}
              alt={result.prompt || 'Generated image'}
              className="rounded-lg max-w-full max-h-64 object-contain"
            />
          </div>
        );
      }
    }
    if (step.tool === 'code_generation' && typeof step.result === 'object' && step.result !== null) {
      const result = step.result as { code?: string; language?: string };
      if (result.code) {
        return (
          <pre className="mt-2 p-3 rounded-lg bg-muted/50 text-xs overflow-x-auto max-h-48 overflow-y-auto">
            <code>{result.code}</code>
          </pre>
        );
      }
    }
    if (isBrowserTool && typeof step.result === 'object' && step.result !== null) {
      const result = step.result as Record<string, unknown>;
      if (result.snapshot) {
        return (
          <pre className="mt-2 p-3 rounded-lg bg-muted/50 text-xs overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap">
            {result.snapshot as string}
          </pre>
        );
      }
      if (result.newSnapshot) {
        return (
          <pre className="mt-2 p-3 rounded-lg bg-muted/50 text-xs overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap">
            {result.newSnapshot as string}
          </pre>
        );
      }
      if (result.elements) {
        return (
          <pre className="mt-2 p-3 rounded-lg bg-muted/50 text-xs overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap">
            {result.elements as string}
          </pre>
        );
      }
      if (result.analysis) {
        return (
          <div className="mt-2 text-xs text-foreground whitespace-pre-wrap">
            {result.analysis as string}
          </div>
        );
      }
      if (result.url) {
        return <div className="text-xs text-emerald-500 font-mono">{result.url as string}</div>;
      }
      if (result.text) {
        return <div className="text-xs text-muted-foreground">{(result.text as string).substring(0, 500)}</div>;
      }
      if (result.content) {
        return <div className="text-xs text-muted-foreground">{(result.content as string).substring(0, 500)}</div>;
      }
    }
    return JSON.stringify(step.result, null, 2).substring(0, 500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`border rounded-xl p-3 bg-card/50 ${
        isBrowserTool ? 'border-blue-500/20 bg-blue-500/5' : 'border-border/50'
      }`}
    >
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-lg ${config.bg} flex items-center justify-center`}>
          <Icon className={`w-3.5 h-3.5 ${config.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{config.label}</span>
            {step.status === 'running' && (
              <Loader2 className="w-3 h-3 animate-spin text-emerald-500" />
            )}
            {step.status === 'completed' && (
              <Check className="w-3 h-3 text-emerald-500" />
            )}
            {step.status === 'error' && (
              <X className="w-3 h-3 text-red-500" />
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {step.tool === 'web_search' && `Searching: ${(step.input as { query?: string }).query}`}
            {step.tool === 'browser_open' && `Opening: ${(step.input as { url?: string }).url}`}
            {step.tool === 'browser_click' && `Clicking: @${(step.input as { ref?: string }).ref}`}
            {step.tool === 'browser_fill' && `Filling @${(step.input as { ref?: string }).ref}: ${(step.input as { text?: string }).text?.substring(0, 30)}`}
            {step.tool === 'browser_snapshot' && 'Reading page elements...'}
            {step.tool === 'analyze_screenshot' && 'AI analyzing page...'}
            {step.tool === 'page_reader' && `Reading: ${(step.input as { url?: string }).url}`}
            {step.tool === 'image_generation' && `Creating: ${(step.input as { prompt?: string }).prompt?.substring(0, 40)}`}
            {step.tool === 'code_generation' && `Writing: ${(step.input as { description?: string }).description?.substring(0, 40)}`}
          </p>
        </div>
        {step.result && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 text-xs text-muted-foreground max-h-64 overflow-y-auto">
              {getResultPreview()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ThinkingIndicator({ step }: { step: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex items-center gap-2 text-sm text-muted-foreground"
    >
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" />
      </div>
      <Brain className="w-4 h-4 text-emerald-500" />
      <span>{step}</span>
    </motion.div>
  );
}

function ChatMessage({ message, toolSteps, screenshot, onScreenshotClick }: { message: { id: string; role: string; content: string; isStreaming?: boolean; }; toolSteps: ToolStep[]; screenshot: string | null; onScreenshotClick: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isUser = message.role === 'user';
  const isBrowserTool = toolSteps.some(s => s.tool.startsWith('browser_'));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${
        isUser
          ? 'bg-muted'
          : 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25'
      }`}>
        {isUser ? (
          <span className="text-sm font-medium">U</span>
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      <div className={`flex-1 max-w-[85%] space-y-2 ${isUser ? 'text-right' : ''}`}>
        {/* Browser screenshot - compact inline view */}
        {!isUser && screenshot && (
          <button
            onClick={onScreenshotClick}
            className="block w-full rounded-xl overflow-hidden border border-border/50 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div className="bg-muted/50 px-3 py-1.5 flex items-center gap-2 border-b border-border/50">
              <Monitor className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Browser View</span>
              <ExternalLink className="w-3 h-3 text-muted-foreground ml-auto" />
            </div>
            <img
              src={`data:image/png;base64,${screenshot}`}
              alt="Browser screenshot"
              className="w-full object-contain max-h-64 bg-white"
            />
          </button>
        )}

        {/* Tool steps */}
        {!isUser && toolSteps.length > 0 && (
          <div className="space-y-2 mb-3">
            {toolSteps.map((step) => (
              <ToolStepCard key={step.id} step={step} />
            ))}
          </div>
        )}

        {/* Message content */}
        <div className={`inline-block text-left rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white'
            : 'bg-muted/50 border border-border/50'
        }`}>
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Streaming indicator */}
        {!isUser && message.isStreaming && (
          <span className="inline-block w-2 h-4 bg-emerald-500 animate-pulse ml-1 align-middle" />
        )}

        {/* Copy button */}
        {!isUser && !message.isStreaming && message.content && (
          <button
            onClick={handleCopy}
            className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>
    </motion.div>
  );
}

const quickActions = [
  { icon: Globe, label: 'Browse Website', prompt: 'Go to' },
  { icon: Search, label: 'Research', prompt: 'Research the latest developments in' },
  { icon: Code, label: 'Code', prompt: 'Write code to' },
  { icon: ImageIcon, label: 'Create Image', prompt: 'Generate an image of' },
  { icon: MousePointerClick, label: 'Sign Up', prompt: 'Go to' },
  { icon: Brain, label: 'Analyze', prompt: 'Analyze and summarize the following' },
];

export function AgentChat() {
  const {
    sessionId,
    messages,
    isAgentRunning,
    currentThinking,
    currentToolSteps,
    currentScreenshot,
    setView,
    addUserMessage,
    setAgentRunning,
    clearChat,
    setCurrentScreenshot,
  } = useAppStore();

  const [input, setInput] = useState('');
  const [browserExpanded, setBrowserExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentThinking, currentToolSteps, currentScreenshot]);

  // Connect socket on mount
  useEffect(() => {
    const socket = connectSocket();

    return () => {
      disconnectSocket();
    };
  }, [sessionId]);

  const handleSend = useCallback(() => {
    if (!input.trim() || isAgentRunning) return;

    const userMessage = input.trim();
    setInput('');
    setCurrentScreenshot(null);
    addUserMessage(userMessage);
    setAgentRunning(true);

    // Create placeholder assistant message
    useAppStore.getState().messages.push({
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    });
    useAppStore.setState({ messages: [...useAppStore.getState().messages] });

    sendMessage(sessionId, userMessage);
  }, [input, isAgentRunning, sessionId, addUserMessage, setAgentRunning, setCurrentScreenshot]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (prompt: string) => {
    setInput(prompt + ' ');
    inputRef.current?.focus();
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setView('landing')} className="h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/25">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-sm">Haanu Agent</span>
              {isAgentRunning && (
                <Badge variant="outline" className="text-xs border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Working
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Browser indicator */}
            {currentScreenshot && (
              <Badge variant="outline" className="text-xs border-blue-500/30 bg-blue-500/5 text-blue-600 dark:text-blue-400">
                <Monitor className="w-3 h-3 mr-1" />
                Browser Active
              </Badge>
            )}
            <Button variant="ghost" size="icon" onClick={clearChat} className="h-8 w-8 text-muted-foreground hover:text-foreground" title="New chat">
              <RotateCcw className="w-4 h-4" />
            </Button>
            {isAgentRunning && (
              <Button variant="outline" size="sm" onClick={() => stopAgent(sessionId)} className="text-xs border-red-500/30 hover:bg-red-500/10 text-red-500">
                <StopCircle className="w-3 h-3 mr-1" />
                Stop
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Expanded browser panel overlay */}
      <AnimatePresence>
        {browserExpanded && currentScreenshot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setBrowserExpanded(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-5xl max-h-[85vh] flex flex-col rounded-xl overflow-hidden border border-border shadow-2xl bg-white"
            >
              <div className="bg-muted/80 backdrop-blur px-4 py-2.5 flex items-center gap-2 border-b border-border/50">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 bg-background/50 rounded-md px-3 py-1 text-xs text-muted-foreground flex items-center gap-1.5">
                  <Globe className="w-3 h-3" />
                  <span>Haanu Browser — Live View</span>
                </div>
                <button
                  onClick={() => setBrowserExpanded(false)}
                  className="p-1.5 hover:bg-background/50 rounded-md transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <div className="flex-1 overflow-auto bg-white">
                <img
                  src={`data:image/png;base64,${currentScreenshot}`}
                  alt="Browser view"
                  className="w-full object-contain"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div ref={scrollRef} className="max-w-4xl mx-auto px-4 py-6">
            {!hasMessages ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/25">
                    <Bot className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">What can I do for you?</h2>
                  <p className="text-muted-foreground max-w-md mx-auto mb-8">
                    I can browse websites, fill forms, sign up for services, research, code, create images, and much more. Just tell me what you need.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg mx-auto">
                    {quickActions.map((action) => (
                      <button
                        key={action.label}
                        onClick={() => handleQuickAction(action.prompt)}
                        className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/50 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all duration-200"
                      >
                        <action.icon className="w-5 h-5 text-emerald-500" />
                        <span className="text-xs font-medium">{action.label}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((msg, i) => {
                  const isLastAssistant = msg.role === 'assistant' && i === messages.length - 1;
                  return (
                    <div key={msg.id} className="group">
                      <ChatMessage
                        message={msg}
                        toolSteps={isLastAssistant ? currentToolSteps : []}
                        screenshot={isLastAssistant ? currentScreenshot : null}
                        onScreenshotClick={() => setBrowserExpanded(true)}
                      />
                    </div>
                  );
                })}
                {currentThinking && isAgentRunning && (
                  <ThinkingIndicator step={currentThinking} />
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Input */}
      <div className="border-t border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isAgentRunning ? 'Agent is working...' : 'Ask Haanu to do anything — browse, sign up, research, code...'}
                disabled={isAgentRunning}
                rows={1}
                className="w-full resize-none rounded-xl border border-border/50 bg-muted/30 px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 disabled:opacity-50 min-h-[48px] max-h-[120px]"
                style={{ height: 'auto', overflow: 'hidden' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                }}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isAgentRunning}
                size="icon"
                className="absolute right-2 bottom-2 h-8 w-8 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted-foreground">
              <Sparkles className="w-3 h-3 inline mr-1" />
              Haanu can browse websites, fill forms, and complete real tasks
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Monitor className="w-3 h-3" />
              Browser
              <Separator orientation="vertical" className="h-3" />
              <Globe className="w-3 h-3" />
              Search
              <Separator orientation="vertical" className="h-3" />
              <Eye className="w-3 h-3" />
              Vision
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
