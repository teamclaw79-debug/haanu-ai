'use client';

import { io, Socket } from 'socket.io-client';
import { useAppStore, ToolStep } from './store';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      autoConnect: false,
    });

    socket.on('connect', () => {
      console.log('[Haanu] Connected to agent service');
    });

    socket.on('disconnect', () => {
      console.log('[Haanu] Disconnected from agent service');
    });

    socket.on('agent:thinking', (data: { sessionId: string; step: string }) => {
      const store = useAppStore.getState();
      if (data.sessionId === store.sessionId) {
        store.setCurrentThinking(data.step);
      }
    });

    socket.on('agent:tool_start', (data: { sessionId: string; tool: string; input: Record<string, unknown> }) => {
      const store = useAppStore.getState();
      if (data.sessionId === store.sessionId) {
        const step: ToolStep = {
          id: `tool-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          tool: data.tool,
          input: data.input,
          status: 'running',
        };
        store.addToolStep(step);
      }
    });

    socket.on('agent:tool_result', (data: { sessionId: string; tool: string; result: unknown }) => {
      const store = useAppStore.getState();
      if (data.sessionId === store.sessionId) {
        // Find the most recent running step for this tool
        const steps = [...store.currentToolSteps];
        const lastStep = steps.findLast((s) => s.tool === data.tool && s.status === 'running');
        if (lastStep) {
          store.updateToolStep(lastStep.id, 'completed', data.result);
        } else {
          // If no running step found, mark the last running step
          const anyRunning = steps.findLast((s) => s.status === 'running');
          if (anyRunning) {
            store.updateToolStep(anyRunning.id, 'completed', data.result);
          }
        }
      }
    });

    socket.on('agent:chunk', (data: { sessionId: string; content: string }) => {
      const store = useAppStore.getState();
      if (data.sessionId === store.sessionId) {
        const lastMsg = store.messages[store.messages.length - 1];
        if (lastMsg && lastMsg.role === 'assistant' && lastMsg.isStreaming) {
          // Replace content instead of appending (the agent sends full text, not incremental)
          useAppStore.setState({
            messages: store.messages.map((msg) =>
              msg.id === lastMsg.id ? { ...msg, content: data.content } : msg
            ),
          });
        }
      }
    });

    socket.on('agent:complete', (data: { sessionId: string; message: string }) => {
      const store = useAppStore.getState();
      if (data.sessionId === store.sessionId) {
        const lastMsg = store.messages[store.messages.length - 1];
        if (lastMsg && lastMsg.role === 'assistant' && lastMsg.isStreaming) {
          store.finalizeAssistantMessage(lastMsg.id, data.message);
        }
        store.setAgentRunning(false);
        store.setCurrentThinking(null);
      }
    });

    socket.on('agent:error', (data: { sessionId: string; error: string }) => {
      const store = useAppStore.getState();
      if (data.sessionId === store.sessionId) {
        const lastMsg = store.messages[store.messages.length - 1];
        if (lastMsg && lastMsg.role === 'assistant' && lastMsg.isStreaming) {
          store.finalizeAssistantMessage(
            lastMsg.id,
            lastMsg.content + `\n\n⚠️ Error: ${data.error}`
          );
        }
        store.setAgentRunning(false);
        store.setCurrentThinking(null);
      }
    });

    // Screenshots are stored in both the store and listened to by the component
    socket.on('agent:screenshot', (data: { sessionId: string; base64: string }) => {
      const store = useAppStore.getState();
      if (data.sessionId === store.sessionId) {
        store.setCurrentScreenshot(data.base64);
      }
    });
  }

  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function disconnectSocket() {
  if (socket?.connected) {
    socket.disconnect();
  }
}

export function sendMessage(sessionId: string, message: string) {
  const s = connectSocket();
  s.emit('agent:message', { sessionId, message });
}

export function stopAgent(sessionId: string) {
  const s = getSocket();
  if (s.connected) {
    s.emit('agent:stop', { sessionId });
  }
}
