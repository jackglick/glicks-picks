---
name: commit
description: Stage and commit changes with a descriptive message
disable-model-invocation: true
---

Create a git commit for the current changes:

1. Run `git status` and `git diff --stat` to understand what changed
2. Stage the relevant files (prefer explicit file names over `git add -A`)
3. Never stage `.DS_Store`, `CLAUDE.local.md`, or `.claude/settings.local.json`
4. Write a commit message that:
   - Has a concise first line under 72 characters describing WHAT changed
   - Optionally includes a body with WHY the change was made
   - Ends with: `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`
5. Do NOT push unless explicitly asked
