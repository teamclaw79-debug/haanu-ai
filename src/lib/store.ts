import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ViewMode = 'landing' | 'chat' | 'signin';
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

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  createdAt: number;
  lastUpdated: number;
}

export interface User {
  id: string;
  email: string;
  name?: string;
}

interface AppState {
  view: ViewMode;
  setView: (view: ViewMode) => void;
  theme: Theme;
  toggleTheme: () => void;

  // User authentication
  user: User | null;
  setUser: (user: User | null) => void;
  signIn: (email: string) => Promise<void>;
  signOut: () => void;

  sessionId: string;
  sessions: ChatSession[];
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
  
  // Session management
  createNewSession: () => void;
  loadSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
}

// Generate a unique session ID
const generateSessionId = () => `haanu-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      view: 'landing',
      setView: (view) => set({ view }),
      theme: 'dark',
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),

      // User authentication (simple email-based, can be extended with Supabase)
      user: null,
      setUser: (user) => set({ user }),
      signIn: async (email) => {
        // Simple sign-in - in production, integrate with Supabase Auth
        const user: User = {
          id: `user-${Date.now()}`,
          email,
          name: email.split('@')[0],
        };
        set({ user, view: 'chat' });
      },
      signOut: () => {
        set({ user: null, view: 'landing' });
      },

      sessionId: generateSessionId(),
      sessions: [],
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
        set((state) => {
          const newMessages = [...state.messages, msg];
          // Update current session
          const sessions = state.sessions.map(s => 
            s.id === state.sessionId 
              ? { ...s, messages: newMessages, lastUpdated: Date.now() }
              : s
          );
          return { messages: newMessages, sessions };
        });
      },

      addAssistantMessage: (id) => {
        const msg: ChatMessage = {
          id,
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          isStreaming: true,
        };
        set((state) => {
          const newMessages = [...state.messages, msg];
          const sessions = state.sessions.map(s => 
            s.id === state.sessionId 
              ? { ...s, messages: newMessages, lastUpdated: Date.now() }
              : s
          );
          return { messages: newMessages, sessions };
        });
      },

      updateAssistantMessage: (id, content) => {
        set((state) => {
          const newMessages = state.messages.map((msg) =>
            msg.id === id ? { ...msg, content: msg.content + content } : msg
          );
          const sessions = state.sessions.map(s => 
            s.id === state.sessionId 
              ? { ...s, messages: newMessages, lastUpdated: Date.now() }
              : s
          );
          return { messages: newMessages, sessions };
        });
      },

      finalizeAssistantMessage: (id, content) => {
        set((state) => {
          const newMessages = state.messages.map((msg) =>
            msg.id === id ? { ...msg, content, isStreaming: false, thinking: undefined } : msg
          );
          const sessions = state.sessions.map(s => 
            s.id === state.sessionId 
              ? { ...s, messages: newMessages, lastUpdated: Date.now() }
              : s
          );
          return { messages: newMessages, sessions };
        });
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

      clearChat: () => {
        const newSessionId = generateSessionId();
        set({
          messages: [],
          currentToolSteps: [],
          currentThinking: null,
          currentScreenshot: null,
          isAgentRunning: false,
          sessionId: newSessionId,
        });
      },
      
      // Session management
      createNewSession: () => {
        const newSessionId = generateSessionId();
        const newSession: ChatSession = {
          id: newSessionId,
          messages: [],
          createdAt: Date.now(),
          lastUpdated: Date.now(),
        };
        set((state) => ({
          sessionId: newSessionId,
          messages: [],
          sessions: [newSession, ...state.sessions],
          currentToolSteps: [],
          currentThinking: null,
          currentScreenshot: null,
          isAgentRunning: false,
        }));
      },
      
      loadSession: (sessionId) => {
        const state = get();
        const session = state.sessions.find(s => s.id === sessionId);
        if (session) {
          set({
            sessionId,
            messages: session.messages,
            currentToolSteps: [],
            currentThinking: null,
            currentScreenshot: null,
            isAgentRunning: false,
          });
        }
      },
      
      deleteSession: (sessionId) => {
        set((state) => ({
          sessions: state.sessions.filter(s => s.id !== sessionId),
        }));
      },
    }),
    {
      name: 'haanu-storage',
      partialize: (state) => ({
        user: state.user,
        sessions: state.sessions,
        theme: state.theme,
      }),
    }
  )
);
