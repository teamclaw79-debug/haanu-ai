#!/bin/bash
cd /home/z/my-project

# Start the agent service in the background
cd mini-services/agent-service
bun --hot index.ts &
AGENT_PID=$!
cd /home/z/my-project

# Start the Next.js dev server
bun run dev &
NEXT_PID=$!

# Wait for either to exit
wait -n $AGENT_PID $NEXT_PID 2>/dev/null
