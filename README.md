# CodeGraph for CodeBuddy

This repository is a CodeBuddy-focused fork of CodeGraph. It is based on the
upstream project and adds CodeBuddy MCP integration so CodeBuddy IDE, VS Code
with CodeBuddy, and Android Studio with CodeBuddy can use CodeGraph's local
code knowledge graph.

Upstream source project:

```text
https://github.com/colbymchenry/codegraph
```

This fork keeps the CodeGraph MCP server, indexer, graph query tools, and CLI
pieces needed to run CodeGraph with CodeBuddy. Original website, benchmark,
release, documentation, test, and non-CodeBuddy agent integration files have
been removed from this branch so the project is easier to inspect and use as a
CodeBuddy MCP package.

## What this fork provides

- Adds `codebuddy` as the installer target.
- Writes CodeBuddy MCP config for:
  - CodeBuddy global config: `~/.codebuddy/mcp.json`
  - Project-local config: `<project>/.mcp.json`
- Passes `--path <project>` to the MCP server so IDE/plugin launches use the
  correct workspace even when their subprocess cwd is wrong.
- Adds the MCP tool `codegraph_index`, allowing CodeBuddy's agent to initialize,
  update, or rebuild the knowledge graph from natural language.
- Keeps graph reading tools available, including `codegraph_status`,
  `codegraph_explore`, `codegraph_search`, `codegraph_node`,
  `codegraph_callers`, `codegraph_callees`, `codegraph_impact`, and
  `codegraph_files`.

## Install this branch on another computer

Clone this branch:

```bash
git clone -b codex/codebuddy-support https://github.com/Calling-Liu/codegraph.git
cd codegraph
```

Install dependencies, build, and install the CLI:

```bash
npm install
npm run build
npm install -g .
```

Confirm the command is available:

```bash
which codegraph
codegraph --version
```

## Configure CodeBuddy for a project

Open a terminal in the project you want CodeBuddy to understand:

```bash
cd /absolute/path/to/your/project
```

Install the CodeBuddy MCP config locally:

```bash
codegraph install --target=codebuddy --location=local --yes
```

This creates or updates:

```text
<project>/.mcp.json
```

The important part should look like this:

```json
{
  "mcpServers": {
    "codegraph": {
      "type": "stdio",
      "command": "codegraph",
      "args": [
        "serve",
        "--mcp",
        "--path",
        "/absolute/path/to/your/project"
      ],
      "description": "CodeGraph semantic code knowledge graph"
    }
  },
  "permissions": {
    "allow": ["mcp__codegraph"]
  }
}
```

Restart CodeBuddy IDE, VS Code, or Android Studio after writing this file.

## Generate the knowledge graph

From the project root, build the first graph:

```bash
codegraph init -i
```

If the project was already initialized, update it:

```bash
codegraph sync
```

Check status from the terminal:

```bash
codegraph status
```

## Use it in CodeBuddy

Use CodeBuddy's Agent or Craft mode. Start by checking that the agent can see
the graph:

```text
请调用 codegraph_status，确认当前项目的 CodeGraph 知识图谱状态。
```

If CodeBuddy says the project is not initialized, ask it to initialize through
MCP:

```text
请调用 codegraph_index，mode=init，为当前项目生成知识图谱。完成后再调用 codegraph_status 确认状态。
```

For normal code reading, tell CodeBuddy to use CodeGraph first:

```text
请优先使用 CodeGraph MCP，不要先大范围读文件。调用 codegraph_explore 分析这个项目的整体架构。
```

Useful prompts:

```text
请使用 codegraph_explore 分析登录流程是怎么走的，必要时再使用 codegraph_search 或 codegraph_node。
```

```text
请用 codegraph_search 查找 XxxService，然后用 codegraph_node 查看它的完整定义。
```

```text
请用 codegraph_callers 查看哪些地方调用了 XxxService。
```

```text
请用 codegraph_impact 分析修改 XxxService 会影响哪些代码。
```

```text
我刚修改了代码，请调用 codegraph_index，mode=sync，更新知识图谱。
```

```text
请调用 codegraph_index，mode=reindex，重建整个知识图谱。
```

## Expected workflow

1. Open your project in CodeBuddy.
2. Run `codegraph install --target=codebuddy --location=local --yes` in that
   project.
3. Run `codegraph init -i`.
4. Restart CodeBuddy.
5. Ask CodeBuddy to call `codegraph_status`.
6. Ask architecture, flow, symbol, caller, or impact questions with
   CodeGraph-first wording.

## Troubleshooting

### CodeBuddy sees `codegraph` but tools fail

Check that the project-local `.mcp.json` has an absolute `--path` pointing at
the same project opened in CodeBuddy.

### CodeBuddy says CodeGraph is not initialized

Run:

```bash
codegraph init -i
```

Or ask CodeBuddy:

```text
请调用 codegraph_index，mode=init。
```

### `no such module: fts5`

The local Node runtime does not have SQLite FTS5 support. Use a Node build that
includes `node:sqlite` with FTS5, or run a self-contained CodeGraph runtime when
one is available.

For this branch, the basic install path is:

```bash
npm run build
npm install -g .
```

### CodeBuddy still does not call CodeGraph

Use explicit wording:

```text
请先调用 CodeGraph MCP 工具，不要先 grep 或读取大量文件。
```

Then ask for one concrete action:

```text
请调用 codegraph_search 查找 AuthService。
```

If that works, follow with:

```text
请调用 codegraph_explore 分析 AuthService 的相关流程。
```
