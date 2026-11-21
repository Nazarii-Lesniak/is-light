const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');
const sharedSrcDir = path.resolve(monorepoRoot, 'packages/shared/src');

const config = getDefaultConfig(projectRoot);
config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const isRelativeJsInShared =
    moduleName.startsWith('.') &&
    moduleName.endsWith('.js') &&
    context.originModulePath.startsWith(sharedSrcDir);

  const nextModuleName = isRelativeJsInShared ? moduleName.slice(0, -3) : moduleName;
  if (originalResolveRequest) {
    return originalResolveRequest(context, nextModuleName, platform);
  }
  return context.resolveRequest(context, nextModuleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
