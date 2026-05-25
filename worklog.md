---
Task ID: 2
Agent: Main Agent
Task: Fix browser automation - agent-browser screenshot and service stability

Work Log:
- Discovered the agent service was crashing shortly after startup due to signal propagation from parent process
- Fixed service startup using subshell backgrounding `(bun index.ts &)` instead of nohup
- Found critical bug: `--timeout 15000` flag was being appended after the command, which caused `screenshot /path/file.png --timeout 15000` to save the screenshot to a file called `--timeout` instead of the correct path
- Fixed by using `AGENT_BROWSER_DEFAULT_TIMEOUT` environment variable instead of `--timeout` CLI flag
- Verified screenshot functionality: base64 encoded screenshots are now properly captured and sent to frontend (374KB for Coursera screenshot)
- Tested full end-to-end flow with Coursera: successfully opened website, captured screenshot, read page elements, and reported course listings
- Agent no longer falls back to page_reader when browser tools fail - it properly uses browser_open first

Stage Summary:
- Root cause of "browser tool not found" was: (1) agent service not running, (2) --timeout flag conflicting with screenshot path
- All browser automation now works: open, snapshot, click, fill, type, press, scroll, screenshot, wait
- Screenshots are properly sent to frontend via Socket.IO
- Service is stable and running on port 3003
- Lint passes cleanly
