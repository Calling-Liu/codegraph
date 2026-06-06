/**
 * Registry of supported agent targets for this CodeBuddy-focused fork.
 */

import { AgentTarget, Location, TargetId } from './types';
import { codeBuddyTarget } from './codebuddy';

export const ALL_TARGETS: readonly AgentTarget[] = Object.freeze([
  codeBuddyTarget,
]);

export function getTarget(id: string): AgentTarget | undefined {
  return ALL_TARGETS.find((t) => t.id === id);
}

export function listTargetIds(): TargetId[] {
  return ALL_TARGETS.map((t) => t.id);
}

/**
 * Run `detect()` for every target at the given location. Returns the
 * full registry zipped with detection results — orchestrator uses
 * this to seed the multiselect prompt with installed agents
 * pre-checked.
 */
export function detectAll(loc: Location): Array<{
  target: AgentTarget;
  detection: ReturnType<AgentTarget['detect']>;
}> {
  return ALL_TARGETS.map((target) => ({
    target,
    detection: target.detect(loc),
  }));
}

/**
 * Resolve a `--target=` flag value to a list of `AgentTarget`
 * instances. Accepts:
 *
 *   - `auto` — return detected targets, or CodeBuddy as the fallback.
 *   - `all` — every target in the registry.
 *   - `none` — empty list (caller skips agent writes entirely).
 *   - csv list — `'claude,cursor'` etc. Unknown ids throw.
 */
export function resolveTargetFlag(value: string, loc: Location): AgentTarget[] {
  if (value === 'none') return [];
  if (value === 'all') return [...ALL_TARGETS];
  if (value === 'auto') {
    const detected = detectAll(loc).filter(({ detection }) => detection.installed);
    if (detected.length > 0) return detected.map(({ target }) => target);
    const fallback = getTarget('codebuddy');
    return fallback ? [fallback] : [];
  }

  const ids = value.split(',').map((s) => s.trim()).filter(Boolean);
  const resolved: AgentTarget[] = [];
  const unknown: string[] = [];
  for (const id of ids) {
    const t = getTarget(id);
    if (t) resolved.push(t);
    else unknown.push(id);
  }
  if (unknown.length > 0) {
    const known = listTargetIds().join(', ');
    throw new Error(
      `Unknown --target id(s): ${unknown.join(', ')}. Known: ${known}, plus 'auto' / 'all' / 'none'.`,
    );
  }
  return resolved;
}
