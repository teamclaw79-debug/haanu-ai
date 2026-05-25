import { create } from 'zustand';

export type ViewMode = 'landing' | 'chat';
export type Theme = 'light' | 'dark';

export interface ToolStep {
  id: string;
  tool: string;
  input: Record<string, unknown>;
  status: 'running' | 'completed' | 'error';
  result?: unknown;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  toolSteps?: ToolStep[];
  isStreaming?: boolean;
  thinking?: string;
  images?: string[];
}

interface AppState {
  view: ViewMode;
  setView: (view: ViewMode) => void;
  theme: Theme;
  toggleTheme: () => void;

  sessionId: string;
  messages: ChatMessage[];
  isAgentRunning: boolean;
  currentThinking: string | null;
  currentToolSteps: ToolStep[];
  currentScreenshot: string | null;

  addUserMessage: (content: string) => void;
  addAssistantMessage: (id: string) => void;
  updateAssistantMessage: (id: string, content: string) => void;
  finalizeAssistantMessage: (id: string, content: string) => void;
  setAgentRunning: (running: boolean) => void;
  setCurrentThinking: (thinking: string | null) => void;
  addToolStep: (step: ToolStep) => void;
  updateToolStep: (id: string, status: ToolStep['status'], result?: unknown) => void;
  clearToolSteps: () => void;
  setCurrentScreenshot: (screenshot: string | null) => void;
  clearChat: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  view: 'landing',
  setView: (view) => set({ view }),
  theme: 'dark',
  toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),

  sessionId: `haanu-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
  messages: [],
  isAgentRunning: false,
  currentThinking: null,
  currentToolSteps: [],
  currentScreenshot: null,

  addUserMessage: (content) => {
    const msg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    set((state) => ({ messages: [...state.messages, msg] }));
  },

  addAssistantMessage: (id) => {
    const msg: ChatMessage = {
      id,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    };
    set((state) => ({ messages: [...state.messages, msg] }));
  },

  updateAssistantMessage: (id, content) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, content: msg.content + content } : msg
      ),
    }));
  },

  finalizeAssistantMessage: (id, content) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, content, isStreaming: false, thinking: undefined } : msg
      ),
    }));
  },

  setAgentRunning: (running) => set({ isAgentRunning: running }),

  setCurrentThinking: (thinking) => set({ currentThinking: thinking }),

  addToolStep: (step) => {
    set((state) => ({ currentToolSteps: [...state.currentToolSteps, step] }));
  },

  updateToolStep: (id, status, result) => {
    set((state) => ({
      currentToolSteps: state.currentToolSteps.map((step) =>
        step.id === id ? { ...step, status, result } : step
      ),
    }));
  },

  clearToolSteps: () => set({ currentToolSteps: [] }),

  setCurrentScreenshot: (screenshot) => set({ currentScreenshot: screenshot }),

  clearChat: () =>
    set({
      messages: [],
      currentToolSteps: [],
      currentThinking: null,
      currentScreenshot: null,
      isAgentRunning: false,
      sessionId: `haanu-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    }),
}));
