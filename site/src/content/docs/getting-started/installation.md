---
title: Installation
description: Install CodeGraph and configure your AI coding agents.
---

## 1. Run the installer

```bash
npx @colbymchenry/codegraph
```

The installer will:

- Ask which agent(s) to configure — auto-detecting installed ones from **Claude Code**, **Cursor**, **Codex CLI**, **opencode**, **Hermes Agent**, **Gemini CLI**, **Antigravity IDE**, **Kiro**, and **CodeBuddy**.
- Prompt to install `codegraph` on your `PATH` (so agents can launch the MCP server).
- Ask whether configs apply to all your projects or just this one.
- Write each chosen agent's MCP server config. The usage guide is delivered by the MCP server itself during `initialize`.
- Set up auto-allow permissions when the target supports them.
- Initialize your current project (local installs only).

## Non-interactive (scripting / CI)

```bash
codegraph install --yes                              # auto-detect agents, install global
codegraph install --target=cursor,claude --yes       # explicit target list
codegraph install --target=auto --location=local     # detected agents, project-local
codegraph install --print-config codex               # print snippet, no file writes
```

| Flag | Values | Default |
|---|---|---|
| `--target` | `auto`, `all`, `none`, or csv (`claude,cursor,…`) | prompt |
| `--location` | `global`, `local` | prompt |
| `--yes` | (boolean) | prompt every step |
| `--no-permissions` | (boolean) skip Claude auto-allow list | permissions on |
| `--print-config <id>` | dump snippet for one agent and exit | — |

## 2. Restart your agent

Restart your agent (Claude Code / Cursor / Codex CLI / opencode / Hermes Agent / Gemini CLI / Antigravity IDE / Kiro / CodeBuddy) for the MCP server to load.

For CodeBuddy in VS Code, Android Studio, or CodeBuddy IDE, prefer a project-local install:

```bash
codegraph install --target=codebuddy --location=local
```

This writes `.mcp.json` with an explicit `--path` so the IDE plugin starts CodeGraph against the current workspace.

## 3. Initialize projects

```bash
cd your-project
codegraph init -i
```

This builds the per-project knowledge graph index and wires up any project-local agent surfaces, so a single global `codegraph install` works in every project you open.

## Supported platforms

Every release ships a self-contained build (bundled Node runtime — nothing to compile) for all three desktop OSes, on both x64 and arm64:

| Platform | Architectures | Install |
|---|---|---|
| Windows | x64, arm64 | PowerShell installer or npm |
| macOS | x64, arm64 | shell installer or npm |
| Linux | x64, arm64 | shell installer or npm |

## Uninstall

Changed your mind? One command removes CodeGraph from every agent it configured:

```bash
codegraph uninstall
```

This reverses the installer — stripping CodeGraph's MCP server config, instructions, and permissions from each configured agent. Your project indexes (`.codegraph/`) are left untouched; remove those per-project with `codegraph uninit`. Use `--target` to remove from specific agents, or `--yes` to run non-interactively.
