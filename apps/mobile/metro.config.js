const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// Watch all files within the monorepo (needed for @crumb/* packages)
config.watchFolders = [workspaceRoot]

// Resolve packages from the app-local node_modules first, then workspace root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]

// ── Fix for dual react-native versions ──────────────────────────────────────
// npm workspace peer-dep resolution hoists react-native@0.86.0 to the monorepo
// root as a ghost peer, while apps/mobile/node_modules contains the correct
// 0.81.5.  Metro picks up the root copy when it walks the watch-folder tree,
// causing @react-native/babel-plugin-codegen to choke on 0.86 codegen syntax.
//
// Strategy:
//  1. extraNodeModules — always resolve 'react-native' to the local 0.81.5
//  2. blockList — prevent Metro from ever loading files from the root copy
// ────────────────────────────────────────────────────────────────────────────

// Packages that must be singletons — npm workspace peer-dep resolution hoists
// ghost copies at the monorepo root (react@19.2.7, react-native@0.86,
// scheduler@0.27) while apps/mobile has the correct versions locally.
// Metro bundles both copies → hooks break ("Cannot read property 'useId' of null").
// We pin each singleton to the local copy via extraNodeModules and block the
// root copies via blockList.
const SINGLETONS = ['react', 'react-native', 'scheduler']

const localPaths = Object.fromEntries(
  SINGLETONS.map((pkg) => [pkg, path.resolve(projectRoot, 'node_modules', pkg)])
)
const rootPaths = SINGLETONS.map((pkg) =>
  path.resolve(workspaceRoot, 'node_modules', pkg)
)

config.resolver.extraNodeModules = localPaths

const existingBlockList = config.resolver.blockList
const blockListEntries = Array.isArray(existingBlockList)
  ? existingBlockList
  : existingBlockList
  ? [existingBlockList]
  : []

config.resolver.blockList = [
  ...blockListEntries,
  ...rootPaths.map(
    (p) => new RegExp(`^${escapeRegExp(p)}${escapeRegExp(path.sep)}.*`)
  ),
]

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

module.exports = config
