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

/**
 * Low-level helper: send a chat message to /api/agent and resolve with the
 * parsed JSON response. Throws on non-2xx responses or if the request is
 * aborted via stopAgent().
 */
export async function sendChatMessage(
  message: string,
  sessionId: string | null,
  conversationHistory: ChatMessage[] = []
): Promise<ChatResponse> {
  currentAbortController = new AbortController();

  try {
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
      let errorPayload: { error?: string; details?: string } = {};
      try {
        errorPayload = await response.json();
      } catch {
        // Response wasn't JSON — fall through to a generic message
      }
      // Show the SPECIFIC error (details) when available — much more useful
      // for debugging than the generic "Failed to generate AI response."
      // message the route returns as `error`.
      throw new Error(
        errorPayload.details ||
          errorPayload.error ||
          `Request failed with status ${response.status}`
      );
    }

    const data: ChatResponse = await response.json();
    return data;
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Chat request was cancelled');
    }
    throw error;
  } finally {
    currentAbortController = null;
  }
}

/**
 * Abort any in-flight chat request. Called from the "Stop" button in the UI.
 * The sessionId argument is accepted for API compatibility with older callers
 * but is no longer required (we only ever have one active request at a time).
 */
export function stopAgent(_sessionId?: string | null) {
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }
}

/**
 * No-op kept for backwards compatibility. The current architecture uses HTTP
 * /api/agent endpoints instead of a persistent Socket.IO connection.
 */
export function connectSocket() {
  console.log('[Haanu] Ready for chat');
}

/**
 * Clean up: abort any pending chat request when the chat view unmounts.
 */
export function disconnectSocket() {
  stopAgent();
  console.log('[Haanu] Disconnected');
}

/**
 * High-level helper: send a user message and stream the assistant reply into
 * the Zustand store. Coordinates the placeholder assistant message, thinking
 * indicator, and final state cleanup.
 *
 * This function assumes the caller has already:
 *   1. Added the user's message to the store via addUserMessage()
 *   2. Set isAgentRunning to true
 *   3. Created a placeholder assistant message (with isStreaming: true) via
 *      addAssistantMessage(id) — the id of that placeholder must be passed
 *      as `assistantMessageId`.
 */
export async function sendMessage(
  sessionId: string | null,
  userMessage: string,
  assistantMessageId?: string
) {
  const store = useAppStore.getState();

  // Determine which assistant message id we are populating. If the caller did
  // not pass one (legacy contract), fall back to the last streaming assistant
  // message in the store, if any.
  let assistantId = assistantMessageId;
  if (!assistantId) {
    const lastMsg = store.messages[store.messages.length - 1];
    if (lastMsg && lastMsg.role === 'assistant' && lastMsg.isStreaming) {
      assistantId = lastMsg.id;
    } else {
      // No placeholder exists — create one on the fly so we have somewhere to
      // write the response.
      assistantId = `assistant-${Date.now()}`;
      store.addAssistantMessage(assistantId);
    }
  }

  // Build conversation history from current messages — exclude the empty
  // streaming placeholder so we don't send an empty assistant turn to the LLM.
  const conversationHistory: ChatMessage[] = store.messages
    .filter((msg) => msg.role !== 'assistant' || (!msg.isStreaming && msg.content))
    .map((msg) => ({ role: msg.role, content: msg.content }));

  try {
    store.setCurrentThinking('Thinking...');

    const result = await sendChatMessage(
      userMessage,
      sessionId || store.sessionId,
      conversationHistory
    );

    // Stream the response in as a single update. The backend doesn't stream
    // tokens today; if it ever does, swap this for incremental updates via
    // updateAssistantMessage().
    useAppStore.getState().finalizeAssistantMessage(assistantId, result.response);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const storeNow = useAppStore.getState();

    const lastMsg = storeNow.messages[storeNow.messages.length - 1];
    if (lastMsg && lastMsg.role === 'assistant' && lastMsg.isStreaming) {
      storeNow.finalizeAssistantMessage(
        lastMsg.id,
        (lastMsg.content || '') + `\n\n⚠️ Error: ${errorMessage}`
      );
    }

    console.error('[Haanu] Chat error:', error);
  } finally {
    const storeNow = useAppStore.getState();
    storeNow.setAgentRunning(false);
    storeNow.setCurrentThinking(null);
    storeNow.clearToolSteps();
  }
}
