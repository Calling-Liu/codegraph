/**
 * CodeBuddy target.
 *
 * CodeBuddy reads MCP servers from `~/.codebuddy/mcp.json` and project
 * `.mcp.json` files. Its IDE/plugin launch environment may not use the
 * workspace as cwd, so the CodeGraph entry always passes `--path`.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  AgentTarget,
  DetectionResult,
  InstallOptions,
  Location,
  WriteResult,
} from './types';
import {
  getMcpServerConfig,
  jsonDeepEqual,
  readJsonFile,
  writeJsonFile,
} from './shared';

function mcpJsonPath(loc: Location): string {
  return loc === 'global'
    ? path.join(os.homedir(), '.codebuddy', 'mcp.json')
    : path.join(process.cwd(), '.mcp.json');
}

class CodeBuddyTarget implements AgentTarget {
  readonly id = 'codebuddy' as const;
  readonly displayName = 'CodeBuddy';
  readonly docsUrl = 'https://www.codebuddy.ai/docs/cli/mcp';

  supportsLocation(_loc: Location): boolean {
    return true;
  }

  detect(loc: Location): DetectionResult {
    const file = mcpJsonPath(loc);
    const config = readJsonFile(file);
    const alreadyConfigured = !!config.mcpServers?.codegraph;
    const installed = loc === 'global'
      ? fs.existsSync(path.join(os.homedir(), '.codebuddy')) || fs.existsSync(file)
      : fs.existsSync(file);
    return { installed, alreadyConfigured, configPath: file };
  }

  install(loc: Location, opts: InstallOptions): WriteResult {
    return {
      files: [writeMcpEntry(loc, opts.autoAllow)],
      notes: [
        'Restart CodeBuddy / VS Code / Android Studio for MCP changes to take effect.',
        'CodeBuddy: use Craft/Agent mode so the agent can call MCP tools.',
      ],
    };
  }

  uninstall(loc: Location): WriteResult {
    const file = mcpJsonPath(loc);
    const config = readJsonFile(file);
    let changed = false;

    if (config.mcpServers?.codegraph) {
      delete config.mcpServers.codegraph;
      if (Object.keys(config.mcpServers).length === 0) delete config.mcpServers;
      changed = true;
    }

    if (Array.isArray(config.permissions?.allow)) {
      const before = config.permissions.allow.length;
      config.permissions.allow = config.permissions.allow.filter((p: unknown) => p !== 'mcp__codegraph');
      if (config.permissions.allow.length === 0) delete config.permissions.allow;
      if (config.permissions && Object.keys(config.permissions).length === 0) delete config.permissions;
      changed = changed || config.permissions?.allow?.length !== before;
    }

    if (!changed) return { files: [{ path: file, action: 'not-found' }] };
    writeJsonFile(file, config);
    return { files: [{ path: file, action: 'removed' }] };
  }

  printConfig(loc: Location): string {
    const target = mcpJsonPath(loc);
    const snippet = JSON.stringify({
      mcpServers: { codegraph: buildCodeBuddyMcpConfig(loc) },
      permissions: { allow: ['mcp__codegraph'] },
    }, null, 2);
    return `# Add to ${target}\n\n${snippet}\n`;
  }

  describePaths(loc: Location): string[] {
    return [mcpJsonPath(loc)];
  }
}

function buildCodeBuddyMcpConfig(loc: Location): Record<string, unknown> {
  const base = getMcpServerConfig();
  const pathArg = loc === 'local' ? process.cwd() : '${workspaceFolder}';
  return {
    ...base,
    args: [...base.args, '--path', pathArg],
    description: 'CodeGraph semantic code knowledge graph',
  };
}

function writeMcpEntry(loc: Location, autoAllow: boolean): WriteResult['files'][number] {
  const file = mcpJsonPath(loc);
  const existing = readJsonFile(file);
  const beforeServer = existing.mcpServers?.codegraph;
  const afterServer = buildCodeBuddyMcpConfig(loc);
  const beforeAllow = Array.isArray(existing.permissions?.allow) ? existing.permissions.allow : [];
  const afterAllow = autoAllow ? [...new Set([...beforeAllow, 'mcp__codegraph'])] : beforeAllow;

  if (jsonDeepEqual(beforeServer, afterServer) && jsonDeepEqual(beforeAllow, afterAllow)) {
    return { path: file, action: 'unchanged' };
  }

  const action: 'created' | 'updated' =
    beforeServer ? 'updated' : (fs.existsSync(file) ? 'updated' : 'created');
  if (!existing.mcpServers) existing.mcpServers = {};
  existing.mcpServers.codegraph = afterServer;
  if (autoAllow) {
    if (!existing.permissions) existing.permissions = {};
    existing.permissions.allow = afterAllow;
  }
  writeJsonFile(file, existing);
  return { path: file, action };
}

export const codeBuddyTarget: AgentTarget = new CodeBuddyTarget();
