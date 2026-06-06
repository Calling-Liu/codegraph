import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ToolHandler } from '../src/mcp/tools';
import { CodeGraph } from '../src';

describe('codegraph_index MCP tool', () => {
  let tempDir: string;
  const globalWithLoader = globalThis as typeof globalThis & {
    __CODEGRAPH_LOAD_CODEGRAPH_FOR_TESTS__?: () => typeof CodeGraph;
  };

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-mcp-index-'));
    fs.writeFileSync(path.join(tempDir, 'alpha.ts'), 'export function alpha() { return 1; }\n');
    globalWithLoader.__CODEGRAPH_LOAD_CODEGRAPH_FOR_TESTS__ = () => CodeGraph;
  });

  afterEach(() => {
    delete globalWithLoader.__CODEGRAPH_LOAD_CODEGRAPH_FOR_TESTS__;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('is exposed so agents can initialize or update the graph without shelling out', () => {
    const names = new ToolHandler(null).getTools().map(t => t.name);
    expect(names).toContain('codegraph_index');
  });

  it('initializes and indexes an uninitialized project from projectPath', async () => {
    const res = await new ToolHandler(null).execute('codegraph_index', {
      projectPath: tempDir,
      mode: 'init',
    });

    expect(res.content[0].text).toMatch(/Initialized and indexed/);
    expect(res.isError).not.toBe(true);
    expect(CodeGraph.isInitialized(tempDir)).toBe(true);
  });

  it('updates an initialized project and leaves it queryable by the same handler', async () => {
    const cg = CodeGraph.initSync(tempDir);
    const handler = new ToolHandler(cg);

    const res = await handler.execute('codegraph_index', { mode: 'sync' });

    expect(res.isError).not.toBe(true);
    expect(res.content[0].text).toMatch(/Updated CodeGraph index/);
    const search = await handler.execute('codegraph_search', { query: 'alpha' });
    expect(search.content[0].text).toContain('alpha');
    cg.close();
  });
});
