import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { getTarget, resolveTargetFlag } from '../src/installer/targets/registry';

function mkTmpDir(label: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `cg-codebuddy-${label}-`));
}

function setHome(dir: string): { restore: () => void } {
  const prev = {
    HOME: process.env.HOME,
    USERPROFILE: process.env.USERPROFILE,
  };
  process.env.HOME = dir;
  process.env.USERPROFILE = dir;
  return {
    restore() {
      if (prev.HOME === undefined) delete process.env.HOME; else process.env.HOME = prev.HOME;
      if (prev.USERPROFILE === undefined) delete process.env.USERPROFILE; else process.env.USERPROFILE = prev.USERPROFILE;
    },
  };
}

describe('CodeBuddy installer target', () => {
  let tmpHome: string;
  let tmpCwd: string;
  let origCwd: string;
  let homeRestore: { restore: () => void };

  beforeEach(() => {
    tmpHome = mkTmpDir('home');
    tmpCwd = mkTmpDir('cwd');
    origCwd = process.cwd();
    process.chdir(tmpCwd);
    homeRestore = setHome(tmpHome);
  });

  afterEach(() => {
    homeRestore.restore();
    process.chdir(origCwd);
    fs.rmSync(tmpHome, { recursive: true, force: true });
    fs.rmSync(tmpCwd, { recursive: true, force: true });
  });

  it('is registered as a first-class installer target', () => {
    expect(getTarget('codebuddy')?.displayName).toBe('CodeBuddy');
    expect(resolveTargetFlag('codebuddy', 'global').map(t => t.id)).toEqual(['codebuddy']);
  });

  it('writes global CodeBuddy MCP config with permissions and workspace path placeholder', () => {
    const target = getTarget('codebuddy')!;
    target.install('global', { autoAllow: true });

    const file = path.join(tmpHome, '.codebuddy', 'mcp.json');
    const config = JSON.parse(fs.readFileSync(file, 'utf-8'));
    expect(config.mcpServers.codegraph).toEqual({
      type: 'stdio',
      command: 'codegraph',
      args: ['serve', '--mcp', '--path', '${workspaceFolder}'],
      description: 'CodeGraph semantic code knowledge graph',
    });
    expect(config.permissions.allow).toContain('mcp__codegraph');
  });

  it('writes project-local .mcp.json with absolute project path for IDE plugin launches', () => {
    const target = getTarget('codebuddy')!;
    target.install('local', { autoAllow: true });

    const file = path.join(tmpCwd, '.mcp.json');
    const config = JSON.parse(fs.readFileSync(file, 'utf-8'));
    expect(config.mcpServers.codegraph.args).toEqual(['serve', '--mcp', '--path', fs.realpathSync(tmpCwd)]);
    expect(config.permissions.allow).toContain('mcp__codegraph');
  });
});
