/**
 * Signs release builds with our upload key. The generated android/ folder is not kept in git,
 * so the signing setup is added here at prebuild time. Without the variables below the release
 * build falls back to the debug key (fine for a quick local check, refused by Google Play).
 *
 *   STILLFLAME_KEYSTORE           path to the upload keystore
 *   STILLFLAME_KEYSTORE_PASSWORD  its password (also used for the key)
 *   STILLFLAME_KEY_ALIAS          key alias (default: upload)
 */
const { withAppBuildGradle } = require("expo/config-plugins");

const releaseSigning = `
        release {
            if (System.getenv('STILLFLAME_KEYSTORE')) {
                storeFile file(System.getenv('STILLFLAME_KEYSTORE'))
                storePassword System.getenv('STILLFLAME_KEYSTORE_PASSWORD')
                keyAlias System.getenv('STILLFLAME_KEY_ALIAS') ?: 'upload'
                keyPassword System.getenv('STILLFLAME_KEYSTORE_PASSWORD')
            }
        }`;

module.exports = (config) =>
  withAppBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (src.includes("STILLFLAME_KEYSTORE")) return cfg;
    // Add a release signing config after the debug one.
    src = src.replace(/(signingConfigs \{\s*debug \{[\s\S]*?\n        \})/, `$1${releaseSigning}`);
    // Use it for the release build type when the keystore is given.
    src = src.replace(
      /(release \{\s*\/\/ Caution![\s\S]*?)signingConfig signingConfigs\.debug/,
      "$1signingConfig System.getenv('STILLFLAME_KEYSTORE') ? signingConfigs.release : signingConfigs.debug",
    );
    cfg.modResults.contents = src;
    return cfg;
  });
