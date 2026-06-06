/**
 * Agent target abstraction for the installer.
 *
 * Agent target abstraction for the CodeBuddy-focused installer.
 */

export type Location = 'global' | 'local';

/**
 * Stable string id used in the `--target` CLI flag and the registry
 * lookup. New targets add a value here when they're added to the
 * registry. Keep these short and lowercase.
 */
export type TargetId = 'codebuddy';

/**
 * Result of `target.detect(location)`.
 *
 * `installed` is a best-effort heuristic that the agent's CLI / app /
 * config dir is present on this system — used to default the
 * multiselect prompt to "what's actually here." False positives are
 * acceptable (we still write); false negatives just mean the user
 * has to opt in manually.
 *
 * `alreadyConfigured` reports whether codegraph has already been
 * wired into this target at this location — drives the
 * "Updated"-vs-"Added" log line and lets `--check` exit 0/1.
 */
export interface DetectionResult {
  installed: boolean;
  alreadyConfigured: boolean;
  /** Path inspected; surfaced in diagnostic / dry-run output. */
  configPath?: string;
}

/**
 * What `target.install(location)` actually changed on disk. The
 * orchestrator renders one log line per file using `action`.
 *
 * `unchanged` means we touched the file but its contents were already
 * what we'd write — used for byte-identical idempotent re-runs.
 */
export interface WriteResult {
  files: Array<{
    path: string;
    action: 'created' | 'updated' | 'unchanged' | 'removed' | 'not-found' | 'kept';
  }>;
  /**
   * Optional one-line notes the orchestrator surfaces verbatim. Keep
   * these short; multi-line guidance belongs in README.md.
   */
  notes?: string[];
}

export interface InstallOptions {
  /**
   * Whether to write the target's permissions / auto-allow surface.
   */
  autoAllow: boolean;
}

export interface AgentTarget {
  /** Stable id; matches the `TargetId` union. */
  readonly id: TargetId;
  /** Human-readable name shown in clack prompts and log lines. */
  readonly displayName: string;
  /** Optional URL for "where do I learn more about this agent." */
  readonly docsUrl?: string;
  /**
   * Whether this target supports the given install location.
   *
   * Returning false for an unsupported (target, location) pair lets
   * the orchestrator skip cleanly with a clear message.
   */
  supportsLocation(loc: Location): boolean;
  detect(loc: Location): DetectionResult;
  install(loc: Location, opts: InstallOptions): WriteResult;
  /**
   * Inverse of install. Removes only what install would have written;
   * preserves sibling MCP servers, sibling permissions, and unrelated
   * markdown sections. Must be safe to call when nothing was ever
   * installed (returns `not-found` actions).
   */
  uninstall(loc: Location): WriteResult;
  /**
   * Print the MCP-server snippet a user would paste manually for this
   * target. Used by `codegraph install --print-config <id>` and by
   * the README. Must NOT touch the filesystem.
   */
  printConfig(loc: Location): string;
  /** Filesystem paths this target would write to at this location. */
  describePaths(loc: Location): string[];
}
