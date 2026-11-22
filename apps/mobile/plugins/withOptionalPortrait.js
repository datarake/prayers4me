/**
 * The app runs in portrait. Android turns android:screenOrientation="portrait" into an implied
 * requirement for android.hardware.screen.portrait, which hides the app on Google Play from
 * devices without that feature (some tablets, Chromebooks, Android XR) and gets flagged in
 * Play's pre-review checks. Declaring the feature as optional keeps portrait where the system
 * allows it and lets every device install the app.
 */
const { withAndroidManifest } = require("expo/config-plugins");

const FEATURES = ["android.hardware.screen.portrait", "android.hardware.screen.landscape"];

module.exports = (config) =>
  withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    const features = (manifest["uses-feature"] ??= []);
    for (const name of FEATURES) {
      const existing = features.find((f) => f.$["android:name"] === name);
      if (existing) existing.$["android:required"] = "false";
      else features.push({ $: { "android:name": name, "android:required": "false" } });
    }
    return cfg;
  });
