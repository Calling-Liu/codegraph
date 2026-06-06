#!/usr/bin/env node
'use strict';

// Thin launcher for the CodeBuddy fork.
//
// The actual CodeGraph process must run on a Node build whose node:sqlite module
// includes FTS5. Some user-installed Node builds expose node:sqlite without FTS5,
// which causes init/index to fail and can leave a half-created .codegraph DB.
// This shim uses the user's Node only to locate or download a known-good Node
// runtime, then starts dist/bin/codegraph.js with that runtime.

var childProcess = require('child_process');
var fs = require('fs');
var https = require('https');
var os = require('os');
var path = require('path');

var NODE_VERSION = process.env.CODEGRAPH_NODE_VERSION || '24.11.1';
var TARGET = process.platform + '-' + process.arch;
var IS_WINDOWS = process.platform === 'win32';
var CACHE_ROOT = process.env.CODEGRAPH_CODEBUDDY_INSTALL_DIR ||
  path.join(os.homedir(), '.codegraph-codebuddy');

main().catch(function (err) {
  process.stderr.write('codegraph: ' + (err && err.message ? err.message : String(err)) + '\n');
  process.exit(1);
});

async function main() {
  var node = process.env.CODEGRAPH_NODE || findCachedNode();
  if (!node) {
    if (process.env.CODEGRAPH_NO_DOWNLOAD) {
      failNoRuntime('automatic Node download is disabled by CODEGRAPH_NO_DOWNLOAD.');
    }
    node = await installNode();
  }

  var entry = path.join(__dirname, '..', 'dist', 'bin', 'codegraph.js');
  var args = ['--liftoff-only', entry].concat(process.argv.slice(2));
  var result = childProcess.spawnSync(node, args, { stdio: 'inherit' });
  if (result.error) {
    process.stderr.write('codegraph: failed to start bundled Node: ' + result.error.message + '\n');
    process.exit(1);
  }
  process.exit(result.status === null ? 1 : result.status);
}

function findCachedNode() {
  var node = cachedNodePath();
  return fs.existsSync(node) ? node : null;
}

async function installNode() {
  var dest = nodeDestDir();
  var ready = findCachedNode();
  if (ready) return ready;

  var nodePlatform = nodeArchivePlatform();
  if (!nodePlatform) {
    failNoRuntime('unsupported platform: ' + TARGET + '.');
  }

  var ext = IS_WINDOWS ? '.zip' : '.tar.gz';
  var archiveName = 'node-v' + NODE_VERSION + '-' + nodePlatform + ext;
  var base = process.env.CODEGRAPH_NODE_DOWNLOAD_BASE ||
    ('https://nodejs.org/dist/v' + NODE_VERSION);
  var url = base.replace(/\/$/, '') + '/' + archiveName;
  var runtimesDir = path.join(CACHE_ROOT, 'runtimes');

  fs.mkdirSync(runtimesDir, { recursive: true });
  var stage = fs.mkdtempSync(path.join(runtimesDir, '.dl-'));
  var archivePath = path.join(stage, archiveName);
  var extractDir = path.join(stage, 'node');

  process.stderr.write(
    'codegraph: installing bundled Node v' + NODE_VERSION +
    ' for CodeBuddy compatibility...\n'
  );

  try {
    await download(url, archivePath, 6);
    fs.mkdirSync(extractDir);
    extract(archivePath, extractDir);

    var raced = findCachedNode();
    if (raced) {
      rmrf(stage);
      return raced;
    }

    try {
      fs.renameSync(extractDir, dest);
    } catch (err) {
      var other = findCachedNode();
      if (other) {
        rmrf(stage);
        return other;
      }
      throw err;
    }
  } catch (err) {
    rmrf(stage);
    throw new Error(
      'could not install bundled Node from ' + url + ' (' +
      (err && err.message ? err.message : String(err)) + ').\n' +
      'Set CODEGRAPH_NODE=/absolute/path/to/node to use a compatible Node manually.'
    );
  }

  rmrf(stage);
  var node = findCachedNode();
  if (!node) {
    throw new Error('downloaded Node is missing from ' + dest + '.');
  }
  process.stderr.write('codegraph: bundled Node ready.\n');
  return node;
}

function nodeArchivePlatform() {
  if (process.platform === 'darwin' && process.arch === 'arm64') return 'darwin-arm64';
  if (process.platform === 'darwin' && process.arch === 'x64') return 'darwin-x64';
  if (process.platform === 'linux' && process.arch === 'x64') return 'linux-x64';
  if (process.platform === 'linux' && process.arch === 'arm64') return 'linux-arm64';
  if (process.platform === 'win32' && process.arch === 'x64') return 'win-x64';
  if (process.platform === 'win32' && process.arch === 'arm64') return 'win-arm64';
  return null;
}

function nodeDestDir() {
  return path.join(CACHE_ROOT, 'runtimes', 'node-v' + NODE_VERSION + '-' + nodeArchivePlatform());
}

function cachedNodePath() {
  return IS_WINDOWS
    ? path.join(nodeDestDir(), 'node.exe')
    : path.join(nodeDestDir(), 'bin', 'node');
}

function download(url, dest, redirectsLeft) {
  return new Promise(function (resolve, reject) {
    var req = https.get(url, { headers: { 'User-Agent': 'codegraph-codebuddy-shim' }, timeout: 30000 }, function (res) {
      var status = res.statusCode || 0;
      if (status >= 300 && status < 400 && res.headers.location) {
        res.resume();
        if (redirectsLeft <= 0) {
          reject(new Error('too many redirects'));
          return;
        }
        download(new URL(res.headers.location, url).toString(), dest, redirectsLeft - 1).then(resolve, reject);
        return;
      }
      if (status !== 200) {
        res.resume();
        reject(new Error('HTTP ' + status));
        return;
      }
      var file = fs.createWriteStream(dest);
      res.on('error', reject);
      file.on('error', reject);
      file.on('finish', function () { file.close(resolve); });
      res.pipe(file);
    });
    req.on('timeout', function () { req.destroy(new Error('connection timed out')); });
    req.on('error', reject);
  });
}

function extract(archive, destDir) {
  var args = IS_WINDOWS
    ? ['-xf', archive, '-C', destDir, '--strip-components=1']
    : ['-xzf', archive, '-C', destDir, '--strip-components=1'];
  var result = childProcess.spawnSync('tar', args, { stdio: 'ignore' });
  if (result.error) throw new Error('tar unavailable: ' + result.error.message);
  if (result.status !== 0) throw new Error('tar exited ' + result.status);
}

function rmrf(file) {
  try {
    fs.rmSync(file, { recursive: true, force: true });
  } catch (_) {
    // Best effort cleanup only.
  }
}

function failNoRuntime(reason) {
  process.stderr.write(
    'codegraph: no compatible Node runtime is available for CodeBuddy MCP.\n' +
    'codegraph: ' + reason + '\n' +
    'Fixes:\n' +
    '  - allow this command to download Node from nodejs.org on first run; or\n' +
    '  - set CODEGRAPH_NODE=/absolute/path/to/node for a Node build with node:sqlite FTS5.\n'
  );
  process.exit(1);
}
