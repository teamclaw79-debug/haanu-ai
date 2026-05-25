import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import ZAI from 'z-ai-web-dev-sdk';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ToolCall {
  tool: string;
  input: Record<string, any>;
}

interface ParsedResponse {
  textParts: string;
  toolCalls: ToolCall[];
}

interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface Conversation {
  messages: ConversationMessage[];
  active: boolean;
  abortController: AbortController | null;
  browserSession: string | null;
  browserOpen: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PORT = 3003;
const MAX_TOOL_ROUNDS = 20;
const SCREENSHOT_DIR = path.join(os.tmpdir(), 'haanu-screenshots');
const AGENT_BROWSER_PATH = '/home/z/.npm-global/bin/agent-browser';

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const SYSTEM_PROMPT = `You are Haanu, an advanced autonomous AI agent that can actually DO tasks — not just talk about them. You are similar to Manus AI and can interact with websites, fill forms, click buttons, and complete real-world tasks autonomously.

## CRITICAL: Tool Call Format

When you need to use a tool, you MUST output ONLY a JSON object on its own line, in this exact format:
{"tool": "tool_name", "input": {<parameters>}}

Do NOT wrap tool calls in markdown code blocks. Do NOT add extra text around them. Each tool call should be a standalone JSON object.

You can mix text and tool calls. Any text before/after a tool call will be shown to the user as progress updates.

Example of correct output:
Let me open that website for you.
{"tool": "browser_open", "input": {"url": "https://example.com"}}
Now let me see what's on the page.
{"tool": "browser_snapshot", "input": {}}

## Your Tools

### Browser Automation (for interacting with websites)
- **browser_open** — Navigate to a URL: {"tool": "browser_open", "input": {"url": "https://example.com"}}
- **browser_snapshot** — Get interactive elements on the current page: {"tool": "browser_snapshot", "input": {}}
- **browser_click** — Click an element by ref: {"tool": "browser_click", "input": {"ref": "e1"}}
- **browser_fill** — Fill an input field (clears existing text): {"tool": "browser_fill", "input": {"ref": "e2", "text": "hello@example.com"}}
- **browser_type** — Type text without clearing: {"tool": "browser_type", "input": {"ref": "e2", "text": "some text"}}
- **browser_press** — Press a key: {"tool": "browser_press", "input": {"key": "Enter"}}
- **browser_scroll** — Scroll the page: {"tool": "browser_scroll", "input": {"direction": "down", "amount": 500}}
- **browser_screenshot** — Take a screenshot to see the page visually: {"tool": "browser_screenshot", "input": {}}
- **browser_close** — Close the browser: {"tool": "browser_close", "input": {}}
- **browser_wait** — Wait for element or time: {"tool": "browser_wait", "input": {"ms": 2000}} or {"tool": "browser_wait", "input": {"text": "Welcome"}}
- **browser_get_url** — Get current page URL: {"tool": "browser_get_url", "input": {}}
- **browser_get_text** — Get text of an element: {"tool": "browser_get_text", "input": {"ref": "e1"}}

### Web Research
- **web_search** — Search the internet: {"tool": "web_search", "input": {"query": "your search query", "num": 5}}
- **page_reader** — Read full content of a web page: {"tool": "page_reader", "input": {"url": "https://example.com"}}

### Content Creation
- **image_generation** — Generate images: {"tool": "image_generation", "input": {"prompt": "description", "size": "1024x1024"}}
- **code_generation** — Generate code: {"tool": "code_generation", "input": {"description": "what it should do", "language": "javascript"}}

### Visual Understanding
- **analyze_screenshot** — Use AI vision to understand what's on screen: {"tool": "analyze_screenshot", "input": {"question": "What do you see on this page? What buttons are available?"}}

## Critical Rules

1. **ACT, don't just describe.** When someone asks you to sign up for a website, actually open the browser, navigate there, and fill in the form.
2. **Always snapshot first.** After navigating to any page, run browser_snapshot to see what interactive elements are available.
3. **Use refs from snapshots.** When you see elements like [ref=e1], use those refs in click/fill/type commands.
4. **Wait after actions.** After clicking or navigating, use browser_wait to let pages load.
5. **Take screenshots after important actions.** This helps verify the result.
6. **Handle errors gracefully.** If a page doesn't load or an element isn't found, try again or find an alternative.
7. **Be thorough.** Complete the entire task. Use as many tool calls as needed.
8. **Report progress.** Briefly explain what you're doing at each step.
9. **Never say you can't do something** — always try first with the browser tools.
10. **NEVER fall back to page_reader if browser tools fail.** Always retry browser_open first. If it fails, try again with a different approach.

## Workflow for Web Tasks

1. Open the website with browser_open
2. Wait a moment with browser_wait
3. Take a snapshot with browser_snapshot to see available elements
4. Interact with elements (fill forms, click buttons) using refs from the snapshot
5. Wait for page to load with browser_wait
6. Take another snapshot to see new elements
7. Continue until the task is complete
8. Report the final result

Remember: You are an ACTION agent. Don't just tell users how to do things — DO them.`;

const THINKING_STEPS = [
  'Analyzing your request...',
  'Planning the approach...',
  'Opening browser...',
  'Navigating to the website...',
  'Examining the page...',
  'Interacting with elements...',
  'Filling in form fields...',
  'Clicking buttons...',
  'Waiting for page load...',
  'Verifying results...',
  'Taking screenshot...',
  'Processing information...',
  'Synthesizing results...',
  'Completing the task...',
  'Finalizing response...',
];

// ─── State ───────────────────────────────────────────────────────────────────

const conversations = new Map<string, Conversation>();
let zaiInstance: any = null;

// ─── ZAI Initialization ─────────────────────────────────────────────────────

async function initZAI(): Promise<void> {
  if (zaiInstance) return;
  try {
    zaiInstance = await ZAI.create();
    console.log('[Haanu] ZAI SDK initialized successfully');
  } catch (error) {
    console.error('[Haanu] Failed to initialize ZAI SDK:', error);
    throw error;
  }
}

// ─── Browser Helpers ────────────────────────────────────────────────────────

function runBrowserCommand(cmd: string, session?: string): { success: boolean; output: string } {
  try {
    const sessionArg = session ? ` --session ${session}` : '';
    // Use AGENT_BROWSER_DEFAULT_TIMEOUT env instead of --timeout flag
    // because --timeout conflicts with positional args in some commands (like screenshot)
    const fullCmd = `${AGENT_BROWSER_PATH}${sessionArg} ${cmd} 2>&1`;
    console.log(`[Haanu] Browser cmd: ${cmd}${sessionArg}`);
    const output = execSync(fullCmd, {
      encoding: 'utf-8',
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024,
      env: {
        ...process.env,
        PATH: `/home/z/.npm-global/bin:${process.env.PATH}`,
        AGENT_BROWSER_DEFAULT_TIMEOUT: '15000',
      },
    });
    return { success: true, output: output.trim() };
  } catch (error: any) {
    const output = error?.stdout?.toString() || error?.message || 'Command failed';
    console.error(`[Haanu] Browser cmd FAILED: ${cmd}`, output.substring(0, 200));
    return { success: false, output: output.trim() };
  }
}

function saveScreenshotBase64(session: string): string | null {
  try {
    const screenshotPath = path.join(SCREENSHOT_DIR, `haanu-${Date.now()}.png`);
    const result = runBrowserCommand(`screenshot ${screenshotPath}`, session);
    if (result.success && fs.existsSync(screenshotPath)) {
      const buffer = fs.readFileSync(screenshotPath);
      const base64 = buffer.toString('base64');
      // Clean up
      try { fs.unlinkSync(screenshotPath); } catch {}
      return base64;
    }
    return null;
  } catch (error) {
    console.error('[Haanu] Screenshot error:', error);
    return null;
  }
}

async function analyzeScreenshotWithVLM(base64: string, question: string): Promise<string> {
  try {
    const response = await zaiInstance.chat.completions.createVision({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: question },
            {
              type: 'image_url',
              image_url: { url: `data:image/png;base64,${base64}` },
            },
          ],
        },
      ],
      thinking: { type: 'disabled' },
    });
    return response.choices[0]?.message?.content || 'Could not analyze screenshot';
  } catch (error: any) {
    return `Error analyzing screenshot: ${error.message}`;
  }
}

// ─── Tool Call Parsing ───────────────────────────────────────────────────────

function parseToolCalls(content: string): ParsedResponse {
  const toolCalls: ToolCall[] = [];
  const textParts: string[] = [];

  // Strip markdown code blocks that might wrap tool calls
  let cleanedContent = content.replace(/```(?:json)?\s*\n?([\s\S]*?)```/g, (_, inner) => {
    return inner.trim();
  });

  let i = 0;
  const len = cleanedContent.length;

  while (i < len) {
    const jsonStart = cleanedContent.indexOf('{"tool"', i);

    if (jsonStart === -1) {
      const remaining = cleanedContent.substring(i).trim();
      if (remaining) textParts.push(remaining);
      break;
    }

    const before = cleanedContent.substring(i, jsonStart).trim();
    if (before) textParts.push(before);

    const parseResult = tryParseJSONObject(cleanedContent, jsonStart);

    if (parseResult.success && parseResult.value?.tool && parseResult.value?.input) {
      toolCalls.push({
        tool: parseResult.value.tool,
        input: parseResult.value.input,
      });
      i = parseResult.endIndex;
    } else {
      textParts.push(cleanedContent.substring(jsonStart, jsonStart + 1));
      i = jsonStart + 1;
    }
  }

  return {
    textParts: textParts.join('\n').trim(),
    toolCalls,
  };
}

function tryParseJSONObject(
  content: string,
  startIndex: number
): { success: boolean; value?: any; endIndex: number } {
  if (content[startIndex] !== '{') {
    return { success: false, endIndex: startIndex + 1 };
  }

  let depth = 0;
  let inString = false;
  let escapeNext = false;
  let i = startIndex;

  while (i < content.length) {
    const ch = content[i];

    if (escapeNext) {
      escapeNext = false;
      i++;
      continue;
    }

    if (ch === '\\' && inString) {
      escapeNext = true;
      i++;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      i++;
      continue;
    }

    if (inString) {
      i++;
      continue;
    }

    if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        const jsonStr = content.substring(startIndex, i + 1);
        try {
          const parsed = JSON.parse(jsonStr);
          return { success: true, value: parsed, endIndex: i + 1 };
        } catch {
          return { success: false, endIndex: i + 1 };
        }
      }
    }

    i++;
  }

  return { success: false, endIndex: startIndex + 1 };
}

// ─── Conversation Management ─────────────────────────────────────────────────

function getOrCreateConversation(sessionId: string): Conversation {
  if (!conversations.has(sessionId)) {
    conversations.set(sessionId, {
      messages: [{ role: 'system', content: SYSTEM_PROMPT }],
      active: false,
      abortController: null,
      browserSession: `haanu-${sessionId.substring(0, 8)}`,
      browserOpen: false,
    });
  }
  return conversations.get(sessionId)!;
}

function getConversationHistory(sessionId: string): ConversationMessage[] {
  const conv = conversations.get(sessionId);
  if (!conv) return [];
  return conv.messages.filter((m) => m.role !== 'system');
}

function stopConversation(sessionId: string): boolean {
  const conv = conversations.get(sessionId);
  if (!conv) return false;
  if (conv.abortController) {
    conv.abortController.abort();
    conv.abortController = null;
  }
  // Close browser if open
  if (conv.browserSession && conv.browserOpen) {
    try {
      runBrowserCommand('close', conv.browserSession);
      conv.browserOpen = false;
    } catch {}
  }
  conv.active = false;
  return true;
}

// ─── Tool Execution ─────────────────────────────────────────────────────────

async function executeTool(
  tool: string,
  input: Record<string, any>,
  socket: Socket,
  sessionId: string
): Promise<any> {
  const conv = conversations.get(sessionId);
  const browserSession = conv?.browserSession || `haanu-${sessionId.substring(0, 8)}`;

  socket.emit('agent:tool_start', { sessionId, tool, input });

  try {
    let result: any;

    switch (tool) {
      // ── Browser Automation ───────────────────────────────────────────
      case 'browser_open': {
        socket.emit('agent:thinking', { sessionId, step: `🌐 Opening ${input.url}...` });
        const r = runBrowserCommand(`open "${input.url}"`, browserSession);
        if (r.success) {
          conv!.browserOpen = true;
        }
        result = { success: r.success, output: r.output.substring(0, 500), url: input.url };
        // Wait for page load
        if (r.success) {
          runBrowserCommand('wait 2000', browserSession);
          // Auto-snapshot after opening
          const snapResult = runBrowserCommand('snapshot -i', browserSession);
          if (snapResult.success) {
            result.snapshot = snapResult.output.substring(0, 3000);
          }
        }
        // Auto-screenshot
        const screenshot = saveScreenshotBase64(browserSession);
        if (screenshot) {
          socket.emit('agent:screenshot', { sessionId, base64: screenshot });
        }
        if (!r.success) {
          result.error = `Failed to open ${input.url}. Error: ${r.output.substring(0, 200)}`;
        }
        break;
      }

      case 'browser_snapshot': {
        socket.emit('agent:thinking', { sessionId, step: '👁️ Analyzing page elements...' });
        const r = runBrowserCommand('snapshot -i', browserSession);
        result = { success: r.success, elements: r.output.substring(0, 4000) };
        if (!r.success) {
          result.error = 'Browser may not be open. Try browser_open first.';
        }
        // Also take a screenshot for the user
        const screenshot = saveScreenshotBase64(browserSession);
        if (screenshot) {
          socket.emit('agent:screenshot', { sessionId, base64: screenshot });
        }
        break;
      }

      case 'browser_click': {
        socket.emit('agent:thinking', { sessionId, step: `👆 Clicking @${input.ref}...` });
        const r = runBrowserCommand(`click @${input.ref}`, browserSession);
        result = { success: r.success, output: r.output.substring(0, 500) };
        // Wait and screenshot
        runBrowserCommand('wait 1500', browserSession);
        const screenshot = saveScreenshotBase64(browserSession);
        if (screenshot) {
          socket.emit('agent:screenshot', { sessionId, base64: screenshot });
        }
        // Auto-snapshot to see what changed
        const snapResult = runBrowserCommand('snapshot -i', browserSession);
        if (snapResult.success) {
          result.newSnapshot = snapResult.output.substring(0, 3000);
        }
        break;
      }

      case 'browser_fill': {
        socket.emit('agent:thinking', { sessionId, step: `⌨️ Filling @${input.ref}...` });
        const escapedText = (input.text || '').replace(/"/g, '\\"').replace(/`/g, '\\`');
        const r = runBrowserCommand(`fill @${input.ref} "${escapedText}"`, browserSession);
        result = { success: r.success, output: r.output.substring(0, 500) };
        break;
      }

      case 'browser_type': {
        const escapedText = (input.text || '').replace(/"/g, '\\"').replace(/`/g, '\\`');
        const r = runBrowserCommand(`type @${input.ref} "${escapedText}"`, browserSession);
        result = { success: r.success, output: r.output.substring(0, 500) };
        break;
      }

      case 'browser_press': {
        socket.emit('agent:thinking', { sessionId, step: `⌨️ Pressing ${input.key}...` });
        const r = runBrowserCommand(`press ${input.key}`, browserSession);
        result = { success: r.success, output: r.output.substring(0, 500) };
        runBrowserCommand('wait 1500', browserSession);
        const screenshot = saveScreenshotBase64(browserSession);
        if (screenshot) {
          socket.emit('agent:screenshot', { sessionId, base64: screenshot });
        }
        // Auto-snapshot after key press
        const snapResult = runBrowserCommand('snapshot -i', browserSession);
        if (snapResult.success) {
          result.newSnapshot = snapResult.output.substring(0, 3000);
        }
        break;
      }

      case 'browser_scroll': {
        const dir = input.direction || 'down';
        const amt = input.amount || 500;
        const r = runBrowserCommand(`scroll ${dir} ${amt}`, browserSession);
        result = { success: r.success, output: r.output.substring(0, 500) };
        const screenshot = saveScreenshotBase64(browserSession);
        if (screenshot) {
          socket.emit('agent:screenshot', { sessionId, base64: screenshot });
        }
        break;
      }

      case 'browser_screenshot': {
        socket.emit('agent:thinking', { sessionId, step: '📸 Taking screenshot...' });
        const screenshot = saveScreenshotBase64(browserSession);
        if (screenshot) {
          socket.emit('agent:screenshot', { sessionId, base64: screenshot });
          result = { success: true, message: 'Screenshot taken and shown to user' };
        } else {
          result = { success: false, message: 'Failed to take screenshot' };
        }
        break;
      }

      case 'browser_close': {
        const r = runBrowserCommand('close', browserSession);
        if (r.success) conv!.browserOpen = false;
        result = { success: r.success, output: r.output };
        break;
      }

      case 'browser_wait': {
        if (input.ms) {
          const r = runBrowserCommand(`wait ${input.ms}`, browserSession);
          result = { success: r.success, output: r.output };
        } else if (input.text) {
          const r = runBrowserCommand(`wait --text "${input.text}"`, browserSession);
          result = { success: r.success, output: r.output };
        } else {
          const r = runBrowserCommand('wait 2000', browserSession);
          result = { success: r.success, output: r.output };
        }
        break;
      }

      case 'browser_get_url': {
        const r = runBrowserCommand('get url', browserSession);
        result = { success: r.success, url: r.output.trim() };
        break;
      }

      case 'browser_get_text': {
        const r = runBrowserCommand(`get text @${input.ref}`, browserSession);
        result = { success: r.success, text: r.output.substring(0, 2000) };
        break;
      }

      // ── Web Research ─────────────────────────────────────────────────
      case 'web_search': {
        socket.emit('agent:thinking', { sessionId, step: `🔍 Searching: ${input.query}...` });
        try {
          const searchResult = await zaiInstance.functions.invoke('web_search', {
            query: input.query,
            num: input.num || 5,
          });
          result = searchResult;
        } catch (searchError: any) {
          result = { error: `Search failed: ${searchError.message}`, query: input.query };
        }
        break;
      }

      case 'page_reader': {
        socket.emit('agent:thinking', { sessionId, step: `📖 Reading: ${input.url}...` });
        try {
          const pageResult = await zaiInstance.functions.invoke('page_reader', {
            url: input.url,
          });
          const title = pageResult?.data?.title || 'No title';
          const htmlContent = pageResult?.data?.html || '';
          const textContent = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          result = {
            title,
            url: input.url,
            content: textContent.substring(0, 8000),
            publishedTime: pageResult?.data?.publishedTime,
          };
        } catch (pageError: any) {
          result = { error: `Page reading failed: ${pageError.message}`, url: input.url };
        }
        break;
      }

      // ── Content Creation ─────────────────────────────────────────────
      case 'image_generation': {
        socket.emit('agent:thinking', { sessionId, step: '🎨 Generating image...' });
        try {
          const imgResponse = await zaiInstance.images.generations.create({
            prompt: input.prompt,
            size: input.size || '1024x1024',
          });
          const base64 = imgResponse.data[0]?.b64_json || imgResponse.data[0]?.base64;
          result = { base64, prompt: input.prompt, size: input.size || '1024x1024' };
          socket.emit('agent:screenshot', { sessionId, base64 });
        } catch (imgError: any) {
          result = { error: `Image generation failed: ${imgError.message}` };
        }
        break;
      }

      case 'code_generation': {
        socket.emit('agent:thinking', { sessionId, step: '💻 Generating code...' });
        try {
          const codeCompletion = await zaiInstance.chat.completions.create({
            messages: [
              {
                role: 'system',
                content: `You are an expert programmer. Write clean, efficient ${input.language || 'javascript'} code. Only output the code, no explanations.`,
              },
              { role: 'user', content: input.description },
            ],
            thinking: { type: 'disabled' },
          });
          result = {
            code: codeCompletion.choices[0]?.message?.content,
            language: input.language || 'javascript',
          };
        } catch (codeError: any) {
          result = { error: `Code generation failed: ${codeError.message}` };
        }
        break;
      }

      // ── Visual Understanding ─────────────────────────────────────────
      case 'analyze_screenshot': {
        socket.emit('agent:thinking', { sessionId, step: '🧠 Analyzing page with AI vision...' });
        const screenshot = saveScreenshotBase64(browserSession);
        if (screenshot) {
          socket.emit('agent:screenshot', { sessionId, base64: screenshot });
          const analysis = await analyzeScreenshotWithVLM(screenshot, input.question || 'What do you see on this page? List all interactive elements, buttons, links, and form fields with their refs if visible.');
          result = { analysis, question: input.question };
        } else {
          result = { error: 'Could not take screenshot for analysis. The browser may not be open. Try browser_open first.' };
        }
        break;
      }

      default:
        result = { error: `Unknown tool: ${tool}. Available tools: browser_open, browser_snapshot, browser_click, browser_fill, browser_type, browser_press, browser_scroll, browser_screenshot, browser_close, browser_wait, browser_get_url, browser_get_text, web_search, page_reader, image_generation, code_generation, analyze_screenshot` };
    }

    socket.emit('agent:tool_result', { sessionId, tool, result });
    return result;
  } catch (error: any) {
    const errorResult = { error: `Tool execution error: ${error?.message || 'Unknown error'}` };
    socket.emit('agent:tool_result', { sessionId, tool, result: errorResult });
    return errorResult;
  }
}

// ─── Agent Loop ──────────────────────────────────────────────────────────────

async function runAgentLoop(
  socket: Socket,
  sessionId: string,
  userMessage: string
): Promise<void> {
  const conv = getOrCreateConversation(sessionId);

  if (conv.active) {
    socket.emit('agent:error', {
      sessionId,
      error: 'Agent is already processing. Please wait or stop.',
    });
    return;
  }

  conv.active = true;
  conv.abortController = new AbortController();

  try {
    conv.messages.push({ role: 'user', content: userMessage });

    let accumulatedText = '';

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      if (!conv.active) break;

      const thinkingStep = round === 0
        ? THINKING_STEPS[0]
        : THINKING_STEPS[Math.min(round, THINKING_STEPS.length - 1)];
      socket.emit('agent:thinking', { sessionId, step: thinkingStep });

      // Call LLM
      const completion = await zaiInstance.chat.completions.create({
        messages: conv.messages,
        thinking: { type: 'disabled' },
      });

      const fullContent = completion.choices[0]?.message?.content || '';

      // Parse for tool calls
      const { textParts, toolCalls } = parseToolCalls(fullContent);

      // Stream text parts to client
      if (textParts) {
        socket.emit('agent:chunk', { sessionId, content: textParts });
        accumulatedText += (accumulatedText ? '\n' : '') + textParts;
      }

      // If no tool calls, we're done
      if (toolCalls.length === 0) {
        conv.messages.push({ role: 'assistant', content: fullContent });
        socket.emit('agent:complete', {
          sessionId,
          message: accumulatedText || fullContent,
        });
        // Close browser on completion
        if (conv.browserSession && conv.browserOpen) {
          try { runBrowserCommand('close', conv.browserSession); conv.browserOpen = false; } catch {}
        }
        return;
      }

      // Execute tool calls one by one
      let toolResults = '';
      for (const tc of toolCalls) {
        if (!conv.active) break;

        const result = await executeTool(tc.tool, tc.input, socket, sessionId);

        // Format result for context, truncating large data
        let resultStr: string;
        if (typeof result === 'string') {
          resultStr = result;
        } else if (result?.base64) {
          resultStr = JSON.stringify({ ...result, base64: '[image data - shown to user]' });
        } else if (result?.screenshot) {
          resultStr = JSON.stringify({ ...result, screenshot: '[screenshot taken - shown to user]' });
        } else {
          resultStr = JSON.stringify(result);
        }
        toolResults += `\n[Tool: ${tc.tool} Result]: ${
          resultStr.length > 5000 ? resultStr.substring(0, 5000) + '...[truncated]' : resultStr
        }\n`;
      }

      // Add to conversation history
      conv.messages.push({ role: 'assistant', content: fullContent });
      conv.messages.push({
        role: 'user',
        content: `Here are the tool results:${toolResults}\n\nContinue with the task based on the results above. If the task is complete, provide a clear final answer without using any more tools. If you need more actions, use the appropriate tools.`,
      });
    }

    // Final synthesis
    if (conv.active) {
      socket.emit('agent:thinking', { sessionId, step: '✅ Final synthesis...' });

      const finalCompletion = await zaiInstance.chat.completions.create({
        messages: [
          ...conv.messages,
          {
            role: 'user',
            content: 'Please provide a final summary of what was accomplished. Do not use any more tools. Just summarize the results clearly.',
          },
        ],
        thinking: { type: 'disabled' },
      });

      const finalContent = finalCompletion.choices[0]?.message?.content || '';
      if (finalContent) {
        const { textParts: finalText } = parseToolCalls(finalContent);
        const outputText = finalText || finalContent;
        socket.emit('agent:chunk', { sessionId, content: outputText });
        accumulatedText += (accumulatedText ? '\n' : '') + outputText;
        conv.messages.push({ role: 'assistant', content: finalContent });
      }

      socket.emit('agent:complete', {
        sessionId,
        message: accumulatedText || 'Task completed.',
      });
    } else {
      socket.emit('agent:complete', {
        sessionId,
        message: accumulatedText || 'Execution stopped by user.',
      });
    }

    // Close browser
    if (conv.browserSession && conv.browserOpen) {
      try { runBrowserCommand('close', conv.browserSession); conv.browserOpen = false; } catch {}
    }
  } catch (error: any) {
    console.error(`[Haanu] Agent loop error for session ${sessionId}:`, error);
    if (error?.name === 'AbortError' || !conv.active) {
      socket.emit('agent:complete', {
        sessionId,
        message: accumulatedText || 'Execution was stopped.',
      });
    } else {
      socket.emit('agent:error', {
        sessionId,
        error: error?.message || 'An unexpected error occurred.',
      });
    }
    // Close browser on error
    if (conv.browserSession && conv.browserOpen) {
      try { runBrowserCommand('close', conv.browserSession); conv.browserOpen = false; } catch {}
    }
  } finally {
    conv.active = false;
    conv.abortController = null;
  }
}

// ─── Socket.IO Server Setup ─────────────────────────────────────────────────

const httpServer = createServer();
const io = new Server(httpServer, {
  path: '/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 120000,
  pingInterval: 25000,
  maxHttpBufferSize: 10e6, // 10MB for screenshots
});

io.on('connection', (socket: Socket) => {
  console.log(`[Haanu] Client connected: ${socket.id}`);

  socket.on('agent:message', async (data: { sessionId: string; message: string }) => {
    const { sessionId, message } = data;
    if (!sessionId || !message) {
      socket.emit('agent:error', { sessionId: sessionId || 'unknown', error: 'Missing sessionId or message' });
      return;
    }
    console.log(`[Haanu] Message for ${sessionId}: ${message.substring(0, 100)}...`);
    if (!zaiInstance) {
      try { await initZAI(); } catch {
        socket.emit('agent:error', { sessionId, error: 'Failed to initialize AI service.' });
        return;
      }
    }
    await runAgentLoop(socket, sessionId, message);
  });

  socket.on('agent:stop', (data: { sessionId: string }) => {
    console.log(`[Haanu] Stop requested for ${data.sessionId}`);
    stopConversation(data.sessionId);
    socket.emit('agent:complete', { sessionId: data.sessionId, message: 'Execution stopped by user.' });
  });

  socket.on('agent:history', (data: { sessionId: string }) => {
    const messages = getConversationHistory(data.sessionId);
    socket.emit('agent:history', { sessionId: data.sessionId, messages });
  });

  socket.on('disconnect', (reason) => {
    console.log(`[Haanu] Client disconnected: ${socket.id} (${reason})`);
  });
});

// ─── Start Server ────────────────────────────────────────────────────────────

async function startServer() {
  try {
    await initZAI();

    // Verify agent-browser is available
    try {
      const testOutput = execSync(`${AGENT_BROWSER_PATH} --version 2>&1`, {
        encoding: 'utf-8',
        timeout: 5000,
        env: { ...process.env, PATH: `/home/z/.npm-global/bin:${process.env.PATH}` },
      });
      console.log(`[Haanu] agent-browser CLI: AVAILABLE (v${testOutput.trim()})`);
    } catch {
      // Try alternate check
      try {
        const whichOutput = execSync('which agent-browser 2>&1', { encoding: 'utf-8', timeout: 5000 });
        console.log(`[Haanu] agent-browser CLI: AVAILABLE at ${whichOutput.trim()}`);
      } catch {
        console.warn(`[Haanu] agent-browser CLI: NOT FOUND at ${AGENT_BROWSER_PATH}. Browser automation will not work.`);
      }
    }

    httpServer.listen(PORT, () => {
      console.log(`[Haanu] Agent Service running on port ${PORT}`);
      console.log(`[Haanu] Browser automation: ENABLED`);
      console.log(`[Haanu] Web search: ENABLED`);
      console.log(`[Haanu] VLM vision: ENABLED`);
      console.log(`[Haanu] Max tool rounds: ${MAX_TOOL_ROUNDS}`);
    });
  } catch (error) {
    console.error('[Haanu] Failed to start:', error);
    process.exit(1);
  }
}

startServer();

// ─── Graceful Shutdown ───────────────────────────────────────────────────────

const shutdown = () => {
  console.log('[Haanu] Shutting down...');
  // Close all browser sessions
  for (const [id, conv] of conversations) {
    if (conv.browserSession && conv.browserOpen) {
      try { runBrowserCommand('close', conv.browserSession); } catch {}
    }
  }
  io.disconnectSockets(true);
  httpServer.close(() => {
    console.log('[Haanu] Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
