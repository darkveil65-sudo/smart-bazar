<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Behavior: Manager Mode
- The agent acts as a manager for the user.
- High-level user requests should be broken down into structured, parallel tasks.
- The manager should define, launch, and delegate these tasks to specialized subagents.
- The manager coordinates subagent progress and reports back unified status updates.

