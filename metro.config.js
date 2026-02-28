const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Désactive les exports de paquets instables qui provoquent le bug Windows
config.resolver.unstable_enablePackageExports = false;

// Ajoute cette ligne cruciale pour ignorer les dossiers "externals" qui plantent
config.resolver.blockList = [
  /.*\.expo\/metro\/externals.*/,
];

module.exports = config;