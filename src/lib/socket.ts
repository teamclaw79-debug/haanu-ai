'use client';

import { useAppStore } from './store';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  response: string;
  sessionId: string;
  messages?: ChatMessage[];
}

let currentAbortController: AbortController | null = null;

export async function sendChatMessage(
  message: string,
  sessionId: string | null,
  conversationHistory: ChatMessage[] = []
): Promise<ChatResponse> {
  try {
    currentAbortController = new AbortController();
    
    const response = await fetch('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        sessionId,
        messages: conversationHistory,
      }),
      signal: currentAbortController.signal,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get response');
    }

    const data: ChatResponse = await response.json();
    return data;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    if (errorMessage === 'AbortError') {
      throw new Error('Chat request was cancelled');
    }
    
    throw error;
  } finally {
    currentAbortController = null;
  }
}

export function stopAgent() {
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }
}

export function connectSocket() {
  // Noop for API-based approach
  console.log('[Haanu] Ready for chat');
}

export function disconnectSocket() {
  stopAgent();
  console.log('[Haanu] Disconnected');
}

/**
 * Send a message to Haanu and handle the response
 */
export async function sendMessage(sessionId: string | null, userMessage: string) {
  try {
    const store = useAppStore.getState();
    
    // Build conversation history from current messages
    const conversationHistory = store.messages
      .filter((msg) => msg.role !== 'assistant' || !msg.isStreaming)
      .map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

    // Send the message
    const result = await sendChatMessage(userMessage, sessionId || store.sessionId, conversationHistory);

    // Update the store with the response
    const lastMsg = store.messages[store.messages.length - 1];
    if (lastMsg && lastMsg.role === 'assistant' && lastMsg.isStreaming) {
      store.finalizeAssistantMessage(lastMsg.id, result.response);
    }

    store.setAgentRunning(false);
    store.setCurrentThinking(null);
  } catch (error: unknown) {
    const store = useAppStore.getState();
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    const lastMsg = store.messages[store.messages.length - 1];
    if (lastMsg && lastMsg.role === 'assistant' && lastMsg.isStreaming) {
      store.finalizeAssistantMessage(
        lastMsg.id,
        (lastMsg.content || '') + `\n\n⚠️ Error: ${errorMessage}`
      );
    }

    store.setAgentRunning(false);
    store.setCurrentThinking(null);
    
    console.error('[Haanu] Chat error:', error);
  }
}
}

export function stopAgent(sessionId: string) {
  const s = getSocket();
  if (s.connected) {
    s.emit('agent:stop', { sessionId });
  }
}
