---
title: Integrations
description: Supported agents, and manual MCP setup.
---

The interactive installer auto-detects and configures each supported agent — wiring up the MCP server. CodeGraph's usage guide is delivered by the MCP server during `initialize`.

## Supported agents

- **Claude Code**
- **Cursor**
- **Codex CLI**
- **opencode**
- **Hermes Agent**
- **Gemini CLI**
- **Antigravity IDE**
- **Kiro**
- **CodeBuddy** (VS Code, Android Studio, and CodeBuddy IDE)

Run `npx @colbymchenry/codegraph` and pick your agent(s); see [Installation](/codegraph/getting-started/installation/) for the non-interactive flags.

## Manual setup

If you'd rather wire it up yourself, install globally:

```bash
npm install -g @colbymchenry/codegraph
```

Add the MCP server to `~/.claude.json`:

```json
{
  "mcpServers": {
    "codegraph": {
      "type": "stdio",
      "command": "codegraph",
      "args": ["serve", "--mcp"]
    }
  }
}
```

Optionally auto-allow the read-only tools in `~/.claude/settings.json`:

```json
{
  "permissions": {
    "allow": [
      "mcp__codegraph__codegraph_search",
      "mcp__codegraph__codegraph_context",
      "mcp__codegraph__codegraph_callers",
      "mcp__codegraph__codegraph_callees",
      "mcp__codegraph__codegraph_impact",
      "mcp__codegraph__codegraph_node",
      "mcp__codegraph__codegraph_status",
      "mcp__codegraph__codegraph_files"
    ]
  }
}
```

:::tip
Cursor launches MCP subprocesses with the wrong working directory. The installer handles this for you by injecting a `--path` argument; if you wire Cursor up by hand, pass the project path explicitly.
:::

## CodeBuddy

For CodeBuddy in VS Code, Android Studio, or CodeBuddy IDE, use the installer instead of pasting a generic MCP snippet into the editor plugin:

```bash
codegraph install --target=codebuddy --location=local
```

The global install writes `~/.codebuddy/mcp.json`; the local install writes `<project>/.mcp.json` with `args: ["serve", "--mcp", "--path", "<absolute-project-path>"]` and `permissions.allow: ["mcp__codegraph"]`. That explicit `--path` is important for IDE/plugin launches that do not start MCP subprocesses from the workspace root.

CodeBuddy can also use CodeGraph to create and refresh the graph through MCP: ask the agent to generate, update, sync, or rebuild the knowledge graph and it can call `codegraph_index`. After that, code-reading questions should use `codegraph_explore`, `codegraph_search`, `codegraph_node`, and the graph traversal tools before falling back to raw file reads.
