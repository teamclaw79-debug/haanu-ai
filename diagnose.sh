#!/usr/bin/env bash
# Haanu diagnostic script — run this from the haanu-ai project root.
#
# Usage:
#   bash diagnose.sh
#
# This script checks:
#   1. Git state — are you on the latest commit with OpenRouter integration?
#   2. .env.local — does it have OPENROUTER_API_KEY?
#   3. Dependencies — is z-ai-web-dev-sdk installed?
#   4. Dev server — is it running and reachable?
#   5. API route — does /api/agent/debug return success?
#   6. Direct chat call — does the chat actually work?
#
# Each step prints PASS / FAIL with details. Paste the output back to me
# and I'll know exactly what to fix.

set -u
cd "$(dirname "$0")"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'
BOLD='\033[1m'

pass() { echo -e "  ${GREEN}✓ PASS${NC}: $1"; }
fail() { echo -e "  ${RED}✗ FAIL${NC}: $1"; }
warn() { echo -e "  ${YELLOW}⚠ WARN${NC}: $1"; }
section() { echo -e "\n${BOLD}=== $1 ===${NC}"; }

section "1. Git state"
echo "  Current branch: $(git rev-parse --abbrev-ref HEAD 2>&1)"
echo "  Current commit: $(git rev-parse --short HEAD 2>&1)"
echo "  Latest on remote: $(git rev-parse --short origin/main 2>&1)"

if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]; then
  fail "Local is behind origin/main. Run: git pull"
else
  pass "Up to date with origin/main"
fi

# Check if OpenRouter integration is present
if [ -f "src/lib/openrouter.ts" ]; then
  pass "src/lib/openrouter.ts exists (OpenRouter integration present)"
else
  fail "src/lib/openrouter.ts MISSING — git pull did not bring in the OpenRouter commit"
fi

section "2. .env.local"
if [ ! -f ".env.local" ]; then
  fail ".env.local does not exist. Create it with:"
  echo "  echo 'OPENROUTER_API_KEY=\"sk-or-v1-...\"' > .env.local"
else
  pass ".env.local exists"
  if grep -q "^OPENROUTER_API_KEY=" .env.local; then
    key=$(grep "^OPENROUTER_API_KEY=" .env.local | cut -d= -f2- | tr -d '"'"'"' ')
    if [ -n "$key" ] && [ "$key" != '""' ]; then
      pass "OPENROUTER_API_KEY is set (${key:0:15}…${key: -4})"
    else
      fail "OPENROUTER_API_KEY is empty in .env.local"
    fi
  else
    fail "OPENROUTER_API_KEY is NOT in .env.local"
    echo "  Add this line to .env.local (replace with your own key from https://openrouter.ai/keys):"
    echo "    OPENROUTER_API_KEY=\"sk-or-v1-YOUR_KEY_HERE\""
  fi
fi

section "3. Dependencies"
if [ -d "node_modules" ]; then
  pass "node_modules exists"
  if [ -d "node_modules/z-ai-web-dev-sdk" ]; then
    pass "z-ai-web-dev-sdk installed"
  else
    fail "z-ai-web-dev-sdk missing — run: bun install"
  fi
  if [ -d "node_modules/next" ]; then
    pass "next.js installed"
  else
    fail "next.js missing — run: bun install"
  fi
else
  fail "node_modules does not exist — run: bun install"
fi

section "4. Dev server"
if curl -sS --max-time 3 http://localhost:3000/api/agent/debug > /dev/null 2>&1; then
  pass "Dev server is running on port 3000"
else
  fail "Dev server is NOT running on port 3000"
  echo "  Start it with: bun run dev"
  echo "  (and wait for 'Ready in xxx ms')"
  exit 1
fi

section "5. /api/agent/debug (env var check)"
debug_resp=$(curl -sS --max-time 10 http://localhost:3000/api/agent/debug 2>&1)
echo "  Response: $debug_resp" | head -c 500
echo ""

if echo "$debug_resp" | grep -q '"OPENROUTER_API_KEY": "set'; then
  pass "Server sees OPENROUTER_API_KEY"
else
  fail "Server does NOT see OPENROUTER_API_KEY"
  echo ""
  echo "  ${YELLOW}This is the root cause of 'Failed to generate AI response'.${NC}"
  echo "  ${YELLOW}The dev server was started BEFORE .env.local was updated.${NC}"
  echo "  Fix:"
  echo "    1. Stop the dev server (Ctrl+C)"
  echo "    2. Verify .env.local has OPENROUTER_API_KEY (see step 2)"
  echo "    3. Restart: bun run dev"
  echo "    4. Re-run this script"
fi

section "6. Direct chat call"
echo "  Calling POST /api/agent with {\"message\":\"hello\"}..."
chat_resp=$(curl -sS --max-time 60 -X POST http://localhost:3000/api/agent \
  -H 'Content-Type: application/json' \
  -d '{"message":"hello"}' 2>&1)
echo "  Response (first 500 chars):"
echo "$chat_resp" | head -c 500
echo ""

if echo "$chat_resp" | grep -q '"response"'; then
  pass "Chat works!"
elif echo "$chat_resp" | grep -q '"error"'; then
  fail "Chat failed — server returned error"
  echo ""
  echo "  ${BOLD}Full error response from server:${NC}"
  echo "$chat_resp" | python3 -m json.tool 2>/dev/null || echo "$chat_resp"
else
  fail "Unexpected response"
fi

section "Done"
echo "If any step failed, fix it and re-run: bash diagnose.sh"
echo ""
echo "If everything passes but the chat UI still shows 'Failed to generate',"
echo "the issue is browser-side. Open browser DevTools (F12) → Network tab →"
echo "send a message → click the failing /api/agent request → check the"
echo "Response tab for the actual error."
